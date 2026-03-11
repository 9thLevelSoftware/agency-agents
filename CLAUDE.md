# Legion

A multi-CLI plugin for orchestrating 53 AI specialist personalities as a coordinated legion. Works with Claude Code, OpenAI Codex CLI, Cursor, GitHub Copilot CLI, Google Gemini CLI, Kiro CLI, Windsurf, OpenCode, and Aider.

## MANDATORY: User Interaction Rule

**When any `/legion:` command needs to ask the user a question or present choices, you MUST use the `AskUserQuestion` tool.** Do NOT output questions as raw text. This applies to every confirmation gate, mode selection, workflow preference, agent swap prompt, and any other user-facing question in any Legion command or skill. No exceptions.

## Available Commands

| Command | Description |
|---------|-------------|
| `/legion:start` | Initialize a new project with guided questioning flow |
| `/legion:plan <N>` | Plan phase N with agent recommendations and wave-structured tasks |
| `/legion:build` | Execute current phase plans with parallel agent teams |
| `/legion:review` | Run quality review cycle with testing/QA agents |
| `/legion:status` | Show progress dashboard and route to next action |
| `/legion:quick <task>` | Run ad-hoc task with intelligent agent selection |
| `/legion:advise` | Get read-only expert consultation from any of the 53 agent personalities |
| `/legion:portfolio` | Multi-project dashboard with dependency tracking |
| `/legion:milestone` | Milestone completion, archiving, and metrics |
| `/legion:agent` | Create a new agent personality through a guided workflow |
| `/legion:explore` | Pre-flight exploration with Polymath — crystallize, onboard, compare, or debate |
| `/legion:update` | Check for updates and install latest version from npm |

## Project Structure

```
bin/                  — npm installer (install.js)
commands/             — 12 /legion: command entry points
skills/               — 25 reusable workflow skills (SKILL.md per directory)
agents/               — 53 agent personality .md files (flat, with division in frontmatter)
adapters/             — Per-CLI adapter files (claude-code.md, codex-cli.md, cursor.md, etc.)
.planning/            — Project state (PROJECT.md, ROADMAP.md, STATE.md)
  milestones/         — Archived requirements and roadmaps
  phases/             — Phase plan and summary files
```

## Agent Divisions (53 total)

| Division | Count | Focus |
|----------|-------|-------|
| Engineering | 8 | Full-stack, backend, frontend, AI, DevOps, mobile, prototyping, Laravel specialization |
| Design | 6 | UI/UX, branding, visual storytelling, research |
| Marketing | 8 | Content, social media, growth, platform strategies |
| Testing | 7 | QA, evidence collection, performance, API testing |
| Product | 3 | Sprint planning, feedback synthesis, trends |
| Project Management | 5 | Coordination, portfolio, operations, experiments |
| Support | 6 | Analytics, finance, legal, infrastructure |
| Spatial Computing | 6 | VisionOS, XR, Metal, terminal integration |
| Specialized | 4 | Orchestration, data analytics, LSP indexing, exploration |

Agent frontmatter includes enriched metadata: `languages`, `frameworks`, `artifact_types`, and `review_strengths` fields enable metadata-aware agent selection by the recommendation engine.

## Workflow

```
/legion:start → /legion:plan 1 → /legion:build → /legion:review → /legion:plan 2 → ...
```

Each phase: plan (decompose + assign agents) → build (execution — parallel or sequential per CLI) → review (QA loop)

Advisory: `/legion:advise <topic>` — standalone consultation, no phase context needed

Intent routing: `/legion:status` and other commands use natural language intent parsing with context-aware suggestions, routing ambiguous inputs to the most relevant command based on project state.

GitHub integration is opt-in — when a GitHub remote exists, `/legion:plan` creates issues, `/legion:build` creates PRs, and `/legion:status` shows GitHub status.

Brownfield support is automatic — when `/legion:start` detects an existing codebase, it offers to analyze architecture, frameworks, risks, dependency graphs, test coverage, API surface, config/environment, and code patterns. The analysis produces `.planning/CODEBASE.md`, consumed by 5 commands: `/legion:plan` injects context into phase decomposition, `/legion:build` injects conventions and guidance into agent execution prompts, `/legion:review` injects conventions for conformance checking, `/legion:plan` (critique) cross-references risks during pre-mortem analysis, and `/legion:status` detects staleness. Standalone re-analysis is available via `/legion:quick analyze codebase`. The codebase mapper also produces dependency risk analysis (outdated packages, heavy dependencies, unmaintained packages) and test coverage correlation (critical untested files ranked by fan-in and complexity).

Marketing workflows activate when `/legion:plan` detects a marketing-focused phase (MKT-* requirements or marketing keywords). Campaign planning produces structured documents at `.planning/campaigns/`, with content calendars and cross-channel coordination across the 8 marketing agents.

Design workflows activate when `/legion:plan` detects a design-focused phase (DSN-* requirements or design keywords). Design system creation produces structured documents at `.planning/designs/`, with component specifications and three-lens review (brand, accessibility, usability) across the 6 design agents.

## Authority Matrix

Explicit boundaries for what agents decide autonomously vs. what requires human approval.

### Autonomous (agents proceed without asking)

| Decision | Scope |
|----------|-------|
| File edits within assigned task scope | Only files listed in the plan's `files_modified` |
| Writing and running tests | Test files for code the agent is implementing |
| Installing declared dependencies | Dependencies explicitly listed in task instructions |
| Code formatting and linting fixes | Auto-fixable issues within modified files |
| Creating files specified in the plan | Only paths listed in plan artifacts |
| Committing completed work | Atomic commits per completed plan task |

### Human Approval Required

| Decision | Why |
|----------|-----|
| Architecture changes (new patterns, new abstractions) | Architectural choices compound — wrong abstractions are expensive to undo |
| Adding unplanned dependencies | Dependencies are permanent weight; every `npm install` is a maintenance commitment |
| Modifying files outside task scope | Scope creep is the #1 agent failure mode; stay in your lane |
| Database schema changes | Schema migrations are irreversible in production |
| API contract changes (endpoints, request/response shapes) | Consumers depend on stability; breaking changes cascade |
| Deleting existing functionality | Deletion is irreversible; what looks unused might be depended on elsewhere |
| Changing CI/CD or deployment configuration | Infrastructure changes affect the entire team |
| Overriding review findings or skipping quality gates | Quality gates exist for a reason; agents don't get to decide they're optional |

### Escalation Protocol

When an agent encounters a decision that falls outside its autonomous scope:
1. **Stop** -- do not proceed with the out-of-scope action
2. **Document** -- use a structured `<escalation>` block in your task output:
   ```
   <escalation>
   severity: info | warning | blocker
   type: architecture | dependency | scope | schema | api | deletion | infrastructure | quality
   decision: What decision is needed (one sentence)
   context: Why you encountered this (2-3 sentences)
   </escalation>
   ```
   Optional fields: `alternatives`, `affected_files`, `related_domain`. See `.planning/config/escalation-protocol.yaml` for full specification.
3. **Continue** -- work on other in-scope items while waiting for human input
4. **Never rationalize** -- "it's a small change" or "it's obviously fine" are not valid reasons to skip approval

#### Escalation Types

| Type | Trigger |
|------|---------|
| `architecture` | New patterns, abstractions, structural changes |
| `dependency` | Unplanned package/library additions |
| `scope` | Modifications outside task's `files_modified` list |
| `schema` | Database schema changes |
| `api` | Endpoint or contract changes |
| `deletion` | Removing existing functionality |
| `infrastructure` | CI/CD or deployment changes |
| `quality` | Overriding review findings or skipping gates |

Full protocol specification: `.planning/config/escalation-protocol.yaml`

### Control Modes

The `control_mode` setting in `settings.json` adjusts how strictly authority matrix rules are enforced. Four presets are available:

| Mode | Authority | Domain Filtering | Human Approval | File Restriction | Read-Only |
|------|-----------|-----------------|----------------|-----------------|-----------|
| `autonomous` | Off | Off | Off | Off | Off |
| `guarded` (default) | On | On | On | Off | Off |
| `advisory` | Off | Off | Off | Off | On |
| `surgical` | On | On | On | On | Off |

- **autonomous**: Full agent freedom. Use for trusted workflows and rapid prototyping.
- **guarded**: Default mode. Authority boundaries active, domain-filtered reviews, escalation protocol enforced.
- **advisory**: Agents suggest but don't execute. All findings shown unfiltered. Auto-commit suppressed.
- **surgical**: Maximum restriction. Agents only touch explicitly listed files. All out-of-scope changes blocked.

Set via `settings.json`:
```json
{ "control_mode": "guarded" }
```

Mode profiles are defined in `.planning/config/control-modes.yaml`. See `docs/control-modes.md` for detailed usage guide.

## Memory Layer (Optional)

After build/review cycles, outcomes are recorded to `.planning/memory/OUTCOMES.md` with `task_type` classification for metadata-aware recommendation scoring and archetype boosts. During planning, past outcomes boost agent recommendations. During status, recent outcomes enrich the session briefing. All memory features degrade gracefully — the system works identically without them.

## Conventions

- **Personality-first**: Agent .md files are the source of truth for agent behavior
- **Full injection**: Agents are spawned with their complete personality as instructions
- **Max 3 tasks per plan**: Keeps work focused and reviewable
- **Plan schema hardening**: Plans include `files_forbidden` (prevents cross-plan conflicts), `expected_artifacts` (output contracts), and mandatory `verification_commands` (bash commands proving success)
- **Wave execution**: Plans grouped into dependency waves; parallel within (if CLI supports it), sequential between
- **Wave safety**: File overlap detection prevents parallel plans from writing the same files. `sequential_files` serializes dispatch for plans sharing files that require single-agent access
- **Cost profile**: Planning/execution/check tiers mapped to CLI-specific model names via adapter
- **CLI-agnostic core**: All skills and commands reference generic adapter concepts; per-CLI adapters define the implementation. Adapters include conformance metadata (`lint_commands`, `max_prompt_size`, `known_quirks`) validated by cross-reference checks
- **Observability**: Decision logging in SUMMARY.md and cycle-over-cycle diff tracking in REVIEW.md provide audit trails for agent decisions
- **Human-readable state**: All planning files are markdown — no binary state
- **Hybrid selection**: Workflow recommends agents, user confirms or overrides

## Wave Handoff Conventions

Agent-to-agent communication follows structured conventions defined in `.planning/config/agent-communication.yaml`.

- **Forward-only communication**: Information flows from earlier waves to later waves via SUMMARY.md handoff context sections. Agents in later waves consume prior outputs; no backward communication exists.
- **No runtime messaging**: Agents communicate exclusively through artifacts (SUMMARY.md, plan frontmatter). There is no inter-agent messaging channel at runtime. This ensures auditability and works across all CLI adapters.
- **Handoff context injection**: The wave executor extracts Handoff Context sections from dependency SUMMARY.md files and injects them into Wave 2+ agent prompts. Each handoff includes key outputs, decisions made, open questions, and conventions established.
- **Escalation inheritance**: Unresolved escalations (pending or deferred) from prior waves are passed forward to downstream agents via handoff context, preventing agents from unknowingly depending on unmade decisions.
- **Agent discovery**: Every agent receives execution context at spawn -- wave position, parallel peers, prior wave agents, and their own authority domains from the authority matrix.
- **SUMMARY.md export standard**: Every plan must produce a SUMMARY.md with required sections: Completed Tasks, Files Modified, Handoff Context, and Verification Results. Missing sections trigger advisory warnings but never block execution (graceful degradation).

