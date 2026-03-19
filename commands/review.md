---
name: legion:review
description: Run quality review cycle with testing/QA agents
argument-hint: [--phase N] [--dry-run]
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, Agent, TeamCreate, TeamDelete, TaskCreate, TaskUpdate, TaskList, SendMessage, AskUserQuestion]
---

<objective>
Select appropriate review agents for the current phase, run a personality-injected dev-QA review loop using `settings.review.max_cycles` (default 3), route fixes to the right agents, and mark the phase complete only after review passes. Escalate to the user if the configured cycle limit fails to resolve all blockers.
</objective>

<execution_context>
skills/workflow-common-core/SKILL.md
skills/agent-registry/SKILL.md
skills/agent-registry/CATALOG.md
skills/review-loop/SKILL.md
skills/review-panel/SKILL.md
skills/execution-tracker/SKILL.md
skills/intent-router/SKILL.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<process>
DRY-RUN MODE (deterministic, no side effects)
   - If `$ARGUMENTS` contains `--dry-run`, DO NOT write files, spawn agents, open Teams, send messages, commit, close issues, or perform external side effects.
   - Validate prerequisites only (target phase eligibility, summary presence, files-to-review extraction).
   - Output a deterministic dry-run report artifact to stdout with sections:
     - Command: `review`
     - Target phase
     - Prerequisite checks: PASS/FAIL with reasons
     - Reviewer selection preview
     - Skills that would load (always + conditional)
   - Stop after reporting.

## Intent-Driven Review

| Flag | Description |
|------|-------------|
| `--just-security` | Security-only audit (OWASP + STRIDE) |

Examples:
- `/legion:review` — Full review panel (all domains)
- `/legion:review --just-security` — Security-only review

0. CONDITIONAL SKILL LOADING (context budget)
   Load optional skills only when prerequisites are present:

   - `skills/workflow-common-memory/SKILL.md` only if `.planning/memory/` exists or this review stores outcomes/preferences.

   - `skills/workflow-common-github/SKILL.md` only if `gh auth status` succeeds and a git remote exists.

   - `skills/workflow-common-domains/SKILL.md` only for design/marketing domain review contexts.

   - `skills/review-evaluators/SKILL.md` only if `settings.review.evaluator_depth` is `"multi-pass"` (default).
   If a condition is not met, skip that skill silently and continue.

## Step 0.5: INTENT DETECTION AND VALIDATION

If $ARGUMENTS contains intent flags (--just-*):

1. **Parse Intent Flags**
   - Load skill: intent-router
   - Call: parseIntentFlags($ARGUMENTS)
   - Expected for review: [{name: "security-only"}] (--just-security)

2. **Validate for Review Command**
   - Call: validateFlagCombination(intents, "review")
   - Only "security-only" intent is valid for review command
   - If other intents detected (harden, document, etc.):
     - ERROR: "{intent} is only valid for /legion:build"
     - EXIT

3. **Determine Review Mode**
   - Normal mode: No intent flags → Full review panel (all domains)
   - Intent mode: --just-security → Filtered panel (security domains only)
   - Set: REVIEW_MODE = "full" | "security-only"

4. **Load Intent Configuration**
   - Load: intent-teams.yaml
   - Get: security-only template (agents, domains)
   - Domains: ["security", "owasp", "stride", "authentication", "authorization"]

## Step 0.7: NATURAL LANGUAGE INTENT DETECTION

If $ARGUMENTS contains text that does NOT match any `--just-*` flags (i.e., no structured intent flags were parsed in Step 0.5), treat the arguments as natural language input and attempt NL routing via intent-router Section 7.

a. **Check for NL input**: If `parseIntentFlags($ARGUMENTS)` returned no flags (rawFlags is empty) AND $ARGUMENTS is not empty AND $ARGUMENTS does not start with `--`:
   - Concatenate arguments into a single string: `nlInput = $ARGUMENTS.join(' ')`
   - Call: `parseNaturalLanguage(nlInput)` from intent-router Section 7

b. **Route based on confidence**:
   - **HIGH (>= 0.8)**: Proceed as if the equivalent flags were passed.
     - If result routes to `/legion:review` with flags: inject those flags and continue to Step 0.5 logic
     - If result routes to a different command (e.g., `/legion:build`): display cross-command suggestion:
       `"Your input '{nlInput}' matches {result.command}. Did you mean to run {result.command} instead?"`
       Use adapter.ask_user with options:
       - "Yes, run {result.command} instead"
       - "No, proceed with standard review"
       - "Cancel"
       If "Yes": EXIT and advise user to run {result.command}
       If "No": proceed with standard review (no intent flags)
       If "Cancel": EXIT without executing review.
   - **MEDIUM (0.5-0.79)**: Confirm with user via adapter.ask_user:
     `"Did you mean: {result.fallbackSuggestion}?"` with options: ["Yes, proceed", "No, standard review", "Cancel"]
     - If confirmed: inject parsed flags and continue
     - If declined: proceed with standard review (no intent flags)
   - **LOW (< 0.5)**: Display suggestions and ask user:
     `"{result.fallbackSuggestion}"` with options to pick a suggestion or proceed with standard review

c. **No match**: If NL parsing returns confidence 0 or no candidates, proceed with standard review (no intent flags).

1. DETERMINE TARGET PHASE
   - Check $ARGUMENTS for --phase N flag (e.g., `/legion:review --phase 4`)
   - If no flag: read STATE.md to determine current phase
     - Use the phase number from "Phase: N of M" in Current Position
     - Valid states for review: "executed, pending review" or "partial"
     - If status says "planned" or "pending": error — "Phase {N} hasn't been executed yet. Run /legion:build first."
     - If status says "complete": error — "Phase {N} already passed review. Run /legion:plan {N+1} for the next phase."
   - Validate: phase must exist in ROADMAP.md
   - Check that phase directory has SUMMARY.md files (proof of execution):
     - Look for files matching .planning/phases/{NN}-{slug}/{NN}-{PP}-SUMMARY.md
     - If no SUMMARY.md files found: error — "Phase {N} has no execution summaries. Run /legion:build first."
   - Display: "Reviewing Phase {N}: {phase_name}"

2. RESOLVE AGENT PATH (must run before any agent references)
   Follow workflow-common Agent Path Resolution Protocol to resolve AGENTS_DIR.
   Store the resolved value for ALL personality loading in Steps 4 and 5.
   This MUST complete before Step 4 — do not proceed to agent selection without a resolved AGENTS_DIR.

3. GATHER PHASE CONTEXT
   Follow review-loop skill Section 3, Step 1 (Gather phase artifacts):
   - Read the phase CONTEXT.md at .planning/phases/{NN}-{slug}/{NN}-CONTEXT.md for the phase
     goal and success criteria
   - Read all {NN}-{PP}-PLAN.md files in the phase directory to understand what should have
     been built — extract files_modified list from each plan's YAML frontmatter
   - Read all {NN}-{PP}-SUMMARY.md files in the phase directory to understand what was actually
     done and whether each plan completed successfully
   - From each plan's files_modified frontmatter, build the complete deduplicated list of files
     to review
   - Read the ROADMAP.md success criteria for this phase (under ### Phase {N}: section)
   - Display context summary:
     "Phase {N}: {phase_name}
      Goal: {phase_goal}
      Plans executed: {count} ({list plan names and statuses from SUMMARY.md})
      Files to review: {count}
      {file list — one per line}"

   3.5 DETECT MANUAL EDITS (preference capture — optional)
       Check for user manual edits to build-modified files before review begins:
       1. Build the files_modified list from plan YAML frontmatter (already done above)
       2. Run: git diff --name-only HEAD
          This shows uncommitted changes since the last commit
       3. Intersect: files in BOTH files_modified AND git diff output
       4. If intersection is non-empty:
          Report: "Detected {count} manual edit(s) to build-modified files: {file list}"
          For each manually-edited file, store a preference (if memory available):
          - Decision Point: "manual-edit"
          - Context: "Phase {N}, pre-review manual edit to {file}"
          - Proposed: "Agent output for {file} during Phase {N} build"
          - User Choice: "User manually edited {file} before review ({brief diff summary})"
          - Signal: "corrective"
          - Agent: the agent that modified this file (from plan agent assignment)
          - Tags: "manual-edit", "pre-review", file extension, phase slug
       5. If no manual edits: skip silently
       6. If git diff fails or memory not available: skip silently
       This is informational — manual edit detection never blocks review.

4. SELECT REVIEW AGENTS

   **4.0 Choose Review Mode**
   
   **If REVIEW_MODE === "security-only":**
   1. Use intent template agents:
      - Primary: engineering-security-engineer
      - Secondary: testing-api-tester (for API security)
   2. Skip normal agent registry recommendation
   3. Set: agents = [security-engineer, api-tester]
   4. Go directly to Step 5 (Execute Review Cycle)

   **If REVIEW_MODE === "full":**
   Use adapter.ask_user to offer the review approach:
   "How should reviewers be selected for this phase?"
   Options:
   - "Dynamic review panel (Recommended)" — 2-4 agents selected by agent-registry scoring with domain-weighted rubrics
     Description: "Panel composer analyzes what was built and assembles the best reviewers with non-overlapping evaluation criteria"
   - "Classic reviewer selection" — static mapping based on phase type
     Description: "Uses the predefined phase-type-to-agent table (testing-reality-checker + domain secondary)"

   If user selects "Dynamic review panel": go to Step 4-PANEL below
   If user selects "Classic reviewer selection": continue with existing Step 4.a-4.e unchanged

   **CLASSIC MODE** (unchanged from original):
   Follow review-loop skill Section 2 (Review Agent Selection):

   a. Classify the phase type from its CONTEXT.md and SUMMARY.md content — detect which of
      these categories describe what was built:
      - "code"           — new code files, skills, commands, scripts, configuration
      - "api"            — API endpoints, integrations, external service connections
      - "design"         — UI components, design systems, visual assets, CSS
      - "marketing"      — content documents, campaign plans, copy, strategy docs
      - "infrastructure" — CI/CD, deployment configs, server setup, tooling
      - "workflow"       — process documents, methodology files, skill .md files

   b. Map phase type to primary + secondary review agents using the selection table from
      review-loop Section 2:
      - code:           testing-reality-checker (primary) + testing-evidence-collector (secondary)
      - api:            testing-api-tester (primary) + testing-reality-checker (secondary)
      - design:         design-brand-guardian (primary) + testing-reality-checker (secondary)
      - marketing:      testing-workflow-optimizer (primary) + testing-reality-checker (secondary)
      - infrastructure: testing-reality-checker (primary) + testing-performance-benchmarker (secondary)
      - workflow:       testing-workflow-optimizer (primary) + testing-reality-checker (secondary)
      For phases spanning multiple types, use up to 3 reviewers (one per type, max)
      Always include testing-reality-checker as primary or secondary

   c. Validate each selected agent's personality file exists:
      - Confirm file at: {AGENTS_DIR}/{agent-id}.md   (AGENTS_DIR resolved in Step 2)
      - If missing: fall back to testing-reality-checker for that slot
      - Log any fallback: "Warning: {agent-id}.md not found. Using testing-reality-checker."

   d. Present selected reviewers to user via adapter.ask_user:
      Show the reviewer confirmation display from review-loop Section 2:
      "## Phase {N}: {phase_name} — Review Setup
       Phase Type(s): {detected types}
       Artifacts to Review: {count} files
       Selected Reviewers:
       | Slot | Agent ID                    | Role                        | Rationale      |
       |------|-----------------------------|-----------------------------|----------------|
       | 1    | {primary-agent-id}          | {role description}          | {why selected} |
       | 2    | {secondary-agent-id}        | {role description}          | {why selected} |"
      Options:
      - "{primary_agent_name} + {secondary_agent_name}" (Recommended)
      - "{primary_agent_name} only" — single reviewer, faster but less thorough
      - "{alternative_agent_name} + {primary_agent_name}" — different reviewer pair
      - "Other" — enter custom agent IDs

   e. If user selects "Other": accept custom agent IDs from user input and validate each one
      exists in agent-registry

   DESIGN REVIEW ENHANCEMENT (optional — follows design-workflows Section 4):
   - If phase type includes "design" AND design documents exist at .planning/designs/:
     a. Use three-lens design review instead of default single-reviewer mapping
     b. Select three design reviewers (within the max 3 reviewer limit):
        - design-brand-guardian (brand lens — visual identity compliance, voice consistency)
        - design-ux-architect (accessibility lens — WCAG compliance, keyboard nav, contrast)
        - design-ux-researcher (usability lens — Nielsen's heuristics, IA, user flows)
     c. Each reviewer uses design-specific checklists from design-workflows Section 4.3
     d. Findings use design-specific categories (Brand Violation, Accessibility Failure, Usability Critical, etc.)
   - If not a design phase or no design documents:
     Use default review agent selection (no impact)

   **4-PANEL: DYNAMIC REVIEW PANEL COMPOSITION** (only if panel mode selected in 4.0)
   Follow review-panel skill Section 1 (Panel Composition Algorithm):

   a. Extract review signals from phase artifacts (Section 1, Step 1):
      - Read CONTEXT.md for phase goal and domains
      - Read SUMMARY.md files for what was actually built
      - Read files_modified lists for file types produced
      - Compose a task description combining domains, file types, and keywords

   b. Score agents using agent-registry Section 3 (Section 1, Step 2):
      - Pass the composite task description to the recommendation algorithm
      - Apply scoring: exact match (3 pts), partial (1 pt), division (2 pts)
      - Apply memory boost if available

   c. Filter to review-capable agents (Section 1, Step 3):
      - Keep only agents from the review-capable list in review-panel Section 1
      - Skip non-review agents even if they scored highly

   d. Cap panel size and enforce diversity (Section 1, Step 4):
      - 2 reviewers for single-domain, 3 for standard, 4 for cross-domain
      - Max 2 from same division
      - At least 1 Testing division agent

   e. Assign rubrics from review-panel Section 2 (Section 1, Step 5):
      - Look up each agent's rubric by agent ID
      - Fall back to division default if no specific rubric exists

   f. Present panel to user for confirmation (Section 1, Step 6):
      - Show the panel table with scores, rubric focus, and rationale
      - Allow adding, replacing, or customizing reviewers
      - Store the confirmed panel for use in Step 5

   **Panel mode reviewers are used in Step 5 identically to classic reviewers**, with one
   addition: each reviewer's prompt includes the rubric injection from review-panel Section 2.

#### Evaluator Depth

Read `settings.review.evaluator_depth` (default: `"multi-pass"`).

If `"multi-pass"`:
- Load the `review-evaluators` skill (read `skills/review-evaluators/SKILL.md`)
- After panel composition, determine which evaluator types apply based on phase type
- Each selected evaluator runs its full pass list as a single rubric
- Findings from evaluators are merged with panel findings and deduplicated

If `"single"`:
- Standard single-pass review per agent (existing behavior)
- review-evaluators skill is NOT loaded

5. EXECUTE REVIEW CYCLE
   Initialize: cycle_count = 0

   **Coordination Setup** (once, before review loop):
   Follow the active adapter's Execution Protocol to initialize review coordination.
   (e.g., TeamCreate on Claude Code; WAVE-CHECKLIST.md on other CLIs)

   Read `settings.review.max_cycles` from project settings (default 3 if not set). Store as {max_cycles}.

   **LOOP START** (max {max_cycles} iterations):

   a. Increment cycle_count by 1
      Announce: "Review cycle {cycle_count}/{max_cycles} — Phase {N}: {phase_name}"

   b. Spawn review agents (follow review-loop Section 3):
      For each selected reviewer:
      1. Read the reviewer's personality .md file in full
         (path: {AGENTS_DIR}/{agent-id}.md — AGENTS_DIR resolved in Step 2)
      2. Construct the review prompt using the exact format in review-loop Section 3, Step 3:
         - Start with {PERSONALITY_CONTENT} (full file, no truncation)
         - Separator: "---"
         - "# Review Task" header with phase name, goal, success criteria, plans executed,
           files to review, review instructions, required feedback format, and
           adapter-based reporting requirement
         - For re-review cycles (cycle_count > 1): include the re-review context block from
           review-loop Section 6, Step 3 with previous findings, what was fixed, and what
           remains unresolved
      2.5. If PANEL MODE is active (selected in Step 4.0):
           After the "## Your Review Instructions" section and before "## Required Feedback Format",
           inject the reviewer's domain rubric from review-panel Section 2:

           "## Your Domain Rubric — {rubric_name}

           Evaluate ONLY against these criteria. Other aspects are covered by fellow panel reviewers.

           | # | Criterion | What to Check |
           |---|-----------|---------------|
           {rubric criteria rows from review-panel Section 2}

           For each finding, tag it with the criterion number: '**Criterion**: {N} — {criterion_name}'"

           This scopes the reviewer's evaluation to their assigned domain, ensuring non-overlapping
           coverage across the panel.

      3. Spawn per adapter.spawn_agent_personality:
         - model: adapter.model_execution
         - name: "{agent-id}-review-{NN}-c{cycle_count}"
           (e.g., "testing-reality-checker-review-05-c1")
         - prompt: {constructed prompt from step 2}
         - Additional parameters per adapter
      If adapter.parallel_execution: issue ALL reviewer spawn calls simultaneously
      If not: spawn reviewers sequentially

   c. Collect review results (follow review-loop Section 4):
      - Wait for all review agents to report findings per adapter.collect_results
      - Parse findings: extract each Finding block (file, line/section, severity, issue,
        details, suggested fix, reviewer agent ID)
      - Deduplicate across reviewers per review-loop Section 4, Step 2:
        same file + same line/section → keep highest severity; reviewers disagree on
        severity for same issue → escalate to BLOCKER
      - Triage: must-fix list = all BLOCKERs + all WARNINGs; nice-to-have = all SUGGESTIONs

   d. Display findings table (follow review-loop Section 4, Step 4):
      ## Review Findings — Cycle {cycle_count}/{max_cycles} — Phase {N}

      | #  | Severity   | File                    | Issue (brief)              | Reviewer           |
      |----|------------|-------------------------|----------------------------|--------------------|
      | 1  | BLOCKER    | path/to/file.md         | {brief issue}              | {agent-id}         |
      | 2  | WARNING    | path/to/other.md        | {brief issue}              | {agent-id}         |
      | 3  | SUGGESTION | path/to/third.md        | {brief issue}              | {agent-id}         |

      **Blockers**: {count} | **Warnings**: {count} | **Suggestions**: {count}
      **Verdicts**: {reviewer-id}: {PASS|NEEDS WORK|FAIL}, ...
      Verdict: {aggregate verdict — PASS if no blockers/warnings, NEEDS WORK otherwise}

   d2. PANEL SYNTHESIS (only if panel mode active):
       Follow review-panel Section 3 (Panel Result Synthesis):
       - Group findings by domain lens (each reviewer's rubric focus area)
       - Identify cross-cutting themes: hot spots, criteria at risk, strong areas
       - Compute aggregate verdict using panel rules
       - Display the consolidated synthesis report
       The aggregate verdict from synthesis REPLACES the simple verdict computation —
       use it for the pass/fail decision in steps 5.e and 5.f.

   e. If aggregate verdict is PASS (must-fix list is empty AND all reviewers gave PASS):
      - Break the loop — go to step 6, Path A

   f. If verdict is NEEDS WORK or FAIL and cycle_count < {max_cycles}:
      Route fixes per review-loop Section 5 (Fix Cycle):
      - For each must-fix finding, determine the fix agent by file type:
        .md skill/command/agent/planning files → autonomous (no personality)
        .ts/.js/.jsx/.tsx → engineering-frontend-developer or engineering-backend-architect
        .py/.rb/.go/.rs → engineering-backend-architect
        .css/.scss/design assets → design-ux-architect
        marketing/content .md → marketing-content-creator
        CI/CD/infrastructure configs → engineering-devops-automator
        No clear match → autonomous
      - Group findings by fix agent to minimize spawns
      - Construct fix prompts per review-loop Section 5, Step 3:
        For personality-injected agents:
          1. Load personality from {AGENTS_DIR}/{agent-id}.md (AGENTS_DIR resolved in Step 2)
          2. Full personality content + "# Fix Task" with findings list
          If personality file is missing: fall back to autonomous mode, log the warning
        For autonomous agents: "# Fix Task" with findings list only
      - Spawn fix agents per adapter (parallel if supported, sequential if not):
        model: adapter.model_execution
        name: "{agent-id}-fix-{NN}-cycle{cycle_count}"
      - Wait for all fix agents to report per adapter.collect_results
      - Track per finding: fixed (by which agent) vs. not-fixed (with reason)
      - Create fix commit:
        git add {only files actually modified by fix agents}
        git commit -m "fix(legion): review cycle {cycle_count} fixes for phase {N}

        Phase {N}: {phase_name}
        Fixed {count} issues: {brief comma-separated descriptions}
        Unresolved: {count or "none"}

        {adapter.commit_signature}"
      - Update STATE.md: "Phase {N} under review — cycle {cycle_count}/{max_cycles}, {blocker_count}
        blocker(s) remaining"
      - Go back to LOOP START for re-review (re-review scopes to modified files per
        review-loop Section 6, Step 2)

   g. If cycle_count >= {max_cycles} AND blockers remain:
      - Break the loop — go to step 6, Path B (escalation)

   **LOOP END**

   **Coordination Cleanup** (always runs — success, escalation, or error paths):
   - Use adapter.shutdown_agents to gracefully terminate spawned agents
   - Use adapter.cleanup_coordination to clean up

6. COMPLETE REVIEW
   Determine outcome based on loop result:

   If REVIEW_MODE === "full":
      [Existing Step 6 logic unchanged]

   If REVIEW_MODE === "security-only":
      → Use Step 6-INTENT below

## Step 6-INTENT: SECURITY-ONLY OUTPUT

If REVIEW_MODE === "security-only":

1. **Generate Security Report**
   Write to: `.planning/security-review-{timestamp}.md`
   
   Template:
   ```markdown
   # Security Review Report
   
   **Generated:** {timestamp}
   **Mode:** --just-security (security-only audit)
   **Agents:** engineering-security-engineer, testing-api-tester
   
   ## Executive Summary
   - Total findings: {count}
   - Critical (BLOCKER): {count}
   - High (WARNING): {count}
   - Low (SUGGESTION): {count}
   
   ## OWASP Top 10 Coverage
   - [ ] A01: Broken Access Control — {findings}
   - [ ] A02: Cryptographic Failures — {findings}
   - [ ] A03: Injection — {findings}
   - [ ] A05: Security Misconfiguration — {findings}
   - [ ] A07: Auth Failures — {findings}
   - [ ] ...
   
   ## STRIDE Threats Identified
   - Spoofing: {findings}
   - Tampering: {findings}
   - Repudiation: {findings}
   - Information Disclosure: {findings}
   - Denial of Service: {findings}
   - Elevation of Privilege: {findings}
   
   ## Findings
   {Finding blocks from review panel}
   
   ## Remediation Priority
   1. [BLOCKER] {highest severity finding}
   2. [WARNING] {next priority}
   ...
   ```

2. **Display Summary**
   ```
   Security-only review complete.
   
   Findings: {total} (BLOCKER: {blocker}, WARNING: {warning}, SUGGESTION: {suggestion})
   Report: .planning/security-review-{timestamp}.md
   
   Next steps:
   - Review BLOCKER findings immediately
   - Run /legion:build --just-harden for detailed remediation
   - Run full /legion:review for complete audit
   ```

3. **EXIT** (security-only review complete)

   **Path A: Review Passed** (follow review-loop Section 7)

   a. Generate review summary file (review-loop Section 7, Step 1):
      Write .planning/phases/{NN}-{slug}/{NN}-REVIEW.md with:
      - "# Phase {N}: {phase_name} — Review Summary"
      - "## Result: PASSED"
      - Cycles used, reviewer list, completion date
      - Findings summary table (total, blockers found/resolved, warnings found/resolved, suggestions)
      - Findings detail table (each finding: severity, file, issue, fix applied, cycle fixed)
      - Reviewer verdicts (each reviewer: final verdict, key observations)
      - Suggestions section (SUGGESTION-severity findings noted but not required)

   b. Mark phase complete in state files (review-loop Section 7, Step 2):
      Update STATE.md:
      - Phase: {N} of {total} (complete)
      - Status: "Phase {N} complete — review passed ({cycles} cycle(s))"
      - Last Activity: "Phase {N} review passed ({date})"
      - Next Action:
        If more phases remain: "Run `/legion:plan {N+1}` to plan the next phase"
        If this was the last phase: "All phases complete — project review finished!"
      Write updated STATE.md
      Update ROADMAP.md progress table:
      - Mark [x] on the phase row
      - Status column: "Complete"
      Write updated ROADMAP.md

   c. Create review completion commit:
      git add .planning/phases/{NN}-{slug}/{NN}-REVIEW.md
      git add .planning/STATE.md
      git add .planning/ROADMAP.md
      git commit -m "chore(legion): phase {N} review passed — {phase_name}

      Review passed after {cycles} cycle(s).
      {blocker_count} blocker(s) fixed, {warning_count} warning(s) fixed.
      Reviewers: {comma-separated reviewer IDs}

      {adapter.commit_signature}"

   c1.5. GITHUB ISSUE CLOSE (optional — follows github-sync Section 8)
         - Check GitHub availability: gh auth status && git remote get-url origin
         - If github_available and STATE.md ## GitHub section has an issue number for this phase:
           Close the issue: gh issue close {number} --comment "Phase {N}: {phase_name} review passed. All plans verified."
         - If github_available is false: skip silently

   c2. RECORD REVIEW OUTCOME (optional — follows memory-manager Section 6):
       If .planning/memory/OUTCOMES.md exists or .planning/memory/ directory can be created:
         Follow memory-manager Section 3 (Store Outcome):
         - Agent: comma-separated list of reviewer agent IDs (e.g., "testing-reality-checker, testing-evidence-collector")
         - Task Type: "quality-review"
         - Outcome: "success"
         - Importance: 2 if passed in cycle 1, 3 if passed in cycle 2+
         - Tags: phase slug, reviewer agent IDs, "review-passed", cycle count
         - Summary: "Phase {N} review passed in {cycles} cycle(s). {blocker_count} blockers fixed."
         NOTE: Memory write is included in the review completion git commit via git add.
       If memory is not available: skip silently.

   c3. CAPTURE PREFERENCE — review verdict (optional — follows memory-manager Section 13)
       If .planning/memory/ exists or can be created:
         Follow memory-manager Section 13 (Store Preference):
         - Decision Point: "review-verdict"
         - Context: "Phase {N} review passed in {cycles} cycle(s). Reviewers: {reviewer list}"
         - Proposed: "Review findings: {blocker_count} blockers, {warning_count} warnings — all resolved by fix agents"
         - User Choice: "Accepted — review passed, proceeding to next phase"
         - Signal: "positive"
         - Agent: comma-separated list of reviewer agent IDs
         - Tags: "review-verdict", "review-passed", phase slug, reviewer agent divisions
       If memory not available: skip silently.
       NOTE: This captures a positive signal — the review process and its agents produced
       accepted results. Especially valuable when review passes on cycle 1 (clean execution).

   d. Display pass result:
      "Phase {N}: {phase_name} — Review PASSED ({cycles} cycle(s))
       {count} issues found and resolved."

   **Path B: Review Escalated** (follow review-loop Section 8)

   a. Generate escalation report (review-loop Section 8, Step 1):
      Write .planning/phases/{NN}-{slug}/{NN}-REVIEW.md with:
      - "# Phase {N}: {phase_name} — Review Summary"
      - "## Result: ESCALATED"
      - Cycles used: 3 (maximum reached), remaining blockers count, remaining warnings count
      - Unresolved Findings section: for each unresolved finding — file, severity, original
        issue, fix attempts per cycle, reason unresolved
      - Resolved Findings section: findings that were successfully fixed
      - Recommendation: brief assessment of root cause and guidance for resolution

   b. Update STATE.md (review-loop Section 8, Step 2):
      - Status: "Phase {N} review escalated — {count} unresolved blocker(s) after 3 cycles"
      - Last Activity: "Phase {N} review escalated ({date})"
      - Next Action: "Review .planning/phases/{NN}-{slug}/{NN}-REVIEW.md for full details.
        Fix manually then re-run /legion:review, or accept as-is and proceed."
      Write updated STATE.md

   b2. RECORD REVIEW OUTCOME (optional — follows memory-manager Section 6):
       If .planning/memory/OUTCOMES.md exists or .planning/memory/ directory can be created:
         Follow memory-manager Section 3 (Store Outcome):
         - Agent: comma-separated list of reviewer agent IDs
         - Task Type: "quality-review"
         - Outcome: "failed"
         - Importance: 5 (escalation is always high-signal)
         - Tags: phase slug, reviewer agent IDs, "review-escalated", "3-cycles", unresolved blocker files
         - Summary: "Phase {N} review escalated — {blocker_count} blocker(s) unresolved after 3 cycles."
       If memory is not available: skip silently.

   c. Display escalation table with remaining blockers (review-loop Section 8, Step 4):
      ## Phase {N}: {phase_name} — Review Escalated

      3 review cycles completed. {count} blocker(s) remain unresolved.

      ### Remaining Blockers
      | # | File          | Issue                 | Fix Attempts         |
      |---|---------------|-----------------------|----------------------|
      | 1 | path/file.md  | {brief issue}         | {3 attempts summary} |

   d. Use adapter.ask_user: "How would you like to proceed?"
      Options:
      - "Fix manually and re-run /legion:review" — exit; let user address the issues
      - "Accept as-is and move to /legion:plan {N+1}" — mark phase complete despite issues
      - "Investigate further" — exit for user to diagnose root cause

   e. If user selects "Accept as-is":
      - Mark phase complete using the same STATE.md and ROADMAP.md updates as Path A
      - Note in REVIEW.md under a new section:
        "## User Override
         Accepted with {count} unresolved blocker(s) by user decision on {date}."
      - CAPTURE PREFERENCE — review override (optional — follows memory-manager Section 13)
        If .planning/memory/ exists or can be created:
          Follow memory-manager Section 13 (Store Preference):
          - Decision Point: "review-override"
          - Context: "Phase {N} review escalated — {count} unresolved blockers. User accepted as-is."
          - Proposed: "Review found {count} unresolved blockers after 3 cycles: {brief blocker descriptions}"
          - User Choice: "Accepted as-is despite unresolved blockers — user override"
          - Signal: "corrective"
          - Agent: comma-separated list of reviewer agent IDs
          - Tags: "review-override", "accepted-with-issues", phase slug
        If memory not available: skip silently.
        NOTE: This captures a corrective signal — the user accepted despite review failures,
        suggesting the blockers may not be as critical as the reviewers assessed.
      - Create review completion commit (same message as Path A but append "with overrides")

   f. If user selects "Fix manually" or "Investigate further":
      CAPTURE PREFERENCE — review rejection (optional — follows memory-manager Section 13)
      If .planning/memory/ exists or can be created:
        Follow memory-manager Section 13 (Store Preference):
        - Decision Point: "fix-acceptance"
        - Context: "Phase {N} review escalated — user chose to fix manually or investigate"
        - Proposed: "Automated fix agents attempted 3 cycles but {count} blockers remain"
        - User Choice: "Rejected automated fixes — user will {fix manually | investigate further}"
        - Signal: "negative"
        - Agent: comma-separated list of fix agent IDs from the 3 cycles
        - Tags: "fix-rejection", "manual-intervention", phase slug, unresolved blocker files
      If memory not available: skip silently.
      NOTE: This captures a negative signal — the automated fix process was insufficient,
      indicating these types of issues may need human expertise for this task type.
      Exit immediately with no further state changes (existing behavior preserved).

7. ROUTE TO NEXT ACTION
   - If review passed (Path A) or user accepted as-is (Path B override):
     If more phases remain:
     "Phase {N}: {phase_name} complete.
      Next: Run `/legion:plan {N+1}` to plan the next phase."
     If this was the last phase:
     "All phases complete! {project_name} is finished."

   - If escalated and user chose "Fix manually":
     "Fix the issues listed in .planning/phases/{NN}-{slug}/{NN}-REVIEW.md
      Then re-run `/legion:review` to verify."

   - If escalated and user chose "Investigate further":
     "Review .planning/phases/{NN}-{slug}/{NN}-REVIEW.md for the full escalation report.
      Each unresolved finding includes the fix attempts and why they failed."

   - Do NOT automatically trigger /legion:plan — let the user decide when to proceed.
</process>
