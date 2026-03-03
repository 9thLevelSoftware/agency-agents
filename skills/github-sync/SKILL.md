---
name: legion:github-sync
description: GitHub integration — issue tracking, PR creation, milestone sync, and status readback via gh CLI
triggers: [github, issue, pr, milestone, sync, remote]
token_cost: high
summary: "Optional GitHub integration via gh CLI. Creates issues from plans, PRs from builds, syncs milestones. Checks prerequisites (gh installed, authenticated, remote exists) and degrades gracefully."
---

# GitHub Sync

GitHub operations engine for Legion. Provides issue creation linked to phases, PR creation after phase execution, milestone synchronization with ROADMAP.md, and live status readback for the dashboard. All operations require the `gh` CLI and a GitHub remote, and all operations degrade gracefully when unavailable.

References:
- State File Locations from `workflow-common.md` (state paths, degradation pattern)
- Commit Conventions from `execution-tracker.md` (commit format, phase lifecycle)
- Milestone format from `milestone-tracker.md` (milestone naming, phase ranges)
- `.planning/STATE.md` — stores GitHub linking metadata (issue/PR numbers per phase)

---

## Section 1: Prerequisites & Detection

How to check if GitHub operations are available. This check MUST be run before ANY GitHub operation in a session.

```
GitHub Availability Check (run before ANY GitHub operation):

Step 1: Check gh CLI authentication
  Command: gh auth status 2>&1
  - If exit code 0: gh is authenticated, proceed
  - If non-zero: GitHub unavailable, skip all operations silently

Step 2: Check for GitHub remote
  Command: git remote get-url origin 2>/dev/null
  - If exit code 0: remote exists, proceed
  - If non-zero: no remote, skip all operations silently

Step 3: Get repo metadata (cache for session)
  Command: gh repo view --json nameWithOwner,defaultBranch -q '.nameWithOwner + " " + .defaultBranch'
  - Parse: REPO_SLUG = first token, DEFAULT_BRANCH = second token
  - Cache these values — do not re-query within the same command run

The result of this check is a boolean: github_available = true/false
All subsequent sections assume this check has been performed.
If github_available is false, the calling workflow skips the GitHub section entirely.
```

### Constants

These values are used throughout all GitHub operations:

```
LEGION_LABEL = "legion"
LEGION_LABEL_COLOR = "7B68EE"
LEGION_LABEL_DESCRIPTION = "Created by Legion"
BRANCH_PREFIX = "legion/phase-"
```

The label color `7B68EE` (medium slate blue) provides a distinct visual marker in the GitHub issue tracker, making Legion-created issues easy to identify at a glance.

### Session Caching

Once the prerequisites check passes, cache the following values for the duration of the command run:

| Cached Value | Source | Example |
|--------------|--------|---------|
| `github_available` | Steps 1-2 result | `true` |
| `REPO_SLUG` | Step 3 first token | `user/legion` |
| `DEFAULT_BRANCH` | Step 3 second token | `main` |

Do NOT re-run the prerequisites check within the same command invocation. The cached values are valid for the entire session.

---

## Section 2: Issue Management (GH-01)

Creating and managing GitHub issues linked to Legion phases. Each phase gets one tracking issue with a checklist of its plans.

### 2.1: Ensure Label Exists

Before the first issue creation in a session, ensure the "legion" label exists on the repository:

```
Command: gh label create legion --description "Created by Legion" --color 7B68EE 2>/dev/null
```

This command is idempotent — if the label already exists, `gh` returns a non-zero exit code but creates nothing. The `2>/dev/null` suppresses the "already exists" error message. Do not check for the label's existence first; the create command handles both cases.

Run this once per session, before the first `gh issue create` call. Track with a session flag to avoid re-running on subsequent issue creations within the same command.

### 2.2: Create Phase Issue

Creates a GitHub issue that tracks all plans within a phase.

```
Input: phase_number, phase_name, phase_goal, plans_list, requirements, success_criteria
Output: issue_number (integer)

Command:
  gh issue create \
    --title "Phase {phase_number}: {phase_name}" \
    --body "{ISSUE_BODY}" \
    --label "legion" \
    {--milestone "MILESTONE_TITLE" if a GitHub milestone exists for the current ROADMAP milestone}

ISSUE_BODY format:
  ## Goal
  {phase_goal}

  ## Plans
  - [ ] Plan {NN}-01: {plan_1_name}
  - [ ] Plan {NN}-02: {plan_2_name}
  - [ ] Plan {NN}-03: {plan_3_name}

  ## Requirements
  {requirement_ids, comma-separated}

  ## Success Criteria
  {success_criteria as bullet list}

  ---
  *Created by Legion*

Capture issue number:
  Parse the URL returned by gh issue create — the last path segment is the issue number.
  Example: https://github.com/user/repo/issues/42 → issue_number = 42
  Fallback: gh issue list --label legion --state open --json number,title -q '.[0].number'
```

The `--milestone` flag is only included if a GitHub milestone has already been created for the corresponding ROADMAP milestone (see Section 4). If no milestone exists on GitHub, omit the flag entirely — do not create the milestone as a side effect of issue creation.

### 2.3: Close Phase Issue

Closes a phase issue after the phase passes review.

```
Input: issue_number, comment_text
Command:
  gh issue close {issue_number} --comment "{comment_text}"
```

The comment should summarize the phase outcome. Typical format:

```
Phase completed successfully.
- Plans executed: {count}
- Requirements satisfied: {req_ids}
- Review result: {pass/escalated}
```

If the issue is already closed (e.g., closed manually by the user), `gh issue close` is a no-op. Do not treat this as an error.

### 2.4: Update Issue Checklist

After a plan completes during `/legion:build`, update the phase issue's checklist to reflect progress.

```
Step 1: Read current issue body
  Command: gh issue view {issue_number} --json body -q .body

Step 2: Find and update the plan checkbox
  - Locate the line: "- [ ] Plan {NN}-{PP}: {plan_name}"
  - Replace with: "- [x] Plan {NN}-{PP}: {plan_name}"
  - If the line is not found (already checked or not present): skip silently

Step 3: Write updated body
  Command: gh issue edit {issue_number} --body "{updated_body}"

Step 4: Verify (optional)
  - If the edit command succeeds (exit code 0): proceed
  - If it fails: log the error, continue the build — checklist update is cosmetic
```

The checklist update is a progress indicator, not a critical operation. Build execution must never block or fail because a checklist update did not succeed.

---

## Section 3: PR Creation (GH-02)

Creating pull requests after phase execution completes. PRs are created against the default branch and reference the phase issue if one exists.

### 3.1: Branch Management

Ensure the current work is on an appropriate branch before creating a PR.

```
Step 1: Check current branch
  Command: git branch --show-current
  - If result equals DEFAULT_BRANCH (from Section 1):
    Create feature branch: git checkout -b {BRANCH_PREFIX}{NN}-{slug}
    Example: git checkout -b legion/phase-03-phase-planning
    The slug is the phase name in kebab-case, truncated to 40 characters.
  - If result is NOT the default branch:
    Use the current branch as-is (the user or a previous workflow created it)

Step 2: Check for unpushed commits
  Command: git log origin/{current_branch}..HEAD --oneline 2>/dev/null
  - If the remote tracking branch doesn't exist: all local commits are unpushed
  - Count unpushed commits for the PR description
  - If zero unpushed commits: abort PR creation — nothing to submit

Step 3: Push to remote
  Command: git push -u origin {current_branch}
  - The -u flag sets upstream tracking for future pushes
  - If push fails: report error, do NOT create PR
  - Common push failures: permission denied, remote rejected, network error
```

### 3.2: Create Phase PR

Creates the pull request with a structured body that summarizes the phase.

```
Input: phase_number, phase_name, phase_goal, plan_summaries[], files_modified[],
       requirements[], issue_number (optional)
Output: pr_number, pr_url

Command:
  gh pr create \
    --title "Phase {phase_number}: {phase_name}" \
    --body "{PR_BODY}" \
    --base {DEFAULT_BRANCH}

PR_BODY format:
  ## Summary
  {phase_goal}

  ## Changes
  ### New Files
  - {new_file_1}
  - {new_file_2}

  ### Modified Files
  - {modified_file_1}
  - {modified_file_2}

  ## Plans Executed
  | Plan | Wave | Status | Summary |
  |------|------|--------|---------|
  | {NN}-01 | 1 | Pass | {one-line from SUMMARY.md} |
  | {NN}-02 | 1 | Pass | {one-line from SUMMARY.md} |
  | {NN}-03 | 2 | Pass | {one-line from SUMMARY.md} |

  ## Requirements Satisfied
  - {REQ-01}: {description}
  - {REQ-02}: {description}

  {If issue_number exists: "Closes #{issue_number}"}

  ---
  *Created by Legion*

Capture PR number:
  Parse from the gh pr create output URL.
  Example: https://github.com/user/repo/pull/15 → pr_number = 15
```

The `Closes #{issue_number}` line uses GitHub's automatic issue closing — when the PR is merged, the referenced issue is closed automatically. Only include this line if a phase issue exists.

### 3.3: PR Creation Timing

PRs are created at specific points in the Legion workflow:

| Trigger | When | Condition |
|---------|------|-----------|
| After `/legion:build` | All plans in phase executed | At least one plan succeeded |
| After `/legion:review` | Review cycle passes | PR not already created for this phase |
| Manual via `/legion:quick` | User requests PR | Current branch has unpushed commits |

Do NOT create a PR if all plans in the phase failed. A PR with only failed work is not useful. Instead, log a note and let the user decide.

---

## Section 4: Milestone Sync (GH-03)

Mapping ROADMAP.md milestones to GitHub milestones. This provides a high-level view of project progress directly in the GitHub interface.

### 4.1: Create GitHub Milestone

Creates a GitHub milestone corresponding to a ROADMAP milestone.

```
Input: milestone_name, milestone_description, phase_range (start-end)
Output: github_milestone_number

Step 1: Check if milestone already exists
  Command: gh api "repos/{REPO_SLUG}/milestones" --jq '.[].title'
  - If milestone_name is in the list: return its number, do not create a duplicate
  - To get the number of an existing milestone:
    gh api "repos/{REPO_SLUG}/milestones" --jq '.[] | select(.title == "{milestone_name}") | .number'

Step 2: Create milestone
  Command:
    gh api "repos/{REPO_SLUG}/milestones" \
      --method POST \
      -f title="{milestone_name}" \
      -f description="Phases {start}-{end}: {milestone_description}"

  Parse number from JSON response: .number

Step 3: Record in STATE.md
  - Add a row to the ## GitHub > ### Milestones table (see Section 6)
  - Store the GitHub milestone number for future reference
```

Milestone names should match ROADMAP.md milestone names exactly. This enables lookup by name when assigning issues to milestones.

### 4.2: Close GitHub Milestone

Closes a GitHub milestone when all its phases are complete.

```
Input: github_milestone_number

Step 1: Verify all issues in milestone are closed
  Command: gh api "repos/{REPO_SLUG}/milestones/{github_milestone_number}" --jq '.open_issues'
  - If open_issues > 0: log warning "Milestone has {N} open issues" but proceed with close
    (The user may have added non-Legion issues to the milestone)

Step 2: Close the milestone
  Command:
    gh api "repos/{REPO_SLUG}/milestones/{github_milestone_number}" \
      --method PATCH \
      -f state=closed

Step 3: Update STATE.md
  - The milestone row status is NOT updated in STATE.md (status is fetched live)
  - See Section 6 for state linking rules
```

### 4.3: Milestone-Issue Association

When creating a phase issue (Section 2.2), associate it with the correct milestone:

```
Step 1: Determine which ROADMAP milestone covers the current phase
  - Read ROADMAP.md milestone definitions
  - Find the milestone whose phase range includes the current phase number

Step 2: Check if that milestone exists on GitHub
  - Look up in STATE.md ## GitHub > ### Milestones table
  - If the milestone has a GitHub number: use it
  - If not: create the milestone first (Section 4.1), then use the new number

Step 3: Include --milestone flag in issue creation
  - gh issue create ... --milestone "{milestone_name}"
```

---

## Section 5: Status Readback (GH-03)

Fetching live GitHub status for the `/legion:status` dashboard. This section provides real-time data that supplements the static STATE.md information.

```
Purpose: Used by /legion:status to display current GitHub state.
Do NOT rely on STATE.md values for status — always fetch live from GitHub.
STATE.md stores the LINKING information (which issue/PR belongs to which phase).

Step 1: Read STATE.md ## GitHub section to get issue/PR numbers per phase
  - Parse the phase-to-issue and phase-to-PR mappings
  - If ## GitHub section doesn't exist: return empty data (GitHub not yet used)

Step 2: Batch-fetch issue status
  Command: gh issue list --label legion --state all --json number,title,state --limit 100
  Parse into a map: {number: {title, state}}
  - state values: "OPEN" or "CLOSED"

Step 3: Batch-fetch PR status
  Command: gh pr list --state all --json number,title,state,mergedAt --limit 100
  Parse into a map: {number: {title, state, merged}}
  - state values: "OPEN", "CLOSED", or "MERGED"
  - merged: true if mergedAt is non-null

Step 4: Batch-fetch milestone status
  Command: gh api "repos/{REPO_SLUG}/milestones?state=all" \
    --jq '.[] | {number, title, state, open_issues, closed_issues}'
  Parse into a list of milestone objects

Step 5: Return structured data for the dashboard
  Format the data for display:

  issues: [
    {phase: "Phase 1: Plugin Foundation", number: 1, title: "...", state: "CLOSED"},
    {phase: "Phase 2: Project Init", number: 2, title: "...", state: "CLOSED"},
    {phase: "Phase 3: Phase Planning", number: 3, title: "...", state: "OPEN"}
  ]

  prs: [
    {phase: "Phase 1: Plugin Foundation", number: 10, title: "...", state: "MERGED", merged: true},
    {phase: "Phase 2: Project Init", number: 11, title: "...", state: "MERGED", merged: true}
  ]

  milestones: [
    {name: "v1.0: Core Workflows", number: 1, state: "open", open_issues: 3, closed_issues: 5}
  ]

If any gh command fails during readback: return partial data with a note.
Never block the status dashboard because GitHub is unreachable.
```

### Dashboard Display Format

The status command should render GitHub data in this format:

```
## GitHub

| Phase | Issue | PR | Status |
|-------|-------|----|--------|
| Phase 1: Plugin Foundation | #1 Closed | #10 Merged | Complete |
| Phase 2: Project Init | #2 Closed | #11 Merged | Complete |
| Phase 3: Phase Planning | #3 Open | — | In Progress |

Milestones:
- v1.0: Core Workflows (#1) — 5/8 issues closed
```

Status is derived from the combination of issue state and PR state:

| Issue State | PR State | Display Status |
|-------------|----------|----------------|
| Open | None | In Progress |
| Open | Open | In Review |
| Closed | Merged | Complete |
| Closed | Closed (not merged) | Closed |
| Closed | None | Complete (no PR) |

---

## Section 6: State Linking

How GitHub metadata is stored in STATE.md. This section defines the canonical format for the GitHub integration table.

```
GitHub metadata is stored in a ## GitHub section at the END of STATE.md
(after the Next Action section):

## GitHub

| Phase | Issue | PR | Status |
|-------|-------|----|--------|
| Phase 1: Plugin Foundation | #1 | #10 | Merged |
| Phase 2: Project Initialization | #2 | #11 | Merged |
| Phase 3: Phase Planning | #3 | — | Open |

### Milestones

| Milestone | GitHub # | Status |
|-----------|----------|--------|
| v1.0: Core Workflows | #1 | Open |
```

### Update Rules

These rules govern how and when the STATE.md ## GitHub section is modified:

1. **Add a row** when an issue is created (Section 2.2)
   - Phase column: full phase name from ROADMAP.md
   - Issue column: `#{number}`
   - PR column: `—` (em dash, not hyphen)
   - Status column: `Open`

2. **Update PR column** when a PR is created (Section 3.2)
   - Replace `—` with `#{pr_number}`
   - Do NOT change the Status column

3. **Do NOT update Status column** in STATE.md
   - Status is always fetched live via Section 5
   - The Status column in STATE.md is a snapshot from the last readback
   - It is informational only — the live fetch is the source of truth

4. **Milestone rows** are added when synced to GitHub (Section 4.1)
   - Milestone column: milestone name from ROADMAP.md
   - GitHub # column: `#{number}`
   - Status column: snapshot from creation time

5. **Section creation** — if the ## GitHub section does not exist in STATE.md when the first GitHub operation runs, create it with the table headers and the first row.

### Section Placement

The ## GitHub section is always the LAST section in STATE.md. If STATE.md is updated by other operations (e.g., state advance-plan), the GitHub section must remain at the end. When adding the section for the first time, append it after all existing content with a blank line separator.

---

## Section 7: Error Handling

Comprehensive error handling for all GitHub operations. The core principle: GitHub integration is always optional. No GitHub error should ever block a Legion workflow.

### e1: gh CLI not installed

```
Detection: which gh returns non-zero (or command -v gh fails)
Action: Skip all GitHub operations. No warning, no suggestion to install.
Rationale: The user may be in an environment where gh cannot be installed.
         Do not nag about optional tooling.
```

### e2: gh not authenticated

```
Detection: gh auth status returns non-zero
Action: Skip all operations.
  Suggest ONCE per session: "Run `gh auth login` to enable GitHub integration."
Note: Only suggest ONCE — not on every skipped operation.
  Track with a session flag to prevent repeated suggestions.
  After the first suggestion, all subsequent skips are silent.
```

### e3: No GitHub remote

```
Detection: git remote get-url origin returns non-zero
Action: Skip all operations silently.
  Do not suggest adding a remote — the project may intentionally be local-only.
  Do not check for other remote names (upstream, github, etc.) — only origin.
```

### e4: Issue creation fails

```
Detection: gh issue create returns non-zero
Action:
  - Log the error text returned by gh
  - Continue workflow — issue creation is optional
  - The phase execution is still valid
  - Do NOT retry automatically
Common causes:
  - Permission denied (user lacks write access)
  - Repository is archived
  - Label creation failed (Section 2.1)
  - Network timeout
```

### e5: PR creation fails

```
Detection: gh pr create returns non-zero
Action:
  - Report the error to the user with the full error message
  - The phase execution is still valid — all commits exist locally
  - Do NOT retry automatically
Common causes:
  - Branch already has an open PR (suggest: gh pr view)
  - No commits to diff (branch is up to date with base)
  - Permission denied
  - Base branch doesn't exist on remote
  - Push failed in Section 3.1 Step 3
```

### e6: Milestone API fails

```
Detection: gh api returns non-zero for milestone operations
Action:
  - Skip milestone operations entirely
  - Issues can still be created without milestone assignment
  - Log: "Milestone sync skipped — API call failed"
  - Continue with the rest of the workflow
```

### e7: Rate limiting (HTTP 403/429)

```
Detection: gh api returns rate limit error
  - HTTP 403 with "rate limit" in the response body
  - HTTP 429 (Too Many Requests)
Action:
  - Log the warning: "GitHub API rate limit reached. Some data may be incomplete."
  - Return partial data for status readback (Section 5)
  - Do not retry automatically — rate limits reset on their own schedule
  - Do not queue operations for later — the current session should complete
```

### e8: Network connectivity issues

```
Detection: gh commands fail with connection errors (timeout, DNS resolution, etc.)
Action:
  - Treat as github_available = false for the remainder of the session
  - Do not retry — network issues are unlikely to resolve mid-command
  - Log: "GitHub unreachable. Continuing without GitHub integration."
```

### Error Priority

When multiple errors could apply, use this priority order:

1. e1 (gh not installed) — checked first in prerequisites
2. e2 (not authenticated) — checked second in prerequisites
3. e3 (no remote) — checked third in prerequisites
4. e7/e8 (rate limit / network) — detected during operations, downgrades session
5. e4/e5/e6 (operation failures) — handled per-operation, do not affect other operations

---

## Section 8: Graceful Degradation

The golden rule: every workflow that calls GitHub operations must work identically without them. This pattern mirrors the Memory Manager's degradation approach.

```
All GitHub integration follows this pattern:

1. Run Prerequisites check (Section 1)
2. If github_available is true: perform the GitHub operation
3. If github_available is false: skip silently, proceed with default behavior
4. Never error, never block, never require GitHub for workflow completion
5. If a GitHub operation fails mid-way: log the error, continue the workflow
6. The system works identically with or without GitHub integration

Caller pattern (used by plan.md, build.md, status.md, review.md, milestone.md):

  # At the start of any workflow that uses GitHub:
  # Run: gh auth status 2>&1 && git remote get-url origin 2>/dev/null
  # If both succeed: github_available = true
  # If either fails: github_available = false, skip GitHub steps

  # Within the workflow:
  # if github_available:
  #   perform GitHub operation
  #   if operation fails:
  #     log error
  #     continue without GitHub result
  # else:
  #   skip GitHub step entirely (no log, no warning)
```

### Degradation Levels

The system operates at one of three levels during any session:

| Level | Condition | Behavior |
|-------|-----------|----------|
| Full | gh authenticated + remote exists | All GitHub operations active |
| Partial | gh authenticated but operation fails | Skip failed operation, continue others |
| None | gh missing, not authenticated, or no remote | Skip all GitHub operations silently |

### Testing Graceful Degradation

To verify a workflow degrades gracefully:

1. Remove GitHub remote: `git remote remove origin`
2. Run the workflow (`/legion:plan`, `/legion:build`, `/legion:status`, `/legion:review`)
3. Confirm it completes successfully with no errors or warnings about GitHub
4. Re-add the remote: `git remote add origin {url}`
5. Confirm GitHub operations resume on the next workflow run

Alternatively, test with an unauthenticated gh:
1. Run `gh auth logout`
2. Run any Legion workflow
3. Confirm it completes without GitHub-related errors
4. Run `gh auth login` to restore access

### Integration Contract

Every Legion command that integrates with GitHub MUST follow this contract:

1. **Check before use** — call the prerequisites check (Section 1) once at the start
2. **Wrap each operation** — every `gh` command is wrapped in an availability check
3. **Handle partial failure** — if one operation fails, others may still succeed
4. **No cascading failures** — a GitHub error in `/legion:build` does not affect plan execution
5. **No required outputs** — no downstream step depends on a GitHub issue number or PR URL existing

---

## References

This skill is consumed by:

| Consumer | Operation | Section |
|----------|-----------|---------|
| `plan.md` | Create phase issue after planning | Section 2 |
| `build.md` | Update issue checklist, create PR | Sections 2, 3 |
| `status.md` | Live GitHub status readback | Section 5 |
| `review.md` | Close issue after review passes | Section 2 |
| `milestone.md` | Create and close GitHub milestones | Section 4 |
| `execution-tracker.md` | PR creation commit convention | Section 3 |

State linking format is defined in Section 6.
Prerequisites check is defined in Section 1 and must be called before any operation.
Error handling is defined in Section 7 — all consumers should handle GitHub unavailability silently.
