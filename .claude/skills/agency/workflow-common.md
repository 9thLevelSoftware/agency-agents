---
name: agency:workflow-common
description: Shared workflow patterns and conventions for The Agency plugin
---

# Agency Workflow Common

Shared constants, paths, and patterns used across all /agency: commands.

## State File Locations

| File | Path | Purpose |
|------|------|---------|
| PROJECT.md | `.planning/PROJECT.md` | Project vision, requirements, constraints, decisions |
| ROADMAP.md | `.planning/ROADMAP.md` | Phase breakdown with agent assignments and progress |
| STATE.md | `.planning/STATE.md` | Current position, recent activity, next action |
| Templates | `.planning/templates/` | Schema files for generating PROJECT/ROADMAP/STATE |
| Phase Plans | `.planning/phases/{NN-name}/` | Plan and summary files per phase |

## Agent Personality Paths

All 51 agent personalities live under `agency-agents/` organized by division:

```
agency-agents/{division}/{agent-id}.md
```

**Divisions**: engineering, design, marketing, product, project-management, testing, support, spatial-computing, specialized

To load an agent personality: `Read agency-agents/{division}/{agent-id}.md`

## Personality Injection Pattern

To spawn an agent with its full personality inside a Claude Code Team:

1. Read the agent's .md file to get the full personality content
2. Construct a prompt that includes the personality as system instructions, plus a **Reporting Results** block instructing the agent to send its structured summary via SendMessage:
   ```
   Agent tool call:
     subagent_type: "general-purpose"
     prompt: "{personality_content}\n\n---\n\nTask: {task_description}\n\n## Reporting Results\n..."
     model: "{cost_profile_model}"
     team_name: "{phase_team_name}"
   ```
3. The agent operates in full character with access to its specialist knowledge
4. When finished, the agent sends its structured summary to the coordinator via SendMessage (not via Agent return value). This keeps the coordinator's context window small.

## Plan File Convention

```
.planning/phases/{NN-name}/{NN}-{PP}-PLAN.md    — Executable plan
.planning/phases/{NN-name}/{NN}-{PP}-SUMMARY.md  — Completion summary
.planning/phases/{NN-name}/{NN}-CONTEXT.md        — Phase research/context
```

Naming: `{NN}` = zero-padded phase number, `{PP}` = zero-padded plan number.
Example: `.planning/phases/01-plugin-foundation/01-02-PLAN.md`

## Wave Execution Pattern

Plans declare a `wave` number in frontmatter. Execution uses a Claude Code Team per phase:

1. **TeamCreate** — create one Team for the entire phase (e.g., `"phase-{NN}-execution"`)
2. **TaskCreate** — create one Task per plan, setting `addBlockedBy` for cross-wave dependencies
3. Group plans by wave number
4. For each wave, **spawn agents** via Agent tool with `team_name` set to the phase Team
5. Agents execute their plans and **report results via SendMessage** to the coordinator
6. Coordinator collects SendMessage summaries — wait for all agents in the wave before advancing
7. Repeat steps 4-6 for subsequent waves
8. **Shutdown + TeamDelete** — send `shutdown_request` to all agents, then TeamDelete to clean up

Within a wave, plans have no dependencies on each other. Between waves, later waves may depend on earlier wave outputs. Agents send lightweight structured summaries (~200 tokens) via SendMessage instead of returning full execution traces, preserving the coordinator's context window.

## State Update Pattern

After any significant operation:

1. Read current `.planning/STATE.md`
2. Update relevant fields:
   - `Phase`: current phase number and status
   - `Status`: what just happened
   - `Last Activity`: timestamp and description
   - `Progress`: recalculate completion percentage
   - `Next Action`: what the user should do next
3. Write updated STATE.md

## Cost Profile Convention

| Role | Model | When |
|------|-------|------|
| Planning/Decisions | Opus | /agency:start, /agency:plan, architecture choices |
| Execution/Implementation | Sonnet | /agency:build, agent task execution |
| Lightweight Checks | Haiku | /agency:status, quick validations, simple queries |

Set via `model` parameter on Agent tool calls.

## Error Handling Pattern

When an agent fails during execution:

1. Capture the error output
2. Update STATE.md: mark the failed plan/task with error details
3. Do NOT retry automatically — present the error to the user
4. Suggest: re-run the specific plan, or run /agency:review for diagnosis
5. If multiple agents fail in a wave, stop the wave and report all failures

## Division Constants

```
DIVISIONS = [
  "engineering",        # 7 agents — code, architecture, DevOps
  "design",             # 6 agents — UI/UX, branding, visual
  "marketing",          # 8 agents — content, social, growth
  "product",            # 3 agents — sprints, feedback, trends
  "project-management", # 5 agents — coordination, portfolio
  "testing",            # 7 agents — QA, evidence, performance
  "support",            # 6 agents — analytics, finance, legal
  "spatial-computing",  # 6 agents — XR, VisionOS, Metal
  "specialized"         # 3 agents — orchestration, data, LSP
]

TOTAL_AGENTS = 51
```
