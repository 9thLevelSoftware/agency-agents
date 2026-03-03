---
name: legion:plan-critique
description: Pre-mortem analysis and assumption hunting for stress-testing plans before execution
triggers: [critique, pre-mortem, assumption, risk, review-plan]
token_cost: medium
summary: "Pre-mortem analysis and assumption hunting for generated plans. Identifies risks, blind spots, and over-optimism before execution begins. Use after plan generation to stress-test the approach."
---

# Plan Critique

Stress-tests plans before execution using two complementary analysis passes: pre-mortem inversion ("assume it failed — why?") and assumption hunting ("what are we taking for granted?"). Each finding maps to a specific plan section or requirement with actionable next steps.

Used by `/legion:plan` as an optional validation step after plan generation. Can also be invoked standalone on any plan file.

---

## Section 1: Pre-Mortem Analysis (CRIT-01)

Assumes the project has already failed. Works backward from the failure to identify causes.

```
Input: Plan file(s) for the phase, CONTEXT.md, ROADMAP.md phase details
Output: Ranked list of failure scenarios with root causes and mitigation actions

Step 1: Set the scene
  Read ALL plan files for the phase ({NN}-{PP}-PLAN.md).
  Read the CONTEXT.md for phase goal, requirements, and success criteria.
  Read ROADMAP.md for dependencies and the broader milestone context.
  Read `.planning/CODEBASE.md` if it exists (optional):
    - Extract the Risk Areas table
    - Cross-reference each plan's `files_modified` against Risk Areas
    - If overlap with HIGH or MEDIUM risk areas: pre-seed Step 2 failure headlines
      with risk-informed scenarios (e.g., "Phase failed because changes to {risky_file}
      introduced regressions in a high-churn area")
    - If CODEBASE.md absent: skip, no pre-seeding

Step 2: Generate failure headlines
  Assume the phase has been executed and FAILED. Generate 3-5 failure headlines
  that describe plausible ways the phase could fail. Each headline should be:
  - Specific to THIS phase (not generic project risks)
  - Grounded in the actual plan content (task instructions, file changes, dependencies)
  - Written as a post-incident headline: "Phase {N} failed because {specific cause}"

  Example headlines for a "Plugin Scaffold" phase:
  - "Phase 15 failed because plugin.json schema didn't match Claude Code's validation"
  - "Phase 15 failed because settings.json defaults broke existing user configurations"
  - "Phase 15 failed because the directory structure conflicted with .gitignore patterns"

  Do NOT generate vague headlines like "Phase failed due to poor planning" or
  "Phase failed because requirements were unclear."

Step 3: Trace each headline to root causes
  For each failure headline, work backward:
  a. Which specific task(s) in the plan would produce this failure?
  b. What assumption in the task instructions is wrong?
  c. What dependency is missing or underspecified?
  d. What edge case does the plan not account for?

  Format each trace as:
  | Field | Value |
  |-------|-------|
  | Headline | "Phase {N} failed because..." |
  | Root Cause | {1-2 sentence description} |
  | Plan Section | Task {X} in Plan {NN}-{PP}, "{task_name}" |
  | Requirement | {REQ-ID} or "implicit" |
  | Likelihood | High / Medium / Low |
  | Impact | High / Medium / Low |
  | Mitigation | {specific action to prevent this failure} |

Step 4: Rank by risk score
  Score = Likelihood x Impact (High=3, Medium=2, Low=1)
  Sort findings by score descending.
  Top 3 findings are "Critical Risks" — these need action before execution.
  Remaining findings are "Watch Items" — monitor during execution.

Step 5: Present pre-mortem findings
  Display to user:

  ## Pre-Mortem Analysis — Phase {N}: {phase_name}

  **Failure scenarios analyzed**: {count}
  **Critical risks**: {count with score >= 6}
  **Watch items**: {count with score < 6}

  ### Critical Risks (action required before execution)

  | # | Headline | Plan Section | Risk Score | Mitigation |
  |---|----------|-------------|------------|------------|
  | 1 | {headline} | Plan {PP}, Task {X} | {score} | {mitigation} |

  ### Watch Items (monitor during execution)

  | # | Headline | Plan Section | Risk Score |
  |---|----------|-------------|------------|
  | 1 | {headline} | Plan {PP}, Task {X} | {score} |
```

---

## Section 2: Assumption Hunting (CRIT-02)

Extracts foundational beliefs embedded in the plan, rates them, and flags weak ones.

```
Input: Same as Section 1
Output: Assumption inventory with impact/evidence ratings and challenge actions

Step 1: Extract assumptions
  Read through each plan task and identify implicit assumptions. Categories:

  a. Technical assumptions
     - "File X exists and has the expected format"
     - "Tool Y supports operation Z"
     - "Path resolution works as described"
     - "No other process modifies these files concurrently"

  b. Dependency assumptions
     - "Phase {N-1} output is complete and correct"
     - "Skill X provides the exact API described"
     - "External service Y is available"

  c. Scope assumptions
     - "The task description covers all necessary changes"
     - "No other files need updating beyond files_modified"
     - "Edge case X doesn't apply here"

  d. Knowledge assumptions
     - "The executing agent understands {concept}"
     - "The user has {prerequisite} in place"
     - "The codebase follows {convention}"

  e. Codebase assumptions (if .planning/CODEBASE.md exists)
     - "The detected conventions still apply to the files being modified"
     - "The risk areas identified in CODEBASE.md are current"
     - "The detected stack is compatible with the plan's approach"
     - "No undocumented conventions exist beyond what CODEBASE.md captured"

  Aim for 5-10 assumptions. Prioritize assumptions that are:
  - Unstated (not explicitly written in the plan)
  - Load-bearing (if wrong, the plan breaks)
  - Checkable (can be verified before or during execution)

Step 2: Rate each assumption
  For each assumption, rate two dimensions:

  Impact (if this assumption is wrong):
  - High: Plan fails or produces incorrect output
  - Medium: Plan partially succeeds but needs rework
  - Low: Minor inconvenience, easily corrected

  Evidence (that this assumption is correct):
  - Strong: Verified by reading code, confirmed by prior phase output
  - Moderate: Reasonable inference from project context
  - Weak: Not checked, taken on faith, or contradicted by evidence

Step 3: Flag critical assumptions
  Critical = High Impact + Weak Evidence
  These are the most dangerous: if wrong, the plan fails, and we haven't checked.

  Warning = High Impact + Moderate Evidence OR Medium Impact + Weak Evidence
  These deserve a quick verification before execution.

  Accepted = everything else (low risk or well-evidenced)

Step 4: Generate challenge actions
  For each Critical and Warning assumption, generate a specific action:
  - "Verify by reading {file} and checking for {pattern}"
  - "Test by running {command} before execution"
  - "Confirm with user: does {condition} hold?"
  - "Add a verify step to Task {X} that checks {condition}"

Step 5: Present assumption inventory
  Display to user:

  ## Assumption Hunting — Phase {N}: {phase_name}

  **Assumptions extracted**: {count}
  **Critical (high impact, weak evidence)**: {count}
  **Warning (needs verification)**: {count}
  **Accepted (low risk or well-evidenced)**: {count}

  ### Critical Assumptions (verify before execution)

  | # | Assumption | Category | Impact | Evidence | Plan Section | Challenge Action |
  |---|-----------|----------|--------|----------|-------------|-----------------|
  | 1 | {assumption} | {category} | High | Weak | Plan {PP}, Task {X} | {action} |

  ### Warning Assumptions (quick check recommended)

  | # | Assumption | Category | Impact | Evidence | Challenge Action |
  |---|-----------|----------|--------|----------|-----------------|
  | 1 | {assumption} | {category} | {level} | {level} | {action} |

  ### Accepted Assumptions ({count})
  {Collapsed list — one line per assumption with category}
```

---

## Section 3: Critique Report and Routing

How to synthesize both passes and route to user action.

```
After both passes complete:

Step 1: Merge findings
  Combine pre-mortem critical risks and assumption critical/warning items.
  Deduplicate: if a pre-mortem finding and an assumption point to the same
  plan section with the same root issue, merge into one entry.

Step 2: Compute critique verdict
  - PASS: No critical risks AND no critical assumptions
    → "Plan looks solid. Proceed to execution."
  - CAUTION: 1-2 critical items, all have clear mitigations
    → "Plan has addressable risks. Review mitigations before proceeding."
  - REWORK: 3+ critical items OR any item without a clear mitigation
    → "Plan needs revision before execution."

Step 3: Present consolidated critique
  Display to user:

  ## Plan Critique Summary — Phase {N}: {phase_name}

  **Verdict**: {PASS | CAUTION | REWORK}

  | Metric | Count |
  |--------|-------|
  | Pre-mortem failure scenarios | {N} |
  | Critical risks | {N} |
  | Assumptions extracted | {N} |
  | Critical assumptions | {N} |
  | Warning assumptions | {N} |
  | Merged findings | {N} |

  {Pre-mortem findings from Section 1, Step 5}

  {Assumption inventory from Section 2, Step 5}

  ### Recommended Actions
  {Numbered list of specific actions, ordered by priority}
  1. {highest priority action — maps to specific plan section}
  2. ...

Step 4: Route based on verdict
  Use AskUserQuestion:

  If PASS:
    "Plan critique found no critical issues. What next?"
    - "Proceed to execution" (Recommended)
    - "Run critique again with different agents"

  If CAUTION:
    "Plan critique found {N} addressable issues. What next?"
    - "Apply mitigations and proceed" (Recommended) — user applies fixes, then executes
    - "Revise the plan first" — return to plan editing
    - "Proceed anyway" — skip mitigations, execute as-is

  If REWORK:
    "Plan critique found {N} critical issues needing revision. What next?"
    - "Revise the plan" (Recommended) — return to plan editing
    - "Proceed anyway" — execute despite warnings (user takes responsibility)
    - "Re-plan from scratch" — delete plans, restart /legion:plan

  User choice determines next action. Critique does NOT automatically
  modify plans — the user decides.
```

---

## Section 4: Agent Selection for Critique

Which agents are best suited to perform critique passes.

```
Critique requires agents with skeptical, analytical personalities.
Use agent-registry Section 3 (Recommendation Algorithm) with a composite
task description biased toward these terms:

  "risk analysis, assumption validation, evidence evaluation, failure mode
   identification, critical assessment, quality verification, skeptical review"

Preferred agents (in priority order):

1. testing-reality-checker
   Why: Skeptical personality, evidence-obsessed, defaults to "NEEDS WORK",
   experienced at catching fantasy approvals and premature certifications.
   Best for: Pre-mortem analysis (Section 1)

2. product-sprint-prioritizer
   Why: Risk assessment expertise, scope management, dependency identification,
   data-driven decision making, experience with delivery risk analysis.
   Best for: Assumption hunting (Section 2)

3. testing-evidence-collector
   Why: Skeptical, requires proof for everything, hates fantasy reporting,
   checks for reproducibility and coverage gaps.
   Best for: Either pass (validates evidence strength ratings)

4. testing-test-results-analyzer
   Why: Risk analysis, regression coverage thinking, flakiness detection.
   Best for: Technical assumption validation

Fallback (if preferred agents unavailable or user swaps):
  Any Testing division agent, or project-manager-senior (risk mitigation,
  documentation quality checking).

Panel size:
  - 1 agent: Quick critique (single agent runs both passes sequentially)
  - 2 agents: Standard critique (one per pass — recommended)
  Each agent is spawned with its full personality plus the relevant
  section (1 or 2) as task instructions, using the read-only Explore
  subagent type to prevent plan modification.
```

---

## References

This skill draws from:

| Pattern | Source | Used In |
|---------|--------|---------|
| Recommendation Algorithm | agent-registry.md Section 3 | Section 4 (agent selection) |
| Personality Injection | workflow-common.md | Section 4 (agent spawning) |
| Read-only Agent Pattern | commands/advise.md | Section 4 (Explore subagent type) |
| Review Panel Structure | skills/review-panel/SKILL.md | Section 3 (verdict + routing pattern) |
| Pre-mortem Technique | Klein (1998), adapted for plan files | Section 1 |
| Assumption Mapping | Risk management, adapted for plan tasks | Section 2 |
| Brownfield Risk Cross-Reference | codebase-mapper Section 4, Section 5 | Section 1, Section 2 |
