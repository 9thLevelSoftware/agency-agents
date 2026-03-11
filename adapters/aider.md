---
cli: aider
cli_display_name: "Aider"
version: "1.0"
support_tier: "experimental"
capabilities:
  parallel_execution: false
  agent_spawning: false
  structured_messaging: false
  native_task_tracking: false
  read_only_agents: true
detection:
  primary: ".aider.conf.yml exists in CWD or HOME"
  secondary: "AGENTS.md or CONVENTIONS.md exists in CWD"
max_prompt_size: 128000
known_quirks:
  - "no-agent-spawning"
  - "no-parallel-execution"
  - "single-session-only"
  - "no-mcp-support"
---

# Aider Adapter

Aider is a single-agent pair-programming tool with `/ask`, `/architect`, and convention files. Legion treats Aider as manual-only because there is no official native Legion command, agent, or plugin discovery surface to install into. This adapter documents the fallback behavior, but the automated installer does not register native Legion artifacts for Aider.

## Tool Mappings

| Generic Concept | Implementation |
|-----------------|---------------|
| `spawn_agent_personality` | No subagent spawning. Prepend the personality content to the current session context, then execute the plan tasks inline using `/code` mode. |
| `spawn_agent_autonomous` | Execute the plan tasks directly in `/code` mode. |
| `spawn_agent_readonly` | Switch to `/ask` mode — Aider's ask mode does not modify files. Provide personality + task in the prompt. |
| `coordinate_parallel` | Not available. All plans execute sequentially. |
| `collect_results` | After each plan, write a structured result to `.planning/phases/{NN}/{NN}-{PP}-RESULT.md`. |
| `shutdown_agents` | No-op. |
| `cleanup_coordination` | No-op. |
| `ask_user` | Print numbered choices in plain text and wait for user input. |
| `model_planning` | User-configured architect model (e.g., `claude-opus-4-6`, `o1`) |
| `model_execution` | User-configured editor model (e.g., `claude-sonnet-4-6`, `deepseek-v3`) |
| `model_check` | User-configured lightweight model (e.g., `claude-haiku-4-5`, `o1-mini`) |
| `global_config_dir` | `~/.aider.conf.yml` plus repo-level `AGENTS.md` or `CONVENTIONS.md` |
| `plugin_discovery_glob` | Manual-only — no native Legion discovery surface; use `AGENTS.md`, `CONVENTIONS.md`, and the Legion manual checklist instead |
| `commit_signature` | `Co-Authored-By: Aider <noreply@aider.chat>` |

## Interaction Protocol

Print numbered choices in plain text and wait for user response. Parse the integer from the user's message. Re-prompt on invalid input (max 2 retries).

## Execution Protocol

### Phase Initialization

Manual setup only. If the user chooses to run Legion conventions in Aider, write a wave checklist to `.planning/phases/{NN}/WAVE-CHECKLIST.md` after loading the relevant Legion workflow file by hand.

### Wave Execution

All plans execute sequentially in the current session:
1. For each plan in the wave:
   a. Read the plan file
   b. If assigned agent: read personality file, adopt as behavioral context
   c. Use `/code` mode to execute the plan's implementation tasks
   d. After each task, verify using the plan's verification commands
   e. Write result to `.planning/phases/{NN}/{NN}-{PP}-RESULT.md`
2. Update WAVE-CHECKLIST.md

### Architect Mode Integration

Aider's architect mode (a reasoning model plans, then an editor model implements) aligns naturally with Legion's planning/execution split:
- `/architect` mode can be used for `/legion:plan` phases — the reasoning model generates plans
- `/code` mode handles `/legion:build` execution

### Limitations

- **No file context injection**: Files must be added manually via `/add`
- **No shell execution**: Aider cannot run verification commands directly — the user must run them
- **No native Legion installer surface**: Legion cannot register commands or agents automatically in Aider
- **No MCP support**: Cannot extend with external tool servers
- **Weakest personality isolation**: Single session with no context separation between plans

### Result Collection

Read result files after each plan. Parse Status field.

### Phase Cleanup

No cleanup needed. Update checklist.

