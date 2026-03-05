# Legion

## What This Is

A Claude Code plugin that orchestrates 52 AI specialist personalities as coordinated teams. Forked from The Agency Workflows and rebranded as Legion — "My name is Legion, for we are many." The agents have deep expertise and distinct voices; this project gives them a coordination layer so they work together on real projects.

## Core Value

Turn a collection of 52 isolated agent personalities into a functional AI legion. Users type `/legion:start`, describe what they want, and the system assembles the right team, plans the work, executes in parallel, and runs quality checks — with each agent operating in full character.

## Who It's For

- Developers, designers, marketers, and project managers using Claude Code
- Projects spanning any of the 9 divisions (engineering, design, marketing, product, PM, testing, support, spatial, specialized)
- Both code and non-code work (marketing campaigns, design systems, content strategies, not just software)

## Current State

**v4.0 shipped** (2026-03-02) — Inspiration audit adoption complete. Cherry-picked proven patterns from 10 orchestration tools while maintaining Legion's core identity. 7 phases, 13 plans, 18 requirements across 7 categories.

10 commands, 18 skills, 52 agents across 9 divisions. See [roadmap](ROADMAP.md) for milestone history.

### Next Milestone Goals

To be defined via `/gsd:new-milestone` or `/legion:start`.

<details>
<summary>v4.0 (2026-03-02)</summary>

Inspiration audit adoption. 7 phases, 13 plans, 18 requirements. Progressive disclosure metadata, confidence-filtered reviews, behavioral guardrails, competing architecture proposals, spec pipeline, knowledge layer (PATTERNS/ERRORS/PREFERENCES), branch-aware memory, semantic compaction, DPO preference capture, auto-remediation, output redirection, consolidation audit. See [v4.0 archived requirements](milestones/v4.0-REQUIREMENTS.md).

</details>

<details>
<summary>v3.0 (2026-03-02)</summary>

Legion rebrand complete. 5 phases, 6 plans, 13 requirements, 334+ substitutions, repo renamed to `9thLevelSoftware/legion`. 10 commands, 17 skills, 51 agents. See [v3.0 archived requirements](milestones/v3.0-REQUIREMENTS.md).

</details>

<details>
<summary>v2.0 (2026-03-02)</summary>

10 commands, 17 skills, 51 agents, 26 requirements delivered across 9 phases. Plugin structure with `.claude-plugin/plugin.json`, distribution artifacts, plus three advisory capabilities: strategic advisors (`/legion:advise`), dynamic review panels, and plan critique. See [v2.0 archived requirements](milestones/v2.0-REQUIREMENTS.md).

</details>

<details>
<summary>v1.0 (2026-03-01)</summary>

9 commands, 15 skills, 51 agents, 54 requirements across 14 phases. Core workflows: project initialization, phase planning with agent recommendation, parallel execution, quality review, portfolio management, milestone tracking, cross-session memory, custom agent creation, GitHub integration, brownfield analysis, marketing campaigns, design systems. See [v1.0 archived requirements](milestones/v1.0-REQUIREMENTS.md).

</details>

## Out of Scope

- Custom CLI tooling (like GSD's gsd-tools.cjs) — keep it pure markdown/skills
- Board of directors / governance model (Conductor-style) — too heavy
- MCP server requirements — user brings their own
- Jira / Linear / other issue trackers — GitHub only for now
- Agent count inflation beyond 52 — diminishing returns, maintenance burden
- Full automation without checkpoints (Conductor `/go` pattern) — expensive runaway sessions
- 50-iteration QA loops — if 3-5 don't fix it, problem is systemic
- Bundled third-party skill libraries — version coupling, dependency creep

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
| Rebrand to Legion | Fresh identity for the fork; "for we are many" captures the 52-agent concept perfectly | Confirmed (v3.0) |
| Namespace under /legion: | Clean break from /agency:, avoids collision | Confirmed (v3.0) |
| Plugin name: legion | Simple, memorable, clean `claude plugin install legion` | Confirmed (v3.0) |
| Full personality injection | The personalities ARE the product — must be preserved | Confirmed |
| Minimal .planning/ state | Users want human-readable files, not complex state machines | Confirmed |
| Cherry-pick patterns from 10 repos | GSD + Shipyard + Conductor + Best Practice + Feature-dev + code-foundations + beads + Auto-Claude + bjarne + Puzld.ai | Confirmed (v4.0 audit) |
| Cross-division support | 52 agents span 9 divisions — workflows must handle all, not just engineering | Confirmed |
| Hybrid agent selection | Workflow recommends based on task analysis, user confirms/overrides | Confirmed |

## Architecture Influences

| Source | What We're Taking | What We're Leaving |
|--------|-------------------|-------------------|
| **Agency Agents** | 52 agent personalities, division structure, personality-first design | Original "Agency" branding and namespace |
| **GSD** | Questioning flow, orchestrator/subagent split, phase planning, state management pattern | CLI tooling, 33+ workflows, complex config, milestone system |
| **Conductor** | Evaluate-loop (build→review→fix), quality gates, parallel dispatch | Board governance, message bus, 50+ iteration limits, metadata.json |
| **Shipyard** | Wave-based execution, max 3 tasks/plan, atomic commits, agent role boundaries | 29 commands, checkpoint/rollback system, hook complexity |
| **Best Practice** | Skills/commands/agents structure, agent frontmatter, permission patterns | RPI workflow (too specific), custom hooks infrastructure |
| **Feature-dev** | Confidence-based review filtering (80%+), competing architecture designs (2-3 approaches), 3-agent model | No state persistence, no memory, no quick mode |
| **code-foundations** | Anti-rationalization tables, evidence-backed checklists, scope discipline | 614-check pipeline, heavy token consumption, no feedback loop |
| **beads** | Git-native state, `ready` primitive, semantic compaction, actor-based audit trails | Scope creep, MEOW naming, single-giant-package, $100+/hour cost |
| **Auto-Claude** | Worktree isolation, multi-stage spec pipeline, semantic merge, dynamic security profiles | 1,751 files, Python-Electron split, 50-iteration QA, file-based IPC |
| **bjarne** | Verification points, stale loop detection, environment auto-remediation, verbose output redirection | 2,500 lines of Bash, zero tests, --dangerously-skip-permissions |
| **Puzld.ai** | DPO preference extraction, debate-with-winner-tracking, clean adapter pattern | Near-zero test coverage, 95 releases in 3 months, 11 execution modes |

---
*Last updated: 2026-03-02 — v4.0 milestone shipped*
