---
name: legion:milestone
description: Milestone management — status, definition, completion, and archiving
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, AskUserQuestion]
---

<objective>
Display milestone status, define milestone groupings, mark milestones complete with summaries, and archive completed milestone artifacts. Handles the full milestone lifecycle through a single command.

Purpose: Single command for milestone lifecycle management — definition, tracking, completion, and archiving.
Output: Milestone dashboard with actionable operations.
</objective>

<execution_context>
skills/workflow-common-core/SKILL.md
skills/milestone-tracker/SKILL.md
skills/execution-tracker/SKILL.md
skills/github-sync/SKILL.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
</context>

<process>
1. CHECK PROJECT EXISTS
   - Attempt to read .planning/PROJECT.md
   - If not found:
     Display:
     "No Legion project found in this directory.
      Run `/legion:start` to initialize a new project."
   - Exit — do not proceed to step 2

2. READ PROJECT STATE
   Read these files:
   a. .planning/PROJECT.md — extract project name
   b. .planning/ROADMAP.md — extract:
      - Phase list with status from Progress table
      - Milestones section (if it exists)
   c. .planning/STATE.md — extract current phase and status

3. CHECK MILESTONES DEFINED
   Look for `## Milestones` section in ROADMAP.md.

   If NOT found:
     Display:
     "# {project_name} — Milestones

      No milestones defined yet.
      Milestones group phases into major deliverables for tracking and archiving."

     Present via adapter.ask_user:
     "Would you like to define milestones for this project?"
     Options:
     - "Define milestones" — "Analyze phases and propose logical milestone groupings"
     - "Skip for now" — "Return without defining milestones"

     If "Define milestones": Go to Step 7 (DEFINE MILESTONES)
     If "Skip for now": Display "Run `/legion:milestone` anytime to set up milestones." → Exit

   If found: proceed to Step 4

4. DISPLAY MILESTONE STATUS
   For each milestone in the ## Milestones section:
   a. Extract: name, phase range (start-end), goal, status
   b. For each phase in the range:
      - Read its status from the ROADMAP.md Progress table
      - Count completed vs total plans
   c. Calculate milestone progress using milestone-tracker Section 5 formulas
   d. Determine display status

   Output:

   # {project_name} — Milestones

   | # | Milestone | Phases | Progress | Status |
   |---|-----------|--------|----------|--------|
   | 1 | {name} | {start}-{end} | [{bar}] {pct}% | {status} |
   | 2 | {name} | {start}-{end} | [{bar}] {pct}% | {status} |
   ...

   Progress bar: 10 characters wide per milestone-tracker Section 5.
   - filled = floor(milestone_percentage / 10)
   - empty = 10 - filled
   - Format: [{"#" * filled}{"." * empty}]

   Status display:
   - Pending: "Pending"
   - In Progress: "In Progress"
   - Complete: "Complete ({date})"
   - Archived: "Archived ({date})"

   Below the table, show the current milestone (the In Progress one, or next Pending if none In Progress):

   ## Current: Milestone {N} — {name}
   **Goal**: {goal}
   **Phases {start}-{end}**:
   | Phase | Name | Plans | Status |
   |-------|------|-------|--------|
   | {N} | {name} | {completed}/{total} | {status} |
   ...

5. PRESENT OPTIONS
   Based on milestone state, determine available actions:

   **Always available**:
   - "View milestone details" — "Deep dive into a specific milestone's phases and deliverables"
   - "Done" — "Return to normal operation"

   **If any milestone has Status = "In Progress" and ALL its phases are "Complete"**:
   - "Complete milestone {N}" — "Mark '{name}' done and generate summary with metrics"

   **If any milestone has Status = "Complete" (not yet Archived)**:
   - "Archive milestone {N}" — "Move '{name}' phase files to archive to reduce clutter"

   **If milestones need redefinition**:
   - "Redefine milestones" — "Re-analyze phase groupings and update milestone boundaries"

   Present options via adapter.ask_user:
   "What would you like to do?"

6. HANDLE USER CHOICE

   **Path A: View milestone details**
   - If multiple milestones: ask which one (adapter.ask_user with milestone names)
   - Display full details for the selected milestone:
     - Goal, phase range
     - Per-phase breakdown: plan count, key deliverables from SUMMARY.md files
     - Requirement coverage: which requirements are satisfied by this milestone's phases
     - If milestone is Complete or Archived: show the summary from .planning/milestones/MILESTONE-{N}.md
   - Return to Step 5

   **Path B: Complete milestone**
   Follow milestone-tracker Section 3 (Milestone Completion):
   a. Run pre-flight checks — all phases must be Complete
   b. If checks fail: report incomplete phases, return to Step 5
   c. Generate milestone summary:
      - Gather metrics (plans, requirements, files, agents)
      - Gather qualitative data (outcomes, decisions)
      - Write .planning/milestones/MILESTONE-{N}.md
   d. Mark milestone complete in ROADMAP.md
   e. Update STATE.md with milestone completion
   f. Create git commit following execution-tracker Section 6 milestone completion format:
      ```
      git add .planning/milestones/ .planning/ROADMAP.md .planning/STATE.md
      git commit -m "chore(legion): complete milestone {N} — {name}

      Phases {start}-{end}: {count} phases, {plans} plans
      Requirements: {req_count} satisfied
      Summary: .planning/milestones/MILESTONE-{N}.md

      {adapter.commit_signature}"
      ```
   f2. CLOSE GITHUB MILESTONE (optional — follows github-sync Section 8)
       - Check GitHub availability: gh auth status && git remote get-url origin
       - If github_available and STATE.md ## GitHub section has a milestone number for this milestone:
         Close the GitHub milestone: gh api "repos/{REPO_SLUG}/milestones/{number}" --method PATCH -f state=closed
         (github-sync Section 4.2)
       - If github_available is false: skip silently

   g. Display:
      "Milestone {N}: {name} — Complete!
       Summary written to .planning/milestones/MILESTONE-{N}.md
       Run `/legion:milestone` to archive when ready."
   - Return to Step 5

   **Path C: Archive milestone**
   Follow milestone-tracker Section 4 (Milestone Archiving):
   a. Run pre-flight checks — milestone must be Complete, summary must exist
   b. If checks fail: report what's missing, return to Step 5
   c. Confirm with user:
      "Archive Milestone {N}: {name}?
       This will move {count} phase directories from .planning/phases/ to .planning/archive/milestone-{N}/.
       Files remain accessible in the archive location."
      Options: "Archive" / "Cancel"
   d. If Cancel: return to Step 5
   e. If Archive:
      - Create .planning/archive/milestone-{N}/ directory
      - Move each phase directory from .planning/phases/ to .planning/archive/milestone-{N}/
      - Update ROADMAP.md: milestone Status → Archived, phase rows get "(Archived)" note
      - Update STATE.md: condense archived phase results, update Milestones section
      - Update milestone summary: add archive date
   f. Create git commit following execution-tracker Section 6 milestone archive format:
      ```
      git add -A
      git commit -m "chore(legion): archive milestone {N} — {name}

      Phases moved to .planning/archive/milestone-{N}/
      STATE.md and ROADMAP.md updated

      {adapter.commit_signature}"
      ```
   g. Display:
      "Milestone {N}: {name} — Archived!
       Phase directories moved to .planning/archive/milestone-{N}/
       Summary preserved at .planning/milestones/MILESTONE-{N}.md"
   - Return to Step 5

   **Path D: Redefine milestones**
   - Go to Step 7 (DEFINE MILESTONES) — overwrites existing milestone definitions

   **Path E: Done**
   - Display: "Milestone view closed. Run `/legion:milestone` anytime for milestone management."
   - Exit

7. DEFINE MILESTONES
   Follow milestone-tracker Section 2 (Milestone Definition):
   a. Read ROADMAP.md phase list — all phases with names and goals
   b. Analyze for logical groupings:
      - Look for theme clusters (infrastructure, features, integrations, etc.)
      - Consider dependency chains
      - Aim for 2-4 milestones with 3-7 phases each
   c. Present proposed milestones:
      "Based on your {count} phases, here are proposed milestone groupings:"

      | # | Milestone | Phases | Goal |
      |---|-----------|--------|------|
      | 1 | {name} | {start}-{end} | {goal} |
      ...

   d. Ask via adapter.ask_user:
      "Accept these milestone groupings?"
      Options:
      - "Accept" — "Use these milestone definitions"
      - "Modify" — "Let me adjust the groupings"

   e. If "Modify": Ask for specific changes (which phases to regroup, new names, etc.)
   f. If "Accept" or after modifications:
      - Write ## Milestones section to ROADMAP.md per milestone-tracker Section 2
      - Derive initial status for each milestone:
        - All phases Complete → "Complete"
        - Any phase In Progress or later → "In Progress"
        - All phases Pending → "Pending"
      - Display: "Milestones defined in ROADMAP.md. {count} milestones covering {total_phases} phases."
   g. Return to Step 4 to display the newly defined milestone status

IMPORTANT:
- The command always starts by checking if milestones are defined — definition is a prerequisite
- Completion requires ALL phases in the milestone to be Complete — no partial completions
- Archiving is separate from completion — users can keep completed milestones without archiving
- Archive confirmation asks the user explicitly (destructive-ish operation — moving files)
- Git commits use execution-tracker Section 6 conventions
- The action loop (Steps 5-6) keeps the user in milestone context until they choose "Done"
- All operations handle missing/stale state gracefully
</process>
</output>
