# Phase 1: Plugin Foundation — Context

## Phase Goal
Establish the .claude/ plugin structure and create the agent registry that maps all 51 personalities to capabilities.

## Requirements Covered
- INFRA-01: `.claude/commands/agency/` directory with command entry points
- INFRA-02: `.claude/skills/agency/` directory with reusable workflow skills
- INFRA-03: Agent registry mapping all 51 agents by division, capability, task type
- INFRA-04: `.planning/` state structure templates
- INFRA-05: Plugin README with installation instructions

## Research Findings

### Agent Personality Format
- YAML frontmatter: `name`, `description`, `color` (optional), `tools` (optional)
- Consistent section structure: Identity, Core Mission, Critical Rules, Deliverables, Workflow, Communication Style, Learning, Success Metrics
- Role-based framing: "You are **AgentName**, a..."
- 9 divisions, 51 agents total

### Claude Code Plugin Format
- **Commands**: `.claude/commands/{namespace}/{command}.md` — YAML frontmatter (name, description, argument-hint, allowed-tools) + objective/execution_context/context/process sections
- **Skills**: `.claude/skills/{namespace}/{skill}.md` — YAML frontmatter (name, description, trigger) + instructional markdown
- **Agents**: `.claude/agents/{name}.md` — YAML frontmatter (name, description, tools, color) + role/execution_flow/deviation_rules sections
- **CLAUDE.md**: Project-level instructions, auto-loaded

### Division Breakdown
| Division | Count | Path Prefix |
|----------|-------|-------------|
| Engineering | 7 | agency-agents/engineering/ |
| Design | 6 | agency-agents/design/ |
| Marketing | 8 | agency-agents/marketing/ |
| Testing | 7 | agency-agents/testing/ |
| Product | 3 | agency-agents/product/ |
| Project Management | 5 | agency-agents/project-management/ |
| Support | 6 | agency-agents/support/ |
| Spatial Computing | 6 | agency-agents/spatial-computing/ |
| Specialized | 3 | agency-agents/specialized/ |

## Key Decisions
- Commands are scaffolds in Phase 1, implemented in Phase 2-6
- Agent registry is a skill (not an agent) — it's loaded as context, not spawned
- Templates use `{placeholder}` syntax for values filled by /agency:start
- Plan 01 (Wave 1) creates directory structure, Plan 02 (Wave 2) adds content
