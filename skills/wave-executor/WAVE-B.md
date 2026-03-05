# Wave B Execution Protocol

Execution + Remediation wave for two-wave pattern.

## Purpose

Wave B validates Wave A outputs and runs remediation in parallel:
1. **Execution Stream**: Tests, benchmarks, validation
2. **Remediation Stream**: Chaos testing, data analysis (optional)

Both streams run simultaneously for maximum parallelism.

## Input

- Wave A Manifest (WAVE-A-MANIFEST.yaml)
- Phase plans with `wave: B` in frontmatter
- Built artifacts from Wave A

## Output

- Test results
- Validation reports
- Remediation recommendations
- Final verdict: PASS, NEEDS_WORK, or FAIL

## Execution Steps

### Step 1: Validate Wave A Completion

```
Load WAVE-A-MANIFEST.yaml
Check:
- status == "complete"
- All service_groups have status "complete" (or user accepted partial)
- files_created exist on disk

If validation fails:
- Error: "Wave A incomplete or manifest missing. Run Wave A first."
- Stop before spawning Wave B agents
```

### Step 2: Group Wave B Plans by Role

```
Parse all Wave B plans:
- execution_plans: wave_role == "execution"
- remediation_plans: wave_role == "remediation"

Note: Both groups run in parallel — no dependency between them.
```

### Step 3: Parallel Execution Stream

```
For each execution plan:
  1. Load test/validation agent personality
  2. Inject authority constraints
  3. Provide access to Wave A outputs (via manifest)
  4. Spawn agent (parallel with other execution plans)

Wait for all execution agents
Collect: Test results, validation reports
```

### Step 4: Parallel Remediation Stream (Optional)

```
If remediation_plans exist:
  For each remediation plan:
    1. Load SRE/data scientist agent personality
    2. Inject authority constraints
    3. Provide access to Wave A outputs
    4. Spawn agent (parallel with execution stream)

  Remediation runs simultaneously with execution
  No waiting — both produce findings independently

Collect: Chaos test results, risk assessments, recommendations
```

### Step 5: Synthesize Findings

```
Input: Execution findings[], Remediation findings[]
Output: Consolidated validation report

Synthesis process:
1. Deduplicate by location (file:line)
2. Apply authority filtering (filter out-of-domain critiques)
3. Severity escalation if reviewers disagree
4. Categorize:
   - BLOCKERS: Must fix before production
   - WARNINGS: Should fix, can defer
   - SUGGESTIONS: Nice to have

Cross-stream integration:
- Execution found performance issue + Remediation confirmed risk = Escalate severity
- Execution passed + Remediation flagged chaos failure = Investigate
- Both streams agree = High confidence finding
```

### Step 6: Production Readiness Gate

```
Present synthesis report to user:

"Wave B Complete — Production Readiness Review

Execution Results:
- Unit tests: 45/45 passed
- Integration tests: 12/12 passed
- Performance benchmark: Within SLA

Remediation Results:
- Chaos tests: 2 failures (recovered)
- Risk assessment: Medium risk identified

Findings Summary:
| Severity | Count | Categories |
|----------|-------|------------|
| BLOCKER  | 0     | —          |
| WARNING  | 2     | performance, resilience |
| SUGGESTION | 3   | code style, docs |

Verdict: NEEDS_WORK

Recommended Actions:
1. Address performance warning (see execution findings)
2. Review chaos test failures (see remediation findings)

Options:
1. Fix issues and re-run Wave B
2. Accept risks and complete phase
3. Abort phase and reconsider approach
"

User selects option.
```

### Step 7: Finalize Phase

**If verdict == PASS:**
```
- Mark phase complete in STATE.md
- Generate phase SUMMARY.md
- Suggest: "/legion:review for final validation"
```

**If verdict == NEEDS_WORK:**
```
- Offer fix cycle:
  a. Auto-fix: Spawn agents to address blockers/warnings
  b. Manual fix: User fixes, re-run Wave B
- Track fixes in .planning/phases/{NN}/FIXES.md
```

**If verdict == FAIL:**
```
- Block phase completion
- Report: "Phase {N} failed production readiness. Review findings above."
- Suggest: "/legion:review for diagnosis"
```

## Remediation Parallelism

Key insight: Remediation doesn't wait for validation to finish.

```
Traditional: Test → Fix → Re-test (sequential)
Two-wave:     Test + Chaos (parallel) → Synthesize → Decide

Benefits:
- Faster feedback: Know test results AND chaos results simultaneously
- Better decisions: Test + chaos together reveal real-world behavior
- No idle time: Chaos testing runs while tests run
```

## Authority in Wave B

Execution and remediation agents have different domains:

| Stream | Typical Domains | Domain Owners |
|--------|----------------|---------------|
| Execution | testing, verification | testing-* agents |
| Remediation | chaos, resilience, data | testing-performance (chaos), data-* |

No conflicts expected — streams are domain-separated.

If conflicts arise:
- Testing finding vs Remediation finding: Both valid, keep both
- Two testing agents on same test: Deduplicate by location
- Out-of-domain critique: Filter per authority matrix

## Error Handling

**Execution Stream Failure:**
- Log failure
- Continue remediation stream (don't block)
- Note in synthesis: "Execution partial, remediation complete"

**Remediation Stream Failure:**
- Log failure
- Continue execution stream
- Note in synthesis: "Execution complete, remediation unavailable"

**Both Streams Fail:**
- Critical error
- Report: "Wave B failed. Both execution and remediation streams errored."
- Stop phase, require investigation

## Wave B Manifest

Optional: Write `.planning/phases/{NN}/WAVE-B-MANIFEST.yaml`:

```yaml
wave: B
phase: 38-intent-driven
status: complete
timestamp: "2026-03-05T11:00:00Z"
dependent_on: WAVE-A-MANIFEST

execution:
  plans: [38-04, 38-05]
  status: complete
  results:
    tests_passed: 57
    tests_failed: 0
    benchmarks: {status: pass, sla_met: true}

remediation:
  plans: [38-06]
  status: complete
  results:
    chaos_tests: {run: 10, passed: 8, failed: 2}
    risk_level: medium

synthesis:
  findings:
    blockers: 0
    warnings: 2
    suggestions: 3
  verdict: NEEDS_WORK

gate: production_readiness
  status: needs_work
  user_decision: fix_and_rerun
```
