# The Agency Workflows — Roadmap

## Milestones

- [x] **v1.0** — Core plugin with 9 commands, 15 skills, 51 agents, multi-domain workflows (14 phases, 30 plans, 54 requirements) → [Archive](milestones/v1.0-ROADMAP.md)
- [x] **v2.0** — Proper Claude Code plugin with advisory capabilities: manifest, restructured directories, installable via `claude plugin add`, plus strategic advisors, dynamic review panels, and plan critique (9 phases, 9 plans, 26 requirements) → [Archive](milestones/v2.0-ROADMAP.md)
- [ ] **v3.0** — Legion rebrand: `/legion:` namespace, updated plugin manifest, rewritten docs, and attribution (5 phases, 13 requirements)

---

## v3.0 — Legion Rebrand

### Phases

- [x] **Phase 24: Foundation** — Update workflow-common with Legion constants; everything else depends on this
- [x] **Phase 25: Commands** — Rename all 10 command files to `/legion:` namespace
- [x] **Phase 26: Skills** — Update remaining 16 skill files with `/legion:` references
- [x] **Phase 27: Plugin Manifest** — Update plugin.json and marketplace.json to Legion identity (completed 2026-03-02)
- [ ] **Phase 28: Documentation** — Rewrite README, update CLAUDE.md, CONTRIBUTING.md, CHANGELOG.md, add attribution

### Phase Details

#### Phase 24: Foundation
**Goal:** Users of the codebase see `/legion:` as the canonical namespace in all shared constants
**Depends on:** Nothing (first v3.0 phase)
**Requirements:** SKL-01
**Success Criteria** (what must be TRUE):
1. `workflow-common` skill file contains no `/agency:` references
2. All shared constants, command routing strings, and documentation within `workflow-common` use `/legion:`
3. A developer reading `workflow-common` sees Legion as the identity with no Agency remnants
**Plans:** 1/1 plans complete

#### Phase 25: Commands
**Goal:** Every command the user can type is a `/legion:` command — the `/agency:` namespace is gone
**Depends on:** Phase 24
**Requirements:** CMD-01, CMD-02, CMD-03
**Success Criteria** (what must be TRUE):
1. All 10 command files declare their name as `/legion:<command>` with no `/agency:` name declarations remaining
2. Cross-command routing within each file points to `/legion:` equivalents (e.g., "run `/legion:build` next")
3. Commit message prefix examples within command files show `feat(legion):` / `chore(legion):`
4. A user following any command's inline instructions is directed only to `/legion:` commands
**Plans:** 1/1 plans complete

#### Phase 26: Skills
**Goal:** All 16 remaining skill files reference `/legion:` for every command integration point
**Depends on:** Phase 24
**Requirements:** SKL-02, SKL-03
**Success Criteria** (what must be TRUE):
1. Zero `/agency:` command references remain across all 17 skill files (including workflow-common from Phase 24)
2. execution-tracker and github-sync skills use `feat(legion):` / `chore(legion):` commit format patterns
3. Any skill that routes a user to a command routes them to `/legion:` equivalents
**Plans:** 1/1 plans complete

#### Phase 27: Plugin Manifest
**Goal:** The plugin is installable as `claude plugin install legion` with correct identity
**Depends on:** Phase 25
**Requirements:** PLG-01, PLG-02
**Success Criteria** (what must be TRUE):
1. `plugin.json` has `"name": "legion"` and a description that matches the Legion identity
2. `marketplace.json` has `"name": "legion"`, updated description, and correct repository URL
3. Neither manifest file contains "agency" or "Agency Workflows" in any field
**Plans:** 1/1 plans complete

Plans:
- [ ] 27-01-PLAN.md — Update plugin.json and marketplace.json to Legion identity (PLG-01, PLG-02)

#### Phase 28: Documentation
**Goal:** Every user-facing document presents Legion as the project identity with full attribution
**Depends on:** Phase 25, Phase 27
**Requirements:** DOC-01, DOC-02, DOC-03, DOC-04, ATR-01
**Success Criteria** (what must be TRUE):
1. README.md opens with Legion branding, includes the quote "My name is Legion, for we are many.", and lists all commands as `/legion:` with no `/agency:` references
2. README.md has a Shoulders of Giants section that explicitly credits `9thLevelSoftware/agency-agents` as the source of the 51 agent personalities
3. CLAUDE.md command table and project description reflect Legion identity and `/legion:` namespace
4. CONTRIBUTING.md references Legion throughout its development instructions
5. CHANGELOG.md has a v3.0 entry that documents the Legion rebrand
**Plans:** 2 plans

Plans:
- [ ] 28-01-PLAN.md — Rewrite README.md with Legion branding and attribution (DOC-01, ATR-01)
- [ ] 28-02-PLAN.md — Update CLAUDE.md, CONTRIBUTING.md, and CHANGELOG.md (DOC-02, DOC-03, DOC-04)

### Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 24. Foundation | 1/1 | Complete    | 2026-03-02 |
| 25. Commands | 1/1 | Complete    | 2026-03-02 |
| 26. Skills | 1/1 | Complete    | 2026-03-02 |
| 27. Plugin Manifest | 1/1 | Complete    | 2026-03-02 |
| 28. Documentation | 0/2 | Not started | — |
