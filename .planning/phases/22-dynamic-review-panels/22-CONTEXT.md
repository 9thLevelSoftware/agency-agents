# Phase 22: Dynamic Review Panels — Context

## Phase Goal

`/agency:review` can assemble a multi-perspective review panel of 2-4 agents, each evaluating through domain-specific weighted rubrics with non-overlapping criteria — replacing the need for a fixed board of directors.

## Dependencies

- Phase 21 (Strategic Advisors) — Complete. Builds on advisory agent patterns (dynamic agent selection via agent-registry recommendation algorithm).
- Phase 19 (Registry Integration) — Complete. Agent-registry skill references correct plugin-relative paths.

## Requirements

| Requirement | Description |
|-------------|-------------|
| REV-01 | Review panel composer uses agent-registry recommendation algorithm to assemble 2-4 reviewers based on what's being reviewed |
| REV-02 | Each reviewer evaluates through domain-weighted scoring rubrics with non-overlapping criteria specific to their specialty |
| REV-03 | Review panel integrates with existing `/agency:review` as an enhanced multi-perspective review lens option |

## Success Criteria (from ROADMAP.md)

1. Review panel composer selects 2-4 reviewers based on what's being reviewed (code changes get engineering + testing agents; design gets design + UX agents; plans get product + PM agents)
2. Each reviewer evaluates using domain-weighted scoring rubrics specific to their specialty — criteria do not overlap between reviewers
3. Panel results are synthesized into a consolidated report with per-reviewer findings and an overall verdict
4. Review panel is available as an option within `/agency:review` alongside existing single-reviewer mode

## Design Decisions

1. **New skill `review-panel`** — Panel composition, rubric registry, and synthesis live in a dedicated skill (`skills/review-panel/SKILL.md`), not inlined into the review command. This keeps the command orchestration clean and the panel logic reusable.

2. **Dynamic selection replaces static table for panel mode** — When panel mode is active, the static phase-type-to-agent mapping table (review-loop Section 2) is bypassed in favor of agent-registry recommendation algorithm scoring. The static table remains for "classic" single-reviewer mode.

3. **Non-overlapping rubrics via domain registry** — Each agent division and specialty maps to a specific rubric (evaluation criteria). The rubric is injected into the review prompt alongside the personality. Criteria are partitioned so no two reviewers on the same panel evaluate the same aspect.

4. **Opt-in panel mode** — Step 3 of `/agency:review` offers the user a choice: "Dynamic review panel (Recommended)" vs. "Classic reviewer selection". This preserves backward compatibility (REV-03).

5. **Synthesis produces consolidated report** — After all panel reviewers complete, findings are collected, deduplicated (same logic as review-loop Section 4), and a synthesis section maps findings by domain lens with cross-cutting themes highlighted.

## Existing Patterns to Preserve

- Full personality injection (workflow-common pattern)
- Review prompt format (review-loop Section 3) — rubric is ADDED to the prompt, not replacing existing review instructions
- Severity system (BLOCKER/WARNING/SUGGESTION) unchanged
- 3-cycle review loop unchanged — panel mode only changes agent SELECTION and EVALUATION criteria, not the review cycle itself
- Fix routing unchanged — review-loop Section 5 still handles fixes
- State update and completion patterns unchanged

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `skills/review-panel/SKILL.md` | Create | Panel composition, rubric registry, synthesis logic |
| `commands/review.md` | Modify | Add panel mode option in Step 3 and synthesis in Step 4 |
| `CLAUDE.md` | No change | Review command description already covers this |
| `.planning/ROADMAP.md` | Update | Plan entry for Phase 22 |
| `.planning/STATE.md` | Update | Current position to Phase 22 |
| `.planning/REQUIREMENTS.md` | No change during planning | REV-01/02/03 checked after execution |
