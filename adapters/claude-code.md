---
cli: claude-code
cli_display_name: "Claude Code"
version: "1.0"
support_tier: "certified"
capabilities:
  parallel_execution: true
  agent_spawning: true
  structured_messaging: true
  native_task_tracking: true
  read_only_agents: true
detection:
  primary: "TeamCreate tool is available in the tool list"
  secondary: "~/.claude/ directory exists"
max_prompt_size: 180000
known_quirks: []
---

# Claude Code Adapter

Claude Code supports the full Legion feature set: parallel wave execution via Agent Teams, structured result collection via SendMessage, interactive prompts, and read-only advisory agents.

## Tool Mappings

| Generic Concept | Implementation |
|-----------------|---------------|
| `spawn_agent_personality` | `Agent(subagent_type: "general-purpose", prompt: "{personality}\n\n---\n\n{task}", model: "{model_execution}", name: "{agent-id}-{NN}-{PP}", team_name: "{phase_team_name}")` |
| `spawn_agent_autonomous` | `Agent(subagent_type: "general-purpose", prompt: "{task}", model: "{model_execution}", name: "executor-{NN}-{PP}", team_name: "{phase_team_name}")` |
| `spawn_agent_readonly` | `Agent(subagent_type: "Explore", prompt: "{personality}\n\n---\n\n{task}", model: "{model_execution}", name: "{agent-id}-advisor")` — Explore agents cannot Write or Edit, enforced at the platform level |
| `coordinate_parallel` | `TeamCreate(team_name: "phase-{NN}-execution")` + `TaskCreate` per plan + parallel `Agent` calls in a single response |
| `collect_results` | Agents send `SendMessage(type: "message", recipient: "coordinator", summary: "Plan {NN}-{PP} complete", content: "{structured_summary}")` — ~200 tokens per agent |
| `shutdown_agents` | `SendMessage(type: "shutdown_request", recipient: "{agent_name}", content: "Phase execution complete")` to each agent |
| `cleanup_coordination` | `TeamDelete()` — removes the Team configuration |
| `ask_user` | `AskUserQuestion(questions: [{question: "...", options: [...]}])` — blocks until user responds |
| `model_planning` | `opus` |
| `model_execution` | `sonnet` |
| `model_check` | `haiku` |
| `global_config_dir` | `~/.claude/legion/` |
| `plugin_discovery_glob` | `<home>/.claude/agents/agents-orchestrator.md` — **resolve `<home>` first**: run `echo $HOME` (bash) or use `os.homedir()` to get the absolute path, then substitute it into the glob pattern. Do NOT pass `~`, `$HOME`, `{HOME}`, or any variable literal to the Glob tool. |
| `commit_signature` | `Co-Authored-By: Claude <noreply@anthropic.com>` |

## Prerequisites

The `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` setting must be enabled for parallel execution. If Teams are unavailable, Legion MUST stop and instruct the user to enable the flag — do not silently fall back to sequential execution.

## Interaction Protocol

`ask_user` maps to the `AskUserQuestion` tool. It accepts structured questions with labeled options:

```
AskUserQuestion(questions: [{
  question: "Which agent should handle this?",
  header: "Agent",
  options: [
    {label: "senior-developer", description: "Premium implementation specialist"},
    {label: "ux-architect", description: "UX and architecture specialist"}
  ],
  multiSelect: false
}])
```

The tool blocks execution until the user selects an option. Parse the response as the selected option's label.

For free-text input, use an option with a generic label and let the user select "Other" to type freely.

## Execution Protocol

### Phase Initialization

```
TeamCreate(team_name: "phase-{NN}-execution", description: "Phase {NN}: {phase_name}")

For each plan in the phase:
  TaskCreate(subject: "Execute plan {NN}-{PP}: {plan_name}", description: "...")

For plans with cross-wave dependencies:
  TaskUpdate(taskId: "{task_id}", addBlockedBy: ["{dependency_task_ids}"])
```

### Wave Execution

Issue ALL Agent tool calls for the wave in a SINGLE response message — this triggers parallel execution. Each Agent call MUST include `team_name`.

```
[In one response:]
Agent(name="engineering-senior-developer-04-01", prompt="...", model="sonnet", team_name="phase-04-execution")
Agent(name="executor-04-02", prompt="...", model="sonnet", team_name="phase-04-execution")
```

### Result Collection

Wait for each agent to send a `SendMessage` to the coordinator. Each message contains a structured summary (~200 tokens). The coordinator processes all messages before writing SUMMARY files or advancing to the next wave.

If an agent goes idle without sending a message:
1. Send a follow-up `SendMessage` asking for status
2. If no response: infer result from filesystem (check files_modified)

### Phase Cleanup

```
For each spawned agent:
  SendMessage(type: "shutdown_request", recipient: "{agent_name}", content: "Phase complete")

TeamDelete()
```

This MUST run on both success and failure paths. Never leave orphaned agents or stale Team configurations.

