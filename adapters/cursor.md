---
cli: cursor
cli_display_name: "Cursor"
version: "1.0"
support_tier: "experimental"
capabilities:
  parallel_execution: true
  agent_spawning: true
  structured_messaging: false
  native_task_tracking: false
  read_only_agents: true
detection:
  primary: ".cursor/rules/legion.mdc exists in CWD"
  secondary: ".cursor/rules/ exists in CWD or Background Agent is enabled"
max_prompt_size: 128000
known_quirks:
  - "ide-embedded-agent"
  - "tab-completion-conflicts"
---

# Cursor Adapter

Cursor supports project rules, Background Agents, and Review mode. Legion uses Cursor's native project-rules surface only. There are no native Legion `/legion:*` command files in Cursor, so the installed rule teaches Cursor how to route plain-language Legion requests to the authoritative workflow files under `.legion/commands/legion/`.

## Tool Mappings

| Generic Concept | Implementation |
|-----------------|---------------|
| `spawn_agent_personality` | Read the matching Legion workflow from `.legion/commands/legion/`, then use Cursor's Background Agent or chat agent with the requested personality context. |
| `spawn_agent_autonomous` | Execute the matching Legion workflow directly from the current session or a Background Agent. |
| `spawn_agent_readonly` | Prefer Cursor Review mode or explicit read-only prompts; do not assume file writes are disabled unless Review mode is active. |
| `coordinate_parallel` | Spawn multiple subagents asynchronously — Cursor supports parallel subagent execution. Each writes results to a file. |
| `collect_results` | Each agent writes its structured result to `.planning/phases/{NN}/{NN}-{PP}-RESULT.md`. The coordinator polls for these files. |
| `shutdown_agents` | No-op — subagents complete and return naturally. |
| `cleanup_coordination` | No-op — no team infrastructure. |
| `ask_user` | Print numbered choices in plain text. Cursor's Plan mode (Shift+Tab) provides structured interaction, but within agent context use plain text choices. |
| `model_planning` | `claude-opus-4-6` or `gpt-5.3-codex` (user-configured) |
| `model_execution` | `claude-sonnet-4-6` (Cursor default) |
| `model_check` | `claude-haiku-4-5` |
| `global_config_dir` | `.cursor/rules/` (workspace installs only) |
| `plugin_discovery_glob` | `.cursor/rules/legion.mdc` |
| `commit_signature` | `Co-Authored-By: Cursor Agent <noreply@cursor.com>` |

## Interaction Protocol

Print numbered choices in plain text and wait for user response:

```
Please choose:
1) Option A — description
2) Option B — description

Enter a number:
```

Parse the integer from the user's response. Re-prompt on invalid input (max 2 retries).

## Execution Protocol

### Phase Initialization

Read the matching Legion workflow from `.legion/commands/legion/` and write a wave checklist to `.planning/phases/{NN}/WAVE-CHECKLIST.md`.

### Wave Execution

Cursor supports parallel subagent spawning. For waves with multiple plans:
1. Spawn all subagents for the wave asynchronously
2. Each subagent writes its result to `.planning/phases/{NN}/{NN}-{PP}-RESULT.md`
3. Poll for result files until all plans in the wave have written results
4. Parse results and build wave summary

For single-plan waves, spawn one subagent and wait for completion.

### Result Collection

Read `.planning/phases/{NN}/{NN}-{PP}-RESULT.md` for each plan. Parse Status field.

### Phase Cleanup

No cleanup needed. Update WAVE-CHECKLIST.md to mark phase as Finalized.

