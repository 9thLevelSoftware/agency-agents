---
phase: 18-command-migration
plan: 01
status: complete
completed: "2026-03-02"
requirements_satisfied:
  - PLUG-02
  - PATH-01
  - PATH-02
  - PATH-03
---

# Phase 18, Plan 01 — Command Migration and Path Updates

## What Was Done

### Task 1: Migrate 9 commands and update all references within them
- Copied 9 command files from `.claude/commands/agency/` to `commands/`
- Updated 42 skill `@` references: `@./.claude/skills/agency/{name}.md` → `skills/{name}/SKILL.md`
- Updated 7 template references in `start.md`: `.planning/templates/` → `skills/questioning-flow/templates/`
- Updated 14 agent path references across 4 files: `agency-agents/{division}/{name}.md` → `agents/{name}.md`
- Updated 1 registry path in `agent.md`: `.claude/skills/agency/agent-registry.md` → `skills/agent-registry/SKILL.md`
- Removed `commands/.gitkeep`

### Task 2: Update agent paths in all 6 skill files
- `skills/agent-registry/SKILL.md` — 51 agent catalog paths updated
- `skills/review-loop/SKILL.md` — 13 reviewer and error handling paths updated
- `skills/agent-creator/SKILL.md` — 15 schema, generation, and verification paths updated
- `skills/wave-executor/SKILL.md` — 9 personality injection paths updated
- `skills/workflow-common/SKILL.md` — 4 state file and agent path format references updated
- `skills/codebase-mapper/SKILL.md` — 2 command path references updated

### Task 3: Validate complete migration and remove old directories
- All 9 commands verified present in `commands/`
- Zero stale `agency-agents/`, `.claude/skills/`, `.claude/commands/`, `.planning/templates/` references in commands or skills
- Line counts match between old and new command files (content preserved)
- Removed `.claude/commands/agency/` and parent `.claude/commands/` (empty)
- Removed `.planning/templates/` (templates co-located at `skills/questioning-flow/templates/`)
- `.claude/` directory is now empty of project files

## Validation Results

```
Command Migration Validation: PASS
- Commands: 9/9 present in commands/
- Skill @refs: 0 old paths remaining (42 updated)
- Template refs: 0 old paths remaining (7 updated)
- Agent refs in commands: 0 old paths remaining (14 updated)
- Agent refs in skills: 0 old paths remaining (94 updated)
- Old directories: .claude/commands/agency/ removed, .planning/templates/ removed
- Content: all files preserved (line counts match)
```

## Requirements Satisfied

- **PLUG-02**: Plugin has `commands/` directory at root with all 9 command `.md` files
- **PATH-01**: All `@` execution_context references updated to plugin-relative paths
- **PATH-02**: All cross-skill and cross-command references updated for new structure
- **PATH-03**: Agent personality file paths in wave-executor, registry, and all skills updated
