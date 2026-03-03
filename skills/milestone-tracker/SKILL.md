---
name: legion:milestone-tracker
description: Milestone management — definition, completion with metrics, archiving, summary generation
triggers: [milestone, complete, archive, version, release, ship]
token_cost: medium
summary: "Manages milestone lifecycle: status checking, completion validation, summary generation, phase archiving, and next milestone creation. Use during /legion:milestone for version transitions."
---

# Milestone Tracker

Core skill for milestone management within The Legion workflow. Defines the milestone format in ROADMAP.md, the definition flow for proposing and writing milestones, completion logic with pre-flight checks and summary generation, archiving operations with state condensation, metrics formulas, and error handling for all edge cases.

References:
- State File Locations from `workflow-common.md` (milestone paths at `.planning/milestones/` and `.planning/archive/`)
- Milestone Conventions from `workflow-common.md` (lifecycle, paths, command convention)
- Execution Tracker Section 5 from `execution-tracker.md` (progress calculation formula)
- `.planning/ROADMAP.md` — milestones are read from and written to the `## Milestones` section

---

## Section 1: Milestone Format

The milestone schema as it appears in ROADMAP.md. Milestones are added as a `## Milestones` section AFTER the `## Phase Details` section and BEFORE the `## Progress` table.

```markdown
## Milestones

### Milestone {N}: {name}
- **Phases**: {start}-{end}
- **Goal**: {one-line milestone goal}
- **Status**: Pending | In Progress | Complete | Archived
- **Completed**: {YYYY-MM-DD} (only present when Status is Complete or Archived)
```

### Format Rules

- Milestone numbers are sequential starting from 1
- Phase ranges are inclusive and must not overlap (e.g., Phases 1-7 and Phases 8-14, not 1-7 and 7-14)
- Phase ranges must cover ALL phases in the roadmap — no gaps allowed
- Every phase belongs to exactly one milestone
- Status meanings:
  - **Pending**: No phases in this milestone have started execution
  - **In Progress**: At least one phase has started but not all are Complete
  - **Complete**: All phases in the milestone are marked Complete in the Progress table
  - **Archived**: All phases archived to `.planning/archive/milestone-{N}/`
- The **Completed** field is added when status transitions to Complete, and preserved when transitioning to Archived
- Milestone names should be descriptive and reflect the group's theme (e.g., "Core Workflow", "Advanced Features", "Polish & Launch")

### Section Placement

The `## Milestones` section is placed in ROADMAP.md at a specific location:

```
## Phase Details        <-- existing section
...phases listed here...

## Milestones           <-- milestone section goes HERE
...milestones listed...

## Progress             <-- existing section
...progress table...
```

This ordering ensures milestones are visible after the phase details they group, and before the progress table they summarize.

---

## Section 2: Milestone Definition

How to propose and define milestones when they don't exist in ROADMAP.md yet.

### Auto-Propose Milestones

```
Step 1: Read ROADMAP.md phase list
  - Parse the ## Phase Details section
  - Extract all phase numbers, names, and descriptions
  - Count total phases

Step 2: Analyze phases for logical groupings
  Look for:
  - Shared theme (e.g., "core workflow", "advanced features", "integrations")
  - Dependency clusters (phases that build on each other)
  - Natural break points (major deliverables or user-facing milestones)
  - Group size: aim for 3-7 phases per milestone

Step 3: Propose 2-4 milestones
  For each proposed milestone, include:
  - Name: descriptive theme label
  - Phase range: {start}-{end} (inclusive, no gaps or overlaps)
  - Goal: one-line description of what this milestone delivers

Step 4: Present proposals to user
  Use AskUserQuestion to show the proposed milestones:
  "Here are the proposed milestones for your project:

  Milestone 1: {name} (Phases {start}-{end})
  Goal: {goal}

  Milestone 2: {name} (Phases {start}-{end})
  Goal: {goal}

  ...

  Accept these milestones, or describe changes?"

Step 5: Handle user response
  - Accept: proceed to write milestones
  - Modify: adjust boundaries, names, or goals as directed
  - Define from scratch: user provides their own groupings
```

### Write Milestones to ROADMAP.md

```
Step 1: Read current ROADMAP.md

Step 2: Validate milestone ranges
  - Ranges must cover all phases exactly (no gaps, no overlaps)
  - Each phase appears in exactly one milestone
  - If validation fails: report the issue and ask user to fix

Step 3: Insert ## Milestones section
  - Place after ## Phase Details and before ## Progress
  - Add each milestone as ### Milestone {N}: {name} with fields

Step 4: Derive initial status for each milestone
  - Read the Progress table for each phase in the milestone's range
  - If all phases have Status = "Complete" → milestone Status = Complete
  - If any phase has Status != empty/Pending → milestone Status = In Progress
  - If no phases have started → milestone Status = Pending
  - If Status = Complete, add Completed field with today's date

Step 5: Write updated ROADMAP.md
```

---

## Section 3: Milestone Completion

How to check and mark a milestone as complete.

### Pre-Flight Checks

```
Step 1: Read ROADMAP.md
  - Verify ## Milestones section exists
  - If missing: offer to define milestones (Section 2) instead of erroring

Step 2: Identify target milestone
  - If milestone number specified: find that milestone
  - If not specified: auto-detect the earliest milestone with Status = "In Progress"
  - If no In Progress milestones found: report "No milestones are currently in progress"

Step 3: Verify all phases are Complete
  - Read the Progress table
  - For each phase in the milestone's range (start through end inclusive):
    - Check that Status = "Complete"
  - If any phase is NOT Complete:
    - Report exactly which phases are incomplete
    - Show each incomplete phase's current status
    - Do NOT mark the milestone complete
    - Exit completion flow

Step 4: Verify reviews passed
  - Check for UAT.md files in each phase directory
  - Or check STATE.md for review status indicators
  - If reviews are missing: warn but do not block completion
```

### Generate Milestone Summary

```
Step 1: Create .planning/milestones/ directory if it doesn't exist

Step 2: Check if .planning/milestones/MILESTONE-{N}.md already exists
  - If it exists: ask user whether to overwrite or skip summary generation
  - If overwrite: proceed
  - If skip: go directly to "Mark milestone complete"

Step 3: Gather quantitative metrics
  From ROADMAP.md Progress table for phases in range:
  - Total plans: sum of Plans column
  - Plans completed: sum of Completed column
  - Phases: count of phases in the milestone (end - start + 1)

  From REQUIREMENTS.md traceability table:
  - Find all requirement IDs mapped to phases in the milestone's range
  - Count how many are checked [x] vs total
  - Format: {checked}/{total} requirements satisfied

  From SUMMARY.md files for each phase:
  - Extract key-files lists (created/modified)
  - Deduplicate and count

  From CONTEXT.md files for each phase:
  - Extract agent recommendations
  - Deduplicate agent IDs

Step 4: Gather qualitative data
  From SUMMARY.md files:
  - Extract key outcomes (done text or summary bullet points)
  - One line per phase summarizing the key deliverable

  From STATE.md:
  - Collect decisions from "Recent Decisions" that relate to phases in range
  - Extract relevant decision text

Step 5: Write .planning/milestones/MILESTONE-{N}.md
```

### Milestone Summary Template

```markdown
# Milestone {N}: {name} — Summary

## Completed
{YYYY-MM-DD}

## Goal
{milestone goal from ROADMAP.md}

## Metrics
| Metric | Value |
|--------|-------|
| Phases | {count} |
| Plans completed | {completed}/{total} |
| Requirements satisfied | {count} |
| Key files | {count} created/modified |

## Phase Outcomes
| Phase | Name | Plans | Key Deliverable |
|-------|------|-------|-----------------|
| {N} | {name} | {count} | {one-line from SUMMARY} |
...

## Key Decisions
- {decision 1}
- {decision 2}
...

## Files Created
- {list of key files created across all phases, grouped by type}

## Archive Location
.planning/archive/milestone-{N}/
```

### Mark Milestone Complete

```
Step 1: Read ROADMAP.md

Step 2: Find the milestone's ### heading

Step 3: Update Status from "In Progress" to "Complete"

Step 4: Add Completed field with today's date:
  - **Completed**: {YYYY-MM-DD}

Step 5: Write updated ROADMAP.md
```

### Update STATE.md

```
Step 1: Read STATE.md

Step 2: Add or update a ## Milestones section
  - Place after Recent Decisions section
  - Add entry: - Milestone {N}: {name} — Complete ({YYYY-MM-DD})
  - If section already exists: append the new milestone entry

Step 3: Write updated STATE.md
```

---

## Section 4: Milestone Archiving

How to archive a completed milestone's phase artifacts.

### Pre-Flight Checks

```
Step 1: Verify milestone status
  - Read ROADMAP.md ## Milestones section
  - Find the target milestone
  - Status must be "Complete" (not Pending, In Progress, or Archived)
  - If Pending or In Progress: report "Milestone {N} is not complete. Complete it first."
  - If Archived: report "Milestone {N} is already archived at .planning/archive/milestone-{N}/"

Step 2: Verify milestone summary exists
  - Check .planning/milestones/MILESTONE-{N}.md exists
  - If missing: run completion first (Section 3) to generate the summary

Step 3: Verify phase directories exist
  - For each phase in the milestone's range:
    - Check .planning/phases/{NN-name}/ exists
  - If some are missing: report which are missing, ask whether to proceed with partial archive
```

### Archive Operations

```
Step 1: Create archive directory
  - Create .planning/archive/ if it doesn't exist
  - Create .planning/archive/milestone-{N}/ directory
  - If .planning/archive/milestone-{N}/ already exists:
    Ask user whether to continue (move remaining dirs) or abort

Step 2: Move phase directories
  For each phase in the milestone's range:
  - Source: .planning/phases/{NN-name}/
  - Destination: .planning/archive/milestone-{N}/{NN-name}/
  - Move the entire directory (preserving all files: CONTEXT.md, PLAN.md, SUMMARY.md, UAT.md)

Step 3: Verify moves
  For each moved phase:
  - Confirm destination directory exists
  - Confirm source directory is gone
  - If any move failed: report the failure, continue with remaining phases
```

### Update State Files After Archiving

```
ROADMAP.md updates:
  1. Read ROADMAP.md
  2. Update the milestone's Status from "Complete" to "Archived"
  3. In the Progress table, append " (Archived)" to the Status of each archived phase
     Example: "Complete" becomes "Complete (Archived)"
  4. Write updated ROADMAP.md

STATE.md updates:
  1. Read STATE.md
  2. Condense Phase Results sections for archived phases:
     Replace each ## Phase {N} Results block with:
       ## Phase {N} Results — Archived
       See .planning/milestones/MILESTONE-{M}.md and .planning/archive/milestone-{M}/{NN-name}/
  3. Update the Milestones section:
     Change: - Milestone {N}: {name} — Complete ({date})
     To:     - Milestone {N}: {name} — Archived ({date})
  4. Write updated STATE.md

Milestone summary updates:
  1. Read .planning/milestones/MILESTONE-{N}.md
  2. Add to the Archive Location section:
     Archived on {YYYY-MM-DD}
  3. Write updated milestone summary
```

---

## Section 5: Milestone Metrics

Formulas for computing milestone-level metrics. These are used by both the completion summary and the `/legion:milestone` status display.

### Phase Progress

```
phases_complete = count of phases in range with Status = "Complete" in ROADMAP.md Progress table
phases_total = end - start + 1 (inclusive range)
percentage = floor((phases_complete / phases_total) * 100)
```

### Plan Progress

```
plans_complete = sum of Completed column for phases in range from ROADMAP.md Progress table
plans_total = sum of Plans column for phases in range
plan_percentage = floor((plans_complete / plans_total) * 100)
```

### Progress Bar Rendering

```
Use plan_percentage as the primary metric (more granular than phase count)
Progress bar: 10 characters wide
filled = floor(plan_percentage / 10)
empty = 10 - filled
Format: [{filled blocks}{empty dots}] {plan_percentage}%

Examples:
  100% → [##########] 100%
   73% → [#######...] 73%
    0% → [..........] 0%
```

### Requirement Coverage

```
1. Read REQUIREMENTS.md traceability table
2. Find all requirement IDs mapped to phases in the milestone's range
3. Count how many are checked [x] vs total
4. Format: {checked}/{total} requirements satisfied

Example: 12/15 requirements satisfied
```

### Aggregated Milestone Display

When showing multiple milestones (e.g., in `/legion:milestone` status), render each as:

```
Milestone 1: Core Workflow (Phases 1-7) — Complete
[##########] 100%  |  14/14 plans  |  12/12 requirements

Milestone 2: Advanced Features (Phases 8-14) — In Progress
[####......] 40%   |  4/10 plans   |  3/8 requirements
```

---

## Section 6: Error Handling

How to handle failures and edge cases across all milestone operations.

- **No ## Milestones section in ROADMAP.md**: Offer to define milestones using the Section 2 definition flow. Do not error — this is an expected state for projects that haven't set up milestones yet. Display: "No milestones defined yet. Would you like to define them now?"

- **Incomplete phases in milestone**: Report exactly which phases are incomplete. List their current status from the Progress table. Do NOT mark the milestone complete. Display: "Cannot complete Milestone {N} — the following phases are not yet complete: Phase {X} ({status}), Phase {Y} ({status})"

- **Missing phase directories during archive**: Report the missing directories by path. Archive what exists, note gaps in the milestone summary. Display: "Phase directory .planning/phases/{NN-name}/ not found — skipping. Archiving remaining phases."

- **Already archived milestone**: Report the archive location and do not re-archive. Display: "Milestone {N} is already archived at .planning/archive/milestone-{N}/. No action needed."

- **Milestone summary already exists**: During completion, check if `.planning/milestones/MILESTONE-{N}.md` exists. If so, ask user via AskUserQuestion: "Milestone summary already exists at .planning/milestones/MILESTONE-{N}.md. Overwrite with fresh metrics, or skip summary generation?"

- **Archive directory already exists**: If `.planning/archive/milestone-{N}/` already exists (partial previous archive attempt), ask user: "Archive directory already exists. Continue moving remaining phase directories, or abort archiving?"

- **Permission errors on directory moves**: Report clearly with the exact source and destination paths that failed. Display: "Failed to move .planning/phases/{NN-name}/ to .planning/archive/milestone-{N}/{NN-name}/. Check filesystem permissions."

- **Phase range gaps or overlaps**: During milestone definition (Section 2), validate that ranges cover all phases exactly. If gaps found: "Phases {X}-{Y} are not covered by any milestone. All phases must belong to exactly one milestone." If overlaps found: "Phase {X} is covered by both Milestone {A} and Milestone {B}. Phase ranges must not overlap."

- **No phases in range exist in ROADMAP.md**: If the milestone references phases that don't appear in the Phase Details section: "Milestone {N} references Phases {start}-{end}, but only Phases 1-{max} exist in ROADMAP.md. Adjust the milestone range."

- **Empty Progress table**: If the Progress table has no rows or is malformed: "Cannot calculate milestone status — ROADMAP.md Progress table is empty or malformed. Run `/legion:plan` to populate phases first."
