---
cli: gemini-cli
cli_display_name: "Google Gemini CLI"
version: "1.0"
support_tier: "beta"
capabilities:
  parallel_execution: true
  agent_spawning: true
  structured_messaging: false
  native_task_tracking: false
  read_only_agents: false
detection:
  primary: ".gemini/commands/legion/start.toml exists in CWD or ~/.gemini/commands/legion/start.toml exists"
  secondary: "GEMINI.md exists in CWD or ~/.gemini/extensions/ exists"
max_prompt_size: 1048576
known_quirks:
  - "no-structured-messaging"
  - "experimental-agent-spawning"
---

# Google Gemini CLI Adapter

Gemini CLI supports native custom commands stored as TOML files under `.gemini/commands/` or `~/.gemini/commands/`. Legion installs its workflows there with a `legion/` namespace so the canonical entry point remains `/legion:start`. Gemini extensions and A2A flows can supplement the workflow, but Legion treats the installed command files as the primary surface.

## Tool Mappings

| Generic Concept | Implementation |
|-----------------|---------------|
| `spawn_agent_personality` | Load the matching Legion workflow from `.legion/commands/legion/`, then spawn a Gemini subagent when the workflow calls for delegation. |
| `spawn_agent_autonomous` | Run the matching Legion custom command and execute the workflow directly. |
| `spawn_agent_readonly` | Spawn a subagent with explicit read-only instructions. Gemini CLI does not enforce read-only at the platform level. |
| `coordinate_parallel` | Spawn multiple subagents in parallel via Gemini's greedy tool scheduler (shipped Jan 2026). Each writes results to a file. Note: v1 parallel does not handle agents modifying the same files. |
| `collect_results` | Each agent writes its result to `.planning/phases/{NN}/{NN}-{PP}-RESULT.md`. |
| `shutdown_agents` | No-op — subagents return naturally. |
| `cleanup_coordination` | No-op. |
| `ask_user` | Print numbered choices in plain text and wait for user input. |
| `model_planning` | `gemini-pro` (or `/model pro`) |
| `model_execution` | `gemini-pro` (default) |
| `model_check` | `gemini-flash` (or `/model flash`) |
| `global_config_dir` | `~/.gemini/commands/` plus `~/.gemini/extensions/` |
| `plugin_discovery_glob` | `.gemini/commands/legion/*.toml` or `~/.gemini/commands/legion/*.toml` |
| `commit_signature` | `Co-Authored-By: Gemini <noreply@google.com>` |

## Interaction Protocol

Print numbered choices in plain text and wait for user response. Parse the integer from the user's message. Re-prompt on invalid input (max 2 retries).

## Execution Protocol

### Phase Initialization

Write a wave checklist to `.planning/phases/{NN}/WAVE-CHECKLIST.md`.

### Wave Execution

Gemini CLI supports parallel subagent spawning (v1, shipped Jan 2026). For waves with multiple plans:
1. For each plan in the wave, read the matching Legion workflow file from `.legion/commands/legion/`
2. If assigned agent: load personality via `Read {AGENTS_DIR}/{agent-id}.md`, spawn subagent with personality prefix + plan task
3. If autonomous: spawn subagent with plan task only
4. Spawn all subagents for the wave — Gemini's greedy scheduler handles concurrent execution
5. Each subagent writes result to `.planning/phases/{NN}/{NN}-{PP}-RESULT.md`
6. Read result files after all plans in the wave complete
7. Update WAVE-CHECKLIST.md

For single-plan waves, spawn one subagent and wait for completion.

**Note:** Agent spawning requires opt-in via `{"experimental": {"enableAgents": true}}` in Gemini CLI's `settings.json`. Subagents cannot call other subagents (no recursion).

### Result Collection

Read result files after each plan. Parse Status field. Build wave summary.

### Phase Cleanup

No cleanup needed. Update checklist.

## Extensions Integration

Gemini CLI extensions can supplement Legion with:
- Additional custom slash commands (`.toml` files)
- GEMINI.md context files
- MCP server connections

## Dispatch Configuration

When Claude Code is the orchestrator, Gemini CLI can be dispatched to for UI/UX evaluation, web research, and large codebase analysis. Gemini's 1M token context window makes it ideal for comprehensive analysis tasks.

```yaml
available: true
capabilities: [web_search, ui_design, ux_research, large_analysis, code_review]
invoke_command: "gemini"
invoke_flags: ["--sandbox"]
prompt_delivery: stdin_pipe
prompt_flag: null
result_mode: file
result_path: ".planning/dispatch/{task-id}-RESULT.md"
result_instruction: "Write your complete output to {result_path} using the format specified below."
max_concurrent: 3
timeout_ms: 300000
detection_command: "gemini --version"
prerequisites:
  - "Gemini CLI settings.json must have experimental.enableAgents set to true"
```

