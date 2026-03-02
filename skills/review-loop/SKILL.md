---
name: legion:review-loop
description: Dev-QA loop engine with structured feedback, fix routing, and user escalation for /legion:review
---

# Review Loop

Engine for `/legion:review`. Takes the output of a completed `/legion:build` phase and drives it through a structured dev-QA cycle: personality-injected review agents evaluate artifacts, findings are triaged by severity, fix agents resolve issues, and the cycle repeats up to 3 times. A phase is never marked complete by exhaustion — only by reviewer approval.

---

## Section 1: Review Principles

These rules govern all review decisions. Do not deviate from them.

1. **Review the output, not the plan** — review agents evaluate files created/modified during `/legion:build`, not the plan documents themselves. The plan is the specification; the output is what gets reviewed.
2. **Full personality injection** — each review agent receives the ENTIRE contents of its assigned `.md` file as system instructions. No summaries, no excerpts, no paraphrasing.
3. **Structured feedback only** — review agents must use the exact Finding format defined in Section 3. Vague assessments like "looks good" or letter grades are rejected.
4. **Max 3 cycles total** — the loop is: review → collect findings → fix → re-review. If blockers remain after 3 full cycles, escalate to the user (Section 8).
5. **Sonnet for all agents** — review agents and fix agents both use `model: "sonnet"`. This matches the Cost Profile Convention from `workflow-common.md` (execution = Sonnet).
6. **Approval required, not exhaustion** — a phase is NOT marked complete when cycles run out. It is marked complete only when review agents give a PASS verdict with no remaining BLOCKERs or WARNINGs.
7. **Skeptical by default** — "no issues found" on a first review is a yellow flag. Review agents should expect to find at least something on an initial pass. If a reviewer returns PASS on cycle 1, their reasoning must explain what was checked and why confidence is warranted.
8. **Do not auto-proceed after escalation** — if 3 cycles are exhausted, stop and wait for user decision. Do NOT mark the phase complete or advance to the next phase without explicit user confirmation.

---

## Section 2: Review Agent Selection

How to choose the right review agents for a phase before spawning.

```
Step 1: Determine the phase type
  - Read the phase CONTEXT.md file at .planning/phases/{NN}-{slug}/{NN}-CONTEXT.md
  - Read all SUMMARY.md files in the phase directory to understand what artifacts were produced
  - Classify the phase into one or more types based on what was built:
    - "code"           — new code files, skills, commands, scripts, configuration
    - "api"            — API endpoints, integrations, external service connections
    - "design"         — UI components, design systems, visual assets, CSS
    - "marketing"      — content documents, campaign plans, copy, strategy docs
    - "infrastructure" — CI/CD, deployment configs, server setup, tooling
    - "workflow"       — process documents, methodology files, skill .md files

Step 2: Select review agents based on phase type
  Map each detected phase type to a primary and secondary reviewer:

  | Phase Type     | Primary Reviewer              | Secondary Reviewer                    |
  |----------------|-------------------------------|---------------------------------------|
  | code           | testing-reality-checker       | testing-evidence-collector            |
  | api            | testing-api-tester            | testing-reality-checker               |
  | design         | design-brand-guardian         | testing-reality-checker               |
  | marketing      | testing-workflow-optimizer    | testing-reality-checker               |
  | infrastructure | testing-reality-checker       | testing-performance-benchmarker       |
  | workflow       | testing-workflow-optimizer    | testing-reality-checker               |

  Rules:
  - Always include testing-reality-checker as either primary or secondary — they are the
    final quality gate for any phase type
  - For phases touching multiple types, include one reviewer per type (max 3 reviewers total)
  - If a phase spans 3+ types, use testing-reality-checker as universal secondary and pick
    the two most relevant primary reviewers
  - Present selected reviewers to the user for confirmation before spawning any agents

Step 3: Validate reviewer availability
  - Confirm each selected agent .md file exists at the expected path:
    agents/testing-reality-checker.md
    agents/testing-evidence-collector.md
    agents/testing-api-tester.md
    agents/testing-workflow-optimizer.md
    agents/testing-performance-benchmarker.md
    agents/design-brand-guardian.md
  - If any personality file is missing: fall back to testing-reality-checker for that slot
  - Log the fallback: "Warning: {agent-id}.md not found. Using testing-reality-checker for
    {phase-type} review slot."
```

### Reviewer Confirmation Display

Before spawning review agents, show this to the user and wait for confirmation:

```markdown
## Phase {N}: {phase_name} — Review Setup

**Phase Type(s)**: {detected types}
**Artifacts to Review**: {count files from all plan files_modified lists}

**Selected Reviewers**:
| Slot | Agent ID                    | Role                              | Rationale |
|------|-----------------------------|-----------------------------------|-----------|
| 1    | testing-reality-checker     | Final quality gate                | Always included |
| 2    | {secondary-agent-id}        | {domain-specific expertise}       | {why selected} |

Proceed with this reviewer team? (or name a replacement)
```

---

## Section 3: Review Prompt Construction

How to build the prompt that each review agent receives.

```
For each review agent:

Step 1: Gather phase artifacts
  - Read all {NN}-{PP}-PLAN.md files in the phase directory
  - Read all {NN}-{PP}-SUMMARY.md files in the phase directory
  - For each plan, extract the files_modified list from the YAML frontmatter
  - Build the complete list of files to review (deduplicated)
  - Read the phase CONTEXT.md for the phase goal and success criteria
  - Read .planning/ROADMAP.md to extract the phase success criteria

Step 2: Read the reviewer's personality file
  - Path: agents/{agent-id}.md
    (cross-reference agent-registry.md Section 1 for the canonical path)
  - Read the ENTIRE personality .md file — do not truncate or summarize
  - Capture this as: PERSONALITY_CONTENT

Step 3: Construct the review prompt
  Combine personality and review task using this exact format:

  """
  {PERSONALITY_CONTENT}

  ---

  # Review Task

  You are reviewing the output of Phase {N}: {phase_name} for Legion.

  ## Phase Goal
  {goal from CONTEXT.md}

  ## Success Criteria (from ROADMAP.md)
  {bulleted success criteria for this phase}

  ## Plans Executed
  {For each plan: "- Plan {PP}: {plan_name} — {status from SUMMARY.md}"}

  ## Files to Review
  {Complete deduplicated list of files from all plan files_modified frontmatter fields}

  ## Your Review Instructions

  1. Read EVERY file in the "Files to Review" list above
  2. For each file, evaluate against the success criteria and each plan's verification checklist
  3. Check for ALL of the following:
     - Correctness: Does the code/content do what the plan specified?
     - Completeness: Are all tasks from the plan actually implemented?
     - Consistency: Does it follow established patterns from existing skills/commands?
     - Integration: Do references between files resolve correctly (@-references, path imports)?
     - Quality: Is the code/content at a reasonable quality level for production use?
  4. Report findings in the EXACT format below — no other format is accepted
  5. Compare what was BUILT against what was SPECIFIED — not against hypothetical perfection

  ## Required Feedback Format

  For EACH finding, use this exact structure:

  ### Finding {N}
  - **File**: {file path}
  - **Line/Section**: {line number or section name}
  - **Severity**: {BLOCKER | WARNING | SUGGESTION}
  - **Issue**: {One sentence describing the exact problem}
  - **Details**: {2-3 sentences explaining why this is a problem and what should be true instead}
  - **Suggested Fix**: {Specific, actionable fix — not vague guidance}

  Severity definitions:
  - BLOCKER: Prevents the phase from working correctly. Must be fixed before approval.
  - WARNING: Works but has a meaningful quality or consistency issue. Should be fixed.
  - SUGGESTION: Minor improvement opportunity. Nice to have, not required for approval.

  ## Final Verdict

  After all findings, provide exactly ONE of these verdicts with no other format:
  - **PASS** — No blockers, no warnings (or all warnings addressed). Phase is approved.
  - **NEEDS WORK** — Has blockers or significant warnings requiring fixes. List the specific
    Finding numbers that must be addressed before re-review.
  - **FAIL** — Fundamental issues requiring substantial rework. Explain the structural problem
    and what a correct implementation would look like.

  IMPORTANT:
  - Do NOT give letter grades, numeric scores, or vague assessments like "looks good"
  - Default to NEEDS WORK — first reviews almost always surface issues
  - Every finding MUST reference a specific file and line/section
  - "No issues found" requires a brief paragraph explaining what you checked and why you're
    confident — this is not permitted as a bare statement
  - PASS on the first review cycle requires a clear explanation of what evidence you reviewed

  ## Reporting Results

  When your review is complete, use SendMessage to report to the coordinator:
  SendMessage(type: "message", recipient: "coordinator",
              summary: "Review of Phase {N} complete — {verdict}",
              content: "{your full review findings}")
  """

Step 4: Spawn the review agent
  Agent tool parameters:
  - subagent_type: "general-purpose"
  - prompt: {constructed prompt from Step 3}
  - model: "sonnet"
  - name: "{agent-id}-review-{NN}" (e.g., "testing-reality-checker-review-05")
  - team_name: "{review_team_name}" (e.g., "phase-05-review")

  Create the Team before spawning (one Team for the entire review lifecycle):
  - TeamCreate(team_name: "phase-{NN}-review", description: "Phase {N} review cycle")
  - One Team per phase review — not per cycle. Reuse across all 3 cycles.
```

---

## Section 4: Feedback Collection and Triage

How to process review agent findings after each review cycle.

```
After each review agent completes and sends its findings via SendMessage:

Step 1: Parse findings
  - Extract each Finding block from the agent's SendMessage content
  - Record for each finding:
    - Finding number
    - File path
    - Line/section reference
    - Severity (BLOCKER, WARNING, or SUGGESTION)
    - Issue (one-sentence description)
    - Suggested Fix
    - Reviewer agent ID

Step 2: Deduplicate across reviewers
  When multiple reviewers flag overlapping issues:
  - Same file + same line/section: keep the highest severity finding, discard lower
  - Same file + different lines: keep both as separate findings
  - Reviewers disagree on severity for the same issue: escalate to BLOCKER

Step 3: Triage findings into lists
  - Must-fix list: all BLOCKERs + all WARNINGs
  - Nice-to-have list: all SUGGESTIONs
  - If the must-fix list is EMPTY and ALL reviewers gave PASS verdict:
    → Review passes. Proceed to Section 7 (Review Passed).
  - If the must-fix list has ANY items:
    → Proceed to Section 5 (Fix Cycle).

Step 4: Report findings to user
  Display a summary table before starting any fix work:

  ## Review Findings — Cycle {cycle_number}/3

  | #  | Severity    | File                    | Issue (brief)              | Reviewer           |
  |----|-------------|-------------------------|----------------------------|--------------------|
  | 1  | BLOCKER     | path/to/file.md         | Missing error handling     | testing-reality-checker |
  | 2  | WARNING     | path/to/other.md        | Inconsistent naming        | testing-evidence-collector |
  | 3  | SUGGESTION  | path/to/third.md        | Could add more examples    | testing-reality-checker |

  **Blockers**: {count} | **Warnings**: {count} | **Suggestions**: {count}
  **Verdicts**: {reviewer-id}: {PASS|NEEDS WORK|FAIL}, {reviewer-id}: {PASS|NEEDS WORK|FAIL}

  Must-fix: {count} items (blockers + warnings)
  Proceeding to fix cycle {C}...
```

---

## Section 5: Fix Cycle

How to route must-fix findings to appropriate fix agents and run the fixes.

```
For each must-fix finding (BLOCKERs + WARNINGs):

Step 1: Determine the fix agent
  Match the finding's file type to the appropriate fix agent:

  | File Type                        | Fix Agent                          | Mode        |
  |----------------------------------|------------------------------------|-------------|
  | .md skill files (skills/)       | Autonomous (no personality needed) | autonomous  |
  | .md command files (commands/)    | Autonomous                        | autonomous  |
  | .md agent personality files      | Autonomous                         | autonomous  |
  | .md planning/docs files          | Autonomous                         | autonomous  |
  | .ts, .js, .jsx, .tsx             | engineering-frontend-developer or  | personality |
  |                                  | engineering-backend-architect      | injected    |
  | .py, .rb, .go, .rs               | engineering-backend-architect      | personality |
  |                                  |                                    | injected    |
  | .css, .scss, design assets       | design-ux-architect                | personality |
  |                                  |                                    | injected    |
  | Marketing/content .md            | marketing-content-creator          | personality |
  |                                  |                                    | injected    |
  | CI/CD, infrastructure configs    | engineering-devops-automator       | personality |
  |                                  |                                    | injected    |
  | No clear match                   | Autonomous (direct fix)            | autonomous  |

  Apply agent-registry.md Section 3 (Recommendation Algorithm) for ambiguous file types.

Step 2: Group findings by fix agent
  - Group all findings assigned to the same fix agent together
  - This minimizes the number of agent spawns needed
  - One fix agent handles all its assigned findings in one pass

Step 3: Construct the fix prompt

  For PERSONALITY-INJECTED fix agents:
  """
  {PERSONALITY_CONTENT of the fix agent}

  ---

  # Fix Task

  You are fixing issues found during a quality review of Phase {N}: {phase_name}.
  Review cycle: {C} of 3.

  ## Findings to Fix

  {For each finding assigned to this agent:}
  ### Finding {original_number}
  - **File**: {file path}
  - **Line/Section**: {line or section reference}
  - **Severity**: {BLOCKER | WARNING}
  - **Issue**: {exact issue description}
  - **Suggested Fix**: {exact suggested fix from reviewer}

  ## Your Fix Instructions

  For each finding listed above:
  1. Read the referenced file
  2. Apply the suggested fix — or a better fix if your specialist expertise warrants it
  3. Verify the fix resolves the issue without introducing regressions
  4. Do NOT modify files beyond what is needed to resolve the listed findings
  5. Do NOT introduce new issues while fixing

  ## Report

  After fixing all findings, send a SendMessage to the coordinator reporting:
  - **Findings Fixed**: list finding numbers resolved (e.g., "1, 2, 4")
  - **Changes Made**: for each fix: file path, what was changed (before → after)
  - **Findings NOT Fixed**: any finding you could not resolve, and why
  - **Status**: Fixed {count} of {total} findings
  """

  For AUTONOMOUS fix agents (no personality):
  """
  # Fix Task

  You are fixing issues found during a quality review of Phase {N}: {phase_name}.
  Review cycle: {C} of 3.

  ## Findings to Fix

  {Same finding format as above}

  ## Your Fix Instructions

  {Same instructions as above}

  ## Report

  {Same SendMessage reporting requirement}
  """

Step 4: Spawn fix agents in parallel
  - Issue ALL fix agent spawn calls in a SINGLE message response (same pattern as
    wave-executor.md Section 4, Step 4)
  - All fix agents run concurrently — they work on non-overlapping files
  - Agent tool parameters:
    - subagent_type: "general-purpose"
    - model: "sonnet"
    - name: "{agent-id}-fix-{NN}-cycle{C}" (e.g., "autonomous-fix-05-cycle1",
                                              "engineering-backend-architect-fix-05-cycle2")
    - team_name: "{review_team_name}" (same Team created in Section 3)

Step 5: Collect fix results
  - Wait for all fix agents to send their SendMessage completion summaries
  - Track per-finding: fixed (by which agent), not-fixed (with reason)
  - Create an atomic git commit for the cycle's fixes:

  git add {only the files that were actually modified by fix agents}
  git commit -m "fix(legion): review cycle {C} fixes for phase {N}

  Phase {N}: {phase_name}
  Fixed {count} issues: {brief comma-separated issue descriptions}
  Unresolved: {count unfixed findings, or "none"}

  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Section 6: Re-review Cycle

How to iterate the review → fix → re-review loop.

```
After fix agents complete:

Step 1: Increment cycle counter
  - cycle_count += 1
  - If cycle_count > 3: go to Section 8 (Escalation) — do not spawn more agents

Step 2: Determine what to re-review
  - Re-review only files that were modified by fix agents in this cycle
  - Also include files referenced by findings that were NOT fixed (to confirm they
    still need attention)
  - Do NOT re-review the entire phase — scope to changed and unresolved areas

Step 3: Spawn review agents for re-review
  - Use the SAME review agent personalities from the initial review (consistency)
  - Modify the review prompt to include the cycle context:
    - Previous findings summary (finding numbers, severities, issues)
    - Which findings were reported as fixed (with what changes were made)
    - Which findings remain unresolved
  - Add to the review instructions:
    """
    ## Re-review Context — Cycle {C}

    This is re-review cycle {C} of 3. The following findings from cycle {C-1} were
    reported as fixed. Verify the fixes are correct and check for regressions.

    ### Reported as Fixed
    {For each finding marked fixed: number, original issue, change made}

    ### Still Unresolved
    {For each finding not yet fixed: number, original issue, why it wasn't fixed}

    ## Re-review Instructions (PRIORITY ORDER)
    1. For each "Reported as Fixed" finding: verify the fix actually resolves the issue
    2. For each "Still Unresolved" finding: confirm it still exists or note if resolved
    3. Scan for regressions in modified files — new issues introduced by fixes
    4. Report any new issues found using the same Finding format

    Focus review on the modified files. Do not re-read files that were not touched.
    """

Step 4: Process re-review results
  - Collect SendMessage results from all re-review agents
  - Apply the same triage logic from Section 4
  - If new BLOCKERs or WARNINGs found: go back to Section 5 (Fix Cycle)
  - If all must-fix findings resolved AND all reviewers give PASS: go to Section 7

Step 5: Track cycle progress in STATE.md
  After each re-review cycle, update STATE.md:
  - Status: "Phase {N} under review — cycle {C}/3, {blocker_count} blocker(s) remaining"
  - Last Activity: "Phase {N} review cycle {C} ({date})"
  Follow the State Update Pattern from workflow-common.md (Read → Update → Write).
```

---

## Section 7: Review Passed

What happens when all reviewers approve the phase with no remaining BLOCKERs or WARNINGs.

```
When review passes (must-fix list is empty and all reviewers give PASS verdict):

Step 1: Generate review summary file
  Write .planning/phases/{NN}-{slug}/{NN}-REVIEW.md:

  # Phase {N}: {phase_name} — Review Summary

  ## Result: PASSED
  **Cycles Used**: {total_cycles_used} of 3
  **Reviewers**: {list of reviewer agent IDs}
  **Completed**: {date}

  ## Findings Summary
  | Metric               | Count |
  |----------------------|-------|
  | Total findings       | {N}   |
  | Blockers found       | {N}   |
  | Blockers resolved    | {N}   |
  | Warnings found       | {N}   |
  | Warnings resolved    | {N}   |
  | Suggestions (noted)  | {N}   |

  ## Findings Detail
  {For each finding: number, severity, file, issue, resolution, cycle fixed in}

  | #  | Severity   | File          | Issue           | Fix Applied     | Cycle Fixed |
  |----|------------|---------------|-----------------|-----------------|-------------|
  | 1  | BLOCKER    | path/file.md  | brief issue     | brief fix       | 1           |

  ## Reviewer Verdicts
  {For each reviewer: agent ID, final verdict, key observations from their review}

  ## Suggestions (Not Required)
  {List any SUGGESTION-severity findings that were noted but not required for approval}

Step 2: Mark phase complete in state files
  Follow execution-tracker.md Section 4 (Phase Completion Tracking):

  Update STATE.md:
  - Phase: {N} of {total} (complete)
  - Status: "Phase {N} complete — review passed in {cycles} cycle(s)"
  - Last Activity: "Phase {N} review passed ({date})"
  - Next Action:
    - If more phases remain: "Run `/legion:plan {N+1}` to plan the next phase"
    - If this was the last phase: "All phases complete — project review finished!"
  Write updated STATE.md

  Update ROADMAP.md progress table:
  - Check the phase row: [x]
  - Status column: "Complete"
  Write updated ROADMAP.md

Step 3: Create review completion commit
  git add .planning/phases/{NN}-{slug}/{NN}-REVIEW.md
  git add .planning/STATE.md
  git add .planning/ROADMAP.md
  git commit -m "chore(legion): phase {N} review passed — {phase_name}

  Review passed after {cycles} cycle(s).
  {blocker_count} blocker(s) fixed, {warning_count} warning(s) fixed.
  Reviewers: {comma-separated reviewer IDs}

  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

Step 4: Shutdown the review Team
  - Send shutdown_request to all spawned review and fix agents via SendMessage
  - Call TeamDelete to clean up the review Team
  - This runs on both pass and escalation paths — never leave orphaned agents

Step 5: Route to next action
  Display to the user:
  ## Phase {N}: {phase_name} — Review Passed

  Review approved after {cycles} cycle(s). {count} issues found and resolved.

  {If more phases remain:}
  Next: Run `/legion:plan {N+1}` to plan Phase {N+1}: {next_phase_name}

  {If this was the last phase:}
  All phases complete! The project has been built and reviewed. Congratulations.
```

---

## Section 8: Escalation

What happens when 3 cycles are exhausted without resolving all blockers.

```
When cycle_count exceeds 3 AND BLOCKERs remain unresolved:

Step 1: Generate escalation report
  Write .planning/phases/{NN}-{slug}/{NN}-REVIEW.md:

  # Phase {N}: {phase_name} — Review Summary

  ## Result: ESCALATED
  **Cycles Used**: 3 (maximum reached)
  **Remaining Blockers**: {count}
  **Remaining Warnings**: {count}

  ## Unresolved Findings
  {For each finding that is still unresolved after 3 cycles:}
  ### Finding {N} (Unresolved)
  - **File**: {file path}
  - **Severity**: {BLOCKER | WARNING}
  - **Original Issue**: {issue description}
  - **Fix Attempts**: {what was tried in each cycle}
  - **Why Unresolved**: {reason the fix agents could not resolve it}

  ## Resolved Findings
  {For each finding that WAS resolved: same format but with resolution details and cycle}

  ## Recommendation
  {Brief assessment: are the remaining issues a fundamental design problem requiring
  rework, or are they targeted fixes that need a different approach?}
  {Specific guidance on what the user should investigate or change}

Step 2: Update STATE.md
  - Status: "Phase {N} review escalated — {count} unresolved blocker(s) after 3 cycles"
  - Last Activity: "Phase {N} review escalated ({date})"
  - Next Action: "Review .planning/phases/{NN}-{slug}/{NN}-REVIEW.md for full details.
    Options: fix manually then re-run /legion:review, or accept as-is and proceed."
  Write updated STATE.md

Step 3: Shutdown the review Team
  - Send shutdown_request to all spawned agents
  - Call TeamDelete to clean up

Step 4: Present escalation report to user

  ## Phase {N}: {phase_name} — Review Escalated

  3 review cycles completed. {count} blocker(s) remain unresolved.

  ### Remaining Blockers
  | # | File          | Issue                 | Fix Attempts |
  |---|---------------|-----------------------|--------------|
  | 1 | path/file.md  | brief issue           | {3 attempts} |
  | 2 | path/other.md | brief issue           | {2 attempts} |

  ### Options
  1. **Fix manually** — address the remaining findings directly, then re-run `/legion:review`
  2. **Re-run review** — try `/legion:review` again if you believe fixes were applied correctly
  3. **Accept as-is** — acknowledge the issues and proceed to `/legion:plan {N+1}` anyway
  4. **Investigate root cause** — examine the phase plan and fix agent outputs to understand
     why the fixes failed to resolve the blockers

  **Do not auto-proceed.** Wait for explicit user decision before taking any action.
```

---

## Section 9: Error Handling

How to handle failures during the review loop itself.

```
1. REVIEW AGENT SPAWN FAILURE
   Symptom: Agent tool call returns an error for a review agent
   Action:
   - Log the spawn failure
   - If the primary reviewer failed to spawn: fall back to testing-reality-checker
   - If testing-reality-checker itself failed to spawn: run review without that slot
   - Document the spawn failure in the cycle report
   - Do NOT skip the review cycle because of a single agent spawn failure

2. REVIEW AGENT SENDS NO MESSAGE
   Symptom: A review agent goes idle without sending a SendMessage completion
   Action:
   - Wait a reasonable interval (review agents read many files and may take time)
   - Send a follow-up via SendMessage: "Your review appears complete but no findings
     were received. Please send your structured review now with Finding blocks and
     a Final Verdict."
   - If still no response: infer from filesystem (check if files were read recently)
   - Write a partial cycle report noting the non-responsive agent
   - Continue with findings from other reviewers — do not block the cycle

3. FIX AGENT UNABLE TO FIX A FINDING
   Symptom: Fix agent reports a finding as "NOT Fixed" with a reason
   Action:
   - Record the finding as unresolved in the cycle state
   - Include the "why unresolved" reason in the re-review context
   - Present to re-review agents: "Fix agent attempted but could not resolve Finding {N}
     because: {reason}. Assess whether it is still a blocker."
   - If the re-reviewer downgrades from BLOCKER to WARNING: update severity for next cycle

4. PERSONALITY FILE MISSING FOR REVIEWER
   Symptom: Expected reviewer .md file not found at agents/{agent-id}.md
   Action:
   - Fall back to testing-reality-checker for that review slot
   - Log: "Warning: personality file not found for {agent-id}. Using testing-reality-checker."
   - Do NOT fail the review cycle because a personality file is missing

5. STATE.md WRITE FAILURE
   Symptom: STATE.md cannot be updated after a cycle
   Action:
   - Output the intended STATE.md update to the user as text
   - Continue the review loop — do not halt because of a state write failure
   - Retry the STATE.md write at the end of the next cycle
```

---

## References

This skill implements patterns defined in `workflow-common.md`:

| Pattern                    | Source Section                                    | Used In                              |
|----------------------------|---------------------------------------------------|--------------------------------------|
| Personality Injection Pattern | workflow-common.md — Personality Injection Pattern | Section 3                          |
| Cost Profile Convention    | workflow-common.md — Cost Profile Convention      | Section 1 (Sonnet for review/fix)    |
| Error Handling Pattern     | workflow-common.md — Error Handling Pattern       | Section 5, Section 9                 |
| State Update Pattern       | workflow-common.md — State Update Pattern         | Section 6, Section 7, Section 8      |
| Plan File Convention       | workflow-common.md — Plan File Convention         | Section 3, Section 7, Section 8      |
| Wave Execution Pattern     | workflow-common.md — Wave Execution Pattern       | Section 5 (parallel fix agents)      |

Agent file paths are resolved using `agent-registry.md` Section 1 (Agent Catalog) for canonical division and path.

### Quick Reference: Review Agent Paths

```
agents/testing-reality-checker.md
agents/testing-evidence-collector.md
agents/testing-api-tester.md
agents/testing-test-results-analyzer.md
agents/testing-performance-benchmarker.md
agents/testing-workflow-optimizer.md
agents/testing-tool-evaluator.md
agents/design-brand-guardian.md
agents/design-ux-researcher.md
agents/agents-orchestrator.md
```
