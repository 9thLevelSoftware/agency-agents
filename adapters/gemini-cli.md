---
cli: gemini-cli
cli_display_name: "Google Gemini CLI"
version: "1.0"
support_tier: "beta"
capabilities:
  parallel_execution: false
  agent_spawning: true
  structured_messaging: false
  native_task_tracking: false
  read_only_agents: false
detection:
  primary: "GEMINI_CLI_VERSION environment variable is set"
  secondary: "GEMINI.md file exists in CWD or ~/.gemini/ directory exists"
---

# Google Gemini CLI Adapter

Gemini CLI supports experimental subagents and remote subagents via the Agent-to-Agent (A2A) protocol. Subagents operate sequentially (no true parallelism yet). Extensions provide custom commands, MCP servers, and skill bundles.

## Tool Mappings

| Generic Concept | Implementation |
|-----------------|---------------|
| `spawn_agent_personality` | Spawn a subagent with the personality content as context + task description. Use Gemini CLI's subagent system. |
| `spawn_agent_autonomous` | Spawn a subagent with the task prompt directly. |
| `spawn_agent_readonly` | Spawn a subagent with explicit read-only instructions. Gemini CLI does not enforce read-only at the platform level. |
| `coordinate_parallel` | Not available — subagents are sequential. Execute plans one at a time within each wave. |
| `collect_results` | Each agent writes its result to `.planning/phases/{NN}/{NN}-{PP}-RESULT.md`. |
| `shutdown_agents` | No-op — subagents return naturally. |
| `cleanup_coordination` | No-op. |
| `ask_user` | Print numbered choices in plain text and wait for user input. |
| `model_planning` | `gemini-pro` (or `/model pro`) |
| `model_execution` | `gemini-pro` (default) |
| `model_check` | `gemini-flash` (or `/model flash`) |
| `global_config_dir` | `~/.legion/` |
| `plugin_discovery_glob` | `{HOME}/.legion/agents/agents-orchestrator.md` (expand `{HOME}` via `echo $HOME` — Glob tools do not expand `~`) |
| `commit_signature` | `Co-Authored-By: Gemini <noreply@google.com>` |

## Interaction Protocol

Print numbered choices in plain text and wait for user response. Parse the integer from the user's message. Re-prompt on invalid input (max 2 retries).

## Execution Protocol

### Phase Initialization

Write a wave checklist to `.planning/phases/{NN}/WAVE-CHECKLIST.md`.

### Wave Execution

Plans execute sequentially (no parallelism):
1. For each plan in the wave, read the plan file
2. If assigned agent: load personality via `Read {AGENTS_DIR}/{agent-id}.md`, spawn subagent with personality prefix + plan task
3. If autonomous: spawn subagent with plan task only
4. Wait for subagent completion
5. Write result to `.planning/phases/{NN}/{NN}-{PP}-RESULT.md`
6. Update WAVE-CHECKLIST.md

### Result Collection

Read result files after each plan. Parse Status field. Build wave summary.

### Phase Cleanup

No cleanup needed. Update checklist.

## Extensions Integration

Gemini CLI extensions can bundle Legion as a custom extension with:
- Custom slash commands (`.toml` files)
- GEMINI.md context files
- MCP server connections

