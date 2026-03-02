# Phase 26: Skills — Context

**Phase Goal:** All 16 remaining skill files reference `/legion:` for every command integration point
**Requirements:** SKL-02, SKL-03
**Target Files:** 20 files across `skills/` (16 SKILL.md + 1 CATALOG.md + 3 templates)

## Decisions

### 1. Single Plan, Three Tasks

**Decision:** One plan (26-01) with 3 tasks following the max-3-tasks convention

- Task 1: Baseline verification (confirm 180 matching lines across 20 files)
- Task 2: Transform all 20 files (atomic Write per file, immediate per-file verify)
- Task 3: Final cross-file verification + spot-checks

Rationale: All 20 files are independent (no inter-file dependencies), the substitution map is exhaustive, and the work is mechanical. Same pattern as Phase 25. Splitting into multiple plans adds overhead without benefit.

### 2. Atomic Write Per File

**Decision:** Read each file fully, apply ALL substitutions in memory, Write the complete file back

- Same pattern as Phase 24 and Phase 25 (atomic Write prevents partial state)
- Each file verified with `grep -in "agency"` immediately after writing
- No incremental Edit calls — files with many occurrences need all changed atomically

### 3. Full Branding Scope

**Decision:** Replace ALL case-insensitive "agency" occurrences, not just command references

- Consistent with Phase 25 approach (zero "agency" remnants across all command files)
- "The Agency Workflows" in agent prompt templates directly impacts spawned agent identity
- Success criteria are the minimum bar; zero remnants is the completeness bar
- Scope: `/agency:` commands, `(agency)` commit scopes, "The Agency Workflows" prose, standalone "Agency" brand, `~/.claude/agency/` paths, GitHub labels/constants

### 4. GitHub-Sync Constant Renaming

**Decision:** Rename both constant names AND values: `AGENCY_LABEL` → `LEGION_LABEL`, `AGENCY_LABEL_COLOR` → `LEGION_LABEL_COLOR`, `AGENCY_LABEL_DESCRIPTION` → `LEGION_LABEL_DESCRIPTION`

- Constants are pseudo-code in markdown (not real code) — renaming is safe
- Keeps naming consistent with values: `LEGION_LABEL = "legion"` reads better than `AGENCY_LABEL = "legion"`
- `BRANCH_PREFIX` value changes but name stays (it's already generic)

### 5. Article Change Handling

**Decision:** github-sync/SKILL.md line 485 changes "an Agency" → "a Legion" (article correction for consonant sound)

- Only one article change across all 20 files
- Explicitly noted in the substitution map

### 6. Processing Order

**Decision:** Process by density for easier progress tracking (highest-density first)

- Wave 1 (high density): github-sync (30), portfolio-manager (21)
- Wave 2 (medium density): execution-tracker (16), design-workflows (15), marketing-workflows (15), codebase-mapper (13), review-loop (13), wave-executor (12)
- Wave 3 (low density): memory-manager (7), questioning-flow/SKILL.md (6), agent-creator (5), agent-registry/SKILL.md (5), milestone-tracker (5), phase-decomposer (4), plan-critique (3), agent-registry/CATALOG.md (3), questioning-flow templates (1+1+3), review-panel (2)

## Scope Boundaries

**In scope:**
- All text changes within the 20 files in `skills/`
- Every `/agency:` → `/legion:` replacement
- Every "Agency" → "Legion" replacement in prose
- Every "The Agency Workflows" → "Legion" replacement
- Commit scope updates (`feat(agency):` → `feat(legion):`)
- Filesystem path updates (`~/.claude/agency/` → `~/.claude/legion/`)
- GitHub label/constant updates (`AGENCY_` → `LEGION_`, `"agency"` → `"legion"`)
- Branch pattern updates (`agency/phase-` → `legion/phase-`)

**Out of scope (handled by later phases):**
- Plugin manifest updates (Phase 27)
- Documentation updates — README, CLAUDE.md, CONTRIBUTING, CHANGELOG (Phase 28)
- workflow-common/SKILL.md (already done in Phase 24)

## Deferred Ideas

None captured.

---
*Context created: 2026-03-02*
*Decisions: 6 locked, 0 deferred*
