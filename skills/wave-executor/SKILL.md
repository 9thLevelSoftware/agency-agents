---
name: legion:wave-executor
description: Executes wave-structured plans with personality-injected agents — parallel or sequential per CLI adapter
triggers: [build, execute, parallel, wave, dispatch, spawn]
token_cost: high
summary: "Executes wave-structured plans via the active CLI adapter. Parallel within waves (if adapter supports it), sequential between. Full personality injection, adapter-based result collection. Core engine for /legion:build."
---

# Wave Executor

Engine for `/legion:build`. Takes the plan files in a phase directory and executes them in wave order — spawning personality-injected agents in parallel within each wave, waiting for completion before advancing to the next wave. The full flow: discover plans, validate structure, inject personalities, spawn parallel agents, collect results, write summaries, report.

---

## Section 1: Execution Principles

These rules govern all execution decisions. Do not deviate from them.

> **MANDATORY: Follow the active CLI adapter's Execution Protocol.**
>
> Before executing any plans, load the active adapter (see workflow-common CLI Detection Protocol).
> The adapter defines how agents are spawned, coordinated, and cleaned up.
>
> **If adapter.parallel_execution is true AND adapter.structured_messaging is true** (e.g., Claude Code):
> Use the adapter's full coordination lifecycle (e.g., TeamCreate → TaskCreate → Agent with team_name → SendMessage → TeamDelete on Claude Code).
> On Claude Code specifically: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` must be enabled.
> If Teams are unavailable, stop and tell the user to enable the flag.
>
> **If adapter.parallel_execution is true but adapter.structured_messaging is false** (e.g., Cursor):
> Spawn agents in parallel. Collect results via file system per adapter.collect_results.
>
> **If adapter.parallel_execution is false** (e.g., Codex CLI, Gemini CLI, Aider):
> Execute plans sequentially within each wave. No agent spawning may be needed —
> use adapter.spawn_agent_personality or execute inline per adapter protocol.
>
> This is not optional. Always consult the adapter before spawning agents.

1. **Wave-sequential, parallel-within** — all Wave 1 plans must complete before any Wave 2 plan begins. Within a wave, plans run simultaneously if `adapter.parallel_execution` is true, or sequentially if false.
2. **Full personality injection** — each agent receives the ENTIRE contents of its assigned personality `.md` file. No summaries, no excerpts, no paraphrasing. On CLIs without agent spawning, personality is a prompt prefix in the current session.
3. **Adapter model for execution** — all spawned agents use `adapter.model_execution`. This matches the Cost Profile Convention from `workflow-common.md`.
4. **No automatic retries** — if an agent fails, capture the error output and stop the wave. Report to the user. Do not re-spawn the failed agent. See Error Handling Pattern in `workflow-common.md`.
5. **Each plan produces a summary** — after an agent completes, write a `{NN}-{PP}-SUMMARY.md` file to the phase directory, whether the result is success or failure.
6. **Orchestrator stays in main context** — the `/legion:build` command itself does not execute plan work. It reads, validates, dispatches, and collects. On CLIs without spawning, personality injection is temporary and dropped after each plan.
7. **Failed wave blocks subsequent waves** — if any plan in a wave fails, do not proceed to the next wave. Report wave status and pause for user decision.
8. **Files isolation per wave** — plans within the same wave must not share files_modified entries. This is guaranteed by plan authoring (see phase-decomposer.md), but flag a warning if a conflict is detected.
9. **One coordination context per phase** — per adapter protocol: one Team on Claude Code, one checklist file on other CLIs. Not per wave.
10. **Agents report via adapter.collect_results** — spawned agents send their structured completion summary per the adapter's result collection method. This keeps the coordinator's context window small.
11. **Verification-gated completion** — after each task, the agent MUST run all `> verification:` commands from the task's action block. If any verification command returns a non-zero exit code, the task is marked as failed and the agent must report the failure. Do not proceed to the next task until all verifications pass.

---

## Section 2: Plan Discovery

How to find, read, and organize plan files for a phase before any execution begins.

```
Step 1: Determine the phase directory path
  - Read .planning/STATE.md to find the current phase number and slug
  - Or accept a --phase argument from the build command
  - Construct the directory: .planning/phases/{NN}-{phase-slug}/
  - Example: .planning/phases/04-parallel-execution/

Step 2: List all files in the phase directory
  - Read directory contents
  - Filter for files matching: {NN}-{PP}-PLAN.md
  - Exclude: {NN}-CONTEXT.md, {NN}-{PP}-SUMMARY.md, and any other files
  - Sort plans by plan number (PP) ascending

Step 3: Read each plan file's YAML frontmatter
  For each plan file, parse the frontmatter block (between --- delimiters):
  - wave: integer (required — which execution wave this plan belongs to)
  - depends_on: list of "NN-PP" strings (plans that must complete before this one)
  - autonomous: boolean (true = no agent needed, false = agent-delegated)
  - files_modified: list of file paths this plan creates or modifies
  - requirements: list of requirement IDs covered by this plan

Step 4: Build the wave map
  Construct a data structure grouping plans by wave number:
  {
    1: [plan-04-01, plan-04-02],   -- runs first, in parallel
    2: [plan-04-03],               -- runs after wave 1 completes
    3: [plan-04-04, plan-04-05],   -- runs after wave 2 completes
  }

Step 5: Validate the plan structure
  Check all of the following before proceeding:
  a) At least one plan file exists. If not: error "No plans found for Phase {N}.
     Run /legion:plan {N} first."
  b) All depends_on references point to plans in earlier (lower) waves. If a plan
     in wave 2 depends on another wave 2 plan: error "Circular wave dependency
     detected in plan {NN}-{PP}. Plans within the same wave cannot depend on
     each other. Re-run /legion:plan {N} to fix the plan structure."
  c) Each wave number is a positive integer with no gaps above wave 1 (wave 1
     always present; wave 3 allowed only if wave 2 exists).
  d) All files_modified lists are disjoint within each wave (no two plans in the
     same wave modify the same file). If a conflict is found: warn the user —
     do not abort, but flag for review.
  If validation fails on (a), (b), or (c): stop and report the error. Do not execute.

Step 6: Report discovery results
  Before executing, show a discovery summary:
  "Found {total} plans across {wave_count} waves:
   Wave 1: {plan names} ({count} plans)
   Wave 2: {plan names} ({count} plans)
   ..."
```

---

## Section 3: Personality Injection

How to load a full agent personality and construct the execution prompt for each plan.

```
For each plan where autonomous: false:

Step 1: Identify the assigned agent
  - Read the agent-id from the plan's frontmatter `agents:` field
  - Path format: {AGENTS_DIR}/{agent-id}.md  (AGENTS_DIR resolved via workflow-common Agent Path Resolution Protocol)
  - Example: {AGENTS_DIR}/engineering-senior-developer.md

Step 1.5: Validate the agent-id against actual files
  - Attempt to Read {AGENTS_DIR}/{agent-id}.md
  - If the file EXISTS: proceed to Step 2 with this agent-id
  - If the file does NOT exist: the plan may have a hallucinated or abbreviated agent-id.
    Run a fuzzy match:
    a) Extract the suffix after the last hyphen-delimited division prefix
       (e.g., "dev-senior-developer" → "senior-developer",
              "backend-architect" → "backend-architect")
    b) Run: Glob {AGENTS_DIR}/*-{suffix}.md
    c) If exactly ONE match is returned: use that file's agent-id instead
       Log: "Agent ID corrected: {original-id} → {matched-id}"
    d) If MULTIPLE matches: pick the first and log a warning:
       "Multiple agent matches for {original-id}: {matches}. Using {selected}."
    e) If ZERO matches: try a broader search:
       Run: Glob {AGENTS_DIR}/*{last-word-of-id}*.md
       (e.g., "dev-senior-developer" → *developer*.md)
       If exactly one match: use it and log correction
       If multiple matches: use the first and log warning
       If ZERO matches: fall back to autonomous mode and log:
       "No agent file found for {original-id}. Executing plan autonomously."

Step 2: Read the complete personality file
  - Use the Read tool to load the ENTIRE agent .md file
  - Do not truncate, summarize, or excerpt any portion
  - The personality content includes: the agent's identity, specialization, behavioral
    traits, communication style, technical focus areas, and working principles
  - Capture this as: PERSONALITY_CONTENT

Step 3: Read the complete plan file
  - Use the Read tool to load the full plan .md file
  - Capture the section starting from <objective> through end of file as: PLAN_CONTENT

Step 3.5: Load brownfield context (optional)
  - Check if .planning/CODEBASE.md exists
  - If yes:
    a. Read .planning/CODEBASE.md
    b. Extract these sections:
       - "## Agent Guidance" → Preferred and Avoid directives
       - "## Conventions Detected" → all convention bullet points
       - "## Risk Areas" → filter to rows where the Area or file paths overlap
         with the current plan's files_modified list
    c. Compose a CODEBASE_CONTEXT block:

       ## Codebase Context

       ### Conventions
       {bullet list from Conventions Detected}

       ### Agent Guidance
       - **Preferred**: {from Agent Guidance}
       - **Avoid**: {from Agent Guidance}

       ### Risk Areas
       {filtered Risk Areas table rows, or "No risk areas overlap with this plan's files."}

  - If CODEBASE.md does not exist: set CODEBASE_CONTEXT = "" (empty string, no block injected)

Step 4: Construct the agent execution prompt
  Combine personality and plan using this exact format:

  """
  {PERSONALITY_CONTENT}

  ---

  # Execution Task

  You are executing a plan as part of Legion. Follow the tasks below precisely.

  {CODEBASE_CONTEXT}

  {PLAN_CONTENT}

  ## Important
  - Execute each task in the order listed
  - Run the <verify> commands after each task to confirm completion before moving on
  - CRITICAL: Extract all `> verification:` lines from each task's <action> block and run them as bash commands
  - Each `> verification:` line is a bash command that must return exit code 0
  - If ANY verification command fails (non-zero exit code):
    a. Record the failed command and its output
    b. Attempt to fix the issue (re-read the task, check your work)
    c. Re-run the failed verification
    d. If it still fails after one fix attempt: mark the task as FAILED in your summary
    e. Do NOT skip failed verifications or proceed to the next task
  - Run verifications in order — they may have implicit dependencies
  - After all tasks complete, run the full <verification> checklist
  - Do NOT modify files outside of the plan's files_modified list unless the task
    explicitly requires it (e.g., updating an import in a file that uses the new file)
  - If a task is ambiguous, apply your specialist expertise to resolve the ambiguity
    and document the decision in your summary

  ## Reporting Results (adapter-conditional)
  When all tasks and verification are complete, report your results:

  **If adapter.structured_messaging is true** (e.g., Claude Code):
  1. Use the adapter's messaging tool to send your structured summary to the coordinator
     (e.g., SendMessage on Claude Code)
  2. Use the adapter's task tracking to mark your task as completed
     (e.g., TaskUpdate on Claude Code)

  **If adapter.structured_messaging is false** (e.g., Codex CLI, Cursor, Aider):
  1. Write your structured summary to: `.planning/phases/{NN}/{NN}-{PP}-RESULT.md`
  2. The coordinator will read this file after your execution completes

  Your summary MUST include these fields:
  - **Status**: Complete | Complete with Warnings | Failed
  - **Files**: list of files created/modified with brief descriptions
  - **Verification**: outputs from <verify> commands
  - **Verification Commands Run**: count of `> verification:` commands executed
  - **Verification Passed**: count that returned exit code 0
  - **Verification Failed**: count that returned non-zero, with command + output for each
  - **Decisions**: key implementation decisions made
  - **Issues**: any problems or warnings encountered (or "None")
  - **Errors**: error details if failed (or "None")
  """

Step 5: Spawn the agent per adapter protocol
  Use adapter.spawn_agent_personality with:
  - prompt: {constructed prompt from Step 4}
  - model: adapter.model_execution
  - name: "{agent-id}-{NN}-{PP}" -- e.g., "engineering-senior-developer-04-01"
  - Additional parameters per adapter (e.g., team_name on Claude Code)

  On CLIs without agent spawning (adapter.agent_spawning = false):
  - Prepend the personality content to the current session context
  - Execute the plan tasks inline within the current session
  - Write the result per adapter.collect_results when complete

For autonomous plans (autonomous: true):

  Step 1: Skip personality loading entirely

  Step 2: Read the complete plan file

  Step 3: Construct the autonomous execution prompt:
  """
  # Execution Task

  You are executing a plan as part of Legion. No specialist agent
  personality is needed for this plan — execute the tasks directly.

  {CODEBASE_CONTEXT}

  {PLAN_CONTENT}

  ## Important
  - Execute each task in the order listed
  - Run the <verify> commands after each task to confirm completion
  - CRITICAL: Extract all `> verification:` lines from each task's <action> block and run them as bash commands
  - Each `> verification:` line is a bash command that must return exit code 0
  - If ANY verification command fails (non-zero exit code):
    a. Record the failed command and its output
    b. Attempt to fix the issue (re-read the task, check your work)
    c. Re-run the failed verification
    d. If it still fails after one fix attempt: mark the task as FAILED in your summary
    e. Do NOT skip failed verifications or proceed to the next task
  - Run verifications in order — they may have implicit dependencies
  - After all tasks complete, run the full <verification> checklist

  ## Reporting Results (adapter-conditional)
  When all tasks and verification are complete, report your results:

  **If adapter.structured_messaging is true** (e.g., Claude Code):
  1. Use the adapter's messaging tool to send your structured summary to the coordinator
     (e.g., SendMessage on Claude Code)
  2. Use the adapter's task tracking to mark your task as completed
     (e.g., TaskUpdate on Claude Code)

  **If adapter.structured_messaging is false** (e.g., Codex CLI, Cursor, Aider):
  1. Write your structured summary to: `.planning/phases/{NN}/{NN}-{PP}-RESULT.md`
  2. The coordinator will read this file after your execution completes

  Your summary MUST include these fields:
  - **Status**: Complete | Complete with Warnings | Failed
  - **Files**: list of files created/modified with brief descriptions
  - **Verification**: outputs from <verify> commands
  - **Verification Commands Run**: count of `> verification:` commands executed
  - **Verification Passed**: count that returned exit code 0
  - **Verification Failed**: count that returned non-zero, with command + output for each
  - **Decisions**: key implementation decisions made
  - **Issues**: any problems or warnings encountered (or "None")
  - **Errors**: error details if failed (or "None")
  """

  Step 4: Spawn the agent per adapter protocol
  Use adapter.spawn_agent_autonomous with:
  - prompt: {constructed autonomous prompt}
  - model: adapter.model_execution
  - name: "executor-{NN}-{PP}" -- e.g., "executor-04-01"
  - Additional parameters per adapter (e.g., team_name on Claude Code)
```

### Personality Loading Notes

- If the personality file does not exist at the expected path, fall back to autonomous execution (no personality). Log: "Warning: personality file not found for {agent-id} at {path}. Executing plan {NN}-{PP} without personality injection."
- The personality content may be 200-500 lines. This is expected and intentional — full injection is the core mechanism that gives agents their specialist behavior.
- Cross-reference agent-registry.md (Section 1: Agent Catalog) for the canonical file path when in doubt.

### Future Optimization: Selective Personality Loading

> **Note**: This documents a future optimization path. No behavioral change is implemented — full injection remains the current approach.

For agents over 300 lines, a future version could split personality into two tiers:

- **Core personality** (~100 lines, always injected): Identity & Memory, Core Mission, Critical Rules, Communication Style — the sections that shape the agent's voice, decision-making, and behavioral boundaries.
- **Extended sections** (loaded conditionally): Technical Deliverables (code templates, report templates, framework configs) — loaded only when the task type matches the template domain.

This would reduce context consumption for large agents (currently 600+ lines) during parallel wave execution, where multiple agents each receive full personality injection. The Wave 3 standardization effort (target: 100-350 lines per agent) is the immediate mitigation — trimming verbose code examples in the largest agents while expanding thin stubs.

---

## Section 4: Wave Execution

How to execute each wave in order, dispatching plans in parallel within each wave.

```
Step 0: Initialize phase coordination (once, before the wave loop)
  Follow the active adapter's Execution Protocol for initialization:

  **If adapter.parallel_execution is true AND adapter.structured_messaging is true** (e.g., Claude Code):
  - Use adapter.coordinate_parallel to set up coordination infrastructure
    (e.g., TeamCreate, TaskCreate, TaskUpdate on Claude Code — see adapter for exact calls)

  **If adapter.parallel_execution is true but no structured messaging** (e.g., Cursor):
  - Write a WAVE-CHECKLIST.md tracking file to .planning/phases/{NN}/
  - No coordination infrastructure needed — agents work independently

  **If adapter.parallel_execution is false** (e.g., Codex CLI, Aider):
  - Write a WAVE-CHECKLIST.md tracking file to .planning/phases/{NN}/
  - No agent coordination — plans execute sequentially

For each wave number in ascending order (1, 2, 3, ...):

Step 1: Identify plans in the current wave
  - Filter the wave map for the current wave number
  - Collect: plan file paths, agent IDs, autonomous flags

Step 2: Pre-execution dependency check
  - For each plan in this wave, inspect depends_on list
  - Verify each referenced plan (e.g., "04-01") has a corresponding SUMMARY.md file
    in the phase directory (indicating completion)
  - If any dependency SUMMARY.md is missing or contains Status: Failed:
    - Skip the current wave entirely
    - Report: "Wave {N} skipped: dependency plan {NN}-{PP} did not complete
      successfully. Resolve the failure before retrying."
    - Stop execution

Step 3: Construct agent prompts for all plans in the wave
  - For each plan, run the Personality Injection flow from Section 3
  - Prepare all prompts before spawning any agents

Step 4: Execute plans for this wave (adapter-conditional)

  **If adapter.parallel_execution is true** (e.g., Claude Code, Cursor):
  - For a SINGLE plan in the wave:
    - Spawn one agent per adapter.spawn_agent_personality
  - For MULTIPLE plans in the wave:
    - Issue ALL agent spawn calls simultaneously per adapter.coordinate_parallel
    - This maximizes parallelism — agents run concurrently
    - Do NOT spawn agents one at a time for multi-plan waves
    - Each agent gets its own fully-constructed prompt (personality + plan)
    - Agents in the same wave are fully independent — they share no state

  **If adapter.parallel_execution is false** (e.g., Codex CLI, Gemini CLI, Aider):
  - Execute plans SEQUENTIALLY within the wave:
    For each plan in ascending order:
    1. Load personality and construct prompt (Section 3)
    2. Execute per adapter.spawn_agent_personality (may be inline on non-spawning CLIs)
    3. Collect result per adapter.collect_results
    4. Write SUMMARY.md before moving to the next plan

Step 5: Collect results (adapter-conditional)

  **If adapter.structured_messaging is true** (e.g., Claude Code):
  - Wait for every agent to send its completion message per adapter.collect_results
  - Each message contains a structured summary (Status, Files, Verification, etc.)
  - If an agent goes idle without sending: follow up per adapter protocol

  **If adapter.structured_messaging is false** (e.g., Cursor, Codex CLI):
  - Read result files written by each agent: .planning/phases/{NN}/{NN}-{PP}-RESULT.md
  - Or read the SUMMARY.md files if already written during Step 4 (sequential execution)

  In all cases, track: which plans succeeded, which failed, what files were modified.

Step 6: Process wave results
  - For each completed agent, run the Agent Result Processing flow (Section 5)
    to generate the SUMMARY.md file
  - Compile the wave completion report:
    Completed: [list of plan names that succeeded]
    Failed: [list of plan names that failed, with error summaries]
    Files modified: [aggregate list across all plans in the wave]

Step 7: Post-wave decision
  - If ALL plans in the wave completed successfully:
    - Report wave success
    - Proceed to the next wave
  - If ANY plan in the wave failed:
    - Report wave failure with the full list of failed plans and errors
    - STOP — do not proceed to subsequent waves
    - Instruct the user: "Wave {N} had {count} failure(s). Fix the issue and
      re-run /legion:build, or run /legion:review for diagnosis."

Step 8: After all waves complete
  - Report full execution summary: total plans, total waves, files modified
  - Update .planning/STATE.md: mark phase as complete, record completion timestamp
  - Suggest next action: "/legion:review to validate the phase output"

Step 9: Cleanup coordination (adapter-conditional)
  - Use adapter.shutdown_agents to gracefully terminate any spawned agents
  - Use adapter.cleanup_coordination to clean up coordination infrastructure
  - On CLIs without agent spawning: no cleanup needed (no-op per adapter)
  - This step runs on BOTH success and failure paths — never leave orphaned agents
    or stale coordination state behind
```

### CLI-Specific Execution Details

The exact tools and lifecycle depend on the active adapter. See the adapter's Execution Protocol section for the complete implementation.

**Claude Code example** (parallel execution with Teams):
- TeamCreate → TaskCreate → parallel Agent calls → SendMessage collection → TeamDelete
- See `adapters/claude-code.md` for the full lifecycle

**Codex CLI / Gemini CLI example** (sequential execution):
- WAVE-CHECKLIST.md → sequential plan execution → RESULT.md files
- See `adapters/codex-cli.md` or `adapters/gemini-cli.md`

**Cursor example** (parallel execution via async subagents):
- Spawn subagents asynchronously → poll for RESULT.md files
- See `adapters/cursor.md`

All execution models share these invariants:
- The orchestrator waits until all plans in a wave complete before advancing
- Within a wave, agents share no state — each operates on its own plan
- Results are written to SUMMARY.md files regardless of the collection mechanism

---

## Section 5: Agent Result Processing

How to interpret what each agent returns and write the plan summary file.

```
For each completed agent (success or failure):

Step 1: Parse the agent's completion report
  The agent's report (received per adapter.collect_results) contains a structured summary with these fields:
  - **Status**: Complete | Complete with Warnings | Failed
  - **Files**: list of files created/modified with brief descriptions
  - **Verification**: outputs from <verify> commands
  - **Verification Commands Run**: count of `> verification:` commands executed
  - **Verification Passed**: count that returned exit code 0
  - **Verification Failed**: count that returned non-zero, with command + output for each
  - **Decisions**: key implementation decisions made
  - **Issues**: any problems or warnings encountered
  - **Errors**: error details if failed

  Use the Status field directly to determine the result:
  - "Complete" → SUCCESS
  - "Complete with Warnings" → COMPLETE WITH WARNINGS
  - "Failed" → FAILED
  If the Status field is missing or ambiguous, fall back to parsing for signals:
  - SUCCESS indicators: "verification passed", "complete", all verify commands ran
  - FAILURE indicators: "error:", "failed:", "could not", "exception"

Step 2: Determine result status
  - SUCCESS: agent completed all tasks, ALL verification commands passed (exit code 0)
  - COMPLETE WITH WARNINGS: agent completed tasks but some non-critical verify steps had issues
    (e.g., line count slightly below expected but content is correct)
  - FAILED: agent could not complete one or more tasks, OR any `> verification:` command
    returned non-zero exit code and the agent could not fix it after one attempt

  IMPORTANT: Verification failure is a hard gate. Unlike `<verify>` block outputs which
  are advisory, `> verification:` command failures block plan completion. A plan with
  any failed verification command MUST have Status: Failed or Status: Complete with Warnings
  (never Status: Complete).

Step 3: Generate the plan summary file
  Path: .planning/phases/{NN}-{phase-slug}/{NN}-{PP}-SUMMARY.md

  Write the file using this format:

  ---

  # Plan {NN}-{PP} Summary: {plan_name}

  ## Result
  **Status**: Complete | Complete with Warnings | Failed
  **Wave**: {wave_number}
  **Agent**: {agent-id} | Autonomous
  **Completed**: {timestamp}

  ## What Was Done
  {Summary of actions taken, derived from the agent's return message.
   Should be specific: "Created skills/wave-executor/SKILL.md (312 lines)
   with 6 sections covering plan discovery, personality injection, wave execution,
   result processing, and error handling."}

  ## Files Created / Modified
  - {file path 1} — {brief description of what changed}
  - {file path 2} — {brief description of what changed}

  ## Verification Results
  {Output from the plan's verification steps, as reported by the agent.
   Include actual command outputs where available.}

  ## Verification Commands
  | Command | Exit Code | Result |
  |---------|-----------|--------|
  | `test -f path/to/file.md` | 0 | PASS |
  | `grep -q "Section 1:" path/to/file.md` | 0 | PASS |
  | `wc -l < path/to/file.md \| xargs test 50 -le` | 1 | FAIL — file has 42 lines |

  ## Key Decisions
  {Notable implementation decisions, ambiguities resolved, approaches chosen.
   If none: "No significant decisions — followed plan as written."}

  ## Issues Encountered
  {Any problems, deviations, or warnings. If none: "None."}

  ## Requirements Covered
  {List the requirement IDs from the plan's frontmatter}
  - {REQ-ID}: {brief description}

  ---

  For FAILED plans, also include:

  ## Error Details
  {Full error output from the agent. Do not truncate — this is used for diagnosis
   in /legion:review. Include: error messages, stack traces if available, which
   task failed, what the state of the filesystem is (what was partially completed).}

Step 4: Confirm summary file was written
  - Verify the file exists at the expected path
  - If write failed: report error to orchestrator — the summary file is required
    for the wave completion check in Wave Execution Step 2
```

### Summary File Naming

Summary files follow the Plan File Convention from `workflow-common.md`:

```
.planning/phases/{NN-name}/{NN}-{PP}-SUMMARY.md
```

Examples:
- `.planning/phases/04-parallel-execution/04-01-SUMMARY.md`
- `.planning/phases/04-parallel-execution/04-02-SUMMARY.md`

The presence of a SUMMARY.md file is the signal used in Section 4, Step 2 to verify that a dependency plan completed. A failed plan still gets a SUMMARY.md (with Status: Failed) so that the dependency check correctly identifies and blocks dependent waves.

---

## Section 6: Error Scenarios

How to handle common failure modes without retrying or hiding problems.

```
1. AGENT SPAWN FAILURE
   Symptom: The Agent tool call itself returns an error (model unavailable,
            invalid parameters, context too large, team_name invalid, etc.)
   Action:
   - Mark the plan as failed in the wave results
   - Call TaskUpdate to mark the plan's task as failed (if task was created)
   - Capture the tool error message
   - Write a SUMMARY.md with Status: Failed and the spawn error details
   - Continue executing other plans in the same wave that haven't failed
   - After wave collection, apply post-wave decision logic (Section 4, Step 7)
   Example errors:
   - "Failed to spawn agent for plan 04-01: model sonnet unavailable"
   - "Failed to spawn agent for plan 04-01: team 'phase-04-execution' not found"

2. AGENT TIMEOUT / CONTEXT OVERFLOW
   Symptom: Agent runs but produces incomplete output; context limit reached
   Action:
   - Capture whatever output the agent produced before stopping
   - Treat as a failure — do not try to resume the agent
   - Write SUMMARY.md with Status: Failed and note: "Agent context limit reached.
     The plan may need to be split into smaller tasks."
   - Include partial output in Error Details for diagnosis

3. VERIFICATION FAILURE
   Symptom: Agent completes all tasks but verify commands produce unexpected results
            (file missing, grep finds wrong content, line count too low, etc.)
   Action:
   - Do NOT mark as hard failure — agent completed its work
   - Status: Complete with Warnings
   - Include the failing verify outputs in the Verification Results section
   - Note in Issues Encountered: "Verify step N returned unexpected result: {output}"
   - The plan is not retried; /legion:review will assess whether it's acceptable

4. FILE MODIFICATION CONFLICT (same-wave file collision)
   Symptom: Two plans in the same wave have overlapping files_modified entries
   Detection: During plan discovery (Section 2, Step 5d)
   Action:
   - Do NOT abort — continue execution with a warning
   - Log: "Warning: plans {NN}-{PP} and {NN}-{PP2} both modify {file path}.
     The second agent's changes will overwrite the first. Review the phase plan."
   - In the wave completion report, flag the conflict explicitly
   - Suggest the user re-plan the phase to move one plan to a later wave

5. MISSING PERSONALITY FILE
   Symptom: The agent .md file does not exist at {AGENTS_DIR}/{agent-id}.md
   Action:
   - Fall back to autonomous execution — run the plan without personality injection
   - Log: "Warning: personality file not found for {agent-id} at {expected-path}.
     Executing plan {NN}-{PP} as autonomous (no personality injection)."
   - In the plan SUMMARY.md, note the fallback under Issues Encountered
   - Do NOT fail the plan because of a missing personality file

6. NO PLANS FOUND
   Symptom: The phase directory exists but contains no {NN}-{PP}-PLAN.md files
   Action:
   - Error immediately — do not attempt execution
   - Message: "No plans found for Phase {N} in .planning/phases/{NN}-{slug}/.
     Run /legion:plan {N} first to generate plan files."
   - Suggest: check if the phase directory name matches STATE.md's current phase

7. PARTIAL WAVE FAILURE (some plans succeed, some fail)
   Symptom: A wave with multiple plans has a mix of successes and failures
   Action:
   - Write SUMMARY.md files for ALL plans in the wave (both succeeded and failed)
   - Collect and report all results before making the post-wave stop decision
   - Stop after the wave — do not proceed to the next wave even if most plans succeeded
   - Report clearly: "Wave {N}: {X} of {Y} plans succeeded. Stopping before Wave {N+1}.
     Failed plans: {list}."
   - This prevents later waves from building on a broken foundation

8. PHASE ALREADY PARTIALLY EXECUTED
   Symptom: Some SUMMARY.md files already exist for plans in the phase
   Detection: During plan discovery
   Action:
   - Report the already-completed plans: "Found {count} existing summaries.
     The following plans have already been executed: {list}"
   - Ask user: "Re-run all plans (including completed ones), or skip to
     incomplete plans only?"
   - If skip: filter the wave map to exclude plans with existing SUMMARY.md files
   - If re-run: delete existing SUMMARY.md files and execute all plans fresh

9. AGENT COMPLETES BUT DOESN'T REPORT
   Symptom: An agent goes idle without reporting results per adapter.collect_results.
            The agent may have completed its work but forgot the Reporting Results step.
   Detection: Agent appears idle but no completion report was received per adapter protocol.
   Action:
   - Follow up per adapter protocol: send a message asking for the structured summary
     with Status, Files, Verification, Decisions, Issues, and Errors fields.
   - Wait for the agent's response
   - If the agent still doesn't respond: infer the result from the filesystem
     - Check if the plan's files_modified list has been created/updated
     - Run the plan's <verification> commands manually
     - Write the SUMMARY.md based on filesystem evidence
     - Mark Status as "Complete with Warnings" and note: "Agent did not send
       completion message — result inferred from filesystem."
```

---

## References

This skill implements patterns defined in `workflow-common.md`:

| Pattern | Source Section | Used In |
|---------|---------------|---------|
| Personality Injection Pattern | workflow-common.md — Personality Injection Pattern | Section 3 |
| Wave Execution Pattern | workflow-common.md — Wave Execution Pattern | Section 4 |
| Cost Profile Convention | workflow-common.md — Cost Profile Convention | Section 1 (Sonnet for execution) |
| Error Handling Pattern | workflow-common.md — Error Handling Pattern | Section 6 |
| Plan File Convention | workflow-common.md — Plan File Convention | Section 2, Section 5 |
| State Update Pattern | workflow-common.md — State Update Pattern | Section 4, Step 8 |

Agent file paths are resolved using the `agent-registry.md` Agent Catalog (Section 1), which maps every agent ID to its file path.

### Quick Reference: Agent Path Format

```
{AGENTS_DIR}/{agent-id}.md

Examples:
  {AGENTS_DIR}/engineering-senior-developer.md
  {AGENTS_DIR}/testing-evidence-collector.md
  {AGENTS_DIR}/design-ux-architect.md
  {AGENTS_DIR}/agents-orchestrator.md

AGENTS_DIR is resolved once per command via workflow-common Agent Path Resolution Protocol.
```

If an agent-id is ambiguous, check agent-registry.md Section 1 for the canonical file path.
