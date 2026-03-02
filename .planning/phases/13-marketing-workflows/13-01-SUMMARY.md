---
phase: 13-marketing-workflows
plan: 01
status: complete
---

## Summary

Created the marketing-workflows skill (538 lines) -- a complete marketing campaign engine providing structured campaign planning with guided questioning (MKT-01), time-based content calendar generation with channel-agent mapping (MKT-02), and cross-channel coordination with core message derivation and consistency validation (MKT-03). Updated workflow-common.md with Marketing Workflow Conventions section and Campaign Documents entry in State File Locations.

## Files Modified

- `.claude/skills/agency/marketing-workflows.md` (created -- 538 lines)
  - Section 1: Principles, marketing domain detection heuristic, channel-agent mapping table, constants
  - Section 2: Campaign planning workflow with 5-question brief, document generation, team assembly
  - Section 3: Content calendar with type taxonomy (10 types), 3 scheduling patterns, assignment rules
  - Section 4: Cross-channel coordination with core messaging, adaptation framework, consistency checklist
  - Section 5: Full campaign document format specification with status lifecycle
  - Section 6: Integration patterns for /agency:plan, /agency:build, /agency:review + caller contract
- `.claude/skills/agency/workflow-common.md` (updated)
  - Added Campaign Documents row to State File Locations table
  - Added Marketing Workflow Conventions section (lifecycle, paths, wave pattern, integration points, degradation rule)

## Verification

```
PASS: 538 lines
PASS: frontmatter present
PASS: 6 sections
PASS: constant defined
PASS: degradation pattern
PASS: content calendar section
PASS: cross-channel section
PASS: Marketing Workflow Conventions present
PASS: campaigns/ referenced
PASS: State File Locations updated
```

All 10/10 verification checks passed.

## Commits

- `3a3acf5`: feat(13-01): create marketing-workflows skill
- `3187687`: feat(13-01): add Marketing Workflow Conventions to workflow-common

## Key Decisions

1. **538 lines (above 350-450 target range)**: The research document's campaign format specification and channel adaptation framework required thorough coverage. Kept all content substantive rather than cutting to hit a range ceiling.
2. **Followed github-sync/codebase-mapper pattern exactly**: YAML frontmatter, intro paragraph with references, numbered sections, integration patterns with caller contract, references table at the end.
3. **Core messaging as structural consistency**: Cross-channel coordination relies on shared input (Wave 1 output injected into Wave 2 context) rather than manual per-channel review. This mirrors the wave-executor's existing summary handoff pattern.
4. **10-type content taxonomy**: Expanded from research doc's 8 types to include Infographic and App Store Update for completeness with all 8 marketing agents.
