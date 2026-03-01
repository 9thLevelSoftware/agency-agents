# The Agency Workflows

Orchestrate 51 AI specialist personalities as coordinated teams in Claude Code.

## What It Does

Turn a collection of 51 isolated agent personalities into a functional AI agency. Type `/agency:start`, describe what you want, and the system assembles the right team, plans the work, executes in parallel, and runs quality checks — with each agent operating in full character.

## Quick Start

1. Copy this repository into your project (or clone alongside it)
2. The `.claude/` directory integrates automatically with Claude Code
3. Run `/agency:start` to begin a new project
4. Or run `/agency:status` to check progress on an existing project

## Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/agency:start` | Initialize project with guided questioning | Run once at project start |
| `/agency:plan <N>` | Plan phase N with agent recommendations | After start, or after completing a phase |
| `/agency:build` | Execute current phase with parallel agents | After planning a phase |
| `/agency:review` | Run QA review cycle | After building a phase |
| `/agency:status` | Show progress and next action | Anytime — routes you to the right command |
| `/agency:quick <task>` | Run ad-hoc task with agent selection | Anytime — for one-off tasks |

## How It Works

```
/agency:start          Guided questioning → PROJECT.md + ROADMAP.md
       ↓
/agency:plan 1         Phase decomposition → Wave-structured plans + agent teams
       ↓
/agency:build          Parallel execution → Agents work in character, wave by wave
       ↓
/agency:review         Quality gate → Review → Fix → Re-review (max 3 cycles)
       ↓
/agency:plan 2 → ...   Repeat for each phase until project complete
```

## The 51 Agents

Agents are organized across 9 divisions, each with deep specialist personalities:

| Division | Agents | Focus |
|----------|--------|-------|
| Engineering | 7 | Full-stack, backend, frontend, AI, DevOps, mobile, prototyping |
| Design | 6 | UI/UX, branding, visual storytelling, research |
| Marketing | 8 | Content, social media, growth, platform strategies |
| Testing | 7 | QA, evidence collection, performance, API testing |
| Product | 3 | Sprint planning, feedback synthesis, trends |
| Project Management | 5 | Coordination, portfolio, operations, experiments |
| Support | 6 | Analytics, finance, legal, infrastructure |
| Spatial Computing | 6 | VisionOS, XR, Metal, terminal integration |
| Specialized | 3 | Orchestration, data analytics, LSP indexing |

See the full roster with individual specialties: [`agency-agents/README.md`](agency-agents/README.md)

## Architecture

```
.claude/
  commands/agency/      ← 6 /agency: command entry points
  skills/agency/        ← Reusable workflow skills
    agent-registry.md   ← Maps all 51 agents by capability and task type
    workflow-common.md  ← Shared patterns and conventions
agency-agents/          ← 51 personality .md files by division
  engineering/          ← 7 agents
  design/               ← 6 agents
  marketing/            ← 8 agents
  testing/              ← 7 agents
  product/              ← 3 agents
  project-management/   ← 5 agents
  support/              ← 6 agents
  spatial-computing/    ← 6 agents
  specialized/          ← 3 agents
.planning/              ← Project state (generated per-project)
  templates/            ← Schema for generated files
  phases/               ← Phase plan and summary files
```

## Design Principles

- **Personality-first**: Agent .md files are the source of truth for behavior
- **Pure Claude Code**: No custom tooling — skills, commands, and agents only
- **Human-readable state**: All planning files are markdown, readable without tools
- **Full personality injection**: Agents are spawned with their complete .md as instructions
- **Balanced cost**: Opus for planning, Sonnet for execution, Haiku for checks
- **Max 3 tasks per plan**: Keeps work focused and reviewable
- **Hybrid selection**: Workflow recommends agents, user confirms or overrides
- **Wave execution**: Plans grouped by dependency; parallel within waves, sequential between

## Requirements

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)
- No additional dependencies

## Contributing

See [`CONTRIBUTING.md`](agency-agents/CONTRIBUTING.md) for agent design guidelines.
