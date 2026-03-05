---
phase: 36-polymath-integration
plan: "01"
name: "Create Polymath Agent and /legion:explore Command"
subsystem: "Agent System / Command System"
tags: [agent-personality, command, polymath, exploration, pre-flight-alignment]
dependency_graph:
  requires: []
  provides: [POLY-01, POLY-05]
  affects: [agents/, commands/, skills/agent-registry/]
tech_stack:
  added: []
  patterns: [Format A agent structure, structured choices, research-first workflow]
key_files:
  created:
    - agents/polymath.md
    - commands/explore.md
  modified:
    - skills/agent-registry/CATALOG.md
decisions: []
metrics:
  duration: "25 minutes"
  completed_date: "2026-03-05"
  tasks: 3
  files: 3
---

# Phase 36 Plan 01: Create Polymath Agent and /legion:explore Command — Summary

**One-liner**: Created the Polymath pre-flight alignment specialist agent and `/legion:explore` command entry point to crystallize raw ideas before formal planning.

---

## Overview

This plan established the Polymath Integration phase by creating the foundational components for pre-flight project alignment. Polymath is a specialized agent that guides users through structured exploration to transform vague ideas into clear, actionable project concepts before committing to formal planning with `/legion:start`.

The implementation introduces a critical new workflow phase: **crystallization before planning**. By forcing structured choices (no open-ended questions) and conducting research first, Polymath prevents the common failure mode of planning based on unclear or incomplete understanding.

---

## What Was Built

### 1. Polymath Agent Personality (`agents/polymath.md`)

A complete 256-line agent personality following Format A canonical structure:

**Structure**:
- **Frontmatter**: name, description, color=purple, division=Specialized
- **🧠 Identity & Memory**: Defines crystallization specialist role with tracking for knowns, unknowns, research, and decisions
- **🎯 Core Mission**: Research First + Structured Exploration + Decision Support
- **🚨 Critical Rules**: NO OPEN-ENDED QUESTIONS (Rule 1), Research Before Questions (Rule 2), No Scope Creep (Rule 3), Acknowledge Gaps (Rule 4), Time-Boxed (Rule 5)
- **🔄 Workflow Process**: 5-phase workflow (Research → Opening → Clarification → Gap Detection → Decision)
- **🛠️ Deliverables**: Crystallized Summary, Knowns List, Unknowns List, Decision Recommendation
- **💭 Communication Style**: Concise (3-5 lines max), direct, structured, showing work
- **🎯 Success Metrics**: Clear decision, zero open-ended questions, research-informed choices

**Key Guardrails**:
- Every interaction uses arrow keys + Enter selection
- Maximum 5-7 exchanges before forcing decision
- Research conducted silently before first user interaction
- "Pick ONE" interventions for scope creep

### 2. /legion:explore Command (`commands/explore.md`)

A complete 287-line command documentation with 7-step orchestration process:

**Steps**:
1. **Pre-flight Check**: Verify existing project state, confirm exploration intent
2. **Opening Prompt**: Capture raw concept (the only open input)
3. **Spawn Polymath Agent**: Provide context, tools, and strict structured-choice instruction
4. **Polymath Conducts Exploration**: Research-first, choice-driven clarification (5-7 exchanges)
5. **Decision Point**: Proceed / Explore more / Park
6. **Handle Decision Outcome**: Transition to `/legion:start`, continue exploration, or save and exit
7. **Completion**: Display summary with knowns, unknowns, and next action

**Decision Matrix**: Documents edge cases (vague concepts, existing code discovery, scope expansion, user exit, agent violations)

**Anti-patterns**: Explicitly prohibits skipping opening prompt, indefinite exploration, open-ended questions, automatic planning transition

### 3. Agent Registry Update (`skills/agent-registry/CATALOG.md`)

Added Polymath to Specialized Division:
- Updated division count: 3 → 4 agents
- Added row: polymath | `agents/polymath.md` | Pre-flight alignment specialist... | exploration, clarification, research-first, structured-questions, gap-detection

---

## Verification Results

All success criteria verified:

| Criterion | Status |
|-----------|--------|
| `agents/polymath.md` exists with valid frontmatter | ✓ 256 lines, complete Format A structure |
| Contains "NO OPEN-ENDED QUESTIONS" guardrail | ✓ Present (2 occurrences) |
| Contains "arrow keys" structured interaction | ✓ Present (3 occurrences) |
| `commands/explore.md` exists with valid frontmatter | ✓ 287 lines, 7 documented steps |
| References polymath.md | ✓ Present (2 occurrences) |
| Documents 5-7 exchange time-box | ✓ Present (3 occurrences) |
| Documents decision outcomes | ✓ Proceed / Explore more / Park |
| CATALOG.md contains polymath entry | ✓ Registered in Specialized Division |

---

## Deviations from Plan

**None** — plan executed exactly as written.

All requirements from PLAN.md were implemented:
- ✓ Format A structure with emoji headings and "Your" pronouns
- ✓ Minimum 100 lines (exceeded with 256 lines)
- ✓ Critical guardrail: NO OPEN-ENDED QUESTIONS
- ✓ Structured interaction: arrow keys + Enter
- ✓ 5-phase workflow documented
- ✓ 7-step process in explore command
- ✓ CATALOG.md updated with appropriate task-type tags

---

## Technical Notes

### Agent Spawning Pattern
The command uses a structured spawn instruction that explicitly passes:
1. Raw concept from user
2. Tool access (Read, Write, Edit, Bash, Grep, Glob)
3. Critical rules reminder
4. Time limit enforcement

This ensures Polymath operates within the intended constraints even when spawned by other commands.

### Structured Choice Enforcement
Both the agent personality and command documentation repeatedly emphasize the structured choice pattern. This is the core innovation of Polymath: by constraining interactions to pre-defined options, users make faster decisions and achieve clarity sooner.

### Integration with Existing Commands
`/legion:explore` is designed to seamlessly transition to `/legion:start`:
- Pre-populates the "What are you building?" question
- Preserves crystallized summary through the handoff
- Allows users to skip exploration if they already have clarity

---

## Commits

| Hash | Message | Files |
|------|---------|-------|
| `f40059e` | feat(36-01): create Polymath agent personality | agents/polymath.md |
| `2311f4e` | feat(36-01): create /legion:explore command entry point | commands/explore.md |
| `2f42c80` | feat(36-01): register Polymath agent in agent catalog | skills/agent-registry/CATALOG.md |

---

## Self-Check: PASSED

All artifacts verified:
- ✓ agents/polymath.md exists (256 lines)
- ✓ commands/explore.md exists (287 lines)
- ✓ skills/agent-registry/CATALOG.md updated
- ✓ All commits exist in git log
- ✓ All verification criteria satisfied

---

## Next Steps

Polymath Integration Phase 36 continues with:
- Plan 02: Integration testing with `/legion:start` handoff
- Plan 03: Documentation and user guide updates

The `/legion:explore` command is now available for users to enter pre-flight alignment mode before formal planning.
