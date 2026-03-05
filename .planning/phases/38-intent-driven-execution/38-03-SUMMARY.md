---
phase: 38
plan: 03
name: intent-driven-execution
subsystem: command
requires: [38-01]
provides: [INTENT-04]
type: execute
wave: 2
autonomous: true
tech-stack:
  added: []
  patterns: [intent-routing, domain-filtering, authority-enforcement]
key-files:
  created: []
  modified:
    - commands/review.md
    - skills/review-panel/SKILL.md
decisions:
  - "Step 0.5 intent detection inserted before Step 1 to maintain execution flow"
  - "Security-only mode bypasses normal agent selection (Step 4.0) for direct template usage"
  - "Step 6-INTENT parallels Step 6 rather than replacing it, preserving full review path"
metrics:
  duration: 15m
  completed: 2026-03-05
  tasks: 3
  files_modified: 2
  tests_passed: 15
---

# Phase 38 Plan 03: Integrate --just-security into /legion:review Command

## One-Liner

Security-only audit capability for /legion:review via --just-security flag with OWASP/STRIDE categorization and domain-filtered review panels.

## What We Built

Extended the `/legion:review` command with intent-driven execution support:

- **Intent Detection (Step 0.5)**: Parse and validate `--just-security` flag, reject invalid combinations
- **Agent Selection (Step 1)**: Security-only mode uses template agents (security-engineer + api-tester)
- **Panel Filtering (Section 1.2)**: Domain-matched filtering in review-panel skill
- **Intent Filtering (Step 2.5)**: Post-collection filtering by security domains with authority enforcement
- **Security Output (Step 6-INTENT)**: Dedicated security report with OWASP Top 10 and STRIDE categorization

## Implementation Details

### commands/review.md Changes

1. **Step 0.5 - Intent Detection**: Added after conditional skill loading
   - Parse intent flags via intent-router skill
   - Validate for review command context (security-only only)
   - Set REVIEW_MODE to "full" or "security-only"

2. **Step 1 Enhancement**: Branch for security-only mode
   - Uses template agents directly
   - Bypasses normal agent registry recommendation
   - Sets [security-engineer, api-tester] as reviewers

3. **Step 6-INTENT**: New output section for security-only mode
   - Generates `.planning/security-review-{timestamp}.md`
   - OWASP Top 10 coverage checklist
   - STRIDE threat enumeration
   - Remediation priority list

### skills/review-panel/SKILL.md Changes

1. **Section 1.2 - Intent-Based Panel Filtering**: 
   - Load intent domains from template
   - Filter agents by domain overlap with authority-matrix
   - Override recommendations when in intent mode

2. **Step 2.5 - Intent Filtering**:
   - Filter findings to security domains only
   - Apply AUTH-04 authority filtering
   - Generate intent filter report with statistics

3. **Section 3.6 - Security-Only Output**:
   - Specification for security report format
   - OWASP/STRIDE cross-referencing

## Test Results

All 15 intent-review tests passing:
- ✓ Review panel intent filtering (5 tests)
- ✓ Ad-hoc review teams (4 tests)
- ✓ Security audit report synthesis (4 tests)
- ✓ Integration with review panel (2 tests)

## Deviations from Plan

**None** - Plan executed exactly as written.

All requirements from 38-03-PLAN.md implemented:
- ✓ Step 0.5 intent detection with validation
- ✓ Step 1 security-only agent selection
- ✓ Step 6-INTENT security output
- ✓ Section 1.2 intent-based panel filtering
- ✓ Step 2.5 intent filtering with authority enforcement

## Verification Checklist

- [x] review.md has intent detection (Step 0.5)
- [x] review.md has security-only mode in agent selection (Step 1)
- [x] review-panel skill has intent filtering (Section 1.2, Step 2.5)
- [x] review.md generates security-specific output report (Step 6-INTENT)
- [x] INTENT-04 satisfied: --just-security runs security-only review
- [x] Normal review mode (no flags) unchanged
- [x] All 15 intent-review tests passing

## Self-Check

**Result:** PASSED

**Verified Claims:**
- [x] `commands/review.md` modified with Step 0.5, Step 1 branch, Step 6-INTENT
- [x] `skills/review-panel/SKILL.md` modified with Section 1.2, Step 2.5
- [x] Commit `d93aca3`: Intent detection in review command
- [x] Commit `7bd9bf8`: Intent filtering in review panel
- [x] Commit `6246f6d`: Security-only output in review command
- [x] All tests pass (15/15)

## Key Decisions

1. **Placement of Step 0.5**: Inserted after Step 0 (conditional skill loading) and before Step 1 (determine target phase) to ensure intent context is available for all downstream decisions.

2. **Step 1 Branching**: Security-only mode bypasses the normal "Choose Review Mode" UX in Step 4.0, going directly to template agent selection. This prevents user confusion when they explicitly requested a specific intent.

3. **Step 6-INTENT Parallel Structure**: Rather than modifying Step 6 with conditionals throughout, created a parallel step that handles security-only output. This keeps the full review path intact while providing clear separation of concerns.

4. **Authority Filtering Order**: Intent filtering (Step 2.5) runs BEFORE deduplication (Step 3), ensuring only security-domain findings are considered for merging. This prevents non-security findings from influencing severity escalation.

## Commits

| Hash | Message | Files |
|------|---------|-------|
| d93aca3 | feat(38-03): add intent detection to /legion:review command | commands/review.md |
| 7bd9bf8 | feat(38-03): add intent filtering to review-panel skill | skills/review-panel/SKILL.md |
| 6246f6d | feat(38-03): add security-only output to /legion:review command | commands/review.md |

## Next Steps

Plan 38-03 complete. Phase 38 Intent-Driven Execution now has:
- 38-00: Test scaffolding (INTENT-01 through INTENT-06)
- 38-01: Intent Teams Registry (INTENT-05, INTENT-06)
- 38-03: Review command integration (INTENT-04)

Remaining: 38-02 (integrate into /legion:build command for --just-harden, --just-document, etc.)
