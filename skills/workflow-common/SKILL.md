---
name: legion:workflow-common
description: Shared constants, paths, and patterns for all /legion: commands
triggers: [common, shared, paths, conventions, state, config]
token_cost: medium
summary: "Shared constants, paths, and patterns for all /legion: commands. Defines state file locations, personality injection pattern, wave execution pattern, cost profiles, and all workflow conventions."
---

# Legion Workflow Common

Shared constants, paths, and patterns used across all /legion: commands.

## State File Locations

| File | Path | Purpose |
|------|------|---------|
| PROJECT.md | `.planning/PROJECT.md` | Project vision, requirements, constraints, decisions |
| ROADMAP.md | `.planning/ROADMAP.md` | Phase breakdown with agent assignments and progress |
| STATE.md | `.planning/STATE.md` | Current position, recent activity, next action |
| Templates | `skills/questioning-flow/templates/` | Schema files for generating PROJECT/ROADMAP/STATE |
| Phase Plans | `.planning/phases/{NN-name}/` | Plan and summary files per phase |
| Compacted Summaries | `.planning/phases/{NN-name}/{NN}-COMPACTED.md` | AI-compacted phase summaries preserving decisions and outcomes while trimming verbose details (via memory-manager skill) |
| PORTFOLIO.md | `~/.claude/legion/portfolio.md` | Global portfolio registry — all Legion projects |
| Milestone Summaries | `.planning/milestones/MILESTONE-{N}.md` | Completion summaries with metrics per milestone |
| Milestone Archive | `.planning/archive/milestone-{N}/` | Archived phase directories from completed milestones |
| Memory Outcomes | `.planning/memory/OUTCOMES.md` | Agent performance and task outcome records for cross-session learning |
| Memory Patterns | `.planning/memory/PATTERNS.md` | Successful patterns with reuse criteria — distilled from agent outcomes (via memory-manager skill) |
| Memory Errors | `.planning/memory/ERRORS.md` | Error signatures mapped to known fixes — troubleshooting reference for agents (via memory-manager skill) |
| Memory Preferences | `.planning/memory/PREFERENCES.md` | User decision signals (accepted/rejected/modified proposals) for preference-informed agent routing (via memory-manager skill) |
| Custom Agents | `agents/{agent-id}.md` | User-created agent personality files (via `/legion:agent`) |
| Codebase Map | `.planning/CODEBASE.md` | Structured map of existing codebase architecture, patterns, and risks (via codebase-mapper skill) |
| Campaign Documents | `.planning/campaigns/{campaign-slug}.md` | Structured campaign plans with objectives, messaging, audience, channels, calendar, and agent assignments (via marketing-workflows skill) |
| Design Documents | `.planning/designs/{project-slug}-system.md` | Structured design system specifications with tokens, components, accessibility, and agent assignments (via design-workflows skill) |
| Spec Documents | `.planning/specs/{NN}-{phase-slug}-spec.md` | Structured specification documents produced by spec-pipeline skill before coding phases |

## Agent Personality Paths

All 51 agent personalities live under `agents/` in a flat directory (no division subdirectories):

```
agents/{agent-id}.md
```

Agent IDs include their division as a prefix (e.g., `engineering-senior-developer`, `testing-reality-checker`). Exceptions: Spatial Computing agents use descriptive prefixes (xr-, visionos-, macos-, terminal-) and Specialized agents use domain prefixes (agents-, data-, lsp-) for shorter, more readable filenames.

**Divisions**: Engineering, Design, Marketing, Product, Project Management, Testing, Support, Spatial Computing, Specialized, Custom

Custom agents created via `/legion:agent` follow the same path pattern.

To load an agent personality: `Read agents/{agent-id}.md`

## Personality Injection Pattern

To spawn an agent with its full personality inside a Claude Code Team:

1. Read the agent's .md file to get the full personality content
2. Construct a prompt that includes the personality as system instructions, plus a **Reporting Results** block instructing the agent to send its structured summary via SendMessage:
   ```
   Agent tool call:
     subagent_type: "general-purpose"
     prompt: "{personality_content}\n\n---\n\nTask: {task_description}\n\n## Reporting Results\n..."
     model: "{cost_profile_model}"
     team_name: "{phase_team_name}"
   ```
3. The agent operates in full character with access to its specialist knowledge
4. When finished, the agent sends its structured summary to the coordinator via SendMessage (not via Agent return value). This keeps the coordinator's context window small.

## Plan File Convention

```
.planning/phases/{NN-name}/{NN}-{PP}-PLAN.md    — Executable plan
.planning/phases/{NN-name}/{NN}-{PP}-SUMMARY.md  — Completion summary
.planning/phases/{NN-name}/{NN}-CONTEXT.md        — Phase research/context
```

Naming: `{NN}` = zero-padded phase number, `{PP}` = zero-padded plan number.
Example: `.planning/phases/01-plugin-foundation/01-02-PLAN.md`

## Wave Execution Pattern

Plans declare a `wave` number in frontmatter. Execution uses a Claude Code Team per phase:

1. **TeamCreate** — create one Team for the entire phase (e.g., `"phase-{NN}-execution"`)
2. **TaskCreate** — create one Task per plan, setting `addBlockedBy` for cross-wave dependencies
3. Group plans by wave number
4. For each wave, **spawn agents** via Agent tool with `team_name` set to the phase Team
5. Agents execute their plans and **report results via SendMessage** to the coordinator
6. Coordinator collects SendMessage summaries — wait for all agents in the wave before advancing
7. Repeat steps 4-6 for subsequent waves
8. **Shutdown + TeamDelete** — send `shutdown_request` to all agents, then TeamDelete to clean up

Within a wave, plans have no dependencies on each other. Between waves, later waves may depend on earlier wave outputs. Agents send lightweight structured summaries (~200 tokens) via SendMessage instead of returning full execution traces, preserving the coordinator's context window.

## Agent Team Conventions

### Agent Teams Requirement

All agent spawning in Legion MUST use Claude Code Agent Teams. Bare subagents (Agent tool without `team_name`) are prohibited. This ensures coordination, result collection, and lifecycle management work correctly across all commands.

**Prerequisite**: The `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` setting must be enabled. If Teams are unavailable, commands MUST stop and instruct the user to enable the flag — they MUST NOT silently fall back to bare subagents.

### Teams Lifecycle

Every command that spawns agents follows this lifecycle:

| Step | Tool | When | Purpose |
|------|------|------|---------|
| 1 | `TeamCreate` | Once per phase/review | Create a named team (e.g., `"phase-04-execution"`, `"phase-05-review"`) |
| 2 | `TaskCreate` | Once per plan/finding | Create shared tasks with `addBlockedBy` for cross-wave dependencies |
| 3 | `Agent` with `team_name` | Per agent spawn | Spawn agent as a teammate — MUST include `team_name` parameter |
| 4 | `SendMessage` | Agent completion | Agent reports structured summary to coordinator (~200 tokens vs ~2000+ from Agent return) |
| 5 | `SendMessage(type: "shutdown_request")` | Phase/review end | Graceful shutdown of all spawned agents |
| 6 | `TeamDelete` | After all agents shut down | Clean up Team configuration |

### Key Constraints

- **One Team per phase** (`/legion:build`) or **one Team per review lifecycle** (`/legion:review`). Not per wave, not per cycle.
- **No nested teams** — teammates cannot spawn their own Teams. Only the lead session (the command itself) creates and manages the Team.
- **team_name is mandatory** — every `Agent` tool call MUST include the `team_name` parameter. This is enforced in `wave-executor` Section 1 and `review-loop` Section 1.
- **Agents report via SendMessage, not Agent return** — keeps the coordinator's context window small by receiving lightweight summaries instead of full execution traces.
- **Shutdown runs on ALL paths** — success, failure, and escalation. Never leave orphaned agents or stale Team configurations.
- **Recommended team size**: 3-5 teammates per Team, 5-6 tasks per teammate. Larger teams increase coordination overhead.

### Command-to-Team Mapping

| Command | Team Name Pattern | Agent Count | Team Lead |
|---------|------------------|-------------|-----------|
| `/legion:build` | `phase-{NN}-execution` | 1 per plan in wave (parallel within wave) | Build command orchestrator |
| `/legion:review` | `phase-{NN}-review` | 2-4 reviewers + fix agents per cycle | Review command orchestrator |

### Implementation References

The Agent Teams lifecycle is fully implemented in:
- `wave-executor` SKILL.md — Section 1 (enforcement block), Section 4 (wave execution with Teams)
- `review-loop` SKILL.md — Section 1 (enforcement block), Section 3 (review spawning with Teams)
- `build` command — Step 4 (Team setup + wave execution)
- `review` command — Step 4 (Team setup + review cycle)

## State Update Pattern

After any significant operation:

1. Read current `.planning/STATE.md`
2. Update relevant fields:
   - `Phase`: current phase number and status
   - `Status`: what just happened
   - `Last Activity`: timestamp and description
   - `Progress`: recalculate completion percentage
   - `Next Action`: what the user should do next
3. Write updated STATE.md

## Cost Profile Convention

| Role | Model | When |
|------|-------|------|
| Planning/Decisions | Opus | /legion:start, /legion:plan, architecture choices |
| Execution/Implementation | Sonnet | /legion:build, agent task execution |
| Lightweight Checks | Haiku | /legion:status, quick validations, simple queries |

Set via `model` parameter on Agent tool calls.

## Skill Loading Protocol

Legion skills use progressive disclosure: lightweight metadata at startup, full content on activation.

### Metadata Schema

Every SKILL.md file has YAML frontmatter with these fields:

| Field | Type | Purpose |
|-------|------|---------|
| `name` | string | Skill identifier (`legion:{skill-name}`) |
| `description` | string | One-line description for catalog display |
| `triggers` | string[] | 3-6 keywords that indicate this skill should be loaded |
| `token_cost` | enum | `low` (<300 lines), `medium` (300-500), `high` (500+) |
| `summary` | string | ≤100 token summary of purpose and activation conditions |

### Loading Stages

**Stage 1: Metadata Only (orchestrator startup)**
When a `/legion:` command initializes, load ONLY the frontmatter block from each skill. This provides:
- Skill names and summaries for routing decisions (~100 tokens per skill, ~1,700 total)
- Trigger keywords for matching user intent to relevant skills
- Token cost estimates for context budget planning

**Stage 2: Full Injection (skill activation)**
When a command determines it needs a specific skill, load the ENTIRE SKILL.md content. This happens when:
- A command's workflow references the skill (e.g., `/legion:build` activates `wave-executor`)
- Trigger keywords in user input match a skill's triggers array
- An agent is spawned that requires the skill's instructions

### Implementation Rules

1. **Never load all skills at once** — only the orchestrating command's direct dependencies
2. **Metadata is free** — reading frontmatter blocks adds negligible context (~100 tokens each)
3. **Full load is expensive** — a high-cost skill adds 500+ lines to context; only load when needed
4. **Commands know their skills** — each command declares which skills it needs (e.g., `/legion:build` always loads `wave-executor` and `execution-tracker`)
5. **Trigger matching is secondary** — commands have fixed skill dependencies; trigger matching is for edge cases and `/legion:quick` routing

### Command-to-Skill Mapping

| Command | Always Loads | Conditionally Loads |
|---------|-------------|-------------------|
| `/legion:start` | questioning-flow, workflow-common | codebase-mapper (brownfield) |
| `/legion:plan` | phase-decomposer, agent-registry, workflow-common | marketing-workflows, design-workflows, plan-critique, spec-pipeline |
| `/legion:build` | wave-executor, execution-tracker, workflow-common | github-sync, spec-pipeline |
| `/legion:review` | review-loop, review-panel, workflow-common | — |
| `/legion:status` | execution-tracker, workflow-common | memory-manager |
| `/legion:quick` | agent-registry, workflow-common | {matched by triggers} |
| `/legion:portfolio` | portfolio-manager, workflow-common | — |
| `/legion:milestone` | milestone-tracker, workflow-common | — |
| `/legion:agent` | agent-creator, agent-registry, workflow-common | — |
| `/legion:advise` | agent-registry, workflow-common | {matched by triggers} |

### Context Budget Guideline

Before loading a skill, check the estimated token impact:
- `low` skills: load freely (negligible context impact)
- `medium` skills: load when clearly needed (moderate context, ~300-500 lines)
- `high` skills: load only when the command requires them (heavy context, 500+ lines)

If multiple high-cost skills are needed in a single command, consider whether the orchestrator can delegate to sub-agents (each with their own context window) rather than loading all skills into the main context.

## Error Handling Pattern

When an agent fails during execution:

1. Capture the error output
2. Update STATE.md: mark the failed plan/task with error details
3. Do NOT retry automatically — present the error to the user
4. Suggest: re-run the specific plan, or run /legion:review for diagnosis
5. If multiple agents fail in a wave, stop the wave and report all failures

## Auto-Remediation Pattern

When an agent encounters an error during task execution, it classifies the error before reporting failure. Environment issues are auto-fixed; blockers require human judgment.

### Error Classification

| Type | Indicators | Examples | Action |
|------|-----------|----------|--------|
| BLOCKER | Involves business logic, API design, architectural decisions, or test logic failures | Missing API endpoint, schema mismatch, failing test assertions, dependency conflict between packages | Stop. Report to coordinator with full error context. Do not attempt auto-fix. |
| ENVIRONMENT | Involves missing dependencies, wrong versions, missing directories, or configuration | `MODULE_NOT_FOUND`, missing `node_modules/`, wrong Node version, missing `.env` file, port already in use, missing build directory | Auto-remediate: generate fix, execute, retry. |

### Remediation Flow

```
1. Agent encounters error during task execution
2. Classify: BLOCKER or ENVIRONMENT?
   - BLOCKER indicators: error references business logic, API contracts,
     architecture patterns, or test assertions
   - ENVIRONMENT indicators: error references missing packages, wrong versions,
     missing files/directories, or system configuration
3. If BLOCKER:
   - Stop the current task
   - Include in completion summary: "BLOCKER: {error description}"
   - Continue to next independent task in the plan (if any)
4. If ENVIRONMENT:
   a. Log: "ENVIRONMENT ISSUE: {error}. Attempting remediation..."
   b. Generate remediation command based on error type:
      - MODULE_NOT_FOUND / missing package → npm install (or pip install, etc.)
      - Missing directory → mkdir -p {path}
      - Missing config file → check if template exists, copy it
      - Wrong version → check package.json/requirements.txt for declared version
   c. Execute the remediation command
   d. If remediation succeeds: retry the original step that failed
   e. If remediation fails OR retry also fails: escalate to BLOCKER
   f. Max 1 remediation attempt per unique error — no retry loops
5. Report all remediation actions in the task completion summary:
   "Auto-remediated: {error} → {fix applied} → {retry result}"
```

### Remediation Scope (Authority Matrix)

Auto-remediation is limited to the autonomous scope defined in the CLAUDE.md authority matrix:

| Allowed (autonomous) | Not Allowed (requires human approval) |
|----------------------|--------------------------------------|
| Install dependencies declared in package.json, requirements.txt, Cargo.toml, go.mod | Add NEW dependencies not in any manifest |
| Create directories the codebase expects to exist | Create new architectural directories |
| Run standard build setup (npm install, pip install -r requirements.txt) | Modify build configuration files |
| Set environment variables documented in the project | Change CI/CD or deployment configuration |
| Clear caches or temp files that are safe to regenerate | Delete source files or user data |

If an environment fix would require an action outside autonomous scope, escalate to BLOCKER with the message: "ENVIRONMENT issue requires human approval: {description of needed fix}."

## Output Redirection Convention

Commands known to produce verbose output waste context tokens when captured inline. Agents redirect them to temp files and only surface errors.

### Verbose Commands (always redirect)

| Command Pattern | Why Redirect |
|----------------|-------------|
| `npm install`, `yarn install`, `pnpm install` | Package download/resolution logs are verbose and rarely informative |
| `pip install`, `pip install -r requirements.txt` | Same — dependency resolution output |
| `cargo build`, `cargo test` (initial compile only) | Compilation progress bars and dependency resolution |
| `go build`, `go mod tidy`, `go mod download` | Module download output |
| `mvn install`, `mvn package`, `gradle build` | Java/Kotlin build system output |
| `dotnet build`, `dotnet restore` | .NET build/restore output |
| `docker build`, `docker pull`, `docker compose up` | Layer download and build progress |
| `bundle install`, `gem install` | Ruby dependency installation |

### Never Redirect (informative output)

| Command Pattern | Why Keep Inline |
|----------------|----------------|
| `npm test`, `jest`, `pytest`, `cargo test` (results) | Test results are essential feedback — pass/fail, assertion messages |
| `eslint`, `prettier --check`, `ruff`, `clippy` | Linting output identifies specific issues to fix |
| `tsc --noEmit`, `mypy`, `pyright` | Type-check errors are actionable and concise |
| `git status`, `git diff`, `git log` | Version control state is always relevant |
| Custom scripts and application output | Unknown verbosity — keep visible |

### Redirection Pattern

```
# Redirect verbose command output to temp file
{command} > /tmp/legion-{command-slug}-$(date +%s).log 2>&1
exit_code=$?

if [ $exit_code -ne 0 ]; then
  echo "FAILED: {command} (exit code $exit_code)"
  echo "Last 20 lines of output:"
  tail -20 /tmp/legion-{command-slug}-*.log
else
  echo "OK: {command} completed successfully"
fi
```

### Rules

1. Redirect BOTH stdout and stderr to the temp file (`2>&1`)
2. Always check exit code immediately after the command
3. On success: report one-line confirmation, do NOT read or display the log
4. On failure: display the last 20 lines of the log for diagnosis
5. Never redirect interactive commands, test runners, or linting tools
6. Temp files are ephemeral — do not commit, track, or clean them up
7. If unsure whether a command is verbose: do NOT redirect (safe default is to keep output visible)

## Division Constants

```
DIVISIONS = [
  "Engineering",        # 7 agents — code, architecture, DevOps
  "Design",             # 6 agents — UI/UX, branding, visual
  "Marketing",          # 8 agents — content, social, growth
  "Product",            # 3 agents — sprints, feedback, trends
  "Project Management", # 5 agents — coordination, portfolio
  "Testing",            # 7 agents — QA, evidence, performance
  "Support",            # 6 agents — analytics, finance, legal
  "Spatial Computing",  # 6 agents — XR, VisionOS, Metal
  "Specialized"         # 3 agents — orchestration, data, LSP
]

TOTAL_AGENTS = 51
```

## Portfolio Conventions

### Global Portfolio Path
The portfolio registry lives at `~/.claude/legion/portfolio.md` — outside any project directory. This file is shared across all Legion projects on the machine.

### Portfolio Registration
Projects are auto-registered in the portfolio when `/legion:start` completes. Registration stores the project name, absolute path, registration date, and one-line description.

### Cross-Project State Reading
Portfolio commands read each registered project's `.planning/STATE.md` and `.planning/ROADMAP.md` at request time. There is no background sync. If a project directory is missing, it's marked Stale.

### Portfolio Command Convention
| Command | Purpose | Cost Tier |
|---------|---------|-----------|
| `/legion:portfolio` | Multi-project dashboard and dependency management | Haiku (dashboard), Opus (Studio Producer insights) |

## Milestone Conventions

### Milestone Definition
Milestones group consecutive phases in ROADMAP.md under a `## Milestones` section. Each milestone has a name, phase range, goal, and status. Milestones are defined interactively via `/legion:milestone` or during `/legion:start` for new projects.

### Milestone Lifecycle
```
Pending → In Progress → Complete → Archived
```
- **Pending**: No phases started
- **In Progress**: At least one phase started
- **Complete**: All phases in range are Complete in the Progress table
- **Archived**: Phase directories moved to `.planning/archive/milestone-{N}/`

### Milestone Paths
| Artifact | Path | When Created |
|----------|------|-------------|
| Milestone section | `.planning/ROADMAP.md ## Milestones` | During milestone definition |
| Milestone summary | `.planning/milestones/MILESTONE-{N}.md` | On milestone completion |
| Archive directory | `.planning/archive/milestone-{N}/{NN-name}/` | On milestone archiving |

### Milestone Command Convention
| Command | Purpose | Cost Tier |
|---------|---------|-----------|
| `/legion:milestone` | Milestone status, completion, archiving, and definition | Haiku (status), Sonnet (summary generation) |

## Memory Conventions

### Memory Purpose
Cross-session learning layer that tracks agent performance and task outcomes. All memory operations are explicit calls from workflows — no hooks, no background processes, no automatic triggers.

### Memory Lifecycle
```
Absent → Created (first store) → Growing (appending records) → Mature (200+ records, pruning suggested)
```
- **Absent**: No `.planning/memory/` directory. All workflows function identically.
- **Created**: First build or review outcome triggers `.planning/memory/OUTCOMES.md` creation.
- **Growing**: Records accumulate as phases execute and review.
- **Mature**: When record count exceeds 200, recall suggests pruning. Never auto-prunes.

### Memory Paths
| Artifact | Path | When Created |
|----------|------|-------------|
| Memory directory | `.planning/memory/` | On first store operation |
| Outcome log | `.planning/memory/OUTCOMES.md` | On first store operation |
| Pattern library | `.planning/memory/PATTERNS.md` | On first pattern store operation |
| Error fixes | `.planning/memory/ERRORS.md` | On first error store operation |
| Preference pairs | `.planning/memory/PREFERENCES.md` | On first preference store operation |
| Compacted summaries | `.planning/phases/{NN-name}/{NN}-COMPACTED.md` | After phase review passes (opt-in) |

### Memory Integration Points
| Workflow | Operation | When |
|----------|-----------|------|
| `/legion:build` | Store outcome | After each plan completes (success, partial, or failed) |
| `/legion:build` | Store error fix | When an agent resolves a non-trivial error during execution |
| `/legion:build` | Recall error fixes | Before agent starts task — check if known fixes exist for relevant error patterns |
| `/legion:build` | Store preference (manual edit) | When uncommitted changes to build-modified files are detected at review start |
| `/legion:review` | Store outcome | After review passes or escalates |
| `/legion:review` | Store pattern | When review passes on first cycle (clean approach worth capturing) |
| `/legion:review` | Store error fix | When review identifies and fixes a recurring issue |
| `/legion:review` | Store preference (verdict) | After review passes — positive signal for the review approach and agents |
| `/legion:review` | Store preference (override) | After user selects "Accept as-is" or "Fix manually" from escalation — corrective or negative signal |
| `/legion:plan` | Recall agent scores | During agent recommendation (phase-decomposer Section 4) |
| `/legion:plan` | Recall patterns | During phase decomposition — suggest proven approaches for similar task types |
| `/legion:plan` | Recall preferences | During agent recommendation — preference scores boost or penalize candidates |
| `/legion:status` | Recall session briefing | During dashboard display |

### Graceful Degradation Rule
All memory integration follows this pattern:
1. Check if the relevant memory file exists (`.planning/memory/OUTCOMES.md`, `PATTERNS.md`, `ERRORS.md`, or `PREFERENCES.md`)
2. If yes: use memory data to enhance the operation
3. If no: skip silently, proceed with default behavior
4. Never error, never block, never require memory for workflow completion

### Branch Awareness
Memory files live in `.planning/memory/` inside the git repository. They branch and merge naturally with git operations.
- All memory records include a `Branch` field recording the git branch at write time
- Recall operations accept an optional `branch_filter` parameter (default: "all")
- When branches merge, memory files merge via git — append-only tables merge cleanly
- Existing records without a Branch field are treated as belonging to the default branch

### Semantic Compaction
Completed phases can be compacted into condensed summaries that preserve reasoning while trimming verbose details.
- Compacted summaries are written to `.planning/phases/{NN-name}/{NN}-COMPACTED.md`
- Original SUMMARY files are never deleted or overwritten
- Compaction is always opt-in — never automatic
- When recalling phase context, prefer COMPACTED.md over individual SUMMARY files if available

### Claude Code Memory Integration

Claude Code has its own built-in memory system at `~/.claude/projects/{project}/memory/MEMORY.md`. This is platform-level, auto-managed memory that stores user preferences, project patterns, and cross-session context.

**Relationship to Legion Memory:**
- **Claude Code memory** = platform-level, auto-managed, general context (user preferences, project conventions)
- **Legion memory** = project-local, explicit, agent orchestration-specific, git-tracked (outcomes, patterns, errors, preferences)
- These systems are **complementary, not competing** — they serve different audiences and purposes

**Integration rules:**
1. Legion MAY read from Claude Code memory when available (user preferences may inform agent selection)
2. Legion MUST NOT write to Claude Code memory (different audience: platform vs agent routing)
3. Legion MUST NOT duplicate its data into Claude Code memory
4. If Claude Code memory is absent: skip silently (same degradation pattern as all Legion memory)

See `memory-manager` SKILL.md Section 14 for the full alignment documentation.

## GitHub Conventions

### GitHub Purpose
Optional integration that connects Legion Workflows to GitHub — phases link to issues, completed work produces PRs, and milestones sync. All operations use the `gh` CLI and are entirely opt-in.

### GitHub Prerequisites
```
1. gh CLI installed (checked via `which gh`)
2. gh authenticated (checked via `gh auth status`)
3. Git remote pointing to GitHub (checked via `git remote get-url origin`)
All three must pass for GitHub operations to be available.
```

### GitHub Lifecycle
```
Unavailable → Available (prerequisites pass) → Active (first issue created) → Synced (milestones linked)
```
- **Unavailable**: No gh CLI, no auth, or no remote. All GitHub operations skip silently.
- **Available**: Prerequisites pass. Operations can be performed.
- **Active**: At least one GitHub issue has been created. STATE.md has a ## GitHub section.
- **Synced**: ROADMAP milestones have corresponding GitHub milestones.

### GitHub Paths
| Artifact | Location | When Created |
|----------|----------|-------------|
| GitHub metadata | `.planning/STATE.md ## GitHub` section | On first issue or PR creation |
| Legion label | GitHub repo labels | On first issue creation |
| Phase issues | GitHub issues with "legion" label | During `/legion:plan` |
| Phase PRs | GitHub pull requests | During `/legion:build` |
| GitHub milestones | GitHub API milestones | During `/legion:plan` (if ROADMAP milestones defined) |

### GitHub Integration Points
| Workflow | Operation | When |
|----------|-----------|------|
| `/legion:plan` | Create phase issue, sync milestone | After plan files generated |
| `/legion:build` | Update issue checklist, create PR | After plans execute and after phase completes |
| `/legion:status` | Read-back live GitHub status | During dashboard display |
| `/legion:review` | Close phase issue | After review passes |
| `/legion:milestone` | Close GitHub milestone | After milestone completion |

### Graceful Degradation Rule
All GitHub integration follows this pattern:
1. Run github-sync Section 1 prerequisites check
2. If github_available is true: perform the operation
3. If github_available is false: skip silently, proceed with default behavior
4. Never error, never block, never require GitHub for workflow completion

## Brownfield Conventions

### Brownfield Purpose
Pre-planning codebase analysis that maps existing architecture, detects patterns and frameworks, and flags risk areas before agents begin work. All operations are opt-in and degrade gracefully.

### Brownfield Lifecycle
```
Absent → Analyzed (CODEBASE.md created) → Stale (>30 days old, re-analysis recommended)
```
- **Absent**: No `.planning/CODEBASE.md`. All workflows function identically (greenfield mode).
- **Analyzed**: Codebase mapped during `/legion:start`. CODEBASE.md available for plan enrichment.
- **Stale**: CODEBASE.md is >30 days old. `/legion:plan` warns but does not block or auto-refresh.

### Brownfield Paths
| Artifact | Path | When Created |
|----------|------|-------------|
| Codebase map | `.planning/CODEBASE.md` | After brownfield analysis during /legion:start (user opts in) |

### Brownfield Integration Points
| Workflow | Operation | When |
|----------|-----------|------|
| `/legion:start` | Detect + analyze | After pre-flight, before questioning (if existing codebase found) |
| `/legion:plan` | Inject risk areas into context | During phase decomposition (if CODEBASE.md exists) |

### Graceful Degradation Rule
All brownfield integration follows this pattern:
1. Check if `.planning/CODEBASE.md` exists
2. If yes: inject relevant sections into planning context
3. If no: skip silently -- greenfield project, proceed normally
4. Never error, never block, never require brownfield analysis for workflow completion

## Marketing Workflow Conventions

### Marketing Purpose
Structured campaign workflows for marketing-focused phases -- campaign planning, content calendar generation, and cross-channel coordination. Marketing agents (8 specialists) are orchestrated through domain-specific wave patterns rather than generic engineering decomposition.

### Marketing Lifecycle
```
Unplanned --> Planning (campaign document created) --> Active (content in production) --> Measuring --> Complete
```
- **Unplanned**: Phase not yet planned. Standard decomposition applies.
- **Planning**: Marketing phase detected during `/legion:plan`. Campaign document generated at `.planning/campaigns/{slug}.md`.
- **Active**: Campaign content being produced and distributed via `/legion:build`.
- **Measuring**: Campaign ended, performance data collected.
- **Complete**: Learnings captured, outcomes recorded to memory (if memory layer active).

### Marketing Paths
| Artifact | Path | When Created |
|----------|------|-------------|
| Campaign documents | `.planning/campaigns/{campaign-slug}.md` | During /legion:plan when marketing phase detected |

### Marketing Wave Pattern
| Wave | Role | Agents | Produces |
|------|------|--------|----------|
| Wave 1 | Strategy & Planning | Social Media Strategist, Growth Hacker | Campaign brief, metrics, audience analysis |
| Wave 2 | Content Creation | Content Creator + Channel Specialists | Content assets, adapted messaging |
| Wave 3 (optional) | Distribution | All channel agents | Published content, engagement |

### Marketing Integration Points
| Workflow | Operation | When |
|----------|-----------|------|
| `/legion:plan` | Detect marketing phase, campaign questioning, generate campaign doc | During phase decomposition (if MKT-* requirements or marketing keywords) |
| `/legion:build` | Marketing wave execution, core messaging handoff | During plan execution (if campaign document exists) |
| `/legion:review` | Cross-channel consistency check | During quality review (if campaign document exists) |

### Graceful Degradation Rule
All marketing workflow integration follows this pattern:
1. Check if phase is marketing (MKT-* requirements or keyword detection)
2. If yes: use marketing-specific decomposition, wave patterns, and campaign templates
3. If no: standard decomposition -- no impact whatsoever
4. Never error, never block, never require marketing workflows for non-marketing phases

## Design Workflow Conventions

### Design Purpose
Structured design workflows for design-focused phases -- design system creation, UX research planning and synthesis, and three-lens design review (brand, accessibility, usability). Design agents (6 specialists) are orchestrated through domain-specific wave patterns rather than generic engineering decomposition.

### Design Lifecycle
```
Unplanned --> Research (user insights, brand audit) --> Designing (tokens, components, visual language) --> Review (3-lens) --> Complete
```
- **Unplanned**: Phase not yet planned. Standard decomposition applies.
- **Research**: UX research and brand audit underway (Wave 1). Design document generated at `.planning/designs/{slug}-system.md`.
- **Designing**: Design system creation, component specs, visual assets (Wave 2).
- **Review**: Three-lens review cycle -- brand, accessibility, usability (Wave 3 or `/legion:review`).
- **Complete**: Design system documented, handoff ready, outcomes recorded to memory (if memory layer active).

### Design Paths
| Artifact | Path | When Created |
|----------|------|-------------|
| Design system documents | `.planning/designs/{project-slug}-system.md` | During /legion:plan when design phase detected |
| UX research reports | `.planning/designs/{research-slug}-research.md` | During /legion:plan when research is in scope |

### Design Wave Pattern
| Wave | Role | Agents | Produces |
|------|------|--------|----------|
| Wave 1 | Research & Foundation | UX Researcher, Brand Guardian | Research brief, brand foundation, design principles |
| Wave 2 | Design System & Creation | UI Designer, UX Architect, Visual Storyteller | Design system document, component specs, visual language |
| Wave 3 (optional) | Polish & Validation | Whimsy Injector, Review agents | Enhanced specs, audit reports |

### Design Integration Points
| Workflow | Operation | When |
|----------|-----------|------|
| `/legion:plan` | Detect design phase, design questioning, generate design docs | During phase decomposition (if DSN-* requirements or design keywords) |
| `/legion:build` | Design wave execution, research-to-design handoff | During plan execution (if design documents exist) |
| `/legion:review` | Three-lens review (brand + accessibility + usability) | During quality review (if design documents exist) |

### Graceful Degradation Rule
All design workflow integration follows this pattern:
1. Check if phase is design (DSN-* requirements or keyword detection)
2. If yes: use design-specific decomposition, wave patterns, and three-lens review
3. If no: standard decomposition -- no impact whatsoever
4. Never error, never block, never require design workflows for non-design phases
