---
phase: 35
name: Consolidation Audit
type: ecosystem
researcher: gsd-phase-researcher
date: 2026-03-02
confidence: high
---

# Phase 35 Research: Consolidation Audit

## What This Phase Is

This is a **functional architecture audit** — not a code audit. The deliverables are markdown
personality files, skill definitions, and command orchestration files. The goal is to ensure
Legion's 51 agents, 18 skills, and 10 commands form a cohesive system with no unintentional
duplication, no conflicting responsibilities, and no orphaned components.

**This is NOT an opportunity to add new features.** Every finding resolves to one of three
actions: merge, consolidate, or remove. No new components exit this phase.

---

## Findings From Direct Inventory

Before research on methodology, the inventory pass surfaced concrete issues that the phase
must address. These are documented here to anchor the plan tasks.

### Finding 1: `marketing-social-media-strategist.md` is a broken clone

**Severity: HIGH — Confirmed duplicate with identity mismatch**

`agents/marketing-social-media-strategist.md` has:
- Frontmatter: `name: Social Media Strategist`, broad Twitter/LinkedIn/professional platform scope
- Body: **Identical to `marketing-twitter-engager.md`** — titled "# Twitter Engager Agent"

This file simultaneously claims to be a multi-platform strategist (by description) and a
Twitter-only specialist (by body content). It is a copy-paste artifact. The catalog lists it
with task types `[social-strategy, linkedin, thought-leadership, viral-campaigns, community-management]`
but the body delivers zero LinkedIn/multi-platform capability.

**Resolution options:**
1. Rewrite the body to match the frontmatter (true cross-platform strategist covering Twitter,
   LinkedIn, BlueSky, Mastodon strategy at the channel-agnostic level)
2. Delete it and route multi-platform strategy needs to `marketing-content-creator` + individual
   platform specialists

The body rewrite approach (option 1) is recommended — it fills a genuine gap: a strategist who
decides *which* platforms, *what* content mix, and *how* to allocate across them, while the
platform agents (twitter-engager, instagram-curator, tiktok-strategist) handle execution.

### Finding 2: `data-analytics-reporter` and `support-analytics-reporter` are near-duplicate analytics roles

**Severity: MEDIUM — High functional overlap, different technical depth**

Comparison:
- `data-analytics-reporter` (Specialized division): Pipeline-first, ETL-heavy, SQL/Python/R
  tooling, data infrastructure focus, "make data trustworthy at scale"
- `support-analytics-reporter` (Support division): Dashboard-first, KPI tracking, business
  intelligence, stakeholder reporting, "transform raw data into actionable business insights"

Both produce dashboards, both do statistical analysis, both target business decision-makers.
The catalog separates them as `[data-pipelines, etl, data-quality]` vs `[dashboards, kpi-reporting,
business-intelligence]` — a real but thin line.

**Resolution:** Keep both, but sharpen the description and task-type boundary. The catalog's
current descriptions do this better than the files' own descriptions. The files need updated
summaries that make the split legible in one sentence:
- `data-analytics-reporter`: "Build and maintain the data infrastructure — pipelines, ETL,
  warehouses. Pre-analysis work."
- `support-analytics-reporter`: "Consume clean data to produce dashboards and executive
  reports. Post-analysis delivery."

### Finding 3: Division naming is inconsistent in agent frontmatter

**Severity: LOW — Metadata quality, not functional overlap**

Divisions use mixed casing in agent `division:` fields:
- Title-cased: `Engineering`, `Design`, `Marketing`, `Testing`, `Product`, `Support`, `Specialized`
- Lowercase hyphenated: `project-management`, `spatial-computing`

CLAUDE.md lists them as "Project Management" and "Spatial Computing". The agent-registry
CATALOG.md uses lowercase hyphenated. The inconsistency does not break functionality (the
catalog is authoritative for routing) but creates confusion for the agent-creator skill when
validating division values.

**Resolution:** Normalize all agent frontmatter `division:` fields to Title Case to match
CLAUDE.md's canonical list. Update agent-creator skill validation to match.

### Finding 4: `testing-workflow-optimizer` is in the wrong division

**Severity: LOW — Misclassification**

`testing-workflow-optimizer.md` (division: Testing) describes a process improvement specialist
who "analyzes, optimizes, and automates workflows across all business functions." This is not a
testing function — it is operations/PM work. Its task types are
`[workflow-optimization, process-automation, efficiency, bottleneck-analysis, continuous-improvement]`.

Compare to `project-management-studio-operations` which covers "day-to-day studio efficiency,
process optimization, and resource coordination." The overlap is real but resolvable by
scoping each agent differently:
- `testing-workflow-optimizer` → scope it to *testing* workflow optimization specifically (test
  pipeline efficiency, CI optimization, QA process improvement). Make the Testing division
  membership meaningful.
- Or move it to Project Management and merge its process optimization scope with
  `project-management-studio-operations`.

**Resolution:** Rewrite `testing-workflow-optimizer` to scope specifically to testing and QA
workflow optimization. Remove the "all business functions" scope. This sharpens the Testing
division's purpose and removes the overlap with Studio Operations.

### Finding 5: `agents-orchestrator` partially duplicates the `/legion:build` command

**Severity: LOW — Intentional design but undocumented boundary**

`agents-orchestrator` (Specialized) describes itself as "autonomous pipeline manager that
orchestrates the entire development workflow" and manages "full workflow: PM → ArchitectUX →
[Dev ↔ QA Loop] → Integration." This is almost exactly what `/legion:build` + `wave-executor`
do.

The distinction is:
- `/legion:build` = Legion's opinionated orchestrator (reads plan files, dispatches waves,
  commits progress, updates STATE.md)
- `agents-orchestrator` = A spawnable agent personality for project-internal orchestration
  (coordinates other agents within a build task when multi-agent coordination is needed inside
  one plan)

The agent is used in the Step 5 mandatory coordinator role for cross-division tasks. This is
correct use — it is not a replacement for the command, it is an agent personality that *can be
spawned by the command*.

**Resolution:** Document the boundary in the agent's description and in the CATALOG.md task
types. No merge needed, but the description needs to clarify "spawnable coordinator agent for
cross-division task execution, not an alternative to `/legion:build`."

### Finding 6: `review-loop` and `review-panel` trigger overlap on "review"

**Severity: LOW — Overlapping triggers, clear functional separation**

Both skills have `review` in their trigger list. The functional separation is clear:
- `review-loop`: *Runs* the iterative QA cycle (spawns agents, collects findings, routes fixes,
  repeats up to 3 cycles)
- `review-panel`: *Composes* the review team dynamically (selects which agents to spawn based
  on what is being reviewed)

The panel is a sub-component of the loop. The loop calls the panel to assemble reviewers.
The trigger overlap is harmless — the `review` command loads both via its `execution_context`.
No merge needed, but the SKILL.md summaries should explicitly state the relationship.

### Finding 7: `project-manager-senior` is a legacy narrow-scope agent

**Severity: LOW — Scope mismatch with the role it is used for**

`project-manager-senior.md` describes: "Converts specs to tasks with focus on realistic scope,
no background processes, and exact spec requirements." The personality body references
`ai/memory-bank/site-setup.md` — a path from a specific client project's conventions, not
Legion's `.planning/` structure.

The CATALOG.md assigns it task types `[task-breakdown, spec-to-tasks, scope-management,
sprint-execution, implementation-planning]` and uses it as the mandatory coordinator for
cross-division tasks alongside `project-management-project-shepherd` and `agents-orchestrator`.

The file was authored for a specific project context and contains a hardcoded path reference
that is wrong in Legion's conventions. It functions acceptably as a personality (LLMs ignore
mismatched paths) but the identity is confused.

**Resolution:** Update the body to be Legion-aware: reference `.planning/` paths, remove
`ai/memory-bank/` references, align personality to Legion's coordination model. Do not
merge with `project-management-project-shepherd` — they serve different grain sizes
(task-level vs phase-level coordination).

---

## Standard Stack

For a functional architecture audit of a markdown-based plugin system, the methodology is
document analysis, not tooling. The following constitute the "stack" for this phase:

**Inventory method:** Direct file enumeration with structured comparison.
- Read all agent frontmatter + first 30 lines of body
- Extract: name, division, description, first paragraph of mission
- Compare pairwise within divisions and across divisions for the same task types

**Overlap scoring:** AWS Agent Squad's published thresholds applied to textual comparison:
- High overlap (>30% description similarity): merge or sharpen boundary
- Medium overlap (10-30%): acceptable if task-type tags are differentiated
- Low overlap (<10%): well-differentiated, no action needed

**Resolution framework (three-option model):**
1. **Merge** — one agent absorbs the other's scope; the other file is deleted
2. **Consolidate** — both agents kept, boundaries sharpened in description and catalog
3. **Remove** — agent provides no unique value; deleted with no replacement

**Division validation:** Cross-check agent `division:` field against CLAUDE.md canonical list
and CATALOG.md structure. Any mismatch is a metadata defect.

**Orphan detection:** Skills and agents not referenced in any command or by any skill that
IS referenced should be flagged. An orphan is not necessarily wrong (it may be advisory-only),
but must be intentional.

---

## Architecture Patterns

### Single Responsibility Per Agent

Each agent should have one primary capability that is not also the primary capability of any
other agent. Secondary capabilities may overlap (a frontend dev and a UI designer both care
about accessibility — that is fine). The PRIMARY description must be unique.

The test: Can a human quickly decide between two agents without reading their full file? If not,
the descriptions are not differentiated enough.

### Division = Deployment Context, Not Just Topic

An agent's division signals which type of work it handles and implicitly which commands will
spawn it. Testing agents are spawned by `/legion:review`. Engineering agents are spawned by
`/legion:build`. Support agents are spawned by `/legion:advise` for operational questions.

An agent in the wrong division will be systematically skipped for relevant work because the
routing algorithm uses division alignment in its scoring (2 points for division match). The
`testing-workflow-optimizer` misclassification is a real routing defect, not just cosmetic.

### Skill = Reusable Workflow, Not Agent Capability

Skills are orchestration patterns consumed by commands. An agent can have a capability (e.g.,
writing content calendars) without there being a skill for it — that capability is in the
personality file. A skill is for multi-step workflows that cross agent boundaries or that
multiple commands need to share.

The boundary test: Is this logic repeated in more than one command? → Skill. Is this
capability belonging to one specialist? → Agent personality.

### Command = User Entry Point, Not Business Logic

Commands are thin orchestrators: they read context, select skills, spawn agents, and route
outputs. They should not contain algorithmic business logic — that belongs in skills. If two
commands are doing the same thing, either they share a skill (correct) or one is redundant.

All 10 commands pass this test currently. `/legion:status` and `/legion:build` both read
STATE.md but for different purposes (display vs execution context). No command redundancy found.

---

## Don't Hand-Roll

**Do not build a custom overlap-detection tool.** The audit is small enough (51 agents, 18
skills, 10 commands) to do by hand with structured comparison. TF-IDF / cosine similarity
automation adds no value at this scale.

**Do not create a new "consolidation" skill or command.** This phase produces only changes to
existing files and possibly file deletions. No new files should be created except this research
document and phase plan files.

**Do not refactor the recommendation algorithm** as part of this phase. If the algorithm is
routing incorrectly because of metadata defects (wrong division, missing task types), fix the
metadata. The algorithm itself is correct.

**Do not resolve the `marketing-social-media-strategist` issue by deleting it.** The Catalog
and multiple skills reference it. A deletion without a body rewrite would leave routing gaps.
Rewrite the body to match the frontmatter instead.

---

## Common Pitfalls

### 1. Treating thin files as stubs (they are not)

Several agents have lean personalities (60-130 lines): `marketing-growth-hacker`,
`marketing-content-creator`, `data-analytics-reporter`. These are complete, substantive
personalities — they are concise by design, not incomplete. Do not add padding to "fix" a
short file.

### 2. Over-consolidating platform-specific marketing agents

The Marketing division has 4 platform specialists (Twitter, Instagram, TikTok, Reddit). These
look redundant — they are all "social media." They are not redundant — each platform has
distinct content formats, algorithm behaviors, and community norms. The specialists are
correctly separate. Do not merge them.

The real issue is the `marketing-social-media-strategist` agent, which should be the
strategy layer that sits above the platform specialists — not a duplicate of one of them.

### 3. Merging review-loop and review-panel

They have the same trigger word ("review") and both serve `/legion:review`. Do not merge them.
The loop is the control flow; the panel is the team assembly. Merging creates a god-skill that
is too large and too hard to reason about.

### 4. Normalizing division casing without updating the CATALOG.md

If agent frontmatter is updated to use Title Case for all divisions, CATALOG.md and
agent-creator's validation must be updated in the same commit. Partial updates break the
file-name-based routing.

### 5. Confusing "different description" with "different purpose"

`support-analytics-reporter` and `data-analytics-reporter` have different descriptions but
both help users understand their data. The correct question is: "Can a human with a real
task send it to one agent without reading the other's file?" The answer is yes, once the
task-type tags are sharp. Keep both.

### 6. Missing the `project-manager-senior` hardcoded path issue

The body references `ai/memory-bank/site-setup.md` — a project-specific convention that
does not exist in Legion's directory structure. A task that checks for agent correctness
should grep for this and fix it. Easy to miss during a casual read.

---

## Verification Approach

Each resolution action in the phase plan should be verified with a specific check:

**For body rewrites (social-media-strategist, project-manager-senior, testing-workflow-optimizer):**
- Verification: The revised file's description and body paragraph 1 describe the same agent.
  No legacy references to wrong paths or contradicting identity claims.

**For description sharpening (analytics pair, agents-orchestrator):**
- Verification: The CATALOG.md task-type columns for the two agents have zero overlap in
  their tag lists.

**For division normalization:**
- Verification: `grep -h "^division:" agents/*.md | sort -u` returns exactly 9 unique values,
  all Title Cased, matching CLAUDE.md's canonical list.

**For skill relationship documentation (review-loop/review-panel):**
- Verification: Each SKILL.md summary explicitly mentions its relationship to the other skill
  (e.g., "Called by review-loop to assemble reviewer team").

**For orphan detection:**
- Verification: Every skill can be traced to at least one command's `execution_context` block
  OR is explicitly documented as advisory-only.

---

## Scope Boundaries

Phase 35 touches the following and NOTHING else:

**In scope:**
- Agent `.md` files in `agents/` — body rewrites, description updates, division field fixes
- Skill `SKILL.md` files — summary clarifications, relationship documentation
- `skills/agent-registry/CATALOG.md` — task-type tag deduplication, description sharpening
- `CLAUDE.md` — if the agent count changes (e.g., if `marketing-social-media-strategist` is
  rewritten rather than deleted, the count stays at 51)

**Out of scope:**
- Command logic changes (commands are not duplicative)
- Algorithm changes to agent-registry recommendation
- Adding new agents or skills
- New features of any kind
- Changing the wave-executor, memory-manager, or any skill's functional behavior

---

## Confidence Levels

| Finding | Confidence | Basis |
|---------|-----------|-------|
| Social-media-strategist is a broken clone | HIGH | File body read — identical to twitter-engager body |
| Analytics pair has high overlap | HIGH | Both files read, descriptions compared |
| Division naming inconsistency | HIGH | `grep` output verified — 2 lowercase, 7 Title Case |
| testing-workflow-optimizer misclassified | MEDIUM | Description read; functional overlap with studio-ops is real but the decision to rewrite vs move is judgment |
| agents-orchestrator vs /legion:build boundary | MEDIUM | Role analysis; boundary exists but is underdocumented |
| review-loop/review-panel trigger overlap | HIGH | Triggers verified; functional separation is architecturally correct |
| project-manager-senior legacy path reference | HIGH | `ai/memory-bank/site-setup.md` found in file |
| No command-level redundancy | HIGH | All 10 command purposes are distinct |
| No skill-level redundancy (workflow logic) | HIGH | 18 skills reviewed; no two execute the same workflow |

---

## Sources

- [AWS Agent Squad: Agent Overlap Analysis](https://awslabs.github.io/agent-squad/cookbook/monitoring/agent-overlap/) — TF-IDF / cosine similarity thresholds for agent differentiation (<10% low, 10-30% medium, >30% high overlap)
- [Google Cloud: Choose a design pattern for your agentic AI system](https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system) — Coordinator and Hierarchical patterns; when to use supervisor agents vs command orchestration
- [Designing Effective Multi-Agent Architectures (O'Reilly)](https://www.oreilly.com/radar/designing-effective-multi-agent-architectures/) — Single responsibility per agent; each agent owns a specific responsibility
- [Google Developers Blog: Multi-agent patterns in ADK](https://developers.googleblog.com/developers-guide-to-multi-agent-patterns-in-adk/) — Agent specialization best practices; avoid keeping highly similar agents separate
- [PwC: Validating multi-agent AI systems](https://www.pwc.com/us/en/services/audit-assurance/library/validating-multi-agent-ai-systems.html) — Modular testing for MAS; each agent requires unique identity and defined permission scope
- [Galileo: Why do Multi-Agent LLM Systems Fail](https://galileo.ai/blog/multi-agent-llm-systems-fail) — Role clarity as failure mode; agents talk past each other when responsibilities overlap
- [DEV Community: Plugin audit for Claude Code plugins](https://dev.to/nestedcat/i-built-an-audit-plugin-to-audit-claude-code-plugins-2hlg) — Audit command methodology for listing commands, skills, agents in a clean inventory table
- [Speakeasy: Architectures of agentic applications](https://www.speakeasy.com/mcp/using-mcp/ai-agents/architecture-patterns) — Modular agent design; decouple decision-making from execution
