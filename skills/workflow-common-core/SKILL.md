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
| `/legion:update` | workflow-common-core | workflow-common-github |

## Context Budget Ceiling (Core)

Execution-context budgets (always-load skills only):
- `build`: soft 180 KB, hard 225 KB
- `plan`: soft 180 KB, hard 225 KB
- `review`: soft 180 KB, hard 225 KB
- `status`: soft 120 KB, hard 150 KB

Release checks enforce hard ceilings and print telemetry for every command. Agent line-count remains telemetry, not a gate.


