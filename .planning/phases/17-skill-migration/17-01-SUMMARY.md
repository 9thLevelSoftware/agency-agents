---
phase: 17-skill-migration
plan: 01
subsystem: plugin
tags: [skills, plugin-structure, claude-code, migration, file-organization]

# Dependency graph
requires:
  - phase: 15-plugin-scaffold
    provides: skills/ directory at plugin root with .gitkeep placeholder
  - phase: 16-agent-migration
    provides: agents/ directory structure pattern established

provides:
  - 15 skill directories at skills/{name}/SKILL.md in Claude Code plugin format
  - Template files co-located at skills/questioning-flow/templates/ (3 files)
  - Updated workflow-common path reference for templates

affects:
  - 18-command-migration — commands need path updates to @skills/{name}/SKILL.md
  - 19-registry-integration — registry scans skills/ directory
  - 20-distribution — skills/ included in plugin bundle

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Claude Code plugin skill structure: skills/{name}/SKILL.md"
    - "Co-location of supporting assets with their parent skill directory"

key-files:
  created:
    - skills/agent-creator/SKILL.md
    - skills/agent-registry/SKILL.md
    - skills/codebase-mapper/SKILL.md
    - skills/design-workflows/SKILL.md
    - skills/execution-tracker/SKILL.md
    - skills/github-sync/SKILL.md
    - skills/marketing-workflows/SKILL.md
    - skills/memory-manager/SKILL.md
    - skills/milestone-tracker/SKILL.md
    - skills/phase-decomposer/SKILL.md
    - skills/portfolio-manager/SKILL.md
    - skills/questioning-flow/SKILL.md
    - skills/questioning-flow/templates/project-template.md
    - skills/questioning-flow/templates/roadmap-template.md
    - skills/questioning-flow/templates/state-template.md
    - skills/review-loop/SKILL.md
    - skills/wave-executor/SKILL.md
    - skills/workflow-common/SKILL.md
  modified:
    - skills/workflow-common/SKILL.md (template path reference updated)

key-decisions:
  - "Templates co-located with questioning-flow skill at skills/questioning-flow/templates/ — plugin assets belong with the plugin, not project-level .planning/"
  - "Skill content migrated verbatim — no frontmatter or body changes; name: agency:{skill-name} format already matches Claude Code skill schema"
  - ".planning/templates/ left intact for Phase 18 to clean up — removing now would break current .claude/ commands before migration"
  - "Old .claude/skills/agency/ removed only after 5-check validation passed — size comparison, frontmatter compliance, directory count"

patterns-established:
  - "Skill directories: skills/{name}/SKILL.md — Claude Code plugin auto-discovery format"
  - "Supporting assets co-located: skills/{skill-name}/{asset-type}/ alongside SKILL.md"
  - "Validation-before-deletion: run all checks before removing old files"

requirements-completed: [PLUG-03, SKILL-01, SKILL-02, SKILL-03]

# Metrics
duration: 16min
completed: 2026-03-02
---

# Phase 17 Plan 01: Skill Migration Summary

**15 Agency skills migrated from .claude/skills/agency/ to skills/{name}/SKILL.md plugin directory format, with questioning-flow templates co-located and workflow-common reference updated**

## Performance

- **Duration:** ~16 min
- **Started:** 2026-03-02T05:00:00Z
- **Completed:** 2026-03-02T05:16:51Z
- **Tasks:** 3/3
- **Files modified:** 19 (18 created, 1 modified, 15 deleted from old location)

## Accomplishments

- Created 15 skill directories under `skills/` each with `SKILL.md` — all content and frontmatter preserved verbatim
- Co-located 3 template files in `skills/questioning-flow/templates/` — plugin assets now bundled with their skill
- Updated `skills/workflow-common/SKILL.md` template path reference from `.planning/templates/` to `skills/questioning-flow/templates/`
- Removed `skills/.gitkeep` placeholder once directories were populated
- Validated all 15 skills: directory count, SKILL.md presence, frontmatter compliance, template count, content size match
- Removed `./claude/skills/agency/` only after full validation passed

## Task Commits

Each task was committed atomically:

1. **Task 1: Create skill directories and migrate all 15 SKILL.md files** - `c2613fd` (feat)
2. **Task 2: Co-locate template files with questioning-flow skill and update reference** - `d6c870e` (feat)
3. **Task 3: Validate migration and remove old skill files** - `ea7516a` (chore)

**Plan metadata:** (docs: complete plan — committed after SUMMARY)

## Files Created/Modified

**Created (18 files):**
- `skills/agent-creator/SKILL.md` — Guided agent personality creation skill
- `skills/agent-registry/SKILL.md` — 51-agent registry mapping skill
- `skills/codebase-mapper/SKILL.md` — Brownfield analysis skill
- `skills/design-workflows/SKILL.md` — Design system and review skill
- `skills/execution-tracker/SKILL.md` — Execution progress tracking skill
- `skills/github-sync/SKILL.md` — GitHub integration skill
- `skills/marketing-workflows/SKILL.md` — Marketing campaign planning skill
- `skills/memory-manager/SKILL.md` — Cross-session memory skill
- `skills/milestone-tracker/SKILL.md` — Milestone management skill
- `skills/phase-decomposer/SKILL.md` — Phase decomposition skill
- `skills/portfolio-manager/SKILL.md` — Multi-project portfolio skill
- `skills/questioning-flow/SKILL.md` — Project initialization questioning skill
- `skills/questioning-flow/templates/project-template.md` — PROJECT.md schema
- `skills/questioning-flow/templates/roadmap-template.md` — ROADMAP.md schema
- `skills/questioning-flow/templates/state-template.md` — STATE.md schema
- `skills/review-loop/SKILL.md` — Dev-QA loop engine skill
- `skills/wave-executor/SKILL.md` — Wave plan execution skill
- `skills/workflow-common/SKILL.md` — Shared workflow conventions skill

**Modified (1 file):**
- `skills/workflow-common/SKILL.md` — Updated Templates row: `.planning/templates/` → `skills/questioning-flow/templates/`

**Deleted (15 files from old location):**
- `.claude/skills/agency/*.md` — All 15 original skill files removed after validation

## Decisions Made

- Templates co-located with questioning-flow because they are plugin assets used by `/agency:start`, not project-specific state. This makes the plugin self-contained and distributable via `claude plugin add`.
- `.planning/templates/` left intact until Phase 18. Current `.claude/` commands still reference it. Removing early would break the working plugin before Phase 18 migrates those references.
- Content migrated verbatim by design. All path updates in skill bodies (references to old locations) are Phase 18's responsibility per the plan.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 17 complete: all 15 skills at `skills/{name}/SKILL.md`, ready for plugin auto-discovery
- Phase 18 (Command Migration) can now begin: commands need `@skills/{name}/SKILL.md` path references updated
- `skills/questioning-flow/templates/` is the canonical template location; Phase 18 commands should reference it
- `.planning/templates/` cleanup is Phase 18's responsibility

---
*Phase: 17-skill-migration*
*Completed: 2026-03-02*
