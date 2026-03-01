---
name: agency:quick
description: Run a single ad-hoc task with intelligent agent selection
argument-hint: <task-description>
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
---

<objective>
Execute a single task outside the normal phase workflow. Select the best agent from the registry for the task, spawn it with full personality injection, and return results.
</objective>

<execution_context>
@./.claude/skills/agency/workflow-common.md
@./.claude/skills/agency/agent-registry.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
</context>

<process>
1. Parse task description from $ARGUMENTS
2. Use agent-registry.md to recommend 1-2 agents for the task
3. Present recommendation to user — allow confirm or override
4. Spawn selected agent with full personality .md injection
5. Agent executes the task autonomously
6. Display results and any artifacts created
7. Optionally commit changes if the task produced code/files
</process>
