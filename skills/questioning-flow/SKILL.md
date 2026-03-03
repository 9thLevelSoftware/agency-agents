---
name: legion:questioning-flow
description: Adaptive project initialization questioning that captures vision, requirements, and preferences
triggers: [start, initialize, project, question, discovery, setup]
token_cost: low
summary: "Guided questioning flow for new project initialization. Extracts vision, requirements, constraints, and architecture preferences through structured conversation. Generates PROJECT.md, ROADMAP.md, STATE.md."
---

# Questioning Flow

Adaptive conversation engine for `/legion:start`. Captures everything needed to populate PROJECT.md, ROADMAP.md, and STATE.md templates through a 3-stage dialogue.

---

## Section 1: Questioning Philosophy

1. **Vision first, technology second** — understand what the user wants to exist before asking how to build it.
2. **Adaptive depth** — follow the user's energy. If they go deep on a topic, explore it. If they give a terse answer, move on.
3. **Infer where possible, confirm where uncertain** — don't ask questions the user already answered implicitly. State your inference and let them correct it.
4. **Structured choices for preferences, open conversation for vision** — Stage 1-2 are conversational; Stage 3 uses explicit choice prompts.
5. **Target 5-8 total exchanges** — not 20 questions. Combine related questions. Skip what's already clear.
6. **Summarize between stages** — after each stage, reflect back what you captured and ask for corrections before moving on.

---

## Section 2: Conversation Flow

### Stage 1: Vision & Identity (1-3 exchanges)

**Purpose**: Capture `{project_name}`, `{project_description}`, `{value_proposition}`, `{target_users}`.

**Open with**:
> "What are you building? Give me the elevator pitch."

From the user's response, extract what you can. Then ask only what's still missing:

| Question | Ask if... | Fills |
|----------|-----------|-------|
| "Who is this for? Who are the primary users?" | Not clear from pitch | `{target_users}` |
| "What problem does this solve that isn't solved today?" | Value prop unclear | `{value_proposition}` |
| "What exists today that's close to this?" | Competitive context missing | `{architecture_notes}` (competitive context) |
| "What's the one thing that makes this different?" | Differentiator unclear | `{value_proposition}` refinement |

**After Stage 1** — Summarize and confirm:
> "Here's what I'm understanding: **[project_name]** is [project_description]. It's for [target_users] and the core value is [value_proposition]. Anything to correct or add?"

Wait for confirmation before proceeding.

### Stage 2: Requirements & Constraints (2-4 exchanges)

**Purpose**: Capture `{requirements_list}`, `{out_of_scope}`, `{constraints}`, `{architecture_notes}`, `{decisions_table}`.

**Core questions** (always ask):
- "What are the must-have features for v1?"
- "What's explicitly out of scope — things you do NOT want to build right now?"

**Adaptive follow-ups** — select based on project type detected in Stage 1:

| Project type signal | Follow-up questions |
|---------------------|---------------------|
| Code/software | Stack preferences? Existing codebase? Deployment target? |
| Content/marketing | Platforms? Voice/tone? Publishing frequency? |
| Design | Brand guidelines? Target devices? Accessibility requirements? |
| Research/analysis | Data sources? Deliverable format? Stakeholder audience? |
| Mixed/unclear | Cover the most relevant subset; skip the rest |

**General optional questions** (ask if relevant, skip if not):
- Technical constraints or hard requirements (language, hosting, budget)
- Biggest risk or unknown
- Existing assets to build on (repos, designs, content)
- Timeline or deadline pressure

**After Stage 2** — Summarize requirements as a bullet list and confirm:
> "Here's the v1 scope I captured: [bullet list]. Out of scope: [items]. Any adjustments?"

### Stage 3: Workflow Preferences (1-2 exchanges)

**Purpose**: Capture execution mode, planning depth, and cost profile. These shape how ROADMAP.md phases are structured and how agents execute.

Present three structured choices. Use clear descriptions so the user can choose quickly.

**Question 1 — Execution Mode**:
- **Guided** (Recommended): Legion recommends actions, you approve before each step. Best for first-time use or high-stakes projects.
- **Autonomous**: Legion plans and executes, you review at checkpoints. Best for trusted workflows or time pressure.
- **Collaborative**: Work alongside agents with high interaction. Best when you want to stay hands-on.

**Question 2 — Planning Depth**:
- **Standard** (Recommended): Balanced planning and execution. 3-6 phases. Good for most projects.
- **Quick Sketch**: Minimal planning, start building fast. 2-3 phases. Good for prototypes or explorations.
- **Deep Analysis**: Thorough research and planning before execution. 6+ phases. Good for complex or unfamiliar domains.

**Question 3 — Cost Profile**:
- **Balanced** (Recommended): Opus for planning, Sonnet for execution, Haiku for checks. Best cost/quality ratio.
- **Economy**: Sonnet for planning and execution, Haiku for checks. Lower cost, still capable.
- **Premium**: Opus for planning and execution, Sonnet for checks. Maximum quality, higher cost.

Record choices as decisions in `{decisions_table}`:
```
| Execution mode | [user rationale or "default"] | [chosen mode] |
| Planning depth | [user rationale or "default"] | [chosen depth] |
| Cost profile   | [user rationale or "default"] | [chosen profile] |
```

---

## Section 3: Output Structure

### Placeholder Mapping

| Template Placeholder | Source Stage | How to Fill |
|----------------------|-------------|-------------|
| `{project_name}` | Stage 1 | Short name extracted from pitch. Use the user's own words if they named it. |
| `{project_description}` | Stage 1 | 2-3 sentence description of what the project is. |
| `{value_proposition}` | Stage 1 | Core differentiator — why this matters. |
| `{target_users}` | Stage 1 | Who the project serves. Concrete user types, not vague "everyone." |
| `{requirements_list}` | Stage 2 | Checkbox list of v1 requirements (see format below). |
| `{out_of_scope}` | Stage 2 | Bullet list of explicitly excluded items. Omit section if none stated. |
| `{constraints}` | Stage 2 | Technical, timeline, or resource constraints. Omit section if none. |
| `{decisions_table}` | Stage 2-3 | Table rows: `\| Decision \| Rationale \| Outcome \|` |
| `{architecture_notes}` | Stage 2 | Stack choices, competitive context, technical direction. Omit if non-technical project. |
| `{date}` | Generated | Current date in YYYY-MM-DD format. |
| `{phase_checklist}` | Decomposition | Checkbox list of phases (see Section 4). |
| `{phase_details_sections}` | Decomposition | One detail block per phase (see roadmap template comment). |
| `{progress_table}` | Decomposition | One row per phase, all showing "Not started". |
| `{total_phases}` | Decomposition | Integer count of phases. |
| `{total_plans}` | Decomposition | Sum of estimated plans across all phases. |
| `{progress_bar}` | Generated | Empty progress bar matching total plans width, e.g., `··········` |
| `{progress_percent}` | Generated | `0` at initialization. |
| `{recent_decisions}` | Stage 3 | Workflow preference decisions formatted as bullet list. |
| `{first_phase_name}` | Decomposition | Name of Phase 1 for the "next action" prompt. |

### Formatting Rules

**Requirements** — each requirement is a checkbox item:
```markdown
- [ ] User authentication with email/password
- [ ] Dashboard showing key metrics
- [ ] Export data as CSV
```

**Decisions** — each decision is a table row:
```markdown
| Tech stack | Team familiarity and ecosystem maturity | Next.js + PostgreSQL |
| Execution mode | First project with Legion | Guided |
```

**Out of scope / Constraints** — plain bullet lists:
```markdown
- Mobile app (web-first for v1)
- Multi-language support
```

**Omission rule**: If a section has no content (e.g., no constraints mentioned), omit the content entirely rather than writing "N/A" or "None." Leave the placeholder unfilled so the template renders cleanly with just the heading.

---

## Section 4: Phase Decomposition Guidelines

After all three stages are complete, decompose the captured requirements into phases for ROADMAP.md.

### Decomposition Process

1. **Group by dependency and domain** — requirements that depend on each other or share a domain belong in the same phase. Foundation before features. Features before polish.

2. **Order phases by dependency chain**:
   - Infrastructure/setup phases first
   - Core functionality next
   - User-facing features after core is stable
   - Polish, optimization, and launch last

3. **Size each phase for 2-3 plans** (max 3 tasks per plan):
   - Simple phase (config, setup): 1-2 plans
   - Standard phase (feature build): 2-3 plans
   - Complex phase (multi-system integration): 3 plans

4. **Name phases descriptively** — use what the phase delivers, not a number:
   - Good: "API Foundation", "User Dashboard", "Launch Prep"
   - Bad: "Phase 1", "Setup", "Stuff"

5. **Assign agents per phase** — use the recommendation algorithm in `agent-registry.md` Section 3. For each phase:
   - Parse the phase's requirements against agent task type tags
   - Select 2-4 agents per phase following the registry's matching, ranking, and capping rules
   - Ensure mandatory roles are covered (testing agent for code phases, coordinator for cross-division work)

6. **Define success criteria** — each phase needs testable, observable completion conditions:
   - Good: "API returns valid JSON for all /users endpoints with 200 status"
   - Bad: "API works"

7. **Estimate plan count per phase**:
   - Count the requirements in the phase
   - Group into plans of max 3 tasks each
   - Record the estimate in the phase detail block

### Phase Detail Format

For each phase, produce a block matching the roadmap template pattern:

```markdown
### Phase N: {phase_name}
**Goal**: One sentence describing what this phase delivers.
**Requirements**: R1, R2, R3 (reference the requirements list items)
**Recommended Agents**: agent-id-1, agent-id-2 (from agent-registry)
**Success Criteria**:
- [ ] Specific, testable criterion 1
- [ ] Specific, testable criterion 2
**Plans**: {estimated_plan_count}
```

### Phase Checklist Format

```markdown
- [ ] Phase 1: {phase_name} ({plan_count} plans)
- [ ] Phase 2: {phase_name} ({plan_count} plans)
```

### Planning Depth Adjustments

| Depth | Phase Count | Plan Density | Notes |
|-------|-------------|--------------|-------|
| Quick Sketch | 2-3 | 1-2 plans/phase | Combine aggressively. Ship fast. |
| Standard | 3-6 | 2-3 plans/phase | Balanced. Default recommendation. |
| Deep Analysis | 6+ | 2-3 plans/phase | More phases, not more plans per phase. Add research phases. |

---

## Section 5: Edge Cases

### User wants to skip questions
Accept it. Infer reasonable defaults from whatever context they provided. Record all assumptions as decisions in `{decisions_table}` with rationale "Inferred — user skipped detailed questioning." Apply default workflow preferences (Guided, Standard, Balanced).

### User provides a PRD, spec, or requirements document
If the user pastes or references an existing document:
1. Parse it to extract: project name, description, target users, requirements, constraints, and any stated technical decisions.
2. Summarize what you extracted and confirm: "I pulled the following from your doc — anything to adjust?"
3. Skip directly to Stage 3 (workflow preferences). Do not re-ask questions the document already answers.
4. Record "Imported from user-provided specification" in `{decisions_table}`.

### Existing .planning/ directory detected
The `start.md` command handles the overwrite warning. If the user confirms reinitialize, proceed with a clean questioning flow. Do not attempt to merge with existing state — it's a fresh start.

### Unclear or overly broad project scope
Push for specificity. Use:
> "That's broad — if you could only ship ONE thing first, what would it be?"

If the user remains vague after two attempts, scope to what's concrete and note "Scope requires further refinement" in `{constraints}`.

### Non-code project
Legion supports marketing, design, content, and research projects. If the project has no code component:
- Skip all technical stack questions in Stage 2
- Skip `{architecture_notes}` — omit the section
- Focus phase decomposition on deliverables (content pieces, design assets, campaign milestones)
- Agent recommendations will naturally draw from marketing, design, product, and support divisions

### Single-phase project
If requirements are small enough for one phase, that's fine. Create a single phase with 1-2 plans. Don't pad with artificial phases.

### User changes their mind mid-flow
If the user contradicts something from an earlier stage, update the captured data. Always use the latest stated preference. Note the pivot in `{decisions_table}` if it's significant.
