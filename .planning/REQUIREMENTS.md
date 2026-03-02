# Requirements: The Agency Workflows

**Defined:** 2026-03-01
**Core Value:** Turn 51 isolated agent personalities into a functional AI agency, now packaged as a proper Claude Code plugin

## v2.0 Requirements

Requirements for plugin conversion. Each maps to roadmap phases.

### Plugin Foundation (PLUG)

- [ ] **PLUG-01**: Plugin has `.claude-plugin/plugin.json` manifest with name, version, description, author, keywords, repository
- [ ] **PLUG-02**: Plugin has `commands/` directory at root with all 9 command `.md` files
- [x] **PLUG-03**: Plugin has `skills/` directory at root with 15 skills in `{name}/SKILL.md` format
- [ ] **PLUG-04**: Plugin has `agents/` directory at root with all 51 agent `.md` files
- [ ] **PLUG-05**: Plugin has `settings.json` with default configuration when enabled

### Agent Migration (AGENT)

- [ ] **AGENT-01**: All 51 agent files moved to flat `agents/` directory with plugin-compatible frontmatter
- [ ] **AGENT-02**: Agent frontmatter includes `name` and `description` fields matching Claude Code plugin agent schema
- [ ] **AGENT-03**: Division grouping preserved as metadata in agent frontmatter (`division` field)
- [ ] **AGENT-04**: Agent registry skill updated to reference new plugin-relative paths

### Skill Migration (SKILL)

- [x] **SKILL-01**: All 15 skills converted to `skills/{name}/SKILL.md` directory structure
- [x] **SKILL-02**: Skill frontmatter includes `name` and `description` matching Claude Code skill schema
- [x] **SKILL-03**: Templates and reference files moved alongside their SKILL.md as supporting files

### Path & Reference Updates (PATH)

- [ ] **PATH-01**: All `@` execution_context references updated to plugin-relative paths
- [ ] **PATH-02**: All cross-skill and cross-command references updated for new structure
- [ ] **PATH-03**: Agent personality file paths in wave-executor and registry updated

### Distribution (DIST)

- [ ] **DIST-01**: `marketplace.json` entry for GitHub-based installation
- [ ] **DIST-02**: README.md with installation instructions, prerequisites, and getting started guide
- [ ] **DIST-03**: CHANGELOG.md with v1.0 and v2.0 version history
- [ ] **DIST-04**: Development docs for testing with `--plugin-dir`

### Strategic Advisory (ADV)

- [ ] **ADV-01**: `/agency:advise` command spawns read-only consultation agents from the 51 agent pool based on topic (architecture, UX, business, marketing, etc.)
- [ ] **ADV-02**: Advisory agents operate in explicit read-only mode — can explore codebase and read files but cannot modify anything

### Dynamic Review Panels (REV)

- [ ] **REV-01**: Review panel composer uses agent-registry recommendation algorithm to assemble 2-4 reviewers based on what's being reviewed
- [ ] **REV-02**: Each reviewer evaluates through domain-weighted scoring rubrics with non-overlapping criteria specific to their specialty
- [ ] **REV-03**: Review panel integrates with existing `/agency:review` as an enhanced multi-perspective review lens option

### Plan Critique (CRIT)

- [ ] **CRIT-01**: Pre-mortem analysis skill — "assume the project failed, write the headline, explain what happened" technique for plans and proposals
- [ ] **CRIT-02**: Assumption hunting — extract, prioritize, and challenge foundational beliefs in plans before execution begins

## Future Requirements

### Plugin Enhancements

- **ENHANCE-01**: Hooks for automatic formatting or validation
- **ENHANCE-02**: MCP server integration for agent personality querying
- **ENHANCE-03**: Official Anthropic marketplace submission
- **ENHANCE-04**: Plugin auto-update mechanism

## Out of Scope

| Feature | Reason |
|---------|--------|
| MCP servers | Agency doesn't need external tool connections — it's pure skills/commands/agents |
| LSP integration | No language server needed — Agency is workflow orchestration, not code intelligence |
| Hooks | Could add later, but v2.0 focuses on structure conversion |
| Fixed board of directors | Agency uses dynamic agent selection, not hardcoded 5-director panel |
| File-based message bus | Unnecessary overhead — use structured agent spawning |
| PESTLE analysis | Too broad for software project reviews |
| Breaking changes to commands | `/agency:start` etc. must work identically after migration |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PLUG-01 | Phase 15 | Pending |
| PLUG-05 | Phase 15 | Pending |
| PLUG-04 | Phase 16 | Pending |
| AGENT-01 | Phase 16 | Pending |
| AGENT-02 | Phase 16 | Pending |
| AGENT-03 | Phase 16 | Pending |
| PLUG-03 | Phase 17 | Complete |
| SKILL-01 | Phase 17 | Complete |
| SKILL-02 | Phase 17 | Complete |
| SKILL-03 | Phase 17 | Complete |
| PLUG-02 | Phase 18 | Pending |
| PATH-01 | Phase 18 | Pending |
| PATH-02 | Phase 18 | Pending |
| PATH-03 | Phase 18 | Pending |
| AGENT-04 | Phase 19 | Pending |
| DIST-01 | Phase 20 | Pending |
| DIST-02 | Phase 20 | Pending |
| DIST-03 | Phase 20 | Pending |
| DIST-04 | Phase 20 | Pending |
| ADV-01 | Phase 21 | Pending |
| ADV-02 | Phase 21 | Pending |
| REV-01 | Phase 22 | Pending |
| REV-02 | Phase 22 | Pending |
| REV-03 | Phase 22 | Pending |
| CRIT-01 | Phase 23 | Pending |
| CRIT-02 | Phase 23 | Pending |

**Coverage:**
- v2.0 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-03-01*
*Last updated: 2026-03-01 — expanded with advisory, review panel, and plan critique requirements*
