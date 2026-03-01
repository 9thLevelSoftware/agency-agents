# Phase 5: Quality Gates — Context

## Phase Goal
Users can type `/agency:review` and trigger a review cycle where testing/QA agents evaluate the work with specific feedback, iterating up to 3 fix cycles before escalation.

## Requirements Covered
- QA-01: `/agency:review` command — triggers quality review cycle
- QA-02: Review agent selection — maps task type to appropriate testing/review agents
- QA-03: Specific actionable feedback — reviewers cite exact issues, not vague assessments
- QA-04: Fix loop — max 3 cycles of review → fix → re-review before escalation
- QA-05: Verification before completion — no phase marked done without passing review

## What Already Exists (from Phases 1-4)

### Scaffold Command
`.claude/commands/agency/review.md` — has frontmatter (name, description, argument-hint, allowed-tools), objective, execution_context, context, and a 6-step placeholder process. References `review-loop.md` as a commented-out future skill. Includes a review-agent selection map by phase type (code, API, design, marketing).

### Supporting Skills (ready to use)
- `.claude/skills/agency/workflow-common.md` — state paths, plan file conventions, wave execution pattern, cost profiles, personality injection pattern, error handling pattern, division constants
- `.claude/skills/agency/agent-registry.md` — 51-agent catalog (Section 1), task type index (Section 2), recommendation algorithm (Section 3), team assembly patterns (Section 4)
- `.claude/skills/agency/wave-executor.md` — parallel execution engine with personality injection (used by /agency:build, reference for agent spawning patterns)
- `.claude/skills/agency/execution-tracker.md` — progress tracking with STATE.md updates, ROADMAP.md progress, atomic git commits
- `.claude/skills/agency/phase-decomposer.md` — plan file format reference (how plans are structured, what success_criteria and verification look like)

### State Files
- `.planning/PROJECT.md` — project vision, requirements, constraints
- `.planning/ROADMAP.md` — phase breakdown with goals, requirements, success criteria, progress table
- `.planning/STATE.md` — current position, recent activity, next action
- `.planning/REQUIREMENTS.md` — requirement tracking with traceability

### Testing Division Agents (7 agents available for review)
| Agent | Specialty | Best For |
|-------|-----------|----------|
| testing-reality-checker | Evidence-based certification, defaults to "NEEDS WORK" | Final go/no-go, production readiness |
| testing-evidence-collector | Screenshot-obsessed QA, defaults to finding 3-5 issues | Visual proof, bug verification |
| testing-api-tester | Comprehensive API validation and quality assurance | API phases, integration testing |
| testing-test-results-analyzer | Test result evaluation and quality metrics | Analyzing test output, quality metrics |
| testing-performance-benchmarker | Performance measurement and optimization | Performance-heavy phases |
| testing-workflow-optimizer | Process analysis and efficiency optimization | Workflow/process phases |
| testing-tool-evaluator | Technology assessment and tool evaluation | Tool-focused phases |

### Additional Review Agents (from other divisions)
| Agent | Specialty | Best For |
|-------|-----------|----------|
| design-brand-guardian | Brand consistency and identity | Design/branding phases |
| design-ux-researcher | Usability testing and user behavior | UX-focused phases |
| agents-orchestrator | Pipeline management and coordination | Multi-agent workflow phases |

### Existing Patterns to Follow
- **Personality Injection** (workflow-common.md): Read agent .md → construct prompt with personality + task → spawn via Agent tool
- **Agent Spawning** (wave-executor.md): TeamCreate for coordination, parallel Agent calls, SendMessage for results
- **State Updates** (execution-tracker.md): Read STATE.md → update fields → write back, git commits for meaningful changes
- **Error Handling** (workflow-common.md): Capture errors, don't auto-retry, report to user
- **Cost Profiles** (workflow-common.md): Sonnet for execution agents, Opus for planning

### Claude Code Primitives Available
- **Agent tool**: Spawn subagents with `subagent_type`, `prompt`, `model`, `name`, `team_name`, `run_in_background`
- **TeamCreate**: Create a team with shared task list for coordinated agents
- **TaskCreate/TaskUpdate/TaskList**: Track work items within a team
- **SendMessage**: Inter-agent communication within teams
- **Bash**: Git commands for atomic commits

## Key Design Decisions

### Review-loop is a skill, not an agent
Like wave-executor and phase-decomposer, the review-loop skill tells Claude HOW to run the dev-QA cycle — it's loaded as instructions. The `/agency:review` command orchestrates the process and invokes the skill's methodology.

### Review agents are personality-injected
Same pattern as /agency:build: review agents are spawned with their full .md personality file as system prompt. The testing agents' built-in skepticism and evidence requirements are features, not bugs.

### Structured feedback format enforced by prompt
Review agents are instructed to return findings in a structured format: issue location (file:line or artifact), severity (blocker/warning/suggestion), exact description, and suggested fix. This fulfills QA-03's requirement for specific, actionable feedback — not "looks good" or vague letter grades.

### Fix routing uses agent-registry
When review findings need fixes, the review-loop determines which agent is best suited to fix each issue. Code issues → engineering agents. Design issues → design agents. The same recommendation algorithm from agent-registry applies.

### Three-cycle cap with user escalation
The review → fix → re-review loop runs a maximum of 3 cycles. If issues persist after 3 cycles, the loop escalates to the user with a full summary of remaining issues. This prevents infinite loops while ensuring quality. The 3-cycle cap is per-phase, not per-issue.

### Phase completion gated on review pass
The execution-tracker's phase completion tracking is only triggered AFTER the review loop passes. STATE.md and ROADMAP.md show "Complete" only when review agents sign off.

### Cost profile: Sonnet for review agents, Sonnet for fix agents
Review and fix agents both run at Sonnet cost tier (execution work). The orchestrating review command itself runs at whatever model the user's session uses.

## Plan Structure
- **Plan 05-01 (Wave 1)**: Create review-loop skill — the dev-QA loop engine with structured feedback and fix routing
- **Plan 05-02 (Wave 2)**: Update review.md command to full implementation — wire skill and implement review flow
