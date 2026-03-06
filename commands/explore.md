---
name: legion:explore
description: Enter pre-flight alignment mode with Polymath to crystallize ideas before formal planning
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, AskUserQuestion]
---

<objective>
Guide the user through structured exploration to crystallize raw ideas into clear project concepts. Spawn Polymath agent to conduct research-first, choice-driven clarification before committing to formal planning.
</objective>

<execution_context>
skills/questioning-flow/SKILL.md
agents/polymath.md
</execution_context>

<context>
@.planning/PROJECT.md (if exists — check first before proceeding)
@.planning/ROADMAP.md (if exists — check first before proceeding)
@.planning/STATE.md (if exists — provides project state context)
</context>

<process>
## 1. PRE-FLIGHT CHECK

First, determine if exploration is appropriate given current state.

### Check for existing project
- Attempt to read `.planning/PROJECT.md`
- If it exists: Use AskUserQuestion to confirm continuation
  - Message: "A project already exists. Exploration will clarify your NEXT idea, not replace the existing project. Continue?"
  - Option 1: "Yes, explore a new idea" — proceed to step 2
  - Option 2: "No, cancel" — abort exploration, suggest `/legion:status` to review current project
  - Option 3: "I want to modify the existing project" — abort, suggest `/legion:plan` to add phases
- If no project exists: proceed directly to step 2

### Check for exploration notes
- Look for `.planning/exploration-*.md` files
- If found: Offer to resume from previous exploration or start fresh

## 2. OPENING PROMPT

Capture the raw concept that needs crystallization.

- Display: "What are you exploring? Give me the raw idea — a sentence or two."
- Wait for user's initial concept (this is the ONE open input — everything after is structured choices)
- Capture this as the exploration topic
- Validate: if concept is extremely vague (less than 5 words), ask for slightly more detail

**Example good inputs**:
- "A dashboard for tracking personal finances"
- "Redesign the checkout flow for our e-commerce app"
- "Build a CLI tool for managing AWS resources"

## 3. SPAWN POLYMATH AGENT

Spawn the Polymath agent with the exploration context.

### Provide Polymath with:
1. **The user's raw concept** — verbatim what they said
2. **Access to tools**: Read, Write, Edit, Bash, Grep, Glob (standard set)
3. **Explicit instruction**: "Use structured choices only. No open-ended questions. Research first, then ask."
4. **Time limit reminder**: "Maximum 5-7 exchanges before decision point."

### Spawn command structure
```
Spawn agent: polymath
Instructions: |
  You are Polymath, the crystallization specialist.
  
  Exploration topic: "{user's raw concept}"
  
  Your mission: Guide the user through structured exploration.
  
  CRITICAL RULES:
  1. NO OPEN-ENDED QUESTIONS — only structured choices with arrow keys + Enter
  2. RESEARCH FIRST — use Grep/Glob/Read before asking anything
  3. TIME-BOXED — maximum 5-7 exchanges, then force decision
  4. SHOW YOUR WORK — reference research findings in choices
  
  Begin with Phase 1: Research (silent), then Phase 2: Opening Exchange.
```

### Handoff
- Polymath takes over the conversation from here
- Command steps back and monitors
- Command does NOT interfere with Polymath's structured choice flow

## 4. POLYMATH CONDUCTS EXPLORATION

Polymath executes its 5-phase workflow:

### Phase 1: Research (silent)
- Polymath searches codebase using Grep and Glob
- Reads relevant skills and existing documentation
- Synthesizes findings internally

### Phase 2-4: Structured exchanges
- Polymath presents 2-5 structured choices (arrow keys + Enter)
- User selects options
- Polymath updates understanding, tracks knowns/unknowns
- If gaps emerge, brief research (1-2 tools max) then next choices

### Exchange tracking
- Polymath tracks exchange count internally
- After each exchange, progress toward the 5-7 limit
- Command monitors but doesn't intervene

### Intervention triggers
Only intervene if:
- Polymath asks an open-ended question (violation) → Correct: "Polymath, use structured choices"
- User is stuck for >60 seconds → Offer: "Need help deciding?"
- Exchange count reaches 7 without decision point → Remind Polymath

## 5. DECISION POINT

Polymath presents final structured choice after 5-7 exchanges.

### Standard decision options:
> We've explored your concept. Time to decide:
>
> - [A] **Proceed to planning** — crystallized enough, ready for `/legion:start`
> - [B] **Explore more** — specific area needs deeper investigation
> - [C] **Park for now** — not ready, capture what we know and exit

### If "Proceed to planning" selected:
- Display crystallized summary from Polymath
- Confirm readiness: "Ready to run `/legion:start` with this concept?"
- If yes: Transition to `/legion:start` flow with pre-populated concept

### If "Explore more" selected:
- Ask: "Which area needs deeper exploration?"
- Present specific sub-topics as structured choices:
  - Technical approach
  - Scope boundaries
  - User/audience definition
  - Timeline/constraints
  - Dependencies
- Loop back to step 4 with narrowed scope (limit 2-3 more exchanges)

### If "Park for now" selected:
- Display summary of what was crystallized
- Optionally save to `.planning/exploration-{timestamp}.md`
- Exit gracefully with guidance on next steps

## 6. HANDLE DECISION OUTCOME

### Outcome: Proceed to planning

1. Display Polymath's deliverables:
   - Crystallized Summary (1-2 paragraphs)
   - Knowns List
   - Unknowns List
   - Decision Recommendation

2. Confirm transition:
   - "Ready to run `/legion:start` with this crystallized concept?"
   - Option 1: "Yes, start planning" → Transition to `/legion:start`
   - Option 2: "Review the summary first" → Display again
   - Option 3: "Explore a different idea" → Return to step 2

3. If proceeding to `/legion:start`:
   - Pre-populate the "What are you building?" question with crystallized summary
   - Skip to brownfield detection or questioning stages as appropriate
   - Note: "Concept crystallized via `/legion:explore`"

### Outcome: Explore more

1. Identify specific area:
   - "Which area needs deeper exploration?"
   - Present structured choices for sub-topics

2. Set scope:
   - "2-3 more exchanges on this topic, then decision"

3. Loop back to step 4:
   - Polymath continues with narrowed focus
   - Track additional exchanges
   - Force decision after 2-3 more exchanges (total max 10)

### Outcome: Park for now

1. Display what was learned:
   - Crystallized Summary so far
   - Knowns (what's clear)
   - Unknowns (what remains unclear)

2. Optional save:
   - "Save exploration notes for later?"
   - If yes: Write to `.planning/exploration-{timestamp}.md`

3. Exit message:
   - "Exploration parked. When you're ready, run `/legion:explore` again or go directly to `/legion:start` if clarity emerges."

## 7. COMPLETION

Display exploration summary:

```
## Exploration Complete

**Concept**: [crystallized summary]

**Decision**: [Proceed | Explore more | Park]

**Knowns**:
- [known 1]
- [known 2]

**Unknowns**:
- [unknown 1] — [resolution path]

**Next Action**:
[Proceed → Run `/legion:start`]
[Explore more → Continue with sub-topic]
[Park → Resume later via `/legion:explore`]
```

### Success indicators
- [ ] User made clear decision
- [ ] Zero open-ended questions from Polymath
- [ ] Research informed significant choices
- [ ] User feels clearer than at start
- [ ] Clear next action defined
</process>

<decision_matrix>
| Situation | Action |
|-----------|--------|
| User provides vague initial concept | Polymath forces prioritization with structured choices; command validates input has minimum detail |
| Research reveals existing similar code | Polymath asks: build on it or start fresh? Command monitors for scope alignment |
| User keeps expanding scope | Polymath forces selection: "Pick ONE most important outcome" — command supports enforcement |
| 7 exchanges reached without clarity | Polymath forces decision: proceed, narrow scope, or park — command confirms final choice |
| User wants to exit mid-exploration | Offer: save progress, discard, or continue — command handles persistence |
| Polymath violates "no open-ended questions" | Command intervenes: "Use structured choices only" — agent corrects |
| User asks clarifying question | Polymath can answer briefly, but must return to structured choices quickly |
</decision_matrix>

<anti_patterns>
- **Do NOT skip the opening prompt** — user must provide initial concept (the only open input)
- **Do NOT let exploration continue indefinitely** — max 7 exchanges (10 if "explore more" selected once)
- **Do NOT let Polymath ask open-ended questions** — verify structured choices format
- **Do NOT automatically proceed to planning** — explicit user decision required at step 5
- **Do NOT save exploration notes without permission** — always ask before writing files
- **Do NOT override Polymath's choices** — command orchestrates, agent makes decisions
</anti_patterns>

<example_flow>
**User**: `/legion:explore`

**Command**: "What are you exploring? Give me the raw idea — a sentence or two."

**User**: "A tool to convert markdown to PDF with custom styling"

**[Polymath spawns, conducts research silently]**

**Polymath**: "I found several markdown-processing libraries in your codebase. Which describes your situation?
- [A] New standalone tool
- [B] Add to existing documentation system
- [C] Replace current PDF generation
- [D] Not sure yet"

**[User selects with arrow keys + Enter, exchanges continue...]**

**Polymath (Exchange 6)**: "Final decision time. Which best describes your readiness?
- [A] **Proceed** — I have clarity, ready for `/legion:start`
- [B] **Explore more** — need to investigate styling options deeper
- [C] **Park** — capturing what we know, will revisit later"

**[User selects, command handles outcome]**
</example_flow>

---

**Integration Notes**:
- This command is thin orchestration — Polymath agent does the heavy lifting
- All intelligence lives in the agent personality (`agents/polymath.md`)
- Command just handles entry/exit, state transitions, and persistence
- **Structured choices are the key pattern** — every user interaction after step 2 is selection, not composition
- **Arrow keys + Enter** is the interaction model enforced throughout

**Related Commands**:
- `/legion:start` — Formal planning (destination after exploration)
- `/legion:status` — Check existing project state (if exploration aborted)
- `/legion:plan` — Direct planning without exploration

**Version**: 1.0.0
**Created**: Phase 36 — Polymath Integration
