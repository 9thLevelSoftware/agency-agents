# Legion — Roadmap

## Milestones

- [x] **v1.0** — Core plugin with 9 commands, 15 skills, 51 agents, multi-domain workflows (14 phases, 30 plans, 54 requirements) → [Archive](milestones/v1.0-ROADMAP.md)
- [x] **v2.0** — Proper Claude Code plugin with advisory capabilities: manifest, restructured directories, installable via `claude plugin add`, plus strategic advisors, dynamic review panels, and plan critique (9 phases, 9 plans, 26 requirements) → [Archive](milestones/v2.0-ROADMAP.md)
- [x] **v3.0** — Legion rebrand: `/legion:` namespace, plugin manifest, rewritten docs, attribution, and repo rename (5 phases, 6 plans, 13 requirements) → [Archive](milestones/v3.0-ROADMAP.md)
- [ ] **v4.0** — Inspiration audit adoption: progressive disclosure, review quality, behavioral guardrails, planning intelligence, knowledge layer, execution resilience, consolidation audit (7 phases, 18 requirements)

## v4.0 — Inspiration Audit Adoption

**Goal:** Cherry-pick proven patterns from the best orchestration tools in the Claude Code ecosystem while maintaining Legion's core identity.

**Source:** [Inspiration Audit & Adoption Plan](../docs/plans/2026-03-02-inspiration-audit-and-adoption.md)

**Origins:** Conductor, Feature-dev, code-foundations, beads, Auto-Claude, bjarne, Puzld.ai

### Phase 29: Progressive Disclosure
**Goal:** Skills load as lightweight metadata at startup; full content injected only when activated — reducing context overhead from ~17,000 tokens to ~1,700 tokens at idle.
**Depends on:** Nothing (first v4.0 phase)
**Requirements:** PRG-01, PRG-02
**Success Criteria:**
1. All 17 SKILL.md files have valid YAML frontmatter with name, triggers, token_cost, and summary
2. `workflow-common` documents the Skill Loading Protocol with clear load-on-activate instructions
3. Each frontmatter summary is ≤100 tokens

### Phase 30: Review & Verification Quality
**Goal:** Reviews are confidence-filtered, tasks have machine-checkable verification, and review loops self-terminate when stuck.
**Depends on:** Nothing (parallel with Phase 29)
**Requirements:** REV-01, REV-02, REV-03
**Success Criteria:**
1. `review-loop` and `review-panel` contain explicit 80%+ confidence threshold with HIGH/MEDIUM/LOW classification
2. `phase-decomposer` task template includes `> verification:` format with example commands
3. `wave-executor` checks verification commands after task execution and blocks completion on failure
4. `review-loop` aborts after 3 iterations with no delta, outputs remaining issues and recommendations

### Phase 31: Behavioral Guardrails
**Goal:** Agents and workflows have explicit boundaries that prevent rationalization and overreach.
**Depends on:** Nothing (parallel with Phases 29-30)
**Requirements:** DSC-01, DSC-02
**Success Criteria:**
1. `testing-reality-checker` has a "Common Rationalizations I Reject" table with ≥5 entries
2. `engineering-senior-developer` has a similar table focused on code quality rationalizations
3. `CLAUDE.md` authority matrix clearly separates autonomous decisions from human-approval decisions

### Phase 32: Planning Intelligence
**Goal:** `/legion:plan` produces competing architecture proposals and can optionally run a spec pipeline before coding.
**Depends on:** Phase 29 (skill metadata for new spec-pipeline skill)
**Requirements:** PLN-01, PLN-02
**Success Criteria:**
1. `plan` command spawns 2-3 agents with labeled philosophies (minimal, clean, pragmatic) and presents trade-offs
2. User can select an approach or request a hybrid before planning proceeds
3. Spec pipeline skill exists with 5 clear stages (gather, research, write, critique, assess) and can be invoked before `/legion:build`

### Phase 33: Knowledge & Memory
**Goal:** The memory layer captures structured patterns, supports branch-aware context, and compacts completed work.
**Depends on:** Phase 31 (authority matrix defines autonomous boundaries for memory operations)
**Requirements:** KNW-01, KNW-02, KNW-03
**Success Criteria:**
1. `memory-manager` reads/writes PATTERNS.md (successful patterns → reuse criteria) and ERRORS.md (error signatures → known fixes)
2. Templates for PATTERNS.md and ERRORS.md exist in `.planning/memory/`
3. Memory state can be associated with git branches — context forks when branches fork, merges when branches merge
4. Completed phase summaries are AI-compacted: full reasoning preserved, verbose details trimmed, context freed

### Phase 34: Execution Resilience & Learning
**Goal:** Execution is self-healing (auto-remediation), token-efficient (output redirection), and learns from user preferences (DPO).
**Depends on:** Phase 30 (verification points feed DPO quality signal), Phase 33 (knowledge base stores preference data)
**Requirements:** EXE-01, EXE-02, EXE-03
**Success Criteria:**
1. When a user accepts, rejects, or edits a proposed file change, the delta is stored as a preference pair in `.planning/memory/`
2. Missing dependencies detected during execution auto-generate remediation tasks (install, configure) instead of failing
3. Commands known to produce verbose output (`npm install`, `pip install`, build tools) redirect stdout to temp files, check exit codes, and only surface errors

### Phase 35: Consolidation Audit
**Goal:** Comprehensive review of all commands, skills, and agent responsibilities to identify and resolve duplicative or conflicting functionalities — consolidate, merge, or remove anything that doesn't contribute to the plugin's overall quality.
**Depends on:** Phase 34 (all v4.0 feature work complete before audit)
**Requirements:** CON-01, CON-02, CON-03
**Plans:** 2/3 plans executed
Plans:
- [ ] 35-01-PLAN.md — Apply all consolidation fixes (3 agent rewrites + metadata/boundary fixes)
- [ ] 35-02-PLAN.md — Full re-scan verification and 35-AUDIT.md production
- [ ] 35-03-PLAN.md — Agent Teams conventions and Claude Code memory alignment documentation
**Success Criteria:**
1. Complete inventory of all 10 commands, 18 skills, and 51 agents with functional overlap analysis documented
2. Duplicative or conflicting functionalities identified, with resolution (merge, consolidate, or remove) applied for each
3. No two skills or commands serve the same purpose without clear differentiation; agent responsibilities have no unintentional overlap

## Phase Dependencies

```
Phase 29 (Progressive Disclosure) ──┐
                                     ├── Phase 32 (Planning Intelligence)
Phase 30 (Review Quality) ──────────┤
                                     ├── Phase 34 (Execution Resilience)
Phase 31 (Behavioral Guardrails) ────┤
                                     └── Phase 33 (Knowledge & Memory) ── Phase 34
                                                                              │
                                                                              └── Phase 35 (Consolidation Audit)
```

Phases 29, 30, 31 can execute in parallel (no dependencies).
Phase 32 depends on 29.
Phase 33 depends on 31.
Phase 34 depends on 30 + 33.
Phase 35 depends on 34 (full feature audit after all v4.0 work lands).

## Progress

| Phase | Requirements | Status |
|-------|-------------|--------|
| 29. Progressive Disclosure | PRG-01, PRG-02 | **Complete** |
| 30. Review & Verification | REV-01, REV-02, REV-03 | **Complete** |
| 31. Behavioral Guardrails | DSC-01, DSC-02 | **Complete** |
| 32. Planning Intelligence | PLN-01, PLN-02 | **Complete** |
| 33. Knowledge & Memory | KNW-01, KNW-02, KNW-03 | **Complete** |
| 34. Execution Resilience | EXE-01, EXE-02, EXE-03 | **Executed (pending review)** |
| 35. Consolidation Audit | CON-01, CON-02, CON-03 | **Planned** (3 plans) |
