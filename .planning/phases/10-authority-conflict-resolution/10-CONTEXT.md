# Phase 10 Context — Authority & Conflict Resolution

## Phase Goal

Add escalation automation protocol for out-of-scope decisions and agent-to-agent communication conventions for parallel execution handoffs.

## Requirements

- **AUTH-06**: Escalation automation protocol for out-of-scope decisions
- **AUTH-07**: Agent-to-agent communication conventions for handoffs

## Success Criteria

- Escalation protocol documented: when/how agents escalate out-of-scope decisions
- Agent-to-agent communication conventions defined for wave handoffs
- Authority matrix updated with escalation triggers
- Tests validate escalation protocol format

## Existing Assets

### Core Files to Extend

| File | Current State | Phase 10 Changes |
|------|--------------|------------------|
| `skills/wave-executor/SKILL.md` | Dispatches agents per wave, collects results, writes SUMMARY.md | Add escalation detection/routing, handoff context injection for Wave 2+ |
| `skills/authority-enforcer/SKILL.md` | Boundary validation, prompt injection, finding filtering, control mode integration | Add escalation format instructions to prompt injection, escalation triggers |
| `.planning/config/authority-matrix.yaml` | 53-agent domain ownership, conflict resolution rules | Add escalation trigger definitions, orchestrator communication domain |
| `agents/agents-orchestrator.md` | Pipeline management, agent coordination, workflow automation | Add communication routing responsibilities, escalation facilitation role |
| `skills/review-loop/SKILL.md` | Review cycles with escalation after max_cycles (Section 8) | Update escalation to use structured format |
| `CLAUDE.md` | Escalation Protocol section (4 steps: Stop/Document/Continue/Never rationalize) | Update with structured escalation format and handoff conventions |

### Reusable Patterns

- **Authority Matrix** (authority-matrix.yaml): Domain ownership model — reuse for escalation routing (who owns the decision domain?)
- **Control Modes** (control-modes.yaml): Mode-based enforcement flags — extend with escalation behavior per mode
- **Wave Execution** (wave-executor Section 3-5): Personality injection + result collection — extend with escalation detection and handoff context
- **Review Escalation** (review-loop Section 8): Existing escalation after max_cycles — standardize format

### Current Escalation State (Gaps)

1. **No structured format** — agents document escalations ad-hoc in text output
2. **No automated detection** — wave-executor doesn't parse for escalation signals
3. **No routing logic** — all escalations go to human, no coordinator routing
4. **No escalation registry** — no central log of escalation decisions and outcomes
5. **No handoff protocol** — Wave 2 reads SUMMARY.md but no semantic message format
6. **No agent discovery** — agents don't know what other agents are active or their domains

## Decisions

- **Architecture proposals**: Skipped — 2 requirements, primarily markdown/skill modifications
- **Spec pipeline**: Skipped — requirements well-defined from ROADMAP
- **Wave structure**: 2 waves — Wave 1 establishes escalation protocol (foundation), Wave 2 builds communication conventions (depends on escalation format)
- **Agent assignments**: project-management-project-shepherd (10-01), engineering-backend-architect (10-02)
- **Scope boundary**: Protocols are conventions documented in skills/config files — no runtime code changes. Legion enforces through prompt injection, not code execution.

## Plan Structure

| Plan | Wave | Requirement | Focus |
|------|------|-------------|-------|
| 10-01 | 1 | AUTH-06 | Escalation automation protocol |
| 10-02 | 2 | AUTH-07 | Agent-to-agent communication conventions |

Wave 2 depends on 10-01 (escalation format is referenced by communication conventions).

---
*Generated: 2026-03-07*
