# Changelog

All notable changes to the Legion plugin are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-03-02

### Changed
- **Project identity**: Rebranded from "The Agency Workflows" to "Legion" — *"My name is Legion, for we are many."*
- All 10 commands renamed from `/agency:*` to `/legion:*` namespace
- Plugin name changed from `agency-workflows` to `legion` — install via `claude plugin install legion`
- Plugin version bumped to 3.0.0 across plugin.json and marketplace.json
- All 17 skill files updated with `/legion:` command references
- workflow-common shared constants updated to Legion namespace
- README.md, CLAUDE.md, CONTRIBUTING.md rewritten with Legion branding
- Commit message prefixes updated from `feat(agency):` to `feat(legion):`

### Added
- Shoulders of Giants attribution entry crediting msitarzewski/agency-agents as origin of the 51 agent personalities

### Unchanged
- 51 agent personality files (contain zero "agency" references — no changes needed)
- Repository URL remains `9thLevelSoftware/agency-agents` (actual GitHub repo name)
- All features, workflows, and capabilities remain identical

## [2.0.0] - 2026-03-02

### Changed
- Converted from `.claude/` directory config to proper Claude Code plugin format
- Moved 9 commands from `.claude/commands/agency/` to `commands/` at plugin root
- Converted 15 skills to `skills/{name}/SKILL.md` directory structure with co-located templates
- Migrated 51 agent files from `agency-agents/{division}/` to flat `agents/` directory
- Updated all internal path references to plugin-relative format
- Agent frontmatter now includes `name`, `description`, and `division` fields

### Added
- `/agency:advise` command — read-only expert consultation (10 commands total)
- `skills/review-panel/SKILL.md` — dynamic multi-reviewer composition with domain-weighted rubrics
- `skills/plan-critique/SKILL.md` — pre-mortem analysis and assumption hunting
- Optional plan critique step in `/agency:plan` workflow (step 8.5)
- Dynamic review panel mode in `/agency:review`
- `.claude-plugin/plugin.json` — plugin manifest for Claude Code recognition
- `.claude-plugin/marketplace.json` — marketplace entry for `claude plugin marketplace add`
- `settings.json` — plugin settings file (empty — multi-agent system, not single-agent)
- Agent registry updated with plugin-relative paths for all 51 agents
- Installation via `claude plugin marketplace add 9thLevelSoftware/agency-agents` + `claude plugin install agency-workflows@agency-workflows`
- Local development testing via `claude --plugin-dir .`

### Removed
- `.claude/commands/agency/` directory (commands migrated to `commands/`)
- `.claude/skills/agency/` directory (skills migrated to `skills/`)
- `agency-agents/` directory (agents migrated to `agents/`)
- `.planning/templates/` directory (templates co-located with questioning-flow skill)

## [1.0.0] - 2026-03-01

### Added
- **9 commands**: `/agency:start`, `/agency:plan`, `/agency:build`, `/agency:review`, `/agency:status`, `/agency:quick`, `/agency:portfolio`, `/agency:milestone`, `/agency:agent`
- **15 skills** (9,196 lines): workflow-common, agent-registry, questioning-flow, phase-decomposer, wave-executor, execution-tracker, review-loop, portfolio-manager, milestone-tracker, memory-manager, agent-creator, github-sync, codebase-mapper, marketing-workflows, design-workflows
- **51 agent personalities** across 9 divisions: Engineering (7), Design (6), Marketing (8), Testing (7), Product (3), Project Management (5), Support (6), Spatial Computing (6), Specialized (3)
- Full personality injection — agents spawned with complete .md as system instructions
- Wave-based parallel execution with max 3 tasks per plan
- Hybrid agent selection — workflow recommends, user confirms
- Dev-QA review loop with max 3 cycles before escalation
- Cross-session memory with importance scoring and time-based decay
- GitHub integration (issues, PRs, milestones) — opt-in, graceful degradation
- Brownfield codebase analysis — architecture mapping before planning
- Marketing workflows — campaign planning, content calendars, channel coordination
- Design workflows — design systems, UX research, three-lens review (brand, accessibility, usability)
- Multi-project portfolio management
- Milestone tracking and archiving
