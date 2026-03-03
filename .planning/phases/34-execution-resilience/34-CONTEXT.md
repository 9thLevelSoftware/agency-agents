# Phase 34: Execution Resilience & Learning — Context

## Phase Goal
Execution is self-healing (auto-remediation), token-efficient (output redirection), and learns from user preferences (DPO).

## Requirements Covered
- **EXE-01**: Accepted/rejected/edited file proposals generate DPO preference pairs stored for future agent routing improvement
- **EXE-02**: Missing dependencies and environment issues auto-generate setup tasks instead of blocking execution with unactionable errors
- **EXE-03**: Noisy command output (`npm install`, build logs, etc.) is redirected to temp files with exit code checks, saving context tokens

## What Already Exists (from prior phases)

### Phase 29 (Progressive Disclosure) — Complete
- All 17+ SKILL.md files have YAML frontmatter with progressive loading metadata
- `workflow-common` documents the Skill Loading Protocol with metadata schema

### Phase 30 (Review & Verification Quality) — Complete
- `review-loop` and `review-panel` have confidence-based filtering (80%+ threshold)
- `phase-decomposer` produces tasks with `> verification:` lines
- `wave-executor` checks verification commands after task execution
- `review-loop` aborts after 3 iterations with no delta
- Verification results provide quality signals for EXE-01 preference capture

### Phase 31 (Behavioral Guardrails) — Complete
- Authority matrix in CLAUDE.md defines autonomous decisions vs. human-approval decisions
- Anti-rationalization tables in key agents
- Authority matrix constrains auto-remediation (EXE-02): can install declared deps, cannot add unplanned ones

### Phase 32 (Planning Intelligence) — Complete
- Competing architecture proposals in `/legion:plan` (3 philosophies)
- Spec pipeline skill with 5 stages
- Architecture selection is a potential preference capture point for EXE-01

### Phase 33 (Knowledge & Memory) — Planned (must execute before Phase 34)
- memory-manager expanded with Sections 8-12:
  - Section 8: Patterns Knowledge Base (PATTERNS.md)
  - Section 9: Error Knowledge Base (ERRORS.md)
  - Section 10: Cross-File Integration
  - Section 11: Branch-Aware Memory (Branch field in all records)
  - Section 12: Semantic Compaction
- workflow-common expanded with PATTERNS.md, ERRORS.md, compacted summaries conventions
- execution-tracker with compaction suggestion at phase completion
- Phase 34 extends this: adds PREFERENCES.md as a fourth memory file following the same conventions

### Relevant Existing Files (post-Phase 33 execution)
- `skills/memory-manager/SKILL.md` — 12 sections covering OUTCOMES, PATTERNS, ERRORS, branch awareness, compaction
- `skills/workflow-common/SKILL.md` — Memory Conventions with state locations, integration points, 3 memory file types
- `skills/execution-tracker/SKILL.md` — Plan/wave/phase completion tracking with memory integration
- `commands/build.md` — Wave-based execution with personality injection, memory recording, GitHub integration
- `commands/review.md` — Review cycle with agent panels, fix routing, memory recording, escalation
- `.planning/memory/` — Created on first write, contains OUTCOMES.md, PATTERNS.md, ERRORS.md

## Key Design Decisions

### Auto-Remediation (EXE-02)
- **BLOCKER vs. ENVIRONMENT classification**: Adopt bjarne's distinction — environment issues (missing deps, wrong versions, missing dirs) are auto-fixable; blockers (architecture, design, logic) require human judgment
- **Scope-limited remediation**: Only auto-fix things within the authority matrix's autonomous scope (installing declared dependencies, creating expected directories). Never add unplanned dependencies without human approval
- **Max 1 remediation attempt per error**: Try once, if it fails escalate to BLOCKER. No retry loops
- **Remediation is transparent**: Agent reports what it auto-fixed and what the original error was
- **Convention-based, not code-based**: Document the pattern in workflow-common; agents follow it via instructions in their execution prompt
- **Inspired by bjarne**: "Auto-creates setup tasks instead of blocking" — converts unactionable errors into actionable fixes

### Output Redirection (EXE-03)
- **Verbose command allowlist**: Specific commands known to produce noisy output (npm/pip/cargo/go install, docker build, etc.)
- **Redirect pattern**: stdout+stderr to temp file, check exit code, surface last 20 lines only on failure
- **Never redirect informative output**: Test results, linting output, and type-check results are useful and should NOT be redirected
- **Temp files are ephemeral**: Not committed, not tracked, no cleanup responsibility
- **Convention-based, not code-based**: Document the pattern in workflow-common; agents follow it via instructions in their execution prompt
- **Inspired by bjarne**: "Redirect npm install etc. to temp files, check exit codes — saves context tokens"

### DPO Preference Extraction (EXE-01)
- **New memory file: PREFERENCES.md**: Fourth file in `.planning/memory/`, following the same conventions as OUTCOMES/PATTERNS/ERRORS
- **Decision-level capture, not file-level**: Legion operates at the plan/review level with autonomous agent execution. Preference pairs capture user decision signals at workflow decision points, not individual file-permission events
- **Capture points**:
  - `/legion:review` — user verdict on review findings (accept all fixes, override with accept-as-is, manual fix)
  - `/legion:review` — user manual edits detected between build and review (uncommitted changes to build-modified files = corrective signal)
  - `/legion:build` — post-build manual edits detected before review starts
- **Three signal types**: positive (accepted as proposed), negative (rejected), corrective (user modified/overrode)
- **Graceful degradation**: Same as all memory files — check existence, use if present, skip if absent
- **Branch-aware**: Includes Branch field per Phase 33 conventions
- **Recall for routing improvement**: During `/legion:plan`, preferences inform agent recommendations and approach suggestions
- **Inspired by Puzld.ai**: "Converting accepted/rejected/edited file proposals into training pairs"

## Plan Structure
- **Plan 34-01 (Wave 1)**: Execution Hardening — EXE-02 + EXE-03: add auto-remediation pattern and output redirection convention to workflow-common and build command
- **Plan 34-02 (Wave 2, depends on 34-01)**: Preference Learning — EXE-01: add PREFERENCES.md support to memory-manager, update workflow-common, add capture points to review and build commands
