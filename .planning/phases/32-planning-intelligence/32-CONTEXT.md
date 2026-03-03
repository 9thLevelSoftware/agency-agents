# Phase 32: Planning Intelligence — Context

## Phase Goal
`/legion:plan` produces competing architecture proposals and can optionally run a spec pipeline before coding.

## Requirements Covered
- **PLN-01**: `/legion:plan` spawns 2-3 agents with different architectural philosophies (minimal, clean, pragmatic) to present competing approaches before the user selects one
- **PLN-02**: A spec creation pipeline (gather → research → write → critique → assess complexity) available as a skill that can run before coding phases

## What Already Exists (from prior phases)

### Phase 29 (Progressive Disclosure) — Complete
- All 17 SKILL.md files have YAML frontmatter with `name`, `triggers`, `token_cost`, and `summary`
- `workflow-common` documents the Skill Loading Protocol with metadata schema, loading stages, command-to-skill mapping
- New skills must follow this frontmatter pattern

### Phase 31 (Behavioral Guardrails) — Complete
- `testing-reality-checker` and `engineering-senior-developer` have anti-rationalization tables
- `CLAUDE.md` has an authority matrix (autonomous vs. human-approval decisions)

### Relevant Existing Files
- `commands/plan.md` — 11-step planning process, skill injection via `<execution_context>`
- `skills/phase-decomposer/SKILL.md` — 8 sections covering analysis, decomposition, agent recommendation, user confirmation, plan file template, context generation, edge cases
- `skills/workflow-common/SKILL.md` — Command-to-Skill Mapping table (needs spec-pipeline entry)
- `skills/plan-critique/SKILL.md` — Pre-mortem and assumption hunting (existing pattern for spawning read-only agents)
- `skills/agent-registry/SKILL.md` — Agent matching and scoring algorithm

## Key Design Decisions

### Competing Architectures (PLN-01)
- **Insertion point:** New step 3.5 between "READ PHASE DETAILS" and "DECOMPOSE INTO PLANS" in plan command
- **Why 3.5, not earlier:** Agents need phase context (step 3 output) to generate meaningful proposals
- **Why not a separate command:** Architecture selection is integral to planning; separating it creates friction
- **Agent philosophies:** Minimal (least changes, lowest risk), Clean Architecture (proper patterns, future-proof), Pragmatic (balanced trade-offs) — adapted from Feature-dev's pattern
- **User choice:** Select one, request hybrid, or skip (for simple phases)

### Spec Pipeline (PLN-02)
- **Standalone skill:** Can be invoked independently before `/legion:build`, not coupled to plan command
- **Optional offering:** Plan command offers spec pipeline after architecture selection for complex phases
- **5 stages adapted from Auto-Claude:** Gather requirements, Research domain, Write spec document, Critique spec, Assess complexity
- **Output:** `.planning/specs/{NN}-{phase-slug}-spec.md` — consumed by plan command and build agents (NN = zero-padded phase number)

## Plan Structure
- **Plan 32-01 (Wave 1)**: Create Spec Pipeline Skill — new `skills/spec-pipeline/SKILL.md` with 5 stages and workflow-common registration
- **Plan 32-02 (Wave 2, depends on 32-01)**: Add Competing Architecture Proposals — new section in phase-decomposer, new steps 3.5-3.6 in plan command with architecture selection and optional spec pipeline offering
