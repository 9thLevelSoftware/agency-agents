---
name: legion:memory-manager
description: Cross-session memory — outcome tracking, pattern recall with decay, and graceful degradation for Legion workflows
---

# Memory Manager

Cross-session memory layer for Legion. Tracks agent performance and task outcomes, provides pattern recall with recency-based decay, and degrades gracefully when memory is not present. All memory operations are explicit calls from workflows — no hooks, no background processes.

References:
- State File Locations from `workflow-common.md` (memory paths at `.planning/memory/`)
- Memory Conventions from `workflow-common.md` (lifecycle, paths, integration points)
- Execution Tracker Section 2 from `execution-tracker.md` (plan completion flow where memory recording is triggered)
- `.planning/memory/OUTCOMES.md` — the single memory file read and written by this skill

---

## Section 1: Memory Principles

Core rules governing all memory operations:

1. **Passive and opt-in** — memory operations are called explicitly by workflows. No hooks, no background processes, no automatic triggers. A workflow must choose to store or recall.
2. **Human-readable markdown** — all memory is stored as structured markdown tables, consistent with PROJECT.md, STATE.md, and all other Legion state files. No JSON, no binary, no databases.
3. **Graceful degradation** — every caller checks for memory availability before using it. If memory files don't exist, the workflow proceeds identically to how it worked before Phase 9. Memory is an enhancement, never a requirement.
4. **Append-only records** — outcome records are added, never modified or deleted automatically. Decay happens at recall time through scoring, not through deletion.
5. **Supplement, not override** — memory boosts agent recommendations but cannot override mandatory roles, division alignment, or the core recommendation algorithm in agent-registry.md.
6. **Minimal footprint** — one directory (`.planning/memory/`), one file (`OUTCOMES.md`). No proliferation of memory fragments or indexes.

---

## Section 2: Memory File Format

Memory lives in a single file:

```
Path: .planning/memory/OUTCOMES.md
Created: on first store operation (not during project initialization)
```

**File structure**:

```markdown
# Memory — Outcome Log

Records agent performance and task outcomes for cross-session learning.
Managed by memory-manager skill. Do not edit manually unless pruning old records.

## Records

| ID | Date | Phase | Plan | Agent | Task Type | Outcome | Importance | Tags | Summary |
|----|------|-------|------|-------|-----------|---------|------------|------|---------|
| O-001 | 2026-03-01 | 5 | 05-01 | testing-reality-checker | quality-review | success | 3 | review, testing, workflow | Review-loop skill approved in 2 cycles |
| O-002 | 2026-03-01 | 5 | 05-02 | autonomous | workflow | success | 2 | review, command, status | /legion:review command implemented |
```

**Field definitions**:

| Field | Format | Description |
|-------|--------|-------------|
| ID | `O-{NNN}` | Sequential, zero-padded to 3 digits. Next ID = count of existing records + 1 |
| Date | `YYYY-MM-DD` | When the outcome was recorded |
| Phase | Integer | Phase number where the outcome occurred |
| Plan | `NN-PP` | Plan ID (e.g., `05-01`) |
| Agent | Agent ID or `autonomous` | The agent that executed the work |
| Task Type | Tag from agent-registry | Primary task type category (e.g., `workflow`, `frontend`, `quality-review`) |
| Outcome | `success` / `partial` / `failed` | How the plan or review resolved |
| Importance | `1` through `5` | Significance score (see Importance Scoring below) |
| Tags | Comma-separated | Searchable keywords: phase slug, agent division, technology, domain |
| Summary | Free text (one line) | Brief description of what happened |

**Importance scoring**:

| Base Score | Condition |
|------------|-----------|
| 5 | Plan failed — critical learning signal |
| 4 | Review escalated (3 cycles exhausted) |
| 3 | Plan partial or review needed 2+ cycles |
| 2 | Standard success — plan completed, review passed |
| 1 | Trivial or expected outcome (autonomous config changes) |

**Adjustment modifiers** (add to base, cap at 5):
- First time an agent handles this task type: +1
- Cross-division work (agent from different division than task type): +1
- Review found 3+ blockers before passing: +1

---

## Section 3: Store Operation

How to add outcome records. Called by build.md (after plan execution) and review.md (after review cycle completes).

```
Store Outcome:

Step 1: Check memory directory
  - If .planning/memory/ does not exist: create it with mkdir -p
  - If .planning/memory/OUTCOMES.md does not exist: create it with the header template from Section 2

Step 2: Determine next ID
  - Read OUTCOMES.md
  - Count rows in the Records table (exclude header row)
  - Next ID = O-{count + 1}, zero-padded to 3 digits

Step 3: Calculate importance
  - Start with base score from the Importance Scoring table in Section 2
  - Apply adjustment modifiers
  - Cap at 5

Step 4: Build the record
  - Date: current date (YYYY-MM-DD)
  - Phase: from the current phase context
  - Plan: from the plan ID being tracked
  - Agent: agent ID that executed the plan, or "autonomous"
  - Task Type: inferred from the plan's tasks (match against agent-registry task type tags)
  - Outcome: success / partial / failed (from plan execution result)
  - Importance: calculated in Step 3
  - Tags: phase slug, agent division, task-related keywords
  - Summary: one-line description of the outcome

Step 5: Append the record
  - Read current OUTCOMES.md
  - Append the new row to the Records table
  - Write updated OUTCOMES.md

Step 6: Verify
  - Confirm the new record appears in OUTCOMES.md
  - If write failed: output the record as text to the user (never lose data)
```

**Store Decision (embedded in outcome records)**:

Key decisions are captured in the Summary and Tags fields of outcome records rather than a separate file. For example:
- "Chose engineering-senior-developer over engineering-rapid-prototyper for production Laravel work" (tags: `agent-selection, engineering`)
- "Escalated review after 3 cycles — milestone-tracker had persistent edge case" (tags: `escalation, review, milestone`)

This keeps the memory layer minimal (one file) while still enabling decision recall for session briefing.

---

## Section 4: Recall Operation

How to query memory. Called by phase-decomposer.md (agent recommendation) and status.md (session briefing).

**General Recall**:

```
Recall Outcomes:

Input:
  - query_tags: list of tags to filter by (optional, matches any)
  - agent_id: specific agent to filter by (optional)
  - task_type: specific task type to filter by (optional)
  - limit: max records to return (default: 20)

Step 1: Check memory exists
  - If .planning/memory/OUTCOMES.md does not exist: return empty results
  - Do NOT create the file on recall — only store creates it

Step 2: Read and parse OUTCOMES.md
  - Parse the Records table into individual records
  - If parse fails (malformed table): log warning, return empty results

Step 3: Filter
  - If query_tags provided: keep records where any tag matches any query_tag
  - If agent_id provided: keep records where Agent matches agent_id
  - If task_type provided: keep records where Task Type matches task_type
  - Multiple filters are AND-combined

Step 4: Apply decay scoring
  - For each record, calculate:
    days_old = (current_date - record_date) in days
    recency_weight:
      - days_old <= 7:  1.0
      - days_old <= 30: 0.7
      - days_old <= 90: 0.4
      - days_old > 90:  0.1
    decay_score = importance × recency_weight

Step 5: Exclude low-signal records
  - Remove records where decay_score < 0.2

Step 6: Sort and limit
  - Sort by decay_score descending
  - Return top {limit} records

Step 7: Pruning suggestion (informational only)
  - If total record count exceeds 200:
    Output note: "Memory has {count} records. Consider pruning old entries with
    `/legion:quick prune memory records older than 90 days`."
  - Never auto-prune. User decides.
```

**Recall for Agent Recommendation**:

A specialized recall mode used by phase-decomposer.md Section 4 during agent selection.

```
Recall Agent Scores:

Input:
  - task_types: list of task type tags from the current plan analysis

Step 1: Check memory exists
  - If .planning/memory/OUTCOMES.md does not exist: return empty map

Step 2: Recall all outcomes matching task_types
  - Use general recall with query_tags = task_types

Step 3: Group by agent_id
  - For each unique agent in the filtered results:
    - total_tasks = count of records for this agent
    - successes = count where outcome = "success"
    - failures = count where outcome = "failed"
    - success_rate = successes / total_tasks
    - avg_importance = mean of importance values
    - avg_recency_weight = mean of recency_weight values

Step 4: Calculate memory score per agent
  - memory_score = (success_rate × 3.0) + (avg_importance × 0.5)
  - Apply recency: memory_score = memory_score × avg_recency_weight
  - Clamp to range [0, 5]

Step 5: Return agent_id → memory_score mapping
  - Only include agents with total_tasks >= 2 (avoid one-off noise)
  - Sort by memory_score descending
```

**Recall for Session Briefing**:

A specialized recall mode used by status.md for enriching the dashboard.

```
Recall Session Briefing:

Step 1: Check memory exists
  - If .planning/memory/OUTCOMES.md does not exist: return empty briefing

Step 2: Recall recent outcomes
  - Use general recall with limit = 5, no filters
  - These are the most recent, highest-signal outcomes

Step 3: Calculate agent performance summary
  - Use the full (unfiltered) outcome set
  - Group by agent_id
  - For each agent: total tasks, success rate, average importance
  - Sort by total tasks descending
  - Return top 3 agents

Step 4: Return briefing data
  - recent_outcomes: list of 5 recent records
  - top_agents: list of 3 agent performance summaries
  - total_records: count of all records
```

---

## Section 5: Decay Rules

Decay is the mechanism that ensures recent outcomes matter more than old ones. It is computed at recall time, never applied destructively.

```
Recency Weight Formula:
  days_old = (current_date - record_date) in days

  if days_old <= 7:   recency_weight = 1.0   (full signal)
  if days_old <= 30:  recency_weight = 0.7   (recent)
  if days_old <= 90:  recency_weight = 0.4   (relevant)
  if days_old > 90:   recency_weight = 0.1   (historical)

Decay Score:
  decay_score = importance × recency_weight

  Example: importance=4, 15 days old → 4 × 0.7 = 2.8
  Example: importance=2, 60 days old → 2 × 0.4 = 0.8
  Example: importance=5, 120 days old → 5 × 0.1 = 0.5

Exclusion Threshold:
  Records with decay_score < 0.2 are excluded from recall results.
  This only affects importance=1 records older than 90 days (1 × 0.1 = 0.1 < 0.2).
  All other combinations remain above threshold.

No Auto-Deletion:
  Records are NEVER deleted by decay. They remain in OUTCOMES.md permanently.
  Decay only affects which records appear in recall results.
  Manual pruning is the user's choice, never automatic.
```

---

## Section 6: Graceful Degradation

The golden rule: every workflow that calls memory must work identically without it.

```
Caller Pattern (MUST be followed by all workflows that integrate memory):

  1. Check if .planning/memory/OUTCOMES.md exists
  2. If exists:
     a. Call the appropriate recall or store operation
     b. Use the results to enhance the current operation
     c. If the memory operation fails: log a one-line warning, continue without memory
  3. If not exists:
     a. Skip the memory step entirely
     b. Do NOT create the file (only store operations create it)
     c. Do NOT display a warning or placeholder about missing memory
     d. Do NOT suggest the user set up memory
  4. NEVER:
     a. Error if memory files are missing
     b. Block workflow execution on memory operations
     c. Require memory for any workflow to function
     d. Change workflow behavior in a way that breaks without memory
     e. Add mandatory memory steps to any workflow's critical path
```

**Testing graceful degradation**:

To verify a workflow degrades gracefully:
1. Delete `.planning/memory/` entirely
2. Run the workflow (build, review, plan, status)
3. Confirm it completes successfully with no errors or warnings about memory
4. Re-run with memory present
5. Confirm memory data enhances but does not alter the core workflow result

---

## Section 7: Error Handling

- **Missing memory directory**: Store creates `.planning/memory/` on first write. Recall returns empty results. Neither operation errors.
- **Missing OUTCOMES.md**: Store creates it with the header template. Recall returns empty results.
- **Malformed OUTCOMES.md**: If the table cannot be parsed (missing columns, corrupted rows), log a one-line warning: "Warning: OUTCOMES.md could not be parsed. Proceeding without memory." Return empty results. Do NOT attempt to repair — the user should inspect manually.
- **Write failure during store**: Output the intended record as text to the user. Include all fields so the user can manually add it. Continue the workflow — memory loss is not a blocking error.
- **Excessive records (200+)**: On recall, output an informational note suggesting pruning. Never auto-prune. The note appears once per recall, not per record.
- **Concurrent writes**: Not a concern in Legion workflows — only one build/review runs at a time per project. If somehow two writes conflict, the second write wins (last-write-wins, consistent with all other Legion state files).
- **Date parsing failure**: If a record's date cannot be parsed, treat its recency_weight as 0.4 (middle of the range). Do not exclude records with unparseable dates.

---

## References

This skill is consumed by:

| Consumer | Operation | Section |
|----------|-----------|---------|
| `execution-tracker.md` | Store outcome after plan completion | Section 3 |
| `build.md` | Trigger store via execution-tracker | Section 3 |
| `review.md` | Store review outcome | Section 3 |
| `phase-decomposer.md` | Recall agent scores for recommendation | Section 4 |
| `agent-registry.md` | Apply memory boost in recommendation algorithm | Section 4 |
| `status.md` | Recall session briefing for dashboard | Section 4 |

Memory file path is defined in `workflow-common.md` (Memory Conventions section).
