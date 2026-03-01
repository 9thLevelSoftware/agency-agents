# The Agency Workflows

## What This Is

A Claude Code plugin that adds workflow orchestration to The Agency's 51 AI specialist personalities. The agents already have deep expertise and distinct voices — this project gives them a coordination layer so they can work together as actual teams on real projects.

## Core Value

Turn a collection of 51 isolated agent personalities into a functional AI agency. Users type `/agency:start`, describe what they want, and the system assembles the right team, plans the work, executes in parallel, and runs quality checks — with each agent operating in full character.

## Who It's For

- Developers, designers, marketers, and project managers using Claude Code
- Projects spanning any of the 9 Agency divisions (engineering, design, marketing, product, PM, testing, support, spatial, specialized)
- Both code and non-code work (marketing campaigns, design systems, content strategies, not just software)

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] `/agency:start` command — project initialization with questioning flow
- [ ] `/agency:plan` command — phase decomposition with agent recommendations
- [ ] `/agency:build` command — parallel agent execution using Claude Code Teams
- [ ] `/agency:review` command — quality gate / review loop
- [ ] `/agency:status` command — progress dashboard and next-action routing
- [ ] `/agency:quick` command — lightweight ad-hoc task execution
- [ ] Agent selection engine — recommends agents from 51 personalities based on task type
- [ ] Full personality injection — agents spawned with their .md file as system prompt
- [ ] Hybrid agent selection — workflow recommends, user confirms or overrides
- [ ] Minimal state management — .planning/ with PROJECT.md, ROADMAP.md, STATE.md
- [ ] Phase-based planning — break work into phases with wave-structured plans
- [ ] Parallel execution — multiple agents working simultaneously via Teams
- [ ] Quality gates — dev-QA loops with specific feedback and retry logic
- [ ] Cross-division support — workflows handle engineering, design, marketing, etc.
- [ ] Installable plugin format — .claude/ directory structure others can adopt

### Out of Scope

- Custom CLI tooling (like GSD's gsd-tools.cjs) — keep it pure markdown/skills
- Board of directors / governance model (Conductor-style) — too heavy
- Milestone archiving / retrospectives — save for later
- MCP server integrations — rely on whatever the user already has configured
- Brownfield codebase mapping — not needed for v1

## Constraints

- **No custom tooling**: Pure Claude Code primitives (skills, commands, agents, Tasks, Teams)
- **Human-readable state**: All planning files are markdown, readable without tools
- **Personality-first**: Agent .md files are the source of truth for agent behavior
- **Balanced cost**: Opus for planning, Sonnet for execution, Haiku for lightweight checks
- **Max 3 tasks per plan**: Keeps plans focused and reviewable (borrowed from Shipyard)
- **Fresh context per agent**: Each spawned agent gets its own context window

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Namespace under /agency: | Avoids collision with GSD, Shipyard, Conductor commands | Confirmed |
| Full personality injection | The personalities ARE the product — must be preserved | Confirmed |
| Minimal .planning/ state | Users want human-readable files, not complex state machines | Confirmed |
| Cherry-pick patterns from 4 repos | GSD questioning + Shipyard waves + Conductor evaluate-loop + Best Practice config | Confirmed |
| Cross-division support | 51 agents span 9 divisions — workflows must handle all, not just engineering | Confirmed |
| Hybrid agent selection | Workflow recommends based on task analysis, user confirms/overrides | Confirmed |

## Architecture Influences

| Source | What We're Taking | What We're Leaving |
|--------|-------------------|-------------------|
| **GSD** | Questioning flow, orchestrator/subagent split, phase planning, state management pattern | CLI tooling, 33+ workflows, complex config, milestone system |
| **Conductor** | Evaluate-loop (build→review→fix), quality gates, parallel dispatch | Board governance, message bus, 50+ iteration limits, metadata.json |
| **Shipyard** | Wave-based execution, max 3 tasks/plan, atomic commits, agent role boundaries | 29 commands, checkpoint/rollback system, hook complexity |
| **Best Practice** | Skills/commands/agents structure, agent frontmatter, permission patterns | RPI workflow (too specific), custom hooks infrastructure |

---
*Last updated: 2026-03-01 after initialization*
