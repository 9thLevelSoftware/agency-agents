---
name: legion:status
description: Show project progress dashboard and route to next action
argument-hint: [--dry-run]
allowed-tools: [Read, Grep, Glob]
---

<objective>
Read project state and display a clear progress dashboard with session resume context. Route the user to the appropriate next /legion: command based on current project state.

Purpose: Single command to understand where the project is and what to do next.
Output: Dashboard display with next-action routing.
</objective>

<execution_context>
skills/workflow-common-core/SKILL.md
skills/execution-tracker/SKILL.md
skills/milestone-tracker/SKILL.md
skills/intent-router/SKILL.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<process>
DRY-RUN MODE (deterministic, no side effects)
   - If `$ARGUMENTS` contains `--dry-run`, DO NOT write files, spawn agents, commit, or perform external side effects.
   - Validate readability of project state inputs and route computation prerequisites only.
   - Output a deterministic dry-run report artifact to stdout with sections:
     - Command: `status`
     - Input files detected
     - Prerequisite checks: PASS/FAIL with reasons
     - Routing preview (next suggested command)
     - Skills that would load (always + conditional)
   - Stop after reporting.

0. CONDITIONAL SKILL LOADING (context budget)
   Load optional skills only when their inputs exist:
   
   - `skills/workflow-common-memory/SKILL.md` only if `.planning/memory/OUTCOMES.md` exists.
   
   - `skills/workflow-common-github/SKILL.md` only if STATE.md contains a GitHub section and `gh` is available.
   - `skills/codebase-mapper/SKILL.md` only if `.planning/CODEBASE.md` exists.
   If a condition is not met, skip that skill silently and continue.
1. CHECK PROJECT EXISTS
   - Attempt to read .planning/PROJECT.md
   - If not found:
     Display:
     "No Legion project found in this directory.
      Run `/legion:start` to initialize a new project."
   - Exit — do not proceed to step 2

2. READ PROJECT STATE
   Read these files (all required for full dashboard):
   a. .planning/PROJECT.md — extract project name from the "# {name}" heading
   b. .planning/STATE.md — extract:
      - Current phase number and total phases (from "Phase: N of M")
      - Phase status (from "Status:" field)
      - Last activity (from "Last Activity:" field)
      - Next action (from "Next Action:" field)
      - Recent decisions (from "Recent Decisions" section, last 3)
      - Pre-existing issues (from "Pre-existing Issues" section, if any)
      - Phase results for the current phase (from "Phase {N} Results" section)
   c. .planning/ROADMAP.md — extract:
      - Phase list with names, goals, and completion status
      - Progress table: phase name, plans count, completed count, status per phase
   d. .planning/REQUIREMENTS.md — if exists, count checked vs unchecked requirements
   e. .planning/ROADMAP.md `## Milestones` section — if present, extract:
      - Each milestone: name, phase range, status
      - The current milestone (the one containing the current phase number)
   f. .planning/memory/OUTCOMES.md — if present, follow memory-manager Section 4 "Recall Session Briefing":
      - recent_outcomes: last 5 outcomes with decay scores
      - top_agents: top 3 agents by task count and success rate
      - total_records: total count of all outcome records
      If .planning/memory/OUTCOMES.md does not exist: skip, set memory_available = false

   g. `.planning/config/directory-mappings.yaml` — if exists:
      - Run change detection (codebase-mapper Section 16.1)
      - Assess significance (codebase-mapper Section 16.2)
      - Set directory_mappings status:
        ```yaml
        directory_mappings:
          exists: true
          last_updated: {date from mappings file}
          status: {current | stale}
          changes_detected: significance.level != "none"
          significance: significance.level
          recommendation: significance.recommendation
        ```

   h. STATE.md `## GitHub` section — if present, extract:
      - Phase-to-issue mapping table
      - Phase-to-PR mapping table
      - Milestone mapping table (if present)
      If ## GitHub section does not exist: skip, set github_metadata_available = false

   i. .planning/CODEBASE.md — if exists, extract:
      - Analyzed date from the header
      - Calculate age in days from current date
      - Set codebase_map_available = true, codebase_map_age = {days}
      If .planning/CODEBASE.md does not exist: skip, set codebase_map_available = false

3. CALCULATE PROGRESS
   Follow execution-tracker Section 5 (Progress Calculation):
   a. Read the ROADMAP.md progress table
   b. Sum all "Plans" values = total_plans
   c. Sum all "Completed" values = completed_plans
   d. Percentage = floor((completed_plans / total_plans) * 100)
   e. Progress bar: 20 characters wide
      - filled = floor(percentage / 5)
      - empty = 20 - filled
      - Format: [{"#" * filled}{"." * empty}] {pct}% — {completed}/{total} plans complete

4. DISPLAY DASHBOARD
   Output the dashboard in this exact format:

   # {project_name} — Status

   {progress_bar}

   ## Current Phase
   **Phase {N}: {phase_name}** — {status}
   Plans: {completed_in_phase}/{total_in_phase}
   Goal: {phase_goal from ROADMAP.md}

   If milestones are defined in ROADMAP.md:

   ## Current Milestone
   **Milestone {N}: {name}** — {status}
   Phases {start}-{end} | {phases_complete}/{phases_total} phases complete

   If the current milestone is Complete but not Archived:
   Tip: Run `/legion:milestone` to generate a summary and optionally archive.

   If milestones are NOT defined in ROADMAP.md, omit this section entirely (do not show a placeholder).

   ## Phase History
   | Phase | Status | Plans |
   |-------|--------|-------|
   | 1. {name} | {status_emoji} {status} | {completed}/{total} |
   | 2. {name} | {status_emoji} {status} | {completed}/{total} |
   ...

   Status emojis (use only these):
   - Complete: [x]
   - Executed (pending review): [~]
   - Planned (not yet executed): [-]
   - Pending (not yet planned): [ ]

   ## Recent Activity
   - {Last Activity from STATE.md}
   - {Phase results for current phase, last 3 entries}

   ## Requirements Progress
   {checked_count}/{total_count} requirements complete
   {List unchecked requirements from current phase, if any}

   If codebase_map_available AND codebase_map_age > 30:

   ## Codebase Map
   **Last analyzed**: {analyzed_date} ({codebase_map_age} days ago)
   Tip: Your codebase map is stale (>30 days). Run `/legion:quick analyze codebase` to refresh it.

   If codebase_map_available is false OR codebase_map_age <= 30: omit this section entirely (no placeholder).

   If memory_available (i.e., .planning/memory/OUTCOMES.md exists and has records):

   ## Memory
   **Outcomes**: {total_records} recorded | **Recent** (last 5):
   | Date | Agent | Outcome | Summary |
   |------|-------|---------|---------|
   | {date} | {agent} | {outcome} | {summary} |
   ...

   **Top Agents** (by experience):
   | Agent | Tasks | Success Rate |
   |-------|-------|-------------|
   | {agent_id} | {task_count} | {success_rate}% |
   ...

   If memory is not available (no OUTCOMES.md, or file exists but is empty):
   Omit this section entirely. Do NOT show a placeholder, suggestion, or "no memory" message.

   If `.planning/board/` directory exists and contains meeting directories:

   ## Board Decisions
   | Date | Topic | Verdict | Conditions | Board Size |
   |------|-------|---------|------------|------------|
   | {date} | {topic from dir name} | {verdict from resolution.md} | {conditions count} | {N members} |

   Show the 5 most recent meetings, sorted by date descending. If any meeting has pending conditions (APPROVED WITH CONDITIONS where conditions have not been verified), flag with a warning indicator.

   If `.planning/board/` does not exist or contains no meeting directories:
   Omit this section entirely. Do NOT show a placeholder.

   If github_metadata_available:

   ## GitHub
   Follow github-sync Section 5 (Status Readback):
   - Fetch live issue/PR/milestone status via gh CLI
   - Display:

   | Phase | Issue | PR | Status |
   |-------|-------|----|--------|
   | Phase 1: {name} | #{n} ({state}) | #{n} ({state}) | {summary} |
   ...

   If milestones are linked:
   | Milestone | GitHub | Open/Closed Issues |
   |-----------|--------|--------------------|
   | {name} | #{n} ({state}) | {open}/{total} |

   If gh CLI is unavailable during readback: show STATE.md values with note "(cached — GitHub unreachable)"

   If github_metadata_available is false:
   Omit this section entirely. Do NOT show a placeholder.

If there are pre-existing issues in STATE.md:
    ## Known Issues
    {list pre-existing issues}

If directory_mappings.status == "stale" OR directory_mappings.changes_detected:

    ## Directory Mappings
    Status: ⚠️ Changes detected ({directory_mappings.significance})
    
    New directories: {count}
    Removed directories: {count}
    Modified categories: {count}
    
    Recommendation: {directory_mappings.recommendation}
    
    Actions:
    - Run `/legion:quick analyze codebase` to re-analyze
    - Or: Review and update `.planning/config/directory-mappings.yaml`

5. DETERMINE NEXT ACTION
   Apply this decision tree in order (first match wins):

   a. No ROADMAP.md exists:
      Next: "Run `/legion:start` to initialize the project."

   b. Current phase status contains "pending" or "Pending" in ROADMAP.md:
      Next: "Run `/legion:plan {N}` to plan Phase {N}: {phase_name}."

   c. Current phase status contains "Planned" in ROADMAP.md:
      Next: "Run `/legion:build` to execute Phase {N}: {phase_name}."

   d. Current phase status contains "Executed" or STATE.md says "pending review":
      Next: "Run `/legion:review` to verify Phase {N}: {phase_name}."

   e. Current phase is "Complete" AND there are more phases:
      - Find the next incomplete phase number (N+1)
      Next: "Run `/legion:plan {N+1}` to plan Phase {N+1}: {next_phase_name}."

   e2. Current phase is "Complete" AND it's the last phase of the current milestone AND all phases in the milestone are Complete:
       Next: "Milestone {N}: {name} is complete! Run `/legion:milestone` to mark it done and generate a summary."
       This case takes priority over (e) when a milestone boundary is reached.

   f. All phases are "Complete":
      Next: "All phases complete! Project is finished.
             Run `/legion:quick <task>` for any ad-hoc work."

   g. STATE.md says "escalated" or "failed":
      Next: "Phase {N} needs attention. Review the issues in STATE.md.
             Options:
             - Fix issues manually, then `/legion:review`
             - `/legion:quick <task>` to address specific issues
             - `/legion:plan {N}` to re-plan the phase"

5b. CONTEXT-AWARE SUGGESTIONS (Context-Aware Next Actions)
   Generate proactive next-action suggestions based on project lifecycle position.
   Uses intent-router Section 8: getContextSuggestions().

   a. Call `getContextSuggestions('.planning/STATE.md')` from intent-router Section 8
   b. Receive the current lifecycle position and 2-3 ranked suggestions
   c. Display the suggestions section in the dashboard output:

   ## Suggested Next Actions

   Based on your current position (Phase {N} {status}):

   1. **`/legion:build`** — Execute Phase {N} plans
      _Phase {N} is planned and ready for execution_

   2. **`/legion:status`** — Review plan breakdown
      _Verify plan structure looks correct_

   Format rules:
   - Show command in backtick code format, bolded
   - Show description on same line after em-dash
   - Show reason in italics on next line, indented
   - Number suggestions by priority (1, 2, 3)
   - Maximum 3 suggestions displayed
   - If no suggestions available (degraded state): "Run `/legion:status` for orientation or `/legion:start` to begin a new project."

   Graceful degradation:
   - If intent-router skill loading fails: skip this section silently (no error output)
   - If STATE.md is unparseable: skip this section silently
   - If getContextSuggestions() returns empty suggestions: show the default fallback message
   - Never let suggestion generation block or delay the dashboard display

6. DISPLAY NEXT ACTION
   Output:

   ## Next Action
   {next_action_text from step 5}

   Tip: Run `/legion:quick <task>` anytime for ad-hoc tasks outside the phase workflow.
</process>
