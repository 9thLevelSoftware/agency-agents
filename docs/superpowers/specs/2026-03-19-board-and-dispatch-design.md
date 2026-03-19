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
  result_mode: file
  result_path: ".planning/dispatch/{task-id}-RESULT.md"
  max_concurrent: 3
  timeout_ms: 300000
  detection_command: "gemini --version"
```

**Example for `adapters/codex-cli.md`:**

```yaml
dispatch:
  available: true
  capabilities: [code_implementation, testing, refactoring, bug_fixing, code_review]
  invoke_command: "codex"
  invoke_flags: ["--approval-mode", "full-auto"]
  result_mode: file
  result_path: ".planning/dispatch/{task-id}-RESULT.md"
  result_instruction: "Write your complete output to {result_path}"
  max_concurrent: 1
  timeout_ms: 600000
  detection_command: "codex --version"
```

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

Uses Claude Code's `Bash` tool to invoke the external CLI.

**Invocation flow:**

1. Write prompt to `.planning/dispatch/{task-id}-PROMPT.md` (audit trail)
2. Invoke CLI:
   ```bash
   codex --approval-mode full-auto --quiet -p "$(cat .planning/dispatch/{task-id}-PROMPT.md)"
   ```
3. Wait for completion (with timeout)
4. Collect result

#### 1.5 Result Collector

After CLI exits:

1. Check exit code (non-zero = failure)
2. Read result file at `result_path`
3. Validate result structure (has required sections)
4. Return result to calling skill

#### 1.6 Error Recovery

| Failure | Recovery |
|---------|----------|
| CLI not installed | Detected at dispatch time via `detection_command`. Falls back to internal agent with warning. |
| Timeout | Kill process after `timeout_ms`. Report partial results if result file exists. |
| Non-zero exit | Capture stderr, report failure to calling skill. |
| No result file | Fall back to stdout capture (belt-and-suspenders). |
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
- **`/legion:board review`** — Quick parallel assessments only (Phase 1), no deliberation. For routine quality checkpoints during build.

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
| `SHIFT` | Changed own position based on discussion |

#### Phase 3 — Final Vote

Each board member casts a vote:

```markdown
### Vote: {Agent Name}
- Verdict: APPROVE | REJECT
- Confidence: {0.0-1.0}
- Conditions: {requirements if APPROVE, e.g., "must add rate limiting"}
```

#### Phase 4 — Resolution

| Vote Distribution | Resolution |
|-------------------|------------|
| 4-1 or 5-0 APPROVE | **APPROVED** |
| 3-2 APPROVE | **APPROVED WITH CONDITIONS** (all conditions mandatory) |
| 3-2 REJECT | **REJECTED** |
| 4-1 or 5-0 REJECT | **REJECTED** |
| Tie (if 4 or 3 members) | **ESCALATE** to user |

With 3-member boards, thresholds adjust: unanimous = APPROVED, 2-1 = APPROVED WITH CONDITIONS.

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
| `CLAUDE.md` | Add `/legion:board` to command table |
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
    "quick_review_threshold": 3,
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
- New agent personalities (existing 53 agents serve all roles)
- Changes to wave executor (dispatch is infrastructure below it)
- Real-time inter-agent messaging (file-based handoff only)
- Automated board triggers (board is manually invoked via `/legion:board`)
- Install.js changes (dispatch is a runtime feature)
