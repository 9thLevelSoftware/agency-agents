---
phase: 22
plan: 1
title: "Create review panel skill and integrate into /agency:review"
status: complete
completed: 2026-03-02
files_created:
  - skills/review-panel/SKILL.md
files_modified:
  - commands/review.md
  - .planning/ROADMAP.md
  - .planning/STATE.md
requirements_covered:
  - REV-01
  - REV-02
  - REV-03
---

# Plan 22-01 Summary: Create review panel skill and integrate into /agency:review

## What Was Done

### Task 1: Created skills/review-panel/SKILL.md
New skill with three sections:
- **Section 1: Panel Composition Algorithm** — 6-step process using agent-registry Section 3 scoring to dynamically select 2-4 reviewers based on phase content. Includes review-capable agent whitelist (16 agents across 5 divisions), diversity rules (max 2 per division), mandatory testing agent, panel size capping by domain count, and user confirmation step.
- **Section 2: Domain Rubric Registry** — Non-overlapping evaluation criteria for 16 agent specialties. Each rubric has 3-5 criteria scoped to the agent's domain lens. Rubrics are injected into the review prompt so reviewers evaluate ONLY against their assigned criteria. Division default rubrics cover unlisted agents.
- **Section 3: Panel Result Synthesis** — 6-step consolidation of multi-reviewer findings: collect, deduplicate (same rules as review-loop), group by domain lens, identify cross-cutting themes (hot spots, criteria at risk, strong areas), compute aggregate verdict, produce consolidated report.

### Task 2: Updated commands/review.md with panel mode
Five surgical changes:
1. Added `skills/review-panel/SKILL.md` to execution_context
2. Added Step 3.0 "Choose Review Mode" — AskUserQuestion offering "Dynamic review panel (Recommended)" vs "Classic reviewer selection"
3. Added Step 3-PANEL — full panel composition flow (extract signals, score agents, filter, cap, assign rubrics, confirm with user)
4. Added Step 4.b.2.5 — rubric injection into reviewer prompts when panel mode is active
5. Added Step 4.d2 — panel synthesis after findings collection, replacing simple verdict with aggregate panel verdict

Classic mode preserved unchanged as fallback option. Review loop mechanics (3-cycle max, fix routing, escalation) unchanged.

### Task 3: Updated state files
- ROADMAP.md: Phase 22 progress updated to 1/1 Complete
- STATE.md: Current position updated to Phase 22 executed, progress bar to 89% (8/9)

## Verification Results

All checks passed:
- `skills/review-panel/SKILL.md` exists with correct frontmatter, all 3 sections, agent-registry references, non-overlap enforcement, diversity rules, panel size capping, mandatory testing agent, user confirmation, aggregate verdict, cross-cutting themes
- `commands/review.md` has review-panel in execution_context, panel mode choice, 3-PANEL composition step, rubric injection, synthesis step, classic mode preserved, review-loop still referenced, 3-cycle max preserved, escalation preserved
- Cross-references to agent-registry and review-loop skills validated
- 18 agent rubric definitions confirmed across 5 divisions

## Requirements Coverage

| Requirement | How Satisfied |
|-------------|---------------|
| REV-01 | Panel composer uses agent-registry Section 3 scoring to select 2-4 reviewers based on phase content (domains, file types, keywords) |
| REV-02 | Domain rubric registry defines non-overlapping evaluation criteria for 16 agent specialties — rubrics injected into prompts so reviewers evaluate ONLY their assigned criteria |
| REV-03 | Panel mode offered as "Dynamic review panel (Recommended)" alongside "Classic reviewer selection" in Step 3.0 of /agency:review |
