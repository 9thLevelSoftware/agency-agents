---
cli: copilot-cli
cli_display_name: "GitHub Copilot CLI"
version: "1.0"
support_tier: "experimental"
capabilities:
  parallel_execution: false
  agent_spawning: true
  structured_messaging: false
  native_task_tracking: false
  read_only_agents: false
detection:
  primary: "COPILOT_CLI_VERSION environment variable is set"
  secondary: ".github/copilot/ directory exists or gh copilot command is available"
max_prompt_size: 64000
known_quirks:
  - "no-agent-spawning"
  - "prompt-prefix-only"
  - "short-context-window"
---

# GitHub Copilot CLI Adapter

Copilot CLI has built-in reference agents (Explore, Task, Plan, Code Review) and supports custom agents via `.agent.md` files. Background delegation (prefix with `&`) sends work to the cloud. No inter-agent messaging — agents operate independently.

## Tool Mappings

| Generic Concept | Implementation |
|-----------------|---------------|
| `spawn_agent_personality` | Spawn a custom agent with the personality as system instructions + task. Use Copilot's agent system with `.agent.md` configuration. |
| `spawn_agent_autonomous` | Spawn a task agent with the plan content directly. |
| `spawn_agent_readonly` | Use the built-in Explore agent (read-only codebase analysis) with personality prefix. |
| `coordinate_parallel` | Not available natively. Execute plans sequentially. Background delegation (`&`) can run plans in the cloud but without coordination. |
| `collect_results` | Each agent writes its structured result to `.planning/phases/{NN}/{NN}-{PP}-RESULT.md`. |
| `shutdown_agents` | No-op — agents complete naturally. |
| `cleanup_coordination` | No-op — no team infrastructure. |
| `ask_user` | Print numbered choices in plain text. Copilot's Plan mode (Shift+Tab) provides structured interaction but within agent context use plain text. |
| `model_planning` | `claude-opus-4-6` or `gpt-5.3-codex` (user-configured) |
| `model_execution` | `claude-sonnet-4-6` or `gpt-5.3-codex` (user-configured) |
| `model_check` | `claude-haiku-4-5` |
| `global_config_dir` | `~/.legion/` |
| `plugin_discovery_glob` | `{HOME}/.legion/agents/agents-orchestrator.md` (expand `{HOME}` via `echo $HOME` — Glob tools do not expand `~`) |
| `commit_signature` | `Co-Authored-By: GitHub Copilot <noreply@github.com>` |

## Interaction Protocol

Print numbered choices in plain text and wait for user response. Parse the integer from the user's message. Re-prompt on invalid input (max 2 retries).

## Execution Protocol

### Phase Initialization

Write a wave checklist to `.planning/phases/{NN}/WAVE-CHECKLIST.md`.

### Wave Execution

Plans execute sequentially within each wave:
1. Read the plan file
2. Load personality if assigned (read agent .md file, prefix to prompt)
3. Execute plan tasks within the current session or via a spawned agent
4. Write result to `.planning/phases/{NN}/{NN}-{PP}-RESULT.md`
5. Update WAVE-CHECKLIST.md

### Result Collection

Read result files after each plan completes. Parse Status field.

### Phase Cleanup

No cleanup needed. Update checklist.

## GitHub Integration

Copilot CLI has tight GitHub integration. When a GitHub remote exists:
- Issue creation: `gh issue create`
- PR creation: `gh pr create`
- The built-in GitHub MCP server provides direct access to repos, issues, and PRs

