---
name: legion:explore
description: Enter pre-flight alignment mode with Polymath — crystallize ideas, onboard to codebases, compare approaches, or debate decisions
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, AskUserQuestion]
---

<objective>
Guide the user through structured exploration in one of four modes: crystallize (default — transform ideas into project concepts), onboard (guided codebase familiarization), compare (side-by-side approach evaluation), or debate (opposing viewpoint exploration). Spawn Polymath agent to conduct research-first, choice-driven clarification.
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

## 2. MODE SELECTION

Present mode selection before spawning the Polymath agent.

- Use adapter.ask_user with structured choices:
  ```
  "Which exploration mode fits your goal?"
  → Crystallize (default): Transform a raw idea into a clear project concept
    Onboard: Get familiar with an existing codebase through guided exploration
    Compare: Evaluate multiple approaches side-by-side with decision capture
    Debate: Explore a question from opposing viewpoints with winner tracking
  ```
- Store selected mode in exploration state as `mode: crystallize|onboard|compare|debate`
- Proceed to the mode-appropriate opening prompt in step 3

## 3. OPENING PROMPT

Capture the initial input based on selected mode.

### Crystallize mode (default)
- Display: "What are you exploring? Give me the raw idea — a sentence or two."
- Wait for user's initial concept (this is the ONE open input — everything after is structured choices)
- Capture this as the exploration topic
- Validate: if concept is extremely vague (less than 5 words), ask for slightly more detail

**Example good inputs**:
- "A dashboard for tracking personal finances"
- "Redesign the checkout flow for our e-commerce app"
- "Build a CLI tool for managing AWS resources"

### Onboard mode
- If `.planning/CODEBASE.md` exists, present structured choices from the codebase analysis:
  ```
  "Which area do you want to explore?"
  → Full codebase overview: Get oriented with the entire project
    [Area 1 from CODEBASE.md]: [description]
    [Area 2 from CODEBASE.md]: [description]
    Specific file or directory: I know what I'm looking for
  ```
- If no CODEBASE.md exists: Display "Which codebase or area do you want to explore?"
- Wait for user's selection or input
- Capture as the onboard target

### Compare mode
- Display: "What alternatives are you evaluating?"
- Wait for user's input naming the concepts/approaches to compare
- Capture as the comparison topic

### Debate mode
- Display: "What question or decision are you exploring?"
- Wait for user's input describing the debate topic
- Capture as the debate question

## 4. SPAWN POLYMATH AGENT

Spawn the Polymath agent with the exploration context.

### Provide Polymath with:
1. **The user's raw concept** — verbatim what they said
2. **The selected mode** — crystallize, onboard, compare, or debate
3. **Access to tools**: Read, Write, Edit, Bash, Grep, Glob (standard set)
4. **Explicit instruction**: "Use structured choices only. No open-ended questions. Research first, then ask."
5. **Time limit reminder**: "Maximum 5-7 exchanges before decision point."

### Spawn command structure
```
Spawn agent: polymath
Instructions: |
  You are Polymath, the crystallization specialist.

  Mode: {selected_mode}
  Exploration topic: "{user's raw concept or onboard target}"

  Your mission: Guide the user through structured exploration.

  MODE-SPECIFIC BRIEFING:
  - crystallize: Transform a raw idea into a clear project concept. Use standard crystallize workflow.
  - onboard: Guide codebase familiarization through progressive exploration. Use onboard workflow phases.
  - compare: Evaluate alternatives side-by-side. Structure around criteria and trade-offs.
  - debate: Explore opposing viewpoints. Track arguments for/against and determine winner.

  CRITICAL RULES:
  1. NO OPEN-ENDED QUESTIONS — only structured choices with arrow keys + Enter
  2. RESEARCH FIRST — use Grep/Glob/Read before asking anything
  3. TIME-BOXED — maximum 5-7 exchanges, then force decision
  4. SHOW YOUR WORK — reference research findings in choices
  5. FOLLOW MODE WORKFLOW — use the workflow phases defined for {selected_mode} mode

  Begin with Phase 1: Research (silent), then Phase 2: Opening Exchange.
```

### Handoff
- Polymath takes over the conversation from here
- Command steps back and monitors
- Command does NOT interfere with Polymath's structured choice flow

## 5. POLYMATH CONDUCTS EXPLORATION

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

## 6. DECISION POINT

Polymath presents final structured choice after 5-7 exchanges.

### Mode-specific decision options:

#### Crystallize mode (default):
> We've explored your concept. Time to decide:
>
> - [A] **Proceed to planning** — crystallized enough, ready for `/legion:start`
> - [B] **Explore more** — specific area needs deeper investigation
> - [C] **Park for now** — not ready, capture what we know and exit

#### Onboard mode:
> We've explored this area. Time to decide:
>
> - [A] **Familiarized** — I have a solid understanding, ready to work
> - [B] **Explore deeper** — want to go deeper into a specific area
> - [C] **Switch area** — want to explore a different part of the codebase

#### Compare mode:
> We've evaluated the alternatives. Time to decide:
>
> - [A] **Decision made** — I've chosen an approach, ready to proceed
> - [B] **Need more options** — want to add or evaluate more alternatives
> - [C] **Refine criteria** — the evaluation criteria need adjustment

#### Debate mode:
> We've examined the viewpoints. Time to decide:
>
> - [A] **Winner clear** — one side is convincingly stronger
> - [B] **Need more evidence** — want to explore additional arguments
> - [C] **Declare tie** — both sides have equal merit, capture the nuance

### Crystallize mode outcomes:

#### If "Proceed to planning" selected:
- Save crystallized output to `.planning/exploration-{name}.md` (automatic — never skip)
  - Use a slugified version of the concept as {name} (e.g., "finance-dashboard")
  - Follow the document structure from polymath-engine Section 5
- Display crystallized summary from Polymath
- Confirm readiness: "Ready to run `/legion:start` with this concept?"
- If yes: Transition to `/legion:start` flow with pre-populated concept

#### If "Explore more" selected:
- Save current exploration progress to `.planning/exploration-{name}.md` (automatic — capture partial state)
- Ask: "Which area needs deeper exploration?"
- Present specific sub-topics as structured choices:
  - Technical approach
  - Scope boundaries
  - User/audience definition
  - Timeline/constraints
  - Dependencies
- Loop back to step 5 with narrowed scope (limit 2-3 more exchanges)
- After narrowed exploration completes, update the saved exploration file with new findings

#### If "Park for now" selected:
- Save crystallized output to `.planning/exploration-{name}.md` (automatic — always persist)
- Display summary of what was crystallized
- Exit gracefully with guidance on next steps

### Onboard mode outcomes:

#### If "Familiarized" selected:
- Save onboard summary to `.planning/exploration-{name}.md` using onboard deliverable template
- Display codebase overview, key files, architecture patterns, conventions discovered
- Suggest next action: "Ready to work on this area, or explore a related part?"

#### If "Explore deeper" selected:
- Save current onboard progress to `.planning/exploration-{name}.md`
- Present specific sub-areas as structured choices based on what was discovered
- Loop back to step 5 with narrowed scope (limit 2-3 more exchanges)

#### If "Switch area" selected:
- Save current onboard progress to `.planning/exploration-{name}.md`
- Return to step 3 (opening prompt) with onboard mode pre-selected
- Previous exploration context is preserved for cross-reference

### Compare mode outcomes:

#### If "Decision made" selected:
- Save comparison summary with winner and rationale to `.planning/exploration-{name}.md`
- Display decision matrix and recommendation
- Suggest next action: "Ready to proceed with the chosen approach?"

#### If "Need more options" selected:
- Save current comparison state
- Return to evaluation with space for new alternatives

#### If "Refine criteria" selected:
- Save current comparison state
- Present criteria adjustment choices, then re-evaluate

### Debate mode outcomes:

#### If "Winner clear" selected:
- Save debate summary with winner, arguments, and evidence to `.planning/exploration-{name}.md`
- Display final verdict with supporting arguments

#### If "Need more evidence" selected:
- Save current debate state
- Continue with targeted research on weak points

#### If "Declare tie" selected:
- Save nuanced summary capturing both positions
- Present: "How do you want to handle the tie?" with options for hybrid approach, defer, or external input

## 7. HANDLE DECISION OUTCOME (all modes)

### Outcome: Proceed to planning (crystallize) / Familiarized (onboard) / Decision made (compare) / Winner clear (debate)

1. **Save exploration (automatic)**:
   - Write to `.planning/exploration-{name}.md` using polymath-engine Section 5 format
   - {name} is a slugified version of the concept (e.g., "finance-dashboard", "checkout-redesign")
   - This is NOT optional — exploration context must persist across sessions
   - Display: "Exploration saved to `.planning/exploration-{name}.md`"

2. Display Polymath's deliverables:
   - Crystallized Summary (1-2 paragraphs)
   - Knowns List
   - Unknowns List
   - Decision Recommendation

3. Confirm transition:
   - "Ready to run `/legion:start` with this crystallized concept?"
   - Option 1: "Yes, start planning" → Transition to `/legion:start`
   - Option 2: "Review the summary first" → Display again
   - Option 3: "Explore a different idea" → Return to step 2

4. If proceeding to `/legion:start`:
   - Pre-populate the "What are you building?" question with crystallized summary
   - Skip to brownfield detection or questioning stages as appropriate
   - Note: "Concept crystallized via `/legion:explore`"

### Outcome: Explore more (crystallize) / Explore deeper (onboard) / Need more options (compare) / Need more evidence (debate)

1. Identify specific area:
   - "Which area needs deeper exploration?"
   - Present structured choices for sub-topics (mode-appropriate)

2. Set scope:
   - "2-3 more exchanges on this topic, then decision"

3. Loop back to step 5:
   - Polymath continues with narrowed focus
   - Track additional exchanges
   - Force decision after 2-3 more exchanges (total max 10)

### Outcome: Park for now (crystallize) / Switch area (onboard) / Refine criteria (compare) / Declare tie (debate)

1. **Save exploration (automatic)**:
   - Write to `.planning/exploration-{name}.md` using polymath-engine Section 5 format
   - This is NOT optional — exploration context must persist across sessions
   - Display: "Exploration saved to `.planning/exploration-{name}.md`"

2. Display what was learned:
   - Crystallized Summary so far
   - Knowns (what's clear)
   - Unknowns (what remains unclear)

3. Exit message:
   - "Exploration parked. When you're ready, run `/legion:explore` again or go directly to `/legion:start` if clarity emerges."

## 8. COMPLETION

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
- **Do NOT skip saving exploration output** — always write to `.planning/exploration-{name}.md` regardless of outcome (Proceed, Explore more, Park). Context loss across sessions is the #1 user complaint.
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
