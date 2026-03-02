---
name: legion:portfolio-manager
description: Multi-project portfolio management — registry, state aggregation, dependencies, agent allocation
---

# Portfolio Manager

Core skill for multi-project portfolio management. Defines the global portfolio registry format, CRUD operations, state aggregation, cross-project dependency tracking, and agent allocation visibility.

References:
- State File Locations from `workflow-common.md` (portfolio path at `~/.claude/legion/portfolio.md`)
- State Update Pattern from `workflow-common.md` (Read -> Update -> Write)
- Agent Registry from `agent-registry.md` (agent metadata for allocation tracking)
- Execution Tracker Section 5 from `execution-tracker.md` (progress calculation formula)

---

## Section 1: Portfolio Registry Format

The global portfolio registry lives at `~/.claude/legion/portfolio.md` — outside any project directory, accessible from any working directory.

```markdown
# Legion Portfolio

## Projects

### {project-name}
- **Path**: {absolute-path-to-project-root}
- **Status**: {Active | Paused | Complete | Stale}
- **Registered**: {YYYY-MM-DD}
- **Description**: {one-line description from PROJECT.md}

### {another-project}
- **Path**: {absolute-path}
- **Status**: Active
- **Registered**: {YYYY-MM-DD}
- **Description**: {one-line description}

## Cross-Project Dependencies

| ID | From | To | Type | Status | Notes |
|----|------|----|------|--------|-------|
| DEP-01 | {project-a}:Phase {N} | {project-b}:Phase {M} | blocks | Active | {why} |

## Metadata
- **Last Updated**: {YYYY-MM-DD}
- **Total Projects**: {count}
- **Active Projects**: {count}
```

### Registry Rules

- Each project has a unique heading (`### {project-name}`) — the name from its PROJECT.md
- If two projects have the same name, append the directory basename in parentheses: `### My App (my-app-v2)`
- Status meanings:
  - **Active**: Project directory exists and has valid `.planning/` state
  - **Paused**: User manually marked as paused
  - **Complete**: All phases complete in ROADMAP.md
  - **Stale**: Project directory not found at registered path
- Dependencies use `{project-name}:Phase {N}` notation
- Dependency types:
  - `blocks` — hard dependency, the target phase cannot proceed until the source phase completes
  - `informs` — soft dependency, the source phase output is useful but not required
- The registry file is created automatically on first project registration

---

## Section 2: Registry Operations

Instructions for commands to follow when managing the portfolio registry. These are procedural descriptions, not function signatures.

### Register Project

```
1. Read ~/.claude/legion/portfolio.md
   - If file doesn't exist: create ~/.claude/legion/ directory and initialize with empty structure:
     # Legion Portfolio
     ## Projects
     ## Cross-Project Dependencies
     | ID | From | To | Type | Status | Notes |
     |----|------|----|------|--------|-------|
     ## Metadata
     - **Last Updated**: {today}
     - **Total Projects**: 0
     - **Active Projects**: 0

2. Read the current project's .planning/PROJECT.md
   - Extract project name from the first "# {name}" heading
   - Extract one-line description from the "## What This Is" or first paragraph

3. Get the absolute path of the current working directory

4. Check if this project is already registered (match by Path field):
   - If already registered: update name and description if changed, log "Project already in portfolio"
   - If not registered: add a new ### {project-name} entry under ## Projects:
     ### {project-name}
     - **Path**: {absolute-path}
     - **Status**: Active
     - **Registered**: {today}
     - **Description**: {one-line description}

5. Update the Metadata section:
   - Last Updated: {today}
   - Total Projects: count all ### headings under ## Projects
   - Active Projects: count entries where Status is Active

6. Write the updated ~/.claude/legion/portfolio.md
```

### Unregister Project

```
1. Read ~/.claude/legion/portfolio.md
   - If not found: display "No portfolio registry found. Nothing to unregister."

2. Find the project entry matching the current working directory path
   - Or match by a specified project name if provided

3. Remove the entire ### {project-name} section (heading through last bullet)

4. Remove any rows in the Cross-Project Dependencies table that reference this project

5. Update Metadata section (counts and Last Updated)

6. Write the updated ~/.claude/legion/portfolio.md
```

### List Projects (for dashboard assembly)

```
1. Read ~/.claude/legion/portfolio.md
   - If not found: return empty list

2. Parse each ### {project-name} section under ## Projects

3. For each registered project:
   a. Extract Path from the "**Path**:" field
   b. Check if the directory exists (filesystem check: test -d "{path}")
   c. If directory exists:
      - Read {path}/.planning/STATE.md — extract:
        - Current phase number and total (from "Phase: N of M")
        - Status text (from "Status:" field)
        - Last activity date and description (from "Last Activity:" field)
        - Next action text (from "Next Action:" field)
      - Read {path}/.planning/ROADMAP.md — extract:
        - Phase list with completion status
        - Progress table: plans completed vs total per phase
        - Calculate overall completion % using execution-tracker Section 5 formula
      - Assess health using Section 3 rules
   d. If directory doesn't exist:
      - Mark project status as Stale in the registry
      - Set health to Red
      - Note: "Project directory not found at {path}"

4. Return the assembled project list with live state
```

---

## Section 3: State Aggregation

How to read and aggregate cross-project state for the portfolio dashboard.

### Per-Project State Extraction (from STATE.md)

- Current phase number and total phases
- Status text (e.g., "Phase 5 executing — Plan 05-01 complete")
- Last activity date and description
- Next action text

### Per-Project Progress Extraction (from ROADMAP.md)

- Phase list with completion status (checkmarks in the Phases section)
- Plans completed vs total (from the Progress table)
- Overall progress percentage — use execution-tracker Section 5 formula:
  - Sum all "Plans" values = total_plans
  - Sum all "Completed" values = completed_plans
  - Percentage = floor((completed_plans / total_plans) * 100)

### Health Assessment Rules

Assess each project's health based on its state:

- **Green** `[OK]`: Phase on track, no blockers in STATE.md, progress advancing
  - Criteria: last activity within 7 days, no "escalated"/"failed"/"blocked" in Status
- **Yellow** `[!!]`: At risk — activity stale or issues present
  - Criteria: STATE.md Status mentions "escalated", "failed", or "blocked"; OR no activity in 7+ days
- **Red** `[XX]`: Blocking — project missing or persistent issues
  - Criteria: project directory missing (Stale); OR STATE.md has unresolved blockers for 3+ phases

### Aggregated Portfolio Metrics

Compute these from the assembled project list:

- **Total projects**: count of Active entries
- **Overall progress**: average completion % across active projects
- **Projects at risk**: count of Yellow + Red health assessments
- **Dependency health**: count of blocking dependencies vs total dependencies

---

## Section 4: Cross-Project Dependencies

Operations for managing dependencies between projects in the portfolio.

### Add Dependency

```
1. Read ~/.claude/legion/portfolio.md

2. Validate both projects exist in the registry
   - If either project is not found: report error and abort

3. Assign the next DEP-{NN} ID
   - Scan existing IDs, find the highest number, increment by 1
   - If no existing dependencies: start at DEP-01

4. Add a new row to the Cross-Project Dependencies table:
   | DEP-{NN} | {source-project}:Phase {N} | {target-project}:Phase {M} | {type} | Active | {notes} |

5. Write the updated ~/.claude/legion/portfolio.md
```

### Remove Dependency

```
1. Read ~/.claude/legion/portfolio.md

2. Find the dependency row by ID (e.g., DEP-03) or by from/to match

3. Remove the row from the Cross-Project Dependencies table

4. Write the updated ~/.claude/legion/portfolio.md
```

### Check Dependencies

```
1. Read ~/.claude/legion/portfolio.md
   - Parse the Cross-Project Dependencies table

2. For each active dependency:
   a. Read the "From" project's ROADMAP.md at the registered path
   b. Find the referenced phase in the Phases section
   c. Check if the phase is marked complete (has [x] prefix)
   d. If complete: dependency status = "Resolved"
   e. If not complete: dependency status = "Blocking"
   f. Impact text: "{To project} Phase {M} is waiting on {From project} Phase {N}"

3. Return list of dependencies with current status and impact assessment
```

### Dependency Notation

Dependencies use `{project-name}:Phase {N}` format:
- `My App:Phase 3` — refers to Phase 3 of the "My App" project
- The project name must match a `###` heading in the registry
- The phase number must exist in the referenced project's ROADMAP.md

---

## Section 5: Agent Allocation

Derive agent usage patterns across projects at read-time. Since agents are personality files (not running processes), "allocation" is about visibility into usage patterns, not resource locking. Any project can use any agent at any time.

### Scan Agent Assignments

```
1. For each registered active project:
   a. Read all directories under {path}/.planning/phases/
   b. Primary source: Read CONTEXT.md files in each phase directory
      - These contain explicit agent recommendations per phase
      - Look for agent ID references (e.g., "engineering-senior-developer", "testing-reality-checker")
   c. Secondary source: Scan plan body text and SUMMARY.md files
      - Search for agent ID patterns matching {division}-{role} format
   d. Note: YAML frontmatter in plan files does NOT contain agent IDs
      - Do not rely on frontmatter for allocation data

2. Build a map: {agent-id} -> [{project-name}, ...]
   - Each agent ID maps to the list of projects that reference it
```

### Allocation Summary

From the agent usage map, derive:

- **Shared agents**: agents assigned to 2+ projects
  - Display with division and the list of projects using them
- **Division spread**: which divisions are active across the portfolio
  - Count how many projects use agents from each division
- **Underutilized divisions**: divisions with 0 projects using their agents
  - Suggests potential untapped capabilities

### Division Reference (from workflow-common.md)

```
engineering        — 7 agents
design             — 6 agents
marketing          — 8 agents
product            — 3 agents
project-management — 5 agents
testing            — 7 agents
support            — 6 agents
spatial-computing  — 6 agents
specialized        — 3 agents
```

---

## Section 6: Error Handling

How to handle failures and edge cases in portfolio operations.

- **Missing PORTFOLIO.md**: Create with empty structure on first register operation. For read operations (list, dashboard), return empty results with guidance: "No projects registered. Run `/legion:start` in a project to add it."

- **Missing project directory**: Mark the project as Stale in the registry. Do not remove it automatically — the user may want to update the path or the directory may be temporarily unavailable. Display: "Project directory not found at {path}. Status set to Stale."

- **Corrupted STATE.md or ROADMAP.md**: If a project's state files cannot be parsed, skip that project in aggregation. Report: "Unable to read state for {project-name} — skipping in dashboard."

- **Permission errors on ~/.claude/**: Report clearly: "Cannot create portfolio registry at ~/.claude/legion/. Check directory permissions."

- **Name collisions**: When two projects have the same name (from their PROJECT.md headings), append the directory basename in parentheses to disambiguate: `### My App (project-v2)`.

- **Empty portfolio**: Dashboard shows: "No projects registered. Run `/legion:start` in a project to add it."

- **Stale path recovery**: If a project is marked Stale, the user can:
  1. Navigate to the correct project directory and run `/legion:start` (re-registers with correct path)
  2. Manually edit `~/.claude/legion/portfolio.md` to update the Path field
