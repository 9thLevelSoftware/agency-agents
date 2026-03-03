---
name: legion:phase-decomposer
description: Decomposes roadmap phases into wave-structured plans with agent recommendations and plan file generation
triggers: [plan, decompose, phase, task, wave, breakdown]
token_cost: high
summary: "Decomposes roadmap phases into wave-structured plans. Analyzes requirements, groups deliverables by dependency, recommends agents, generates PLAN.md files. Core engine for /legion:plan."
---

# Phase Decomposer

Engine for `/legion:plan`. Takes a ROADMAP.md phase entry and transforms it into executable, wave-structured plan files with per-plan agent recommendations. The full flow: analyze phase, decompose into plans, recommend agents, present for confirmation, generate plan files.

---

## Section 1: Decomposition Principles

1. **Max 3 tasks per plan** — if a plan needs more work, split it into additional plans. Plans stay focused and reviewable.
2. **Wave-structured execution** — Wave 1 plans have no internal dependencies. Wave 2 plans depend on Wave 1 outputs. Parallel within waves, sequential between waves.
3. **Per-plan agent assignment** — different plans in the same phase may use different agents. A frontend plan gets a frontend agent; a testing plan gets a testing agent.
4. **Self-contained plans** — each plan must be executable with only its `<context>` references. An agent should never need to read a file not listed in context.
5. **Concrete verification** — every task has BOTH:
   - `> verification:` inline lines after the task description — machine-checkable commands that can be extracted and run automatically by the wave-executor
   - A `<verify>` block with the same commands in executable form
   No "manually check" or "visually inspect" instructions. If you cannot script the check, the task is too vague.
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

### Marketing Domain Detection

After reading phase details, check if this is a marketing-focused phase:

1. **Requirement check**: Any MKT-* requirement IDs in the phase requirements?
2. **Keyword check**: Phase description contains marketing keywords?
   Keywords: "campaign", "content calendar", "social media", "cross-channel",
   "marketing", "brand awareness", "audience", "engagement strategy",
   "content strategy", "channel strategy"
3. **Agent signal**: Does agent-registry recommend majority marketing-division agents?

If ANY signal is positive:
  → Flag phase as marketing-focused
  → Read marketing-workflows skill for domain-specific patterns
  → Use marketing wave pattern in Section 3 decomposition
  → Trigger campaign questioning (marketing-workflows Section 2.1)
  → Generate campaign document (marketing-workflows Section 2.2)

If no signals:
  → Standard decomposition (no impact)

### Design Domain Detection

After reading phase details (and after marketing detection), check if this is a design-focused phase:

1. **Requirement check**: Any DSN-* requirement IDs in the phase requirements?
2. **Keyword check**: Phase description contains design keywords?
   Keywords: "design system", "component library", "UX research", "usability testing",
   "accessibility audit", "brand guidelines", "design tokens", "wireframes", "prototypes",
   "user testing", "design review", "user persona", "user journey", "information architecture",
   "visual design"
3. **Agent signal**: Does agent-registry recommend majority design-division agents?

If ANY signal is positive:
  → Flag phase as design-focused
  → Read design-workflows skill for domain-specific patterns
  → Use design wave pattern in Section 3 decomposition
  → Trigger design brief questioning (design-workflows Section 2.1)
  → Generate design documents (design-workflows Section 2.2)

If no signals:
  → Standard decomposition (no impact)

---

## Section 2.5: Competing Architecture Proposals

Before decomposing into plans, optionally generate competing architecture proposals. This ensures the planning approach isn't biased by a single perspective. Adapted from Feature-dev's 2-3 competing designs pattern.

### When to Generate Proposals

```
Complexity check:
- If phase has ≤2 requirements AND only modifies existing markdown files → Skip (too simple)
- If phase has 3+ requirements AND involves architectural choices (new abstractions,
  new patterns, structural decisions) → Offer proposals
- If user explicitly requests → Always generate
- Default is skip — proposals are opt-in, not opt-out
- The orchestrator presents the option; user can always decline
```

### Philosophy Archetypes

Define 3 labeled approaches that agents adopt:

| Philosophy | Bias | Strengths | Risks |
|-----------|------|-----------|-------|
| **Minimal** | Least changes, smallest footprint | Low risk, easy to review, fast execution | May miss optimization opportunities, can accumulate tech debt |
| **Clean Architecture** | Proper patterns, separation of concerns, future-proof | Maintainable, extensible, well-structured | Over-engineering risk, more files to modify, longer execution |
| **Pragmatic** | Balanced trade-offs, ship fast but don't cut corners | Good enough for now, adaptable later | May not satisfy purists in either direction |

### Proposal Generation Process

```
Step 1: Read phase context
  Use the phase analysis output from Section 2: phase goal, requirements,
  success criteria, existing assets, and constraints.

Step 2: Spawn proposal agents
  Spawn 2-3 agents using the read-only Explore subagent type (same pattern
  as plan-critique Section 4). Each agent receives:
  - The full phase context from Step 1
  - Their assigned philosophy (Minimal, Clean, or Pragmatic)
  - Instructions to produce a structured proposal

  Agent selection:
  - Use agent-registry to match agents with architectural or strategic expertise
  - Preferred: engineering-senior-developer (Clean), engineering-rapid-prototyper (Minimal),
    product-sprint-prioritizer (Pragmatic)
  - For non-engineering phases: match to domain-appropriate agents with similar traits
  - Each agent operates in full personality (personality injection pattern from workflow-common)

  Prompt template for each agent:
  "You are analyzing Phase {N}: {phase_name} from the perspective of the
   {philosophy} philosophy. Given the requirements and context below,
   propose how you would structure the implementation.

   Your proposal must include:
   1. Approach summary (2-3 sentences)
   2. Key decisions and why (3-5 bullet points)
   3. Files you would modify/create (list)
   4. Estimated wave structure (how many waves, what in each)
   5. Trade-offs (what this approach gains and what it sacrifices)
   6. Risk assessment (1-2 main risks of this approach)"

Step 3: Collect and format proposals
  Wait for all agents to return. Format proposals side-by-side:

  ## Architecture Proposals — Phase {N}: {phase_name}

  ### Proposal A: Minimal ({agent_name})
  **Approach:** {summary}
  **Key decisions:**
  - {decision 1}
  - {decision 2}
  **Files:** {list}
  **Waves:** {wave structure}
  **Trade-offs:** {gains vs sacrifices}
  **Risk:** {main risk}

  ### Proposal B: Clean Architecture ({agent_name})
  {same structure}

  ### Proposal C: Pragmatic ({agent_name})
  {same structure}

  ### Comparison
  | Dimension | Minimal | Clean | Pragmatic |
  |-----------|---------|-------|-----------|
  | Files modified | {N} | {N} | {N} |
  | Estimated waves | {N} | {N} | {N} |
  | Risk level | {Low/Med/High} | {Low/Med/High} | {Low/Med/High} |
  | Best for | {scenario} | {scenario} | {scenario} |

Step 4: User selection
  Use AskUserQuestion:

  "Which architecture approach for Phase {N}?"
  Options:
  - "Proposal A: Minimal" — {1-line summary}
  - "Proposal B: Clean Architecture" — {1-line summary}
  - "Proposal C: Pragmatic" — {1-line summary}
  - "Hybrid" — "I want to combine elements from multiple proposals"

  If "Hybrid": ask user which elements from which proposals to combine,
  then synthesize a merged approach.

Step 5: Feed into decomposition
  The selected approach (or hybrid) becomes the architectural direction
  for Section 3 (Task Decomposition). Record the selection in the phase
  CONTEXT.md under "Key Design Decisions":

  "Architecture approach: {selected philosophy} — {rationale}"

  If proposals were skipped, note: "Architecture proposals: skipped (simple phase)"
```

### Cost Profile

Proposal agents use the Explore subagent type (read-only, no file modifications). Cost: 2-3 Sonnet-tier agent calls. For budget-conscious users, offer 2 proposals instead of 3, or skip entirely.

### Relationship to Spec Pipeline

If the spec pipeline (PLN-02) was run before planning, proposal agents receive the spec document as additional context. This produces better-informed proposals since requirements are already clarified.

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

### Marketing-Specific Wave Pattern

When phase is flagged as marketing-focused (Section 2 detection):

Replace the generic wave mapping with marketing-specific waves:
- **Wave 1: Strategy & Planning**
  Tasks: Campaign strategy brief, audience analysis, success metrics definition
  Agents: marketing-social-media-strategist (lead), marketing-growth-hacker
  Output: Strategy brief in campaign document, core messaging (marketing-workflows Section 4.1)

- **Wave 2: Content Creation**
  Tasks: Core content production, channel-specific content adaptation
  Agents: marketing-content-creator + channel specialists based on campaign channels
  Input: Wave 1 strategy brief + core messaging as context
  Output: Content assets per channel, following adaptation guidelines

- **Wave 3 (optional — only if phase scope includes distribution/execution)**:
  Tasks: Content distribution, engagement, community management
  Agents: All assigned channel agents in parallel
  Input: Wave 2 content + campaign calendar
  Output: Published content, engagement metrics

Generate plan files following this wave structure instead of generic dependency-based waves.
Each plan's context section references the campaign document:
  @.planning/campaigns/{campaign-slug}.md

### Design-Specific Wave Pattern

When phase is flagged as design-focused (Section 2 detection):

Replace the generic wave mapping with design-specific waves:
- **Wave 1: Research & Foundation**
  Tasks: User research, brand audit, design principles definition, token foundation
  Agents: design-ux-researcher (research lead), design-brand-guardian (brand audit)
  Output: Research brief, user insights, brand foundation, design principles in design document

- **Wave 2: Design System & Creation**
  Tasks: Component library, token system, layout framework, visual assets
  Agents: design-ui-designer (design lead) + design-ux-architect + design-visual-storyteller
  Input: Wave 1 research + brand guidelines as context
  Output: Design system document, component specifications, visual language

- **Wave 3 (optional — only if phase scope includes polish/validation)**:
  Tasks: Micro-interactions, delight elements, accessibility audit, usability validation
  Agents: design-whimsy-injector + review agents
  Input: Wave 2 design system + components
  Output: Enhanced specifications with delight, audit reports

Generate plan files following this wave structure instead of generic dependency-based waves.
Each plan's context section references the design documents:
  @.planning/designs/{project-slug}-system.md

### Naming Plans

Plan names should describe the primary output, not the process:
- Good: "Create phase-decomposer skill", "Update plan command with full implementation"
- Bad: "Plan 1", "Do the first part", "Setup stuff"

---

## Section 4: Agent Recommendation

How to select agents for each plan using the `agent-registry.md` recommendation algorithm.

### Memory-Enhanced Recommendation (Optional)

Before running the per-plan recommendation algorithm, check if cross-session memory can inform agent selection.

```
Step 0: Check memory availability
  - If .planning/memory/OUTCOMES.md exists:
    a. Extract task types from the current phase's requirements and deliverables
    b. Call memory-manager Section 4 "Recall Agent Scores" with those task types
    c. Receive agent_id → memory_score mapping
    d. Pass this mapping to the per-plan selection below — it will be consumed
       by agent-registry.md Step 4.5 (Memory Boost)
    e. Display memory context to inform the recommendation:
       "Memory: {count} past outcomes found for task types [{types}].
        Agents with track record: {agent_id} ({memory_score}), ..."
  - If .planning/memory/OUTCOMES.md does not exist:
    a. Skip memory recall entirely
    b. Proceed to Per-Plan Selection with no memory data
    c. Do NOT display any message about missing memory
```

This step enriches the recommendation but does not change the algorithm. If memory is absent, Section 4 works identically to how it worked before Phase 9.

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

### Marketing Team Assembly

When phase is marketing-focused, replace individual-agent-per-plan recommendation with team assembly:
- Read agent-registry Section 4 "Marketing Campaign" team pattern
- Read marketing-workflows Section 2.3 for role definitions
- Assemble team based on campaign's channel selection:
  Required: Strategy Lead (social-media-strategist) + Content Lead (content-creator)
  Per-channel: one specialist per selected channel (from marketing-workflows Section 1 Channel-Agent Mapping)
  Optional: growth-hacker (if acquisition/conversion focus), design-visual-storyteller (if visual-heavy)
- Present team to user for confirmation (not individual agent per plan)

### Design Team Assembly

When phase is design-focused, replace individual-agent-per-plan recommendation with team assembly:
- Read agent-registry Section 4 "Design Sprint" team pattern
- Read design-workflows Section 2.3 for role definitions
- Assemble team based on project's design scope:
  Required: Design Lead (design-ui-designer) + Research Lead (design-ux-researcher)
  Per-discipline: one specialist per relevant discipline (from design-workflows Section 1 Discipline-Agent Mapping)
  Optional: design-brand-guardian (if established brand), design-ux-architect (if CSS/layout needed), engineering-frontend-developer (if design-to-code handoff)
- Present team to user for confirmation (not individual agent per plan)

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

> verification: {bash command that proves task 1 success — e.g., test -f path/to/file.md}
> verification: {second check — e.g., grep -q "expected string" path/to/file.md}
  </action>
  <verify>
{Same verification commands from above in executable form:}
test -f path/to/file.md
grep -q "expected string" path/to/file.md
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

### Writing Verification Lines

Every task MUST include `> verification:` lines at the end of its `<action>` block. These are machine-readable commands that the wave-executor extracts and runs automatically after task execution.

**Format**: `> verification: {bash command}`

The command must:
- Return exit code 0 on success, non-zero on failure
- Be self-contained (no variables, no prior setup needed)
- Run from the repository root directory

**Good verification lines:**
```
> verification: test -f skills/new-skill/SKILL.md
> verification: grep -q "Section 1:" skills/new-skill/SKILL.md
> verification: wc -l < skills/new-skill/SKILL.md | xargs test 50 -le
> verification: grep -c "## Section" skills/new-skill/SKILL.md | xargs test 3 -le
```

**Bad verification lines:**
```
> verification: echo "looks good"          # Always passes — tests nothing
> verification: cat skills/new-skill/SKILL.md  # Reads but doesn't assert
> verification: open http://localhost:3000  # Not scriptable, requires browser
```

**Relationship to `<verify>` blocks:**
The `> verification:` lines and `<verify>` blocks contain the SAME commands. The difference:
- `> verification:` lines are inline, grep-able (`grep '^> verification:' PLAN.md`), and parsed by wave-executor for automated checking
- `<verify>` blocks are the human-readable executable form used during manual review

Both exist for redundancy — inline format for automation, block format for readability.

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

If all phases are either complete or already have plan files, inform the user: "All phases are either complete or already planned. Use `/legion:plan N` with a specific phase number to re-plan."

### Phase Does Not Exist

If the given phase number exceeds the ROADMAP.md phase count:

```
Error: "Phase {N} doesn't exist in ROADMAP.md. The roadmap has {count} phases.
        Available phases: {list phase numbers and names}."
```

Do not attempt to create a new phase — that requires updating the ROADMAP.md, which is outside `/legion:plan`'s scope.

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
