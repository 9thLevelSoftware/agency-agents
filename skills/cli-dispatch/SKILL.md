---
name: legion:cli-dispatch
description: Cross-CLI dispatch infrastructure for routing work to external CLIs
triggers: [dispatch, gemini, codex, copilot, external, cli, cross-cli]
token_cost: medium
summary: "Routes tasks to external CLIs (Gemini, Codex, Copilot) via capability matching, with file-based result handoff and control-mode-aware permissions."
---

# CLI Dispatch

Infrastructure layer for `/legion:build` and other skills that need to route tasks to external CLIs (Gemini CLI, Codex CLI, Copilot CLI, etc.). Handles discovery, capability matching, prompt construction, invocation, result collection, and cleanup. Callers treat this as a black box: pass a task, get back a result.

---

## Section 1: CLI Discovery

How to discover which external CLIs are available at dispatch time.

```
Step 1: Enumerate adapter files
  - List all files in the adapters/ directory matching *.md (exclude ADAPTER.md)
  - For each adapter file, attempt to parse its YAML frontmatter

Step 2: Parse Dispatch Configuration block
  - In each adapter file, locate the section: ## Dispatch Configuration
  - Within that section, find a fenced yaml block (```yaml ... ```)
  - Parse the block. If no Dispatch Configuration section exists, skip this adapter.
  - Required fields in the dispatch config:
      available: true | false
      capabilities: [list of capability strings]
      detection_command: string (e.g., "gemini --version")
      invoke_command: string (e.g., "gemini")
      invoke_flags: string (e.g., "--model pro")
      prompt_delivery: file_path | stdin_pipe | content_flag
      prompt_flag: string (e.g., "-f" or "--prompt") — required when prompt_delivery is file_path or content_flag
      result_path: string with {task-id} placeholder (e.g., ".planning/dispatch/{task-id}-RESULT.md")
      timeout_ms: integer (e.g., 120000)

Step 3: Filter to available adapters
  - Discard any adapter where available: false
  - The remaining list is the dispatch candidate set

Step 4: Check installation for each candidate
  - Run the adapter's detection_command using Bash tool
  - If exit code is 0: CLI is installed and available
  - If exit code is non-zero or command not found: CLI is not installed — remove from candidate set
  - Log result: "CLI {cli_display_name}: available" or "CLI {cli_display_name}: not installed (skipped)"

Step 5: Cache detection results
  - Store detection results in a session variable: dispatch_available_clis
  - Do NOT re-run detection_command on subsequent dispatches in the same session
  - The cache is session-scoped — it resets when the CLI session ends
  - If the cache already exists when this skill is invoked, skip Steps 3-4 and use cached results
```

**Capability vocabulary** (controlled list — use only these terms in adapter dispatch configs and task hints):

| Capability | Description |
|------------|-------------|
| `code_implementation` | Writing new code, features, or modules |
| `code_review` | Reviewing existing code for quality, correctness |
| `testing` | Writing or running tests |
| `refactoring` | Restructuring code without changing behavior |
| `bug_fixing` | Diagnosing and resolving defects |
| `ui_design` | UI component design and implementation |
| `ux_research` | User experience analysis and recommendations |
| `web_search` | Searching the web for current information |
| `large_analysis` | Analyzing large codebases or long documents |
| `security_audit` | Security vulnerability analysis |
| `performance_analysis` | Performance profiling and optimization |
| `documentation` | Writing technical docs, READMEs, comments |

---

## Section 2: Capability Matching Algorithm

How to select the best external CLI for a given task.

```
Input:
  task: {
    task_type: string (one or more from capability vocabulary)
    languages: [list]        — optional, from plan or agent frontmatter
    frameworks: [list]       — optional
    division: string         — optional (Engineering, Design, Testing, etc.)
    description: string      — free text task description
  }
  candidate_clis: list of available CLIs from Section 1

Output: best-fit CLI dispatch config, or null (internal fallback)

Matching algorithm (priority order):

Priority 1: Exact capability match
  - For each candidate CLI, check if its capabilities list contains the task's task_type exactly
  - If exactly one CLI matches: select it
  - If multiple CLIs match: rank by number of matching capabilities (most matches wins)
  - If still tied: prefer the first match in adapter file order

Priority 2: Category match
  - Use the division → capability affinity table below to map task division to related capabilities
  - If no exact match was found, check if any CLI's capabilities include an affinity capability for the task's division
  - If a match is found: select it (with a note that this is a category match, not exact)

  Division → Capability Affinity:
  | Division          | Affinity Capabilities                              |
  |-------------------|----------------------------------------------------|
  | Engineering       | code_implementation, refactoring, bug_fixing       |
  | Design            | ui_design, ux_research                             |
  | Testing           | testing, code_review, performance_analysis         |
  | Marketing         | documentation, web_search                          |
  | Product           | documentation, ux_research                         |
  | Project Management| documentation, large_analysis                      |
  | Support           | large_analysis, security_audit, documentation      |
  | Spatial Computing | code_implementation, ui_design                     |
  | Specialized       | large_analysis, code_review                        |

Priority 3: Internal fallback
  - If no candidate CLI matched via Priority 1 or Priority 2, or if the candidate set is empty:
    Return null — the calling skill falls back to internal agent execution
  - Log: "No external CLI matched task type '{task_type}' in division '{division}'. Using internal agent."
```

---

## Section 3: Prompt Construction Template

How to build the prompt that is sent to the external CLI.

```
For each dispatched task, assemble a prompt from these parts:

Part 1: Agent personality
  - Identify the assigned agent from the plan or task
  - Read the ENTIRE agent .md file: agents/{agent-id}.md
  - Capture as PERSONALITY_CONTENT
  - If no agent-id is assigned (autonomous task): PERSONALITY_CONTENT = ""

Part 2: Task description
  - Use the task description from the plan file (objective + tasks sections)
  - Or, for board meeting dispatches: use the board topic and discussion question
  - Capture as TASK_DESCRIPTION

Part 3: Result contract
  - Build instructions telling the CLI to write its output to {result_path}
  - Resolve {task-id} in the adapter's result_path before injecting
  - Specify the required output format (see Result Contract Format below)
  - Capture as RESULT_INSTRUCTION

Part 4: Control mode scope
  - Based on the current control_mode setting, inject file scope constraints
  - See Section 6 for mode-specific scope text
  - Capture as CONTROL_SCOPE

Part 5: Handoff context (optional)
  - If this task depends on prior wave outputs, extract and inject handoff context
  - Follow the same protocol as wave-executor Section 5.6
  - Capture as HANDOFF_CONTEXT (empty string if no prior wave)

Assemble the final prompt using this exact template:

---
{PERSONALITY_CONTENT}

---

# Dispatch Task

You are executing a task as part of Legion, dispatched to an external CLI.

{HANDOFF_CONTEXT}

{CONTROL_SCOPE}

## Task

{TASK_DESCRIPTION}

{RESULT_INSTRUCTION}
---

Result Contract Format (injected as RESULT_INSTRUCTION):

---
## Result Instructions

When you complete this task, write your result to: {resolved_result_path}

Your result file MUST contain these sections:
- **Status**: Complete | Complete with Warnings | Failed
- **Summary**: What you did (2-4 sentences)
- **Outputs**: List of files created or modified (or "None")
- **Findings**: Key findings, decisions, or recommendations
- **Issues**: Any problems encountered (or "None")
- **Errors**: Error details if failed (or "None")

Do not write anything to stdout — write the full result to the file above.
---
```

---

## Section 4: Invocation Protocol

How to invoke the external CLI after building the prompt.

```
Step 1: Write the prompt to disk (audit trail)
  - Resolve the task ID for this dispatch. If not provided, generate one:
    Format: {phase}-{plan}-{timestamp}  e.g., "04-02-1710000000"
  - Write the prompt to: .planning/dispatch/{task-id}-PROMPT.md
  - Create the .planning/dispatch/ directory if it does not exist
  - This file is the permanent audit record. Do not skip this step.

Step 2: Resolve the result path
  - Take the adapter's result_path value
  - Replace {task-id} with the actual task ID
  - Example: ".planning/dispatch/{task-id}-RESULT.md" → ".planning/dispatch/04-02-1710000000-RESULT.md"

Step 3: Build the invocation command
  - Use the adapter's prompt_delivery method to determine the command format:

  prompt_delivery: file_path
    Command: {invoke_command} {invoke_flags} {prompt_flag} {prompt_path}
    Example: gemini --model pro -f .planning/dispatch/04-02-1710000000-PROMPT.md
    The CLI reads the prompt file itself.

  prompt_delivery: stdin_pipe
    Command: cat {prompt_path} | {invoke_command} {invoke_flags}
    Example: cat .planning/dispatch/04-02-1710000000-PROMPT.md | codex --quiet
    The prompt is piped via stdin.

  prompt_delivery: content_flag
    Command: {invoke_command} {invoke_flags} {prompt_flag} "$(cat {prompt_path})"
    Example: copilot run --prompt "$(cat .planning/dispatch/04-02-1710000000-PROMPT.md)"
    The prompt content is expanded into a flag value.

Step 4: Execute the command
  - Run the command via the Bash tool
  - Set timeout to the adapter's timeout_ms value
  - For parallel dispatches (multiple tasks in the same wave):
    Use run_in_background: true on the Bash tool call
    Do NOT use run_in_background for single-task dispatches
  - Capture stdout and stderr for fallback use

Step 5: Wait for completion
  - For background dispatches: wait for all background tasks to complete before proceeding
  - For foreground dispatches: the Bash tool call blocks until the CLI exits
  - After completion, proceed to Section 5 (Result Collection)
```

---

## Section 5: Result Collection

How to collect and validate results after the external CLI exits.

```
Step 1: Check exit code
  - If exit code is non-zero:
    a. Capture stderr output
    b. Check if result file exists despite the non-zero exit (some CLIs exit non-zero on warnings)
    c. If result file exists: treat as a potential partial result — proceed to Step 2 with a warning flag
    d. If result file does not exist: go to Step 4 (stdout fallback)
    e. If stdout fallback also fails: report failure to calling skill (see Section 7)

Step 2: Read the result file
  - Read the file at the resolved result_path (from Section 4, Step 2)
  - If the file does not exist: go to Step 4 (stdout fallback)
  - If the file exists but is empty: treat as failure — log "Empty result file at {path}"

Step 3: Validate result content
  - Check that the result file contains the required sections:
    Status, Summary, Outputs, Findings, Issues, Errors
  - If any required section is missing:
    Log: "Result from {cli_display_name} is missing section: {section_name}"
    Continue with available content (graceful degradation — do not block)
  - Parse the Status field:
    "Complete" → SUCCESS
    "Complete with Warnings" → SUCCESS_WITH_WARNINGS
    "Failed" → FAILURE
    Missing or unrecognized → treat as UNKNOWN, log warning

Step 4: Stdout fallback
  - If the result file does not exist after CLI exits:
    a. Capture the stdout from the Bash tool call
    b. If stdout is non-empty:
       Write stdout content to the result_path file
       Log: "Result file not found — captured stdout and wrote to {result_path}"
       Proceed with this content as the result
    c. If stdout is also empty:
       Report failure: "CLI {cli_display_name} produced no result file and no stdout output."
       Return failure status to calling skill

Step 5: Return result to calling skill
  - Return the result content (from file or stdout fallback)
  - Include metadata: cli_display_name, task_id, result_path, status, exit_code
  - The calling skill (e.g., board-of-directors, wave-executor) handles the result
```

---

## Section 6: Control Mode Behavior

How the current control_mode setting affects dispatch behavior.

| Control Mode | Dispatch Behavior |
|-------------|-------------------|
| `autonomous` | Full dispatch permitted. Prompt includes task scope but no file restrictions. CONTROL_SCOPE is omitted from the prompt. |
| `guarded` (default) | Dispatch permitted. Prompt includes `files_modified` scope as guidance. CONTROL_SCOPE advises the CLI to stay within listed files but does not hard-block. |
| `surgical` | Dispatch restricted to read-only assessments only. Implementation tasks (capabilities: code_implementation, refactoring, bug_fixing) fall back to internal agent. CONTROL_SCOPE instructs the CLI to produce recommendations only. |
| `advisory` | Dispatch permitted but CLIs are instructed to produce recommendations only, not modify any files. CONTROL_SCOPE instructs: "You are in ADVISORY mode. Do not create, modify, or delete any files." |

CONTROL_SCOPE text templates for each mode:

```
guarded:
  ## File Scope Guidance
  This task is scoped to the following files. Stay within this scope when making changes:
  {files_modified list from plan, one per line}
  If you need to modify files outside this list, stop and report it in your result under Issues.

surgical:
  ## Read-Only Constraint
  You are dispatched in SURGICAL mode. This is a read-only assessment task.
  Do NOT create, modify, or delete any files.
  Produce a structured assessment with recommendations. The human will decide whether to act on them.

advisory:
  ## Advisory Mode
  You are in ADVISORY mode. Do NOT create, modify, or delete any files.
  Analyze the task and produce recommendations. Present suggested changes with rationale.
  The human will decide whether and how to apply them.

autonomous: (no CONTROL_SCOPE injected)
```

---

## Section 7: Error Recovery

How to handle failures at each stage of dispatch.

| Failure | Recovery |
|---------|----------|
| CLI not installed | Detected via `detection_command` in Section 1 (Step 4). Remove from candidate set. If no candidates remain after removal, fall back to internal agent with a warning: "No external CLIs available. Executing with internal agent." |
| Timeout | Kill the process after `timeout_ms` elapses. Check if a partial result file was written before timeout. If partial result exists: report partial results to calling skill with status "Complete with Warnings". If no result: report failure. |
| Non-zero exit code | Capture stderr. If result file exists despite non-zero exit, use it (some CLIs signal warnings this way). If no result file, attempt stdout fallback (Section 5, Step 4). If stdout is also empty, report failure with full stderr. |
| No result file | Attempt stdout fallback (Section 5, Step 4). If stdout is also empty, report failure. |
| Max retries exceeded | Allow 1 retry per dispatch by default. Configurable via `dispatch.max_retries` in settings.json (default: 1). On the retry, re-run Section 4 from Step 3. After max retries are exhausted, escalate to the user: present the failure details and ask whether to (a) skip this task, (b) try a different CLI, or (c) fall back to internal agent. |
| Prompt too large | Before invocation (Section 4, Step 3), estimate prompt size: characters / 4 ≈ tokens. If estimated tokens exceed the adapter's `max_prompt_size`: do NOT invoke. Report: "Prompt for task {task-id} (~{estimated} tokens) exceeds {cli_display_name}'s {max_prompt_size}-token limit." Fall back to internal agent. |
| Result file malformed | If result file exists but cannot be parsed (missing all required sections): treat as partial failure. Return available content with a warning. Log: "Result from {cli_display_name} for task {task-id} is malformed — missing required sections." |

**Retry protocol:**
```
Attempt 1:
  Run Section 4 (invocation) and Section 5 (result collection).
  If SUCCESS or SUCCESS_WITH_WARNINGS: done.
  If FAILURE: proceed to retry.

Retry (attempt 2):
  Log: "Retrying dispatch for task {task-id} via {cli_display_name}."
  Re-run Section 4 from Step 3 (reuse existing PROMPT.md — do not rewrite it).
  If SUCCESS: done.
  If FAILURE again: max retries exceeded. Escalate to user.

Escalation to user (after max retries):
  "Dispatch to {cli_display_name} failed for task {task-id} after {max_retries+1} attempts.
   Failure: {last_error}
   Options:
   1) Skip this task and continue
   2) Try a different CLI: {list of other available CLIs}
   3) Fall back to internal agent (no external CLI)
   Enter a number:"
  Wait for user choice. Act on it.
```

---

## Section 8: Cleanup

How to archive dispatch artifacts after successful result collection.

```
Step 1: Move PROMPT file to archive
  - Source: .planning/dispatch/{task-id}-PROMPT.md
  - Target: .planning/dispatch/archive/{timestamp}-{task-id}-PROMPT.md
  - Timestamp format: YYYYMMDD-HHMMSS (e.g., 20260319-143022)
  - Create the archive/ directory if it does not exist
  - Move the file (write to target, delete source)

Step 2: Move RESULT file to archive
  - Source: .planning/dispatch/{task-id}-RESULT.md
  - Target: .planning/dispatch/archive/{timestamp}-{task-id}-RESULT.md
  - Use the same timestamp as Step 1 (same batch)
  - Move the file (write to target, delete source)

Step 3: Skip cleanup on failure
  - If result collection did not succeed (FAILURE status):
    Do NOT archive. Leave PROMPT and RESULT files in .planning/dispatch/ for diagnosis.
    Log: "Dispatch artifacts retained for debugging: .planning/dispatch/{task-id}-*"

Step 4: Board artifacts are permanent
  - Files under .planning/board/ are written by board-of-directors skill and other callers
  - cli-dispatch MUST NOT touch or clean up .planning/board/ files
  - Board artifacts are permanent audit records — they accumulate and are never auto-deleted

Archive management notes:
  - .planning/dispatch/archive/ can be added to .gitignore if desired
  - The archive directory can be manually cleared without affecting Legion functionality
  - Archive files are not read by any Legion skill — they exist for human review only
```

---

## References

This skill is consumed by:

| Caller | Purpose |
|--------|---------|
| `skills/wave-executor/SKILL.md` | Dispatches Wave 2+ tasks to external CLIs when capability matching selects one |
| `skills/board-of-directors/SKILL.md` | Dispatches assessment tasks to external CLIs for multi-perspective review |
| `skills/review-evaluators/SKILL.md` | Dispatches review tasks to external CLIs for quality evaluation |

Related configuration:

| File | Purpose |
|------|---------|
| `adapters/*.md` | Per-CLI adapter files containing dispatch configuration blocks |
| `.planning/config/control-modes.yaml` | Control mode profiles (authority, scope, read-only flags) |
| `settings.json` | Active control_mode and dispatch.max_retries settings |
| `.planning/dispatch/` | Working directory for PROMPT and RESULT files |
| `.planning/dispatch/archive/` | Archived dispatch artifacts with timestamp prefix |
