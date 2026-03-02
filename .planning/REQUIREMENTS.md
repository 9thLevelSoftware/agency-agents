# Requirements: Legion — v3.0

**Defined:** 2026-03-02
**Core Value:** Turn 51 isolated agent personalities into a functional AI legion — "My name is Legion, for we are many."

## v3.0 Requirements

Requirements for the Legion rebrand. Each maps to roadmap phases.

### Command Namespace (CMD)

- [ ] **CMD-01**: All 10 command files use `/legion:` namespace instead of `/agency:` in name declarations and all internal references
- [ ] **CMD-02**: Cross-command references within each command file point to `/legion:` equivalents (e.g., "run `/legion:build` next")
- [ ] **CMD-03**: Commit message prefixes in commands updated from `feat(agency):` / `chore(agency):` to `feat(legion):` / `chore(legion):`

### Skill Updates (SKL)

- [x] **SKL-01**: `workflow-common` skill updated with `/legion:` namespace across all shared constants and documentation
- [ ] **SKL-02**: All 17 skill files have `/agency:` references replaced with `/legion:` for command routing and integration points
- [ ] **SKL-03**: Commit format patterns in execution-tracker and github-sync skills updated to `feat(legion):` / `chore(legion):`

### Plugin Identity (PLG)

- [x] **PLG-01**: Plugin manifest (`.claude-plugin/plugin.json`) has name `legion`, updated description, and correct repository URL
- [x] **PLG-02**: Marketplace entry (`.claude-plugin/marketplace.json`) updated with `legion` name, description, and URLs

### Documentation (DOC)

- [ ] **DOC-01**: README.md rewritten with Legion branding, the quote "My name is Legion, for we are many.", and all `/legion:` commands
- [ ] **DOC-02**: CLAUDE.md updated with Legion identity, `/legion:` command table, and project description
- [ ] **DOC-03**: CONTRIBUTING.md updated with Legion references and development instructions
- [ ] **DOC-04**: CHANGELOG.md updated with v3.0 entry documenting the Legion rebrand

### Attribution (ATR)

- [ ] **ATR-01**: Shoulders of Giants section in README includes dedicated entry crediting `9thLevelSoftware/agency-agents` as the origin of the 51 agent personalities before workflow orchestration was added

## Future Requirements

None — v3.0 is a focused rebrand milestone.

## Out of Scope

| Feature | Reason |
|---------|--------|
| New features or capabilities | v3.0 is identity-only; features come in v3.1+ |
| Backward compatibility with /agency: commands | Clean break — users adopt /legion: namespace |
| Agent personality file changes | Agent files contain zero "agency" references; no changes needed |
| GitHub repo rename | User handles repo rename separately if desired |
| .planning/ historical file updates | Archive files preserve history as-is |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SKL-01 | Phase 24 | Complete |
| CMD-01 | Phase 25 | Pending |
| CMD-02 | Phase 25 | Pending |
| CMD-03 | Phase 25 | Pending |
| SKL-02 | Phase 26 | Pending |
| SKL-03 | Phase 26 | Pending |
| PLG-01 | Phase 27 | Complete |
| PLG-02 | Phase 27 | Complete |
| DOC-01 | Phase 28 | Pending |
| DOC-02 | Phase 28 | Pending |
| DOC-03 | Phase 28 | Pending |
| DOC-04 | Phase 28 | Pending |
| ATR-01 | Phase 28 | Pending |

**Coverage:**
- v3.0 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-02 after Phase 24 completion (SKL-01 complete)*
