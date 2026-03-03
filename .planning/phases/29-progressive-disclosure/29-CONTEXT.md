# Phase 29: Progressive Disclosure -- Context

## Phase Goal
Skills load as lightweight metadata at startup; full content injected only when activated — reducing context overhead from ~17,000 tokens to ~1,700 tokens at idle.

## Requirements Covered
- PRG-01: All 17 skill SKILL.md files have YAML frontmatter with `name`, `triggers`, `token_cost`, and `summary` fields (~100 tokens each) for progressive loading
- PRG-02: `workflow-common` documents a "Skill Loading Protocol" — load metadata only at orchestrator startup, inject full content only when activated

## What Already Exists (from prior phases)
- 17 SKILL.md files across `skills/*/` — all already have `name` and `description` in YAML frontmatter
- `skills/workflow-common/SKILL.md` — 373 lines documenting shared constants, paths, and patterns for all /legion: commands
- 51 agent personalities in `agents/`
- 10 commands in `commands/`
- Plugin manifest at `.claude-plugin/plugin.json`
- All v1.0-v3.0 milestones complete (28 phases shipped)

### Current Skill Frontmatter Format
```yaml
---
name: legion:{skill-name}
description: {one-line description}
---
```
Phase 29 adds `triggers`, `token_cost`, and `summary` fields to this existing frontmatter.

### Skill Inventory (17 files)
| Skill | Lines | Current Token Cost |
|-------|-------|--------------------|
| agent-creator | 420 | medium |
| agent-registry | 148 | low |
| codebase-mapper | 622 | high |
| design-workflows | 706 | high |
| execution-tracker | 282 | low |
| github-sync | 678 | high |
| marketing-workflows | 538 | high |
| memory-manager | 351 | medium |
| milestone-tracker | 434 | medium |
| phase-decomposer | 643 | high |
| plan-critique | 313 | medium |
| portfolio-manager | 328 | medium |
| questioning-flow | 255 | low |
| review-loop | 685 | high |
| review-panel | 380 | medium |
| wave-executor | 587 | high |
| workflow-common | 373 | medium |

## Key Design Decisions
- **Single plan, single wave**: Both requirements are independent markdown edits with no code or cross-division complexity. Combining into one plan avoids unnecessary overhead.
- **Autonomous execution**: No agent personality needed — this is pure metadata and documentation work.
- **Token cost tiers**: low (<300 lines), medium (300-500 lines), high (>500 lines). Simple heuristic based on file size.
- **Trigger keywords**: Derived from each skill's primary use cases and the commands that invoke them. 3-6 keywords per skill.

## Plan Structure
- **Plan 29-01 (Wave 1)**: Add progressive disclosure metadata — frontmatter for all 17 skills + Skill Loading Protocol in workflow-common
