# Phase 30: Review & Verification Quality -- Context

## Phase Goal
Reviews are confidence-filtered, tasks have machine-checkable verification, and review loops self-terminate when stuck.

## Requirements Covered
- REV-01: `review-loop` and `review-panel` skills include confidence threshold instruction — only surface findings at 80%+ confidence (HIGH), mention MEDIUM only if asked
- REV-02: `phase-decomposer` produces tasks with machine-checkable `> verification:` lines; `wave-executor` checks verifications after each task execution
- REV-03: `review-loop` includes stale loop detection — abort after 3 iterations with no measurable progress, report what remains and recommend manual intervention

## What Already Exists (from prior phases)

### Phase 29 Output (Complete)
- All 17 SKILL.md files have YAML frontmatter with `name`, `triggers`, `token_cost`, and `summary`
- `workflow-common` documents the Skill Loading Protocol

### Existing Review Infrastructure
- `review-loop` (skills/review-loop/SKILL.md): 9-section review engine with 3-cycle limit, structured Finding format (BLOCKER/WARNING/SUGGESTION), fix routing, escalation path
- `review-panel` (skills/review-panel/SKILL.md): Dynamic panel composition, domain rubrics, cross-cutting synthesis
- Both already enforce structured feedback format and severity classification
- Both already have max 3 cycle limit — but no delta tracking between cycles

### Existing Plan/Execution Infrastructure
- `phase-decomposer` (skills/phase-decomposer/SKILL.md): 8-section decomposition engine with `<verify>` blocks in task template containing bash commands
- `wave-executor` (skills/wave-executor/SKILL.md): 6-section execution engine with SendMessage-based result collection, verification step reporting
- Both already have verification concepts — but no inline `> verification:` format and no execution-time blocking on verification failure

## Key Design Decisions

### Why 2 plans in a single wave?
The 4 files split cleanly into two non-overlapping groups:
1. Review skills (review-loop + review-panel) — confidence filtering and stale detection
2. Planning/execution skills (phase-decomposer + wave-executor) — verification format and enforcement

No dependencies between groups — they modify different files and address different concerns.

### Why autonomous?
All 4 targets are markdown skill files. No code, no tests, no cross-division coordination needed. Direct editing is fastest.

### Design approach: Additive, not disruptive
- Confidence filtering is ADDED to existing Finding format — not replacing severity
- `> verification:` is ADDED alongside existing `<verify>` blocks — complementary formats
- Stale loop detection EXTENDS the existing 3-cycle limit — doesn't replace it
- Verification blocking ENHANCES wave-executor's existing result processing — doesn't restructure it

## Plan Structure
- **Plan 30-01 (Wave 1)**: Confidence-filtered reviews + stale loop detection -- REV-01, REV-03
- **Plan 30-02 (Wave 1)**: Machine-checkable verification system -- REV-02
