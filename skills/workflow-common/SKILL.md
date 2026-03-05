---
name: legion:workflow-common
description: Compatibility shim for workflow-common; delegates always-load behavior to workflow-common-core and optional extensions
triggers: [common, shared, paths, conventions, state, config]
token_cost: medium
summary: "Compatibility shim. New command execution should load workflow-common-core first, then optional workflow-common extensions as needed."
---

# Legion Workflow Common

Compatibility shim for legacy references. New commands should always load `workflow-common-core` and only load optional `workflow-common-*` extensions when needed.

## CLI Detection and Adapter Loading

Legion supports multiple AI CLIs through an adapter layer. Before any command executes, the active CLI must be detected and its adapter loaded.

### Detection Protocol

```
Step 0: Check for override file
  - Read .legion-cli in the project root (if it exists)
  - If it contains a valid CLI identifier (e.g., "claude-code", "codex-cli"):
    → Use that adapter directly, skip Steps 1-3
    → Log: "CLI override: {cli} (from .legion-cli)"

Step 1: Tool probe (primary detection)
  - For each adapter in adapters/, check the detection.primary field:
    - Claude Code: TeamCreate tool is available
    - Codex CLI: CODEX_VERSION environment variable is set
    - Cursor: CURSOR_VERSION environment variable is set
    - Copilot CLI: COPILOT_CLI_VERSION environment variable is set
    - Gemini CLI: GEMINI_CLI_VERSION environment variable is set
    - Amazon Q: Q_CLI_VERSION environment variable is set
    - Windsurf: WINDSURF_VERSION environment variable is set
    - OpenCode: OPENCODE_CONFIG_DIR environment variable is set
    - Aider: AIDER_VERSION environment variable is set
  - If exactly one primary matches: use that adapter
  - If multiple match: use the first match in the order above (Claude Code wins ties)

Step 2: Secondary detection (fallback)
  - If no primary matched, check each adapter's detection.secondary field
  - These are filesystem markers (e.g., ~/.claude/ directory, ~/.codex/AGENTS.md)
  - Use the first match

Step 3: Default
  - If no detection matched: default to Claude Code adapter
  - Log: "No CLI detected — defaulting to Claude Code adapter"

Step 4: After detection
  - Read the full adapter file: adapters/{cli}.md
  - Parse YAML frontmatter for capabilities and tool mappings
  - Log: "Active adapter: {cli_display_name} (parallel: {parallel_execution}, messaging: {structured_messaging})"
```

### Adapter Reference Convention

Throughout skills and commands, adapter fields are referenced with dot notation:
- `adapter.spawn_agent_personality` — how to spawn an agent with personality
- `adapter.model_execution` — which model to use for execution
- `adapter.global_config_dir` — where global config lives (e.g., `~/.claude/legion/`)
- `adapter.commit_signature` — Co-Authored-By line for commits
- `adapter.ask_user` — how to present choices to the user

These resolve to the active adapter's Tool Mappings table at runtime.

### User Interaction Convention

All commands use `adapter.ask_user` for user prompts. This maps to:
- Claude Code: `AskUserQuestion` tool (structured questions with labeled options)
- Codex CLI / Gemini CLI / Aider: plain numbered lists printed to stdout
- Cursor: notification-based prompts
- Other CLIs: per adapter's Interaction Protocol section

Commands reference `adapter.ask_user` in their process body. The `allowed-tools` frontmatter retains the Claude Code tool name (`AskUserQuestion`) for backward compatibility.

## State File Locations

| File | Path | Purpose |
|------|------|---------|
| PROJECT.md | `.planning/PROJECT.md` | Project vision, requirements, constraints, decisions |
| ROADMAP.md | `.planning/ROADMAP.md` | Phase breakdown with agent assignments and progress |
| STATE.md | `.planning/STATE.md` | Current position, recent activity, next action |
| Templates | `skills/questioning-flow/templates/` | Schema files for generating PROJECT/ROADMAP/STATE |
| Phase Plans | `.planning/phases/{NN-name}/` | Plan and summary files per phase |
| Compacted Summaries | `.planning/phases/{NN-name}/{NN}-COMPACTED.md` | AI-compacted phase summaries preserving decisions and outcomes while trimming verbose details (via memory-manager skill) |
| PORTFOLIO.md | `{adapter.global_config_dir}/portfolio.md` | Global portfolio registry — all Legion projects |
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


## Settings Resolution Protocol

Legion commands MAY be configured via `settings.json` in the repository root. This file is optional.

```
Step 1: Try to read ./settings.json from current working directory.
Step 2: If the file is missing or invalid JSON, continue with built-in defaults.
Step 3: Resolve these runtime settings once per command invocation:
  - planning.max_tasks_per_plan (default: 3)
  - review.max_cycles (default: 3)
  - execution.agent_personality_verbosity (default: full)
  - integrations.github (default: prompt)
  - memory.enabled (default: true)
  - memory.project_scoped_only (default: true)
Step 4: Log resolved values in command notes before execution.
```

When settings are present, command skills must honor them instead of hardcoded values.
## Agent Personality Paths

All 52 built-in agent personalities live under `agents/` in the plugin root (not necessarily the user's CWD). The path must be resolved before use:

```
{AGENTS_DIR}/{agent-id}.md
```

Agent IDs include their division as a prefix (e.g., `engineering-senior-developer`, `testing-reality-checker`). Exceptions: Spatial Computing agents use descriptive prefixes (xr-, visionos-, macos-, terminal-) and Specialized agents use domain prefixes (agents-, data-, lsp-) for shorter, more readable filenames.

**Divisions**: Engineering, Design, Marketing, Product, Project Management, Testing, Support, Spatial Computing, Specialized, Custom

Custom agents created via `/legion:agent` follow the same path pattern.

To load an agent personality: `Read {AGENTS_DIR}/{agent-id}.md`

### Agent Path Resolution Protocol

Before loading ANY agent personality file, resolve `AGENTS_DIR` once per command invocation.

Legion agents are installed via the npm installer (`npx @9thlevelsoftware/legion`). Resolution checks these locations in order:

```
Step 1: Try Claude Code's native agents directory
  - Run: Bash  ls ~/.claude/agents/agents-orchestrator.md 2>/dev/null && echo "FOUND"
  - If output contains "FOUND":
    - Run: Bash  cd ~/.claude/agents && pwd
    - Store the absolute path as AGENTS_DIR
    → Log: "AGENTS_DIR: {AGENTS_DIR} (installed)"
    → Done.

Step 2: Try local (CWD) path — for plugin development
  - Attempt to Read agents/agents-orchestrator.md from the current working directory
  - If the file exists and is readable:
    → AGENTS_DIR = "agents"   (relative — local dev mode)
    → Log: "AGENTS_DIR: agents (local)"
    → Done.

Step 3: Fallback — read npm install manifest
  - Try Claude Code manifest first:
    Run: Bash  cat ~/.claude/legion/manifest.json 2>/dev/null
  - If not found, try generic manifest:
    Run: Bash  cat ~/.legion/manifest.json 2>/dev/null
  - If the file exists and contains valid JSON:
    - Extract the "paths.agents" value
    - Set AGENTS_DIR = {paths.agents}
    - Verify by attempting to Read {AGENTS_DIR}/agents-orchestrator.md
    - If readable:
      → Log: "AGENTS_DIR: {AGENTS_DIR} (npm manifest)"
      → Done.

Step 4: If all steps failed
  - Error: "Could not locate agent personality files. Install Legion:
    npx @9thlevelsoftware/legion --claude --global"
  - Stop the command — do not proceed without agent access.
```

**Rules:**
- Run this protocol ONCE at the start of each command, before any personality file is read
- Store the resolved `AGENTS_DIR` value and reuse it for all subsequent agent file reads in the same command
- All personality reads use `{AGENTS_DIR}/{agent-id}.md` — never bare `agents/{agent-id}.md`
- Use Bash (not Glob) for `~` paths — the Glob tool does not expand tilde

## Personality Injection Pattern

To spawn an agent with its full personality via the active adapter:

1. Read the agent's .md file to get the full personality content
2. Construct a prompt that includes the personality as system instructions, plus a **Reporting Results** block instructing the agent to report its structured summary per `adapter.collect_results`:
   ```
   adapter.spawn_agent_personality:
     prompt: "{personality_content}\n\n---\n\nTask: {task_description}\n\n## Reporting Results\n..."
     model: adapter.model_execution
     name: "{agent-id}-{NN}-{PP}"
     + additional parameters per adapter (e.g., team_name on Claude Code)
   ```
3. The agent operates in full character with access to its specialist knowledge
4. When finished, the agent reports its structured summary per the adapter's result collection method. On CLIs without agent spawning, personality is a prompt prefix in the current session and dropped after the plan completes.

## Plan File Convention

```
.planning/phases/{NN-name}/{NN}-{PP}-PLAN.md    — Executable plan
.planning/phases/{NN-name}/{NN}-{PP}-SUMMARY.md  — Completion summary
.planning/phases/{NN-name}/{NN}-CONTEXT.md        — Phase research/context
```

Naming: `{NN}` = zero-padded phase number, `{PP}` = zero-padded plan number.
Example: `.planning/phases/01-plugin-foundation/01-02-PLAN.md`

## Wave Execution Pattern

Plans declare a `wave` number in frontmatter. Execution follows the active adapter's protocol:

**If adapter.parallel_execution is true AND adapter.structured_messaging is true** (e.g., Claude Code):
1. Initialize coordination via `adapter.coordinate_parallel` (e.g., TeamCreate + TaskCreate on Claude Code)
2. Group plans by wave number
3. For each wave, spawn agents simultaneously via `adapter.spawn_agent_personality`
4. Agents report results via `adapter.collect_results` (e.g., SendMessage on Claude Code)
5. Coordinator collects summaries — wait for all agents in the wave before advancing
6. Repeat steps 3-5 for subsequent waves
7. Cleanup via `adapter.shutdown_agents` + `adapter.cleanup_coordination`

**If adapter.parallel_execution is true but adapter.structured_messaging is false** (e.g., Cursor):
1. Write a WAVE-CHECKLIST.md tracking file to `.planning/phases/{NN}/`
2. Spawn agents in parallel; each writes results to `{NN}-{PP}-RESULT.md`
3. Coordinator reads result files to determine wave completion

**If adapter.parallel_execution is false** (e.g., Codex CLI, Gemini CLI, Aider):
1. Write a WAVE-CHECKLIST.md tracking file to `.planning/phases/{NN}/`
2. Execute plans sequentially within each wave
3. Each plan writes its result before the next begins

Within a wave, plans have no dependencies on each other. Between waves, later waves may depend on earlier wave outputs. Agents send lightweight structured summaries (~200 tokens) instead of returning full execution traces, preserving the coordinator's context window.

## Agent Coordination Conventions

### Coordination Model

Agent spawning and coordination follow the active CLI adapter's protocol. The adapter defines how agents are created, how they communicate, and how coordination infrastructure is managed.

**If adapter.structured_messaging is true** (e.g., Claude Code):
- Full coordination lifecycle: `adapter.coordinate_parallel` → spawn agents → `adapter.collect_results` → `adapter.shutdown_agents` → `adapter.cleanup_coordination`
- Agents report via structured messaging (e.g., SendMessage on Claude Code)
- One coordination context per phase (e.g., one Team on Claude Code) or per review lifecycle

**If adapter.structured_messaging is false** (e.g., Codex CLI, Cursor, Aider):
- File-based coordination: WAVE-CHECKLIST.md tracking file
- Agents write results to `{NN}-{PP}-RESULT.md` files
- Coordinator reads result files to determine completion

### Key Constraints

- **One coordination context per phase** (`/legion:build`) or **per review lifecycle** (`/legion:review`). Not per wave, not per cycle.
- **No nested coordination** — spawned agents cannot create their own coordination contexts. Only the lead session (the command itself) manages coordination.
- **Agent spawning uses adapter protocol** — every agent spawn uses `adapter.spawn_agent_personality` or `adapter.spawn_agent_autonomous`. The adapter handles CLI-specific parameters.
- **Results collected per adapter** — agents report via `adapter.collect_results`, keeping the coordinator's context window small (~200 token summaries).
- **Cleanup runs on ALL paths** — success, failure, and escalation. Never leave orphaned agents or stale coordination state.
- **Recommended team size**: 3-5 agents per coordination context, 5-6 tasks per agent. Larger groups increase coordination overhead.

### Command-to-Coordination Mapping

| Command | Coordination Name Pattern | Agent Count | Coordinator |
|---------|--------------------------|-------------|-------------|
| `/legion:build` | `phase-{NN}-execution` | 1 per plan in wave (parallel if supported) | Build command orchestrator |
| `/legion:review` | `phase-{NN}-review` | 2-4 reviewers + fix agents per cycle | Review command orchestrator |

### Implementation References

The coordination lifecycle is fully implemented in:
- `wave-executor` SKILL.md — Section 1 (adapter enforcement block), Section 4 (wave execution)
- `review-loop` SKILL.md — Section 1 (adapter enforcement block), Section 3 (review spawning)
- `build` command — Step 4 (coordination setup + wave execution)
- `review` command — Step 4 (coordination setup + review cycle)

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

| Role | Adapter Field | When |
|------|---------------|------|
| Planning/Decisions | `adapter.model_planning` | /legion:start, /legion:plan, architecture choices |
| Execution/Implementation | `adapter.model_execution` | /legion:build, agent task execution |
| Lightweight Checks | `adapter.model_check` | /legion:status, quick validations, simple queries |

Set via the adapter's model fields. Each CLI maps these to its own model names (e.g., Claude Code: opus/sonnet/haiku; Codex CLI: o3/codex/o3-mini).

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

> The canonical command-to-skill mapping is in workflow-common-core/SKILL.md.

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

TOTAL_AGENTS = 52
```

## Portfolio Conventions

### Global Portfolio Path
The portfolio registry lives at `{adapter.global_config_dir}/portfolio.md` — outside any project directory. This file is shared across all Legion projects on the machine. The exact path depends on the active CLI adapter (e.g., `~/.claude/legion/` for Claude Code, `~/.legion/` for Codex CLI).

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

### CLI Platform Memory Integration

Some CLI platforms have their own built-in memory systems (e.g., Claude Code at `~/.claude/projects/{project}/memory/MEMORY.md`). These are platform-level, auto-managed memory stores for user preferences, project patterns, and cross-session context.

**Relationship to Legion Memory:**
- **CLI platform memory** = platform-level, auto-managed, general context (user preferences, project conventions)
- **Legion memory** = project-local, explicit, agent orchestration-specific, git-tracked (outcomes, patterns, errors, preferences)
- These systems are **complementary, not competing** — they serve different audiences and purposes

**Integration rules:**
1. Legion MAY read from platform memory when available (user preferences may inform agent selection)
2. Legion MUST NOT write to platform memory (different audience: platform vs agent routing)
3. Legion MUST NOT duplicate its data into platform memory
4. If platform memory is absent: skip silently (same degradation pattern as all Legion memory)

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







