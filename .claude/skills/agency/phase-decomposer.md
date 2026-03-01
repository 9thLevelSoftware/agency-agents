---
name: agency:phase-decomposer
description: Decomposes roadmap phases into wave-structured plans with agent recommendations and plan file generation
---

# Phase Decomposer

Engine for `/agency:plan`. Takes a ROADMAP.md phase entry and transforms it into executable, wave-structured plan files with per-plan agent recommendations. The full flow: analyze phase, decompose into plans, recommend agents, present for confirmation, generate plan files.

---

## Section 1: Decomposition Principles

1. **Max 3 tasks per plan** — if a plan needs more work, split it into additional plans. Plans stay focused and reviewable.
2. **Wave-structured execution** — Wave 1 plans have no internal dependencies. Wave 2 plans depend on Wave 1 outputs. Parallel within waves, sequential between waves.
3. **Per-plan agent assignment** — different plans in the same phase may use different agents. A frontend plan gets a frontend agent; a testing plan gets a testing agent.
4. **Self-contained plans** — each plan must be executable with only its `<context>` references. An agent should never need to read a file not listed in context.
5. **Concrete verification** — every task has a `<verify>` step with bash commands. No "manually check" or "visually inspect" instructions. If you can not script the check, the task is too vague.
6. **Fewer plans over more** — 2 focused plans beats 4 thin ones. Combine related work when it fits within the 3-task limit. Only create additional plans when dependency ordering or agent specialization requires separation.

---

## Section 2: Phase Analysis

How to extract and analyze phase information before decomposition.

### Step-by-Step Extraction

```
Step 1: Read .planning/ROADMAP.md
Step 2: Find the Phase Details section for the target phase number
Step 3: Extract the following fields:
  - phase_name: the descriptive name (e.g., "Plugin Foundation")
  - phase_goal: the Goal field
  - phase_requirements: the Requirements field (list of requirement IDs)
  - success_criteria: the Success Criteria list
  - estimated_plans: the Plans count
Step 4: Read .planning/REQUIREMENTS.md
Step 5: Cross-reference: for each requirement ID in phase_requirements,
        get the full requirement description from REQUIREMENTS.md
Step 6: Read .planning/PROJECT.md for broader project context
        (value proposition, target users, constraints, architecture notes)
Step 7: Read .planning/STATE.md for current progress and any completed
        phases that this phase builds on
```

### What to Look For

| Source | Extract | Used For |
|--------|---------|----------|
| ROADMAP.md Phase Details | Goal, requirements, success criteria | Scope boundaries |
| ROADMAP.md Progress Table | Completed plans in prior phases | Dependency context |
| REQUIREMENTS.md | Full requirement descriptions | Task-level detail |
| PROJECT.md | Vision, constraints, architecture | Design decisions |
| STATE.md | Phase results, decisions, issues | Build-on context |

### Phase Slug Convention

Derive the phase directory slug from the phase name:
- Lowercase the name
- Replace spaces with hyphens
- Remove special characters
- Example: "Plugin Foundation" becomes `plugin-foundation`
- Full path: `.planning/phases/{NN}-{slug}/` (e.g., `.planning/phases/03-phase-planning/`)

---

## Section 3: Task Decomposition

How to break a phase's requirements into plans and tasks.

### Process

```
1. LIST all concrete deliverables implied by the phase requirements
   - Each requirement may produce 1-3 deliverables (files, features, configs)
   - Group deliverables by dependency: which ones need others to exist first?

2. IDENTIFY dependency layers
   - Layer 0: Deliverables with no dependencies (new files, foundations)
   - Layer 1: Deliverables that depend on Layer 0 outputs
   - Layer 2: Deliverables that depend on Layer 1 outputs
   - Rarely more than 3 layers needed

3. MAP layers to waves
   - Each dependency layer becomes a wave
   - Within a wave, work can happen in parallel (no internal dependencies)

4. GROUP deliverables into plans within each wave
   - Max 3 tasks per plan
   - Group by: same file being modified, same skill/pattern, same agent specialty
   - Name plans by their primary output: "Create {X} skill", "Update {Y} command"

5. VALIDATE plan structure
   - Every requirement from ROADMAP.md is covered by at least one task
   - No circular dependencies between waves
   - Each plan can be executed independently of other plans in the same wave
   - Total plan count matches or is close to ROADMAP.md estimate
```

### Grouping Heuristics

| Signal | Action |
|--------|--------|
| Two deliverables modify the same file | Same plan |
| Two deliverables use the same skill pattern | Same plan (if <= 3 tasks) |
| One deliverable produces a file another reads | Different waves |
| Two deliverables share no files or patterns | Can be separate plans in same wave |
| Deliverable is a skill/markdown file only | Consider autonomous (no agent needed) |
| Deliverable involves code + tests | Include testing agent |

### Naming Plans

Plan names should describe the primary output, not the process:
- Good: "Create phase-decomposer skill", "Update plan command with full implementation"
- Bad: "Plan 1", "Do the first part", "Setup stuff"

---

## Section 4: Agent Recommendation

How to select agents for each plan using the `agent-registry.md` recommendation algorithm.

### Per-Plan Selection

```
For each plan:

1. ANALYZE the plan's tasks
   - What type of work? (new skill, command update, test writing, config, etc.)
   - What domains are involved? (frontend, backend, design, content, etc.)
   - What files are being created/modified?

2. MATCH against agent-registry
   - Use Section 3 (Recommendation Algorithm) of agent-registry.md
   - Extract task type terms from plan tasks
   - Score agents by:
     - Exact match on task type tag: 3 points
     - Partial match (substring in specialty): 1 point
     - Division alignment (task maps to division): 2 points
   - Apply mandatory roles:
     - Testing agent for any plan that writes or modifies code
     - Coordinator agent for cross-division plans

3. SELECT recommended agents
   - Pick top 1-2 agents per plan (not per task — agents work at plan level)
   - For skills/markdown-only plans: may not need agents (autonomous execution)
   - For code-heavy plans: must include at least 1 engineering + 1 testing agent

4. FORMAT recommendation for user presentation
   For each plan, prepare:
   - Plan name and wave number
   - Recommended agent(s) with ID, division, and 1-sentence rationale
   - What the agent will do (brief scope)
   - Whether the plan is autonomous or agent-delegated
```

### Autonomous vs. Agent-Delegated

| Plan Type | Autonomous? | Agents Needed |
|-----------|-------------|---------------|
| Skill/skill files (markdown only) | Yes | None — Claude executes directly |
| Command wiring (light code) | Yes | None, unless complex logic |
| Feature implementation (code) | No | 1 engineering + 1 testing |
| Cross-division work | No | Domain agents + coordinator |
| Config/template changes | Yes | None |
| Test creation (standalone) | No | 1 testing agent |

### Coordinator Rules

When a phase spans multiple divisions (e.g., engineering + design), at least one plan must include a coordinator agent. Valid coordinators:
- `project-manager-senior` — task breakdown and scope management
- `project-management-project-shepherd` — cross-functional coordination
- `agents-orchestrator` — pipeline management and agent coordination

---

## Section 5: User Confirmation Gate

Before writing any plan files, present the complete breakdown for user approval.

### Presentation Format

```markdown
## Phase {N}: {name} -- Plan Breakdown

### Wave 1
**Plan {NN}-01: {plan_name}**
- Tasks: {count} tasks
- Agent: {agent_id} ({division}) -- {rationale}
  OR: Autonomous (no agent needed -- skill/config work)
- Delivers: {what it produces}

### Wave 2
**Plan {NN}-02: {plan_name}**
- Tasks: {count} tasks
- Agent: {agent_id} ({division}) -- {rationale}
- Depends on: Plan {NN}-01 output
- Delivers: {what it produces}

### Agent Summary
| Plan | Agent | Division | Role |
|------|-------|----------|------|
| {NN}-01 | {agent_id or "Autonomous"} | {division or "--"} | {what they do} |
| {NN}-02 | {agent_id} | {division} | {what they do} |
```

### Confirmation Prompt

Use AskUserQuestion to get user approval:

```
Question: "Does this plan breakdown and agent assignment look right?"
Options:
  - "Looks good, generate the plans" -- proceed to plan file generation
  - "Swap an agent" -- ask which plan and which replacement agent
  - "Adjust the plan structure" -- discuss and revise before generating
```

### Handling Agent Swaps

If the user selects "Swap an agent":

1. Ask which plan number they want to change
2. Present 3-4 alternative agents from the same or related divisions, using the agent-registry catalog:
   ```
   Current: engineering-frontend-developer (Engineering)
   Alternatives:
   - engineering-senior-developer (Engineering) -- broader full-stack expertise
   - engineering-rapid-prototyper (Engineering) -- faster iteration for MVPs
   - design-ux-architect (Design) -- if the work is more CSS/layout focused
   ```
3. Let them pick by name or number
4. Update the plan's agent assignment and re-present the summary

### Handling Structure Adjustments

If the user selects "Adjust the plan structure":

1. Ask what they want to change (merge plans, split a plan, reorder waves, etc.)
2. Discuss the impact on dependencies and agent assignments
3. Revise the breakdown
4. Re-present for confirmation using the same AskUserQuestion flow

Only proceed to plan file generation after the user confirms "Looks good."

---

## Section 6: Plan File Template

The exact format for generated plan files. Each plan produces one `{NN}-{PP}-PLAN.md` file.

### Template

````yaml
---
phase: {NN}-{phase-slug}
plan: {PP}
type: execute
wave: {wave_number}
depends_on: [{list of "NN-PP" plan IDs this depends on}]
files_modified:
  - {list of files this plan will create or modify}
autonomous: {true if no agent needed, false if agent-delegated}
requirements: [{list of requirement IDs covered}]
user_setup: []

must_haves:
  truths:
    - "{invariant 1 -- something that MUST be true about the output}"
    - "{invariant 2}"
    - "{invariant 3}"
  artifacts:
    - path: "{primary output file}"
      provides: "{what it provides}"
      min_lines: {expected minimum}
      contains: "{key string that must be present}"
  key_links:
    - from: "{source file}"
      to: "{target file}"
      via: "{how they connect}"
      pattern: "{grep-able pattern proving the link}"
---

<objective>
{1-2 sentence description of what this plan accomplishes}

Purpose: {why this plan exists in the larger phase context}
Output: {primary file(s) produced}
</objective>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/{NN}-{phase-slug}/{NN}-CONTEXT.md
{@previous plan summaries if wave > 1}

Relevant source files:
{@files that need to be read for context}
</context>

<tasks>

<task type="auto">
  <name>Task {N}: {descriptive name}</name>
  <files>{files to create or modify}</files>
  <action>
{Detailed, unambiguous instructions for what to do.
Include format examples, specific content guidance,
and enough detail that the executor does not need to guess.}
  </action>
  <verify>
{Bash commands to verify the task was completed correctly.
Every task MUST have concrete verification -- file existence,
content checks, line counts, grep patterns.}
  </verify>
  <done>{Single sentence describing the completed state.}</done>
</task>

</tasks>

<verification>
Before declaring plan complete:
- [ ] {verification item 1}
- [ ] {verification item 2}
...
</verification>

<success_criteria>
- {testable outcome 1}
- {testable outcome 2}
...
</success_criteria>

<output>
After completion, create `.planning/phases/{NN}-{phase-slug}/{NN}-{PP}-SUMMARY.md`

{Any state updates needed}
</output>
````

### Template Field Guidance

| Field | How to Fill |
|-------|-------------|
| `phase` | `{NN}-{phase-slug}` — e.g., `03-phase-planning` |
| `plan` | Zero-padded plan number within the phase — e.g., `01`, `02` |
| `wave` | Integer wave number — `1` for no-dependency plans, `2+` for dependent plans |
| `depends_on` | List of `"NN-PP"` IDs from earlier waves — e.g., `["03-01"]` |
| `files_modified` | Every file the plan will create or modify — be exhaustive |
| `autonomous` | `true` for skill/config/markdown-only plans; `false` when agents are assigned |
| `requirements` | Requirement IDs from REQUIREMENTS.md covered by this plan's tasks |
| `must_haves.truths` | 3-5 invariants that MUST be true about the output. Testable statements. |
| `must_haves.artifacts` | Primary output files with min_lines and contains checks |
| `must_haves.key_links` | How this plan's output connects to other files (grep-able patterns) |
| `<context>` | Always include PROJECT.md, ROADMAP.md, and the phase CONTEXT.md. Add source files relevant to the plan's tasks. For wave 2+ plans, include prior plan summaries. |
| `<tasks>` | Max 3 tasks. Each with name, files, action, verify, done. |
| `<verify>` inside tasks | Bash commands only — `wc -l`, `grep`, `test -f`, etc. |
| `<verification>` | Checklist of all conditions for plan completion |
| `<success_criteria>` | Bulleted testable outcomes |

### Writing Detailed Task Actions

Task `<action>` blocks must be detailed enough for an executor (agent or autonomous) to complete without guessing. Include:

- **What to create/modify** — exact file paths
- **Format/structure** — headings, sections, YAML frontmatter if applicable
- **Content guidance** — what each section should contain, with examples
- **References** — which existing files to read for patterns or data
- **Constraints** — line counts, required strings, formatting rules

Bad action: "Create the authentication module."
Good action: "Create `src/auth/jwt.ts`. Export two functions: `generateToken(userId: string): string` and `verifyToken(token: string): { userId: string } | null`. Use the `jose` library. Tokens expire in 24 hours. Include the refresh token rotation pattern from `@docs/auth-spec.md` Section 3."

---

## Section 7: Context File Generation

Before writing plan files, generate the phase context file. This provides shared background that all plans in the phase reference.

### Context File Path

```
.planning/phases/{NN}-{phase-slug}/{NN}-CONTEXT.md
```

### Context File Structure

```markdown
# Phase {N}: {phase_name} -- Context

## Phase Goal
{Goal from ROADMAP.md}

## Requirements Covered
- {REQ-ID}: {full description from REQUIREMENTS.md}
- {REQ-ID}: {full description from REQUIREMENTS.md}
...

## What Already Exists (from prior phases)
{List files, skills, commands, and state from completed phases
that are relevant to this phase's work. Reference STATE.md
for phase results and decisions.}

## Key Design Decisions
{Rationale for how the phase was decomposed:
- Why these wave assignments?
- Why these agent choices?
- Any trade-offs or alternatives considered?}

## Plan Structure
- **Plan {NN}-01 (Wave 1)**: {plan name} -- {1-sentence scope}
- **Plan {NN}-02 (Wave 2)**: {plan name} -- {1-sentence scope}
...
```

### Generation Rules

1. The context file is written FIRST, before any plan files
2. All plan files in the phase reference this context file via `@.planning/phases/{NN}-{slug}/{NN}-CONTEXT.md`
3. The "What Already Exists" section must be accurate — read STATE.md and verify prior phase outputs actually exist
4. The "Plan Structure" section should match the confirmed breakdown from the user confirmation gate
5. Create the phase directory if it does not already exist: `.planning/phases/{NN}-{phase-slug}/`

---

## Section 8: Edge Cases

### Phase Already Planned

Check if `.planning/phases/{NN}-{slug}/` already contains `*-PLAN.md` files before generating.

If plan files exist, warn the user:

```
Use AskUserQuestion:
  Question: "Phase {N} already has plan files in .planning/phases/{NN}-{slug}/.
             Re-planning will overwrite them. Continue?"
  Options:
  - "Yes, overwrite" -- delete existing PLAN.md files and regenerate
  - "No, keep existing" -- abort planning
```

Do NOT overwrite without confirmation.

### No Phase Number Given

Auto-detect the next unplanned phase:

1. Read the ROADMAP.md progress table
2. Find the first phase where:
   - Status is not "Complete"
   - No existing `*-PLAN.md` files in its phase directory
3. Use that phase number
4. Tell the user: "Auto-detected Phase {N}: {name} as the next phase to plan."

If all phases are either complete or already have plan files, inform the user: "All phases are either complete or already planned. Use `/agency:plan N` with a specific phase number to re-plan."

### Phase Does Not Exist

If the given phase number exceeds the ROADMAP.md phase count:

```
Error: "Phase {N} doesn't exist in ROADMAP.md. The roadmap has {count} phases.
        Available phases: {list phase numbers and names}."
```

Do not attempt to create a new phase — that requires updating the ROADMAP.md, which is outside `/agency:plan`'s scope.

### Phase Already Complete

If the ROADMAP.md progress table shows the phase as "Complete":

```
Use AskUserQuestion:
  Question: "Phase {N} is already marked complete in ROADMAP.md.
             Re-planning a complete phase is unusual. Continue anyway?"
  Options:
  - "Yes, re-plan it" -- proceed with decomposition (useful for rework)
  - "No, pick a different phase" -- abort and suggest available phases
```

### Single-Task Phase

Some phases genuinely need only 1 plan with 1-2 tasks. That is fine. Do not pad plans to hit an arbitrary count. If the ROADMAP.md estimated plan count says 2 but the work fits cleanly in 1 plan, use 1 plan and note the discrepancy.

### Cross-Division Phase

If a phase's requirements span multiple agent divisions (e.g., engineering + design, or marketing + product):

1. Identify the divisions involved by matching requirement task types to agent-registry divisions
2. Ensure at least one plan includes a coordinator agent:
   - `project-manager-senior` — for task breakdown and scope management
   - `project-management-project-shepherd` — for cross-functional coordination
   - `agents-orchestrator` — for pipeline management and multi-agent orchestration
3. The coordinator does not replace domain agents — they coordinate alongside them

### Empty Requirements

If a ROADMAP.md phase has no requirement IDs listed, or the IDs do not exist in REQUIREMENTS.md:

1. Warn the user: "Phase {N} references requirements {IDs} but they were not found in REQUIREMENTS.md."
2. Ask whether to proceed using the phase Goal and Success Criteria as guidance, or fix REQUIREMENTS.md first.
