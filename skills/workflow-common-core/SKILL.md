---
name: legion:workflow-common-core
description: Lean core conventions and path contracts used by all /legion: commands
triggers: [common, core, paths, state, conventions]
token_cost: low
summary: "Lean always-load core for command execution: CLI adapter detection, state file paths, settings resolution, agent path resolution, and base command mapping."
---

# Legion Workflow Common Core

Always-load core conventions for every `/legion:` command. This file is intentionally compact.

## Core Responsibilities
- Detect and load the active runtime adapter before command-specific logic.
- Resolve canonical state file paths under `.planning/`.
- Resolve `settings.json` defaults safely when file is missing or invalid.
- Resolve `AGENTS_DIR` once per invocation before loading personality files.
- Provide baseline command-to-skill mapping and context budget ceilings.

## Adapter Detection (Core)

1. Check `.legion-cli` override in project root.
2. If absent, evaluate adapter primary detections from `adapters/*.md`.
3. If no primary match, evaluate adapter secondary detections.
4. If still no match, default to Claude Code adapter.
5. Read the full adapter file and use adapter-defined tool mapping/model settings.

## User Interaction (Core)

**CRITICAL**: When commands or skills reference `adapter.ask_user`, `Use adapter.ask_user`, or instruct you to ask the user a question with structured choices, you MUST use the `AskUserQuestion` tool. Do NOT output questions as raw text and wait for a reply. The `AskUserQuestion` tool provides structured selection UI (arrow keys + Enter) which is the intended interaction model for all Legion commands.

For Claude Code, `adapter.ask_user` maps to:
```
AskUserQuestion(questions: [{
  question: "Your question here",
  options: [
    {label: "option-1", description: "Description of option 1"},
    {label: "option-2", description: "Description of option 2"}
  ]
}])
```

This applies to ALL question prompts in ALL commands — confirmation gates, mode selection, workflow preferences, and any other structured choice.

## State Paths (Core)

| File | Path | Purpose |
|------|------|---------|
| PROJECT.md | `.planning/PROJECT.md` | Vision, requirements, constraints |
| ROADMAP.md | `.planning/ROADMAP.md` | Phase sequence and plan tracking |
| STATE.md | `.planning/STATE.md` | Current state and next action |
| REQUIREMENTS.md | `.planning/REQUIREMENTS.md` | Expanded requirement details |
| Phase plans | `.planning/phases/{NN-name}/` | PLAN/SUMMARY/CONTEXT files |

## Settings Resolution (Core)

Read `settings.json` from repo root if available. If missing/invalid, use defaults.

Defaults:
- `planning.max_tasks_per_plan = 3`
- `review.max_cycles = 3`
- `execution.agent_personality_verbosity = "full"`
- `integrations.github = "prompt"`
- `memory.enabled = true`
- `memory.project_scoped_only = true`
- `control_mode = "guarded"`

### Mode Profile Resolution

After resolving `control_mode` from settings (default: `"guarded"`), load the corresponding profile:

1. Read `.planning/config/control-modes.yaml`
2. Look up `profiles[control_mode]` to get the flag set
3. If file missing or mode not found: fall back to `guarded` profile hardcoded as:
   - `authority_enforcement: true`, `domain_filtering: true`, `human_approval_required: true`, `file_scope_restriction: false`, `read_only: false`
4. Pass resolved profile to authority-enforcer and wave-executor integration points

The resolved profile is a set of 5 boolean flags: `authority_enforcement`, `domain_filtering`, `human_approval_required`, `file_scope_restriction`, `read_only`.

## Agent Path Resolution (Core)

Resolve once per command invocation:
1. `~/.claude/agents/agents-orchestrator.md` (Claude global install)
2. `agents/agents-orchestrator.md` (local dev mode)
3. Manifest fallback: `~/.claude/legion/manifest.json` then `~/.legion/manifest.json`
4. If none found: fail fast with install guidance

Use resolved path for all personality reads:
`{AGENTS_DIR}/{agent-id}.md`

## Personality Injection (Core)

- Load full personality markdown for assigned agent.
- Inject personality content + task instructions into adapter spawn prompt.
- Use `adapter.model_execution` for execution agents unless command overrides it.

## Command-to-Skill Mapping (Core)

| Command | Always Loads | Conditionally Loads |
|---------|-------------|-------------------|
| `/legion:start` | workflow-common-core, questioning-flow, agent-registry, portfolio-manager, codebase-mapper | workflow-common-domains |
| `/legion:plan` | workflow-common-core, agent-registry, phase-decomposer | memory-manager, github-sync, codebase-mapper, plan-critique, spec-pipeline, workflow-common-memory, workflow-common-github, workflow-common-domains |
| `/legion:build` | workflow-common-core, agent-registry, wave-executor, execution-tracker | memory-manager, github-sync, codebase-mapper, workflow-common-memory, workflow-common-github |
| `/legion:review` | workflow-common-core, agent-registry, review-loop, review-panel, execution-tracker | memory-manager, github-sync, design-workflows, workflow-common-memory, workflow-common-github, workflow-common-domains |
| `/legion:status` | workflow-common-core, execution-tracker, milestone-tracker | memory-manager, github-sync, codebase-mapper, workflow-common-memory, workflow-common-github |
| `/legion:quick` | workflow-common-core, agent-registry | workflow-common-domains |
| `/legion:portfolio` | workflow-common-core, portfolio-manager | workflow-common-github |
| `/legion:milestone` | workflow-common-core, milestone-tracker, execution-tracker | github-sync, workflow-common-github |
| `/legion:agent` | workflow-common-core, agent-registry, agent-creator | workflow-common-domains |
| `/legion:advise` | workflow-common-core, agent-registry | workflow-common-domains |
| `/legion:board`     | workflow-common-core, agent-registry, board-of-directors, cli-dispatch | workflow-common-memory, workflow-common-github |
| `/legion:update` | workflow-common-core | workflow-common-github |

## Context Budget Ceiling (Core)

Execution-context budgets (always-load skills only):
- `build`: soft 180 KB, hard 225 KB
- `plan`: soft 180 KB, hard 225 KB
- `review`: soft 180 KB, hard 225 KB
- `status`: soft 120 KB, hard 150 KB

Release checks enforce hard ceilings and print telemetry for every command. Agent line-count remains telemetry, not a gate.


