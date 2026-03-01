---
name: agency:review
description: Run quality review cycle with testing/QA agents
argument-hint: [--phase N]
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
---

<objective>
Select appropriate review agents and run a dev-QA loop: review, fix, re-review (max 3 cycles). Phase is not marked complete until review passes.
</objective>

<execution_context>
@./.claude/skills/agency/workflow-common.md
@./.claude/skills/agency/agent-registry.md
<!-- Phase 5: @./.claude/skills/agency/review-loop.md -->
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<process>
1. Determine target phase from $ARGUMENTS or STATE.md
2. Select review agents based on phase type:
   - Code phases: testing-reality-checker, testing-evidence-collector
   - API phases: testing-api-tester, testing-reality-checker
   - Design phases: design-brand-guardian, testing-reality-checker
   - Marketing phases: testing-workflow-optimizer, testing-reality-checker
3. Spawn review agents with personality injection
4. Collect review feedback — must be specific and actionable (file:line, exact issue)
5. If issues found:
   a. Route fixes to appropriate implementation agents
   b. Re-run review (max 3 cycles)
   c. If 3 cycles fail, escalate to user with summary
6. If review passes:
   a. Mark phase complete in STATE.md and ROADMAP.md
   b. Commit review artifacts
   c. Route to next phase (/agency:plan N+1) or project complete
</process>
