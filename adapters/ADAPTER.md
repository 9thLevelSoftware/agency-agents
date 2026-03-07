---
name: Legion Adapter Specification
version: "1.0"
---

# Legion Adapter Specification

Every CLI adapter MUST define all fields in this spec. Missing fields cause undefined behavior at runtime.

## Purpose

Adapters bridge Legion's generic workflow concepts to the specific tools and conventions of each AI CLI. Skills and commands reference generic concepts (e.g., "spawn agent", "collect results"); adapters define how the active CLI implements those concepts.

## Required Fields

### CLI Identity (YAML frontmatter)

| Field | Type | Description |
|-------|------|-------------|
| `cli` | string | Machine-readable CLI identifier (e.g., `claude-code`, `codex-cli`) |
| `cli_display_name` | string | Human-readable name (e.g., "Claude Code", "OpenAI Codex CLI") |
| `version` | string | Adapter version |
| `support_tier` | string | One of `certified`, `beta`, `experimental` for disclosure and diagnostics |

### Capabilities (YAML frontmatter)

| Field | Type | Description |
|-------|------|-------------|
| `parallel_execution` | boolean | Can this CLI run multiple agents simultaneously? |
| `agent_spawning` | boolean | Can this CLI spawn subagents with separate context windows? |
| `structured_messaging` | boolean | Can agents send structured messages back to the coordinator? |
| `native_task_tracking` | boolean | Does this CLI have built-in task/todo tracking? |
| `read_only_agents` | boolean | Does this CLI support read-only agent modes (no file writes)? |

### Detection (YAML frontmatter)

| Field | Type | Description |
|-------|------|-------------|
| `detection.primary` | string | Primary detection method (tool probe, env var, etc.) |
| `detection.secondary` | string | Fallback detection method |

### Limits & Quirks (YAML frontmatter)

| Field | Type | Description |
|-------|------|-------------|
| `max_prompt_size` | integer | Maximum prompt size in tokens that this CLI reliably handles. Used by wave-executor to warn when agent prompts approach the limit. Approximate values acceptable -- use the CLI's documented context window or practical safe limit. |
| `known_quirks` | list of strings | CLI-specific behavioral quirks that skills and commands should account for. Examples: "no-parallel-agents", "no-streaming", "prompt-prefix-only", "no-mcp-support". Empty list `[]` is valid for CLIs with no known quirks. |

## Required Sections (markdown body)

### Tool Mappings

A table mapping every generic Legion concept to this CLI's implementation:

| Generic Concept | Description | Required |
|-----------------|-------------|----------|
| `spawn_agent_personality` | How to run an agent with full personality injection | Yes |
| `spawn_agent_autonomous` | How to run an agent without personality | Yes |
| `spawn_agent_readonly` | How to run a read-only advisory agent | Yes |
| `coordinate_parallel` | How to run multiple agents simultaneously | Yes |
| `collect_results` | How agents report completion summaries | Yes |
| `shutdown_agents` | How to gracefully terminate spawned agents | Yes |
| `cleanup_coordination` | How to clean up coordination infrastructure | Yes |
| `ask_user` | How to present choices to the user | Yes |
| `model_planning` | Model name for planning/architecture decisions | Yes |
| `model_execution` | Model name for implementation/execution | Yes |
| `model_check` | Model name for lightweight checks | Yes |
| `global_config_dir` | Where to store global files (portfolio registry) | Yes |
| `plugin_discovery_glob` | Glob pattern for finding installed Legion agents. Use `{HOME}` instead of `~` — Glob tools do not expand tilde. | Yes |
| `commit_signature` | Co-Authored-By line for git commits | Yes |

### Interaction Protocol

Prose description of how the user is prompted and how responses are parsed. Must cover:
- How to present a multiple-choice question
- How to parse the user's response
- How to handle invalid responses
- Whether the prompt blocks execution

### Execution Protocol

Prose description of how waves are executed given this CLI's capabilities. Must cover:
- How personality injection works (separate agent vs. prompt prefix)
- How parallel execution works (or why it doesn't)
- How results are collected after each plan
- How wave dependencies are checked
- How cleanup happens after phase completion

## Adapter File Location

All adapters live in `adapters/` at the Legion plugin root:

```
adapters/
  ADAPTER.md          — this specification
  claude-code.md      — Anthropic Claude Code
  codex-cli.md        — OpenAI Codex CLI
  cursor.md           — Cursor IDE
  copilot-cli.md      — GitHub Copilot CLI
  gemini-cli.md       — Google Gemini CLI
  amazon-q.md         — Amazon Q Developer CLI
  windsurf.md         — Windsurf (Codeium)
  opencode.md         — OpenCode
  aider.md            — Aider
```

## Adding a New CLI Adapter

To add support for a new AI CLI:

1. Copy an existing adapter as a template (prefer one with similar capabilities)
2. Fill in all required YAML frontmatter fields
3. Populate `max_prompt_size` with the CLI's documented context window (or a conservative practical limit) and `known_quirks` with any behavioral quirks that affect Legion workflows (use `[]` if none)
4. Complete the Tool Mappings table — every row must have a value
5. Write the Interaction Protocol section
6. Write the Execution Protocol section
7. Add a detection entry in `skills/workflow-common/SKILL.md` under '## CLI Detection and Adapter Loading → ### Detection Protocol' (Steps 2 and 3)
8. Test by running `/legion:quick <simple task>` on the target CLI

