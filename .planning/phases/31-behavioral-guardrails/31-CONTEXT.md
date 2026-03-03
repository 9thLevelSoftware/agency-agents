# Phase 31: Behavioral Guardrails — Context

## Phase Goal

Agents and workflows have explicit boundaries that prevent rationalization and overreach.

## Requirements

- **DSC-01**: Anti-rationalization tables in key agent personalities (from code-foundations pattern)
- **DSC-02**: Authority matrix in CLAUDE.md separating autonomous vs human-approval decisions (from Conductor pattern)

## Success Criteria

1. `testing-reality-checker` has a "Common Rationalizations I Reject" table with ≥5 entries
2. `engineering-senior-developer` has a similar table focused on code quality rationalizations
3. `CLAUDE.md` authority matrix clearly separates autonomous decisions from human-approval decisions

## Source Material

- Inspiration Audit: `docs/plans/2026-03-02-inspiration-audit-and-adoption.md`
  - Task 5: Anti-rationalization tables (code-foundations pattern)
  - Task 8: Authority matrix (Conductor pattern)
- code-foundations plugin: Anti-rationalization tables pre-empt common LLM excuses and counter sycophantic agreement
- Conductor: Authority matrix defines explicit decision boundaries preventing agent overreach

## Dependencies

None — Phase 31 runs in parallel with Phases 29 (complete) and 30.

## Files to Modify

1. `agents/testing-reality-checker.md` — Add "Common Rationalizations I Reject" section
2. `agents/engineering-senior-developer.md` — Add "Common Rationalizations I Reject" section
3. `CLAUDE.md` — Add authority matrix section

## Design Notes

- Anti-rationalization tables should be personality-consistent: Reality Checker focuses on testing/QA rationalizations, Senior Developer focuses on code quality rationalizations
- Authority matrix should reflect Legion's existing conventions (human-in-the-loop for architecture, autonomous for task execution within scope)
- Tables should have ≥5 entries each — enough to cover common patterns without becoming a wall of text
- Authority matrix should be a clear two-column table, not ambiguous prose
