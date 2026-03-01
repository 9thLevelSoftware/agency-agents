---
name: agency:status
description: Show project progress dashboard and route to next action
allowed-tools: [Read, Grep, Glob]
---

<objective>
Read project state and display a clear progress dashboard. Route the user to the appropriate next /agency: command based on current status.
</objective>

<execution_context>
@./.claude/skills/agency/workflow-common.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<process>
1. Read STATE.md for current position, progress, and recent activity
2. Read ROADMAP.md for phase details and completion status
3. Display dashboard:
   - Project name and phase progress bar
   - Current phase: name, status, plans completed/total
   - Recent activity log
   - Blockers (if any)
4. Route to next action based on state:
   - No PROJECT.md → suggest /agency:start
   - Phase not planned → suggest /agency:plan N
   - Phase planned, not executed → suggest /agency:build
   - Phase executed, not reviewed → suggest /agency:review
   - Phase reviewed, more phases → suggest /agency:plan N+1
   - All phases complete → display completion summary
5. Display the suggested command for the user to run
</process>
