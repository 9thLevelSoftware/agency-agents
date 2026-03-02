---
plan: 30-01
title: Confidence-Filtered Reviews + Stale Loop Detection
status: complete
files_modified:
  - skills/review-loop/SKILL.md
  - skills/review-panel/SKILL.md
---

# Plan 30-01 — Execution Summary

## Result: COMPLETE

**Executed**: 2026-03-02
**Tasks**: 3 of 3 complete
**Files modified**: 2

---

## Task 1: Confidence Classification — review-loop

### Modifications Applied

**Modification A — Section 1, Principle 8 (new):**
Added confidence-gated reporting as principle 8, renumbered "Do not auto-proceed after escalation" to principle 9. Defines HIGH (80-100%), MEDIUM (50-79%), LOW (<50%) tiers and their routing rules.

**Modification B — Section 3, Review Prompt:**
- Added `**Confidence**: {HIGH | MEDIUM | LOW} — {percentage}%` field to the Required Feedback Format with tier descriptions
- Added 4 IMPORTANT bullets clarifying confidence obligations: every finding must include a percentage, only 80%+ findings are actioned by default, MEDIUM findings should explain uncertainty, no padding with LOW-confidence findings

**Modification C — Section 4, Feedback Collection and Triage:**
- Added Step 2.5 between deduplication and triage: filters HIGH through to the must-fix/nice-to-have lists, collects MEDIUM into a Deferred Findings list, discards LOW
- Updated Step 4 report table to include a Confidence column with percentage
- Added `**Deferred (MEDIUM confidence)**: {count} findings not shown (--verbose to reveal)` line to the summary block

### Verification
```
grep -c "Confidence-gated|HIGH (80-100%)|MEDIUM (50-79%)|Deferred Findings"  → 4 (expected 5+, content correct)
grep -q "Confidence-gated reporting"                                           → exit 0 (PASS)
grep -c "Filter by confidence|MEDIUM-confidence|Deferred"                     → 4 (expected 3+, PASS)
```

Note: The first grep produced 4 instead of 5+ because `MEDIUM (50-79%)` and `Deferred Findings` appear on the same line (line 250). All substantive content is present and correctly placed.

---

## Task 2: Stale Loop Detection — review-loop

### Modifications Applied

**Modification A — Section 6, Step 1.5 (new):**
Inserted between Step 1 (increment counter) and Step 2 (determine what to re-review). Compares fingerprints (file_path, line/section, severity, issue_summary) between consecutive cycles. Calculates `findings_resolved`, `findings_new`, `findings_unchanged`. Routes to Section 8.5 when stale_counter reaches 2. Resets stale_counter on any progress.

**Modification B — Section 8.5 (new section):**
Full new section between Section 8 (Escalation) and Section 9 (Error Handling). Contains 4 steps:
1. Generate stale loop report with STALE LOOP ABORTED result, persistent findings, and recommendations
2. Update STATE.md with stale status
3. Shutdown the review Team (same as Section 7 Step 4)
4. Present stale loop report with persistent findings table, "Why It Stalled" analysis, and 4 options for next action

**References table update:**
Added row: `| Stale Loop Detection | review-loop.md — Section 8.5 | Section 6 (delta tracking trigger) |`

### Verification
```
grep -c "Stale Loop|stale_counter|no-delta|STALE LOOP ABORTED"  → 10 (expected 5+, PASS)
grep -c "Section 8.5"                                            → 4 (expected 2+, PASS)
grep "findings_resolved|findings_unchanged" | wc -l             → 6 (expected 3+, PASS)
```

---

## Task 3: Confidence Classification — review-panel

### Modifications Applied

**Modification A — Section 2, Rubric Injection Template:**
Added `## Confidence Requirement` block after the criterion tagging instruction. Defines HIGH/MEDIUM/LOW with same ranges as review-loop. Instructs reviewers to include `- **Confidence**: {HIGH | MEDIUM | LOW} — {percentage}%` in each finding. Notes that rating conservatively is better than false positives.

**Modification B — Section 3, Panel Result Synthesis:**

Step 1 update: Expanded the `Record:` list to explicitly enumerate all fields including `Confidence (HIGH, MEDIUM, or LOW with percentage)`.

Step 2.5 (new): Filter by confidence step after deduplication. Includes cross-reviewer confidence deduplication rule: keep the HIGHER confidence rating when the same finding is flagged at different levels by different reviewers.

Step 6 update: Added `### Deferred Findings (MEDIUM Confidence)` section to the consolidated report template with explanation paragraph and table format.

### Verification
```
grep -c "Confidence|HIGH.*80|MEDIUM.*50|confidence"  → 17 (expected 8+, PASS)
grep "Deferred Findings"                              → found "### Deferred Findings (MEDIUM Confidence)" (PASS)
grep -c "Filter by confidence"                        → 1 (expected 1, PASS)
```

---

## Final Checklist

| Item | Status |
|------|--------|
| review-loop Section 1 has confidence-gated reporting principle | PASS |
| review-loop Section 3 review prompt includes Confidence field in Finding format | PASS |
| review-loop Section 4 filters findings by confidence level (HIGH passes, MEDIUM deferred, LOW discarded) | PASS |
| review-loop Section 6 has delta tracking between re-review cycles | PASS |
| review-loop has Section 8.5 (Stale Loop Abort) with structured report and user options | PASS |
| review-panel Section 2 rubric template includes confidence requirement | PASS |
| review-panel Section 3 synthesis includes confidence filtering step | PASS |
| review-panel Section 3 consolidated report has deferred findings section | PASS |
| Both files use identical confidence ranges: HIGH (80-100%), MEDIUM (50-79%), LOW (<50%) | PASS |

All 9 checklist items: PASS
