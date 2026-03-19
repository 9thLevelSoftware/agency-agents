---
name: legion:board-of-directors
description: Governance escalation tier with dynamic agent panels, deliberation, voting, and audit persistence
triggers: [board, directors, governance, deliberation, vote, escalation]
token_cost: high
summary: "Assembles dynamic board from built-in agents, runs 5-phase deliberation (assess → discuss → vote → resolve → persist), produces auditable governance decisions."
---

# Board of Directors

Governance deliberation protocol for Legion. Assembles a dynamic board of agent specialists, runs a structured 5-phase decision process (assess, discuss, vote, resolve, persist), and produces auditable governance artifacts. This is a governance escalation tier SEPARATE from `/legion:review` -- use it for strategic decisions, architecture debates, and cross-cutting concerns that need multi-perspective deliberation rather than code review.

References:
- Agent recommendation engine from `agent-registry.md` Section 3 (4-layer scoring)
- Memory integration from `memory-manager.md` (outcome recording)
- Wave execution patterns from `wave-executor.md` (parallel dispatch)
- Adapter model tiers from `workflow-common.md` (Cost Profile Convention)

---

## Section 1: Board Composition

How to assemble a governance board dynamically from the 53-agent pool based on the topic under deliberation.

```
Input: topic (string — the proposal or question for the board to deliberate)
Output: confirmed board members (list of 3-5 agent-ids with assigned evaluation lenses)

Step 1: Extract domain signals from the topic
  Parse the topic text and extract:
  - Languages mentioned (e.g., TypeScript, Python, Rust)
  - Frameworks mentioned (e.g., React, Laravel, Next.js)
  - Phase type indicators (engineering, design, marketing, testing, product, infrastructure)
  - Keywords for semantic matching (e.g., "scalability", "security", "migration", "UX")
  Combine into a composite task description for the recommendation algorithm.

Step 2: Score all agents using agent-registry Section 3 (4-layer scoring)
  Pass the composite task description to the recommendation engine:
  - Layer 1 (Semantic): Map topic keywords to normalized concepts, match against agent task_types
  - Layer 2 (Heuristic): Break ties with exact/partial task-type, specialty, and division alignment
  - Layer 3 (Metadata): Boost agents whose frontmatter review_strengths, languages, frameworks,
    or artifact_types match the extracted domain signals
  - Layer 4 (Memory): If .planning/memory/OUTCOMES.md exists, apply memory boost and archetype
    boost for agents with strong track records on matching task types

Step 3: Select top candidates
  - Read board.default_size from settings.json (default: 5)
  - Read board.min_size from settings.json (default: 3)
  - Take the top N agents from the scored list (N = board.default_size)
  - Diversity rule: no more than 2 agents from the same division. If 3+ agents from one
    division score highest, keep the top 2 and pull the next-highest from a different division.
  - For each candidate, extract their review_strengths from agent frontmatter — these become
    the agent's evaluation lenses for Phase 1.

Step 4: Under-population handling
  If fewer than board.min_size agents qualify (score above zero after 4-layer scoring):
  - Warn user: "Only {count} agents scored above zero for topic '{topic}'.
    Minimum board size is {board.min_size}."
  - Present options via AskUserQuestion:
    a) "Proceed with smaller board" — allowed only if count >= 2 (absolute floor).
       If count < 2: this option is not offered. Display: "Cannot form a board with
       fewer than 2 members. Broaden the topic or manually select agents."
    b) "Manually select additional agents" — show the full agent catalog grouped by
       division, let user pick agents to add to the board.
  - If user opts for (a) with count >= 2: proceed with the smaller board.
  - If user opts for (b): add selected agents, skip scoring for manual additions.

Step 5: Present candidates to user for confirmation
  Display via AskUserQuestion:

  ## Board of Directors — {topic}

  **Board Size**: {count} members (from settings.board.default_size = {default_size})
  **Topic**: {topic}

  | # | Agent | Division | Evaluation Lenses | Score |
  |---|-------|----------|-------------------|-------|
  | 1 | {agent-id} | {division} | {review_strengths from frontmatter} | {total score} |
  | 2 | {agent-id} | {division} | {review_strengths from frontmatter} | {total score} |
  | ... | ... | ... | ... | ... |

  **Why this board**: {1-2 sentence rationale linking topic signals to selected agents}

  Options:
  - "Convene this board" (Recommended)
  - "Replace a member" — swap one agent for an alternative from the ranked list
  - "Add a member" — add one more agent (up to board.default_size if currently under-sized)
  - "Remove a member" — drop one agent (must stay at or above board.min_size)
  - "Other" — enter custom agent IDs manually

  If user selects "Replace a member": show which member to replace and the next-ranked alternatives
  If user selects "Add a member": show the next-ranked agent not already on the board
  If user selects "Remove a member": show which member to remove, confirm board stays >= board.min_size
  If user selects "Other": accept custom agent IDs, validate each exists, assign default evaluation
    lenses from their frontmatter review_strengths

Step 6: Lock the board
  - Record the confirmed board members, their evaluation lenses, and the topic
  - This board composition is fixed for all 5 phases — no changes mid-deliberation
```

---

## Section 2: Phase 1 — Independent Assessment (Parallel)

Each board member evaluates the proposal independently before any cross-member discussion.

```
Input: confirmed board members, topic, proposal context
Output: one assessment per board member in the standardized format

Step 1: Construct assessment prompts
  For each board member:
  a. Load the agent's full personality file from {AGENTS_DIR}/{agent-id}.md
     (AGENTS_DIR resolved via workflow-common Agent Path Resolution Protocol)
  b. Extract the agent's review_strengths from frontmatter — these are the
     evaluation lenses for this member's assessment
  c. Construct the assessment prompt:

  """
  {PERSONALITY_CONTENT — full agent .md file, no truncation}

  ---

  # Board of Directors — Independent Assessment

  You are serving on a Board of Directors convened to evaluate the following proposal.
  Assess it independently — do not assume other board members agree or disagree with you.

  ## Topic
  {topic}

  ## Proposal Context
  {proposal details, relevant files, architecture description, or decision context}

  ## Your Evaluation Lenses
  You must evaluate through each of these lenses (from your review_strengths):
  {For each review_strength:}
  - {strength}: Score 1-10 and provide analysis

  ## Assessment Output Format

  You MUST produce your assessment in this exact format:

  ## Assessment: {Your Agent Name}
  ### Verdict: APPROVE | CONCERNS | REJECT
  ### Score: {1-10 overall}
  ### Evaluation (by review_strengths):
  - {strength_1}: {score}/10 — {analysis}
  - {strength_2}: {score}/10 — {analysis}
  ### Red Flags: {auto-reject triggers — issues so severe they warrant immediate rejection, or "None"}
  ### Concerns: {bulleted list of specific issues, or "None"}
  ### Recommendations: {bulleted list of specific improvements, or "None"}
  ### Questions for Other Board Members: {specific challenges or questions you want other
    members to address from their expertise, or "None"}
  """

Step 2: Dispatch assessments (parallel)
  Dispatch-aware routing for each board member:

  a. Check if the board member's primary task type matches an external CLI's
     capabilities (e.g., design-ux-architect might map to a CLI with strong
     ui_design capabilities). If a cli-dispatch skill is available and the
     member's task type matches an external CLI's strengths, dispatch via
     cli-dispatch. Otherwise, spawn as an internal Claude Code agent.

  b. All assessments run in parallel:
     - If adapter.parallel_execution is true: spawn all board member agents simultaneously
     - If adapter.parallel_execution is false: execute sequentially

  c. Model tier: model_execution (domain-specific evaluation)

Step 3: Collect assessments with timeout
  - Timeout: settings.board.assessment_timeout_ms (default: 300000ms / 5 minutes)
  - For each spawned agent, wait up to the timeout for their assessment
  - If an assessment is not received within the timeout:
    - Log: "Board member {agent-id} timed out after {timeout}ms. Proceeding without
      their assessment."
    - Do NOT retry — proceed with available assessments
  - Minimum threshold: at least 2 completed assessments required
    - If fewer than 2 assessments received: abort the board meeting
    - Report: "Board meeting aborted — only {count} of {total} assessments received.
      Minimum 2 required. Check agent availability and retry."

Step 4: Parse and validate assessments
  For each received assessment:
  - Verify the output contains all required sections (Verdict, Score, Evaluation,
    Red Flags, Concerns, Recommendations, Questions)
  - If any section is missing: log a warning but accept the assessment as-is
  - Extract the Verdict (APPROVE, CONCERNS, or REJECT) for use in Phase 3
  - Extract Questions for Other Board Members for use in Phase 2
```

---

## Section 3: Phase 2 — Discussion (Internal, 2 Rounds)

Board members respond to each other's concerns, questions, and assessments. This phase refines positions before the final vote.

```
Input: all Phase 1 assessments, board member list
Output: discussion transcript with position shifts tracked

Rationale for internal execution:
  Phase 2 runs INTERNALLY (Claude Code agents or inline) rather than dispatching
  to external CLIs. External dispatch would mean rounds x board_members CLI calls
  (e.g., 2 rounds x 5 members = 10+ invocations), which is cost-prohibitive and
  slow. External CLI assessments from Phase 1 are the authoritative domain input;
  Phase 2 discussion refines and synthesizes based on those findings.

Step 1: Read settings
  - Number of rounds: settings.board.discussion_rounds (default: 2)
  - Model tier: model_planning (higher capability for cross-perspective reasoning)

Step 2: Compile discussion context
  Build the shared context that all board members receive:

  """
  ## Board Assessments Summary

  {For each board member's Phase 1 assessment:}
  ### {Agent Name} — Verdict: {VERDICT}, Score: {score}/10
  **Key concerns**: {bulleted concerns}
  **Recommendations**: {bulleted recommendations}
  **Questions for the board**: {questions from Phase 1}
  """

Step 3: Execute discussion rounds
  For each round (1 to discussion_rounds):

  a. Construct the discussion prompt for each board member:

  """
  {PERSONALITY_CONTENT — full agent .md file}

  ---

  # Board of Directors — Discussion Round {round} of {total_rounds}

  You are participating in a board discussion about: {topic}

  ## All Board Assessments
  {compiled discussion context from Step 2, updated with prior round messages}

  {If round > 1:}
  ## Prior Discussion (Round {round - 1})
  {All messages from the previous round}

  ## Your Phase 1 Assessment
  {This member's own Phase 1 assessment — reminder of their initial position}

  ## Discussion Instructions

  Respond to the other board members' assessments and any questions directed at you.
  You may use one or more of these message types:

  - **CHALLENGE**: You disagree with another member's assessment. State which member,
    which point, and why you disagree. Provide evidence or reasoning.
  - **AGREE**: You endorse another member's position. State which member and which
    point. Add supporting evidence if you have it.
  - **QUESTION**: You need clarification from another member. State which member and
    what you need to understand.
  - **CLARIFY**: You are responding to a question directed at you. Provide a clear answer.
  - **SHIFT**: You have changed your position based on the discussion. State your
    original position, what changed it, and your new position. This directly
    influences your Phase 3 vote.

  ## Output Format

  For each message, use this format:

  ### {MESSAGE_TYPE}: {Your Agent Name} → {Target Agent Name or "Board"}
  {Your message content — specific, evidence-based, concise}
  """

  b. Dispatch all board members for this round:
     - If adapter.parallel_execution is true: spawn all simultaneously
     - If adapter.parallel_execution is false: execute sequentially
     - Model tier: model_planning

  c. Collect responses for this round
     - Parse each response for message types (CHALLENGE, AGREE, QUESTION, CLARIFY, SHIFT)
     - Track SHIFT messages — these indicate a board member changed their position
     - Compile all messages into the round transcript

  d. After all members respond: update the discussion context with this round's messages
     and proceed to the next round (if any)

Step 4: Compile discussion transcript
  - Combine all round transcripts into a single discussion document
  - Track position shifts: record which members shifted, from what position, to what position
  - These shifts inform Phase 3 voting (members who SHIFT are expected to vote
    consistently with their new position)
```

---

## Section 4: Phase 3 — Final Vote

Each board member casts their binding vote using the full context of Phase 1 assessments and Phase 2 discussion.

```
Input: Phase 1 assessments, Phase 2 discussion transcript, board member list
Output: individual votes with confidence and conditions

Step 1: Construct voting prompts
  For each board member:

  """
  {PERSONALITY_CONTENT — full agent .md file}

  ---

  # Board of Directors — Final Vote

  You are casting your binding vote on: {topic}

  ## Your Phase 1 Assessment
  Your original verdict was: {APPROVE | CONCERNS | REJECT}
  Your original score was: {score}/10
  {Full Phase 1 assessment}

  ## Board Discussion Summary
  {Phase 2 discussion transcript — all rounds}

  {If this member issued a SHIFT in Phase 2:}
  ## Your Position Shift
  You shifted your position during discussion:
  - Original: {original verdict}
  - Shifted to: {new position}
  - Reason: {shift rationale from Phase 2}

  ## Voting Instructions

  Cast your final vote. You MUST choose APPROVE or REJECT — there is no CONCERNS
  option in the final vote.

  {If this member's Phase 1 verdict was CONCERNS and they did NOT SHIFT in Phase 2:}
  **IMPORTANT**: Your Phase 1 verdict was CONCERNS. You did not shift your position
  during discussion. You must now explicitly choose APPROVE or REJECT. There is no
  default — your decision must be deliberate.

  Include any conditions that must be met if you vote APPROVE (e.g., "must add rate
  limiting before deployment", "requires security audit of auth module").

  ## Vote Format

  ### Vote: {Your Agent Name}
  - Verdict: APPROVE | REJECT
  - Confidence: {0.0-1.0}
  - Conditions: {requirements if APPROVE, or "None" if unconditional. If REJECT,
    state what would need to change for you to approve.}
  """

Step 2: Dispatch votes
  - Model tier: model_check (lightweight synthesis — voting is a focused decision)
  - If adapter.parallel_execution is true: spawn all simultaneously
  - If adapter.parallel_execution is false: execute sequentially

Step 3: Collect and validate votes
  For each vote received:
  - Parse Verdict (must be APPROVE or REJECT — no other value accepted)
  - Parse Confidence (must be a number between 0.0 and 1.0)
  - Parse Conditions (free text or "None")
  - If Verdict is missing or invalid: prompt the agent to re-vote with a clear
    APPROVE or REJECT. If re-vote also fails: record as ABSTAIN and exclude from
    the tally (reduces effective board size N by 1 for resolution calculation).

Step 4: Compile vote results
  - Record all votes in a structured format
  - Count: approve_count, reject_count, abstain_count
  - Calculate effective board size: N = total_members - abstain_count
  - Pass to Phase 4 (Resolution)
```

---

## Section 5: Phase 4 — Resolution

Deterministic formula that converts individual votes into a binding board decision. No LLM involvement — pure computation.

```
Input: vote results (approve_count, reject_count, effective board size N)
Output: board verdict with conditions

General formula for any board size N (2 <= N <= board.default_size):
Conditions are evaluated in order — first match wins.

  1. approve_count >= ceil(2 * N / 3)          → APPROVED
  2. approve_count > floor(N / 2)              → APPROVED WITH CONDITIONS
     (all conditions stated by approving members are mandatory)
  3. approve_count == N / 2 (even N only)      → ESCALATE to user
  4. Otherwise                                 → REJECTED

Resolution Examples:

  N = 5:
  | Approve | Reject | ceil(2*5/3)=4 | floor(5/2)=2 | Result |
  |---------|--------|---------------|---------------|--------|
  | 5       | 0      | 5 >= 4       |               | APPROVED |
  | 4       | 1      | 4 >= 4       |               | APPROVED |
  | 3       | 2      |              | 3 > 2         | APPROVED WITH CONDITIONS |
  | 2       | 3      |              | 2 not > 2     | REJECTED |
  | 1       | 4      |              |               | REJECTED |
  | 0       | 5      |              |               | REJECTED |

  N = 4:
  | Approve | Reject | ceil(2*4/3)=3 | floor(4/2)=2 | Result |
  |---------|--------|---------------|---------------|--------|
  | 4       | 0      | 4 >= 3       |               | APPROVED |
  | 3       | 1      | 3 >= 3       |               | APPROVED |
  | 2       | 2      |              | 2 not > 2, 2 == 4/2 | ESCALATE |
  | 1       | 3      |              |               | REJECTED |
  | 0       | 4      |              |               | REJECTED |

  N = 3:
  | Approve | Reject | ceil(2*3/3)=2 | floor(3/2)=1 | Result |
  |---------|--------|---------------|---------------|--------|
  | 3       | 0      | 3 >= 2       |               | APPROVED |
  | 2       | 1      | 2 >= 2       |               | APPROVED |
  | 1       | 2      |              | 1 not > 1     | REJECTED |
  | 0       | 3      |              |               | REJECTED |

  N = 2 (under-population, requires user opt-in):
  | Approve | Reject | Result |
  |---------|--------|--------|
  | 2       | 0      | APPROVED (unanimous) |
  | 1       | 1      | ESCALATE (split) |
  | 0       | 2      | REJECTED |

Condition aggregation:
  When the result is APPROVED WITH CONDITIONS:
  - Collect all Conditions strings from members who voted APPROVE
  - Deduplicate conditions that are substantially similar
  - Present the merged conditions list — ALL conditions are mandatory
  - If no approving member stated conditions: upgrade to APPROVED (no conditions needed)

ESCALATE handling:
  When the result is ESCALATE:
  - Present the tied vote to the user via AskUserQuestion:

    ## Board Vote Tied — User Decision Required

    **Topic**: {topic}
    **Vote**: {approve_count} APPROVE — {reject_count} REJECT

    ### Approving Members
    {For each APPROVE vote: agent name, confidence, conditions}

    ### Rejecting Members
    {For each REJECT vote: agent name, confidence, reasoning}

    Options:
    - "Approve" — accept the proposal (with any stated conditions)
    - "Approve with additional conditions" — accept with user-specified conditions
    - "Reject" — reject the proposal
    - "Table for later" — defer the decision, no action taken

  - Record the user's decision as the binding resolution.
```

---

## Section 6: Phase 5 — Persistence

Save all board deliberation artifacts for auditability. Only runs when `settings.board.persist_artifacts` is true (default: true).

```
Input: all phase outputs (assessments, discussion, votes, resolution), topic, board composition
Output: persisted artifacts at .planning/board/{YYYY-MM-DD}-{topic-slug}/

Step 1: Check persistence setting
  - Read settings.board.persist_artifacts from settings.json (default: true)
  - If false: skip all persistence, log "Board artifacts not persisted (settings.board.persist_artifacts = false)"
  - If true: proceed with Steps 2-6

Step 2: Generate the topic slug
  - Take the topic string
  - Lowercase, replace spaces with hyphens, remove special characters
  - Truncate to 50 characters
  - Example: "Should we migrate from REST to GraphQL?" → "should-we-migrate-from-rest-to-graphql"

Step 3: Create the artifact directory
  - Path: .planning/board/{YYYY-MM-DD}-{topic-slug}/
  - Create the directory and subdirectories:
    .planning/board/{YYYY-MM-DD}-{topic-slug}/
      assessments/

Step 4: Write individual assessment files
  For each board member's Phase 1 assessment:
  - Path: .planning/board/{YYYY-MM-DD}-{topic-slug}/assessments/{agent-name}.md
  - Content: the full assessment output from Phase 1

Step 5: Write the discussion transcript
  - Path: .planning/board/{YYYY-MM-DD}-{topic-slug}/discussion.md
  - Content:

  # Board Discussion — {topic}

  **Rounds**: {discussion_rounds}
  **Board Members**: {comma-separated agent names}

  {For each round:}
  ## Round {N}

  {All messages from the round, in order:}
  ### {MESSAGE_TYPE}: {Agent Name} → {Target}
  {message content}

Step 6: Write the votes file
  - Path: .planning/board/{YYYY-MM-DD}-{topic-slug}/votes.md
  - Content:

  # Board Votes — {topic}

  **Date**: {YYYY-MM-DD}

  ## Individual Votes

  {For each board member:}
  ### Vote: {Agent Name}
  - Verdict: {APPROVE | REJECT}
  - Confidence: {0.0-1.0}
  - Conditions: {conditions or "None"}

  ## Tally
  | Metric | Count |
  |--------|-------|
  | Approve | {N} |
  | Reject | {N} |
  | Abstain | {N} |
  | Effective Board Size | {N} |

Step 7: Write the resolution file
  - Path: .planning/board/{YYYY-MM-DD}-{topic-slug}/resolution.md
  - Content:

  # Board Resolution — {topic}

  **Date**: {YYYY-MM-DD}
  **Verdict**: {APPROVED | APPROVED WITH CONDITIONS | REJECTED | ESCALATED}

  ## Conditions
  {Merged mandatory conditions list, or "None — unconditional approval"
   or "N/A — proposal rejected"}

  ## Vote Breakdown
  | Agent | Division | Verdict | Confidence | Key Condition |
  |-------|----------|---------|------------|---------------|
  | {agent-name} | {division} | {APPROVE/REJECT} | {confidence} | {primary condition or "—"} |

  ## Resolution Rationale
  {1-2 paragraph summary of why the board reached this verdict, based on the
   dominant assessment themes and discussion points}

Step 8: Write the meeting summary
  - Path: .planning/board/{YYYY-MM-DD}-{topic-slug}/MEETING.md
  - Content:

  # Board Meeting — {topic}

  **Date**: {YYYY-MM-DD}
  **Verdict**: {APPROVED | APPROVED WITH CONDITIONS | REJECTED | ESCALATED}
  **Board Size**: {N} members

  ## Board Composition
  | # | Agent | Division | Evaluation Lenses |
  |---|-------|----------|-------------------|
  | 1 | {agent-name} | {division} | {review_strengths} |
  | ... | ... | ... | ... |

  ## Conditions
  {Merged conditions or "None"}

  ## Key Debate Points
  {3-5 bullet points summarizing the most significant disagreements, challenges,
   or insights that emerged during deliberation}

  ## Assessment Summary
  | Agent | Verdict | Score | Top Concern |
  |-------|---------|-------|-------------|
  | {agent-name} | {Phase 1 verdict} | {score}/10 | {primary concern or "None"} |

  ## Timeline
  | Phase | Duration | Status |
  |-------|----------|--------|
  | Phase 1 — Assessment | {elapsed} | {count}/{total} completed |
  | Phase 2 — Discussion | {rounds} rounds | Complete |
  | Phase 3 — Vote | — | {approve}-{reject} |
  | Phase 4 — Resolution | — | {verdict} |
  | Phase 5 — Persistence | — | Saved |

  ## Artifacts
  - `assessments/` — Individual member assessments ({count} files)
  - `discussion.md` — Full discussion transcript
  - `votes.md` — Individual votes and tally
  - `resolution.md` — Binding decision and rationale
```

---

## Section 7: Quick Review Mode

A lightweight mode that runs Phase 1 only -- no deliberation, no voting, no persistence. Triggered by `/legion:board review`.

```
Input: current phase context (implicit — reads from .planning/STATE.md and phase artifacts)
Output: aggregated assessment report displayed to user

Step 1: Determine review context
  - Read .planning/STATE.md to identify the current phase
  - Read the phase directory: .planning/phases/{NN}-{slug}/
  - Extract: files_modified across all plan summaries, phase type, phase goal

Step 2: Assemble board using phase context
  - Use the phase goal and files_modified as the topic for board composition (Section 1)
  - Follow the same scoring and selection flow, but skip user confirmation:
    - Auto-accept the top board.default_size agents (no AskUserQuestion)
    - Rationale: quick review is a lightweight checkpoint, not a formal governance decision

Step 3: Run Phase 1 only
  - Execute independent assessments per Section 2
  - Same timeout and minimum-threshold rules apply

Step 4: Aggregate and display
  Produce a summary report (displayed to user, NOT persisted to .planning/board/):

  ## Quick Board Review — Phase {N}: {phase_name}

  **Board**: {count} members
  **Assessments**: {received}/{total} completed

  ### Assessment Summary
  | Agent | Division | Verdict | Score | Top Concern |
  |-------|----------|---------|-------|-------------|
  | {agent-name} | {division} | {APPROVE/CONCERNS/REJECT} | {score}/10 | {primary concern or "None"} |

  ### Aggregate Score: {average score across all assessments}/10

  ### Red Flags
  {Any red flags identified by any board member, or "None identified"}

  ### Common Concerns
  {Concerns mentioned by 2+ board members, deduplicated}

  ### Recommendations
  {Unique recommendations from all members, deduplicated and prioritized by frequency}

  ---
  *Quick review — no deliberation or voting. Run `/legion:board {topic}` for full governance.*

Step 5: No persistence
  - Quick review does NOT write to .planning/board/
  - Quick review does NOT write to .planning/memory/OUTCOMES.md
  - Quick review is a read-only, lightweight checkpoint
```

---

## Section 8: Model Tier Table

Model tier assignments for each phase, aligned with the Cost Profile Convention from `workflow-common.md`.

| Phase | Model Tier | Rationale |
|-------|-----------|-----------|
| Phase 1 — Assessment | model_execution | Domain-specific evaluation requiring specialist knowledge |
| Phase 2 — Discussion | model_planning | Cross-perspective reasoning and synthesis across multiple assessments |
| Phase 3 — Vote | model_check | Lightweight synthesis — casting a vote is a focused, bounded decision |
| Phase 4 — Resolution | N/A (formula) | Deterministic computation from vote counts — no LLM involvement |
| Phase 5 — Persistence | N/A (file writes) | File creation and formatting only — no LLM needed |

Model tier mapping to actual models is defined per-adapter. The board skill references generic tier names; the active adapter translates to specific model identifiers (e.g., `model_execution` might map to `claude-sonnet-4-20250514` on Claude Code or `o3-mini` on Codex CLI).

---

## Section 9: Settings Reference

All board-specific settings, read from `settings.json` at the project root.

| Setting | Default | Description |
|---------|---------|-------------|
| board.default_size | 5 | Default number of board members to assemble |
| board.min_size | 3 | Minimum board members required (2 with explicit user opt-in) |
| board.discussion_rounds | 2 | Number of Phase 2 discussion rounds |
| board.assessment_timeout_ms | 300000 | Per-assessment timeout in milliseconds (5 minutes) |
| board.persist_artifacts | true | Whether to save board artifacts to .planning/board/ |

Settings are resolved at board invocation start. If `settings.json` does not exist or a setting is missing, the default value is used. Settings are never modified by the board skill -- they are read-only configuration.

Example `settings.json` with board overrides:
```json
{
  "board": {
    "default_size": 3,
    "min_size": 2,
    "discussion_rounds": 1,
    "assessment_timeout_ms": 180000,
    "persist_artifacts": true
  }
}
```

---

## Section 10: Memory Integration

After a board resolution is reached, record the decision to the memory layer for cross-session learning.

```
Input: board resolution (verdict, conditions, board members, topic)
Output: outcome record appended to .planning/memory/OUTCOMES.md

Step 1: Check memory availability
  - If .planning/memory/OUTCOMES.md does not exist:
    - Create .planning/memory/ directory if needed
    - Create OUTCOMES.md with the header template from memory-manager Section 2
  - If memory features are disabled or the file cannot be written: skip silently
    (follow graceful degradation from memory-manager Section 6)

Step 2: Build the outcome record
  Following the memory-manager Section 3 (Store Operation):

  - ID: next sequential O-{NNN} ID
  - Date: current date (YYYY-MM-DD)
  - Branch: current git branch (via git branch --show-current)
  - Phase: current phase number (from STATE.md, or "N/A" if standalone)
  - Plan: "board" (not a plan ID — board decisions are standalone)
  - Agent: comma-separated list of board member agent-ids
  - Task Type: "board_decision"
  - Outcome: "success" if APPROVED or APPROVED WITH CONDITIONS,
             "partial" if ESCALATED (user decided),
             "failed" if REJECTED
  - Importance: calculated per memory-manager Section 2:
    - Base 3 for standard board decisions
    - +1 if board was split (close vote)
    - +1 if ESCALATED to user
    - Cap at 5
  - Tags: "board, governance, {topic keywords}, {board member divisions}"
  - Summary: "{verdict}: {topic} — {board_size} members, {approve}-{reject} vote"

Step 3: Append and verify
  - Append the record to the OUTCOMES.md Records table
  - Verify the record appears correctly
  - If write fails: output the record as text to the user (never lose data)

Note: Quick review mode (Section 7) does NOT record to memory.
Only full 5-phase board meetings produce memory records.
```

---

## References

This skill integrates with the following Legion components:

| Component | Integration Point | Section |
|-----------|------------------|---------|
| agent-registry.md | 4-layer scoring for board composition | Section 1 |
| memory-manager.md | Outcome recording after resolution | Section 10 |
| wave-executor.md | Parallel dispatch patterns for Phase 1 | Section 2 |
| workflow-common.md | Model tier mapping, personality injection, adapter protocol | Sections 2, 3, 4 |
| review-panel.md | Assessment format and rubric patterns (related, not dependent) | Section 2 |
| review-loop.md | Distinct from board — review-loop is for code QA, board is for governance | N/A |

### Quick Reference: Board Artifact Paths

```
.planning/board/{YYYY-MM-DD}-{topic-slug}/
  MEETING.md              — Human-readable summary
  assessments/
    {agent-name}.md       — Each member's Phase 1 assessment
  discussion.md           — Phase 2 discussion transcript
  votes.md                — Phase 3 individual votes
  resolution.md           — Phase 4 binding decision

Memory integration:
  .planning/memory/OUTCOMES.md  — Decision recorded with task_type: "board_decision"
```
