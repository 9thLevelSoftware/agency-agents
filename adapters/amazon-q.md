---
cli: amazon-q
cli_display_name: "Amazon Q Developer CLI"
version: "1.0"
support_tier: "experimental"
capabilities:
  parallel_execution: false
  agent_spawning: false
  structured_messaging: false
  native_task_tracking: false
  read_only_agents: false
detection:
  primary: "Q_CLI_VERSION environment variable is set"
  secondary: "~/.aws/q/ directory exists or q command is available"
max_prompt_size: 128000
known_quirks:
  - "no-agent-spawning"
  - "aws-scoped-context"
---

# Amazon Q Developer CLI Adapter

Amazon Q Developer CLI operates as a single-agent system with custom agent configurations (JSON). No subagent spawning — all plans execute within the current session. Extension happens via custom agents and MCP servers.

## Tool Mappings

| Generic Concept | Implementation |
|-----------------|---------------|
| `spawn_agent_personality` | No subagent spawning. Instead, prepend the personality content to the current session context as a behavioral directive, then execute the plan tasks inline. |
| `spawn_agent_autonomous` | Execute the plan tasks directly in the current session. |
| `spawn_agent_readonly` | Instruct the session explicitly: "READ-ONLY MODE: Do not create, modify, or delete any files. Only read and analyze." No platform enforcement. |
| `coordinate_parallel` | Not available. All plans execute sequentially in the current session. |
| `collect_results` | After executing each plan, write a structured result to `.planning/phases/{NN}/{NN}-{PP}-RESULT.md` from within the current session. |
| `shutdown_agents` | No-op — no agents to shut down. |
| `cleanup_coordination` | No-op — no coordination infrastructure. |
| `ask_user` | Print numbered choices in plain text and wait for user input. |
| `model_planning` | `claude-sonnet-4-6` (Amazon Bedrock default) |
| `model_execution` | `claude-sonnet-4-6` |
| `model_check` | `claude-haiku-4-5` |
| `global_config_dir` | `~/.legion/` |
| `plugin_discovery_glob` | `{HOME}/.legion/agents/agents-orchestrator.md` (expand `{HOME}` via `echo $HOME` — Glob tools do not expand `~`) |
| `commit_signature` | `Co-Authored-By: Amazon Q <noreply@amazon.com>` |

## Interaction Protocol

Print numbered choices in plain text and wait for user response. Parse the integer from the user's message. Re-prompt on invalid input (max 2 retries).

## Execution Protocol

### Phase Initialization

Write a wave checklist to `.planning/phases/{NN}/WAVE-CHECKLIST.md`.

### Wave Execution

All plans execute sequentially in the current session:
1. For each plan in the wave (ascending plan number):
   a. Read the plan file
   b. If assigned agent and `autonomous: false`:
      - Read the personality file
      - Adopt the personality as a behavioral directive for this plan's execution
      - Execute all tasks in the plan
      - Drop the personality directive after plan completion
   c. If `autonomous: true`:
      - Execute the plan tasks directly
2. After each plan: write result to `.planning/phases/{NN}/{NN}-{PP}-RESULT.md`
3. Update WAVE-CHECKLIST.md

### Important: Single-Session Personality Injection

Since Amazon Q cannot spawn subagents, personality injection works differently:
- The personality content is prepended to the execution context as a "role adoption" directive
- The AI is instructed to embody the personality's expertise and decision-making style
- After the plan completes, the personality is explicitly dropped
- This provides weaker isolation than true subagent spawning — the session retains memory of previous plans

### Result Collection

Read result files after each plan. Parse Status field. Build wave summary.

### Phase Cleanup

No cleanup needed. Update checklist.

