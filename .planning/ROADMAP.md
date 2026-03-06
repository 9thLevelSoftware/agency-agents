# Legion v6.0 — Roadmap

## Milestones

- [x] **v1.0** — Core plugin with 9 commands, 15 skills, 51 agents, multi-domain workflows (14 phases, 30 plans, 54 requirements) → [Archive](milestones/v1.0-ROADMAP.md)
- [x] **v2.0** — Proper Claude Code plugin with advisory capabilities (9 phases, 9 plans, 26 requirements) → [Archive](milestones/v2.0-ROADMAP.md)
- [x] **v3.0** — Legion rebrand: `/legion:` namespace, plugin manifest, repo rename (5 phases, 6 plans, 13 requirements) → [Archive](milestones/v3.0-ROADMAP.md)
- [x] **v4.0** — Inspiration audit adoption: progressive disclosure, review quality, behavioral guardrails (7 phases, 13 plans, 18 requirements) → [Archive](milestones/v4.0-ROADMAP.md)
- [x] **v5.0** — Production-grade architecture: Polymath, authority boundaries, intent-driven execution (5 phases, 22 plans, 32 requirements) → [Archive](milestones/v5.0-ROADMAP.md)
- [ ] **v6.0** — Discipline & Intelligence: plan contracts, control modes, agent metadata, Polymath advanced modes (12 phases, ~30 plans, 31 requirements)

---

## Phases

- [x] Phase 1: Plan Schema Hardening (3 plans)
- [x] Phase 2: Wave Safety (2 plans)
- [x] Phase 3: Control Modes (3 plans)
- [ ] Phase 4: Observability (2 plans)
- [ ] Phase 5: Agent Metadata Enrichment (3 plans)
- [ ] Phase 6: Recommendation Engine v2 (3 plans)
- [ ] Phase 7: Validation & Conformance (3 plans)
- [ ] Phase 8: Codebase Mapper Enrichment (2 plans)
- [ ] Phase 9: Polymath Advanced Modes (3 plans)
- [ ] Phase 10: Authority & Conflict Resolution (2 plans)
- [ ] Phase 11: Intent Routing v2 (2 plans)
- [ ] Phase 12: Integration & Release (2 plans)

## Phase Details

### Phase 1: Plan Schema Hardening
**Goal**: Add `files_forbidden`, `expected_artifacts`, and mandatory `verification_commands` to the plan frontmatter schema, with plan-critique enforcement.
**Requirements**: DSC-01, DSC-02, DSC-03
**Recommended Agents**: engineering-senior-developer, testing-reality-checker, project-management-project-shepherd
**Success Criteria**:
- [ ] Plan template includes `files_forbidden` and `expected_artifacts` fields
- [ ] Plan-critique skill flags plans missing `verification_commands` as BLOCKER
- [ ] Existing plan examples updated to demonstrate new fields
- [ ] Tests validate schema enforcement
**Plans**: 3

### Phase 2: Wave Safety
**Goal**: Add file overlap detection in plan-critique for same-wave plans and establish `sequential_files` convention in wave metadata.
**Requirements**: DSC-04, DSC-05
**Recommended Agents**: engineering-backend-architect, testing-evidence-collector, project-management-project-shepherd
**Success Criteria**:
- [x] Plan-critique detects when two plans in the same wave list overlapping `files_modified` and flags BLOCKER
- [x] Wave metadata supports `sequential_files` list for single-agent access files
- [x] Wave executor respects `sequential_files` during dispatch
- [x] Tests cover overlap detection and sequential_files enforcement
**Plans**: 2

### Phase 3: Control Modes
**Goal**: Add `control_mode` setting with `autonomous`/`guarded`/`advisory`/`surgical` presets that adjust which authority matrix rules are active.
**Requirements**: CTL-01, CTL-02, CTL-03
**Recommended Agents**: engineering-senior-developer, testing-reality-checker, design-ux-architect
**Success Criteria**:
- [x] `settings.json` schema includes `control_mode` with 4 preset values
- [x] Each preset maps to specific authority matrix rule adjustments (documented)
- [x] Settings schema docs updated with mode descriptions and examples
- [x] Tests validate mode-to-authority mapping
**Plans**: 3

### Phase 4: Observability
**Goal**: Add decision logging to SUMMARY.md and cycle-over-cycle diff to REVIEW.md for improved trust and debuggability.
**Requirements**: OBS-01, OBS-02, OBS-03
**Recommended Agents**: engineering-senior-developer, testing-evidence-collector
**Success Criteria**:
- [ ] SUMMARY.md template includes "Agent Selection Rationale" section with recommendation scores
- [ ] REVIEW.md template includes "Cycle Delta" section showing what changed between review cycles
- [ ] Wave executor captures and writes structured decision data
- [ ] Tests verify decision log format and cycle diff output
**Plans**: 2

### Phase 5: Agent Metadata Enrichment
**Goal**: Add structured metadata fields (`languages`, `frameworks`, `artifact_types`, `review_strengths`) to all 53 agent frontmatter files.
**Requirements**: AGT-01
**Recommended Agents**: agents-orchestrator, engineering-senior-developer, testing-reality-checker
**Success Criteria**:
- [ ] All 53 agent .md files include `languages`, `frameworks`, `artifact_types`, `review_strengths` in frontmatter
- [ ] Metadata is accurate to each agent's described capabilities (not generic)
- [ ] Agent contract tests validate new required fields
- [ ] No agent personality text is altered — frontmatter only
**Plans**: 3

### Phase 6: Recommendation Engine v2
**Goal**: Update recommendation engine to score against enriched metadata, add `task_type` to outcome records, and implement archetype-weighted recommendation boosts.
**Requirements**: AGT-02, AGT-03, AGT-04
**Recommended Agents**: engineering-backend-architect, testing-evidence-collector, data-analytics-reporter
**Success Criteria**:
- [ ] `recommendation-engine.js` scores against `languages`, `frameworks`, `artifact_types` fields
- [ ] OUTCOMES.md schema includes `task_type` field per outcome record
- [ ] Recommendations weighted by archetype success rate from historical outcomes
- [ ] Recommendation engine tests cover new scoring paths with >90% coverage
**Plans**: 3

### Phase 7: Validation & Conformance
**Goal**: Add adapter schema conformance tests, cross-reference validation, lint-commands, and new adapter spec fields.
**Requirements**: VAL-01, VAL-02, VAL-03, VAL-04
**Recommended Agents**: testing-reality-checker, engineering-senior-developer, testing-api-tester
**Success Criteria**:
- [ ] Test suite validates all 9 adapters have required ADAPTER.md fields
- [ ] Cross-reference test verifies all command .md files reference existing skills and agents
- [ ] `lint-commands` test catches dead references and orphan tags
- [ ] ADAPTER.md spec includes `max_prompt_size` and `known_quirks` fields
- [ ] All 9 adapters updated with new fields
**Plans**: 3

### Phase 8: Codebase Mapper Enrichment
**Goal**: Enrich codebase-mapper skill output with dependency risk assessment and test coverage summary.
**Requirements**: MAP-01, MAP-02
**Recommended Agents**: engineering-senior-developer, testing-evidence-collector
**Success Criteria**:
- [ ] Codebase-mapper produces "Dependency Risk" section in CODEBASE.md (outdated, unmaintained, heavy deps)
- [ ] Codebase-mapper produces "Test Coverage" section in CODEBASE.md (coverage percentage, untested areas)
- [ ] Both sections degrade gracefully when data unavailable
- [ ] Tests validate enriched output format
**Plans**: 2

### Phase 9: Polymath Advanced Modes
**Goal**: Add onboard, compare, and debate modes to the Polymath agent and `/legion:explore` workflow.
**Requirements**: POLY-07, POLY-08, POLY-09
**Recommended Agents**: agents-orchestrator, engineering-senior-developer, design-ux-architect, testing-reality-checker
**Success Criteria**:
- [ ] `/legion:explore` offers mode selection: crystallize (existing), onboard, compare, debate
- [ ] Onboard mode guides structured codebase familiarization with progressive depth
- [ ] Compare mode produces structured comparison matrix with decision capture
- [ ] Debate mode supports adversarial exploration with winner tracking (DPO-inspired)
- [ ] All modes enforce structured choices (no open-ended questions)
**Plans**: 3

### Phase 10: Authority & Conflict Resolution
**Goal**: Add escalation automation protocol and agent-to-agent communication conventions for parallel execution handoffs.
**Requirements**: AUTH-06, AUTH-07
**Recommended Agents**: project-management-project-shepherd, engineering-backend-architect, testing-reality-checker
**Success Criteria**:
- [ ] Escalation protocol documented: when/how agents escalate out-of-scope decisions
- [ ] Agent-to-agent communication conventions defined for wave handoffs
- [ ] Authority matrix updated with escalation triggers
- [ ] Tests validate escalation protocol format
**Plans**: 2

### Phase 11: Intent Routing v2
**Goal**: Add natural language intent parsing and context-aware intent suggestions based on project state.
**Requirements**: INTENT-07, INTENT-08
**Recommended Agents**: engineering-ai-ml-engineer, engineering-senior-developer, testing-reality-checker
**Success Criteria**:
- [ ] Intent router parses natural language queries to command+flags (e.g., "fix the tests" → `/legion:review`)
- [ ] Context-aware suggestions consider current STATE.md position when recommending actions
- [ ] Existing intent tests extended for natural language inputs
- [ ] Fallback to explicit command when confidence is low
**Plans**: 2

### Phase 12: Integration & Release
**Goal**: Cross-phase regression testing, documentation updates, repo hygiene, and version bump to 6.0.0.
**Requirements**: REL-01, REL-02, REL-03, REL-04
**Recommended Agents**: project-management-studio-producer, testing-reality-checker, engineering-senior-developer
**Success Criteria**:
- [ ] All existing tests pass with v6.0 changes (no regressions)
- [ ] New features documented in CLAUDE.md agent/skill/command counts
- [ ] `.gitignore` includes `node_modules/`; `package.json` `files` field verified
- [ ] `package.json` version bumped to 6.0.0
- [ ] Checksums regenerated, release check passes
**Plans**: 2

## Progress

| Phase | Plans | Completed | Status |
|-------|-------|-----------|--------|
| 1 — Plan Schema Hardening | 3 | 3 | Complete |
| 2 — Wave Safety | 2 | 2 | Complete |
| 3 — Control Modes | 3 | 3 | Complete ✓ |
| 4 — Observability | 2 | 0 | Not started |
| 5 — Agent Metadata Enrichment | 3 | 0 | Not started |
| 6 — Recommendation Engine v2 | 3 | 0 | Not started |
| 7 — Validation & Conformance | 3 | 0 | Not started |
| 8 — Codebase Mapper Enrichment | 2 | 0 | Not started |
| 9 — Polymath Advanced Modes | 3 | 0 | Not started |
| 10 — Authority & Conflict Resolution | 2 | 0 | Not started |
| 11 — Intent Routing v2 | 2 | 0 | Not started |
| 12 — Integration & Release | 2 | 0 | Not started |
