# Phase 2: Project Initialization — Context

## Phase Goal
Users can type `/agency:start` and go through a guided conversation that produces PROJECT.md and ROADMAP.md with recommended agents per phase.

## Requirements Covered
- INIT-01: `/agency:start` command — entry point for new projects
- INIT-02: Questioning flow skill — adaptive questioning that explores vision before jumping to tech
- INIT-03: PROJECT.md generation from questioning output
- INIT-04: ROADMAP.md generation with phase breakdown and agent assignments
- INIT-05: Workflow preferences collection (mode, depth, cost profile)

## What Already Exists (from Phase 1)

### Scaffold Command
`.claude/commands/agency/start.md` — has frontmatter, objective, placeholder process steps. References `questioning-flow.md` (not yet created) and existing skills/templates.

### Templates (ready to use)
- `.planning/templates/project-template.md` — PROJECT.md schema with `{placeholder}` syntax
- `.planning/templates/roadmap-template.md` — ROADMAP.md schema with phase detail pattern
- `.planning/templates/state-template.md` — STATE.md schema with progress tracking

### Supporting Skills (ready to use)
- `.claude/skills/agency/workflow-common.md` — state paths, personality injection, cost profiles, division constants
- `.claude/skills/agency/agent-registry.md` — 51-agent catalog, task type index, recommendation algorithm, team assembly patterns

## Key Design Decisions

### Adaptive Questioning (not rigid checklist)
The questioning flow must feel conversational, not like a form. It should:
- Start with "What are you building?" (vision first)
- Go deeper on areas the user is passionate about
- Skip or abbreviate areas the user isn't interested in
- Infer constraints from the project type rather than asking every question explicitly
- Use the AskUserQuestion tool for structured choices (mode, cost profile) but free-form conversation for vision/requirements

### Two-Phase Information Gathering
1. **Vision & Requirements** — what, who, why, constraints (fills PROJECT.md)
2. **Workflow Preferences** — how the agency should operate (fills STATE.md preferences)

### Agent Assignment Happens Automatically
ROADMAP.md generation should use the agent registry's recommendation algorithm to suggest agents per phase. The user sees the recommendations but doesn't configure them during `/agency:start` — that happens during `/agency:plan N`.

### Templates Are Guides, Not Constraints
The templates define the structure, but the questioning flow should produce rich, natural content — not just fill in blanks. If a section doesn't apply, omit it rather than writing "N/A".

## Plan Structure
- **Plan 02-01 (Wave 1)**: Create the questioning-flow skill — the conversation engine
- **Plan 02-02 (Wave 2)**: Update start.md to be fully functional — wire everything together
