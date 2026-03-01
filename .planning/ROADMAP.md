# The Agency Workflows — Roadmap

## Phases

- [x] **Phase 1: Plugin Foundation** — Directory structure, agent registry, state management
- [x] **Phase 2: Project Initialization** — `/agency:start` with questioning flow and project scaffolding
- [x] **Phase 3: Phase Planning** — `/agency:plan` with agent recommendation and wave-structured plans
- [x] **Phase 4: Parallel Execution** — `/agency:build` with Teams-based agent spawning
- [x] **Phase 5: Quality Gates** — `/agency:review` with dev-QA loops and verification
- [x] **Phase 6: Status & Quick** — `/agency:status`, `/agency:quick`, session resume
- [x] **Phase 7: Portfolio Management** — Multi-project tracking, Studio Producer coordination
- [ ] **Phase 8: Milestone Management** — Milestone completion, archiving, metrics
- [ ] **Phase 9: Cross-Session Learning** — Pattern memory, rich session context restoration
- [ ] **Phase 10: Custom Agents** — Agent creation workflow, schema validation, registry auto-update
- [ ] **Phase 11: GitHub Integration** — Issue linking, PR creation, status sync
- [ ] **Phase 12: Brownfield Support** — Codebase mapping, dependency detection, risk assessment
- [ ] **Phase 13: Marketing Workflows** — Campaign planning, content calendars, cross-channel coordination
- [ ] **Phase 14: Design Workflows** — Design systems, UX research, design-specific review cycles

## Phase Details

### Phase 1: Plugin Foundation
**Goal**: Establish the .claude/ plugin structure and create the agent registry that maps all 51 personalities to capabilities.
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05
**Success Criteria**:
- `.claude/commands/agency/` exists with placeholder command files
- `.claude/skills/agency/` exists with core skills
- Agent registry skill can recommend agents given a task description
- `.planning/` template structure defined
- README explains installation
**Plans**: 2

### Phase 2: Project Initialization
**Goal**: Users can type `/agency:start` and go through a guided conversation that produces PROJECT.md and ROADMAP.md with recommended agents per phase.
**Requirements**: INIT-01, INIT-02, INIT-03, INIT-04, INIT-05
**Success Criteria**:
- `/agency:start` triggers questioning flow
- Questioning adapts based on user responses (not a rigid checklist)
- PROJECT.md captures vision, requirements, constraints, decisions
- ROADMAP.md includes phase breakdown with agent assignments
- User can configure workflow preferences (mode, depth, cost)
**Plans**: 2

### Phase 3: Phase Planning
**Goal**: Users can type `/agency:plan 1` and get wave-structured plans with recommended agents for that phase.
**Requirements**: PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-05
**Success Criteria**:
- `/agency:plan N` reads ROADMAP.md and decomposes phase N
- Agent recommendation presents relevant agents with rationale
- User can confirm, swap, or add agents
- Plans have max 3 tasks each, organized into dependency waves
- Plan files written to `.planning/phases/{N}/`
**Plans**: 2

### Phase 4: Parallel Execution
**Goal**: Users can type `/agency:build` and watch a team of agents execute plans in parallel, each operating in full character.
**Requirements**: EXEC-01, EXEC-02, EXEC-03, EXEC-04, EXEC-05, EXEC-06
**Success Criteria**:
- `/agency:build` reads current phase plans and launches agents
- Each agent receives its full personality .md as instructions
- Waves execute in order; within a wave, agents run in parallel
- STATE.md updated with progress after each plan completes
- Atomic git commits per completed plan
**Plans**: 3

### Phase 5: Quality Gates
**Goal**: Users can type `/agency:review` and trigger a review cycle where testing/QA agents evaluate the work with specific feedback.
**Requirements**: QA-01, QA-02, QA-03, QA-04, QA-05
**Success Criteria**:
- `/agency:review` selects appropriate review agents (Reality Checker, Evidence Collector, etc.)
- Reviewers provide specific, actionable feedback (not vague assessments)
- Fix loop: review → fix → re-review, max 3 cycles
- Phase not marked complete until review passes
- Escalation to user if 3 cycles fail
**Plans**: 2

### Phase 6: Status & Quick
**Goal**: Users can check progress with `/agency:status` and run ad-hoc tasks with `/agency:quick`.
**Requirements**: STATUS-01, STATUS-02, STATUS-03, STATUS-04
**Success Criteria**:
- `/agency:status` shows current phase, progress, blockers, next action
- `/agency:quick` runs a single task with agent selection
- New sessions can resume by reading STATE.md
- Status routes user to the right `/agency:` command
**Plans**: 2

### Phase 7: Portfolio Management
**Goal**: Users can manage multiple projects through a shared agent pool, with cross-project visibility and resource coordination.
**Requirements**: PORT-01, PORT-02
**Success Criteria**:
- Portfolio dashboard shows all active projects with status
- Studio Producer agent coordinates cross-project dependencies
- Agents can be shared/allocated across projects
**Plans**: 2

### Phase 8: Milestone Management
**Goal**: Users can mark milestones complete with summaries and archive completed work to reduce active state.
**Requirements**: MILE-01, MILE-02
**Success Criteria**:
- Milestone completion generates summary with metrics
- Archived milestones are accessible but don't clutter active state
- STATE.md and ROADMAP.md reflect milestone boundaries
**Plans**: TBD

### Phase 9: Cross-Session Learning
**Goal**: A lightweight "daem0n-lite" memory layer — Agency workflows explicitly store and recall outcomes to improve over time. Inspired by Daem0n-MCP's proven patterns (semantic memory, outcome tracking, importance scoring, decay) but passive and opt-in, not hook-driven.
**Requirements**: LEARN-01, LEARN-02, LEARN-03, LEARN-04, LEARN-05
**Success Criteria**:
- Memory skill provides store/recall/decay operations called explicitly by other workflows
- After build/review, outcomes recorded with agent ID, task type, success/failure, importance score
- During plan, past outcomes queried to boost agent recommendations (weighted by recency and success)
- Status/resume surfaces stored decision history alongside STATE.md
- All memory features degrade gracefully — zero breakage if memory layer is absent
**Plans**: TBD

### Phase 10: Custom Agents
**Goal**: Users can create new agent personalities through a guided workflow, with validation and automatic registry integration.
**Requirements**: CUSTOM-01, CUSTOM-02, CUSTOM-03
**Success Criteria**:
- Guided workflow produces valid agent .md files with proper frontmatter
- Schema validation enforces required fields and structure
- New agents automatically appear in agent-registry recommendations
**Plans**: TBD

### Phase 11: GitHub Integration
**Goal**: Project work connects to GitHub — phases link to issues, agents can create PRs, and progress syncs to GitHub milestones.
**Requirements**: GH-01, GH-02, GH-03
**Success Criteria**:
- Phases/tasks can be linked to GitHub issues
- Agents create PRs for completed work (via `gh` CLI)
- Project progress reflected in GitHub issues and milestones
**Plans**: TBD

### Phase 12: Brownfield Support
**Goal**: Before planning phases on an existing codebase, the system maps what's already there — patterns, frameworks, dependencies, and risk areas.
**Requirements**: BROWN-01, BROWN-02, BROWN-03
**Success Criteria**:
- Codebase analysis produces a structured map of existing architecture
- Detected patterns and conventions inform agent instructions
- Risk areas flagged before agent work begins
**Plans**: TBD

### Phase 13: Marketing Workflows
**Goal**: Marketing agents have structured workflows for campaign planning, content calendars, and cross-channel coordination — not just ad-hoc quick tasks.
**Requirements**: MKT-01, MKT-02, MKT-03
**Success Criteria**:
- Campaign planning workflow produces structured campaign documents
- Content calendar generation with time-based assignments
- Cross-channel alignment ensures consistent messaging
**Plans**: TBD

### Phase 14: Design Workflows
**Goal**: Design agents have structured workflows for design systems, UX research, and design-specific review cycles.
**Requirements**: DSN-01, DSN-02, DSN-03
**Success Criteria**:
- Design system workflow produces component libraries and guidelines
- UX research workflow supports planning and synthesis
- Design review cycle includes brand, accessibility, and usability checks
**Plans**: TBD

## Progress

| Phase | Plans | Completed | Status |
|-------|-------|-----------|--------|
| 1. Plugin Foundation | 2 | 2 | Complete |
| 2. Project Initialization | 2 | 2 | Complete |
| 3. Phase Planning | 2 | 2 | Complete |
| 4. Parallel Execution | 3 | 3 | Complete |
| 5. Quality Gates | 2 | 2 | Complete |
| 6. Status & Quick | 2 | 2 | Complete |
| 7. Portfolio Management | 2 | 2 | Complete |
| 8. Milestone Management | 2 | 1 | In Progress |
| 9. Cross-Session Learning | TBD | 0 | Pending |
| 10. Custom Agents | TBD | 0 | Pending |
| 11. GitHub Integration | TBD | 0 | Pending |
| 12. Brownfield Support | TBD | 0 | Pending |
| 13. Marketing Workflows | TBD | 0 | Pending |
| 14. Design Workflows | TBD | 0 | Pending |
