---
cli: windsurf
cli_display_name: "Windsurf (Codeium)"
version: "1.0"
support_tier: "experimental"
capabilities:
  parallel_execution: false
  agent_spawning: false
  structured_messaging: false
  native_task_tracking: false
  read_only_agents: true
detection:
  primary: ".windsurf/rules/legion.md exists in CWD"
  secondary: ".windsurf/rules/ directory exists in CWD"
max_prompt_size: 128000
known_quirks:
  - "ide-embedded-agent"
  - "cascade-flow-model"
---

# Windsurf Adapter

Windsurf's Cascade is a single-session agent with Rules, Planning mode, Ask mode, and Todo tracking. Legion uses the native workspace-rules surface only. There are no native Legion `/legion:*` command files in Windsurf, so the installed rule routes plain-language Legion requests to the authoritative workflow files under `.legion/commands/legion/`.

## Tool Mappings

| Generic Concept | Implementation |
|-----------------|---------------|
| `spawn_agent_personality` | Read the matching Legion workflow from `.legion/commands/legion/`, then apply the requested personality inline in the current Cascade session. |
| `spawn_agent_autonomous` | Execute the matching Legion workflow directly in the current session. |
| `spawn_agent_readonly` | Prefer Ask mode for read-only Legion advisory work. |
| `coordinate_parallel` | Not available. All plans execute sequentially. |
| `collect_results` | After each plan, write a structured result to `.planning/phases/{NN}/{NN}-{PP}-RESULT.md`. |
| `shutdown_agents` | No-op. |
| `cleanup_coordination` | No-op. |
| `ask_user` | Print numbered choices in plain text. Turbo Mode may auto-proceed — ensure choices block for user input. |
| `model_planning` | User-configured model (Cascade default) |
| `model_execution` | User-configured model (Cascade default) |
| `model_check` | User-configured model |
| `global_config_dir` | `.windsurf/rules/` (workspace installs only) |
| `plugin_discovery_glob` | `.windsurf/rules/legion.md` |
| `commit_signature` | `Co-Authored-By: Windsurf <noreply@codeium.com>` |

## Interaction Protocol

Print numbered choices in plain text and wait for user response. Parse the integer from the user's message. Re-prompt on invalid input (max 2 retries).

**Turbo Mode warning**: If Windsurf's Turbo Mode is enabled, the AI may attempt to auto-proceed without waiting for input. Ensure that all choice prompts include an explicit "waiting for your response" instruction.

## Execution Protocol

### Phase Initialization

Read the matching Legion workflow from `.legion/commands/legion/` and write a wave checklist to `.planning/phases/{NN}/WAVE-CHECKLIST.md`.

### Wave Execution

All plans execute sequentially in the current session (same single-session model as Amazon Q):
1. For each plan: read plan, adopt personality if assigned, execute tasks, write result
2. Personality injection is weaker without subagent isolation — the session retains memory

### Result Collection

Read result files after each plan. Parse Status field.

### Phase Cleanup

No cleanup needed. Update checklist.

## Rules Integration

Windsurf rules in `.windsurf/rules/` are the native Legion discovery surface. They should point Cascade at the installed `.legion/commands/legion/` workflow files and keep the runtime honest about the lack of native `/legion:*` command registration.

