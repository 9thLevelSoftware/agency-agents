# The Agency Workflows — Roadmap

## Milestones

- [x] **v1.0** — Core plugin with 9 commands, 15 skills, 51 agents, multi-domain workflows (14 phases, 30 plans, 54 requirements) → [Archive](milestones/v1.0-ROADMAP.md)
- [ ] **v2.0** — Proper Claude Code plugin with advisory capabilities: manifest, restructured directories, installable via `claude plugin add`, plus strategic advisors, dynamic review panels, and plan critique (9 phases, 26 requirements)

## Phases

- [ ] **Phase 15: Plugin Scaffold** - Create the `.claude-plugin/plugin.json` manifest and `settings.json`; establish the root directory structure every subsequent phase builds into
- [ ] **Phase 16: Agent Migration** - Move all 51 agent files to plugin `agents/` directory with updated frontmatter (name, description, division fields)
- [x] **Phase 17: Skill Migration** - Convert all 15 skills to `skills/{name}/SKILL.md` directory structure with supporting files alongside
- [ ] **Phase 18: Command Migration and Path Updates** - Move 9 commands to plugin `commands/` directory and update all cross-references throughout the codebase
- [ ] **Phase 19: Registry Integration** - Update agent-registry skill to reference new plugin-relative agent paths so lookup and recommendation work correctly
- [ ] **Phase 20: Distribution** - Produce marketplace entry, README, CHANGELOG, and developer testing docs so the plugin can be installed and shared
- [ ] **Phase 21: Strategic Advisors** - Add `/agency:advise` command for read-only consultation using Agency's 51 agent personalities as domain experts
- [ ] **Phase 22: Dynamic Review Panels** - Compose context-aware multi-perspective review teams with domain-weighted scoring rubrics
- [ ] **Phase 23: Plan Critique** - Pre-mortem analysis and assumption hunting for stress-testing plans before execution

## Phase Details

### Phase 15: Plugin Scaffold
**Goal**: The plugin has a valid manifest and settings file that Claude Code can read, establishing the root-level directory structure all other phases populate
**Depends on**: Nothing (first phase of v2.0)
**Requirements**: PLUG-01, PLUG-05
**Success Criteria** (what must be TRUE):
  1. `.claude-plugin/plugin.json` exists with name, version, description, author, keywords, and repository fields populated
  2. `settings.json` exists at the plugin root with default configuration that activates when the plugin is enabled
  3. The root directory contains empty `commands/`, `skills/`, and `agents/` directories ready to receive migrated files
  4. Running `claude plugin add --plugin-dir .` loads the plugin without manifest validation errors
**Plans**: 1
- Plan 15-01 (Wave 1): Plugin manifest, settings, and directory structure — create `.claude-plugin/plugin.json`, `settings.json`, and empty `commands/`, `skills/`, `agents/` directories

### Phase 16: Agent Migration
**Goal**: All 51 agent personalities live in the plugin `agents/` directory with schema-compliant frontmatter, so Claude Code can discover and inject them
**Depends on**: Phase 15
**Requirements**: PLUG-04, AGENT-01, AGENT-02, AGENT-03
**Success Criteria** (what must be TRUE):
  1. All 51 agent `.md` files are present under `agents/` in the plugin root
  2. Every agent file has `name` and `description` frontmatter fields matching the Claude Code plugin agent schema
  3. Every agent file has a `division` frontmatter field preserving the original grouping (Engineering, Design, Marketing, etc.)
  4. No agent files remain in the old `agency-agents/` directory — migration is complete, not duplicated
**Plans**: 1
- Plan 16-01 (Wave 1): Migrate, validate, and clean up — copy 51 agent files to `agents/` with normalized frontmatter (name, description, division), validate schema compliance, remove old `agency-agents/` directory

### Phase 17: Skill Migration
**Goal**: All 15 skills are restructured into `skills/{name}/SKILL.md` directories with schema-compliant frontmatter and supporting files co-located
**Depends on**: Phase 15
**Requirements**: PLUG-03, SKILL-01, SKILL-02, SKILL-03
**Success Criteria** (what must be TRUE):
  1. All 15 skills exist under `skills/` as directories, each containing a `SKILL.md` file (e.g., `skills/agent-registry/SKILL.md`)
  2. Every `SKILL.md` has `name` and `description` frontmatter fields matching the Claude Code skill schema
  3. Template and reference files previously stored alongside skills are present in the same directory as their `SKILL.md`
  4. No skill files remain in the old `.claude/skills/agency/` location
**Plans**: 1
- Plan 17-01 (Wave 1): Migrate skills, co-locate templates, validate and clean up — create 15 `skills/{name}/SKILL.md` directories, move templates to questioning-flow, remove old `.claude/skills/agency/`

### Phase 18: Command Migration and Path Updates
**Goal**: All 9 commands live in the plugin `commands/` directory and every `@` reference, cross-skill link, and agent path inside commands and skills points to the new plugin-relative locations
**Depends on**: Phase 16, Phase 17
**Requirements**: PLUG-02, PATH-01, PATH-02, PATH-03
**Success Criteria** (what must be TRUE):
  1. All 9 command `.md` files are present under `commands/` in the plugin root
  2. Every `@` execution_context reference in commands and skills resolves to its new plugin-relative path
  3. All cross-skill `@skill` and cross-command references within the plugin resolve correctly under the new structure
  4. Agent personality file paths in wave-executor and any command that spawns agents reference the new `agents/` location
  5. No command or skill contains a hardcoded `.claude/` path that would break under the plugin directory layout
**Plans**: 1
- Plan 18-01 (Wave 1): Migrate commands, update all path references, clean up — copy 9 commands to `commands/`, update 48 skill refs + 7 template refs + 8 agent refs in commands, update 101 agent paths in 6 skill files, remove `.claude/commands/agency/` and `.planning/templates/`

### Phase 19: Registry Integration
**Goal**: The agent-registry skill correctly resolves all 51 agent paths under the new plugin structure, so agent lookup, recommendation, and team assembly work without modification after installation
**Depends on**: Phase 16, Phase 18
**Requirements**: AGENT-04
**Success Criteria** (what must be TRUE):
  1. The agent-registry skill lists all 51 agents using paths relative to the plugin root (`agents/` prefix)
  2. `/agency:plan` successfully recommends agents by name and the referenced files exist at the resolved paths
  3. `/agency:build` can inject agent personalities by reading from the new `agents/` location — no 404-equivalent file-not-found errors
**Plans**: 1
- Plan 19-01 (Wave 1): Verify registry completeness, validate path resolution, update state — cross-check all 51 registry entries against disk, validate command execution_context declarations, verify spawning path patterns, update ROADMAP/STATE/REQUIREMENTS

### Phase 20: Distribution
**Goal**: The plugin has all artifacts needed for installation via `claude plugin add github:user/repo`, discovery via a marketplace entry, and local development testing via `--plugin-dir`
**Depends on**: Phase 15, Phase 19
**Requirements**: DIST-01, DIST-02, DIST-03, DIST-04
**Success Criteria** (what must be TRUE):
  1. `marketplace.json` exists with the correct entry format for GitHub-based `claude plugin add` installation
  2. `README.md` contains installation instructions (both `claude plugin add` and `--plugin-dir`), prerequisites, and a getting started guide covering the core workflow
  3. `CHANGELOG.md` documents v1.0 accomplishments and v2.0 changes in a standard format
  4. A developer doc (e.g., `CONTRIBUTING.md` or `docs/dev-testing.md`) explains how to test changes locally with `--plugin-dir`
**Plans**: TBD

### Phase 21: Strategic Advisors
**Goal**: Users can type `/agency:advise architecture` (or UX, business, marketing, etc.) and get a read-only consultation session with the most relevant agent from the 51-agent pool, without risk of code modification
**Depends on**: Phase 19 (needs working agent registry for selection)
**Requirements**: ADV-01, ADV-02
**Success Criteria** (what must be TRUE):
  1. `/agency:advise` command exists and accepts a topic argument (architecture, UX, business, marketing, testing, etc.)
  2. The command uses agent-registry recommendation to select the most relevant agent for the given topic
  3. The selected agent is spawned with its full personality but restricted to read-only tools (Read, Glob, Grep, WebSearch, WebFetch — no Write, Edit, Bash)
  4. Advisory session is interactive — agent can ask clarifying questions and explore the codebase to inform recommendations
**Plans**: TBD

### Phase 22: Dynamic Review Panels
**Goal**: `/agency:review` can assemble a multi-perspective review panel of 2-4 agents, each evaluating through domain-specific weighted rubrics with non-overlapping criteria — replacing the need for a fixed board of directors
**Depends on**: Phase 21 (builds on advisory agent patterns)
**Requirements**: REV-01, REV-02, REV-03
**Success Criteria** (what must be TRUE):
  1. Review panel composer selects 2-4 reviewers based on what's being reviewed (code changes get engineering + testing agents; design gets design + UX agents; plans get product + PM agents)
  2. Each reviewer evaluates using domain-weighted scoring rubrics specific to their specialty — criteria do not overlap between reviewers
  3. Panel results are synthesized into a consolidated report with per-reviewer findings and an overall verdict
  4. Review panel is available as an option within `/agency:review` alongside existing single-reviewer mode
**Plans**: TBD

### Phase 23: Plan Critique
**Goal**: Before executing a plan, users can stress-test it with pre-mortem analysis ("assume it failed — why?") and assumption hunting ("what are we taking for granted?") using the most skeptical agents from the pool
**Depends on**: Phase 19 (needs working agent registry)
**Requirements**: CRIT-01, CRIT-02
**Success Criteria** (what must be TRUE):
  1. Plan critique skill performs a pre-mortem pass: assumes the project failed, generates the failure headline, and works backward to identify causes
  2. Assumption hunting pass extracts foundational beliefs from the plan, rates them by impact × evidence strength, and flags high-impact/weak-evidence assumptions as critical risks
  3. Critique output maps each finding to a specific plan section or requirement with actionable next steps
  4. Critique is invocable from `/agency:plan` as an optional validation step before execution
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 15. Plugin Scaffold | 1/1 | Complete | 2026-03-01 |
| 16. Agent Migration | 1/1 | Complete | 2026-03-02 |
| 17. Skill Migration | 1/1 | Complete    | 2026-03-02 |
| 18. Command Migration and Path Updates | 1/1 | Complete | 2026-03-02 |
| 19. Registry Integration | 1/1 | Complete | 2026-03-02 |
| 20. Distribution | 0/? | Not started | - |
| 21. Strategic Advisors | 0/? | Not started | - |
| 22. Dynamic Review Panels | 0/? | Not started | - |
| 23. Plan Critique | 0/? | Not started | - |
