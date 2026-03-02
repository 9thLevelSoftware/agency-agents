# Project State

## Current Position
- **Phase**: 12 of 14 (executed)
- **Status**: Phase 12 complete — 2 plans executed successfully
- **Last Activity**: Phase 12 execution (2026-03-01)

## Progress
```
[########################] 100% — 26/26 plans complete (phases 13-14 not yet planned)
```

## Phase 1 Results
- Plan 01-01 (Wave 1): Plugin skeleton — 6 commands, workflow-common skill, CLAUDE.md
- Plan 01-02 (Wave 2): Agent registry (278 lines, 51 agents), 3 templates, README

## Phase 2 Results
- Plan 02-01 (Wave 1): Questioning flow skill (255 lines) — 3-stage adaptive conversation engine with output mapping
- Plan 02-02 (Wave 2): Full /agency:start implementation (103 lines) — 9-step process wiring skills + templates

## Phase 3 Results
- Plan 03-01 (Wave 1): Phase-decomposer skill (503 lines) — 8-section decomposition engine with plan file template and agent recommendation
- Plan 03-02 (Wave 2): Full /agency:plan implementation (10-step process) — wires all 3 skills with auto-detect and confirmation gates

## Phase 4 Results
- Plan 04-01 (Wave 1): Wave-executor skill (475 lines) — parallel execution engine with personality injection and 8 error scenarios
- Plan 04-02 (Wave 1): Execution-tracker skill (240 lines) — progress tracking with STATE.md updates, ROADMAP.md progress, atomic git commits
- Plan 04-03 (Wave 2): Full /agency:build implementation (228 lines) — 6-step process wiring wave-executor + execution-tracker with confirmation gate

## Phase 5 Results
- Plan 05-01 (Wave 1): Review-loop skill (685 lines) — 9-section dev-QA loop engine with structured feedback, fix routing, and escalation
- Plan 05-02 (Wave 2): Full /agency:review implementation (315 lines) — 6-step process wiring review-loop + execution-tracker with agent selection, 3-cycle loop, and escalation

## Phase 7 Results
- Plan 07-01 (Wave 1): Portfolio-manager skill (328 lines) — 6-section registry, CRUD, state aggregation, dependencies, agent allocation + workflow-common and start.md updates
- Plan 07-02 (Wave 2): Full /agency:portfolio implementation (245 lines) — 8-step dashboard with health indicators, dependency tracking, Studio Producer integration, manual registration

## Phase 8 Results
- Plan 08-01 (Wave 1): Milestone-tracker skill (434 lines) — 6-section milestone management with format, definition, completion, archiving, metrics, error handling + workflow-common and execution-tracker updates
- Plan 08-02 (Wave 2): Full /agency:milestone command (241 lines) — 7-step lifecycle process + status.md milestone integration + MILE-01/02 complete

## Phase 6 Results
- Plan 06-01 (Wave 1): Full /agency:status implementation (134 lines) — 6-step dashboard with progress bar, phase history, session resume, deterministic next-action routing
- Plan 06-02 (Wave 1): Full /agency:quick implementation (182 lines) — 7-step ad-hoc task execution with agent selection, personality injection, optional commit

## Pre-existing Issues
- ~~2 spatial-computing agents lack YAML frontmatter~~ — Fixed (2026-03-01)
- ~~INFRA-01 through INFRA-05 unchecked in REQUIREMENTS.md~~ — Fixed (2026-03-01)
- ~~build.md missing AskUserQuestion in allowed-tools~~ — Fixed (2026-03-01)
- ~~status.md missing execution-tracker in execution_context~~ — Fixed (2026-03-01)

## Phase 9 Results
- Plan 09-01 (Wave 1): Memory-manager skill (351 lines) — 7-section memory layer with outcome format, store/recall/decay, graceful degradation + workflow-common and execution-tracker updates
- Plan 09-02 (Wave 2): Outcome recording in build.md, review.md, agent-registry.md — memory integration for execution, review, and recommendation workflows
- Plan 09-03 (Wave 2): Pattern recall in phase-decomposer.md, session briefing in status.md, memory-manager in plan.md + REQUIREMENTS.md/CLAUDE.md updates

## Recent Decisions
- Plugin format: Claude Code .claude/ directory structure
- Full personality injection for all agent spawns
- /agency: namespace for all commands
- Minimal state: PROJECT.md + ROADMAP.md + STATE.md
- Balanced cost: Opus planning, Sonnet execution
- Hybrid agent selection: recommend → confirm
- Adaptive questioning: vision-first, 3-stage flow, 5-8 exchanges target
- Template-driven generation: skills produce data, templates define structure
- Two-skill split for execution: wave-executor (spawning/coordination) + execution-tracker (progress/commits)
- Parallel dispatch via Claude Code Teams (TeamCreate + team_name + SendMessage) — preserves coordinator context
- Global portfolio registry at ~/.claude/agency/portfolio.md — outside project directories
- /agency:portfolio as separate command from /agency:status — single-responsibility
- Read-time state aggregation — no background sync, always fresh
- Studio Producer analysis is opt-in on demand (Opus cost)
- Milestones placed between Phase Details and Progress in ROADMAP.md
- Plan percentage as primary milestone metric (finer than phase count)
- 10-char milestone progress bar (vs 20-char project bar)
- Milestone command follows portfolio.md structure with 7-step action loop
- Status milestone section conditional — omitted when milestones not defined
- Milestone boundary routing (e2) takes priority over generic next-phase routing
- Memory stored as single markdown table at .planning/memory/OUTCOMES.md — consistent with all Agency state
- Decay computed at recall time (1.0/0.7/0.4/0.1 by age bracket), never destructively applied
- Memory boosts supplement but never override agent-registry recommendation algorithm
- All memory integration guarded by file existence checks — graceful degradation
- Custom agents project-scoped in agency-agents/{division}/ — consistent with built-in agents
- /agency:agent as single-word command — consistent with existing command naming convention
- Custom Division table in agent-registry.md — custom agents auto-eligible for recommendation algorithm

## Phase 10 Results
- Plan 10-01 (Wave 1): Agent-creator skill (411 lines) — 7-section guided creation engine with schema validation, file generation, registry update + workflow-common custom division support
- Plan 10-02 (Wave 2): Full /agency:agent command (119 lines) — 8-step process wiring agent-creator + agent-registry + workflow-common with git commit + CLAUDE.md/REQUIREMENTS.md updates

## Phase 11 Results
- Plan 11-01 (Wave 1): github-sync skill (678 lines) — 8-section GitHub operations engine with prerequisites, issue management, PR creation, milestone sync, status readback, state linking, error handling, graceful degradation + workflow-common GitHub Conventions section
- Plan 11-02 (Wave 2): GitHub integration wired into 5 commands (plan, build, status, review, milestone) + execution-tracker PR convention + CLAUDE.md/REQUIREMENTS.md updates

## Phase 12 Results
- Plan 12-01 (Wave 1): Codebase-mapper skill (380+ lines) — 6-section brownfield analysis engine with source detection, language analysis, framework detection, risk assessment, CODEBASE.md output format, and plan integration guidance
- Plan 12-02 (Wave 2): Workflow integration — start.md brownfield detection branch (step 2, 3 user options), plan.md CODEBASE.md context injection (Risk Areas, Agent Guidance, Conventions, Detected Stack) + CLAUDE.md/REQUIREMENTS.md updates

## Recent Decisions
- Plugin format: Claude Code .claude/ directory structure
- Full personality injection for all agent spawns
- /agency: namespace for all commands
- Minimal state: PROJECT.md + ROADMAP.md + STATE.md
- Balanced cost: Opus planning, Sonnet execution
- Hybrid agent selection: recommend → confirm
- Adaptive questioning: vision-first, 3-stage flow, 5-8 exchanges target
- Template-driven generation: skills produce data, templates define structure
- Two-skill split for execution: wave-executor (spawning/coordination) + execution-tracker (progress/commits)
- Parallel dispatch via Claude Code Teams (TeamCreate + team_name + SendMessage) — preserves coordinator context
- Global portfolio registry at ~/.claude/agency/portfolio.md — outside project directories
- /agency:portfolio as separate command from /agency:status — single-responsibility
- Read-time state aggregation — no background sync, always fresh
- Studio Producer analysis is opt-in on demand (Opus cost)
- Milestones placed between Phase Details and Progress in ROADMAP.md
- Plan percentage as primary milestone metric (finer than phase count)
- 10-char milestone progress bar (vs 20-char project bar)
- Milestone command follows portfolio.md structure with 7-step action loop
- Status milestone section conditional — omitted when milestones not defined
- Milestone boundary routing (e2) takes priority over generic next-phase routing
- Memory stored as single markdown table at .planning/memory/OUTCOMES.md — consistent with all Agency state
- Decay computed at recall time (1.0/0.7/0.4/0.1 by age bracket), never destructively applied
- Memory boosts supplement but never override agent-registry recommendation algorithm
- All memory integration guarded by file existence checks — graceful degradation
- Custom agents project-scoped in agency-agents/{division}/ — consistent with built-in agents
- /agency:agent as single-word command — consistent with existing command naming convention
- Custom Division table in agent-registry.md — custom agents auto-eligible for recommendation algorithm
- One issue per phase, one PR per phase — phases are the meaningful tracking unit
- Issue creation automatic (plan.md), PR creation confirmable (build.md) — low-risk vs high-risk
- STATE.md ## GitHub section stores linking metadata — centralized, not scattered in plan frontmatters
- Live status queries for dashboard — never rely on stale STATE.md values for GitHub status
- "agency" label auto-created on first issue — no setup required
- Branch management: offer agency/phase-{NN}-{slug} if on default branch, respect existing feature branches
- All GitHub operations use graceful degradation — identical to Memory Conventions pattern
- Brownfield detection is opt-in via AskUserQuestion — never forced, consistent with Agency's guided workflow pattern
- All brownfield operations use graceful degradation — skip silently when CODEBASE.md is absent
- Stale CODEBASE.md (>30 days) warns but does not block — user decides when to re-analyze

## Next Action
Run `/agency:plan 13` to begin Phase 13: Marketing Workflows.
