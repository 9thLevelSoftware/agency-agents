# The Agency Workflows — Requirements

## v1 Requirements

### Plugin Infrastructure (INFRA)

- [ ] INFRA-01: Create `.claude/commands/agency/` directory with command entry points
- [ ] INFRA-02: Create `.claude/skills/agency/` directory with reusable workflow skills
- [ ] INFRA-03: Create agent registry mapping all 51 agents by division, capability, and task type
- [ ] INFRA-04: Define `.planning/` state structure (PROJECT.md, ROADMAP.md, STATE.md)
- [ ] INFRA-05: Create plugin README with installation instructions

### Project Initialization (INIT)

- [x] INIT-01: `/agency:start` command — entry point for new projects
- [x] INIT-02: Questioning flow skill — adaptive questioning that explores vision before jumping to tech
- [x] INIT-03: PROJECT.md generation from questioning output
- [x] INIT-04: ROADMAP.md generation with phase breakdown and agent assignments
- [x] INIT-05: Workflow preferences collection (mode, depth, cost profile)

### Planning (PLAN)

- [x] PLAN-01: `/agency:plan` command — plans a specific phase
- [x] PLAN-02: Agent recommendation skill — analyzes phase tasks and recommends agents from the 51
- [x] PLAN-03: User confirmation gate — present recommended agents, allow override
- [x] PLAN-04: Phase decomposition into wave-structured plans (max 3 tasks per plan)
- [x] PLAN-05: Plan files written to `.planning/phases/{N}/`

### Execution (EXEC)

- [x] EXEC-01: `/agency:build` command — executes plans for current phase
- [x] EXEC-02: Agent spawning with full personality .md injection as system prompt
- [x] EXEC-03: Wave-based execution — complete wave N before starting wave N+1
- [x] EXEC-04: Parallel agent dispatch within waves using Claude Code Teams
- [x] EXEC-05: Progress tracking — update STATE.md after each plan completes
- [x] EXEC-06: Atomic commits per completed plan

### Quality Gates (QA)

- [x] QA-01: `/agency:review` command — triggers quality review cycle
- [x] QA-02: Review agent selection — maps task type to appropriate testing/review agents
- [x] QA-03: Specific actionable feedback — reviewers cite exact issues, not vague assessments
- [x] QA-04: Fix loop — max 3 cycles of review → fix → re-review before escalation
- [x] QA-05: Verification before completion — no phase marked done without passing review

### Status & Quick (STATUS)

- [ ] STATUS-01: `/agency:status` command — shows current progress and next action
- [ ] STATUS-02: `/agency:quick` command — lightweight single-task execution with agent selection
- [ ] STATUS-03: Session resume — read STATE.md to restore context on new session
- [ ] STATUS-04: Next-action routing — direct user to the right command based on project state

## v2 Requirements (Deferred)

- [ ] Multi-project portfolio management (Studio Producer agent coordination)
- [ ] Milestone completion and archiving
- [ ] Cross-session learning / pattern memory
- [ ] Custom agent creation workflow
- [ ] Integration with external tools (GitHub, Jira, etc.)
- [ ] Brownfield codebase mapping before planning
- [ ] Marketing-specific workflows (campaign planning, content calendars)
- [ ] Design-specific workflows (design system creation, UX research)

## Out of Scope

- Custom CLI tooling — no Node.js scripts, pure Claude Code primitives
- Board of directors governance — too heavy for v1
- Message bus / file-based IPC — use Teams' built-in coordination
- Complex checkpoint/rollback — git handles this naturally
- MCP server requirements — user brings their own

## Traceability

| Requirement | Phase |
|-------------|-------|
| INFRA-01 through INFRA-05 | Phase 1 |
| INIT-01 through INIT-05 | Phase 2 |
| PLAN-01 through PLAN-05 | Phase 3 |
| EXEC-01 through EXEC-06 | Phase 4 |
| QA-01 through QA-05 | Phase 5 |
| STATUS-01 through STATUS-04 | Phase 6 |
