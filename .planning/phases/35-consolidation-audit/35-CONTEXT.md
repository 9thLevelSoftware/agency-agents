# Phase 35 Context: Consolidation Audit

**Created:** 2026-03-02
**Source:** /gsd:discuss-phase 35

---

## Resolution Scope

**Decision:** Fix all 7 findings identified in research. Nothing deferred.

This is the final audit phase before v4.0 milestone completion. Every finding — HIGH, MEDIUM, and LOW — gets resolved in this phase.

**Task grouping:** Group by type (2-3 tasks), not one task per finding and not one mega-task.
- Agent personality rewrites (3 agents) = one task
- Metadata fixes (division casing, boundary docs, skill docs) = one task
- Post-fix verification re-scan = one task

**Verification:** Full re-scan after all fixes are applied. Do not only verify the 7 known findings — run a complete overlap check to catch anything research may have missed.

---

## Broken Clone: social-media-strategist

**Decision:** Full personality authoring — same quality bar as the original 51 agents.

**Role:** Strategy layer above the 4 platform specialists (Twitter, Instagram, TikTok, Reddit).
- Decides WHICH platforms to use, WHAT content mix, HOW to allocate resources
- Platform specialists (twitter-engager, instagram-curator, tiktok-strategist, reddit-community-builder) handle execution

**Platform scope:** All social platforms — not limited to the 4 that have dedicated specialists. Covers LinkedIn, BlueSky, Mastodon, YouTube, and any other platform strategically. The specialists handle their domains; this agent covers gaps + overall cross-platform strategy.

**Quality bar:** Complete mission statement, principles, behavioral patterns, anti-patterns, personality voice. Not a stub.

---

## Agent Personality Rewrites (3 total)

All three rewrites get the **full personality authoring** treatment:

1. **marketing-social-media-strategist.md** — Strategy layer above platform specialists (see above)
2. **project-manager-senior.md** — Full Legion-native rewrite. Remove all `ai/memory-bank/` references. Align to `.planning/` structure. Complete personality, not just a path fix.
3. **testing-workflow-optimizer.md** — Full rewrite scoped to testing/QA workflows specifically: test pipeline efficiency, CI optimization, QA process improvement. Remove "all business functions" scope.

---

## Division Naming

**Decision:** Title Case is canonical for agent frontmatter `division:` fields.

- Normalize all agent files: `project-management` → `Project Management`, `spatial-computing` → `Spatial Computing`
- **CATALOG.md keeps lowercase-hyphenated keys** — the mapping from Title Case frontmatter to lowercase CATALOG keys is implicit (lowercase + hyphenate)
- **CLAUDE.md** already uses Title Case — no change needed
- **agent-creator skill** validation must be updated to accept Title Case division values

---

## Analytics Reporter Differentiation

**Decision:** Keep both agents, sharpen descriptions and task-type boundaries.

- `data-analytics-reporter` (Specialized): "Build and maintain data infrastructure — pipelines, ETL, warehouses. Pre-analysis work."
- `support-analytics-reporter` (Support): "Consume clean data to produce dashboards and executive reports. Post-analysis delivery."

Ensure CATALOG.md task-type tags have zero overlap between the two agents.

---

## Boundary Documentation

**Decision:** Document undocumented boundaries inline in the affected files.

- `agents-orchestrator.md`: Add clarity that it's a "spawnable coordinator agent for cross-division task execution within a build task, not an alternative to /legion:build"
- `review-loop` and `review-panel` SKILL.md summaries: Add explicit parent/child relationship documentation (loop = control flow, panel = team assembly called by loop)

---

## Audit Documentation

**Decision:** Produce a standalone `35-AUDIT.md` in `.planning/phases/35-consolidation-audit/`.

Contents: Full inventory pass, findings, resolutions applied, and post-fix verification results.

**No permanent inventory document.** CATALOG.md is the authoritative agent registry. The audit inventory is a phase working document, not a reference artifact.

---

## Agent Teams Migration (Finding 8)

**Decision:** All 51 agent personas are designed to be spawned as Agent Team members, NOT as subagents.

**Source:** Claude Code Agent Teams docs (https://code.claude.com/docs/en/agent-teams)

**Key differences from subagent pattern:**
- Agent Teams: independent context windows, shared task list, direct inter-agent messaging via SendMessage
- Subagents: results only return to caller, no inter-agent communication
- Teams use `TeamCreate` → spawn teammates with `Agent` tool's `team_name` parameter → coordinate via shared task list
- Teams enable direct peer-to-peer collaboration between agents (e.g., QA agent talks directly to dev agent)

**What needs to change:**
- `wave-executor` SKILL.md: Update agent spawning to use Agent Teams pattern (TeamCreate, spawn with team_name, shared task list coordination)
- `review-loop` SKILL.md: Review agents spawned as team members, can communicate findings to each other
- `commands/build.md`: Create team at start, spawn agents as teammates, team cleanup at end
- `commands/review.md`: Create review team, spawn reviewers as teammates
- `skills/workflow-common/SKILL.md`: Add Agent Team conventions section

**Constraint:** Agent Teams are experimental — flag `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` must be enabled. Document this requirement.

**Constraint:** No nested teams — teammates cannot spawn their own teams. Only the lead (build/review command) manages the team.

---

## Memory System Alignment (Finding 9)

**Decision:** Ensure Legion's Daem0n-lite memory (`.planning/memory/`) leverages Claude Code's built-in memory system where possible, rather than conflicting.

**Claude Code memory:** Platform-level auto-managed memory at `~/.claude/projects/{project}/memory/MEMORY.md`. Stores user preferences, project patterns, and cross-session context automatically.

**Legion memory:** Project-local structured agent data at `.planning/memory/` — OUTCOMES.md, PATTERNS.md, ERRORS.md, PREFERENCES.md. Stores agent performance, error signatures, successful patterns, and user decision signals.

**Relationship:** Complementary, not competing.
- Claude Code memory = platform-level, auto-managed, general context
- Legion memory = project-local, explicit, agent orchestration-specific, git-tracked
- Legion should NOT duplicate into Claude Code memory (different audience: platform vs agent routing)
- Legion SHOULD read from Claude Code memory when available (user preferences may inform agent selection)

**What needs to change:**
- `memory-manager` SKILL.md: Add explicit section documenting the relationship between Legion memory and Claude Code memory. Define the boundary: what goes where, why they coexist, when to read from Claude Code memory.
- `workflow-common` SKILL.md: Update Memory Conventions section to mention Claude Code memory integration.

---

## Scope Guardrails

**In scope:**
- Agent `.md` body rewrites (3 agents)
- Agent frontmatter division normalization (all 51 agents)
- CATALOG.md description and task-type sharpening
- Skill SKILL.md summary clarifications (review-loop, review-panel)
- Agent-creator skill validation update
- Agent Teams migration (wave-executor, review-loop, build, review commands)
- Memory system alignment documentation (memory-manager, workflow-common)
- 35-AUDIT.md production
- Post-fix full re-scan verification

**Out of scope:**
- New agents, skills, or commands
- Algorithm changes to agent-registry recommendation
- Changes to memory-manager's functional storage format (4-file structure stays)
- Implementing Claude Code memory writes from Legion (read-only integration)

**Trust research:** The inventory pass found zero command-level or skill-level redundancy. Phase execution trusts this finding and focuses on the 9 findings (7 original + Agent Teams + memory alignment) + post-fix re-scan.

---

## Deferred Ideas

None — all findings are resolved in this phase.
