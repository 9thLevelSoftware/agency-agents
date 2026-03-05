---
name: legion:review-loop
description: Dev-QA loop engine with structured feedback, fix routing, and user escalation for /legion:review
triggers: [review, quality, fix, iterate, qa, test]
token_cost: high
summary: "Iterative review cycle: test -> review -> fix -> re-test. Spawns testing agents, collects findings, coordinates fixes, re-validates. Core engine for /legion:review with max iteration limits. Uses review-panel skill to assemble reviewer teams."
---

# Review Loop

Engine for `/legion:review`. Takes the output of a completed `/legion:build` phase and drives it through a structured dev-QA cycle: personality-injected review agents evaluate artifacts, findings are triaged by severity, fix agents resolve issues, and the cycle repeats up to the configured maximum (`settings.review.max_cycles`, default 3). A phase is never marked complete by exhaustion — only by reviewer approval.

---

## Section 1: Review Principles

These rules govern all review decisions. Do not deviate from them.

> **MANDATORY: Follow the active CLI adapter's Execution Protocol.**
>
> Before spawning any review or fix agents, load the active adapter (see workflow-common CLI Detection Protocol).
> The adapter defines how agents are spawned, coordinated, and cleaned up.
>
> **If adapter.parallel_execution is true AND adapter.structured_messaging is true** (e.g., Claude Code):
> Use the adapter's full coordination lifecycle for the review Team.
> On Claude Code specifically: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` must be enabled.
>
> **If adapter.parallel_execution is false** (e.g., Codex CLI, Aider):
> Execute review and fix agents sequentially. Collect results via adapter.collect_results.
>
> Always follow the adapter protocol. Do not hardcode CLI-specific tool calls.

1. **Review the output, not the plan** — review agents evaluate files created/modified during `/legion:build`, not the plan documents themselves. The plan is the specification; the output is what gets reviewed.
2. **Full personality injection** — each review agent receives the ENTIRE contents of its assigned `.md` file as system instructions. No summaries, no excerpts, no paraphrasing.
3. **Structured feedback only** — review agents must use the exact Finding format defined in Section 3. Vague assessments like "looks good" or letter grades are rejected.
4. **Max cycle count comes from settings** — use `settings.review.max_cycles` (default: 3). The loop is: review → collect findings → fix → re-review. If blockers remain after that many full cycles, escalate to the user (Section 8).
5. **Adapter model for all agents** — review agents and fix agents both use `adapter.model_execution`. This matches the Cost Profile Convention from `workflow-common.md`.
6. **Approval required, not exhaustion** — a phase is NOT marked complete when cycles run out. It is marked complete only when review agents give a PASS verdict with no remaining BLOCKERs or WARNINGs.
7. **Skeptical by default** — "no issues found" on a first review is a yellow flag. Review agents should expect to find at least something on an initial pass. If a reviewer returns PASS on cycle 1, their reasoning must explain what was checked and why confidence is warranted.
8. **Confidence-gated reporting** — every finding must include a confidence level: HIGH (80-100%), MEDIUM (50-79%), or LOW (<50%). Only HIGH-confidence findings appear in the default report. MEDIUM findings are collected but only surfaced if the user explicitly requests the full report. LOW findings are discarded — if you are not at least 50% confident, it is not a finding.
9. **Do not auto-proceed after escalation** — if the configured cycle budget is exhausted, stop and wait for user decision. Do NOT mark the phase complete or advance to the next phase without explicit user confirmation.

---

## Section 1.2: Settings Input

Before starting cycle 1, resolve review limits from `settings.json`:
- Try Read `settings.json`
- If present, use `review.max_cycles` as `{max_cycles}`
- If missing or invalid, set `{max_cycles} = 3`
- Use `{max_cycles}` for every loop boundary, status message, and escalation check

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
  - Confirm each selected agent .md file exists at the expected path (using AGENTS_DIR
    resolved via workflow-common Agent Path Resolution Protocol):
    {AGENTS_DIR}/testing-reality-checker.md
    {AGENTS_DIR}/testing-evidence-collector.md
    {AGENTS_DIR}/testing-api-tester.md
    {AGENTS_DIR}/testing-workflow-optimizer.md
    {AGENTS_DIR}/testing-performance-benchmarker.md
    {AGENTS_DIR}/design-brand-guardian.md
  - If any personality file is missing: fall back to testing-reality-checker for that slot
  - If testing-reality-checker.md is ALSO missing: run that review slot without personality
    injection (autonomous mode). Log: "Core reviewer file missing. Running autonomous review."
  - Log any fallback: "Warning: {agent-id}.md not found. Using testing-reality-checker for
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
  - Path: {AGENTS_DIR}/{agent-id}.md
    (AGENTS_DIR resolved via workflow-common Agent Path Resolution Protocol;
     cross-reference agent-registry.md Section 1 for the canonical agent ID)
  - Read the ENTIRE personality .md file — do not truncate or summarize
  - Capture this as: PERSONALITY_CONTENT

Step 2.5: Load brownfield conventions (optional)
  - Check if .planning/CODEBASE.md exists
  - If yes:
    a. Read .planning/CODEBASE.md
    b. Extract these sections:
       - "## Conventions Detected" → all convention bullet points
       - "## Detected Stack" → technology table
    c. Compose a CODEBASE_CONVENTIONS block:

       ## Codebase Conventions (from CODEBASE.md)

       ### Detected Stack
       {Detected Stack table from CODEBASE.md}

       ### Conventions
       {bullet list from Conventions Detected}

       Non-conformance with established conventions is a WARNING-level finding
       unless the plan explicitly calls for a different pattern.

  - If CODEBASE.md does not exist: set CODEBASE_CONVENTIONS = "" (empty string, skip silently)

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

  {CODEBASE_CONVENTIONS}

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
  - **Confidence**: {HIGH | MEDIUM | LOW} — {percentage}%
    - HIGH (80-100%): You are certain this is a real issue. Report it.
    - MEDIUM (50-79%): You suspect this is an issue but aren't certain. Record it but it won't appear in the default report.
    - LOW (<50%): You're guessing. Do not report this finding — delete it.

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
  - Every finding MUST include a Confidence rating with a percentage
  - Only HIGH-confidence findings (80%+) are actioned by default
  - If you are unsure, rate MEDIUM and explain your uncertainty in Details
  - Never pad reports with LOW-confidence findings to appear thorough

  ## Reporting Results

  When your review is complete, report to the coordinator per adapter.collect_results.
  Your report must include your full review findings with all Finding blocks and the Final Verdict.
  """

Step 4: Spawn the review agent per adapter protocol
  Use adapter.spawn_agent_personality with:
  - prompt: {constructed prompt from Step 3}
  - model: adapter.model_execution
  - name: "{agent-id}-review-{NN}" (e.g., "testing-reality-checker-review-05")
  - Additional parameters per adapter (e.g., team_name on Claude Code)

  Initialize coordination before spawning (one context for the entire review lifecycle):
  - Per adapter.coordinate_parallel or write WAVE-CHECKLIST.md
  - One coordination context per phase review — not per cycle. Reuse across all configured cycles.
```

---

## Section 4: Feedback Collection and Triage

How to process review agent findings after each review cycle.

```
After each review agent completes and reports findings (per adapter.collect_results):

Step 1: Parse findings
  - Extract each Finding block from the agent's report content
  - Record for each finding:
    - Finding number
    - File path
    - Line/section reference
    - Severity (BLOCKER, WARNING, or SUGGESTION)
    - Issue (one-sentence description)
    - Suggested Fix
    - Reviewer agent ID

Step 2: Deduplicate and filter findings

After parsing findings from all reviewers:

2a. Location-based deduplication (same as review-panel Section 3, Step 2):
    - Group by file:line
    - Keep highest severity per location
    - Escalate when reviewers disagree

2b. Authority-based filtering (same as review-panel Section 3, Step 3):
    - Load active reviewers from panel composition
    - Build domain ownership map
    - Filter out-of-domain critiques
    - Log filtered findings for transparency

2c. Priority ordering:
    - Sort findings: BLOCKER first, then WARNING, then SUGGESTION
    - Within severity: domain owner findings first, then general
    - This ensures most critical, authoritative feedback is addressed first

Step 2.5: Filter by confidence
  - HIGH-confidence findings (80%+): pass through to triage
  - MEDIUM-confidence findings (50-79%): collect into a "Deferred Findings" list
  - LOW-confidence findings (<50%): discard entirely
  - The must-fix list and nice-to-have list only contain HIGH-confidence findings
  - Report the deferred count: "{N} MEDIUM-confidence findings deferred (use --verbose to see)"

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

  | #  | Severity    | Confidence | File                    | Issue (brief)              | Reviewer           |
  |----|-------------|------------|-------------------------|----------------------------|--------------------|
  | 1  | BLOCKER     | HIGH (95%) | path/to/file.md         | Missing error handling     | testing-reality-checker |
  | 2  | WARNING     | HIGH (85%) | path/to/other.md        | Inconsistent naming        | testing-evidence-collector |
  | 3  | SUGGESTION  | HIGH (80%) | path/to/third.md        | Could add more examples    | testing-reality-checker |

  **Blockers**: {count} | **Warnings**: {count} | **Suggestions**: {count}
  **Deferred (MEDIUM confidence)**: {count} findings not shown (--verbose to reveal)
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
  1. Load personality file from {AGENTS_DIR}/{agent-id}.md
     (AGENTS_DIR was resolved at the start of /legion:review — reuse that value)
     If file is missing: fall back to autonomous mode, log the warning
  2. Construct prompt:
  """
  {PERSONALITY_CONTENT of the fix agent — full file, no truncation}

  ---

  # Fix Task

  You are fixing issues found during a quality review of Phase {N}: {phase_name}.
  Review cycle: {C} of {max_cycles}.

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

  After fixing all findings, report to the coordinator (per adapter.collect_results):
  - **Findings Fixed**: list finding numbers resolved (e.g., "1, 2, 4")
  - **Changes Made**: for each fix: file path, what was changed (before → after)
  - **Findings NOT Fixed**: any finding you could not resolve, and why
  - **Status**: Fixed {count} of {total} findings
  """

  For AUTONOMOUS fix agents (no personality):
  """
  # Fix Task

  You are fixing issues found during a quality review of Phase {N}: {phase_name}.
  Review cycle: {C} of {max_cycles}.

  ## Findings to Fix

  {Same finding format as above}

  ## Your Fix Instructions

  {Same instructions as above}

  ## Report

  {Same reporting requirement per adapter.collect_results}
  """

Step 4: Spawn fix agents (adapter-conditional)
  **If adapter.parallel_execution is true:**
  - Issue ALL fix agent spawn calls simultaneously (same pattern as wave-executor Section 4, Step 4)
  - All fix agents run concurrently — they work on non-overlapping files

  **If adapter.parallel_execution is false:**
  - Execute fix agents sequentially — one group of findings at a time

  Agent parameters per adapter.spawn_agent_personality:
  - model: adapter.model_execution
  - name: "{agent-id}-fix-{NN}-cycle{C}" (e.g., "autonomous-fix-05-cycle1")
  - Additional parameters per adapter

Step 5: Collect fix results
  - Wait for all fix agents to report per adapter.collect_results
  - Track per-finding: fixed (by which agent), not-fixed (with reason)
  - Create an atomic git commit for the cycle's fixes:

  git add {only the files that were actually modified by fix agents}
  git commit -m "fix(legion): review cycle {C} fixes for phase {N}

  Phase {N}: {phase_name}
  Fixed {count} issues: {brief comma-separated issue descriptions}
  Unresolved: {count unfixed findings, or "none"}

  {adapter.commit_signature}"

### Authority-Aware Fix Assignment

When assigning fixes to agents:
1. Identify the domain of each finding
2. If finding has a domain owner on the panel:
   - Assign fix to domain owner agent
   - Rationale: Owner has authority, should implement the fix
3. If finding is general domain (no owner):
   - Assign to original implementer or generalist agent
   - Use agent-registry recommendation
4. Never assign a domain-specific fix to an agent outside that domain
   - Exception: If domain owner is unavailable, escalate to user

Example assignments:
- Security finding → security-engineer (owner)
- Performance finding → performance-benchmarker (owner)
- Code style finding → engineering-senior-developer or original author
```

---

## Section 6: Re-review Cycle

How to iterate the review → fix → re-review loop.

```
After fix agents complete:

Step 1: Increment cycle counter
  - cycle_count += 1
  - If cycle_count > {max_cycles}: go to Section 8 (Escalation) — do not spawn more agents

Step 1.5: Check for stale loop (no-delta detection)
  Compare the current cycle's must-fix findings with the previous cycle's must-fix findings:
  - Extract finding fingerprints: (file_path, line/section, severity, issue_summary)
  - Compare current fingerprints against previous cycle's fingerprints
  - Calculate delta:
    - findings_resolved: findings in previous cycle but not in current
    - findings_new: findings in current cycle but not in previous
    - findings_unchanged: findings present in both cycles

  If findings_resolved == 0 AND findings_new == 0 (exact same findings, no progress):
    → Increment stale_counter
    → If stale_counter >= 2 (same findings for 2 consecutive re-reviews):
      → Go to Section 8.5 (Stale Loop Abort) — do NOT continue to fix cycle
    → Log: "Warning: No delta detected between cycle {C-1} and cycle {C}.
      Stale counter: {stale_counter}/2. Same {count} findings persist."

  If findings_resolved > 0 OR findings_new > 0 (some progress detected):
    → Reset stale_counter to 0
    → Log: "Progress detected: {findings_resolved} resolved, {findings_new} new,
      {findings_unchanged} unchanged."

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

    This is re-review cycle {C} of {max_cycles}. The following findings from cycle {C-1} were
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
  - Collect results from all re-review agents per adapter.collect_results
  - Apply the same triage logic from Section 4
  - If new BLOCKERs or WARNINGs found: go back to Section 5 (Fix Cycle)
  - If all must-fix findings resolved AND all reviewers give PASS: go to Section 7

Step 5: Track cycle progress in STATE.md
  After each re-review cycle, update STATE.md:
  - Status: "Phase {N} under review — cycle {C}/{max_cycles}, {blocker_count} blocker(s) remaining"
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
  **Cycles Used**: {total_cycles_used} of {max_cycles}
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

  {adapter.commit_signature}"

Step 4: Cleanup coordination
  - Use adapter.shutdown_agents to gracefully terminate any spawned agents
  - Use adapter.cleanup_coordination to clean up coordination infrastructure
  - This runs on both pass and escalation paths — never leave orphaned agents or stale state

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

What happens when the configured cycle limit is exhausted without resolving all blockers.

```
When cycle_count exceeds {max_cycles} AND (BLOCKERs OR unresolved WARNINGs) remain:

Step 1: Generate escalation report
  Write .planning/phases/{NN}-{slug}/{NN}-REVIEW.md:

  # Phase {N}: {phase_name} — Review Summary

  ## Result: ESCALATED
  **Cycles Used**: {max_cycles} (maximum reached)
  **Remaining Blockers**: {count}
  **Remaining Warnings**: {count}

  ## Unresolved Findings
  {For each finding that is still unresolved after {max_cycles} cycles:}
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
  - Status: "Phase {N} review escalated — {count} unresolved blocker(s) after {max_cycles} cycles"
  - Last Activity: "Phase {N} review escalated ({date})"
  - Next Action: "Review .planning/phases/{NN}-{slug}/{NN}-REVIEW.md for full details.
    Options: fix manually then re-run /legion:review, or accept as-is and proceed."
  Write updated STATE.md

Step 3: Cleanup coordination
  - Use adapter.shutdown_agents to gracefully terminate spawned agents
  - Use adapter.cleanup_coordination to clean up

Step 4: Present escalation report to user

  ## Phase {N}: {phase_name} — Review Escalated

  {max_cycles} review cycles completed. {count} blocker(s) remain unresolved.

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

## Section 8.5: Stale Loop Abort

What happens when 2 consecutive re-review cycles show zero delta (same findings, no resolution progress).

This is different from Section 8 (Escalation): Section 8 triggers when the max cycle count is reached. Section 8.5 triggers earlier when the loop is detected as stuck — burning tokens without making progress.

```
When stale_counter reaches 2 (no delta for 2 consecutive cycles):

Step 1: Generate stale loop report
  Write .planning/phases/{NN}-{slug}/{NN}-REVIEW.md:

  # Phase {N}: {phase_name} — Review Summary

  ## Result: STALE LOOP ABORTED
  **Cycles Used**: {current_cycle} of {max_cycles}
  **Stale Cycles**: 2 consecutive cycles with no delta
  **Remaining Findings**: {count}

  ## Why the Loop Stalled
  The following findings persisted across {stale_count} consecutive review-fix cycles
  with no resolution. The fix agents were unable to address them, suggesting the
  issues may require a different approach or architectural change.

  ## Persistent Findings
  {For each finding that persisted unchanged across stale cycles:}
  ### Finding {N} (Persistent)
  - **File**: {file path}
  - **Severity**: {BLOCKER | WARNING}
  - **Original Issue**: {issue description}
  - **Fix Attempts**: {what was tried in each cycle}
  - **Likely Root Cause**: {why the fix agents couldn't resolve it — pattern analysis}

  ## Resolved Findings (before loop stalled)
  {Any findings that WERE resolved in earlier cycles}

  ## Recommendations
  {Analysis of why the loop stalled:}
  - Are the persistent findings symptoms of a deeper design problem?
  - Would a different fix agent (different specialty) have more success?
  - Is manual intervention the fastest path to resolution?
  - Specific guidance on what to investigate or change

Step 2: Update STATE.md
  - Status: "Phase {N} review stale — {count} finding(s) unchanged after {stale_count} cycles"
  - Last Activity: "Phase {N} review stale loop detected ({date})"
  - Next Action: "Review .planning/phases/{NN}-{slug}/{NN}-REVIEW.md for diagnosis.
    Options: fix manually then re-run /legion:review, or try different review agents."
  Write updated STATE.md

Step 3: Cleanup coordination
  Same as Section 7, Step 4 — use adapter.shutdown_agents + adapter.cleanup_coordination

Step 4: Present stale loop report to user

  ## Phase {N}: {phase_name} — Review Loop Stalled

  {stale_count} consecutive review cycles with no progress. {count} finding(s) unchanged.

  ### Persistent Findings
  | # | Severity | File          | Issue                 | Cycles Unchanged |
  |---|----------|---------------|-----------------------|------------------|
  | 1 | BLOCKER  | path/file.md  | brief issue           | {cycles}         |

  ### Why It Stalled
  {1-2 sentence analysis of the pattern — e.g., "Fix agents addressed surface symptoms
  but the underlying issue is structural" or "The finding references a pattern that
  doesn't exist in the current architecture"}

  ### Options
  1. **Fix manually** — address the persistent findings directly, then re-run `/legion:review`
  2. **Try different agents** — swap review/fix agents for a fresh perspective
  3. **Accept as-is** — acknowledge the findings and proceed
  4. **Investigate root cause** — examine the fix agent outputs to understand the failure pattern

  **Do not auto-proceed.** Wait for explicit user decision.
```

---

## Section 8: Authority Conflict Resolution

Handle conflicts that arise from authority boundaries during review.

### Conflict Types

**Type 1: Domain owner disagrees with general reviewer**
- Scenario: security-engineer says "OK", code-reviewer says "security issue"
- Resolution: Trust domain owner. Filter code-reviewer finding.
- Rationale: Domain owner has specialist expertise

**Type 2: Two agents claim same domain**
- Scenario: Both security-engineer and backend-architect critique auth logic
- Resolution: Both are owners (backend-architect for API design, security-engineer for security)
- Action: Keep both findings, flag as "overlapping domain expertise"
- User decision: Accept both, or specify primary owner for future

**Type 3: Finding outside all panel expertise**
- Scenario: Finding about mobile architecture, but no mobile-developer on panel
- Resolution: Keep finding, flag as "outside panel expertise"
- Action: Suggest adding mobile-developer to panel for re-review

### Escalation Path

If authority filtering produces unexpected results:
1. Document the conflict: which findings were filtered, why
2. Present to user: "{N} findings filtered by authority rules. Review?"
3. User options:
   - Accept filtering (default)
   - Override: include filtered findings
   - Add domain owner to panel and re-run review

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

2. REVIEW AGENT SENDS NO REPORT
   Symptom: A review agent goes idle without reporting results per adapter.collect_results
   Action:
   - Wait a reasonable interval (review agents read many files and may take time)
   - Follow up per adapter protocol: send a message asking for the structured review
     with Finding blocks and a Final Verdict
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
   Symptom: Expected reviewer .md file not found at {AGENTS_DIR}/{agent-id}.md
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
| Stale Loop Detection    | review-loop.md — Section 8.5                    | Section 6 (delta tracking trigger)   |

Agent file paths are resolved using `agent-registry.md` Section 1 (Agent Catalog) for canonical division and path.

### Quick Reference: Review Agent Paths

```
{AGENTS_DIR}/testing-reality-checker.md
{AGENTS_DIR}/testing-evidence-collector.md
{AGENTS_DIR}/testing-api-tester.md
{AGENTS_DIR}/testing-test-results-analyzer.md
{AGENTS_DIR}/testing-performance-benchmarker.md
{AGENTS_DIR}/testing-workflow-optimizer.md
{AGENTS_DIR}/testing-tool-evaluator.md
{AGENTS_DIR}/design-brand-guardian.md
{AGENTS_DIR}/design-ux-researcher.md
{AGENTS_DIR}/agents-orchestrator.md

AGENTS_DIR is resolved once per command via workflow-common Agent Path Resolution Protocol.
```



