---
cli: cursor
cli_display_name: "Cursor"
version: "1.0"
support_tier: "beta"
capabilities:
  parallel_execution: true
  agent_spawning: true
  structured_messaging: false
  native_task_tracking: false
  read_only_agents: false
detection:
  primary: "CURSOR_VERSION environment variable is set"
  secondary: ".cursor/settings.json exists in CWD or parent directories"
---

# Cursor Adapter

Cursor supports async subagents with independent context windows. Subagents can run in the background while the parent continues. No inter-agent messaging — results are collected via file system. Background Agents work on separate branches in isolated VMs.

## Tool Mappings

| Generic Concept | Implementation |
|-----------------|---------------|
| `spawn_agent_personality` | Spawn a subagent with the personality content as system prompt, plus the task description. Use Cursor's subagent spawning with custom system prompts. |
| `spawn_agent_autonomous` | Spawn a subagent with the task prompt directly. |
| `spawn_agent_readonly` | Spawn a subagent with explicit read-only instructions in the prompt. Cursor does not enforce read-only at the platform level. |
| `coordinate_parallel` | Spawn multiple subagents asynchronously — Cursor supports parallel subagent execution. Each writes results to a file. |
| `collect_results` | Each agent writes its structured result to `.planning/phases/{NN}/{NN}-{PP}-RESULT.md`. The coordinator polls for these files. |
| `shutdown_agents` | No-op — subagents complete and return naturally. |
| `cleanup_coordination` | No-op — no team infrastructure. |
| `ask_user` | Print numbered choices in plain text. Cursor's Plan mode (Shift+Tab) provides structured interaction, but within agent context use plain text choices. |
| `model_planning` | `claude-opus-4-6` or `gpt-5.3-codex` (user-configured) |
| `model_execution` | `claude-sonnet-4-6` (Cursor default) |
| `model_check` | `claude-haiku-4-5` |
| `global_config_dir` | `~/.legion/` |
| `plugin_discovery_glob` | `{HOME}/.legion/agents/agents-orchestrator.md` (expand `{HOME}` via `echo $HOME` — Glob tools do not expand `~`) |
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

Write a wave checklist to `.planning/phases/{NN}/WAVE-CHECKLIST.md` (same format as other non-Teams CLIs).

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

