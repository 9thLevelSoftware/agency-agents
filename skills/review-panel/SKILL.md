---
name: legion:review-panel
description: Dynamic multi-perspective review panel composition with domain-weighted rubrics and synthesis
---

# Review Panel

Composes context-aware multi-perspective review teams from the 51-agent pool. Each reviewer evaluates through domain-specific weighted rubrics with non-overlapping criteria. Produces a synthesized consolidated report.

Used by `/legion:review` when panel mode is selected. Replaces the static phase-type-to-agent mapping with dynamic selection via agent-registry recommendation algorithm.

---

## Section 1: Panel Composition Algorithm

How to assemble a review panel dynamically based on what's being reviewed.

```
Input: Phase CONTEXT.md content, SUMMARY.md content, files_modified list
Output: Ordered list of 2-4 reviewer agents with assigned rubrics

Step 1: Extract review signals from phase artifacts
  Read the phase CONTEXT.md and all SUMMARY.md files. Extract:
  - Primary domains touched (engineering, design, marketing, testing, product, infrastructure)
  - File types produced (.md, .ts, .js, .css, .py, config files, etc.)
  - Keywords from phase goal and task descriptions
  - Combine into a composite task description for the recommendation algorithm

Step 2: Score agents using agent-registry Section 3
  Pass the composite task description to the agent-registry recommendation algorithm:
  - Step 1: Parse extracted keywords as task terms
  - Step 2: Match agents — exact (3 pts), partial (1 pt), division (2 pts)
  - Step 3: Rank by score, break ties by specificity
  - Step 4.5: Apply memory boost if OUTCOMES.md exists

Step 3: Filter to review-capable agents
  From the ranked list, keep only agents whose specialty includes evaluation,
  review, quality, testing, or validation capabilities. Eligible agents:

  Testing division (all 7):
  - testing-reality-checker, testing-evidence-collector, testing-api-tester
  - testing-workflow-optimizer, testing-performance-benchmarker
  - testing-test-results-analyzer, testing-tool-evaluator

  Design division (review-capable):
  - design-brand-guardian, design-ux-architect, design-ux-researcher

  Engineering division (review-capable):
  - engineering-senior-developer, engineering-backend-architect
  - engineering-frontend-developer, engineering-devops-automator

  Product division (review-capable):
  - product-sprint-prioritizer, product-feedback-synthesizer

  Project Management (review-capable):
  - project-manager-senior, project-management-project-shepherd

  If an agent from a non-review-capable role (e.g., marketing-tiktok-creator,
  spatial-computing-xr-immersive-designer) scores highly, skip it and take the
  next eligible agent.

Step 4: Cap panel size and enforce diversity
  - 2 reviewers: single-domain phase (only one division touched)
  - 3 reviewers: standard phase (2 divisions involved)
  - 4 reviewers: cross-domain phase (3+ divisions involved)

  Diversity rule: no more than 2 reviewers from the same division.
  If 3+ agents from Testing score highest, keep the top 2 and pull the
  next-highest from a different division.

  Mandatory: at least one Testing division agent on every panel.
  This inherits from agent-registry Step 5 (Mandatory Roles) and from
  the existing review-loop principle that testing-reality-checker is
  always included.

Step 5: Assign rubrics
  For each selected reviewer, look up their domain rubric from Section 2.
  The rubric is keyed by agent ID. If no specific rubric exists for an agent,
  use the division default rubric.

Step 6: Present panel to user for confirmation
  Display the composed panel via AskUserQuestion:

  ## Phase {N}: {phase_name} — Review Panel

  **Panel Size**: {count} reviewers (based on {domain_count} domain(s) detected)
  **Domains Detected**: {comma-separated domains}

  | # | Agent | Division | Rubric Focus | Score |
  |---|-------|----------|--------------|-------|
  | 1 | {agent-id} | {division} | {rubric_name} | {score} pts |
  | 2 | {agent-id} | {division} | {rubric_name} | {score} pts |

  **Why this panel**: {1-sentence rationale linking detected domains to selected agents}

  Options:
  - "Use this panel" (Recommended)
  - "Add a reviewer" — add one more agent from the ranked list (up to max 4)
  - "Replace a reviewer" — swap one reviewer for an alternative
  - "Other" — enter custom agent IDs

  If user selects "Add a reviewer": show next-ranked eligible agent, confirm
  If user selects "Replace a reviewer": show which reviewer to replace and alternatives
  If user selects "Other": accept custom agent IDs, validate each exists, assign default rubric
```

---

## Section 2: Domain Rubric Registry

Non-overlapping evaluation criteria for each reviewer specialty. Each rubric defines what that reviewer checks — and implicitly, what they do NOT check (that's another reviewer's rubric).

### How Rubrics Work

A rubric is a set of 3-5 evaluation criteria injected into the review prompt alongside the reviewer's personality. Each criterion has a name and description. The reviewer evaluates ONLY against their assigned criteria, producing findings scoped to their domain lens.

Rubrics are injected into the review prompt as an additional section AFTER the standard review instructions from review-loop Section 3 and BEFORE the "Required Feedback Format" section:

```
## Your Domain Rubric — {rubric_name}

Evaluate ONLY against these criteria. Other aspects are covered by fellow panel reviewers.

| # | Criterion | What to Check |
|---|-----------|---------------|
| 1 | {name}    | {description} |
| 2 | {name}    | {description} |
...

For each finding, tag it with the criterion number: "**Criterion**: {N} — {criterion_name}"
```

### Rubric Definitions

#### Testing Division

**testing-reality-checker** — Production Readiness
| # | Criterion | What to Check |
|---|-----------|---------------|
| 1 | Error handling | Edge cases covered, failures degrade gracefully, no silent swallowing |
| 2 | Real-world usage | Works outside happy path — unexpected input, missing state, concurrent access |
| 3 | Stability | No crashes, hangs, or resource leaks under normal operation |
| 4 | Integration correctness | Cross-file references resolve, dependencies exist, imports work |

**testing-evidence-collector** — Verification Completeness
| # | Criterion | What to Check |
|---|-----------|---------------|
| 1 | Proof artifacts | Test files, verification scripts, or documented test runs exist for claims |
| 2 | Coverage breadth | All success criteria have corresponding verification, not just some |
| 3 | Before/after documentation | Changes are documented with what changed and why |
| 4 | Reproducibility | Verification steps can be repeated by someone else with same results |

**testing-api-tester** — API Contract Compliance
| # | Criterion | What to Check |
|---|-----------|---------------|
| 1 | Endpoint correctness | Routes, methods, status codes match specification |
| 2 | Request/response validation | Payloads conform to schema, required fields present, types correct |
| 3 | Security boundaries | Auth required where expected, no unprotected sensitive endpoints |
| 4 | Error responses | API returns structured errors, not stack traces or generic 500s |

**testing-workflow-optimizer** — Process Efficiency
| # | Criterion | What to Check |
|---|-----------|---------------|
| 1 | Workflow correctness | Steps execute in right order, no dead ends or unreachable paths |
| 2 | Redundancy | No duplicated logic, unnecessary steps, or circular dependencies |
| 3 | Automation opportunity | Manual steps that could be automated are flagged |
| 4 | Handoff clarity | Inputs and outputs between workflow steps are well-defined |

**testing-performance-benchmarker** — Performance Characteristics
| # | Criterion | What to Check |
|---|-----------|---------------|
| 1 | Resource efficiency | No unnecessary file reads, API calls, or memory allocation |
| 2 | Scalability indicators | Approach handles growth (more agents, larger files, more phases) |
| 3 | Bottleneck risk | Sequential operations that could be parallelized |
| 4 | Cost awareness | Agent spawn count, model tier usage aligned with cost profile convention |

**testing-test-results-analyzer** — Test Quality Metrics
| # | Criterion | What to Check |
|---|-----------|---------------|
| 1 | Assertion quality | Tests check meaningful behavior, not just "no crash" |
| 2 | Test isolation | Tests don't depend on each other or shared mutable state |
| 3 | Regression coverage | Changes include tests that would catch if the change broke |
| 4 | Flakiness risk | Tests depend on stable data, not timing, random values, or external services |

**testing-tool-evaluator** — Dependency & Tool Health
| # | Criterion | What to Check |
|---|-----------|---------------|
| 1 | Dependency health | Referenced tools, libraries, or services are current and maintained |
| 2 | Compatibility | Dependencies work together, no version conflicts or breaking changes |
| 3 | License compliance | No restrictive licenses that conflict with project distribution |
| 4 | Alternatives considered | Better tools exist for the job and weren't evaluated |

#### Design Division

**design-brand-guardian** — Brand Consistency
| # | Criterion | What to Check |
|---|-----------|---------------|
| 1 | Visual identity | Colors, typography, spacing follow brand guidelines |
| 2 | Voice and tone | Copy and messaging match brand personality |
| 3 | Component consistency | UI elements use shared design tokens, not ad-hoc values |

**design-ux-architect** — Accessibility & Structure
| # | Criterion | What to Check |
|---|-----------|---------------|
| 1 | WCAG compliance | Contrast ratios, keyboard navigation, screen reader support |
| 2 | Information architecture | Content is logically organized, navigation is intuitive |
| 3 | Semantic structure | HTML is semantic, headings are hierarchical, landmarks are correct |

**design-ux-researcher** — Usability
| # | Criterion | What to Check |
|---|-----------|---------------|
| 1 | Nielsen's heuristics | Visibility of status, user control, consistency, error prevention |
| 2 | User flow completeness | Can users complete the intended task without getting stuck? |
| 3 | Cognitive load | Interface doesn't overwhelm — progressive disclosure, clear hierarchy |

#### Engineering Division

**engineering-senior-developer** — Code Architecture
| # | Criterion | What to Check |
|---|-----------|---------------|
| 1 | Pattern consistency | New code follows established project patterns and conventions |
| 2 | Abstraction quality | Right level of abstraction — not over-engineered, not duplicated |
| 3 | Maintainability | Code is readable, changes are localized, dependencies are explicit |
| 4 | Tech debt | New code doesn't introduce unnecessary technical debt |

**engineering-backend-architect** — Backend Design
| # | Criterion | What to Check |
|---|-----------|---------------|
| 1 | Data modeling | Data structures are appropriate, relationships are clear |
| 2 | API design | Endpoints are RESTful/consistent, versioning considered |
| 3 | Infrastructure patterns | Deployment, scaling, and monitoring are addressed |

**engineering-frontend-developer** — Frontend Quality
| # | Criterion | What to Check |
|---|-----------|---------------|
| 1 | Component structure | Components are reusable, props are typed, state is minimal |
| 2 | Rendering correctness | No unnecessary re-renders, loading states handled, errors caught |
| 3 | Responsive design | Layout works across viewport sizes, touch targets are adequate |

**engineering-devops-automator** — Operational Readiness
| # | Criterion | What to Check |
|---|-----------|---------------|
| 1 | CI/CD integration | Changes are testable in pipeline, no manual deployment steps |
| 2 | Configuration management | Secrets are not hardcoded, env-specific config is externalized |
| 3 | Monitoring & logging | Errors are observable, metrics are available for alerting |

#### Product Division

**product-sprint-prioritizer** — Prioritization Alignment
| # | Criterion | What to Check |
|---|-----------|---------------|
| 1 | Business value | Implementation delivers the intended user/business value |
| 2 | Scope discipline | No scope creep beyond what was planned |
| 3 | Dependency management | Cross-phase and external dependencies are tracked and resolved |

**product-feedback-synthesizer** — User Alignment
| # | Criterion | What to Check |
|---|-----------|---------------|
| 1 | User need coverage | Implementation addresses the core user pain point or request |
| 2 | Feedback incorporation | Known user feedback was considered in the implementation |
| 3 | Satisfaction drivers | The output is likely to improve user satisfaction |

#### Project Management Division

**project-manager-senior** — Delivery Management
| # | Criterion | What to Check |
|---|-----------|---------------|
| 1 | Scope completeness | All planned deliverables are present |
| 2 | Risk mitigation | Known risks were addressed or documented |
| 3 | Documentation | Handoff documentation is sufficient for the next phase |

**project-management-project-shepherd** — Process Compliance
| # | Criterion | What to Check |
|---|-----------|---------------|
| 1 | Methodology adherence | Work followed the established workflow (plan → build → review) |
| 2 | Artifact quality | State files, summaries, and plans are complete and accurate |
| 3 | Handoff readiness | Next phase can start without ambiguity about what was done |

#### Division Default Rubrics

For agents not listed above, use the default rubric for their division:

| Division | Default Rubric | Criteria |
|----------|---------------|----------|
| Testing | General QA | Correctness, completeness, consistency |
| Design | General Design Review | Visual quality, usability, accessibility |
| Engineering | General Code Review | Correctness, patterns, maintainability |
| Product | General Product Review | Value delivery, scope, alignment |
| Project Management | General Delivery Review | Completeness, documentation, handoff |

---

## Section 3: Panel Result Synthesis

How to consolidate findings from multiple panel reviewers into a unified report.

```
After all panel reviewers submit findings via SendMessage:

Step 1: Collect and parse
  Same as review-loop Section 4 (Feedback Collection):
  - Parse Finding blocks from each reviewer
  - Record: finding number, file, line/section, severity, issue, suggested fix,
    reviewer agent ID, criterion tag (from rubric)

Step 2: Deduplicate across reviewers
  Same deduplication rules as review-loop Section 4, Step 2:
  - Same file + same line/section: keep highest severity
  - Same file + different lines: keep both
  - Severity disagreement on same issue: escalate to BLOCKER

Step 3: Group by domain lens
  Organize findings by each reviewer's rubric focus area:

  ### {Rubric Name} — {agent-id}
  **Verdict**: {PASS | NEEDS WORK | FAIL}

  | # | Severity | File | Criterion | Issue |
  |---|----------|------|-----------|-------|
  | 1 | BLOCKER  | path | {criterion_name} | {issue} |

Step 4: Identify cross-cutting themes
  Scan across all domain groupings for patterns:
  - Multiple reviewers flagging the same file (from different criteria) → "Hot spot"
  - Findings clustering around the same success criterion → "Criterion at risk"
  - All reviewers passing a particular area → "Strong area"

  ### Cross-Cutting Themes
  - **Hot spots**: Files flagged by 2+ reviewers: {file list with finding counts}
  - **Criteria at risk**: Success criteria with 2+ findings against them: {list}
  - **Strong areas**: Aspects with no findings from any reviewer: {list}

Step 5: Compute aggregate verdict
  - PASS: No BLOCKERs, no WARNINGs, all reviewers gave PASS
  - NEEDS WORK: Has BLOCKERs or WARNINGs, at least one reviewer gave NEEDS WORK
  - FAIL: Any reviewer gave FAIL, or 3+ BLOCKERs across reviewers

Step 6: Produce consolidated report
  Display the synthesis to the user:

  ## Review Panel Synthesis — Phase {N}: {phase_name}

  **Panel**: {count} reviewers across {domains} domain(s)
  **Aggregate Verdict**: {PASS | NEEDS WORK | FAIL}

  ### Summary
  | Metric | Count |
  |--------|-------|
  | Total findings | {N} |
  | Blockers | {N} |
  | Warnings | {N} |
  | Suggestions | {N} |

  {Domain lens groupings from Step 3}

  {Cross-cutting themes from Step 4}

  ### Panel Verdicts
  | Reviewer | Rubric Focus | Verdict | Key Finding |
  |----------|-------------|---------|-------------|
  | {agent-id} | {rubric_name} | {verdict} | {most critical finding or "No issues"} |

  The aggregate verdict and must-fix list then feed back into the standard
  review-loop cycle (Section 5: Fix Cycle if NEEDS WORK, Section 7 if PASS,
  Section 8 if escalated after 3 cycles).
```

---

## References

This skill extends patterns defined in:

| Pattern | Source | Used In |
|---------|--------|---------|
| Recommendation Algorithm | agent-registry.md Section 3 | Section 1 (panel composition) |
| Review Prompt Construction | review-loop.md Section 3 | Section 2 (rubric injection point) |
| Feedback Collection | review-loop.md Section 4 | Section 3 (synthesis dedup) |
| Mandatory Roles | agent-registry.md Section 3, Step 5 | Section 1, Step 4 (testing agent required) |
| Memory Boost | agent-registry.md Section 3, Step 4.5 | Section 1, Step 2 (optional scoring boost) |
