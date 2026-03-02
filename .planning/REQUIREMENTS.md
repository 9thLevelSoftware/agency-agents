# Requirements: Legion — v4.0

**Defined:** 2026-03-02
**Core Value:** Cherry-pick proven patterns from the best orchestration tools in the Claude Code ecosystem while maintaining Legion's core identity (personality-first agents, wave execution, human-readable state).
**Source:** [Inspiration Audit & Adoption Plan](../docs/plans/2026-03-02-inspiration-audit-and-adoption.md)

## v4.0 Requirements

### Progressive Disclosure (PRG)

- [ ] **PRG-01**: All 17 skill SKILL.md files have YAML frontmatter with `name`, `triggers`, `token_cost`, and `summary` fields (~100 tokens each) for progressive loading
- [ ] **PRG-02**: `workflow-common` documents a "Skill Loading Protocol" — load metadata only at orchestrator startup, inject full content only when activated

### Review Quality (REV)

- [ ] **REV-01**: `review-loop` and `review-panel` skills include confidence threshold instruction — only surface findings at 80%+ confidence (HIGH), mention MEDIUM only if asked
- [ ] **REV-02**: `phase-decomposer` produces tasks with machine-checkable `> verification:` lines; `wave-executor` checks verifications after each task execution
- [ ] **REV-03**: `review-loop` includes stale loop detection — abort after 3 iterations with no measurable progress, report what remains and recommend manual intervention

### Discipline (DSC)

- [ ] **DSC-01**: `testing-reality-checker` and `engineering-senior-developer` agents include "Common Rationalizations I Reject" tables with pre-emptive rebuttals
- [ ] **DSC-02**: `CLAUDE.md` includes an authority matrix defining what agents can decide autonomously vs. what requires human confirmation

### Planning Intelligence (PLN)

- [ ] **PLN-01**: `/legion:plan` spawns 2-3 agents with different architectural philosophies (minimal, clean, pragmatic) to present competing approaches before the user selects one
- [ ] **PLN-02**: A spec creation pipeline (gather → research → write → critique → assess complexity) available as a skill that can run before coding phases

### Knowledge & Memory (KNW)

- [x] **KNW-01**: `memory-manager` skill supports `.planning/memory/PATTERNS.md` and `.planning/memory/ERRORS.md` templates alongside `OUTCOMES.md` for structured knowledge capture
- [x] **KNW-02**: Agent context supports git-native branching — memory state can branch and merge alongside code branches
- [x] **KNW-03**: Completed work gets AI-summarized (semantic compaction) preserving reasoning and decisions while freeing context for active work

### Execution Resilience (EXE)

- [x] **EXE-01**: Accepted/rejected/edited file proposals generate DPO preference pairs stored for future agent routing improvement
- [x] **EXE-02**: Missing dependencies and environment issues auto-generate setup tasks instead of blocking execution with unactionable errors
- [x] **EXE-03**: Noisy command output (`npm install`, build logs, etc.) is redirected to temp files with exit code checks, saving context tokens

## Traceability

| Requirement | Phase | Origin | Status |
|-------------|-------|--------|--------|
| PRG-01 | Phase 29 | Conductor (progressive disclosure) | Pending |
| PRG-02 | Phase 29 | Conductor (progressive disclosure) | Pending |
| REV-01 | Phase 30 | Feature-dev (confidence filtering) | Pending |
| REV-02 | Phase 30 | bjarne (verification points) | Pending |
| REV-03 | Phase 30 | bjarne (stale loop detection) | Pending |
| DSC-01 | Phase 31 | code-foundations (anti-rationalization) | Pending |
| DSC-02 | Phase 31 | Conductor (authority matrix) | Pending |
| PLN-01 | Phase 32 | Feature-dev (competing architectures) | Pending |
| PLN-02 | Phase 32 | Auto-Claude (spec pipeline) | Pending |
| KNW-01 | Phase 33 | Conductor (knowledge layer) | Pending |
| KNW-02 | Phase 33 | beads (git-native context) | Pending |
| KNW-03 | Phase 33 | beads (semantic compaction) | Pending |
| EXE-01 | Phase 34 | Puzld.ai (DPO extraction) | Pending |
| EXE-02 | Phase 34 | bjarne (environment remediation) | **Complete** |
| EXE-03 | Phase 34 | bjarne (output redirection) | **Complete** |

**Coverage:** 5/15 requirements satisfied (33%) — KNW-01, KNW-02, KNW-03, EXE-02, EXE-03 complete
