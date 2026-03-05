# Two-Wave Phase Plan Template

Use this template for phases that benefit from two-wave execution (build + analysis in Wave A, execution in Wave B).

## Frontmatter Fields

Standard fields plus two-wave extensions:

```yaml
---
phase: XX-name
plan: NN
type: execute
wave: A | B                    # Required for two-wave: A or B
depends_on: []                 # Can reference other wave plans
files_modified: []
autonomous: true | false
requirements: []

# Two-wave specific fields:
wave_role: build | analysis | execution | remediation
service_group: frontend | backend | shared | infrastructure | etc
wave_a_outputs: []             # For Wave B plans: list of Wave A plans that produce inputs
authority_scope: []            # Domains this plan touches
---
```

## Wave Roles

### Wave A Roles

**build**: Creates artifacts (code, configs, docs)
- Example: "Create frontend components", "Build backend API"
- Agents: engineering-*, design-*
- Output: Files on disk, SUMMARY.md

**analysis**: Reviews Wave A outputs, produces findings
- Example: "Security audit of auth system", "Architecture review"
- Agents: security-engineer, backend-architect, ux-architect
- Input: Wave A SUMMARY.md files
- Output: Findings report, recommendations

### Wave B Roles

**execution**: Tests, validates, verifies
- Example: "Run integration tests", "Performance benchmark"
- Agents: testing-*, engineering-*
- Input: Wave A artifacts
- Output: Test results, verification reports

**remediation**: Fixes issues, chaos testing (parallel to execution)
- Example: "SRE chaos testing", "Data scientist validation"
- Agents: testing-performance-benchmarker (chaos), data-* (if exists)
- Input: Wave A artifacts
- Output: Remediation recommendations, risk assessments

## Example Two-Wave Phase

```yaml
# 38-01-PLAN.md — Wave A, Build, Frontend
---
phase: 38-intent-driven
plan: 01
type: execute
wave: A
depends_on: []
files_modified: [src/frontend/components/IntentFlags.tsx]
autonomous: false
requirements: [INTENT-01]
wave_role: build
service_group: frontend
authority_scope: [frontend-architecture, component-design]
---
```

```yaml
# 38-03-PLAN.md — Wave A, Analysis, Security
---
phase: 38-intent-driven
plan: 03
type: execute
wave: A
depends_on: [38-01, 38-02]
files_modified: []
autonomous: false
requirements: [INTENT-05]
wave_role: analysis
service_group: all
wave_a_outputs: [38-01, 38-02]
authority_scope: [security, owasp]
---
```

```yaml
# 38-04-PLAN.md — Wave B, Execution, Testing
---
phase: 38-intent-driven
plan: 04
type: execute
wave: B
depends_on: []
files_modified: []
autonomous: false
requirements: [INTENT-06]
wave_role: execution
service_group: all
wave_a_outputs: [38-01, 38-02, 38-03]
authority_scope: [testing, verification]
---
```

## Wave Dependencies

Wave B plans implicitly depend on Wave A completing:
- If any Wave A plan fails → Wave B does not run
- Wave B `depends_on` can reference Wave A plan IDs
- Wave B `wave_a_outputs` lists which Wave A plans produced its inputs

## Gates

Two gates exist in two-wave mode:

1. **Architecture Gate** (between Wave A and Wave B)
   - Triggered if any Wave A analysis plans exist
   - Shows analysis findings
   - User decides: proceed to Wave B, or fix Wave A first

2. **Production Readiness Gate** (after Wave B)
   - Synthesizes Wave B execution findings
   - Verdict: PASS, NEEDS_WORK, FAIL
   - FAIL blocks phase completion

## Service Groups

Service groups enable parallel builds in Wave A:

```
Wave A:
- Group 1: Frontend (plans 01, 02)
- Group 2: Backend (plans 03, 04)
- Group 3: Shared (plans 05)

Each group runs in parallel. Groups don't block each other.
```

Define service_group in plan frontmatter. Plans without service_group run as "ungrouped".

## Authority Scope

Authority scope prevents conflicts in parallel execution:

```yaml
authority_scope: [security, owasp]
```

This plan touches security domain. If security-engineer is also active, this plan defers on security topics.
