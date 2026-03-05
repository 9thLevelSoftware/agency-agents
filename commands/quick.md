---
name: legion:quick
description: Run a single ad-hoc task with intelligent agent selection
argument-hint: <task-description>
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, Agent, AskUserQuestion]
---

<objective>
Execute a single task outside the normal phase workflow. Select the best agent from the registry for the task, spawn it with full personality injection, and return results.

Purpose: Lightweight way to run any task with the right agent — no phase planning required.
Output: Task results with agent summary and optional commit.
</objective>

<execution_context>
skills/workflow-common-core/SKILL.md
skills/agent-registry/SKILL.md
skills/agent-registry/CATALOG.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
</context>

<process>
1. PARSE TASK DESCRIPTION
   - Read $ARGUMENTS for the task description
   - If $ARGUMENTS is empty or missing:
     Display: "Usage: `/legion:quick <task-description>`
              Example: `/legion:quick write unit tests for the auth module`
              Example: `/legion:quick create a content calendar for Q2`
              Example: `/legion:quick review the API rate limiting code`"
     Exit — do not proceed
   - Store the full task description for use in subsequent steps
   - Display: "Quick task: {task_description}"

2. LOAD PROJECT CONTEXT (optional)
   - Attempt to read .planning/PROJECT.md
   - If found: extract project name, tech stack, constraints
     - This context helps inform agent selection and task execution
   - If not found: proceed without project context
     - Quick tasks work with or without an initialized project
   - Attempt to read .planning/STATE.md
   - If found: note current phase for awareness (but quick tasks don't modify phase state)

3. SELECT AGENT
   Follow agent-registry Section 3 (Recommendation Algorithm) at single-task scope:

   a. Parse Task Description (Section 3, Step 1):
      - Extract key terms from the task description
      - Match terms against task_types tags in the Agent Catalog

   b. Match Agents (Section 3, Step 2):
      - Score agents using the weighting system:
        - Exact match on task type tag: 3 points
        - Partial match (substring in specialty): 1 point
        - Division alignment: 2 points

   c. Rank and Select (Section 3, Steps 3-4):
      - Rank by score, break ties by specificity
      - For quick tasks: select top 1-2 candidates (not full team assembly)
      - Cap at 1 agent for execution (quick = single agent)

   d. Present recommendation to user via adapter.ask_user:
      "Which agent should handle this task?"
      Options:
      - "{top_agent_id} — {specialty}" (Recommended)
        Description: "{brief rationale based on task match}"
      - "{second_agent_id} — {specialty}"
        Description: "{brief rationale for alternative}"
      - "No agent — run autonomously"
        Description: "Execute without personality injection (faster, generic)"

   e. If user selects "Other": accept a custom agent ID from user input
      - Validate the ID exists in agent-registry Section 1
      - If invalid: display available agent IDs for the closest division and re-prompt

4. CONSTRUCT TASK PROMPT
   Based on selection from Step 3:

   **Path A: Personality-injected agent**
   a. RESOLVE AGENT PATH: Follow workflow-common Agent Path Resolution Protocol to resolve AGENTS_DIR.
      Look up the agent ID from agent-registry Section 1.
   b. Read the agent's full personality .md file at {AGENTS_DIR}/{agent-id}.md
      If personality file is missing: fall back to Path B (autonomous execution), log the warning
   c. Construct the execution prompt:
      """
      {full personality .md content}

      ---

      # Task

      {task_description from Step 1}

      ## Project Context
      {project name, tech stack, constraints from Step 2 — or "No project context available" if PROJECT.md not found}

      ## Instructions
      - Execute this task to completion
      - Use your specialist expertise to produce the best possible result
      - Create or modify files as needed
      - If the task is ambiguous, make reasonable decisions and note your assumptions
      - When done, provide a summary of:
        - What you did
        - Files created or modified (with paths)
        - Any decisions or assumptions you made
        - Any follow-up actions the user should consider
      """

   **Path B: Autonomous (no personality)**
   a. Construct a simpler prompt:
      """
      # Task

      {task_description from Step 1}

      ## Project Context
      {project context or "No project context available"}

      ## Instructions
      - Execute this task to completion
      - Create or modify files as needed
      - When done, provide a summary of what you did and any files changed
      """

5. SPAWN AGENT AND EXECUTE
   - Use adapter.spawn_agent_personality (or adapter.spawn_agent_autonomous for Path B):
     - prompt: {constructed prompt from Step 4}
     - model: adapter.model_execution
     - name: "{agent-id}-quick" or "quick-task" if autonomous
   - On CLIs without agent spawning: execute the task inline with personality as context prefix
   - Wait for completion and capture results

6. DISPLAY RESULTS
   Output the results to the user:

   ## Quick Task Complete

   **Agent**: {agent_id} ({specialty}) — or "Autonomous" if no personality
   **Task**: {task_description}

   ### Summary
   {agent's summary of what was done}

   ### Files Changed
   {list of files created or modified, from agent's report}

   If the agent reported errors or could not complete:
   ### Issues
   {description of what went wrong}
   Suggestion: Try a different agent or break the task into smaller pieces.

7. OFFER COMMIT (if files changed)
   - Check if the agent created or modified any files:
     Run `git status --short` to detect changes
   - If changes exist, use adapter.ask_user:
     "Commit the changes from this quick task?"
     Options:
     - "Yes — commit with conventional message" (Recommended)
       Description: "Creates a feat/fix/chore commit for the work done"
     - "No — leave uncommitted"
       Description: "Keep changes in working directory for further review"
   - If user chooses to commit:
     - Determine commit type from task description:
       - Task mentions "fix", "bug", "repair" -> fix(legion)
       - Task mentions "test", "spec" -> test(legion)
       - Task mentions "doc", "readme", "comment" -> docs(legion)
       - Task mentions "refactor", "clean", "reorganize" -> refactor(legion)
       - Default -> feat(legion)
     - Create the commit:
       {type}(legion): quick — {brief task summary}

       Task: {task_description}
       Agent: {agent_id}

       {adapter.commit_signature}
   - If no changes detected:
     Display: "No file changes detected — nothing to commit."

   Note: Quick tasks do NOT update STATE.md or ROADMAP.md.
   They operate outside the phase workflow entirely.
</process>
</output>
