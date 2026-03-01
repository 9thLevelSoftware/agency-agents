---
name: agency:review
description: Run quality review cycle with testing/QA agents
argument-hint: [--phase N]
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, Agent, TeamCreate, TeamDelete, TaskCreate, TaskUpdate, TaskList, SendMessage, AskUserQuestion]
---

<objective>
Select appropriate review agents for the current phase, run a personality-injected dev-QA review loop (max 3 cycles), route fixes to the right agents, and mark the phase complete only after review passes. Escalate to the user if 3 cycles fail to resolve all blockers.
</objective>

<execution_context>
@./.claude/skills/agency/workflow-common.md
@./.claude/skills/agency/agent-registry.md
@./.claude/skills/agency/review-loop.md
@./.claude/skills/agency/execution-tracker.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<process>
1. DETERMINE TARGET PHASE
   - Check $ARGUMENTS for --phase N flag (e.g., `/agency:review --phase 4`)
   - If no flag: read STATE.md to determine current phase
     - Use the phase number from "Phase: N of M" in Current Position
     - Valid states for review: "executed, pending review" or "partial"
     - If status says "planned" or "pending": error — "Phase {N} hasn't been executed yet. Run /agency:build first."
     - If status says "complete": error — "Phase {N} already passed review. Run /agency:plan {N+1} for the next phase."
   - Validate: phase must exist in ROADMAP.md
   - Check that phase directory has SUMMARY.md files (proof of execution):
     - Look for files matching .planning/phases/{NN}-{slug}/{NN}-{PP}-SUMMARY.md
     - If no SUMMARY.md files found: error — "Phase {N} has no execution summaries. Run /agency:build first."
   - Display: "Reviewing Phase {N}: {phase_name}"

2. GATHER PHASE CONTEXT
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

3. SELECT REVIEW AGENTS
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
      - Confirm file at: agency-agents/{division}/{agent-id}.md
      - If missing: fall back to testing-reality-checker for that slot
      - Log any fallback: "Warning: {agent-id}.md not found. Using testing-reality-checker."

   d. Present selected reviewers to user via AskUserQuestion:
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

4. EXECUTE REVIEW CYCLE
   Initialize: cycle_count = 0

   **Team Setup** (once, before review loop):
   - Call TeamCreate with team_name: "phase-{NN}-review" (e.g., "phase-05-review")
     description: "Phase {N}: {phase_name} — review cycle"

   **LOOP START** (max 3 iterations):

   a. Increment cycle_count by 1
      Announce: "Review cycle {cycle_count}/3 — Phase {N}: {phase_name}"

   b. Spawn review agents (follow review-loop Section 3):
      For each selected reviewer:
      1. Read the reviewer's personality .md file in full
         (path: agency-agents/{division}/{agent-id}.md)
      2. Construct the review prompt using the exact format in review-loop Section 3, Step 3:
         - Start with {PERSONALITY_CONTENT} (full file, no truncation)
         - Separator: "---"
         - "# Review Task" header with phase name, goal, success criteria, plans executed,
           files to review, review instructions, required feedback format, and SendMessage
           reporting requirement
         - For re-review cycles (cycle_count > 1): include the re-review context block from
           review-loop Section 6, Step 3 with previous findings, what was fixed, and what
           remains unresolved
      3. Spawn via Agent tool:
         - subagent_type: "general-purpose"
         - model: "sonnet"
         - name: "{agent-id}-review-{NN}-c{cycle_count}"
           (e.g., "testing-reality-checker-review-05-c1")
         - team_name: "phase-{NN}-review"
         - prompt: {constructed prompt from step 2}
      Issue ALL reviewer spawn calls in a SINGLE response message — spawn ALL reviewers
      in parallel (do not spawn one at a time)

   c. Collect review results via SendMessage (follow review-loop Section 4):
      - Wait for all review agents to send their findings via SendMessage
      - Parse findings: extract each Finding block (file, line/section, severity, issue,
        details, suggested fix, reviewer agent ID)
      - Deduplicate across reviewers per review-loop Section 4, Step 2:
        same file + same line/section → keep highest severity; reviewers disagree on
        severity for same issue → escalate to BLOCKER
      - Triage: must-fix list = all BLOCKERs + all WARNINGs; nice-to-have = all SUGGESTIONs

   d. Display findings table (follow review-loop Section 4, Step 4):
      ## Review Findings — Cycle {cycle_count}/3

      | #  | Severity   | File                    | Issue (brief)              | Reviewer           |
      |----|------------|-------------------------|----------------------------|--------------------|
      | 1  | BLOCKER    | path/to/file.md         | {brief issue}              | {agent-id}         |
      | 2  | WARNING    | path/to/other.md        | {brief issue}              | {agent-id}         |
      | 3  | SUGGESTION | path/to/third.md        | {brief issue}              | {agent-id}         |

      **Blockers**: {count} | **Warnings**: {count} | **Suggestions**: {count}
      **Verdicts**: {reviewer-id}: {PASS|NEEDS WORK|FAIL}, ...
      Verdict: {aggregate verdict — PASS if no blockers/warnings, NEEDS WORK otherwise}

   e. If aggregate verdict is PASS (must-fix list is empty AND all reviewers gave PASS):
      - Break the loop — go to step 5, Path A

   f. If verdict is NEEDS WORK or FAIL and cycle_count < 3:
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
        For personality-injected agents: full personality + "# Fix Task" with findings list
        For autonomous agents: "# Fix Task" with findings list only
      - Spawn fix agents in parallel (all Agent calls in a SINGLE response message):
        subagent_type: "general-purpose", model: "sonnet"
        name: "{agent-id}-fix-{NN}-cycle{cycle_count}"
        team_name: "phase-{NN}-review"
      - Wait for all fix agents to send their SendMessage completion summaries
      - Track per finding: fixed (by which agent) vs. not-fixed (with reason)
      - Create fix commit:
        git add {only files actually modified by fix agents}
        git commit -m "fix(agency): review cycle {cycle_count} fixes for phase {N}

        Phase {N}: {phase_name}
        Fixed {count} issues: {brief comma-separated descriptions}
        Unresolved: {count or "none"}

        Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
      - Update STATE.md: "Phase {N} under review — cycle {cycle_count}/3, {blocker_count}
        blocker(s) remaining"
      - Go back to LOOP START for re-review (re-review scopes to modified files per
        review-loop Section 6, Step 2)

   g. If cycle_count >= 3 AND blockers remain:
      - Break the loop — go to step 5, Path B (escalation)

   **LOOP END**

   **Team Teardown** (always runs — success, escalation, or error paths):
   - Send shutdown_request to all agents via SendMessage before proceeding
   - Wait for shutdown confirmations
   - Call TeamDelete with team_name: "phase-{NN}-review" to clean up

5. COMPLETE REVIEW
   Determine outcome based on loop result:

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
        If more phases remain: "Run `/agency:plan {N+1}` to plan the next phase"
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
      git commit -m "chore(agency): phase {N} review passed — {phase_name}

      Review passed after {cycles} cycle(s).
      {blocker_count} blocker(s) fixed, {warning_count} warning(s) fixed.
      Reviewers: {comma-separated reviewer IDs}

      Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

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
        Fix manually then re-run /agency:review, or accept as-is and proceed."
      Write updated STATE.md

   c. Display escalation table with remaining blockers (review-loop Section 8, Step 4):
      ## Phase {N}: {phase_name} — Review Escalated

      3 review cycles completed. {count} blocker(s) remain unresolved.

      ### Remaining Blockers
      | # | File          | Issue                 | Fix Attempts         |
      |---|---------------|-----------------------|----------------------|
      | 1 | path/file.md  | {brief issue}         | {3 attempts summary} |

   d. Use AskUserQuestion: "How would you like to proceed?"
      Options:
      - "Fix manually and re-run /agency:review" — exit; let user address the issues
      - "Accept as-is and move to /agency:plan {N+1}" — mark phase complete despite issues
      - "Investigate further" — exit for user to diagnose root cause

   e. If user selects "Accept as-is":
      - Mark phase complete using the same STATE.md and ROADMAP.md updates as Path A
      - Note in REVIEW.md under a new section:
        "## User Override
         Accepted with {count} unresolved blocker(s) by user decision on {date}."
      - Create review completion commit (same message as Path A but append "with overrides")

   f. If user selects "Fix manually" or "Investigate further": exit immediately with no further
      state changes

6. ROUTE TO NEXT ACTION
   - If review passed (Path A) or user accepted as-is (Path B override):
     If more phases remain:
     "Phase {N}: {phase_name} complete.
      Next: Run `/agency:plan {N+1}` to plan the next phase."
     If this was the last phase:
     "All phases complete! The Agency Workflows project is finished."

   - If escalated and user chose "Fix manually":
     "Fix the issues listed in .planning/phases/{NN}-{slug}/{NN}-REVIEW.md
      Then re-run `/agency:review` to verify."

   - If escalated and user chose "Investigate further":
     "Review .planning/phases/{NN}-{slug}/{NN}-REVIEW.md for the full escalation report.
      Each unresolved finding includes the fix attempts and why they failed."

   - Do NOT automatically trigger /agency:plan — let the user decide when to proceed.
</process>
