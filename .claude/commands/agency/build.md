---
name: agency:build
description: Execute current phase plans with parallel agent teams
argument-hint: [--phase N]
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, Agent, TeamCreate, TeamDelete, TaskCreate, TaskUpdate, TaskList, SendMessage]
---

<objective>
Execute all plans for the current (or specified) phase. Spawn agents with full personality injection, execute waves in parallel, track progress, and commit completed work.
</objective>

<execution_context>
@./.claude/skills/agency/workflow-common.md
@./.claude/skills/agency/agent-registry.md
@./.claude/skills/agency/wave-executor.md
@./.claude/skills/agency/execution-tracker.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<process>
1. DETERMINE TARGET PHASE
   - Check $ARGUMENTS for --phase N flag (e.g., `/agency:build --phase 2`)
   - If no flag: read STATE.md to determine current phase
     - Use the phase number from "Phase: N of M" in Current Position
     - If status says "planned" or "pending": that's the target phase
     - If status says "executed" or "complete": error — "Phase {N} already executed. Run /agency:plan {N+1} for the next phase."
   - Validate: the phase number must exist in ROADMAP.md
   - Check if the phase directory exists: .planning/phases/{NN}-{slug}/
   - If no plan files exist in the directory: error — "No plans found for Phase {N}. Run /agency:plan {N} first."

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

4. EXECUTE WAVES
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
           agency-agents/{division}/{agent-id}.md
        3. Read the ENTIRE personality .md file (no truncation, no excerpts)
        4. Read the ENTIRE plan .md file
        5. Construct the prompt:
           {PERSONALITY_CONTENT}

           ---

           # Execution Task

           You are executing a plan as part of The Agency Workflows. Follow the tasks below precisely.

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
        6. Agent name: "{agent-id}-{NN}-{PP}" (e.g., "engineering-senior-developer-04-01")
        - If personality file is missing: fall back to autonomous mode, log the warning

      - If autonomous: true
        1. Read the ENTIRE plan .md file
        2. Construct the autonomous prompt:
           # Execution Task

           You are executing a plan as part of The Agency Workflows. No specialist agent
           personality is needed for this plan — execute the tasks directly.

           {PLAN_CONTENT}

           ## Important
           - Execute each task in the order listed
           - Run the <verify> commands after each task to confirm completion
           - After all tasks complete, run the full <verification> checklist
           - Create a summary of what you did: files created/modified, key decisions,
             verification command outputs, and any issues encountered
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
      - Write the plan summary file to .planning/phases/{NN}-{slug}/{NN}-{PP}-SUMMARY.md
        using the format defined in wave-executor Section 5, Step 3
      - Verify the summary file was written successfully

   g. Track progress after each plan result (execution-tracker Section 2):
      - Update STATE.md: status, last activity, phase results, progress bar
      - If the plan succeeded: create an atomic git commit:
        feat(agency): execute plan {NN}-{PP} — {plan_name}

        Phase {N}: {phase_name}
        Wave: {W}
        Requirements: {comma-separated requirement IDs}

        Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
      - If the plan failed: do NOT commit — leave changes unstaged for diagnosis

   h. Track wave completion (execution-tracker Section 3):
      - Count plans succeeded vs. failed in the wave
      - Update ROADMAP.md progress table: Completed count and Status column
      - Create wave state commit:
        chore(agency): update state after wave {W} of phase {N}
      - Report wave status:
        "Wave {W}: {succeeded}/{total} plans succeeded
         Files modified: {aggregate list}
         {If all passed: 'Proceeding to Wave {W+1}' or 'All waves complete'}
         {If any failed: 'BLOCKED — {count} plan(s) failed. See summaries for details.'}"

   i. If ANY plan in the wave failed: STOP immediately
      - Do NOT proceed to the next wave
      - Report the full list of failed plans with their summary file paths
      - Suggest: "Run /agency:review to diagnose failures in Phase {N}."

5. COMPLETE PHASE EXECUTION
   Follow execution-tracker Section 4 (Phase Completion Tracking):

   a. Calculate final phase status:
      - All plans succeeded: phase is complete
      - Some plans failed: phase is partial

   b. Update STATE.md:
      - Phase: {N} of {total} (executed, pending review) OR (partial — {count} plan(s) failed)
      - Status: "Phase {N} complete — all plans executed successfully"
        OR: "Phase {N} partial — {count} plan(s) failed, review needed"
      - Last Activity: "Phase {N} execution ({date})"
      - Next Action: "Run `/agency:review` to verify Phase {N}: {phase_name}"

   c. Update ROADMAP.md progress table:
      - Status: "Complete" if all plans passed, "Partial" if some failed

   d. Create phase completion commit:
      chore(agency): complete phase {N} execution — {phase_name}

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

6. ROUTE TO NEXT ACTION
   - If all plans passed:
     "Phase {N}: {phase_name} complete.
      Run `/agency:review` to verify the work."

   - If some plans failed:
     "Phase {N}: {phase_name} partial — {count} plan(s) failed.
      Review summaries: .planning/phases/{NN}-{slug}/{NN}-{PP}-SUMMARY.md
      Then run `/agency:review` for diagnosis."

   - Do NOT automatically trigger /agency:review — let the user decide when to proceed.
</process>
