---
name: legion:build
description: Execute current phase plans with parallel agent teams
argument-hint: [--phase N]
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, Agent, TeamCreate, TeamDelete, TaskCreate, TaskUpdate, TaskList, SendMessage, AskUserQuestion]
---

<objective>
Execute all plans for the current (or specified) phase. Spawn agents with full personality injection, execute waves in parallel, track progress, and commit completed work.
</objective>

<execution_context>
skills/workflow-common/SKILL.md
skills/agent-registry/SKILL.md
skills/agent-registry/CATALOG.md
skills/wave-executor/SKILL.md
skills/execution-tracker/SKILL.md
skills/memory-manager/SKILL.md
skills/github-sync/SKILL.md
skills/codebase-mapper/SKILL.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<process>
1. DETERMINE TARGET PHASE
   - Check $ARGUMENTS for --phase N flag (e.g., `/legion:build --phase 2`)
   - If no flag: read STATE.md to determine current phase
     - Use the phase number from "Phase: N of M" in Current Position
     - If status says "planned" or "pending": that's the target phase
     - If status says "executed" or "complete": error — "Phase {N} already executed. Run /legion:plan {N+1} for the next phase."
   - Validate: the phase number must exist in ROADMAP.md
   - Check if the phase directory exists: .planning/phases/{NN}-{slug}/
   - If no plan files exist in the directory: error — "No plans found for Phase {N}. Run /legion:plan {N} first."

2. DISCOVER PLANS
   Follow wave-executor skill Section 2 (Plan Discovery):
   - Read the phase directory: .planning/phases/{NN}-{slug}/
   - Find all {NN}-{PP}-PLAN.md files (exclude CONTEXT.md and SUMMARY.md files)
   - Parse YAML frontmatter from each plan file:
     - wave: which execution wave this plan belongs to
     - depends_on: list of prior plans that must complete first
     - autonomous: whether this plan needs an agent personality
     - files_modified: files this plan creates or modifies
     - requirements: requirement IDs covered by this plan
   - Look for "Agent: {agent-id}" in each plan's <objective> or <context> block
   - Build the wave map: group plans by ascending wave number
   - Validate the plan structure (wave-executor Section 2, Step 5):
     - At least one plan file exists
     - No circular wave dependencies (depends_on must reference earlier waves)
     - Wave numbers have no gaps starting from wave 1
     - No two plans in the same wave modify the same file (warn but don't abort)
   - Check for existing SUMMARY.md files (partial execution scenario):
     - If any exist: report "Found {count} existing summaries — plans {list} already executed"
     - Ask user: "Re-run all plans (including completed ones), or skip to incomplete plans only?"
     - If skip: filter the wave map to exclude plans with existing summaries
     - If re-run: delete existing SUMMARY.md files and proceed with all plans
   - Display discovery summary:
     "Phase {N}: {name} — {plan_count} plans across {wave_count} waves
      Wave 1: {plan names} ({count} plans)
      Wave 2: {plan names} ({count} plans)
      ..."

3. PRE-EXECUTION CONFIRMATION
   - Show the user a full pre-execution summary:
     - Phase name and number
     - Total plans and wave count
     - For each wave: plan names and their assigned agents (or "autonomous")
     - Aggregated list of files that will be created or modified across all plans
   - Use AskUserQuestion: "Ready to execute Phase {N}: {phase_name}?"
     Options:
     - "Execute all plans" — proceed with full wave execution
     - "Execute specific wave only" — ask which wave number, execute only that wave
     - "Cancel" — abort immediately with no changes made
     - If answer is empty, unparseable, or does not match any offered option:
       re-ask as plain text: "Reply with 1 (execute all), 2 (specific wave), or 3 (cancel)." and wait

4. EXECUTE WAVES

   **BROWNFIELD CONTEXT** (optional — follows codebase-mapper Section 6.3):
   If `.planning/CODEBASE.md` exists, wave-executor Section 3, Step 3.5 will automatically
   load brownfield context (conventions, agent guidance, risk areas) and inject it into each
   agent's execution prompt as a `## Codebase Context` block. No action needed here — this
   is handled transparently during prompt construction in the wave executor.
   If CODEBASE.md is absent: no injection occurs, agents receive standard prompts.

   Follow wave-executor skill Section 4 (Wave Execution):

   **Team Setup** (once, before wave loop — wave-executor Section 4, Step 0):
   - Call TeamCreate with team_name: "phase-{NN}-execution" (e.g., "phase-04-execution")
   - Call TaskCreate for each plan in the phase:
     - subject: "Execute plan {NN}-{PP}: {plan_name}"
   - Set cross-wave dependencies via TaskUpdate:
     - For plans with depends_on, call TaskUpdate with addBlockedBy referencing
       the task IDs of the dependency plans

   For each wave in ascending order (1, 2, 3, ...):

   a. Announce the wave start:
      "Starting Wave {W} — {plan_count} plan(s): {plan names}"

   b. Pre-execution dependency check (wave-executor Section 4, Step 2):
      - For each plan in this wave, check its depends_on list
      - Verify each referenced plan has a SUMMARY.md file in the phase directory
      - If any dependency SUMMARY.md is missing or contains "Status: Failed":
        - Skip this wave and all subsequent waves
        - Report: "Wave {W} skipped: dependency plan {NN}-{PP} did not complete successfully."
        - Stop execution

   c. For each plan in the wave, construct the agent prompt
      (wave-executor Section 3 — Personality Injection):
      - If autonomous: false
        1. Identify the assigned agent from "Agent: {agent-id}" in the plan
        2. Cross-reference agent-registry.md to get the file path:
           agents/{agent-id}.md
        3. Read the ENTIRE personality .md file (no truncation, no excerpts)
        4. Read the ENTIRE plan .md file
        5. Construct the prompt:
           {PERSONALITY_CONTENT}

           ---

           # Execution Task

           You are executing a plan as part of The Legion Workflows. Follow the tasks below precisely.

           {PLAN_CONTENT}

           ## Important
           - Execute each task in the order listed
           - Run the <verify> commands after each task to confirm completion before moving on
           - After all tasks complete, run the full <verification> checklist
           - Create a summary of what you did: files created/modified, key decisions,
             verification command outputs, and any issues encountered
           - Do NOT modify files outside of the plan's files_modified list unless the task
             explicitly requires it (e.g., updating an import in a file that uses the new file)
           - If a task is ambiguous, apply your specialist expertise to resolve the ambiguity
             and document the decision in your summary

           ## Execution Resilience
           - If you encounter an error, classify it before reporting failure:
             BLOCKER: architecture/design/logic issues → stop, report in summary, move to next task
             ENVIRONMENT: missing deps, wrong versions, missing dirs → auto-remediate and retry
           - Auto-remediation steps:
             1. Log: "ENVIRONMENT ISSUE: {error}. Attempting remediation..."
             2. Generate and execute a fix (npm install, mkdir -p, etc.)
             3. Retry the failed step once
             4. If retry fails: escalate to BLOCKER in your summary
           - Only remediate within autonomous scope (declared deps, expected dirs).
             Do NOT install new unplanned dependencies.
           - For verbose commands (npm/pip/cargo install, docker build, go build):
             redirect output to a temp file, check exit code, only show last 20
             lines if the command failed. Keep test/lint/typecheck output visible.
        6. Agent name: "{agent-id}-{NN}-{PP}" (e.g., "engineering-senior-developer-04-01")
        - If personality file is missing: fall back to autonomous mode, log the warning

      - If autonomous: true
        1. Read the ENTIRE plan .md file
        2. Construct the autonomous prompt:
           # Execution Task

           You are executing a plan as part of The Legion Workflows. No specialist agent
           personality is needed for this plan — execute the tasks directly.

           {PLAN_CONTENT}

           ## Important
           - Execute each task in the order listed
           - Run the <verify> commands after each task to confirm completion
           - After all tasks complete, run the full <verification> checklist
           - Create a summary of what you did: files created/modified, key decisions,
             verification command outputs, and any issues encountered

           ## Execution Resilience
           - If you encounter an error, classify it before reporting failure:
             BLOCKER: architecture/design/logic issues → stop, report in summary, move to next task
             ENVIRONMENT: missing deps, wrong versions, missing dirs → auto-remediate and retry
           - Auto-remediation steps:
             1. Log: "ENVIRONMENT ISSUE: {error}. Attempting remediation..."
             2. Generate and execute a fix (npm install, mkdir -p, etc.)
             3. Retry the failed step once
             4. If retry fails: escalate to BLOCKER in your summary
           - Only remediate within autonomous scope (declared deps, expected dirs).
             Do NOT install new unplanned dependencies.
           - For verbose commands (npm/pip/cargo install, docker build, go build):
             redirect output to a temp file, check exit code, only show last 20
             lines if the command failed. Keep test/lint/typecheck output visible.
        3. Agent name: "executor-{NN}-{PP}" (e.g., "executor-04-01")

   d. Spawn all agents in the wave IN PARALLEL (wave-executor Section 4, Step 4):
      - Issue ALL Agent tool calls for this wave in a SINGLE response message
      - Each agent uses model: "sonnet" (cost profile: Sonnet for execution)
      - Each Agent call MUST include team_name: "phase-{NN}-execution"
      - Do NOT spawn agents one at a time — parallel dispatch is required

   e. Collect agent results via SendMessage (wave-executor Section 4, Step 5):
      - Wait for every agent in the wave to send its completion message via SendMessage
      - Each message contains a structured summary: Status, Files, Verification,
        Decisions, Issues, Errors
      - If an agent goes idle without sending a message, follow Scenario 9 recovery

   f. Process results for each completed agent (wave-executor Section 5):
      - Parse the agent's SendMessage content for the structured Status field
      - Determine status: Complete | Complete with Warnings | Failed
      - Check the agent's summary for auto-remediation reports:
        If the summary contains "Auto-remediated:" lines, include them in the SUMMARY.md
        under a "## Auto-Remediation" section with what was fixed and the retry result
      - An agent that auto-remediated and succeeded is still "Complete" (not "Complete with Warnings")
      - An agent that escalated an ENVIRONMENT issue to BLOCKER is "Failed" for that task
      - Write the plan summary file to .planning/phases/{NN}-{slug}/{NN}-{PP}-SUMMARY.md
        using the format defined in wave-executor Section 5, Step 3
      - Verify the summary file was written successfully

   g. Track progress after each plan result (execution-tracker Section 2):
      - Update STATE.md: status, last activity, phase results, progress bar
      - If the plan succeeded: create an atomic git commit:
        feat(legion): execute plan {NN}-{PP} — {plan_name}

        Phase {N}: {phase_name}
        Wave: {W}
        Requirements: {comma-separated requirement IDs}

        Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
      - If the plan failed: do NOT commit — leave changes unstaged for diagnosis

   g2. Record outcome in memory (optional — follows memory-manager Section 6)
       If .planning/memory/OUTCOMES.md exists or .planning/memory/ directory can be created:
         Follow memory-manager Section 3 (Store Outcome):
         - Agent: the agent that executed this plan (from plan's agent assignment, or "autonomous" if autonomous: true)
         - Task Type: primary task type from the plan (match plan's tasks against agent-registry task type tags)
         - Outcome: "success" if plan passed all verification, "failed" if plan failed, "partial" if completed with warnings
         - Importance: per memory-manager Section 2 importance scoring (base 2 for success, 5 for failure, 3 for partial)
         - Tags: phase slug (e.g., "cross-session-learning"), agent division (e.g., "engineering"), key file types modified
         - Summary: one-line from the agent's SendMessage completion summary (the Status field)
         NOTE: Memory write happens AFTER the plan's git commit (step 4.g). The memory file change
         will be included in the wave completion commit (step 4.h) via git add.
       If memory is not available: skip silently. Do not warn. Do not suggest setup.

   g3. Update GitHub issue checklist (optional — follows github-sync Section 8)
       If github_available (checked once at start of step 4):
         - Read STATE.md ## GitHub section for the current phase's issue number
         - If an issue number exists:
           Update the issue body checklist (github-sync Section 2.4):
           Change "- [ ] Plan {NN}-{PP}" to "- [x] Plan {NN}-{PP}" in the issue body
         - If no issue number: skip
       If github_available is false: skip silently.

   h. Track wave completion (execution-tracker Section 3):
      - Count plans succeeded vs. failed in the wave
      - Update ROADMAP.md progress table: Completed count and Status column
      - Create wave state commit:
        chore(legion): update state after wave {W} of phase {N}
      - Report wave status:
        "Wave {W}: {succeeded}/{total} plans succeeded
         Files modified: {aggregate list}
         {If all passed: 'Proceeding to Wave {W+1}' or 'All waves complete'}
         {If any failed: 'BLOCKED — {count} plan(s) failed. See summaries for details.'}"

   i. If ANY plan in the wave failed: STOP immediately
      - Do NOT proceed to the next wave
      - Report the full list of failed plans with their summary file paths
      - Suggest: "Run /legion:review to diagnose failures in Phase {N}."

5. COMPLETE PHASE EXECUTION
   Follow execution-tracker Section 4 (Phase Completion Tracking):

   a. Calculate final phase status:
      - All plans succeeded: phase is complete
      - Some plans failed: phase is partial

   a2. DETECT MANUAL EDITS for preference capture (optional — follows memory-manager Section 13)
       Check if the user made manual edits to files that agents modified during execution:
       1. Build list of all files modified by agents (from SUMMARY.md files_modified lists)
       2. Run: git diff --name-only
          This shows unstaged changes — files the user edited after agent commits
       3. Intersect: find files that appear in BOTH the agent-modified list AND the git diff output
       4. If intersection is non-empty:
          These are manual edits to agent output — corrective preference signals.
          For each manually-edited file:
          - Get the diff: git diff {file}
          - Store preference (if memory available, follows memory-manager Section 13):
            - Decision Point: "manual-edit"
            - Context: "Phase {N}, post-build manual edit to {file}"
            - Proposed: "Agent output for {file} (see plan SUMMARY.md)"
            - User Choice: "User edited {file} — {brief diff summary: +N/-N lines}"
            - Signal: "corrective"
            - Agent: the agent that last modified this file (from SUMMARY.md)
            - Tags: "manual-edit", file extension, agent division
          - NOTE: Do not include the full diff content — just a summary (+N/-N lines, key changes)
       5. If intersection is empty: no manual edits detected, skip
       6. If git diff fails or memory not available: skip silently (same degradation pattern)
       This step is informational and non-blocking. Manual edit detection never prevents
       phase completion or produces errors.

   b. Update STATE.md:
      - Phase: {N} of {total} (executed, pending review) OR (partial — {count} plan(s) failed)
      - Status: "Phase {N} complete — all plans executed successfully"
        OR: "Phase {N} partial — {count} plan(s) failed, review needed"
      - Last Activity: "Phase {N} execution ({date})"
      - Next Action: "Run `/legion:review` to verify Phase {N}: {phase_name}"

   c. Update ROADMAP.md progress table:
      - Status: "Complete" if all plans passed, "Partial" if some failed

   d. Create phase completion commit:
      chore(legion): complete phase {N} execution — {phase_name}

      All plans executed. {succeeded}/{total} passed.
      Overall progress: {completed}/{total_plans} ({pct}%)

      Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

   d2. Shutdown the Team (wave-executor Section 4, Step 9):
       - Send shutdown_request via SendMessage to every agent spawned during the phase
       - Wait for shutdown confirmations
       - Call TeamDelete to clean up the Team configuration
       - This runs on BOTH success and failure paths — never leave orphaned agents

   e. Display final progress using execution-tracker Section 4, Step 4 format:
      ## Phase {N}: {phase_name} — Execution Complete
      [##########          ] {pct}% — {completed}/{total} plans complete

      | Plan | Wave | Status | Summary |
      |------|------|--------|---------|
      | {NN}-{PP} | {W} | Pass/Fail | {one-line summary} |

   e2. CREATE GITHUB PR (optional — follows github-sync Section 8)
       Only if ALL plans passed (no PR for partial/failed phases):
       - Check GitHub availability: gh auth status && git remote get-url origin
       - If github_available is false: skip to step 6

       If github_available is true:
       a. Use AskUserQuestion: "Phase {N} complete. Create a GitHub PR?"
          Options:
          - "Create PR" — proceed with PR creation
          - "Skip PR" — skip, proceed to step 6
          - If answer is empty, unparseable, or does not match any offered option:
            re-ask as plain text: "Reply with 1 (create PR) or 2 (skip PR)." and wait
       b. If user chose "Create PR":
          - Check current branch (github-sync Section 3.1)
          - If on default branch: create feature branch legion/phase-{NN}-{slug}
          - Push branch to remote: git push -u origin {branch}
          - Create PR (github-sync Section 3.2):
            Title: "Phase {N}: {phase_name}"
            Body: phase goal, plan summaries table, files modified, requirements, "Closes #{issue_number}" if issue exists
          - Store PR number in STATE.md ## GitHub section (github-sync Section 6)
          - Confirm to user: "Created PR #{number}: {pr_url}"
       c. If PR creation fails: report error, do not abort — the phase is still valid

6. ROUTE TO NEXT ACTION
   - If all plans passed:
     "Phase {N}: {phase_name} complete.
      Run `/legion:review` to verify the work."

   - If some plans failed:
     "Phase {N}: {phase_name} partial — {count} plan(s) failed.
      Review summaries: .planning/phases/{NN}-{slug}/{NN}-{PP}-SUMMARY.md
      Then run `/legion:review` for diagnosis."

   - Do NOT automatically trigger /legion:review — let the user decide when to proceed.
</process>
</output>