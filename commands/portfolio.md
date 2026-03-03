---
name: legion:portfolio
description: Multi-project portfolio dashboard with cross-project dependency tracking
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, Agent, AskUserQuestion]
---

<objective>
Display a multi-project dashboard from the global portfolio registry, show cross-project dependencies and agent allocation, and offer Studio Producer strategic coordination on demand.

Purpose: Single command for cross-project visibility and strategic coordination.
Output: Dashboard display with actionable next steps.
</objective>

<execution_context>
skills/workflow-common/SKILL.md
skills/portfolio-manager/SKILL.md
skills/agent-registry/SKILL.md
</execution_context>

<context>
Portfolio registry: ~/.claude/legion/portfolio.md
Studio Producer: agents/project-management-studio-producer.md
</context>

<process>
1. LOAD PORTFOLIO REGISTRY
   - Attempt to read `~/.claude/legion/portfolio.md`
   - If not found:
     Display:
     "No portfolio registry found at `~/.claude/legion/portfolio.md`
      Run `/legion:start` in a project to register it, or use Step 8 to register manually."
     Exit — do not proceed to Step 2
   - If found but empty (no `###` project headings under `## Projects`):
     Display:
     "Portfolio is empty — no projects registered.
      Run `/legion:start` in a project directory to add it to the portfolio."
     Exit — do not proceed to Step 2
   - If found with projects: proceed to Step 2

2. VALIDATE REGISTERED PROJECTS
   For each project in the registry (each `###` heading under `## Projects`):
   a. Extract the project path from the "**Path**:" field
   b. Check if the directory exists (use Bash: `test -d "{path}"`)
   c. If directory exists:
      - Read `{path}/.planning/STATE.md` — extract phase, status, last activity
      - Read `{path}/.planning/ROADMAP.md` — extract phase list, progress table
      - Calculate completion % using execution-tracker Section 5 formula:
        - Sum all "Plans" values = total_plans
        - Sum all "Completed" values = completed_plans
        - Percentage = floor((completed_plans / total_plans) * 100)
      - Assess health using portfolio-manager Section 3 rules:
        - Green `[OK]`: on track, no blockers, recent activity
        - Yellow `[!!]`: "escalated"/"failed"/"blocked" in status, or 7+ days inactive
        - Red `[XX]`: directory missing (Stale), or unresolved blockers 3+ phases
   d. If directory doesn't exist:
      - Mark project status as Stale in registry
      - Set health to Red `[XX]`
      - Note: "Project directory not found at {path}"

3. DISPLAY PORTFOLIO DASHBOARD
   Output the dashboard:

   ```
   # Legion Portfolio

   **{active_count} active projects** | {total_count} registered | {at_risk_count} at risk

   ## Projects

   | Project | Phase | Progress | Health | Last Activity |
   |---------|-------|----------|--------|---------------|
   | {name} | {N}/{M}: {phase_name} | [{bar}] {pct}% | {health} | {date} — {activity} |
   ```

   Health indicators (text-based, no emoji):
   - `[OK]` = Green (on track)
   - `[!!]` = Yellow (at risk — stale activity, escalated, or failed)
   - `[XX]` = Red (blocking — project missing, unresolved blockers)

   Progress bar format (10 chars wide):
   - filled = floor(percentage / 10)
   - empty = 10 - filled
   - Format: `[{"#" * filled}{"." * empty}]`

   Sort projects: Red first (needs attention), then Yellow, then Green.
   Within each group, sort by last activity (most recent first).

4. DISPLAY CROSS-PROJECT DEPENDENCIES
   Read the Cross-Project Dependencies table from PORTFOLIO.md.

   If no dependencies:
   ```
   ## Dependencies
   No cross-project dependencies registered.
   Tip: Use the "Add dependency" option below to link project phases.
   ```

   If dependencies exist:
   ```
   ## Dependencies

   | # | From | To | Status | Impact |
   |---|------|----|--------|--------|
   | DEP-01 | {proj-a}: Phase {N} | {proj-b}: Phase {M} | {Resolved/Blocking} | {impact text} |
   ```

   For each dependency:
   a. Check if the "From" phase is complete (read From project's ROADMAP.md)
   b. If complete: Status = "Resolved"
   c. If not complete: Status = "Blocking"
   d. Impact text: "{To project} Phase {M} is waiting on {From project} Phase {N}"

   Display blocking count: `{blocking_count} of {total_count} dependencies blocking`

5. DISPLAY AGENT ALLOCATION
   Follow portfolio-manager Section 5 to derive agent allocation:

   ```
   ## Agent Allocation
   ```

   If only 1 project:
   "Agent allocation tracking requires 2+ projects."

   If 2+ projects:
   ```
   **Shared agents** (used in 2+ projects):
   | Agent | Division | Projects |
   |-------|----------|----------|
   | {agent-id} | {division} | {project-a}, {project-b} |

   **Division coverage**:
   | Division | Projects Using | Agents Available |
   |----------|---------------|-----------------|
   | engineering | {count} | 7 |
   | design | {count} | 6 |
   | marketing | {count} | 8 |
   | product | {count} | 3 |
   | project-management | {count} | 5 |
   | testing | {count} | 7 |
   | support | {count} | 6 |
   | spatial-computing | {count} | 6 |
   | specialized | {count} | 3 |
   ```

   If no agent overlap detected: "No agents are shared across projects."

6. DISPLAY NEXT ACTIONS
   Based on the portfolio state, present options via AskUserQuestion:

   "What would you like to do?"
   Options:
   - "View project details" — "Deep dive into one project's phase history and state"
   - "Add dependency" — "Link phases across projects (e.g., Project A Phase 3 blocks Project B Phase 1)"
   - "Studio Producer analysis" — "Invoke Studio Producer agent for cross-project strategy (uses Opus)"
   - "Done" — "Return to normal operation"
   - If answer is empty, unparseable, or does not match any offered option:
     re-ask as plain text: "Reply with 1 (view details), 2 (add dependency), 3 (Studio Producer analysis), or 4 (done)." and wait

7. HANDLE USER CHOICE

   **Path A: View project details**
   - If multiple projects: ask user to pick one (AskUserQuestion with project names as options)
     - If answer is empty, unparseable, or does not match any offered option:
       re-ask as plain text with numbered choices matching the project names and wait
   - Read the selected project's STATE.md and ROADMAP.md
   - Display detailed project view:
     - Current phase, plans breakdown, phase history
     - Recent decisions, next action for that project
     - Any pre-existing issues from STATE.md
   - After display, return to Step 6

   **Path B: Add dependency**
   - Ask user via AskUserQuestion: "Which project is the source (blocker)?"
     Present registered project names as options
     - If answer is empty, unparseable, or does not match any offered option:
       re-ask as plain text with numbered choices matching the project names and wait
   - Ask: "Which phase in {source_project} must complete first?"
   - Ask: "Which project depends on this?"
   - Ask: "Which phase in {target_project} is blocked?"
   - Ask: "Dependency type?" — Options: "blocks (hard)" / "informs (soft)"
   - Follow portfolio-manager Section 4 (Add Dependency):
     - Read PORTFOLIO.md
     - Assign next DEP-{NN} ID
     - Add row to Cross-Project Dependencies table
     - Write PORTFOLIO.md
   - Display: "Dependency DEP-{NN} added: {source}:Phase {N} {type} {target}:Phase {M}"
   - Return to Step 6

   **Path C: Studio Producer analysis**
   - Read the Studio Producer personality file in full:
     `agents/project-management-studio-producer.md`
   - Construct a prompt with full personality injection:
     ```
     {full Studio Producer personality content}

     ---

     # Portfolio Analysis Task

     You are analyzing a portfolio of {count} Legion projects.
     Provide strategic coordination insights.

     ## Portfolio State

     {paste the full dashboard output from Steps 3-5 here}

     ## Instructions
     - Analyze the portfolio holistically — resource conflicts, dependency risks, strategic alignment
     - Identify the highest-priority cross-project actions
     - Recommend sequencing if projects compete for similar agent specialties
     - Flag any projects that should be paused, accelerated, or deprioritized
     - Use your Strategic Portfolio Plan Template to structure recommendations
     - Keep the analysis concise (under 500 words) and actionable
     - Format as a brief executive summary, not a full portfolio plan
     ```
   - Spawn via Agent tool:
     - subagent_type: "general-purpose"
     - model: "opus" (strategic decisions = Opus per cost profile)
     - name: "studio-producer-portfolio"
     - prompt: {constructed prompt above}
   - Display the Studio Producer's analysis to the user
   - Return to Step 6

   **Path D: Done**
   - Display: "Portfolio view closed. Run `/legion:portfolio` anytime for cross-project status."
   - Exit

8. MANUAL REGISTRATION (fallback for projects not created with /legion:start)
   This step is only reached if the user explicitly asks to register a project manually,
   or if Step 1 shows no registry and the user wants to register the current project.

   - Confirm current directory has `.planning/PROJECT.md`
   - If not: "This directory doesn't have a Legion project. Run `/legion:start` first."
   - If yes: Follow portfolio-manager Section 2 (Register Project):
     a. Create `~/.claude/legion/` directory if needed
     b. Read or initialize `~/.claude/legion/portfolio.md`
     c. Register the current project with name, path, date, description
     d. Update metadata counts
     e. Write the updated registry
   - Display: "Registered {project_name} in portfolio."
   - Proceed to Step 2 to show the dashboard

IMPORTANT:
- The command works from ANY directory — it reads the global registry, not local state
- The dashboard is read-only and lightweight unless Studio Producer is invoked
- Studio Producer uses Opus because it's a strategic planning decision
- The action loop (Steps 6-7) keeps the user in portfolio context until they choose "Done"
- All operations handle missing/stale projects gracefully
- Dependencies are validated against live project state, not just registry entries
</process>
</output>