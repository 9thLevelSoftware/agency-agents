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
  Combine:
  - Schema conformance violations (Section 5)
  - Wave file overlap BLOCKERs (Section 6)
  - Pre-mortem critical risks (Section 1)
  - Assumption critical/warning items (Section 2)
  Deduplicate: if a pre-mortem finding and an assumption point to the same
  plan section with the same root issue, merge into one entry.
  Schema BLOCKERs are never deduplicated — they always appear individually.

Step 2: Compute critique verdict
  - PASS: No schema BLOCKERs AND no critical risks AND no critical assumptions
    → "Plan looks solid. Proceed to execution."
  - CAUTION: 1-2 critical items (including schema warnings), all have clear mitigations
    → "Plan has addressable risks. Review mitigations before proceeding."
  - REWORK: Any schema BLOCKER OR any wave overlap BLOCKER OR 3+ critical items OR any item without clear mitigation
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

  ### Schema Conformance
  | Plan | verification_commands | files_forbidden | expected_artifacts | Status |
  |------|----------------------|----------------|--------------------|--------|
  | {NN}-{PP} | {PASS/BLOCKER} | {PASS/WARNING/BLOCKER} | {PASS/WARNING} | {overall} |

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
  Each agent is spawned with its full personality file loaded from
  {AGENTS_DIR}/{agent-id}.md (AGENTS_DIR resolved via workflow-common
  Agent Path Resolution Protocol), plus the relevant section (1 or 2)
  as task instructions, using adapter.spawn_agent_readonly to prevent
  plan modification. If personality file is missing: run critique
  autonomously without personality injection.
```

---

## Section 5: Schema Conformance Check (DSC-01, DSC-02, DSC-03)

Validates plan frontmatter against the v6.0 schema before execution. Runs automatically as part of plan-critique (before pre-mortem and assumption hunting). Schema violations are reported alongside critique findings in the consolidated report.

### When to Run

Schema conformance check runs:
- Automatically when plan-critique is invoked (always, before Sections 1-2)
- Standalone via direct invocation on any plan file
- During wave-executor pre-flight validation

### Validation Rules

For each plan file in the phase:

#### Rule 1: verification_commands (BLOCKER if missing)
```
Check: Plan frontmatter contains `verification_commands` field
If missing: BLOCKER — "Plan {NN}-{PP} missing mandatory verification_commands field"
If present but empty array: BLOCKER — "Plan {NN}-{PP} has empty verification_commands — must contain at least one bash command"
If present with entries: PASS
Additional: Each command must be a valid-looking bash command (not empty string, not a comment)
```

#### Rule 2: files_forbidden (WARNING if missing for code-modifying plans)
```
Check: Plan frontmatter contains `files_forbidden` field
If missing AND plan has code files in files_modified: WARNING — "Plan {NN}-{PP} modifies code but declares no files_forbidden"
If missing AND plan is markdown-only: PASS (no warning)
If present: Validate no overlap with files_modified using PREFIX MATCHING:
  - A `files_forbidden` entry ending with `/` (e.g., `agents/`) is a directory prefix — it matches any `files_modified` entry starting with that prefix
  - A `files_forbidden` entry without trailing `/` is an exact path — it matches only identical entries in `files_modified`
  - If overlap found: BLOCKER — "Plan {NN}-{PP} has {file} in both files_modified and files_forbidden"
  - Document this matching algorithm explicitly in the section so implementations are consistent
```

#### Rule 3: expected_artifacts (WARNING if missing)
```
Check: Plan frontmatter contains `expected_artifacts` field
If missing: WARNING — "Plan {NN}-{PP} missing expected_artifacts — consider declaring outputs"
If present: Validate structure
  - Each entry must have `path` (string) and `provides` (string)
  - Each `required: true` artifact must appear in `files_modified`
  - If required artifact not in files_modified: WARNING — "Artifact {path} marked required but not in files_modified"
```

### Schema Validation Examples

**Example 1: Plan passes all checks**
```yaml
files_modified: [skills/new-skill/SKILL.md]
files_forbidden: [agents/, commands/]
expected_artifacts:
  - path: skills/new-skill/SKILL.md
    provides: New skill definition
    required: true
verification_commands:
  - test -f skills/new-skill/SKILL.md
  - grep -q "Section 1" skills/new-skill/SKILL.md
```
Result: All rules PASS.

**Example 2: Missing verification_commands**
```yaml
files_modified: [skills/new-skill/SKILL.md]
# no verification_commands field
```
Result: Rule 1 BLOCKER — "missing mandatory verification_commands"

**Example 3: files_modified / files_forbidden overlap**
```yaml
files_modified: [skills/decomposer/SKILL.md, skills/critique/SKILL.md]
files_forbidden: [skills/critique/SKILL.md]
```
Result: Rule 2 BLOCKER — "skills/critique/SKILL.md in both files_modified and files_forbidden"

### Edge Cases

- **Autonomous plans**: Schema checks still apply. Even autonomous plans must declare verification_commands.
- **Wave 2+ plans**: May reference Wave 1 outputs in expected_artifacts. This is valid.
- **Empty files_forbidden**: `files_forbidden: []` is valid and passes. Only missing field triggers warning for code plans.
- **Legacy plans (pre-v6.0)**: Schema check reports findings but does NOT block execution of archived plans. Apply exemption: if plan's phase number predates v6.0, downgrade BLOCKERs to WARNINGs.

---

## Section 6: Wave File Overlap Detection (DSC-04)

Detects when two or more plans in the same wave have overlapping `files_modified` entries. Overlapping files in the same wave means two agents would modify the same file concurrently, causing merge conflicts or data loss.

### When to Run

- Runs as part of plan-critique after Section 5 (schema conformance) and before Section 1 (pre-mortem)
- Also runnable standalone on a phase directory

### Algorithm

```
Step 1: Collect all plan files in the phase directory
  Read all {NN}-{PP}-PLAN.md files.
  Parse YAML frontmatter for: wave number, files_modified list.

Step 2: Group plans by wave number
  Build a map: wave_number -> [{ plan_id, files_modified }]
  Only waves with 2+ plans need overlap checking.

Step 3: For each wave with multiple plans, check for overlaps
  For each pair of plans (A, B) in the same wave:
    Compare files_modified lists using PREFIX MATCHING:
      a. Exact path match: "skills/foo/SKILL.md" == "skills/foo/SKILL.md" -> overlap
      b. Directory prefix: if plan A has "skills/foo/" (trailing /) and plan B has
         "skills/foo/SKILL.md", the directory covers the file -> overlap
      c. Reverse directory: if plan B has "skills/foo/" and plan A has a file
         under that directory -> overlap
    If any overlap found: record as BLOCKER finding.

Step 4: Format findings
  For each overlap:
  - Severity: BLOCKER
  - Message: "Plans {NN}-{PP1} and {NN}-{PP2} both modify {file} in Wave {N}"
  - Mitigation: "Move one plan to a different wave, or merge into a single plan"
```

### Integration with Section 3 (Critique Report)

Wave overlap BLOCKERs are included in the "Schema Conformance" table in Section 3 Step 3:
- Add a new row type: "Wave Overlap" with plan pair and file(s)
- Any wave overlap BLOCKER triggers automatic REWORK verdict (same as schema BLOCKERs)

### Edge Cases

- **Single-plan waves**: Skip (no overlap possible)
- **Plans with empty files_modified**: Skip (nothing to overlap)
- **Plans across different waves**: No overlap check (waves are sequential)
- **Directory-level entries** in files_modified (e.g., "agents/"): Use prefix matching — any file under that directory overlaps with the directory entry

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
