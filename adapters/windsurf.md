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
  read_only_agents: false
detection:
  primary: "WINDSURF_VERSION environment variable is set"
  secondary: ".windsurf/rules/ directory exists in CWD"
max_prompt_size: 128000
known_quirks:
  - "ide-embedded-agent"
  - "cascade-flow-model"
---

# Windsurf Adapter

Windsurf's Cascade is a single-agent system with deep context awareness. No subagent spawning — all plans execute within the current session. Extension via Rules files and MCP servers.

## Tool Mappings

| Generic Concept | Implementation |
|-----------------|---------------|
| `spawn_agent_personality` | No subagent spawning. Prepend the personality content to the current session context as a behavioral directive, then execute the plan tasks inline. |
| `spawn_agent_autonomous` | Execute the plan tasks directly in the current session. |
| `spawn_agent_readonly` | Instruct the session explicitly: "READ-ONLY MODE: Do not create, modify, or delete any files." No platform enforcement. |
| `coordinate_parallel` | Not available. All plans execute sequentially. |
| `collect_results` | After each plan, write a structured result to `.planning/phases/{NN}/{NN}-{PP}-RESULT.md`. |
| `shutdown_agents` | No-op. |
| `cleanup_coordination` | No-op. |
| `ask_user` | Print numbered choices in plain text. Turbo Mode may auto-proceed — ensure choices block for user input. |
| `model_planning` | User-configured model (Cascade default) |
| `model_execution` | User-configured model (Cascade default) |
| `model_check` | User-configured model |
| `global_config_dir` | `~/.legion/` |
| `plugin_discovery_glob` | `{HOME}/.legion/agents/agents-orchestrator.md` (expand `{HOME}` via `echo $HOME` — Glob tools do not expand `~`) |
| `commit_signature` | `Co-Authored-By: Windsurf <noreply@codeium.com>` |

## Interaction Protocol

Print numbered choices in plain text and wait for user response. Parse the integer from the user's message. Re-prompt on invalid input (max 2 retries).

**Turbo Mode warning**: If Windsurf's Turbo Mode is enabled, the AI may attempt to auto-proceed without waiting for input. Ensure that all choice prompts include an explicit "waiting for your response" instruction.

## Execution Protocol

### Phase Initialization

Write a wave checklist to `.planning/phases/{NN}/WAVE-CHECKLIST.md`.

### Wave Execution

All plans execute sequentially in the current session (same single-session model as Amazon Q):
1. For each plan: read plan, adopt personality if assigned, execute tasks, write result
2. Personality injection is weaker without subagent isolation — the session retains memory

### Result Collection

Read result files after each plan. Parse Status field.

### Phase Cleanup

No cleanup needed. Update checklist.

## Rules Integration

Windsurf Rules files in `.windsurf/rules/` can be configured to load Legion conventions automatically. Consider creating a `legion.rule` that references key workflow-common patterns.

