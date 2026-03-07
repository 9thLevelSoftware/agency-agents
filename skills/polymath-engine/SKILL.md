---
name: legion:polymath-engine
description: Execution engine for structured exploration workflows — research-first clarification with gap detection and decision support
triggers: [explore, clarify, crystallize, pre-flight, alignment]
token_cost: medium
summary: "Research-first exploration engine: investigates domain, detects knowledge gaps, guides structured choices, produces crystallized output. Implements Polymath agent workflow."
---

# Polymath Engine

Execution engine for pre-flight alignment workflows. Consumed by `/legion:explore` and potentially other exploration contexts. Implements the research-first, structured-choice methodology defined in `agents/polymath.md`.

---

## Section 1: Research Phase (Silent)

**Purpose:** Gather context BEFORE interacting with the user.

**When to run:** Automatically at the start of every exploration session.

**Research checklist:**

1. **Codebase scan** — Does this build on existing code?
   ```bash
   # Search for relevant files based on user's concept keywords
   grep -r "keyword" --include="*.js" --include="*.ts" --include="*.py" --include="*.md" . 2>/dev/null | head -20
   ```
   - Look for: existing implementations, similar features, reusable components
   - Document: what exists, what patterns are established

2. **Documentation scan** — What does Legion already know?
   - Read `.planning/PROJECT.md` if exists (existing project context)
   - Read `.planning/CODEBASE.md` if exists (brownfield mappings)
   - Read relevant skill files matching the domain (grep `triggers:` for keywords)
   - Check `.planning/memory/` for patterns from past projects

3. **External research** — Is this a known domain?
   - If domain-specific (e.g., "OAuth", "WebRTC", "Kubernetes"): use WebSearch or WebFetch
   - If library/framework mentioned: check for best practices
   - Document: standard approaches, common pitfalls

**Research output format:**
```markdown
## Research Findings

**Codebase:**
- Found: [files/patterns]
- Relevant to exploration: [how it relates]

**Documentation:**
- Existing project: [yes/no, summary if yes]
- Relevant skills: [list]
- Past patterns: [from memory if available]

**External:**
- Domain knowledge: [what we know about this space]
- Standard approaches: [common solutions]
- Potential pitfalls: [risks to flag]
```

**Critical rule:** Research must complete in under 2 minutes. If deeper research needed, flag as a gap to explore, don't block the conversation.

---

## Section 2: Structured Choice Protocol

**Purpose:** Every user interaction is a selection, not composition.

**Choice format:**
```markdown
[Brief context — 1-2 sentences]

Which describes your situation?
→ [Option A]: [Clear description]
  [Option B]: [Clear description]
  [Option C]: [Clear description]
  [Option D]: Not sure / None of these
```

**Choice design principles:**

1. **Mutually exclusive** — Options shouldn't overlap
2. **Collectively exhaustive** — Include "Other/Not sure" for gaps
3. **Concrete** — Avoid vague options like "It depends"
4. **Actionable** — Each choice should lead to a clear next step
5. **Research-informed** — Reference findings: "Based on [research result], which applies?"

**Arrow keys + Enter implementation:**
- Use adapter.ask_user with choice list
- Each choice has explicit ID for tracking
- Capture selection in exploration state

**Anti-patterns to reject:**
- Open text fields
- "Tell me more" prompts
- Vague options like "Something else"
- Questions requiring user research (that's Polymath's job)

---

## Section 3: Knowledge Gap Detection

**Purpose:** Identify and categorize what's still unknown.

**Gap categories:**

| Category | Description | Example |
|----------|-------------|---------|
| Technical | Stack/technology unknowns | "Which database?" |
| Scope | Feature boundary unclear | "MVP vs full feature?" |
| Constraint | Limitations undefined | "Timeline? Budget?" |
| Dependency | External requirements | "Need API access?" |
| Risk | Potential blockers | "Compliance requirements?" |

**Onboard gap categories:**

| Category | Description | Example |
|----------|-------------|---------|
| Architecture | Structural patterns unclear | "How do modules communicate?" |
| Convention | Coding standards undefined | "What naming convention is used?" |
| Dependency | Package purposes unknown | "Why is this library included?" |
| Setup | Environment configuration unclear | "How to run this locally?" |
| History | Design decision rationale missing | "Why was this pattern chosen?" |

**Gap detection workflow:**

1. **Track stated vs implied**
   - User stated: captured in choices selected
   - User implied: inferred from context
   - What's missing: gaps = (what's needed) - (stated + implied)

2. **Surface gaps explicitly**
   ```markdown
   I've captured:
   - [what we know]
   
   Still unclear:
   - [Gap 1]: [category] — [specific question]
   
   Which describes [Gap 1]?
   → [Option A]
     [Option B]
     [Option C]
   ```

3. **Force resolution or acceptance**
   - Every gap must be either: answered, explicitly deferred, or flagged as blocker
   - No "we'll figure it out later" — that's a deferral decision

**Gap resolution patterns:**
- **Answered:** User selects specific option → documented
- **Deferred:** User selects "Decide later" → added to "Deferred Decisions" list
- **Blocker:** User selects "Don't know yet" → may trigger "Park" recommendation

---

## Section 4: Exchange Management

**Purpose:** Keep exploration bounded and purposeful.

**Exchange limit:** Maximum 7 exchanges (research doesn't count as exchange).

**Exchange tracking:**
```yaml
exchange: 3/7
topic: scope-prioritization
previous_choices:
  - exchange-1: greenfield-vs-brownfield → greenfield
  - exchange-2: domain-type → web-application
  - exchange-3: scope-level → [current]
```

**Exchange types:**

| Exchange # | Purpose | Typical Choices |
|------------|---------|-----------------|
| 1 | Orient | Greenfield/brownfield, domain type |
| 2-3 | Clarify | Scope level, key features, constraints |
| 4-5 | Gap fill | Technical stack, timeline, dependencies |
| 6 | Confirm | Verify understanding, surface any final gaps |
| 7 | Decide | Proceed / Explore more / Park |

**Onboard exchange pattern:**

| Exchange # | Purpose | Typical Choices |
|------------|---------|-----------------|
| 1 | Depth selection | Overview / Architecture / Code walkthrough |
| 2-3 | Area exploration | Directory focus, pattern investigation |
| 4-5 | Deep dive | Specific files, data flow, dependency chains |
| 6 | Knowledge check | Validate understanding of key concepts |
| 7 | Decide | Familiarized / Explore deeper / Switch area |

**Early exit conditions:**
- User explicitly requests exit (save progress option)
- Crystallization achieved early (offer early decision)
- Blocker discovered (recommend park)

---

## Section 5: Crystallization Output

**Purpose:** Produce clear, actionable summary of exploration.

**Output format:** Exploration Summary Document

**Document structure** (saved to `.planning/exploration-{timestamp}.md`):

```markdown
# Exploration Summary — {timestamp}

## Raw Concept
{User's original input}

## Crystallized Summary
{2-3 sentence clear description of what this project actually is}

## Knowns
- [Confirmed fact 1]
- [Confirmed fact 2]
- ...

## Unknowns / Deferred
- [Gap 1]: [category] — [current status: deferred/pending/blocker]
- ...

## Decisions Made
| Choice | Selection | Rationale |
|--------|-----------|-----------|
| [question] | [answer] | [why] |

## Research Applied
- [What was checked]: [what was found]
- ...

## Recommendation
{Polymath's recommendation: proceed, narrow scope, or park}

## Next Action
{Specific next step based on decision}
```

**Onboard deliverable template** (saved to `.planning/exploration-{name}.md`):

```markdown
# Onboard Summary — {name}

## Onboard Target
{Codebase area or project that was explored during onboard session}

## Codebase Overview
{2-3 paragraph high-level description of what this project/area is and how it works — the core onboard output}

## Key Files & Directories
| Path | Purpose | Importance |
|------|---------|------------|
| [path] | [what it does] | Critical / Important / Reference |

## Architecture Patterns
- Pattern: [name] — [how it's used in this codebase]
- Data flow: [how data moves through the system]
- Key abstractions: [interfaces, base classes, extension points]

## Conventions
- Naming: [file, function, variable conventions]
- Structure: [code organization patterns]
- Style: [formatting, documentation patterns]

## Dependencies
| Package | Role | Critical? |
|---------|------|-----------|
| [name] | [why it's used] | Yes/No |

## Knowledge Gaps
- [Gap]: [category] — [what's unclear] — [suggested investigation]

## Next Steps
- [Immediate action items]
- [Recommended files to read next]
- [Related areas to explore]

## Onboard Exploration Log
| Exchange | Topic | Key Finding |
|----------|-------|-------------|
| [#] | [what was explored during onboard] | [what was learned] |
```

**Decision outcomes:**

| Outcome | Trigger | Next Action |
|---------|---------|-------------|
| **Proceed** | Clear concept, minimal gaps | Transition to `/legion:start` with crystallized input |
| **Explore More** | Specific area needs deeper dive | Start new exploration with narrowed scope |
| **Park** | Too many unknowns, blockers identified | Save summary, suggest prerequisites |

---

## Section 6: Integration Points

**Consumed by:**
- `/legion:explore` command — primary entry point
- Potentially: `/legion:start` (optional pre-start exploration)

**Consumes:**
- `agents/polymath.md` — personality and voice
- `skills/questioning-flow` — choice structure patterns
- `skills/agent-registry` — for domain-specific agent recommendations

**Produces:**
- `.planning/exploration-{timestamp}.md` — exploration artifacts
- Input to `/legion:start` — crystallized project concept

---

## Section 7: State Management

**Exploration state** (maintained in conversation):

```yaml
exploration:
  started_at: timestamp
  mode: crystallize|onboard|compare|debate
  raw_concept: string
  exchange_count: number
  exchanges:
    - number: 1
      topic: string
      choices: [options]
      selected: option_id
  knowns: [list]
  gaps:
    - category: string
      question: string
      status: open|answered|deferred|blocker
  research_findings: string
  decision: pending|proceed|explore_more|park
```

**Onboard-specific state extensions:**

```yaml
exploration:
  mode: onboard
  onboard:
    target_area: string            # codebase area being explored
    depth: overview|architecture|code_walkthrough
    areas_explored: [list]         # directories/files already covered
    areas_remaining: [list]        # directories/files not yet explored
    patterns_found: [list]         # architecture patterns discovered
    conventions_found: [list]      # coding conventions identified
    validation_results:            # knowledge check outcomes
      - topic: string
        correct: boolean
        correction: string|null
```

---

**Usage:**
This skill is not invoked directly. The `/legion:explore` command instantiates this engine and the Polymath agent together.
