# Legion

Orchestrate 51 AI specialist personalities as a coordinated legion.

> *"My name is Legion, for we are many."*

## What It Does

Turn 51 isolated agent personalities into a coordinated legion. Type `/legion:start`, describe what you want, and the system assembles the right team, plans the work, executes in parallel, and runs quality checks — with each agent operating in full character.

## Installation

### From GitHub (recommended)

```bash
# Step 1: Add the marketplace
claude plugin marketplace add 9thLevelSoftware/agency-agents

# Step 2: Install the plugin
claude plugin install legion
```

Or from inside the Claude Code TUI:
```
/plugin marketplace add 9thLevelSoftware/agency-agents
/plugin install legion
```

### Local development

```bash
git clone https://github.com/9thLevelSoftware/agency-agents.git
claude --plugin-dir ./agency-agents
```

### Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed
- No additional dependencies — pure Claude Code primitives

## Getting Started

1. Install the plugin (see above)
2. In any project directory, run `/legion:start`
3. Answer the guided questions — the system explores your vision before jumping to implementation
4. Review the generated PROJECT.md and ROADMAP.md
5. Run `/legion:plan 1` to plan the first phase with agent recommendations
6. Run `/legion:build` to execute with parallel agent teams
7. Run `/legion:review` for quality review
8. Repeat `/legion:plan N` → `/legion:build` → `/legion:review` for each phase

## Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/legion:start` | Initialize project with guided questioning | Run once at project start |
| `/legion:plan <N>` | Plan phase N with agent recommendations and wave-structured tasks | After start, or after completing a phase |
| `/legion:build` | Execute current phase with parallel agent teams | After planning a phase |
| `/legion:review` | Run QA review cycle with testing/QA agents | After building a phase |
| `/legion:status` | Show progress dashboard and route to next action | Anytime — routes you to the right command |
| `/legion:quick <task>` | Run ad-hoc task with intelligent agent selection | Anytime — for one-off tasks |
| `/legion:advise <topic>` | Get read-only expert consultation from any agent | Anytime — standalone advisory, no phase context needed |
| `/legion:portfolio` | Multi-project dashboard with dependency tracking | When managing multiple projects |
| `/legion:milestone` | Milestone completion, archiving, and metrics | At project milestones |
| `/legion:agent` | Create a new agent personality through guided workflow | When you need a specialist that doesn't exist |

## How It Works

```
/legion:start            Guided questioning → PROJECT.md + ROADMAP.md
       ↓
/legion:plan 1           Phase decomposition → Wave-structured plans + agent teams
       ↓                       ↓ (optional)
       ↓                 Plan critique → Pre-mortem + assumption hunting
       ↓
/legion:build            Parallel execution → Agents work in character, wave by wave
       ↓
/legion:review           Quality gate → Review → Fix → Re-review (max 3 cycles)
       ↓                       ↓ (optional)
       ↓                 Panel mode → 2-4 domain-weighted reviewers with rubrics
       ↓
/legion:plan 2 → ...     Repeat for each phase until project complete


/legion:advise <topic>   Standalone → Read-only expert consultation (any time)
/legion:quick <task>     Standalone → One-off task with agent selection (any time)
```

## Workflows

### Core Workflow: start → plan → build → review

The main loop for any project. Run through these four commands in order, repeating plan → build → review for each phase.

#### `/legion:start` — Project Initialization

Guides you through an adaptive conversation (5-8 exchanges) to capture project vision, requirements, and constraints before generating any plans.

**Key steps:**
1. Pre-flight check — detects existing projects and offers to reinitialize or continue
2. Brownfield detection — if an existing codebase is found, offers architecture analysis first
3. Vision exploration — 3-stage conversation: vision → requirements → constraints
4. Document generation — produces `PROJECT.md`, `ROADMAP.md`, and `STATE.md`
5. Portfolio registration — optionally registers the project in the global portfolio

**Produces:** `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`
**User interaction:** Guided Q&A throughout; confirms generated documents before finalizing

#### `/legion:plan <N>` — Phase Planning

Decomposes a roadmap phase into wave-structured plans with max 3 tasks each. Recommends agents from the 51-agent registry for each plan and gets your confirmation.

**Key steps:**
1. Parse or auto-detect the next unplanned phase
2. Generate phase context with goals, requirements, and success criteria
3. Decompose into plans with wave groupings (parallel within waves, sequential between)
4. Recommend agents per plan using the registry scoring algorithm (keyword match + division affinity + memory boost)
5. Detect domain-specific workflows (marketing → campaign planning, design → design systems)
6. *(Optional)* Run plan critique — pre-mortem analysis and assumption hunting with PASS/CAUTION/REWORK verdicts
7. Generate plan files with full task instructions

**Produces:** `.planning/phases/{NN}-{slug}/CONTEXT.md` and `{NN}-{PP}-PLAN.md` files
**User interaction:** Confirms agent recommendations; chooses whether to run plan critique; reviews critique findings if applicable

#### `/legion:build` — Phase Execution

Spawns agents with full personality injection to execute all plans for the current phase. Runs waves in parallel, tracks progress, and commits completed work.

**Key steps:**
1. Determine target phase from STATE.md or `--phase N` flag
2. Load all plan files for the phase
3. Execute plans wave by wave — agents within a wave run in parallel
4. Each agent receives its complete personality .md as system instructions plus task context
5. Track progress and produce summaries per plan
6. Commit completed work with atomic commits per plan

**Produces:** Implementation artifacts (code, config, docs) plus `{NN}-{PP}-SUMMARY.md` files
**User interaction:** Monitors progress; resolves blockers if agents get stuck

#### `/legion:review` — Quality Review

Selects appropriate review agents for the phase, runs a structured dev-QA loop (max 3 cycles), and marks the phase complete only after review passes.

**Key steps:**
1. Determine target phase and load build summaries
2. Choose review mode: **classic** (static agent mapping) or **panel** (dynamic multi-reviewer composition)
3. Select review agents — matched to what was built (code → Reality Checker, design → three-lens review, etc.)
4. Run review cycle: review → fix → re-review (capped at 3 cycles)
5. Mark phase complete on PASS; escalate to user after 3 failed cycles

**Produces:** Review findings, fix summaries, updated STATE.md
**User interaction:** Chooses review mode; reviews findings and approves fixes

---

### Navigation

#### `/legion:status` — Progress Dashboard

Single command to understand where the project is and what to do next. Reads all project state and displays a clear dashboard with session resume context.

**Key steps:**
1. Load project state (PROJECT.md, ROADMAP.md, STATE.md)
2. Display milestone progress, phase status, and recent outcomes
3. Route to the appropriate next command based on current state

**Produces:** Dashboard display (no file changes)
**User interaction:** Follow the suggested next action, or run any command

---

### Ad-hoc

#### `/legion:quick <task>` — One-off Task Execution

Run any task outside the normal phase workflow with automatic agent selection. No phase planning required.

**Key steps:**
1. Parse the task description from arguments
2. Score agents using the registry algorithm and recommend the best match
3. Spawn the selected agent with full personality injection
4. Return results with an optional commit

**Produces:** Task output plus optional commit
**User interaction:** Confirms agent selection; approves commit

#### `/legion:advise <topic>` — Expert Consultation

Get read-only strategic advice from any of the 51 agent personalities. The advisor can explore your codebase and ask clarifying questions but cannot modify any files.

**Key steps:**
1. Parse the topic (architecture, UX, marketing strategy, etc.)
2. Load project context from PROJECT.md if available (works without it too)
3. Score and recommend the best advisor agent for the topic
4. Spawn the advisor as a read-only Explore agent with full personality injection
5. Display structured advice: Assessment → Recommendations → Trade-offs → Next Steps
6. Offer interactive follow-up: ask another question, switch topics, or end session

**Produces:** Advisory output (no file changes, no state updates)
**User interaction:** Selects advisor agent; asks follow-up questions; ends session when satisfied

---

### Management

#### `/legion:portfolio` — Multi-Project Dashboard

Cross-project visibility when managing multiple Legion projects. Shows dependency tracking, agent allocation, and offers strategic coordination from the Studio Producer agent.

**Key steps:**
1. Load the global portfolio registry (`~/.claude/legion/portfolio.md`)
2. Display all registered projects with phase progress and health indicators
3. Show cross-project dependencies and shared agent allocation
4. Offer Studio Producer consultation for strategic coordination

**Produces:** Dashboard display; optional portfolio registry updates
**User interaction:** Reviews dashboard; requests strategic coordination if needed

#### `/legion:milestone` — Milestone Lifecycle

Handles the full milestone lifecycle: define milestone groupings, track status, mark milestones complete with summaries, and archive completed artifacts.

**Key steps:**
1. Load project state and detect current milestone context
2. Display milestone dashboard with phase-level progress
3. Offer operations: define milestones, view status, complete (with summary generation), archive

**Produces:** Updated ROADMAP.md, milestone summaries, archived phase directories
**User interaction:** Selects milestone operation; confirms completion and archiving

#### `/legion:agent` — Agent Creator

Create a new specialist agent when the 51 existing personalities don't cover your needs. Guided conversation produces a validated agent .md file and registers it in the catalog.

**Key steps:**
1. Adaptive conversation to define the agent's role, expertise, communication style, and hard rules
2. Show example agents for reference (engineering, testing, design)
3. Validate the frontmatter schema (name, description, color, division)
4. Generate the agent .md file in `agents/`
5. Register the new agent in agent-registry so it appears in future recommendations

**Produces:** New agent personality file in `agents/`, updated registry
**User interaction:** Guided Q&A; reviews and confirms the generated personality

## v2.0 Advisory Features

Three capabilities shipped in v2.0 that extend the core workflow with read-only analysis and multi-perspective review.

### Strategic Advisors (`/legion:advise`)

Lightweight expert consultation without the overhead of phase workflows or the risk of code changes.

- **Read-only by design** — advisors are spawned as Explore agents (tool-level enforcement: no Write, no Edit, no Bash)
- **Topic-based agent selection** — the registry algorithm scores all 51 agents against the topic and recommends the best match
- **Full personality injection** — the advisor operates in complete character with its specialist expertise, communication style, and hard rules
- **Project-aware** — loads PROJECT.md context when available, but works without it for pure domain expertise
- **Interactive follow-up** — after initial advice, continue with follow-up questions, switch topics, or end the session
- **No state changes** — advisory sessions never update STATE.md, ROADMAP.md, or any project files

### Dynamic Review Panels

Context-aware multi-perspective review teams that replace static reviewer mapping with dynamic composition.

- **2-4 reviewers** — panel size scales with domain complexity: 2 for single-domain, 3 for standard, 4 for cross-domain phases
- **Domain-weighted rubrics** — each reviewer evaluates against 3-5 non-overlapping criteria specific to their specialty (Production Readiness, Verification Completeness, Brand Consistency, etc.)
- **No criterion overlap** — rubric design ensures reviewers check different aspects of the work, not the same things from different angles
- **Diversity enforcement** — max 2 reviewers from the same division; at least one Testing agent on every panel
- **Cross-cutting synthesis** — findings are deduplicated across reviewers, hot spots identified (files flagged by 2+ reviewers), and an aggregate verdict computed
- **Panel vs. classic mode** — users choose during `/legion:review`; classic mode uses the original static phase-type-to-agent mapping

### Plan Critique

Pre-execution stress testing that catches plan weaknesses before agents start building.

- **Pre-mortem analysis** — assumes the phase has already failed and works backward to identify 3-5 specific failure scenarios with root causes, likelihood, and impact scores
- **Assumption hunting** — extracts 5-10 implicit assumptions from the plan, rates each by impact and evidence strength, and flags critical ones (high impact + weak evidence)
- **Three verdicts** — PASS (proceed), CAUTION (addressable risks, review mitigations), REWORK (plan needs revision)
- **Maps to plan sections** — every finding traces to a specific task in a specific plan file with an actionable mitigation or challenge action
- **Optional step** — activates when the user selects it during `/legion:plan`; does not run automatically
- **Read-only agents** — critique agents are spawned as Explore subagents to prevent plan modification

## Standing on the Shoulders of Giants

Legion didn't invent its patterns from scratch. It cherry-picked the best ideas from four proven Claude Code orchestration systems, combined them into something greater than the sum of its parts, and left behind the complexity that made each system hard to adopt.

### What We Took (and What We Left Behind)

#### The 51 Agent Personalities — [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents)

The 51 specialist personalities that power Legion originated in the agency-agents repository by msitarzewski. These are not generic role labels — they are 80-350 line character sheets with deep expertise, communication styles, hard rules, and personality quirks across 9 divisions. Legion builds orchestration, planning, and review workflows on top of these personalities, but the personalities themselves are the foundation everything else stands on.

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

**Left behind:** Daem0n's hook-driven architecture (memory operations triggered automatically on every tool call) and MCP server dependency. Our memory layer is called explicitly by Legion workflows and stored as a single markdown table at `.planning/memory/OUTCOMES.md` — no server process, no hooks, no background sync. Everything degrades gracefully if the memory file doesn't exist.

### What Legion Added

Beyond combining these five systems, Legion introduced several original patterns:

- **Personality-first agents**: The 51 agent personalities aren't just role labels — they're 80-350 line character sheets with expertise, communication style, hard rules, and personality quirks, all in a standardized emoji-headed format. When an agent is spawned, it receives its *complete personality* as system instructions, not a generic "you are a backend developer" prompt.

- **Hybrid agent selection**: The workflow recommends agents based on task analysis (keyword matching, division affinity, past performance), but the user always confirms or overrides. No black-box assignment.

- **Domain-specific workflow detection**: When `/legion:plan` encounters marketing requirements (MKT-*) or design requirements (DSN-*), it automatically switches to domain-specific wave patterns and team assembly — campaign planning with content calendars for marketing, design systems with three-lens review for design — instead of forcing engineering patterns onto non-engineering work.

- **Graceful degradation everywhere**: GitHub integration, cross-session memory, brownfield analysis, marketing workflows, and design workflows are all opt-in features that activate when their prerequisites exist and skip silently when they don't. The core workflow (start → plan → build → review) works identically with or without any optional feature.

- **Cross-session memory with decay**: After each build/review cycle, outcomes are recorded with importance scores. During future planning, past outcomes boost agent recommendations — but with time-based decay (recent outcomes matter more), so the system doesn't get stuck in historical patterns.

### The Result

| Metric | GSD | Conductor | Shipyard | Best Practice | Daem0n | **Legion** |
|--------|-----|-----------|----------|---------------|--------|------------|
| Commands | 33+ | 15+ | 29 | 5 | N/A | **10** |
| Workflow files | 33+ | 20+ | 15+ | 8 | 3 | **17 skills** |
| Setup required | CLI install + config | Directory init | Hook setup | Copy files | MCP server | **`plugin install`** |
| Custom tooling | Node.js CLI | None | Shell hooks | None | MCP server | **None** |
| Agent personalities | None | None | None | Templates | None | **51 specialists** |
| Cross-session memory | None | None | None | None | Hook-driven | **Explicit, opt-in** |
| Domain workflows | Engineering only | Engineering only | Engineering only | Engineering only | N/A | **Eng + Marketing + Design** |
| State format | Markdown | JSON + Markdown | Markdown + JSON | Markdown | SQLite | **Markdown only** |

Ten commands. Seventeen skills. Zero custom tooling. Fifty-one personalities. Install the plugin and go.

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

Browse the full roster in the [`agents/`](agents/) directory.

## Architecture

```
agency-agents/              <- Plugin root
├── .claude-plugin/
│   ├── plugin.json         <- Plugin manifest (name, version, author, keywords)
│   └── marketplace.json    <- Marketplace entry for `claude plugin marketplace add`
├── settings.json           <- Plugin settings (empty — multi-agent, not single-agent)
├── CLAUDE.md               <- Project instructions (injected into Claude Code context)
├── commands/               <- 10 /legion: command entry points
│   ├── start.md
│   ├── plan.md
│   ├── build.md
│   ├── review.md
│   ├── status.md
│   ├── quick.md
│   ├── advise.md
│   ├── portfolio.md
│   ├── milestone.md
│   └── agent.md
├── skills/                 <- 17 reusable workflow skills
│   ├── workflow-common/SKILL.md     <- Shared constants and conventions
│   ├── agent-registry/
│   │   ├── SKILL.md               <- Recommendation algorithm + team patterns
│   │   └── CATALOG.md             <- 51 agent catalog + task-type index
│   ├── questioning-flow/SKILL.md   <- 3-stage adaptive conversation
│   ├── phase-decomposer/SKILL.md   <- Phase decomposition with domain detection
│   ├── wave-executor/SKILL.md      <- Parallel execution with personality injection
│   ├── execution-tracker/SKILL.md  <- Progress tracking + atomic commits
│   ├── review-loop/SKILL.md        <- Dev-QA loop with structured feedback
│   ├── review-panel/SKILL.md       <- Dynamic multi-reviewer composition with rubrics
│   ├── plan-critique/SKILL.md      <- Pre-mortem analysis + assumption hunting
│   └── + 8 more (portfolio, milestone, memory, agents, GitHub, brownfield, marketing, design)
├── agents/                 <- 51 personality .md files (flat, with division in frontmatter)
│   ├── engineering-senior-developer.md
│   ├── design-ui-designer.md
│   ├── marketing-content-creator.md
│   ├── testing-reality-checker.md
│   └── ... (47 more)
└── .planning/              <- Project state (generated per-project, not part of plugin)
    ├── PROJECT.md
    ├── ROADMAP.md
    ├── STATE.md
    ├── phases/             <- Active phase plans and summaries
    └── archive/            <- Archived phases from completed milestones
```

## Design Principles

- **Personality-first**: Agent .md files are the source of truth for behavior
- **Pure Claude Code**: No custom tooling — skills, commands, and agents only
- **Human-readable state**: All planning files are markdown, readable without tools
- **Full personality injection**: Agents are spawned with their complete .md as instructions
- **Standardized format**: All 51 agents use Format A — emoji section headings, "Your" pronouns, 80-350 line range
- **Balanced cost**: Opus for planning, Sonnet for execution, Haiku for checks
- **Max 3 tasks per plan**: Keeps work focused and reviewable
- **Hybrid selection**: Workflow recommends agents, user confirms or overrides
- **Wave execution**: Plans grouped by dependency; parallel within waves, sequential between
- **Graceful degradation**: Optional features (GitHub, memory, marketing, design, panels, critique) activate when available, skip silently when not
- **Read-only advisory**: Consultation agents explore but never modify — tool-level enforcement via Explore subagent type
- **Domain-weighted review**: Each reviewer evaluates against non-overlapping criteria scoped to their expertise, not generic checklists

## Optional Features

These activate automatically when their prerequisites are met:

| Feature | Activates When | What It Does |
|---------|---------------|--------------|
| **GitHub Integration** | `gh` CLI authenticated + git remote exists | Links phases to issues, creates PRs, syncs milestones |
| **Cross-Session Memory** | `.planning/memory/OUTCOMES.md` exists | Boosts agent recommendations based on past performance |
| **Brownfield Analysis** | Existing codebase detected during `/legion:start` | Maps architecture, frameworks, risks before planning |
| **Marketing Workflows** | MKT-* requirements or marketing keywords in phase | Campaign planning, content calendars, channel coordination |
| **Design Workflows** | DSN-* requirements or design keywords in phase | Design systems, UX research, three-lens review (brand + accessibility + usability) |
| **Plan Critique** | User selects critique during `/legion:plan` | Pre-mortem analysis, assumption hunting, PASS/CAUTION/REWORK verdicts |
| **Review Panels** | User selects panel mode in `/legion:review` | 2-4 domain-weighted reviewers with non-overlapping rubrics |

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI
- No additional dependencies

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and agent design guidelines.

## License

MIT
