---
name: legion:start
description: Initialize a new project with guided questioning flow
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, AskUserQuestion]
---

<objective>
Guide the user through an adaptive questioning flow to capture project vision, requirements, and constraints. Produce PROJECT.md, ROADMAP.md, and STATE.md with recommended agents per phase.
</objective>

<execution_context>
skills/workflow-common/SKILL.md
skills/agent-registry/SKILL.md
skills/questioning-flow/SKILL.md
skills/portfolio-manager/SKILL.md
skills/codebase-mapper/SKILL.md
</execution_context>

<context>
@skills/questioning-flow/templates/project-template.md
@skills/questioning-flow/templates/roadmap-template.md
@skills/questioning-flow/templates/state-template.md
</context>

<process>
0. INTERACTION SAFETY RULE (APPLIES TO ALL USER PROMPTS IN THIS COMMAND)
   - Never treat empty, whitespace-only, or unparseable user input as consent.
   - For any AskUserQuestion decision point, proceed only on explicit user intent.
   - If AskUserQuestion returns empty, unparseable, OR does not match any offered option label:
     - Re-ask the same decision as a plain chat question with numbered choices.
     - Wait for a valid response before continuing.
   - Do NOT default to "skip" or "continue" on missing input.
   - Non-matching answers are phantom responses (platform bug) — treat as no decision.

1. PRE-FLIGHT CHECK
   - Check if `.planning/PROJECT.md` already exists by attempting to read it
   - If it exists: use AskUserQuestion to confirm reinitialize
     - "A project already exists in .planning/. Reinitialize from scratch?"
     - Option 1: "Yes, start fresh" — continue (will overwrite PROJECT.md, ROADMAP.md, STATE.md)
     - Option 2: "No, keep existing" — abort and suggest `/legion:status` instead
     - If answer is empty, unparseable, or does not match any offered option: ask plain text "Reply with 1 (start fresh) or 2 (keep existing)." and wait
   - If it doesn't exist: proceed directly

2. BROWNFIELD DETECTION
   Follow codebase-mapper skill Section 1 (Source Code Detection Heuristic):
   - Check for non-Legion source files in the current directory:
     - Any source files outside .planning/ and .claude/?
     - Any package.json, Gemfile, pyproject.toml, requirements.txt, go.mod at root?
     - Any src/, app/, lib/, components/ directories?
   - If existing source code detected:
     Use AskUserQuestion:
       "I see an existing codebase here. Should I map it before we plan?"
       Option 1: "Yes, analyze the codebase first"
         → Run codebase-mapper Sections 2-4 to build the structural map
         → Write .planning/CODEBASE.md using Section 5 format
         → Display summary: "{N} files across {M} languages, {framework} detected, {risk_count} risk areas flagged"
         → Continue to step 3
       Option 2: "No, skip the analysis"
         → Proceed directly to step 3 (greenfield mode)
       Option 3: "I'll run /legion:plan directly"
         → Abort start, let user plan manually
      - If answer is empty, unparseable, or does not match any offered option: ask plain text "Reply with 1 (analyze), 2 (skip), or 3 (plan directly)." and wait
   - If no existing source code detected:
     Skip brownfield flow entirely (pure greenfield) — proceed to step 3

3. ENSURE DIRECTORY STRUCTURE
   - Create `.planning/` directory if it doesn't exist
   - Create `.planning/phases/` directory if it doesn't exist
   - Verify `skills/questioning-flow/templates/` exists (required — fail with clear error if missing)

4. QUESTIONING STAGE 1: VISION & IDENTITY
   Follow the questioning-flow skill's Stage 1 exactly:
   - Open with: "What are you building? Give me the elevator pitch."
   - Ask follow-up questions adaptively based on what's missing from the response
   - Capture: project_name, project_description, value_proposition, target_users
   - Summarize and confirm: "Here's what I'm understanding: [summary]. Anything to correct or add?"
   - Wait for user confirmation before proceeding

5. QUESTIONING STAGE 2: REQUIREMENTS & CONSTRAINTS
   Follow the questioning-flow skill's Stage 2 exactly:
   - Ask: "What are the must-have features for v1?"
   - Ask: "What's explicitly out of scope?"
   - Adapt follow-ups based on project type detected in Stage 1
   - Capture: requirements_list, out_of_scope, constraints, architecture_notes, decisions
   - Summarize requirements as bullet list and confirm with user

6. QUESTIONING STAGE 3: WORKFLOW PREFERENCES
   Follow the questioning-flow skill's Stage 3 exactly:
   - Use AskUserQuestion with 3 structured choice questions:
     - Execution mode: Guided (Recommended) / Autonomous / Collaborative
     - Planning depth: Standard (Recommended) / Quick Sketch / Deep Analysis
     - Cost profile: Balanced (Recommended) / Economy / Premium
   - If any preference answer is empty, unparseable, or does not match any offered option: re-ask that specific question in plain text and wait
   - Record choices as decisions

7. GENERATE PROJECT.MD
   - Read `skills/questioning-flow/templates/project-template.md` for the structure
   - Fill all placeholders using the output mapping from questioning-flow skill Section 3
   - Omit sections with no content (don't write "N/A")
   - Write the completed document to `.planning/PROJECT.md`

8. GENERATE ROADMAP.MD
   - Analyze requirements captured in Stage 2
   - Follow phase decomposition guidelines from questioning-flow skill Section 4:
     - Group requirements by dependency and domain
     - Order phases: foundation → core features → user-facing → polish
     - Size each phase for 2-3 plans
     - Name phases descriptively
   - For each phase, use the agent-registry skill's recommendation algorithm (Section 3):
     - Match phase requirements against agent task types
     - Select 2-4 recommended agents per phase
     - Ensure testing agent for code phases, coordinator for cross-division work
   - Define testable success criteria per phase
   - Read `skills/questioning-flow/templates/roadmap-template.md` for the structure
   - Fill placeholders and write to `.planning/ROADMAP.md`

9. GENERATE STATE.MD
   - Read `skills/questioning-flow/templates/state-template.md` for the structure
   - Fill placeholders:
     - total_phases: count from roadmap
     - total_plans: sum of estimated plans across all phases
     - progress_bar / progress_percent: initialized to 0
     - recent_decisions: workflow preferences from Stage 3
     - first_phase_name: name of Phase 1
     - date: current date
   - Write to `.planning/STATE.md`

10. REGISTER IN PORTFOLIO
   Follow portfolio-manager Section 2 (Register Project):
   a. Check if `~/.claude/legion/` directory exists; create it if not (including parent directories)
   b. Read `~/.claude/legion/portfolio.md` if it exists; otherwise initialize with empty structure:
      ```
      # Legion Portfolio
      ## Projects
      ## Cross-Project Dependencies
      | ID | From | To | Type | Status | Notes |
      |----|------|----|------|--------|-------|
      ## Metadata
      - **Last Updated**: {today}
      - **Total Projects**: 0
      - **Active Projects**: 0
      ```
   c. Get the absolute path of the current working directory
   d. Check if this path is already registered under any project heading
      - If yes: update the project name and description to match current PROJECT.md
      - If no: add a new project entry:
        ```
        ### {project_name}
        - **Path**: {absolute_path}
        - **Status**: Active
        - **Registered**: {today}
        - **Description**: {one-line from PROJECT.md}
        ```
   e. Update Metadata: Last Updated, Total Projects count, Active Projects count
   f. Write the updated `~/.claude/legion/portfolio.md`
   g. Display: "Registered in portfolio: ~/.claude/legion/portfolio.md"

11. DISPLAY SUMMARY
   - Show the user a concise summary:
     - Project: {project_name} — {one-line description}
     - Phases: {count} phases planned
     - For each phase: name and recommended agent count
     - Workflow: {mode}, {depth}, {cost_profile}
     - Files created: PROJECT.md, ROADMAP.md, STATE.md
     - Portfolio: Registered at ~/.claude/legion/portfolio.md
   - End with: "Run `/legion:plan 1` to begin Phase 1: {first_phase_name}"
   - Do NOT dump full file contents — summary only
</process>
