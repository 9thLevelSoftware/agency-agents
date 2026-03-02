# Phase 26: Skills — Research

**Researched:** 2026-03-02
**Domain:** Text substitution / markdown skill files rebrand — 20 files, zero external dependencies
**Confidence:** HIGH

## Summary

Phase 26 is a bounded, mechanical text-editing task across 20 files in `skills/`. There are 180 case-insensitive "agency"-matching lines across 17 SKILL.md files plus 3 auxiliary files (CATALOG.md, 3 templates). Every occurrence must be transformed to its "legion" equivalent (case-matched, context-appropriate). No external tools, no new libraries, no new files — just Read + Write operations on existing markdown files.

The work follows the same pattern as Phase 25 (commands), but scaled to 20 files instead of 10. The complexity is about correctness and completeness. There are 7 distinct substitution patterns: frontmatter name declarations, `/agency:` command references, `(agency)` commit scopes, "The Agency Workflows" brand prose, standalone "Agency" brand references, `~/.claude/agency/` filesystem paths, and GitHub label/branch constants.

The highest-density files are `github-sync` (30 occurrences including constants, labels, branch patterns), `portfolio-manager` (21 occurrences including 10 filesystem paths), `execution-tracker` (16 including 8 commit prefixes), `design-workflows` (15), and `marketing-workflows` (15). The simplest files are `questioning-flow/templates/project-template.md` (1) and `roadmap-template.md` (1).

**Primary recommendation:** Process files atomically (full Read + Write per file). Verify each file immediately after writing with `grep -in "agency"`. The substitution map below is exhaustive.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SKL-02 | All 17 skill files have `/agency:` references replaced with `/legion:` for command routing and integration points | Full substitution map: Pattern B documents all 94 command references across 20 files with exact line numbers |
| SKL-03 | Commit format patterns in execution-tracker and github-sync skills updated to `feat(legion):` / `chore(legion):` | Pattern C documents all 10 commit scope occurrences across execution-tracker (8) and review-loop (2) |
</phase_requirements>

---

## Standard Stack

### Core

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Claude Code Read tool | built-in | Read current file content | Required before Write |
| Claude Code Write tool | built-in | Overwrite file with updated content | Single atomic operation per file |
| Bash grep | built-in | Post-write verification | Confirms zero "agency" remnants |

### Supporting

None — this phase needs no libraries, no package installs, no scripts.

---

## Substitution Map

### Pattern A: Frontmatter Name Declarations (16 files, 16 occurrences)

Every SKILL.md file has a frontmatter `name:` field. Transform `agency:` → `legion:`.

| File | Line | Old | New |
|------|------|-----|-----|
| agent-creator/SKILL.md | 2 | `name: agency:agent-creator` | `name: legion:agent-creator` |
| agent-registry/SKILL.md | 2 | `name: agency:agent-registry` | `name: legion:agent-registry` |
| codebase-mapper/SKILL.md | 2 | `name: agency:codebase-mapper` | `name: legion:codebase-mapper` |
| design-workflows/SKILL.md | 2 | `name: agency:design-workflows` | `name: legion:design-workflows` |
| execution-tracker/SKILL.md | 2 | `name: agency:execution-tracker` | `name: legion:execution-tracker` |
| github-sync/SKILL.md | 2 | `name: agency:github-sync` | `name: legion:github-sync` |
| marketing-workflows/SKILL.md | 2 | `name: agency:marketing-workflows` | `name: legion:marketing-workflows` |
| memory-manager/SKILL.md | 2 | `name: agency:memory-manager` | `name: legion:memory-manager` |
| milestone-tracker/SKILL.md | 2 | `name: agency:milestone-tracker` | `name: legion:milestone-tracker` |
| phase-decomposer/SKILL.md | 2 | `name: agency:phase-decomposer` | `name: legion:phase-decomposer` |
| plan-critique/SKILL.md | 2 | `name: agency:plan-critique` | `name: legion:plan-critique` |
| portfolio-manager/SKILL.md | 2 | `name: agency:portfolio-manager` | `name: legion:portfolio-manager` |
| questioning-flow/SKILL.md | 2 | `name: agency:questioning-flow` | `name: legion:questioning-flow` |
| review-loop/SKILL.md | 2 | `name: agency:review-loop` | `name: legion:review-loop` |
| review-panel/SKILL.md | 2 | `name: agency:review-panel` | `name: legion:review-panel` |
| wave-executor/SKILL.md | 2 | `name: agency:wave-executor` | `name: legion:wave-executor` |

**Note:** `workflow-common/SKILL.md` already updated in Phase 24.

### Pattern B: `/agency:` Command References (18 files, 94 occurrences)

Every `/agency:X` command reference → `/legion:X`.

**agent-creator/SKILL.md (4):**
| Line | Old | New |
|------|-----|-----|
| 338 | `/agency:agent` | `/legion:agent` |
| 403 | `/agency:plan` | `/legion:plan` |
| 408 | `/agency:agent` | `/legion:agent` |
| 418 | `/agency:agent` | `/legion:agent` |

**agent-registry/SKILL.md (2):**
| Line | Old | New |
|------|-----|-----|
| 8 | `/agency:agent` | `/legion:agent` |
| 21 | `/agency:agent` | `/legion:agent` |

**agent-registry/CATALOG.md (3):**
| Line | Old | New |
|------|-----|-----|
| 3 | `/agency:agent` | `/legion:agent` |
| 109 | `/agency:agent` | `/legion:agent` |
| 114 | `/agency:agent` | `/legion:agent` |

**codebase-mapper/SKILL.md (9):**
| Line | Old | New |
|------|-----|-----|
| 8 | `/agency:start` and `/agency:plan` (same line) | `/legion:start` and `/legion:plan` |
| 15 | `/agency:start` | `/legion:start` |
| 16 | `/agency:plan` | `/legion:plan` |
| 35 | `/agency:start` | `/legion:start` |
| 540 | `/agency:start` | `/legion:start` |
| 565 | `/agency:plan` | `/legion:plan` |
| 574 | `/agency:plan` | `/legion:plan` |
| 584 | `/agency:start` | `/legion:start` |
| 621-622 | `/agency:start` and `/agency:plan` | `/legion:start` and `/legion:plan` |

**design-workflows/SKILL.md (12):**
| Line | Old | New |
|------|-----|-----|
| 15 | `/agency:plan` | `/legion:plan` |
| 16 | `/agency:build` | `/legion:build` |
| 78 | `/agency:plan` | `/legion:plan` |
| 82 | `/agency:plan` | `/legion:plan` |
| 214 | `/agency:review` | `/legion:review` |
| 366 | `/agency:review` | `/legion:review` |
| 392 | `/agency:review` | `/legion:review` |
| 569 | `/agency:review` | `/legion:review` |
| 576 | `/agency:plan` | `/legion:plan` |
| 595 | `/agency:plan` | `/legion:plan` |
| 633 | `/agency:build` | `/legion:build` |
| 659 | `/agency:review` | `/legion:review` |

**execution-tracker/SKILL.md (5):**
| Line | Old | New |
|------|-----|-----|
| 8 | `/agency:build` | `/legion:build` |
| 141 | `/agency:review` | `/legion:review` |
| 142 | `/agency:review` | `/legion:review` |
| 158 | `/agency:review` | `/legion:review` |
| 269 | `/agency:build` | `/legion:build` |

**github-sync/SKILL.md (8):**
| Line | Old | New |
|------|-----|-----|
| 152 | `/agency:build` | `/legion:build` |
| 263 | `/agency:build` | `/legion:build` |
| 264 | `/agency:review` | `/legion:review` |
| 265 | `/agency:quick` | `/legion:quick` |
| 350 | `/agency:status` | `/legion:status` |
| 353 | `/agency:status` | `/legion:status` |
| 640 | `/agency:plan`, `/agency:build`, `/agency:status`, `/agency:review` (same line) | `/legion:` equivalents |
| 658 | `/agency:build` | `/legion:build` |

**marketing-workflows/SKILL.md (12):**
| Line | Old | New |
|------|-----|-----|
| 15 | `/agency:plan` | `/legion:plan` |
| 16 | `/agency:build` | `/legion:build` |
| 78 | `/agency:plan` | `/legion:plan` |
| 82 | `/agency:plan` | `/legion:plan` |
| 299 | `/agency:review` | `/legion:review` |
| 323 | `/agency:build` | `/legion:build` |
| 329 | `/agency:review` | `/legion:review` |
| 417 | `/agency:plan` | `/legion:plan` |
| 418 | `/agency:build` | `/legion:build` |
| 436 | `/agency:plan` | `/legion:plan` |
| 471 | `/agency:build` | `/legion:build` |
| 495 | `/agency:review` | `/legion:review` |

**memory-manager/SKILL.md (2):**
| Line | Old | New |
|------|-----|-----|
| 53 | `/agency:review` | `/legion:review` |
| 189 | `/agency:quick` | `/legion:quick` |

**milestone-tracker/SKILL.md (3):**
| Line | Old | New |
|------|-----|-----|
| 354 | `/agency:milestone` | `/legion:milestone` |
| 400 | `/agency:milestone` | `/legion:milestone` |
| 434 | `/agency:plan` | `/legion:plan` |

**phase-decomposer/SKILL.md (3):**
| Line | Old | New |
|------|-----|-----|
| 8 | `/agency:plan` | `/legion:plan` |
| 597 | `/agency:plan N` | `/legion:plan N` |
| 608 | `/agency:plan` | `/legion:plan` |

**plan-critique/SKILL.md (2):**
| Line | Old | New |
|------|-----|-----|
| 10 | `/agency:plan` | `/legion:plan` |
| 247 | `/agency:plan` | `/legion:plan` |

**portfolio-manager/SKILL.md (3):**
| Line | Old | New |
|------|-----|-----|
| 314 | `/agency:start` | `/legion:start` |
| 324 | `/agency:start` | `/legion:start` |
| 327 | `/agency:start` | `/legion:start` |

**questioning-flow/SKILL.md (1):**
| Line | Old | New |
|------|-----|-----|
| 8 | `/agency:start` | `/legion:start` |

**questioning-flow/templates/project-template.md (1):**
| Line | Old | New |
|------|-----|-----|
| 3 | `/agency:start` | `/legion:start` |

**questioning-flow/templates/roadmap-template.md (1):**
| Line | Old | New |
|------|-----|-----|
| 3 | `/agency:start` | `/legion:start` |

**questioning-flow/templates/state-template.md (3):**
| Line | Old | New |
|------|-----|-----|
| 3 | `/agency:start` and `/agency:` | `/legion:start` and `/legion:` |
| 12 | `/agency:plan 1` | `/legion:plan 1` |
| 24 | `/agency:plan 1` | `/legion:plan 1` |

**review-loop/SKILL.md (9):**
| Line | Old | New |
|------|-----|-----|
| 3 | `/agency:review` | `/legion:review` |
| 8 | `/agency:review` and `/agency:build` (same line) | `/legion:review` and `/legion:build` |
| 16 | `/agency:build` | `/legion:build` |
| 496 | `/agency:plan {N+1}` | `/legion:plan {N+1}` |
| 529 | `/agency:plan {N+1}` | `/legion:plan {N+1}` |
| 575 | `/agency:review` | `/legion:review` |
| 595 | `/agency:review` | `/legion:review` |
| 596 | `/agency:review` | `/legion:review` |
| 597 | `/agency:plan {N+1}` | `/legion:plan {N+1}` |

**review-panel/SKILL.md (1):**
| Line | Old | New |
|------|-----|-----|
| 10 | `/agency:review` | `/legion:review` |

**wave-executor/SKILL.md (9):**
| Line | Old | New |
|------|-----|-----|
| 8 | `/agency:build` | `/legion:build` |
| 21 | `/agency:build` | `/legion:build` |
| 67 | `/agency:plan` | `/legion:plan` |
| 71 | `/agency:plan` | `/legion:plan` |
| 296 | `/agency:build` and `/agency:review` (same line) | `/legion:build` and `/legion:review` |
| 301 | `/agency:review` | `/legion:review` |
| 429 | `/agency:review` | `/legion:review` |
| 490 | `/agency:review` | `/legion:review` |
| 516 | `/agency:plan` | `/legion:plan` |

### Pattern C: Commit Scope `(agency)` (2 files, 10 occurrences)

**execution-tracker/SKILL.md (8):**
| Line | Old | New |
|------|------|-----|
| 27 | `feat(agency): execute plan` | `feat(legion): execute plan` |
| 77 | `feat(agency): execute plan` | `feat(legion): execute plan` |
| 199 | `feat(agency): execute plan` | `feat(legion): execute plan` |
| 208 | `chore(agency): update state` | `chore(legion): update state` |
| 216 | `chore(agency): complete phase` | `chore(legion): complete phase` |
| 224 | `chore(agency): complete milestone` | `chore(legion): complete milestone` |
| 233 | `chore(agency): archive milestone` | `chore(legion): archive milestone` |
| 241 | `chore(agency): create PR` | `chore(legion): create PR` |

**review-loop/SKILL.md (2):**
| Line | Old | New |
|------|-----|-----|
| 377 | `fix(agency): review cycle` | `fix(legion): review cycle` |
| 509 | `chore(agency): phase {N} review passed` | `chore(legion): phase {N} review passed` |

### Pattern D: "The Agency Workflows" Brand Prose (7 files, 12 occurrences)

**codebase-mapper/SKILL.md (2):**
| Line | Old | New |
|------|-----|-----|
| 8 | "for The Agency Workflows" | "for Legion" |
| 27 | "all other Agency state files" | "all other Legion state files" |

**design-workflows/SKILL.md (2):**
| Line | Old | New |
|------|-----|-----|
| 8 | "for The Agency Workflows" | "for Legion" |
| 27 | "all other Agency state files" | "all other Legion state files" |

**github-sync/SKILL.md (1):**
| Line | Old | New |
|------|-----|-----|
| 8 | "for The Agency Workflows" | "for Legion" |

**marketing-workflows/SKILL.md (2):**
| Line | Old | New |
|------|-----|-----|
| 8 | "for The Agency Workflows" | "for Legion" |
| 27 | "all other Agency state files" | "all other Legion state files" |

**memory-manager/SKILL.md (2):**
| Line | Old | New |
|------|-----|-----|
| 8 | "for The Agency Workflows" | "for Legion" |
| 23 | "all other Agency state files" | "all other Legion state files" |

**review-loop/SKILL.md (1):**
| Line | Old | New |
|------|-----|-----|
| 128 | "for The Agency Workflows" | "for Legion" |

**wave-executor/SKILL.md (2):**
| Line | Old | New |
|------|-----|-----|
| 123 | "as part of The Agency Workflows" | "as part of Legion" |
| 169 | "as part of The Agency Workflows" | "as part of Legion" |

### Pattern E: Standalone "Agency" Brand References (8 files, 22 occurrences)

Non-path, non-command "Agency" references in prose, headings, descriptions, and variable names.

**agent-registry/SKILL.md (2):**
| Line | Old | New |
|------|-----|-----|
| 3 | `description: Maps all 51 Agency agents` | `description: Maps all 51 Legion agents` |
| 6 | `# Agency Agent Registry` | `# Legion Agent Registry` |

**codebase-mapper/SKILL.md (1):**
| Line | Old | New |
|------|-----|-----|
| 43 | "Check for non-Agency files" | "Check for non-Legion files" |

**execution-tracker/SKILL.md (2):**
| Line | Old | New |
|------|-----|-----|
| 6 | `# Agency Execution Tracker` | `# Legion Execution Tracker` |
| 250 | `Scope (agency) is always used` | `Scope (legion) is always used` |

**github-sync/SKILL.md (8):**
| Line | Old | New |
|------|-----|-----|
| 56 | "making Agency-created issues easy" | "making Legion-created issues easy" |
| 74 | "linked to Agency phases" | "linked to Legion phases" |
| 119 | `*Created by Agency Workflows*` | `*Created by Legion*` |
| 248 | `*Created by Agency Workflows*` | `*Created by Legion*` |
| 259 | "in the Agency workflow" | "in the Legion workflow" |
| 315 | "non-Agency issues" | "non-Legion issues" |
| 485 | "No GitHub error should ever block an Agency workflow" | "No GitHub error should ever block a Legion workflow" |
| 653 | "Every Agency command" | "Every Legion command" |

**memory-manager/SKILL.md (3):**
| Line | Old | New |
|------|-----|-----|
| 3 | `description: ... for Agency workflows` | `description: ... for Legion workflows` |
| 53 | `/agency:review command implemented` | `/legion:review command implemented` |
| 333 | "Agency workflows — only one build/review" and "all other Agency state files" | "Legion workflows" and "all other Legion state files" |

**milestone-tracker/SKILL.md (1):**
| Line | Old | New |
|------|-----|-----|
| 8 | "within The Agency workflow" | "within the Legion workflow" |

**questioning-flow/SKILL.md (4):**
| Line | Old | New |
|------|-----|-----|
| 80 | "Agency recommends actions" | "Legion recommends actions" |
| 81 | "Agency plans and executes" | "Legion plans and executes" |
| 141 | "First project with Agency" | "First project with Legion" |
| 245 | "Agency supports marketing, design" | "Legion supports marketing, design" |

**review-loop/SKILL.md (1):**
| Line | Old | New |
|------|-----|-----|
| 3 | `description: ... for /agency:review` | `description: ... for /legion:review` |

### Pattern F: `~/.claude/agency/` Filesystem Paths (1 file, 10 occurrences)

**portfolio-manager/SKILL.md (10):**
| Line | Old | New |
|------|-----|-----|
| 11 | `~/.claude/agency/portfolio.md` | `~/.claude/legion/portfolio.md` |
| 20 | `~/.claude/agency/portfolio.md` | `~/.claude/legion/portfolio.md` |
| 75 | `~/.claude/agency/portfolio.md` | `~/.claude/legion/portfolio.md` |
| 76 | `~/.claude/agency/` | `~/.claude/legion/` |
| 107 | `~/.claude/agency/portfolio.md` | `~/.claude/legion/portfolio.md` |
| 113 | `~/.claude/agency/portfolio.md` | `~/.claude/legion/portfolio.md` |
| 125 | `~/.claude/agency/portfolio.md` | `~/.claude/legion/portfolio.md` |
| 131 | `~/.claude/agency/portfolio.md` | `~/.claude/legion/portfolio.md` |
| 209 | `~/.claude/agency/portfolio.md` | `~/.claude/legion/portfolio.md` |
| 221 | `~/.claude/agency/portfolio.md` | `~/.claude/legion/portfolio.md` |

### Pattern G: GitHub Label/Branch Constants and References (1 file, 11 occurrences)

**github-sync/SKILL.md (11):**
| Line | Old | New |
|------|-----|-----|
| 50 | `AGENCY_LABEL = "agency"` | `LEGION_LABEL = "legion"` |
| 51 | `AGENCY_LABEL_COLOR = "7B68EE"` | `LEGION_LABEL_COLOR = "7B68EE"` |
| 52 | `AGENCY_LABEL_DESCRIPTION = "Created by Agency Workflows"` | `LEGION_LABEL_DESCRIPTION = "Created by Legion"` |
| 53 | `BRANCH_PREFIX = "agency/phase-"` | `BRANCH_PREFIX = "legion/phase-"` |
| 65 | `user/agency-agents` (example slug) | `user/legion` (example slug) |
| 78 | `ensure the "agency" label exists` | `ensure the "legion" label exists` |
| 81 | `gh label create agency --description "Created by Agency Workflows"` | `gh label create legion --description "Created by Legion"` |
| 100 | `--label "agency"` | `--label "legion"` |
| 124 | `--label agency` | `--label legion` |
| 188 | `agency/phase-03-phase-planning` | `legion/phase-03-phase-planning` |
| 362 | `--label agency` | `--label legion` |

### Pattern H: Portfolio Header/Brand (1 file, 4 occurrences)

**portfolio-manager/SKILL.md (4):**
| Line | Old | New |
|------|-----|-----|
| 23 | `# Agency Portfolio` | `# Legion Portfolio` |
| 77 | `# Agency Portfolio` | `# Legion Portfolio` |
| 227 | `~/.claude/agency/portfolio.md` | `~/.claude/legion/portfolio.md` |
| 233 | `~/.claude/agency/portfolio.md` | `~/.claude/legion/portfolio.md` |

**Note:** Lines 227 and 233 overlap with Pattern F and are counted there. Lines 23 and 77 are net-new. Also:

**portfolio-manager/SKILL.md additional (1):**
| Line | Old | New |
|------|-----|-----|
| 320 | `~/.claude/agency/` | `~/.claude/legion/` |
| 328 | `~/.claude/agency/portfolio.md` | `~/.claude/legion/portfolio.md` |

### Pattern Notes: Article Changes

**github-sync/SKILL.md line 485:** "block an Agency workflow" → "block a Legion workflow" (article correction for consonant sound)

No other article changes needed — all other instances use constructions that don't require article adjustment.

---

## Per-File Summary

| File | Pattern A | Pattern B | Pattern C | Pattern D | Pattern E | Pattern F | Pattern G | Total Lines |
|------|-----------|-----------|-----------|-----------|-----------|-----------|-----------|-------------|
| agent-creator/SKILL.md | 1 | 4 | — | — | — | — | — | 5 |
| agent-registry/SKILL.md | 1 | 2 | — | — | 2 | — | — | 5 |
| agent-registry/CATALOG.md | — | 3 | — | — | — | — | — | 3 |
| codebase-mapper/SKILL.md | 1 | 9 | — | 2 | 1 | — | — | 13 |
| design-workflows/SKILL.md | 1 | 12 | — | 2 | — | — | — | 15 |
| execution-tracker/SKILL.md | 1 | 5 | 8 | — | 2 | — | — | 16 |
| github-sync/SKILL.md | 1 | 8 | — | 1 | 8 | — | 11 | 30* |
| marketing-workflows/SKILL.md | 1 | 12 | — | 2 | — | — | — | 15 |
| memory-manager/SKILL.md | 1 | 2 | — | 2 | 3 | — | — | 7* |
| milestone-tracker/SKILL.md | 1 | 3 | — | — | 1 | — | — | 5 |
| phase-decomposer/SKILL.md | 1 | 3 | — | — | — | — | — | 4 |
| plan-critique/SKILL.md | 1 | 2 | — | — | — | — | — | 3 |
| portfolio-manager/SKILL.md | 1 | 3 | — | — | 2 | 14 | — | 21* |
| questioning-flow/SKILL.md | 1 | 1 | — | — | 4 | — | — | 6 |
| questioning-flow/templates/project-template.md | — | 1 | — | — | — | — | — | 1 |
| questioning-flow/templates/roadmap-template.md | — | 1 | — | — | — | — | — | 1 |
| questioning-flow/templates/state-template.md | — | 3 | — | — | — | — | — | 3 |
| review-loop/SKILL.md | 1 | 9 | 2 | 1 | 1 | — | — | 13* |
| review-panel/SKILL.md | 1 | 1 | — | — | — | — | — | 2 |
| wave-executor/SKILL.md | 1 | 9 | — | 2 | — | — | — | 12 |
| **Totals** | **16** | **94** | **10** | **12** | **24** | **14** | **11** | **180** |

(*Note: some lines have multiple "agency" occurrences — actual text changes may exceed line count on multi-occurrence lines. The total of 180 represents matching lines from `grep -inc`.)

---

## Risk Analysis

| Risk | Severity | Mitigation |
|------|----------|------------|
| Partial substitution on multi-occurrence lines | Medium | Atomic Write per file; grep each file immediately after |
| "an Agency" → "a Legion" article change missed | Low | Only 1 known instance (github-sync line 485); explicitly mapped |
| Constant names (`AGENCY_LABEL`) not renamed | Medium | Full constant rename mapped: `AGENCY_` → `LEGION_` prefix |
| Memory-manager example data left stale | Low | Line 53 explicitly mapped — example record updated |
| `user/agency-agents` example slug in github-sync | Low | Line 65 explicitly mapped to `user/legion` |

---

## Decision Points for Context Phase

1. **Plan count**: 1 plan with 3 tasks (same pattern as Phase 25) or 2 plans?
2. **Branding scope**: Success criteria mention command references + commit patterns. Should all "Agency" brand prose also change (recommended: yes, for consistency with Phase 25)?
3. **`github-sync` constant naming**: Rename `AGENCY_LABEL` → `LEGION_LABEL` etc., or keep constant names and only change values?
4. **Processing order**: By file density (same as Phase 25) or by directory?

---
*Research completed: 2026-03-02*
*Files: 20 | Matching lines: 180 | Patterns: 7 distinct*
