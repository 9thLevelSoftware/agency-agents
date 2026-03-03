# Phase 33: Knowledge & Memory — Context

## Phase Goal
The memory layer captures structured patterns, supports branch-aware context, and compacts completed work.

## Requirements Covered
- **KNW-01**: `memory-manager` skill supports `.planning/memory/PATTERNS.md` and `.planning/memory/ERRORS.md` templates alongside `OUTCOMES.md` for structured knowledge capture
- **KNW-02**: Agent context supports git-native branching — memory state can branch and merge alongside code branches
- **KNW-03**: Completed work gets AI-summarized (semantic compaction) preserving reasoning and decisions while freeing context for active work

## What Already Exists (from prior phases)

### Phase 29 (Progressive Disclosure) — Complete
- All 17 SKILL.md files have YAML frontmatter with `name`, `triggers`, `token_cost`, and `summary`
- `workflow-common` documents the Skill Loading Protocol with metadata schema, loading stages, command-to-skill mapping
- New skills must follow this frontmatter pattern

### Phase 30 (Review & Verification Quality) — Complete
- `review-loop` and `review-panel` have confidence-based filtering (80%+ threshold)
- `phase-decomposer` produces tasks with `> verification:` lines
- `wave-executor` checks verification commands after task execution
- `review-loop` aborts after 3 iterations with no delta

### Phase 31 (Behavioral Guardrails) — Complete
- `testing-reality-checker` and `engineering-senior-developer` have anti-rationalization tables
- `CLAUDE.md` authority matrix defines autonomous decisions (file edits, tests, deps, commits) vs. human-approval decisions (architecture, unplanned deps, schema, API, deletion)
- Authority matrix is directly relevant: memory operations (store patterns/errors) should be autonomous within scope; memory schema changes require human approval

### Phase 32 (Planning Intelligence) — Planned
- Spec pipeline skill (`skills/spec-pipeline/SKILL.md`) with 5 stages
- Competing architecture proposals in `/legion:plan`
- Not yet executed — Phase 33 does not depend on Phase 32

### Relevant Existing Files
- `skills/memory-manager/SKILL.md` — 7 sections covering OUTCOMES.md: principles, file format, store, recall, decay, degradation, errors
- `skills/workflow-common/SKILL.md` — Memory Conventions section (lifecycle, paths, integration points, degradation rule)
- `skills/execution-tracker/SKILL.md` — Section 2 Step 2.5 records outcome in memory after plan completion; Section 4 handles phase completion
- `.planning/memory/` — directory does not yet exist (created on first store operation)

## Key Design Decisions

### Structured Knowledge Files (KNW-01)
- **Two new files alongside OUTCOMES.md**: PATTERNS.md (successful patterns → reuse criteria) and ERRORS.md (error signatures → known fixes)
- **Why separate files, not one**: OUTCOMES.md tracks individual events; PATTERNS.md tracks distilled wisdom; ERRORS.md tracks error→fix mappings. Different schemas, different access patterns, different growth rates.
- **Same graceful degradation**: All three files are optional, created on first write, never required
- **Inspired by Conductor**: Conductor's `errors.json` maps error patterns to fixes; we adapt to markdown format
- **PATTERNS.md populated by**: `/legion:review` (when a review passes cleanly, the pattern that worked is captured) and `/legion:build` (when an agent completes a task with a novel approach)
- **ERRORS.md populated by**: `/legion:build` (when an agent encounters and resolves an error) and `/legion:review` (when review finds and fixes a recurring issue)

### Branch-Aware Memory (KNW-02)
- **Git-native by default**: Memory files live in `.planning/memory/` inside the repo — they already branch with `git checkout`
- **Branch context in records**: Each store operation records the current git branch name, so recalls can filter by branch
- **No custom branching mechanism**: Leverage git's existing branching, don't reinvent it
- **Merge strategy**: When branches merge, memory files merge too (git handles this). If conflicts arise, both records are kept (append-only, so conflicts should be rare)
- **Inspired by beads**: beads' git-native state means agent context branches with code — we adopt the principle without the Go tooling

### Semantic Compaction (KNW-03)
- **What gets compacted**: Phase SUMMARY.md files — after a phase is reviewed and complete, the full execution details can be condensed
- **What's preserved**: Reasoning, decisions, trade-offs, file changes, requirement satisfaction
- **What's trimmed**: Verbose verification output, intermediate step details, agent execution traces
- **When it runs**: After `/legion:review` passes and phase is marked complete, before the next planning phase begins
- **Not destructive**: Original SUMMARY.md preserved as `{NN}-{PP}-SUMMARY-full.md`; compacted version replaces the SUMMARY.md
- **Inspired by beads**: Semantic compaction (AI-summarized completed work) preserves reasoning while freeing context

## Plan Structure
- **Plan 33-01 (Wave 1)**: Structured Knowledge Templates — KNW-01: add PATTERNS.md and ERRORS.md support to memory-manager, update workflow-common
- **Plan 33-02 (Wave 2, depends on 33-01)**: Branch Awareness & Semantic Compaction — KNW-02 + KNW-03: add branch-aware operations and semantic compaction to memory-manager, update workflow-common and execution-tracker
