# The Agency Workflows — Requirements

## v1 Requirements

### Plugin Infrastructure (INFRA)

- [x] INFRA-01: Create `.claude/commands/agency/` directory with command entry points
- [x] INFRA-02: Create `.claude/skills/agency/` directory with reusable workflow skills
- [x] INFRA-03: Create agent registry mapping all 51 agents by division, capability, and task type
- [x] INFRA-04: Define `.planning/` state structure (PROJECT.md, ROADMAP.md, STATE.md)
- [x] INFRA-05: Create plugin README with installation instructions

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

- [x] STATUS-01: `/agency:status` command — shows current progress and next action
- [x] STATUS-02: `/agency:quick` command — lightweight single-task execution with agent selection
- [x] STATUS-03: Session resume — read STATE.md to restore context on new session
- [x] STATUS-04: Next-action routing — direct user to the right command based on project state

### Portfolio Management (PORT)

- [x] PORT-01: Multi-project portfolio management — track multiple projects with shared agent pool
- [x] PORT-02: Studio Producer agent coordination — orchestrate cross-project dependencies and resources

### Milestone Management (MILE)

- [ ] MILE-01: Milestone completion — mark milestones done with summary and metrics
- [ ] MILE-02: Milestone archiving — archive completed milestone artifacts to reduce active state

### Cross-Session Learning (LEARN)

- [ ] LEARN-01: Memory skill — lightweight semantic memory inspired by Daem0n-MCP patterns (store, recall, decay) called explicitly by Agency workflows, not via hooks
- [ ] LEARN-02: Outcome recording — after build/review, store agent performance, task outcomes, and review findings with importance scoring
- [ ] LEARN-03: Pattern recall — during plan/agent selection, query past outcomes to improve recommendations (falls back to registry algorithm if no memory available)
- [ ] LEARN-04: Session briefing — richer resume via stored decision history and recent outcomes, enhancing STATUS.md-only restore
- [ ] LEARN-05: Graceful degradation — all memory integration is optional; workflows function identically without it

### Custom Agents (CUSTOM)

- [ ] CUSTOM-01: Agent creation workflow — guided flow to define new agent personalities
- [ ] CUSTOM-02: Agent schema and validation — enforce frontmatter structure, required fields
- [ ] CUSTOM-03: Registry auto-update — new agents automatically registered in agent-registry

### GitHub Integration (GH)

- [ ] GH-01: GitHub issue tracking — link phases/tasks to GitHub issues
- [ ] GH-02: PR creation — agents can create PRs for their work
- [ ] GH-03: GitHub status sync — reflect project progress in GitHub (issues, milestones)

### Brownfield Support (BROWN)

- [ ] BROWN-01: Codebase mapping — analyze existing codebase before planning phases
- [ ] BROWN-02: Dependency detection — identify existing patterns, frameworks, conventions
- [ ] BROWN-03: Risk assessment — flag areas of complexity or technical debt before agent work

### Marketing Workflows (MKT)

- [ ] MKT-01: Campaign planning workflow — structured campaign creation with marketing agents
- [ ] MKT-02: Content calendar generation — time-based content planning with assignments
- [ ] MKT-03: Cross-channel coordination — align messaging across social, email, web

### Design Workflows (DSN)

- [ ] DSN-01: Design system creation — structured design system workflow with design agents
- [ ] DSN-02: UX research workflow — user research planning and synthesis
- [ ] DSN-03: Design review cycle — design-specific quality gates (brand, accessibility, usability)

## Out of Scope

- Custom CLI tooling — no Node.js scripts, pure Claude Code primitives
- Board of directors governance — too heavy
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
| PORT-01 through PORT-02 | Phase 7 |
| MILE-01 through MILE-02 | TBD |
| LEARN-01 through LEARN-05 | TBD |
| CUSTOM-01 through CUSTOM-03 | TBD |
| GH-01 through GH-03 | TBD |
| BROWN-01 through BROWN-03 | TBD |
| MKT-01 through MKT-03 | TBD |
| DSN-01 through DSN-03 | TBD |
