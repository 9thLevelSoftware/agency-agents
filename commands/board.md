---
name: legion:board
description: Convene a board of directors for governance decisions
argument-hint: "/legion:board meet <topic>   — Full deliberation on a proposal\n/legion:board review         — Quick parallel assessments of current phase\n"
allowed-tools: [Agent, Bash, Read, Write, Glob, Grep, AskUserQuestion, TaskCreate, TaskUpdate, TaskList]
---

<objective>
Convene a governance board for high-stakes decisions. Two modes: `meet` for full 5-phase deliberation (board composition → individual assessment → group discussion → vote → resolution), and `review` for quick parallel assessments of the current phase that aggregate into a summary table with scores and key concerns.
</objective>

<execution_context>
skills/workflow-common-core/SKILL.md
skills/agent-registry/SKILL.md
skills/board-of-directors/SKILL.md
skills/cli-dispatch/SKILL.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/PROJECT.md
</context>

<process>
0. CONDITIONAL SKILL LOADING (context budget)
   Load optional skills only when prerequisites are present:

   - `skills/workflow-common-memory/SKILL.md` only if `.planning/memory/` exists.

   - `skills/workflow-common-github/SKILL.md` only if `gh auth status` succeeds and a git remote exists.

   If a condition is not met, skip that skill silently and continue.

## Step 0: PARSE MODE AND TOPIC

1. **Parse Arguments**
   - Split `$ARGUMENTS` into tokens
   - First token is the mode: `"meet"` or `"review"`
   - Remaining tokens joined with spaces form the topic
   - Normalize mode to lowercase; treat unrecognized values as `"meet"`

2. **Validate Mode**
   - If mode is `"meet"` and topic is empty or blank:
     Use AskUserQuestion:
     ```
     question: "What topic should the board deliberate on?"
     options: []
     ```
     (free-text entry — no fixed options)
     Store the user's response as the topic.
   - If mode is `"review"`:
     Set topic to `"Current phase assessment"` if no topic was provided.

## Step 1: VALIDATE PROJECT STATE

1. Attempt to read `.planning/STATE.md`
   - If file does not exist: output the following and stop:
     ```
     No active project found. Run /legion:start to initialize a project before
     convening the board.
     ```
   - If file exists but contains no "Phase:" line: output the same message and stop.

2. Extract current phase number and project name from STATE.md for display context.

## Step 2: BOARD COMPOSITION

Follow board-of-directors skill Section 1 for the full composition protocol.

1. **Candidate Selection**
   Use the agent-registry recommendation engine to score agents against the topic:
   - Pass the topic string as the task description
   - Apply scoring: exact metadata match (3 pts), partial match (1 pt), division match (2 pts)
   - Apply memory boost if `.planning/memory/OUTCOMES.md` exists
   - Select top 5–7 candidates from diverse divisions as board candidates

2. **Present Candidates**
   Use AskUserQuestion to present the candidate slate:
   ```
   question: "Confirm board composition for: {topic}"
   options:
     - label: "Recommended slate" — {agent1}, {agent2}, {agent3}, {agent4}, {agent5}
     - label: "Custom composition" — Enter agent IDs manually
   ```
   Show for each candidate: agent name, division, and primary evaluation lens.

3. **Resolve Composition**
   - If "Recommended slate": use the 5 recommended agents as board members
   - If "Custom composition": prompt user for agent IDs, validate each exists in agent-registry

## Step 3: EXECUTE ASSESSMENT (PHASE 1)

Follow board-of-directors skill Section 2 for individual assessment dispatch.

1. **Construct Assessment Prompts**
   For each board member:
   a. Read the agent's personality file: `{AGENTS_DIR}/{agent-id}.md`
   b. Construct an assessment prompt:
      ```
      {PERSONALITY_CONTENT}
      ---
      # Board Assessment Task

      Topic: {topic}
      Mode: {MEET | REVIEW}
      Project Context: {summary from STATE.md and PROJECT.md}

      ## Your Assessment Instructions
      Evaluate the topic from your area of expertise. Provide:
      1. Your overall stance: SUPPORT / OPPOSE / CONDITIONAL / ABSTAIN
      2. Key strengths (up to 3 bullet points)
      3. Key concerns (up to 3 bullet points)
      4. Conditions or recommendations (if CONDITIONAL)
      5. Risk rating: LOW / MEDIUM / HIGH / CRITICAL

      Keep your assessment concise (200–400 words). Lead with your stance.
      ```

2. **Dispatch in Parallel**
   Use cli-dispatch skill to dispatch assessments:
   - If adapter supports parallel execution: issue all agent spawns simultaneously
   - If not: spawn sequentially
   - Model: adapter.model_execution
   - Agent name pattern: `"{agent-id}-board-assessment"`
   - Collect all results; treat non-response after timeout as ABSTAIN with note

3. **Parse Results**
   For each agent response, extract:
   - Stance (SUPPORT / OPPOSE / CONDITIONAL / ABSTAIN)
   - Strengths list
   - Concerns list
   - Conditions (if any)
   - Risk rating

## Step 4a: IF MEET MODE — PHASES 2–5

### Phase 2: Discussion
Follow board-of-directors skill Section 3.

1. **Synthesize Positions**
   - Group board members by stance
   - Identify the dominant position and dissenting voices
   - Extract cross-cutting concerns that appear in multiple assessments
   - Identify the highest-risk concerns flagged by any member

2. **Present Discussion Summary**
   Display:
   ```
   ## Board Discussion — {topic}

   Positions:
   | Agent              | Division    | Stance      | Risk    |
   |--------------------|-------------|-------------|---------|
   | {agent-name}       | {division}  | {SUPPORT}   | {LOW}   |
   | ...                | ...         | ...         | ...     |

   Cross-cutting Concerns:
   - {concern 1}
   - {concern 2}

   Points of Disagreement:
   - {disagreement 1}
   ```

### Phase 3: Vote
Follow board-of-directors skill Section 4.

1. **Tally Votes**
   - SUPPORT = 1 vote in favor
   - OPPOSE = 1 vote against
   - CONDITIONAL = 0.5 vote in favor (counted after conditions are noted)
   - ABSTAIN = 0 votes

2. **Determine Outcome**
   - Votes in favor > votes against: APPROVED (or APPROVED WITH CONDITIONS if any CONDITIONAL votes)
   - Votes against > votes in favor: REJECTED
   - Tie: ESCALATED — present tied decision to user for resolution via AskUserQuestion

3. **Display Vote Tally**
   ```
   ## Vote Tally

   In favor: {count} ({agent names})
   Against:  {count} ({agent names})
   Abstain:  {count} ({agent names})

   Outcome: {APPROVED | APPROVED WITH CONDITIONS | REJECTED | ESCALATED}
   ```

### Phase 4: Resolution
Follow board-of-directors skill Section 5.

1. **Draft Resolution Text**
   Based on the vote outcome, compose a resolution statement:
   - APPROVED: "The board approves {topic}. Motion carried {N}–{M}."
   - APPROVED WITH CONDITIONS: "The board conditionally approves {topic}, subject to: {conditions list}."
   - REJECTED: "The board rejects {topic}. Motion failed {N}–{M}. Key reasons: {top concerns}."
   - ESCALATED: Present the tie to the user and record their decision as the resolution.

2. **Display Resolution**
   ```
   ## Board Resolution

   {resolution text}

   Conditions (if any):
   - {condition 1}
   - {condition 2}
   ```

### Phase 5: Persistence
Follow board-of-directors skill Section 6.

1. **Write Decision Record**
   Create `.planning/board/{YYYY-MM-DD}-{topic-slug}.md`:
   ```markdown
   # Board Decision: {topic}

   **Date:** {YYYY-MM-DD}
   **Mode:** Meet
   **Outcome:** {APPROVED | APPROVED WITH CONDITIONS | REJECTED | ESCALATED}

   ## Board Composition
   {table of board members and stances}

   ## Resolution
   {resolution text}

   ## Conditions
   {conditions list, or "None"}

   ## Vote Record
   In favor: {count} — {agent names}
   Against: {count} — {agent names}
   Abstain: {count} — {agent names}

   ## Key Concerns Raised
   {cross-cutting concerns from discussion}
   ```

2. **Commit Decision Record**
   ```
   git add .planning/board/{filename}
   git commit -m "chore(board): record governance decision — {topic-slug}

   Outcome: {outcome}
   Board: {agent-name-list}
   Vote: {N}–{M}

   {adapter.commit_signature}"
   ```

3. **Display Confirmation**
   "Board decision recorded at `.planning/board/{filename}`"

## Step 4b: IF REVIEW MODE — QUICK SUMMARY

Follow board-of-directors skill Section 7 for the quick summary protocol.

1. **Aggregate Phase 1 Assessments**
   Compile all individual assessments into a consolidated summary table:
   ```
   ## Board Review — {topic}

   | Agent              | Division    | Stance      | Risk     | Top Concern                    |
   |--------------------|-------------|-------------|----------|--------------------------------|
   | {agent-name}       | {division}  | {SUPPORT}   | {LOW}    | {first concern}                |
   | ...                | ...         | ...         | ...      | ...                            |

   Overall Risk: {highest risk rating across all members}
   Dominant Stance: {most common stance}

   Key Concerns Across Board:
   - {concern appearing in 2+ assessments}
   - {concern appearing in 2+ assessments}

   Recommendations:
   - {aggregated recommendations}
   ```

2. **No Persistence in Review Mode**
   Review mode does not write a decision record or commit. It is informational only.

## Step 5: ROUTE TO NEXT ACTION

Based on the outcome, display the appropriate routing message:

- **APPROVED**:
  ```
  Board approved: {topic}
  Proceed with implementation. No conditions to address.
  Next: Run /legion:build to execute the current phase plan.
  ```

- **APPROVED WITH CONDITIONS**:
  ```
  Board approved with conditions: {topic}
  Address the following before proceeding:
  {conditions list — numbered}
  Next: Resolve conditions, then run /legion:build.
  ```

- **REJECTED**:
  ```
  Board rejected: {topic}
  Key reasons:
  {top 3 concerns from opposing votes}
  Suggested alternatives:
  - Revise the proposal addressing the key concerns above
  - Run /legion:advise {topic} for expert consultation on alternatives
  - Bring a modified proposal back to the board with /legion:board meet {revised-topic}
  ```

- **ESCALATED** (tie in MEET mode):
  Use AskUserQuestion:
  ```
  question: "The board is tied. As chair, how do you vote on: {topic}?"
  options:
    - label: "APPROVE" — Cast the deciding vote in favor
    - label: "REJECT" — Cast the deciding vote against
    - label: "TABLE" — Defer decision; no action taken now
  ```
  Record the user's casting vote as the final resolution and update the decision record.

- **REVIEW mode** (no formal vote):
  ```
  Board review complete.
  Overall risk: {risk}
  Dominant stance: {stance}
  Next: Review concerns above, then proceed or escalate as needed.
  ```
</process>
