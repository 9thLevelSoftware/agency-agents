# Board of Directors & Cross-CLI Dispatch Design

**Date:** 2026-03-19
**Status:** Draft
**Scope:** Two unified features for Legion v7.0

---

## Overview

Two new capabilities for Legion, designed as a unified system:

1. **Board of Directors** — A governance escalation tier that assembles dynamic review panels from Legion's 53 agents, runs structured deliberation with weighted scoring, voting, and audit persistence. Separate from (and above) the existing `/legion:review` system.

2. **Cross-CLI Dispatch** — Infrastructure enabling Claude Code to route work to external CLIs (Gemini, Codex, and others) based on capability matching. Serves as plumbing for the Board, enhanced reviews, and existing Legion workflows.

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Feature relationship | Unified system | Board is cross-CLI-aware; dispatch is shared infrastructure |
| Board composition | Dynamic from existing 53 agents | No new director agents; agent-registry handles selection |
| Board vs. review | Separate escalation tier | Review stays for routine QA; Board for high-stakes governance |
| Board invocation | New `/legion:board` command | Explicit command with `meet` and `review` modes |
| CLI routing | Capability-based | CLIs declare capabilities; matcher routes by task type |
| Host CLI | Claude Code only | Only runtime with Agent tool, parallel execution, structured messaging |
| Result flow | File-based handoff | Reliable, auditable, aligns with existing file-based patterns |
| Permissions | Respects `control_mode` | External CLIs inherit current control mode restrictions |
| Architecture | Hybrid Dispatch + Adapter | Dispatch skill reads capability metadata from adapter frontmatter |

---

## 1. CLI Dispatch Layer

### Purpose

A new skill (`skills/cli-dispatch/`) providing cross-CLI orchestration infrastructure. Any Legion skill can use it to route work to external CLIs based on capability matching.

### Components

#### 1.1 CLI Registry (via Adapter Frontmatter)

External CLIs declare dispatch capabilities in their adapter files. Only adapters with `dispatch.available: true` are dispatch targets.

**Adapter frontmatter addition** (example for `adapters/gemini-cli.md`):

```yaml
dispatch:
  available: true
  capabilities: [web_search, ui_design, ux_research, large_analysis, code_review]
  invoke_command: "gemini"
  invoke_flags: ["--sandbox"]
  prompt_delivery: stdin_pipe        # file_path | stdin_pipe | content_flag
  prompt_flag: null                 # not needed for stdin_pipe
  result_mode: file
  result_path: ".planning/dispatch/{task-id}-RESULT.md"
  result_instruction: "Write your complete output to {result_path} using the format specified below."
  max_concurrent: 3
  timeout_ms: 300000
  detection_command: "gemini --version"
  prerequisites:
    - "Gemini CLI settings.json must have {\"experimental\": {\"enableAgents\": true}}"
```

**Example for `adapters/codex-cli.md`:**

```yaml
dispatch:
  available: true
  capabilities: [code_implementation, testing, refactoring, bug_fixing, code_review]
  invoke_command: "codex"
  invoke_flags: ["--approval-mode", "full-auto", "--quiet"]
  prompt_delivery: content_flag
  prompt_flag: "-p"
  result_mode: file
  result_path: ".planning/dispatch/{task-id}-RESULT.md"
  result_instruction: "Write your complete output to {result_path} using the format specified below."
  max_concurrent: 1
  timeout_ms: 600000
  detection_command: "codex --version"
  prerequisites: []
```

#### Dispatch Frontmatter Field Reference

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `available` | Yes | boolean | Whether this CLI can be dispatched to |
| `capabilities` | Yes | string[] | Canonical capabilities (see Capability Vocabulary below) |
| `invoke_command` | Yes | string | CLI binary name |
| `invoke_flags` | Yes | string[] | Default flags for non-interactive execution |
| `prompt_delivery` | Yes | enum | How the prompt reaches the CLI: `file_path` (pass file path for CLI to read), `stdin_pipe` (pipe content via stdin), `content_flag` (expand content into flag value) |
| `prompt_flag` | Conditional | string | Required when `prompt_delivery` is `file_path` or `content_flag`. The flag that accepts the prompt (e.g., `-p`, `--prompt`) |
| `result_mode` | Yes | enum | `file` (CLI writes to result_path — preferred) |
| `result_path` | Yes | string | Path template for result files. `{task-id}` is replaced at runtime |
| `result_instruction` | Yes | string | Injected into prompt to tell CLI where/how to write results |
| `max_concurrent` | Yes | integer | Max parallel dispatches to this CLI |
| `timeout_ms` | Yes | integer | Per-invocation timeout in milliseconds |
| `detection_command` | Yes | string | Command to check CLI availability |
| `prerequisites` | No | string[] | Human-readable setup requirements checked at first dispatch |

#### Capability Vocabulary

Controlled vocabulary for `capabilities` to ensure consistent matching:

| Capability | Description |
|-----------|-------------|
| `code_implementation` | Writing new code, implementing features |
| `code_review` | Reviewing existing code for quality/bugs |
| `testing` | Writing and running tests |
| `refactoring` | Restructuring existing code |
| `bug_fixing` | Diagnosing and fixing bugs |
| `ui_design` | UI component design and implementation |
| `ux_research` | UX analysis, usability evaluation |
| `web_search` | Real-time web research |
| `large_analysis` | Analyzing large codebases or documents |
| `security_audit` | Security vulnerability analysis |
| `performance_analysis` | Performance profiling and optimization |
| `documentation` | Writing technical documentation |

New capabilities may be added to this list as new dispatch targets are onboarded.

#### 1.2 Capability Matcher

Given a task with type hints (e.g., `task_type: "ui_review"`, `languages: ["typescript"]`, `frameworks: ["react"]`), the matcher scores available CLIs by capability overlap and returns the best fit.

**Matching priority:**

1. Exact capability match (task needs `ui_design`, CLI has `ui_design`)
2. Category match (task is in `Design` division, CLI has design-adjacent capabilities)
3. Fallback to Claude Code internal agent (if no external CLI matches or none available)

#### 1.3 Prompt Builder

Constructs the external CLI's prompt from:

- **Agent personality** — Full `.md` injection (same as internal agents)
- **Task description** — From the plan or board meeting topic
- **Result contract** — "Write your output to `{result_path}` in this format: ..."
- **Control mode permissions** — File paths allowed, files forbidden (from current `control_mode`)
- **Handoff context** — From prior waves (if applicable)

#### 1.4 Invocation Engine

Uses Claude Code's `Bash` tool to invoke the external CLI. The prompt is always written to a file first (never passed inline) to avoid shell argument length limits and ensure auditability.

**Invocation flow:**

1. Write prompt to `.planning/dispatch/{task-id}-PROMPT.md` (audit trail)
2. Build invocation command from adapter's `dispatch` frontmatter:
   - Read `invoke_command`, `invoke_flags`, `prompt_delivery`, and `prompt_flag`
   - Construct the command per delivery method (see table below)
3. Execute via Bash tool with `timeout` set to adapter's `timeout_ms`
4. Collect result

**Prompt delivery methods:**

| Method | Command Template | Example |
|--------|-----------------|---------|
| `file_path` | `{invoke_command} {invoke_flags} {prompt_flag} {prompt_path}` | `codex --approval-mode full-auto --quiet -p .planning/dispatch/abc-PROMPT.md` (CLI reads the file itself) |
| `stdin_pipe` | `cat {prompt_path} \| {invoke_command} {invoke_flags}` | `cat .planning/dispatch/abc-PROMPT.md \| gemini --sandbox` |
| `content_flag` | `{invoke_command} {invoke_flags} {prompt_flag} "$(cat {prompt_path})"` | `codex -p "$(cat .planning/dispatch/abc-PROMPT.md)"` (prompt text expanded into flag value) |

- **`file_path`**: The CLI receives the path to the prompt file and reads it internally. Preferred when the CLI supports file input — avoids shell argument limits entirely.
- **`stdin_pipe`**: The prompt file content is piped to the CLI via stdin. Best for CLIs with no file-input flag. No argument length limit.
- **`content_flag`**: The prompt file content is expanded into a flag value via `$(cat ...)`. Use only when the CLI requires an inline prompt flag and doesn't support file input. Subject to shell argument limits (~32K on bash).

**Note on shell limits:** The prompt file can be arbitrarily large (agent personality + task + context). By always writing to a file first and using `$(cat ...)` or stdin piping, we avoid the 8191-character Windows cmd.exe limit. Bash on Windows (MSYS2/Git Bash) supports arguments up to ~32K, but stdin piping has no practical limit.

**Prerequisite checking:** On first dispatch to a CLI in a session, the engine runs `detection_command` and checks any `prerequisites`. If detection fails, the dispatch falls back to an internal agent with a warning. Prerequisites are displayed to the user as setup instructions if not met.

#### 1.5 Result Collector

After CLI exits:

1. Check exit code (non-zero = failure)
2. Read result file at `result_path`
3. Validate result structure (has required sections)
4. Return result to calling skill

#### 1.6 Control Mode Interactions

External CLIs cannot programmatically enforce Legion's control modes — they rely on prompt-injected instructions. The dispatch layer adapts its behavior per mode:

| Control Mode | Dispatch Behavior |
|-------------|-------------------|
| `autonomous` | Full dispatch permitted. Prompt includes task scope but no file restrictions. |
| `guarded` (default) | Dispatch permitted. Prompt includes `files_modified` scope as guidance. External CLI may touch other files; results are reviewed by the calling skill. |
| `surgical` | Dispatch restricted to **read-only assessments only** (board assessments, code reviews). Implementation tasks must run as internal agents where file restriction can be enforced. If a task requiring file writes is matched to an external CLI, fallback to internal agent with a warning. |
| `advisory` | Dispatch permitted but external CLIs are instructed to produce recommendations only, not modify files. Result files are treated as advisory artifacts. |

#### 1.7 Error Recovery

| Failure | Recovery |
|---------|----------|
| CLI not installed | Detected at dispatch time via `detection_command`. Falls back to internal agent with warning. |
| Timeout | Kill process after `timeout_ms`. Report partial results if result file exists. |
| Non-zero exit | Capture stderr, report failure to calling skill. |
| No result file | Capture stdout from the completed process and write it to `result_path` as a fallback. If stdout is also empty, report failure. |
| Max retries exceeded | 1 retry per dispatch (configurable). After that, escalate to user. |

### Directory Structure

```
skills/cli-dispatch/
  SKILL.md                    — Dispatch skill definition

.planning/dispatch/           — Runtime dispatch artifacts (created at runtime)
  {task-id}-PROMPT.md         — Prompt sent to external CLI (audit trail)
  {task-id}-RESULT.md         — Result received from external CLI
```

---

## 2. Board of Directors

### Purpose

A governance escalation tier for high-stakes decisions. Assembles a dynamic panel of agents, collects independent assessments (optionally via external CLIs), runs deliberation rounds, votes, and produces an auditable decision.

### New Command: `/legion:board`

Two modes:

- **`/legion:board meet <topic>`** — Full 5-phase deliberation. For architecture decisions, phase completion gates, go/no-go calls, conflict resolution.
- **`/legion:board review`** — Quick parallel assessments only (Phase 1), no deliberation. For strategic governance checks (not routine code quality).

**Distinction from `/legion:review`:**

| | `/legion:review` | `/legion:board review` | `/legion:board meet` |
|---|---|---|---|
| **Purpose** | Routine code quality QA | Strategic governance checkpoint | Full deliberation for high-stakes decisions |
| **Agent selection basis** | Phase artifacts (files modified, languages) | Topic/proposal (strategic domain signals) | Topic/proposal (strategic domain signals) |
| **Output** | Findings (BLOCKER/WARNING/INFO) + fix cycles | Parallel assessments with scores + summary | Assessments + discussion + vote + resolution |
| **Persistence** | REVIEW.md in phase directory | `.planning/board/{date}-{topic}/` | `.planning/board/{date}-{topic}/` |
| **Fix cycle** | Yes (iterative, max 3) | No | No (conditions are forward-looking) |
| **Typical trigger** | After every build phase | Before major architecture changes | Go/no-go decisions, conflict resolution |

### Command File Structure: `commands/board.md`

```yaml
name: legion:board
description: Convene a board of directors for governance decisions
argument-hint: |
  /legion:board meet <topic>   — Full deliberation on a proposal
  /legion:board review         — Quick parallel assessments of current phase
allowed-tools:
  - Agent
  - Bash
  - Read
  - Write
  - Glob
  - Grep
  - AskUserQuestion
  - TaskCreate
  - TaskUpdate
  - TaskList
```

**Execution context** (skills loaded by this command):
- `workflow-common-core` (always)
- `agent-registry` (board composition)
- `board-of-directors` (deliberation protocol)
- `cli-dispatch` (external CLI routing)
- `workflow-common-memory` (if memory enabled)

### Model Tiers per Phase

| Phase | Model Tier | Rationale |
|-------|-----------|-----------|
| Phase 1 — Assessment | `model_execution` | Domain-specific evaluation, similar to build tasks |
| Phase 2 — Discussion | `model_planning` | Cross-perspective reasoning requires higher capability |
| Phase 3 — Vote | `model_check` | Lightweight synthesis of established positions |
| Phase 4 — Resolution | N/A (formula, not LLM) | Computed from votes |
| Phase 5 — Persistence | N/A (file writes) | No LLM needed |

### Dynamic Board Composition

No fixed director roles. The board is assembled per-meeting using the existing `agent-registry` skill:

1. Topic/proposal analyzed for domain signals (languages, frameworks, phase type, keywords)
2. Registry scores all 53 agents by metadata match (`review_strengths`, `languages`, `frameworks`, `artifact_types`)
3. Top 3-5 agents recommended as board members
4. User confirms or overrides (hybrid selection pattern)

**Example board for "Migrate from REST to GraphQL":**

| Agent | Evaluation Lens |
|-------|----------------|
| Backend Architect | API design, system architecture |
| Frontend Developer | Client consumption patterns |
| Security Engineer | API security surface |
| Performance Benchmarker | Performance implications |
| Senior Developer | Implementation feasibility |

Each board member evaluates through their own `review_strengths` lens.

### The 5-Phase Deliberation Protocol

#### Phase 1 — Independent Assessment (Parallel)

Each board member evaluates the proposal independently. **Dispatch-aware:**

- If a board member's task type matches an external CLI's capabilities (e.g., UX Architect → Gemini), the assessment is dispatched via cli-dispatch.
- Otherwise, the assessment runs as an internal Claude Code agent.
- All assessments are parallel (background agents + dispatch calls).
- **Timeout:** All assessments (internal and dispatched) are subject to `board.assessment_timeout_ms` (default: 300000ms / 5 minutes). If an assessment is not received within the timeout, the board proceeds with available assessments and notes the gap in MEETING.md. A board meeting requires at least 2 completed assessments to proceed to Phase 2.

**Assessment output format:**

```markdown
## Assessment: {Agent Name}
### Verdict: APPROVE | CONCERNS | REJECT
### Score: {1-10}
### Evaluation (by review_strengths):
- {strength_1}: {score}/10 — {analysis}
- {strength_2}: {score}/10 — {analysis}
### Red Flags: {auto-reject triggers, if any}
### Concerns: {bulleted list}
### Recommendations: {bulleted list}
### Questions for Other Board Members: {specific challenges}
```

#### Phase 2 — Discussion (2 Rounds)

Board members respond to each other's concerns and questions. Runs **internally** (Claude Code agents), informed by Phase 1 assessments. External CLI assessments are the authoritative input; discussion refines and challenges based on those findings.

**Why internal?** Dispatching discussion rounds externally would mean `rounds × board_members` additional CLI calls (10+ invocations). Phase 1 captures each CLI's genuine specialized perspective; discussion adds cross-pollination, which internal agents handle effectively when armed with the external assessments.

**Discussion message types:**

| Type | Meaning |
|------|---------|
| `CHALLENGE` | Disagrees with another member's assessment |
| `AGREE` | Endorses another member's position |
| `QUESTION` | Requests clarification |
| `CLARIFY` | Responds to a question |
| `SHIFT` | Changed own position based on discussion (influences Phase 3 vote) |

#### Phase 3 — Final Vote

Each board member casts a final vote, incorporating any position shifts from Phase 2. The vote is cast by the same agent persona using the complete Phase 1 assessment + Phase 2 discussion context.

**CONCERNS → Vote mapping:** Board members who assessed `CONCERNS` in Phase 1 and did not issue a `SHIFT` message during Phase 2 must explicitly choose `APPROVE` or `REJECT` in their final vote — no default is applied. The Phase 3 prompt reminds each member of their Phase 1 verdict and asks for a final binary decision.

```markdown
### Vote: {Agent Name}
- Verdict: APPROVE | REJECT
- Confidence: {0.0-1.0}
- Conditions: {requirements if APPROVE, e.g., "must add rate limiting"}
```

#### Phase 4 — Resolution

Resolution uses a general formula that works for any board size N (where 2 <= N <= `default_size`). Conditions are evaluated in order — first match wins:

| Condition | Resolution |
|-----------|------------|
| Approve votes >= ceil(2*N/3) | **APPROVED** |
| Approve votes > floor(N/2) | **APPROVED WITH CONDITIONS** (all stated conditions mandatory) |
| Approve votes = N/2 (even N only) | **ESCALATE** to user |
| Otherwise | **REJECTED** |

**Examples for common board sizes:**

| N=5 | N=4 | N=3 |
|-----|-----|-----|
| 4-1, 5-0 → APPROVED | 3-1, 4-0 → APPROVED | 3-0 → APPROVED |
| 3-2 → APPROVED W/ CONDITIONS | 2-2 → ESCALATE | 2-1 → APPROVED W/ CONDITIONS |
| 2-3 → REJECTED | 1-3, 0-4 → REJECTED | 1-2, 0-3 → REJECTED |
| 1-4, 0-5 → REJECTED | | |

**Under-population (fewer than `min_size` qualifying agents):**
If the agent-registry cannot find `board.min_size` (default 3) matching agents, the board command warns the user and offers two options: (a) proceed with a smaller board (absolute floor: 2, requires explicit user opt-in), or (b) let the user manually select additional agents to reach `min_size`. The formula above covers N=2 natively: ceil(2*2/3) = 2, so unanimous (2-0) = APPROVED, split (1-1) = ESCALATE via the even-N tie rule.

#### Phase 5 — Persistence

All artifacts saved to `.planning/board/`:

```
.planning/board/
  {YYYY-MM-DD}-{topic-slug}/
    MEETING.md              — Human-readable summary (verdict, conditions, key debate points)
    assessments/
      {agent-name}.md       — Each member's Phase 1 assessment
    discussion.md           — Phase 2 discussion transcript
    votes.md                — Phase 3 individual votes
    resolution.md           — Phase 4 binding decision
```

### Integration Points

- `/legion:review` stays as-is (routine reviews, fix cycles)
- `/legion:board` is the escalation path when review surfaces governance needs
- `/legion:status` shows recent board decisions and pending conditions
- `/legion:build` can reference board resolutions
- Board decisions feed into the memory system (`OUTCOMES.md`)

---

## 3. Enhanced Review System

### Purpose

Upgrade Legion's existing `review-panel` and `review-loop` skills with conductor-orchestrator's structured evaluation, anti-sycophancy rules, and multi-pass specialized evaluators.

### Enhancement 1: Multi-Pass Evaluators

New skill: `skills/review-evaluators/SKILL.md`

Instead of single-pass reviews per agent, evaluators run multiple focused passes. Each pass has a narrow, specific focus.

| Evaluator | Passes | Default Dispatch Target |
|-----------|--------|----------------------|
| **Code Quality** | Build integrity, Type safety, Code patterns, Error handling, Dead code, Test coverage | Codex |
| **UI/UX** | Design system adherence, Visual consistency, Layout, Responsive behavior, Component states, Accessibility (WCAG 2.1 AA), Usability | Gemini |
| **Integration** | API contracts, Auth flow, Data persistence, Error recovery, Environment config, E2E flow | Internal |
| **Business Logic** | Product rules, Feature correctness, Edge cases, State transitions, Data flow, User journey | Internal |

Evaluator type selected automatically based on phase type and files modified. Multi-type phases run multiple evaluators. Findings are deduplicated across passes before presentation.

**Multi-pass execution model:** Each evaluator runs as a **single agent invocation** with multiple evaluation criteria in its prompt (not separate invocations per pass). The "passes" are sequential sections within one agent's rubric. This keeps cost comparable to single-pass reviews while improving coverage depth. The agent personality includes the full pass list, and the result is structured with one section per pass. This matches the existing review-panel pattern of per-criterion evaluation within a single rubric.

### Enhancement 2: Anti-Sycophancy Rules

Injected into every review agent's prompt context via `review-panel` personality injection:

- Verify feedback is technically correct for THIS codebase before implementing
- Pushback is expected when: suggestion breaks functionality, reviewer lacks context, violates YAGNI, is technically incorrect, or conflicts with prior architectural decisions
- Do NOT mark nitpicks as BLOCKER
- Do NOT give vague feedback — every finding must include file:line, what is wrong, why it matters, and how to fix
- Do NOT avoid a clear verdict — every review ends with "Ready to merge? Yes / No / With fixes"
- Do NOT use performative agreement

This is a personality injection enhancement to `skills/review-panel/SKILL.md`, not a new file.

### Enhancement 3: Structured Review Request Format

When `/legion:review` is invoked, the review-loop auto-populates a structured request from SUMMARY.md files:

```markdown
## Review Request
- **Scope**: {commit range or file list}
- **Requirements**: {which REQ-* items this addresses}
- **Implementation summary**: {what was built and key decisions}
- **Known risks**: {areas the implementer is uncertain about}
- **Verification results**: {output of verification_commands from the plan}
```

### Enhancement 4: Coverage Thresholds

New settings in `settings.json` under `review`:

```json
{
  "review": {
    "evaluator_depth": "multi-pass",
    "coverage_thresholds": {
      "overall": 70,
      "business_logic": 90,
      "api_routes": 80
    }
  }
}
```

Coverage thresholds are advisory — they flag when coverage is below the threshold but don't block the review.

---

## 4. Integration & Data Flow

### End-to-End: Board Meeting with Cross-CLI Dispatch

```
1. /legion:board meet "Migrate auth to sessions"
2. Agent-registry selects 5 board members by topic relevance
3. User confirms board composition
4. Phase 1: Parallel Assessment (dispatch-aware)
   ├─ Backend Architect → internal Agent
   ├─ Security Engineer → internal Agent
   ├─ Frontend Developer → Codex dispatch
   ├─ UX Architect → Gemini dispatch
   └─ Senior Developer → internal Agent
5. Phase 2: Discussion (2 rounds, internal agents informed by Phase 1)
6. Phase 3: Vote (verdict + confidence + conditions)
7. Phase 4: Resolution (aggregated decision)
8. Phase 5: Persistence (.planning/board/{date}-{topic}/)
```

### End-to-End: Enhanced Review with Multi-Pass Evaluators

```
1. /legion:review
2. Review-loop reads SUMMARY.md, auto-constructs review request
3. Review-panel selects evaluators by phase type
4. Code Quality evaluator (6 passes) → Codex dispatch
5. UI/UX evaluator (7 passes) → Gemini dispatch
6. Findings deduplicated, anti-sycophancy enforced
7. Fix cycle if needed (existing review-loop behavior)
```

---

## 5. File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `skills/cli-dispatch/SKILL.md` | Dispatch layer skill definition |
| `skills/board-of-directors/SKILL.md` | Board skill (composition, deliberation, voting, resolution) |
| `skills/review-evaluators/SKILL.md` | Multi-pass evaluator definitions |
| `commands/board.md` | `/legion:board` command entry point |

### Modified Files

| File | Change |
|------|--------|
| `adapters/gemini-cli.md` | Add `dispatch:` frontmatter section |
| `adapters/codex-cli.md` | Add `dispatch:` frontmatter section |
| `adapters/copilot-cli.md` | Add `dispatch:` frontmatter section (optional) |
| `skills/review-panel/SKILL.md` | Add "Review Conduct" anti-sycophancy section |
| `skills/review-loop/SKILL.md` | Add structured review request auto-population |
| `commands/review.md` | Add `evaluator_depth` option |
| `commands/status.md` | Show recent board decisions and pending conditions |
| `settings.json` | Add `board`, `dispatch`, and enhanced `review` settings |
| `docs/settings.schema.json` | Add `board`, `dispatch` top-level schemas; extend `review` schema with `evaluator_depth` and `coverage_thresholds` |
| `CLAUDE.md` | Add `/legion:board` to command table; update agent count references to "built-in agents" |
| `CHANGELOG.md` | Version bump entry |

### Unchanged

- All 53 agent personality files
- Wave executor
- Phase decomposer, plan critique, codebase mapper
- Authority enforcer, escalation protocol
- Memory manager, milestone tracker, portfolio manager
- install.js

---

## 6. Settings Schema

```json
{
  "board": {
    "default_size": 5,
    "min_size": 3,
    "discussion_rounds": 2,
    "assessment_timeout_ms": 300000,
    "persist_artifacts": true
  },
  "dispatch": {
    "enabled": true,
    "fallback_to_internal": true,
    "timeout_ms": 300000,
    "max_retries": 1
  },
  "review": {
    "default_mode": "panel",
    "max_cycles": 3,
    "evaluator_depth": "multi-pass",
    "coverage_thresholds": {
      "overall": 70,
      "business_logic": 90,
      "api_routes": 80
    }
  }
}
```

**Note:** The current `docs/settings.schema.json` uses `"additionalProperties": false` at both the top level and within the `review` object. The schema file MUST be updated in lockstep with `settings.json` to add the `board` and `dispatch` top-level keys and the new `review` sub-keys (`evaluator_depth`, `coverage_thresholds`). Failure to update the schema will cause validation failures.

**Settings field reference:**

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `board.default_size` | integer | 5 | Default number of board members |
| `board.min_size` | integer | 3 | Minimum board members (2 if registry can't fill) |
| `board.discussion_rounds` | integer | 2 | Number of Phase 2 discussion rounds |
| `board.assessment_timeout_ms` | integer | 300000 | Per-assessment timeout (Phase 1) |
| `board.persist_artifacts` | boolean | true | Whether to save board artifacts to `.planning/board/` |
| `dispatch.enabled` | boolean | true | Whether cross-CLI dispatch is active |
| `dispatch.fallback_to_internal` | boolean | true | Fall back to internal agent if CLI unavailable |
| `dispatch.timeout_ms` | integer | 300000 | Default per-dispatch timeout (overridden by adapter) |
| `dispatch.max_retries` | integer | 1 | Retries per dispatch before escalating |
| `review.evaluator_depth` | enum | "multi-pass" | `"single"` or `"multi-pass"` evaluation mode |
| `review.coverage_thresholds` | object | see above | Advisory coverage thresholds (percentage) |

---

## 7. Scope Boundaries

### In Scope

- CLI dispatch layer (capability matching, invocation, result collection, error recovery)
- Board of Directors (dynamic composition, 5-phase deliberation, voting, persistence)
- Enhanced review system (multi-pass evaluators, anti-sycophancy, structured requests)
- Adapter frontmatter extensions for dispatch capabilities
- Settings schema additions
- `/legion:board` command

### Out of Scope

- Dispatch from non-Claude-Code CLIs (Claude Code is the only orchestrator)
- New agent personalities (existing built-in agents serve all roles)
- Changes to wave executor (dispatch is infrastructure below it)
- Real-time inter-agent messaging (file-based handoff only)
- Automated board triggers (board is manually invoked via `/legion:board`)
- Install.js changes (dispatch is a runtime feature)
- Authentication/credential management for external CLIs (assumes CLIs are already authenticated and configured)
- Dispatch to CLIs on remote machines (all dispatch is local)
- Persistent dispatch sessions (each dispatch is a one-shot invocation)
- Board decision enforcement (board decisions are auditable records, not automated enforcement mechanisms)

### Cleanup Policy

`.planning/dispatch/` files (PROMPT.md, RESULT.md) are ephemeral. After successful result collection, PROMPT and RESULT files are moved to `.planning/dispatch/archive/` with a timestamp prefix. The archive directory can be manually cleared or `.gitignore`'d. Board artifacts in `.planning/board/` are permanent audit records and are not auto-cleaned.
