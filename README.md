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
| `/agency:portfolio` | Multi-project dashboard | When managing multiple projects |
| `/agency:milestone` | Milestone completion and archiving | At project milestones |
| `/agency:agent` | Create a new agent personality | When you need a specialist that doesn't exist |

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

## Standing on the Shoulders of Giants

The Agency Workflows didn't invent its patterns from scratch. It cherry-picked the best ideas from four proven Claude Code orchestration systems, combined them into something greater than the sum of its parts, and left behind the complexity that made each system hard to adopt.

### What We Took (and What We Left Behind)

#### From [GSD (Get Shit Done)](https://github.com/StuMason/gsd)

**Took: The conversation engine and state management philosophy.**

GSD's adaptive questioning flow is the gold standard for understanding what a user actually wants before jumping to implementation. We adopted its 3-stage pattern (vision → requirements → constraints) where the conversation explores the *why* before the *what*, targeting 5-8 natural exchanges rather than rigid checklists. GSD's `.planning/` directory with human-readable markdown state files (PROJECT.md, ROADMAP.md, STATE.md) became our foundation — no databases, no JSON blobs, just files you can read with `cat`.

We also adopted GSD's orchestrator/subagent split: a coordinator manages the workflow while specialized agents do the actual work, each in a fresh context window so they don't get confused by accumulated state.

**Left behind:** GSD's 33+ workflow files, custom CLI tooling (`gsd-tools.cjs`), complex configuration system, and heavyweight milestone management. GSD is powerful but requires significant setup. We wanted the patterns without the infrastructure.

#### From [Conductor](https://github.com/RichardHightworker/conductor)

**Took: The evaluate-loop and quality gate architecture.**

Conductor's build → review → fix cycle is the right way to ensure quality. Our `review-loop.md` skill implements this as a structured dev-QA loop: review agents provide specific, actionable feedback (not vague "looks good"), fixes are applied, and re-review confirms the fix — with a hard cap of 3 cycles before escalating to the user. No infinite retry loops.

Conductor's parallel dispatch pattern — spawning multiple specialized evaluators simultaneously — became our wave execution model. And its concept of typed evaluators (different reviewers for different work) became our phase-type mapping: code gets Reality Checker + Evidence Collector, design gets the three-lens review (brand + accessibility + usability), marketing gets Workflow Optimizer, and so on.

**Left behind:** Conductor's board-of-directors governance model (5 directors debating is overkill for most projects), file-based message bus IPC, 50+ iteration limits, and `metadata.json` state tracking. Conductor optimizes for correctness through redundancy; we optimize for shipping through focused review.

#### From [Shipyard](https://github.com/9thLevelSoftware/shipyard)

**Took: Wave-based execution, plan constraints, and atomic commits.**

Shipyard's wave model is elegant: organize plans into dependency waves, execute everything within a wave in parallel, then advance to the next wave. This gives you maximum parallelism without dependency conflicts. We adopted it directly in `wave-executor.md`.

Shipyard's max-3-tasks-per-plan constraint keeps work focused and reviewable. More than 3 tasks and plans become unwieldy — agents lose context, reviews get superficial, and failures are hard to diagnose. We enforce this in `phase-decomposer.md`.

Atomic commits per completed plan (from Shipyard's `execution-tracker`) means every unit of work is independently revertable. If Plan 2 breaks something, you can roll back without losing Plan 1's progress.

**Left behind:** Shipyard's 29 commands, checkpoint/rollback system, and complex hook infrastructure. Shipyard is a full project management platform; we just wanted its execution discipline.

#### From [Best Practice Config](https://github.com/9thLevelSoftware/best-practice-claude-code-config)

**Took: The plugin architecture and agent contract.**

Best Practice's `.claude/` directory structure (commands → skills → agents) is the canonical way to build Claude Code plugins. We adopted it wholesale: commands are entry points, skills are reusable logic, agents are personalities. Clean separation of concerns.

Best Practice's agent frontmatter schema (YAML with name, description, color, division) became our agent contract. Every one of our 51 agents follows this structure, which means the `agent-registry.md` can programmatically catalog and recommend agents based on structured metadata rather than parsing free-form text.

**Left behind:** Best Practice's RPI workflow (too domain-specific) and custom hooks infrastructure. We kept the architecture patterns and dropped the opinionated workflows.

#### From [Daem0n-MCP](https://github.com/9thLevelSoftware/Daem0n-MCP)

**Took: The semantic memory architecture.**

Daem0n-MCP proved that AI agents can learn across sessions through structured outcome tracking with importance scoring and time-based decay. We adopted its core memory primitives — store, recall, and decay — as our `memory-manager.md` skill. After each build/review cycle, outcomes are recorded with agent ID, task type, success/failure, and importance score. During future planning, past outcomes are queried to boost agent recommendations, weighted by a 4-bracket decay curve (1.0 for recent, down to 0.1 for old) so the system improves over time without getting stuck in historical patterns.

The key insight from Daem0n was computing decay at recall time rather than destructively aging stored data. This means the full outcome history is always preserved — you can audit every decision — while relevance scoring adapts naturally as time passes.

**Left behind:** Daem0n's hook-driven architecture (memory operations triggered automatically on every tool call) and MCP server dependency. Our memory layer is called explicitly by Agency workflows and stored as a single markdown table at `.planning/memory/OUTCOMES.md` — no server process, no hooks, no background sync. Everything degrades gracefully if the memory file doesn't exist.

### What The Agency Added

Beyond combining these five systems, The Agency Workflows introduced several original patterns:

- **Personality-first agents**: The 51 agent personalities aren't just role labels — they're 80-120 line character sheets with expertise, communication style, hard rules, and personality quirks. When an agent is spawned, it receives its *complete personality* as system instructions, not a generic "you are a backend developer" prompt.

- **Hybrid agent selection**: The workflow recommends agents based on task analysis (keyword matching, division affinity, past performance), but the user always confirms or overrides. No black-box assignment.

- **Domain-specific workflow detection**: When `/agency:plan` encounters marketing requirements (MKT-*) or design requirements (DSN-*), it automatically switches to domain-specific wave patterns and team assembly — campaign planning with content calendars for marketing, design systems with three-lens review for design — instead of forcing engineering patterns onto non-engineering work.

- **Graceful degradation everywhere**: GitHub integration, cross-session memory, brownfield analysis, marketing workflows, and design workflows are all opt-in features that activate when their prerequisites exist and skip silently when they don't. The core workflow (start → plan → build → review) works identically with or without any optional feature.

- **Cross-session memory with decay**: After each build/review cycle, outcomes are recorded with importance scores. During future planning, past outcomes boost agent recommendations — but with time-based decay (recent outcomes matter more), so the system doesn't get stuck in historical patterns.

### The Result

| Metric | GSD | Conductor | Shipyard | Best Practice | Daem0n | **Agency** |
|--------|-----|-----------|----------|---------------|--------|------------|
| Commands | 33+ | 15+ | 29 | 5 | N/A | **9** |
| Workflow files | 33+ | 20+ | 15+ | 8 | 3 | **15 skills** |
| Setup required | CLI install + config | Directory init | Hook setup | Copy files | MCP server | **Copy files** |
| Custom tooling | Node.js CLI | None | Shell hooks | None | MCP server | **None** |
| Agent personalities | None | None | None | Templates | None | **51 specialists** |
| Cross-session memory | None | None | None | None | Hook-driven | **Explicit, opt-in** |
| Domain workflows | Engineering only | Engineering only | Engineering only | Engineering only | N/A | **Eng + Marketing + Design** |
| State format | Markdown | JSON + Markdown | Markdown + JSON | Markdown | SQLite | **Markdown only** |

Nine commands. Fifteen skills. Zero custom tooling. Fifty-one personalities. Copy the directory and go.

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
  commands/agency/      <- 9 /agency: command entry points
  skills/agency/        <- 15 reusable workflow skills (7,191 lines)
    workflow-common.md  <- Shared constants, paths, conventions
    agent-registry.md   <- 51 agent catalog + recommendation algorithm
    questioning-flow.md <- 3-stage adaptive conversation engine
    phase-decomposer.md <- Phase decomposition with domain detection
    wave-executor.md    <- Parallel execution with personality injection
    execution-tracker.md <- Progress tracking + atomic commits
    review-loop.md      <- Dev-QA loop with structured feedback
    + 8 more (portfolio, milestone, memory, agents, GitHub, brownfield, marketing, design)
agency-agents/          <- 51 personality .md files by division
  engineering/          <- 7 agents
  design/               <- 6 agents
  marketing/            <- 8 agents
  testing/              <- 7 agents
  product/              <- 3 agents
  project-management/   <- 5 agents
  support/              <- 6 agents
  spatial-computing/    <- 6 agents
  specialized/          <- 3 agents
.planning/              <- Project state (generated per-project)
  templates/            <- Schema for generated files
  phases/               <- Phase plan and summary files
  milestones/           <- Archived milestone records
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
- **Graceful degradation**: Optional features (GitHub, memory, marketing, design) activate when available, skip silently when not

## Optional Features

These activate automatically when their prerequisites are met:

| Feature | Activates When | What It Does |
|---------|---------------|--------------|
| **GitHub Integration** | `gh` CLI authenticated + git remote exists | Links phases to issues, creates PRs, syncs milestones |
| **Cross-Session Memory** | `.planning/memory/OUTCOMES.md` exists | Boosts agent recommendations based on past performance |
| **Brownfield Analysis** | Existing codebase detected during `/agency:start` | Maps architecture, frameworks, risks before planning |
| **Marketing Workflows** | MKT-* requirements or marketing keywords in phase | Campaign planning, content calendars, channel coordination |
| **Design Workflows** | DSN-* requirements or design keywords in phase | Design systems, UX research, three-lens review (brand + accessibility + usability) |

## Requirements

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)
- No additional dependencies

## Contributing

See [`CONTRIBUTING.md`](agency-agents/CONTRIBUTING.md) for agent design guidelines.
