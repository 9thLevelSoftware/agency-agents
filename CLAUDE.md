# The Agency Workflows

A Claude Code plugin for orchestrating 51 AI specialist personalities as coordinated teams.

## Available Commands

| Command | Description |
|---------|-------------|
| `/agency:start` | Initialize a new project with guided questioning flow |
| `/agency:plan <N>` | Plan phase N with agent recommendations and wave-structured tasks |
| `/agency:build` | Execute current phase plans with parallel agent teams |
| `/agency:review` | Run quality review cycle with testing/QA agents |
| `/agency:status` | Show progress dashboard and route to next action |
| `/agency:quick <task>` | Run ad-hoc task with intelligent agent selection |

## Project Structure

```
.claude/
  commands/agency/    — 6 /agency: command entry points
  skills/agency/      — Reusable workflow skills (agent-registry, workflow-common)
agency-agents/        — 51 agent personality .md files organized by division
.planning/            — Project state (PROJECT.md, ROADMAP.md, STATE.md)
  templates/          — Schema for generated state files
  phases/             — Phase plan and summary files
```

## Agent Divisions (51 total)

| Division | Count | Focus |
|----------|-------|-------|
| Engineering | 7 | Full-stack, backend, frontend, AI, DevOps, mobile, prototyping |
| Design | 6 | UI/UX, branding, visual storytelling, research |
| Marketing | 8 | Content, social media, growth, platform strategies |
| Testing | 7 | QA, evidence collection, performance, API testing |
| Product | 3 | Sprint planning, feedback synthesis, trends |
| Project Management | 5 | Coordination, portfolio, operations, experiments |
| Support | 6 | Analytics, finance, legal, infrastructure |
| Spatial Computing | 6 | VisionOS, XR, Metal, terminal integration |
| Specialized | 3 | Orchestration, data analytics, LSP indexing |

## Workflow

```
/agency:start → /agency:plan 1 → /agency:build → /agency:review → /agency:plan 2 → ...
```

Each phase: plan (decompose + assign agents) → build (parallel execution) → review (QA loop)

## Conventions

- **Personality-first**: Agent .md files are the source of truth for agent behavior
- **Full injection**: Agents are spawned with their complete personality as instructions
- **Max 3 tasks per plan**: Keeps work focused and reviewable
- **Wave execution**: Plans grouped into dependency waves; parallel within, sequential between
- **Cost profile**: Opus for planning, Sonnet for execution, Haiku for checks
- **Human-readable state**: All planning files are markdown — no binary state
- **Hybrid selection**: Workflow recommends agents, user confirms or overrides
