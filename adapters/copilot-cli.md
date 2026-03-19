---
cli: copilot-cli
cli_display_name: "GitHub Copilot CLI"
version: "1.0"
support_tier: "beta"
capabilities:
  parallel_execution: false
  agent_spawning: true
  structured_messaging: false
  native_task_tracking: false
  read_only_agents: true
detection:
  primary: ".github/skills/legion-start/SKILL.md exists or ~/.copilot/skills/legion-start/SKILL.md exists"
  secondary: ".github/agents/legion-orchestrator.agent.md exists or ~/.config/copilot/agents/legion-orchestrator.agent.md exists"
max_prompt_size: 128000
known_quirks:
  - "prompt-prefix-only"
  - "model-dependent-context-window"
---

# GitHub Copilot CLI Adapter

GitHub Copilot CLI supports repository and user custom skills plus custom agent profiles. Legion installs native skill entry points such as `/legion-start` and a `legion-orchestrator` agent profile. Copilot can delegate work to subsidiary agents, but Legion still coordinates through filesystem artifacts rather than runtime mailboxes.

## Tool Mappings

| Generic Concept | Implementation |
|-----------------|---------------|
| `spawn_agent_personality` | Spawn the installed `legion-orchestrator` agent or a built-in Copilot agent, then load the matching Legion workflow from `.legion/commands/legion/`. |
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
| `global_config_dir` | `~/.config/copilot/agents/` plus `~/.copilot/skills/` |
| `plugin_discovery_glob` | `.github/skills/legion-start/SKILL.md` and `.github/agents/legion-orchestrator.agent.md`, or the matching paths under `~/.copilot/skills/` and `~/.config/copilot/agents/` |
| `commit_signature` | `Co-Authored-By: GitHub Copilot <noreply@github.com>` |

## Interaction Protocol

Print numbered choices in plain text and wait for user response. Parse the integer from the user's message. Re-prompt on invalid input (max 2 retries).

## Execution Protocol

### Phase Initialization

Read the matching Legion workflow file from `.legion/commands/legion/` and write a wave checklist to `.planning/phases/{NN}/WAVE-CHECKLIST.md`.

### Wave Execution

Plans execute sequentially within each wave:
1. Read the matching Legion workflow file from `.legion/commands/legion/`
2. Load the installed skill or `legion-orchestrator` agent when available
3. Execute plan tasks within the current session or via Copilot delegation
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

## Dispatch Configuration

When Claude Code is the orchestrator, Copilot CLI can be dispatched to for code review and implementation tasks. Copilot uses Claude Sonnet via GitHub's infrastructure.

```yaml
available: true
capabilities: [code_implementation, code_review, bug_fixing, testing]
invoke_command: "copilot"
invoke_flags: ["--allow-all-paths", "--allow-all-tools"]
prompt_delivery: content_flag
prompt_flag: "-p"
result_mode: file
result_path: ".planning/dispatch/{task-id}-RESULT.md"
result_instruction: "Write your complete output to {result_path} using the format specified below."
max_concurrent: 1
timeout_ms: 300000
detection_command: "copilot --version"
prerequisites: []
```

