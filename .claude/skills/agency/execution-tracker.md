---
name: agency:execution-tracker
description: Tracks execution progress with STATE.md updates, ROADMAP.md progress, and atomic git commits per plan
---

# Agency Execution Tracker

Progress tracking and git commit engine for /agency:build. This skill governs how state files are updated, how progress is calculated, and how atomic commits are created after each plan completes.

References:
- State Update Pattern from `workflow-common.md` (Read → Update → Write STATE.md)
- Plan File Convention from `workflow-common.md` (.planning/phases/{NN-name}/)
- Cost Profile Convention from `workflow-common.md` (Opus/Sonnet/Haiku model selection)
- `.planning/STATE.md` — reads and updates project state after each plan completion
- `.planning/ROADMAP.md` — updates progress table after wave completion

---

## Section 1: Tracking Principles

Core rules that govern all execution tracking:

- STATE.md is updated after EVERY plan completion — whether the plan succeeded, partially completed, or failed
- ROADMAP.md progress table is updated after each wave completes, not after individual plans
- One git commit per completed plan — not per task, not per wave
- Commit messages use Conventional Commits: `feat(agency): execute plan {NN}-{PP} — {plan_name}`
- Progress percentage counts completed plans across ALL phases, not just the current phase
- Failed plans are tracked in state files but do NOT increment the completed count
- The tracker never modifies plan output files — it only touches STATE.md, ROADMAP.md, and git history

---

## Section 2: Plan Completion Tracking

After receiving each agent's completion message (sent via SendMessage), follow these steps to update state and create the atomic commit.

```
After receiving each agent's completion message (sent via SendMessage):

Step 1: Determine plan result
  - Success: agent completed all tasks, verification passed
  - Partial: agent completed some tasks, or verification had warnings
  - Failed: agent encountered errors or verification failed

Step 2: Update STATE.md
  Read current .planning/STATE.md, then update:
  - Status: "Phase {N} executing — Plan {NN}-{PP} {complete|failed}"
  - Last Activity: "Plan {NN}-{PP} execution ({date})"
  - Add to Phase {N} Results section:
    - Plan {NN}-{PP} (Wave {W}): {plan_name} — {brief result description}
  - Recalculate Progress:
    - Count all completed plans across all phases (from Phase Results sections)
    - Total plans = sum of Plans column from ROADMAP.md progress table
    - Percentage = (completed / total) * 100, rounded to nearest integer
    - Update the progress bar: [####...] {pct}% — {completed}/{total} plans complete
  Write updated STATE.md

Step 3: Create atomic git commit (success only)
  Only commit if the plan succeeded:
  git add -A
  git commit -m "feat(agency): execute plan {NN}-{PP} — {plan_name}

  Phase {N}: {phase_name}
  Wave: {W}
  Requirements: {comma-separated requirement IDs}

  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

  If the plan failed: do NOT commit — leave changes unstaged for diagnosis

Step 4: Verify commit
  - Run `git log --oneline -1` to confirm the commit was created
  - If commit failed (e.g., nothing to commit): log a warning, continue
```

---

## Section 3: Wave Completion Tracking

After all plans in a wave have been processed (success or failure), update the ROADMAP.md progress table and report wave status to the orchestrator.

```
After all plans in a wave have been processed:

Step 1: Summarize wave results
  - Count: plans succeeded, plans failed, plans total in wave
  - List files modified across all plans in the wave

Step 2: Update ROADMAP.md progress table
  Read current .planning/ROADMAP.md, find the progress table:
  | Phase | Plans | Completed | Status |
  Update the row for the current phase:
  - Completed: {total completed plans so far in this phase}
  - Status: "In Progress" if more waves remain, "Complete" if this was the last wave
  Write updated ROADMAP.md

Step 3: Report wave status
  Output for the orchestrator:
  ## Wave {W} Complete
  - Plans: {succeeded}/{total} succeeded
  - Files modified: {list}
  - {If any failures: "BLOCKED — {count} plan(s) failed. See summaries for details."}
  - {If all passed: "Ready for Wave {W+1}" or "All waves complete"}
```

---

## Section 4: Phase Completion Tracking

After all waves in a phase have executed, update state to reflect the full phase outcome and prompt the user toward the review step.

```
After all waves have been executed:

Step 1: Calculate final phase status
  - All plans succeeded: phase is complete
  - Some plans failed: phase is partial (needs review)

Step 2: Update STATE.md
  - Phase: {N} of {total} (executed, pending review) | (partial — {count} plan(s) failed)
  - Status: "Phase {N} complete — all plans executed successfully"
    OR: "Phase {N} partial — {count} plan(s) failed, review needed"
  - Last Activity: "Phase {N} execution ({date})"
  - Next Action:
    - If all passed: "Run `/agency:review` to verify Phase {N}: {phase_name}"
    - If some failed: "Run `/agency:review` to diagnose failures in Phase {N}"
  Write updated STATE.md

Step 3: Update ROADMAP.md progress table
  - Status: "Complete" if all plans passed, "Partial" if some failed

Step 4: Final progress display
  Output for the user:
  ## Phase {N}: {phase_name} — Execution Complete
  [##########          ] {pct}% — {completed}/{total} plans complete

  | Plan | Wave | Status | Summary |
  |------|------|--------|---------|
  | {NN}-{PP} | {W} | Pass/Fail | {one-line summary} |
  ...

  Next: Run `/agency:review` to verify Phase {N}
```

---

## Section 5: Progress Calculation

Exact formula for computing and rendering the overall project progress bar. The percentage is calculated from ROADMAP.md, which is the single source of truth for plan counts.

```
To calculate overall project progress:

1. Read .planning/ROADMAP.md progress table
2. For each phase row:
   - Get "Plans" count (total plans in phase)
   - Get "Completed" count
3. Sum all "Plans" values = total_plans
4. Sum all "Completed" values = completed_plans
5. Percentage = floor((completed_plans / total_plans) * 100)
6. Progress bar:
   - 20 characters wide
   - filled = floor(percentage / 5)
   - empty = 20 - filled
   - Format: [{"#" * filled}{"." * empty}] {percentage}% — {completed}/{total} plans complete

Example:
  Phase 1: 2/2, Phase 2: 2/2, Phase 3: 2/2, Phase 4: 1/3
  Total: 7/13 = 53%
  [##########..........] 53% — 7/13 plans complete
```

Failed plans do not count toward completed_plans. Only plans whose agent returned a success result and whose atomic git commit was created are counted.

---

## Section 6: Commit Message Convention

Exact format for all git commits produced by the execution tracker. Three commit types cover the full execution lifecycle.

```
Plan completion commit (one per successful plan):
  feat(agency): execute plan {NN}-{PP} — {brief plan name}

  Phase {N}: {phase_name}
  Wave: {W}
  Requirements: {REQ-XX, REQ-YY}

  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

Wave completion state update (one per wave):
  chore(agency): update state after wave {W} of phase {N}

  {succeeded}/{total} plans completed
  Progress: {completed}/{total_plans} ({pct}%)

  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

Phase completion state update (one per phase):
  chore(agency): complete phase {N} execution — {phase_name}

  All plans executed. {succeeded}/{total} passed.
  Overall progress: {completed}/{total_plans} ({pct}%)

  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

Milestone completion commit (one per completed milestone):
  chore(agency): complete milestone {N} — {milestone_name}

  Phases {start}-{end}: {phase_count} phases, {plans_completed} plans
  Requirements: {requirement_count} satisfied
  Summary: .planning/milestones/MILESTONE-{N}.md

  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

Milestone archive commit (one per archived milestone):
  chore(agency): archive milestone {N} — {milestone_name}

  Phases moved to .planning/archive/milestone-{N}/
  STATE.md and ROADMAP.md updated

  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

Scope `(agency)` is always used — never use plan-specific scopes in state commits. The brief plan name in plan completion commits comes from the `name` field in the plan's YAML frontmatter.

---

## Section 7: Error State Tracking

How to record failures in STATE.md and ROADMAP.md without corrupting existing progress data. The goal is: never lose data, never inflate the completed count, always leave a recovery path.

```
1. Failed plan in STATE.md
   Add to Phase {N} Results:
   - Plan {NN}-{PP} (Wave {W}): {plan_name} — FAILED: {brief error}

2. Failed plan in ROADMAP.md
   Do NOT increment the Completed count for failed plans
   Set Status to "Partial" if any plans in the phase have failed

3. Recovery guidance
   After recording a failure, include in Next Action:
   "Review {NN}-{PP}-SUMMARY.md for error details, then re-run /agency:build --plan {PP}"

4. Never lose data
   - Always read before writing state files (follows State Update Pattern from workflow-common.md)
   - Append results, never overwrite existing phase results
   - If STATE.md write fails: output the intended update to the user as text so no information is lost

5. Wave halting on failure
   If a plan fails in Wave {W} and subsequent waves depend on it:
   - Complete the current wave (all parallel plans in Wave {W} still run)
   - After Wave {W} settles: evaluate whether Wave {W+1} is safe to proceed
   - If the failed plan is a dependency: STOP, report blockage, do not attempt Wave {W+1}
   - Record in STATE.md: "Wave {W+1} blocked — Plan {NN}-{PP} failed (required dependency)"
```
