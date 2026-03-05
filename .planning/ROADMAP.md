# Legion — Roadmap

## Milestones

- [x] **v1.0** — Core plugin with 9 commands, 15 skills, 51 agents, multi-domain workflows (14 phases, 30 plans, 54 requirements) → [Archive](milestones/v1.0-ROADMAP.md)
- [x] **v2.0** — Proper Claude Code plugin with advisory capabilities: manifest, restructured directories, installable via `claude plugin add`, plus strategic advisors, dynamic review panels, and plan critique (9 phases, 9 plans, 26 requirements) → [Archive](milestones/v2.0-ROADMAP.md)
- [x] **v3.0** — Legion rebrand: `/legion:` namespace, plugin manifest, rewritten docs, attribution, and repo rename (5 phases, 6 plans, 13 requirements) → [Archive](milestones/v3.0-ROADMAP.md)
- [x] **v4.0** — Inspiration audit adoption: progressive disclosure, review quality, behavioral guardrails, planning intelligence, knowledge layer, execution resilience, consolidation audit (7 phases, 13 plans, 18 requirements) → [Archive](milestones/v4.0-ROADMAP.md)
- [ ] **v5.0** — Production-grade architecture: Polymath integration, authority boundaries, intent-driven execution, two-wave parallelism, environment mapping, roster verification (5 phases, 32 requirements) → In Progress

---

## v5.0 — Production-Grade Architecture

### Phase 36: Polymath Integration

**Goal:** Create pre-flight alignment agent and explore command for crystallizing ideas before planning

**Requirements:** POLY-01 through POLY-06 (6 requirements)

**Success Criteria:**
1. User can run `/legion:explore` and enter structured exploration mode
2. Polymath researches domain before asking questions
3. Exploration produces clear decision: proceed to planning or refine further
4. `/legion:start` offers exploration option before creating PROJECT.md

**Phase Completion:** When explore command works end-to-end and integrates with start workflow

**Plans:** 3 plans in 2 waves

Plans:
- [x] 36-01-PLAN.md — Create Polymath agent personality and /legion:explore command
- [x] 36-02-PLAN.md — Build polymath-engine skill with research-first workflows
- [x] 36-03-PLAN.md — Integrate exploration into /legion:start workflow

---

### Phase 37: Authority Boundaries & Two-Wave Parallelism

**Goal:** Implement strict domain ownership and enhanced parallel execution model

**Requirements:** AUTH-01 through AUTH-05, WAVE-01 through WAVE-05 (10 requirements)

**Success Criteria:**
1. Authority matrix document exists with clear domain ownership
2. Wave executor injects authority constraints into agent prompts
3. Review panel deduplicates findings by file:line with severity prioritization
4. Two-wave pattern functional: Wave A (Build + Analysis), Wave B (Execution)
5. Parallel agents respect authority boundaries with zero conflicts

**Phase Completion:** When build command runs two-wave execution without authority conflicts

**Plans:** 5/5 plans complete

Plans:
- [x] 37-00-PLAN.md — Create Wave 0 test scaffolding (AUTH-01, AUTH-05, AUTH-03, WAVE-01)
- [x] 37-01-PLAN.md — Create authority matrix infrastructure (AUTH-01, AUTH-05)
- [x] 37-02-PLAN.md — Implement wave executor authority injection (AUTH-02, WAVE-01)
- [x] 37-03-PLAN.md — Add review panel deduplication and filtering (AUTH-03, AUTH-04)
- [x] 37-04-PLAN.md — Build two-wave pattern implementation (WAVE-02, WAVE-03, WAVE-04, WAVE-05)

---

### Phase 38: Intent-Driven Execution

**Goal:** Add semantic flags for targeted operations without full phase planning

**Requirements:** INTENT-01 through INTENT-06 (6 requirements)

**Success Criteria:**
1. `/legion:build --just-harden` summons Testing + Security divisions
2. `/legion:build --just-document` generates docs without implementation
3. `/legion:build --skip-frontend` drops UI tasks from wave plans
4. `/legion:review --just-security` runs security-only audit
5. Invalid flag combinations rejected with helpful errors

**Phase Completion:** When all semantic flags work correctly with smart team routing

**Plans:** 4 plans in 3 waves

Plans:
- [x] 38-00-PLAN.md — Create test scaffolding for intent flag parsing and validation
- [x] 38-01-PLAN.md — Build intent-teams.yaml registry and intent-router skill
- [x] 38-02-PLAN.md — Integrate intents into /legion:build command
- [x] 38-03-PLAN.md — Integrate --just-security into /legion:review command

**Phase Status:** ✓ COMPLETE — All 6 requirements (INTENT-01 through INTENT-06) satisfied

---

### Phase 39: Environment Mapping

**Goal:** Enhanced brownfield detection with automatic path enforcement

**Requirements:** ENV-01 through ENV-05 (5 requirements)

**Success Criteria:**
1. Codebase mapper generates `.planning/CODEBASE.md` with directory mappings
2. CODEBASE.md identifies standard locations (routes, tests, components)
3. Spec pipeline enforces paths when creating new files
4. Wave executor places files in correct existing directories
5. CODEBASE.md auto-updates when structure changes

**Phase Completion:** When new features are placed in correct directories per CODEBASE.md

---

### Phase 40: Roster Gap Analysis

**Goal:** Verify coverage for critical DevOps, SRE, and security roles

**Requirements:** ROSTER-01 through ROSTER-06 (6 requirements)

**Success Criteria:**
1. Agent registry can identify coverage gaps vs production-grade roles
2. SRE-equivalent roles verified (chaos, SLOs, runbooks)
3. Security-auditor roles verified (OWASP, STRIDE, PII)
4. Data-scientist coverage verified for AI projects
5. Gap analysis respects 52-agent limit

**Phase Completion:** When roster analysis runs and reports coverage status

---

## v5.0 Summary

| Metric | Count |
|--------|-------|
| Phases | 5 (36-40) |
| Requirements | 32 |
| New Commands | 1 (`/legion:explore`) |
| New Agents | 1 (Polymath) |
| Modified Skills | 5 (wave-executor, review-panel, codebase-mapper, spec-pipeline, agent-registry) |
| Modified Commands | 2 (`/legion:build`, `/legion:start`) |

**Estimated Complexity:** Medium — Natural fit with existing Legion architecture. Builds on v4.0 consolidation work.

---

*Last updated: 2026-03-05 — v5.0 roadmap created*
