---
name: legion:build
description: Execute current phase plans with parallel agent teams
argument-hint: [--phase N] [--dry-run]
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, Agent, TeamCreate, TeamDelete, TaskCreate, TaskUpdate, TaskList, SendMessage, AskUserQuestion]
---

<objective>
Execute all plans for the current (or specified) phase. Spawn agents with full personality injection, execute waves in parallel, track progress, and commit completed work.
</objective>

<execution_context>
skills/workflow-common-core/SKILL.md
skills/agent-registry/SKILL.md
skills/agent-registry/CATALOG.md
skills/wave-executor/SKILL.md
skills/execution-tracker/SKILL.md
skills/intent-router/SKILL.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
</context>

## Two-Wave Execution Mode

The build command automatically activates two-wave mode when:
1. Phase has >= 4 plans
2. Plans span multiple service groups OR include explicit analysis tasks
3. `two_wave: true` in phase CONTEXT.md (optional override)

### Wave Detection Algorithm

```
Step 1: Analyze plan structure
  - Group plans by files_modified directory patterns:
    - src/frontend/** → "frontend" service group
    - src/backend/** → "backend" service group
    - src/shared/** → "shared" (cross-cutting)

Step 2: Detect analysis plans
  - Plans with `wave_role: analysis` in frontmatter
  - Plans assigned to architecture or security agents
  - Plans with "review", "audit", "analyze" in objective

Step 3: Decide execution mode
  - IF (service_groups >= 2 OR analysis_plans >= 1) AND total_plans >= 4:
    → Activate two-wave mode
  - ELSE:
    → Standard single-wave mode
```

### Two-Wave Execution Flow

**Wave A: Build + Analysis**
```
1. Identify service groups from plan files_modified
2. For each service group:
   a. Spawn build agents (autonomous: false) in parallel
   b. Wait for all build agents to complete
   c. Collect outputs: files created, SUMMARY.md files
3. Spawn analysis agents (architecture, security) in parallel
   - Analysis agents get read-only access to Wave A build outputs
4. Collect analysis findings
5. Gate: Architecture Review
   - Show analysis findings to user
   - Ask: "Proceed to Wave B, or revise Wave A outputs?"
6. If proceed: Generate Wave A manifest
   If revise: Pause, user fixes, re-run Wave A
```

**Wave B: Execution + Remediation**
```
1. Load Wave A manifest (files produced, service groups built)
2. Spawn Wave B agents in parallel:
   - Execution agents: tests, benchmarks, validation
   - Remediation agents: SRE chaos, data scientist (optional)
3. All Wave B agents run simultaneously
4. Collect findings from both streams
5. Synthesize consolidated validation report
6. Gate: Production Readiness
   - Verdict: PASS, NEEDS_WORK, or FAIL
   - FAIL blocks phase completion
   - NEEDS_WORK offers fix cycle
```

### Single-Wave Fallback

When two-wave mode is NOT activated:
- Execute all plans in standard wave order (1, 2, 3...)
- No Wave A/Wave B distinction
- Standard review panel after all waves complete

### Command Options

`/legion:build` — Execute current phase plans
`/legion:build {phase}` — Execute specific phase
`/legion:build --two-wave` — Force two-wave mode (even if auto-detection says single-wave)
`/legion:build --single-wave` — Force single-wave mode (disable auto-detection)
`/legion:build --skip-gates` — Skip architecture/production readiness gates (for CI)

Options can combine:
`/legion:build 37 --two-wave --skip-gates`

## Intent-Driven Execution

Semantic flags for targeted operations:

| Flag | Description | Mode |
|------|-------------|------|
| `--just-harden` | Security audit (Testing + Security divisions) | ad_hoc |
| `--just-document` | Documentation only, no implementation | filter_plans |
| `--skip-frontend` | Exclude UI/frontend tasks | filter_plans |
| `--skip-backend` | Exclude API/backend tasks | filter_plans |

Examples:
- `/legion:build --just-harden` — Run security audit across codebase
- `/legion:build --just-document` — Generate docs for current phase
- `/legion:build --skip-frontend` — Backend-only implementation
- `/legion:build --skip-frontend --skip-backend` — Invalid (error)

<process>
DRY-RUN MODE (deterministic, no side effects)
   - If `$ARGUMENTS` contains `--dry-run`, DO NOT write files, spawn agents, open Teams, create Tasks, send messages, commit, or call external side-effecting integrations.
   - Validate prerequisites only (target phase, plan discovery, dependency graph, required files).
   - Output a deterministic dry-run report artifact to stdout with sections:
     - Command: `build`
     - Target phase
     - Prerequisite checks: PASS/FAIL with reasons
     - Wave execution preview (plans per wave)
     - Skills that would load (always + conditional)
   - Stop after reporting.

0. CONDITIONAL SKILL LOADING (context budget)
   Load optional high-cost skills only when needed:

   - `skills/workflow-common-memory/SKILL.md` only if `.planning/memory/` exists OR this run creates memory outcomes.

   - `skills/workflow-common-github/SKILL.md` only if `gh auth status` succeeds and a git remote exists.
   - `skills/codebase-mapper/SKILL.md` only if `.planning/CODEBASE.md` exists.
   If a condition is not met, skip that skill silently and continue.

## Step 0.5: INTENT DETECTION AND VALIDATION

If $ARGUMENTS contains intent flags (--just-* or --skip-*):

1. **Parse Intent Flags**
   - Load skill: intent-router
   - Call: parseIntentFlags($ARGUMENTS)
   - Returns: array of intent objects [{name, value}]

2. **Validate Combinations**
   - Call: validateFlagCombination(intents, "build")
   - If invalid: Display errors and suggestions, EXIT
   - If valid: Log detected intents for user confirmation

3. **Determine Execution Mode**
   - For each intent, lookup mode in intent-teams.yaml:
     - "ad_hoc" → Skip plan discovery, spawn intent team directly (see Step 4-ADHOC)
     - "filter_plans" → Filter existing plans, then execute (see Step 3.5)
   - Multiple intents: combine filter predicates with AND logic

4. **User Confirmation (yolo mode skip)**
   - Display: "Detected intents: harden, skip-frontend"
   - Display: "Execution mode: ad_hoc" or "Execution mode: filter_plans"
   - Prompt: "Proceed? [Y/n]"

## Step 0.7: NATURAL LANGUAGE INTENT DETECTION

If $ARGUMENTS contains text that does NOT match any `--just-*` or `--skip-*` flags (i.e., no structured intent flags were parsed in Step 0.5), treat the arguments as natural language input and attempt NL routing via intent-router Section 7.

a. **Check for NL input**: If `parseIntentFlags($ARGUMENTS)` returned no flags (rawFlags is empty) AND $ARGUMENTS is not empty AND $ARGUMENTS does not start with `--`:
   - Concatenate arguments into a single string: `nlInput = $ARGUMENTS.join(' ')`
   - Call: `parseNaturalLanguage(nlInput)` from intent-router Section 7

b. **Route based on confidence**:
   - **HIGH (>= 0.8)**: Proceed as if the equivalent flags were passed.
     - If result routes to `/legion:build` with flags: inject those flags and continue to Step 0.5 logic
     - If result routes to a different command (e.g., `/legion:review`): display cross-command suggestion:
       `"Your input '{nlInput}' matches {result.command}. Did you mean to run {result.command} instead?"`
       Use adapter.ask_user with options:
       - "Yes, run {result.command} instead"
       - "No, proceed with standard build"
       - "Cancel"
       If "Yes": EXIT and advise user to run {result.command}
       If "No": proceed with standard build (no intent flags)
       If "Cancel": EXIT without executing build.
   - **MEDIUM (0.5-0.79)**: Confirm with user via adapter.ask_user:
     `"Did you mean: {result.fallbackSuggestion}?"` with options: ["Yes, proceed", "No, standard build", "Cancel"]
     - If confirmed: inject parsed flags and continue
     - If declined: proceed with standard build (no intent flags)
   - **LOW (< 0.5)**: Display suggestions and ask user:
     `"{result.fallbackSuggestion}"` with options to pick a suggestion or proceed with standard build

c. **No match**: If NL parsing returns confidence 0 or no candidates, proceed with standard build (no intent flags).

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
   - Use adapter.ask_user: "Ready to execute Phase {N}: {phase_name}?"
     Options:
     - "Execute all plans" — proceed with full wave execution
     - "Execute specific wave only" — ask which wave number, execute only that wave
     - "Cancel" — abort immediately with no changes made

4. EXECUTE WAVES

   **BROWNFIELD CONTEXT** (optional — follows codebase-mapper Section 6.3):
   If `.planning/CODEBASE.md` exists, wave-executor Section 3, Step 3.5 will automatically
   load brownfield context (conventions, agent guidance, risk areas) and inject it into each
   agent's execution prompt as a `## Codebase Context` block. No action needed here — this
   is handled transparently during prompt construction in the wave executor.
   If CODEBASE.md is absent: no injection occurs, agents receive standard prompts.

   **RESOLVE AGENT PATH** (once, before wave loop):
   Follow workflow-common Agent Path Resolution Protocol to resolve AGENTS_DIR.
   Store the resolved value for all personality loading in this step.

   Follow wave-executor skill Section 4 (Wave Execution):

   **Coordination Setup** (once, before wave loop — wave-executor Section 4, Step 0):
   Follow the active adapter's Execution Protocol to initialize phase coordination.
   (e.g., TeamCreate + TaskCreate on Claude Code; WAVE-CHECKLIST.md on other CLIs)

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
      using the EXACT format from wave-executor Section 3, Step 4.
      Do NOT use simplified templates. The canonical template includes:
      - ## Important (with CRITICAL `> verification:` extraction instructions)
      - ## Execution Resilience (error classification + auto-remediation)
      - ## Reporting Results (adapter-conditional)

      For personality-injected plans (autonomous: false):
        1. Identify the assigned agent from "Agent: {agent-id}" in the plan
        2. Cross-reference agent-registry.md to get the agent ID, then resolve the file path:
           {AGENTS_DIR}/{agent-id}.md   (AGENTS_DIR resolved above)
        3. Read the ENTIRE personality .md file (no truncation, no excerpts)
        4. Read the ENTIRE plan .md file
        5. Construct the prompt per wave-executor Section 3, Step 4 format
        6. Agent name: "{agent-id}-{NN}-{PP}" (e.g., "engineering-senior-developer-04-01")
        - If personality file is missing at {AGENTS_DIR}/{agent-id}.md: fall back to autonomous mode, log the warning including the attempted path

      For autonomous plans (autonomous: true):
        1. Read the ENTIRE plan .md file
        2. Construct the autonomous prompt per wave-executor Section 3 (autonomous plan format)
        3. Agent name: "executor-{NN}-{PP}" (e.g., "executor-04-01")

   d. Execute plans for this wave (wave-executor Section 4, Step 4):
      Follow the adapter-conditional execution from wave-executor:
      - If adapter.parallel_execution: spawn all agents simultaneously
      - If not: execute plans sequentially
      - Each agent uses adapter.model_execution

   e. Collect results (wave-executor Section 4, Step 5):
      Per adapter.collect_results — wait for all plans in the wave to complete.
      Each result contains: Status, Files, Verification, Decisions, Issues, Errors.

   f. Process results for each completed agent (wave-executor Section 5):
      - Parse the agent's completion report for the structured Status field
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

        {adapter.commit_signature}
      - If the plan failed: do NOT commit — leave changes unstaged for diagnosis

   g2. Record outcome in memory (optional — follows memory-manager Section 6)
       If .planning/memory/OUTCOMES.md exists or .planning/memory/ directory can be created:
         Follow memory-manager Section 3 (Store Outcome):
         - Agent: the agent that executed this plan (from plan's agent assignment, or "autonomous" if autonomous: true)
         - Task Type: primary task type from the plan (match plan's tasks against agent-registry task type tags)
         - Outcome: "success" if plan passed all verification, "failed" if plan failed, "partial" if completed with warnings
         - Importance: per memory-manager Section 2 importance scoring (base 2 for success, 5 for failure, 3 for partial)
         - Tags: phase slug (e.g., "cross-session-learning"), agent division (e.g., "engineering"), key file types modified
         - Summary: one-line from the agent's completion report (the Status field)
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

## Step 4-ADHOC: SPAWN INTENT-SPECIFIC TEAM

For intents with mode: "ad_hoc" (e.g., --just-harden):

1. **Load Intent Template**
   - Load: .planning/config/intent-teams.yaml
   - Get: harden template (agents, domains, mode)

2. **Resolve Team**
   - Primary agents: testing-reality-checker, engineering-security-engineer
   - Secondary agents: testing-api-tester, testing-evidence-collector
   - Read personalities: agents/{agent}.md

3. **Spawn Agents**
   For each agent in team:
   ```
   TASK PROMPT:
   {PERSONALITY_CONTENT}

   ---

   # Security Audit Task — /legion:build --just-harden

   You are part of a hardening team conducting a security audit.

   ## Your Role
   {agent-specific role from intent template}

   ## Audit Scope
   Review entire codebase for:
   - OWASP Top 10 vulnerabilities
   - STRIDE threat model issues
   - Input validation gaps
   - Authentication/authorization weaknesses
   - Dependency vulnerabilities

   ## Deliverable
   Provide findings in standard format:
   - File: {path}
   - Severity: BLOCKER | WARNING | SUGGESTION
   - Issue: {description}
   - Fix: {suggested remediation}

   ## Authority Boundaries
   @.planning/config/authority-matrix.yaml (security domains)
   ```

4. **Collect Results**
   - Use adapter.collect_results (see Step 5)
   - Aggregate findings from all agents

5. **Generate Report**
   - Write: .planning/security-audit-{timestamp}.md
   - Include: Summary statistics, findings by severity, remediation guide
   - Format: Standard Legion finding blocks

6. **EXIT** (ad_hoc doesn't proceed to normal build)
   - Display: "Security audit complete. Report: .planning/security-audit-{timestamp}.md"

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

      {adapter.commit_signature}

   d2. Cleanup coordination (wave-executor Section 4, Step 9):
       - Use adapter.shutdown_agents + adapter.cleanup_coordination
       - This runs on BOTH success and failure paths — never leave orphaned agents or stale state

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
       a. Use adapter.ask_user: "Phase {N} complete. Create a GitHub PR?"
          Options:
          - "Create PR" — proceed with PR creation
          - "Skip PR" — skip, proceed to step 6
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
