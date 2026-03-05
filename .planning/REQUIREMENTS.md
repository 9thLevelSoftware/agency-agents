# Requirements: Legion v5.0 — Production-Grade Architecture

**Defined:** 2026-03-05  
**Core Value:** Integrate proven production-grade architectural concepts while preserving Legion's multi-runtime flexibility and 52-agent versatility

---

## v1 Requirements

### Polymath Integration (POLY)

Pre-flight alignment agent with structured exploration modes.

- [ ] **POLY-01:** User can invoke `/legion:explore` to enter pre-flight alignment mode
- [ ] **POLY-02:** Polymath agent researches domain via available tools before asking questions
- [ ] **POLY-03:** Polymath detects knowledge gaps in user request and offers structured clarification
- [ ] **POLY-04:** Exploration produces crystallized PROJECT.md or continues to `/legion:start`
- [ ] **POLY-05:** All Polymath interactions are structured (arrow keys + Enter), no open-ended questions
- [ ] **POLY-06:** `/legion:start` asks: "Explore first with Polymath, or jump straight to planning?"

### Authority Boundaries (AUTH)

Strict domain ownership preventing agent conflicts during parallel execution.

- [x] **AUTH-01:** Authority matrix defines exclusive domains per agent (security-engineer owns OWASP, SRE owns SLOs, etc.)
- [x] **AUTH-02:** Wave executor injects authority constraints into agent system prompts
- [x] **AUTH-03:** Review panel deduplicates findings by file:line, keeping highest severity
- [x] **AUTH-04:** Review panel discards out-of-domain critiques (code-reviewer security findings when security-engineer is active)
- [x] **AUTH-05:** Authority matrix is human-readable (YAML/JSON) in `.planning/` or skills

### Intent-Driven Execution (INTENT)

Semantic flags for targeted operations without full phase plans.

- [ ] **INTENT-01:** `/legion:build --just-harden` summons Testing and Security divisions for audit
- [ ] **INTENT-02:** `/legion:build --just-document` generates documentation without implementation
- [ ] **INTENT-03:** `/legion:build --skip-frontend` dynamically drops UI-related tasks from wave plans
- [ ] **INTENT-04:** `/legion:review --just-security` runs only security audit (STRIDE + OWASP)
- [ ] **INTENT-05:** Semantic flags map to predefined team templates in agent-registry
- [ ] **INTENT-06:** Invalid flag combinations are rejected with helpful error messages

### Two-Wave Parallelism (WAVE)

Enhanced execution model with distinct build/analysis and execution waves.

- [x] **WAVE-01:** Wave executor supports two-wave pattern: Wave A (Build + Analysis parallel), Wave B (Execution parallel)
- [ ] **WAVE-02:** Wave A spawns dynamic agents per service/page group based on architecture
- [ ] **WAVE-03:** Wave B executes tests, audits, and reviews against Wave A outputs
- [ ] **WAVE-04:** Remediation phase runs parallel to final validation (SRE chaos, Data Scientist)
- [ ] **WAVE-05:** Gates exist between waves: Requirements → Architecture → Production Readiness

### Environment Mapping (ENV)

Enhanced brownfield detection with workspace path enforcement.

- [ ] **ENV-01:** Codebase mapper generates `.planning/CODEBASE.md` with directory structure mapping
- [ ] **ENV-02:** CODEBASE.md identifies where routes, tests, components, and infrastructure live
- [ ] **ENV-03:** Spec pipeline enforces deliverable paths based on CODEBASE.md mappings
- [ ] **ENV-04:** Wave executor places new files in correct existing directories (not isolated stubs)
- [ ] **ENV-05:** CODEBASE.md is automatically updated when new directories are created

### Roster Gap Analysis (ROSTER)

Verify coverage for critical DevOps and security roles.

- [x] **ROSTER-01:** Agent registry identifies gaps between existing 52 agents and production-grade roles
- [x] **ROSTER-02:** SRE-equivalent coverage verified (SLOs, chaos engineering, runbooks)
- [x] **ROSTER-03:** Security-auditor coverage verified (OWASP, STRIDE, PII compliance)
- [x] **ROSTER-04:** Data-scientist coverage verified for AI/ML projects
- [x] **ROSTER-05:** If gaps found, `/legion:agent` workflow generates missing specialists
- [x] **ROSTER-06:** Roster analysis respects 52-agent limit — no inflation beyond

---

## v2 Requirements (Future)

### Advanced Polymath Modes

- **POLY-07:** Onboard mode — Polymath explains unfamiliar codebase
- **POLY-08:** Compare mode — Stack comparison across frameworks
- **POLY-09:** Debate mode — Present options with winner tracking

### Conflict Resolution Automation

- **AUTH-06:** Automatic escalation when authority boundaries violated
- **AUTH-07:** Agent-to-agent communication for boundary clarification

### Enhanced Intent Routing

- **INTENT-07:** Natural language intent parsing ("harden this codebase" → --just-harden)
- **INTENT-08:** Context-aware flag suggestions based on project state

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native Teams-only state | Legion keeps human-readable markdown alongside Teams |
| CEO/CTO metaphor | Too abstract — Legion uses direct commands |
| 14-agent fixed roster | Legion adapts agent count to project needs (52 max) |
| Custom CLI tooling | Violates "pure Claude Code primitives" constraint |
| 50-iteration QA loops | Anti-pattern — if 3-5 don't fix it, problem is systemic |
| Automatic pipeline triggers | Human approval required at gates |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| POLY-01 | Phase 36 | Pending |
| POLY-02 | Phase 36 | Pending |
| POLY-03 | Phase 36 | Pending |
| POLY-04 | Phase 36 | Pending |
| POLY-05 | Phase 36 | Pending |
| POLY-06 | Phase 36 | Pending |
| AUTH-01 | Phase 37 | Complete |
| AUTH-02 | Phase 37 | Complete |
| AUTH-03 | Phase 37 | Complete |
| AUTH-04 | Phase 37 | Complete |
| AUTH-05 | Phase 37 | Complete |
| INTENT-01 | Phase 38 | Pending |
| INTENT-02 | Phase 38 | Pending |
| INTENT-03 | Phase 38 | Pending |
| INTENT-04 | Phase 38 | Pending |
| INTENT-05 | Phase 38 | Pending |
| INTENT-06 | Phase 38 | Pending |
| WAVE-01 | Phase 37 | Complete |
| WAVE-02 | Phase 37 | Complete |
| WAVE-03 | Phase 37 | Complete |
| WAVE-04 | Phase 37 | Complete |
| WAVE-05 | Phase 37 | Complete |
| ENV-01 | Phase 39 | Complete |
| ENV-02 | Phase 39 | Complete |
| ENV-03 | Phase 39 | Complete |
| ENV-04 | Phase 39 | Complete |
| ENV-05 | Phase 39 | Complete |
| ROSTER-01 | Phase 40 | Complete |
| ROSTER-02 | Phase 40 | Complete |
| ROSTER-03 | Phase 40 | Complete |
| ROSTER-04 | Phase 40 | Complete |
| ROSTER-05 | Phase 40 | Complete |
| ROSTER-06 | Phase 40 | Complete |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0 ✓

---

*Requirements defined: 2026-03-05*  
**Phase 40 Completion:** All 6 ROSTER requirements satisfied. 
- Created: engineering-security-engineer, product-technical-writer
- Gap analysis engine: GAP_ANALYSIS.md
- Tests: 47 roster gap analysis tests
- Status: Production-grade coverage verified ✓

---

*Last updated: 2026-03-05 after research synthesis*
