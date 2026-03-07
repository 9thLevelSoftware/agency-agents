---
cli: codex-cli
cli_display_name: "OpenAI Codex CLI"
version: "1.0"
support_tier: "beta"
capabilities:
  parallel_execution: false
  agent_spawning: true
  structured_messaging: false
  native_task_tracking: false
  read_only_agents: false
detection:
  primary: "CODEX_VERSION environment variable is set"
  secondary: "AGENTS.md file exists at ~/.codex/AGENTS.md"
max_prompt_size: 128000
known_quirks:
  - "sandbox-execution-only"
  - "no-interactive-prompts"
---

# OpenAI Codex CLI Adapter

Codex CLI supports agent spawning via `spawn_agents_on_csv` but lacks native inter-agent messaging or team coordination. Personality injection works by prefixing the agent prompt. Execution is sequential within waves.

## Tool Mappings

| Generic Concept | Implementation |
|-----------------|---------------|
| `spawn_agent_personality` | Spawn a subagent with the personality content as the prompt prefix, followed by the task. Use the agent spawning mechanism with the full personality as system instructions. |
| `spawn_agent_autonomous` | Spawn a subagent with the task prompt directly, no personality prefix. |
| `spawn_agent_readonly` | Spawn a subagent with the personality + task and instruct it explicitly: "You are in READ-ONLY mode. Do not create, modify, or delete any files." Codex CLI does not enforce this at the platform level. |
| `coordinate_parallel` | Not available natively. Execute plans sequentially within each wave. |
| `collect_results` | Each agent writes its structured result to `.planning/phases/{NN}/{NN}-{PP}-RESULT.md` using the Write tool. The coordinator reads these files after each plan. |
| `shutdown_agents` | No-op — agents complete and return naturally. No persistent agent sessions to shut down. |
| `cleanup_coordination` | No-op — no team infrastructure to clean up. |
| `ask_user` | Print numbered choices in plain text and wait for user input. |
| `model_planning` | `o3` (or user-configured planning model) |
| `model_execution` | `codex` (GPT-5.3-Codex or configured default) |
| `model_check` | `o3-mini` (or configured lightweight model) |
| `global_config_dir` | `~/.legion/` |
| `plugin_discovery_glob` | `{HOME}/.legion/agents/agents-orchestrator.md` (expand `{HOME}` via `echo $HOME` — Glob tools do not expand `~`) |
| `commit_signature` | `Co-Authored-By: Codex <noreply@openai.com>` |

## Interaction Protocol

No structured question tool is available. All user prompts must be plain numbered lists:

```
Please choose:
1) Execute all plans
2) Execute specific wave only
3) Cancel

Enter a number:
```

Wait for the user's next message. Parse the integer from their response. If the response is not a valid number, re-print the choices (max 2 retries). After 2 retries, use the first option as the default.

For free-text input, ask the question directly and accept the next message as the answer.

## Execution Protocol

### Phase Initialization

Write a wave checklist to `.planning/phases/{NN}/WAVE-CHECKLIST.md`:

```markdown
# Phase {NN} Execution Checklist

| Plan | Wave | Agent | Status | Result File |
|------|------|-------|--------|-------------|
| {NN}-01 | 1 | {agent-id} | Pending | — |
| {NN}-02 | 1 | {agent-id} | Pending | — |
| {NN}-03 | 2 | {agent-id} | Pending | — |
```

No TeamCreate or TaskCreate — file-based tracking replaces native task tools.

### Wave Execution

Plans in a wave execute sequentially (no parallelism):

For each plan in the wave (ascending plan number):
1. Read the plan file: `.planning/phases/{NN}/{NN}-{PP}-PLAN.md`
2. If plan has assigned agent and `autonomous: false`:
   - Read the personality file: `{AGENTS_DIR}/{agent-id}.md`
   - Spawn a subagent with personality prefix + plan task
3. If `autonomous: true`:
   - Spawn a subagent with the plan task only
4. Wait for subagent completion
5. Write structured result to `.planning/phases/{NN}/{NN}-{PP}-RESULT.md`
6. Update WAVE-CHECKLIST.md: change plan status to Complete or Failed

### Result Collection

Read `.planning/phases/{NN}/{NN}-{PP}-RESULT.md` for each plan in the wave. Parse the Status field. Build the wave summary. If any result file is missing, treat as Failed.

### Dependency Check

Before executing a plan with `depends_on`, verify that the referenced `{NN}-{PP}-RESULT.md` file exists and contains `Status: Complete`. If not, skip the plan and report the unmet dependency.

### Phase Cleanup

No cleanup needed — no agents spawned persistently, no teams created. Update WAVE-CHECKLIST.md to mark phase as Finalized.

