---
cli: opencode
cli_display_name: "OpenCode"
version: "1.0"
support_tier: "experimental"
capabilities:
  parallel_execution: true
  agent_spawning: true
  structured_messaging: false
  native_task_tracking: true
  read_only_agents: true
detection:
  primary: "OPENCODE_CONFIG_DIR environment variable is set"
  secondary: ".opencode/ directory exists in CWD or ~/.config/opencode/ directory exists"
---

# OpenCode Adapter

OpenCode supports subagent spawning with parallel execution, read-only Explore agents, MCP servers, and custom agents via JSON config or markdown files. Subagents communicate through the Task tool — no structured inter-agent messaging like Claude Code's SendMessage, but task-based coordination is available.

## Tool Mappings

| Generic Concept | Implementation |
|-----------------|---------------|
| `spawn_agent_personality` | Spawn a subagent with the personality content as the prompt prefix, followed by the task. Use `@general` or a custom agent with the full personality as system instructions. |
| `spawn_agent_autonomous` | Spawn a subagent with the task prompt directly, no personality prefix. |
| `spawn_agent_readonly` | Use the built-in Explore agent (`@explore`) — cannot modify files, enforced at the platform level. Provide personality + task in the prompt. |
| `coordinate_parallel` | Spawn multiple subagents in parallel via the Task tool. Each writes results to a file. |
| `collect_results` | Each agent writes its structured result to `.planning/phases/{NN}/{NN}-{PP}-RESULT.md`. The coordinator reads these files after each wave. |
| `shutdown_agents` | No-op — subagents complete and return naturally. |
| `cleanup_coordination` | No-op — no team infrastructure to clean up. |
| `ask_user` | Print numbered choices in plain text and wait for user input. |
| `model_planning` | User-configured model (e.g., `claude-opus-4-6`, `o3`) |
| `model_execution` | User-configured model (e.g., `claude-sonnet-4-6`, `gpt-5.3-codex`) |
| `model_check` | User-configured model (e.g., `claude-haiku-4-5`, `o3-mini`) |
| `global_config_dir` | `~/.legion/` |
| `plugin_discovery_glob` | `{HOME}/.legion/agents/agents-orchestrator.md` (expand `{HOME}` via `echo $HOME` — Glob tools do not expand `~`) |
| `commit_signature` | `Co-Authored-By: OpenCode <noreply@opencode.ai>` |

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

Write a wave checklist to `.planning/phases/{NN}/WAVE-CHECKLIST.md` for tracking. OpenCode's native task tracking can also be used for visibility.

### Wave Execution

OpenCode supports parallel subagent spawning. For waves with multiple plans:
1. Spawn all subagents for the wave in parallel via the Task tool
2. Each subagent writes its result to `.planning/phases/{NN}/{NN}-{PP}-RESULT.md`
3. Coordinator reads result files after all plans in the wave complete
4. Parse results and build wave summary

For single-plan waves, spawn one subagent and wait for completion.

### Read-Only Agents

The built-in Explore agent (`@explore`) enforces read-only at the platform level — it cannot modify files. Use this for `/legion:advise` advisory sessions and plan critique.

### Custom Agent Integration

Legion agents can be installed as OpenCode custom agents in `~/.config/opencode/agents/` or `.opencode/agents/`. Each personality .md file maps to an OpenCode agent definition.

### Result Collection

Read `.planning/phases/{NN}/{NN}-{PP}-RESULT.md` for each plan. Parse Status field. Build wave summary.

### Phase Cleanup

No cleanup needed — subagents complete naturally. Update WAVE-CHECKLIST.md to mark phase as Finalized.

