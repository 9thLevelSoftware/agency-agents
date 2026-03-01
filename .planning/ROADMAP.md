# The Agency Workflows — Roadmap

## Phases

- [x] **Phase 1: Plugin Foundation** — Directory structure, agent registry, state management
- [x] **Phase 2: Project Initialization** — `/agency:start` with questioning flow and project scaffolding
- [x] **Phase 3: Phase Planning** — `/agency:plan` with agent recommendation and wave-structured plans
- [x] **Phase 4: Parallel Execution** — `/agency:build` with Teams-based agent spawning
- [ ] **Phase 5: Quality Gates** — `/agency:review` with dev-QA loops and verification
- [ ] **Phase 6: Status & Quick** — `/agency:status`, `/agency:quick`, session resume

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

## Progress

| Phase | Plans | Completed | Status |
|-------|-------|-----------|--------|
| 1. Plugin Foundation | 2 | 2 | Complete |
| 2. Project Initialization | 2 | 2 | Complete |
| 3. Phase Planning | 2 | 2 | Complete |
| 4. Parallel Execution | 3 | 3 | Complete |
| 5. Quality Gates | 2 | 0 | Planned |
| 6. Status & Quick | 2 | 0 | Pending |
