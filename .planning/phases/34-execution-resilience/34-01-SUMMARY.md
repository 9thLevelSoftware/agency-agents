---
phase: 34-execution-resilience
plan: "01"
subsystem: workflow-common, build-command
tags: [execution-resilience, auto-remediation, output-redirection, error-classification, agent-prompts]
dependency_graph:
  requires: []
  provides: [Auto-Remediation Pattern, Output Redirection Convention, Execution Resilience agent prompt sections]
  affects: [skills/workflow-common/SKILL.md, commands/build.md]
tech_stack:
  added: []
  patterns: [BLOCKER-vs-ENVIRONMENT-classification, temp-file-output-redirection, max-one-remediation-attempt, authority-matrix-scope-limits]
key_files:
  modified:
    - skills/workflow-common/SKILL.md
    - commands/build.md
decisions:
  - BLOCKER vs ENVIRONMENT classification is the core decision gate — environment errors auto-fix, business logic errors always escalate
  - Max 1 remediation attempt per unique error prevents infinite retry loops
  - Auto-remediation scope is bounded by the CLAUDE.md authority matrix (declared deps, expected dirs only)
  - Auto-remediated-then-succeeded agents remain "Complete" status — successful remediation is transparent to callers
  - Output redirection never applies to test runners, linting, or type-checkers — those outputs are always informative
  - Execution Resilience content is identical in both personality and autonomous agent prompts — all agents get the same contract
metrics:
  duration_minutes: 2
  completed_date: "2026-03-02"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 34 Plan 01: Execution Resilience — Auto-Remediation and Output Redirection Summary

**One-liner:** Added BLOCKER vs ENVIRONMENT error classification with auto-remediation flow and verbose-command output redirection to workflow-common, then injected identical Execution Resilience instructions into both personality and autonomous agent prompt templates in the build command.

## What Was Built

Two conventions now govern all Legion agent execution:

**Auto-Remediation Pattern** — Agents classify errors before reporting failure. BLOCKER errors (business logic, API design, test assertion failures) stop the task and surface to the coordinator. ENVIRONMENT errors (missing packages, wrong versions, missing directories) trigger a single auto-remediation attempt: generate and execute a fix, retry the failed step, then escalate to BLOCKER if the retry also fails. The scope of autonomous remediation is bounded by the CLAUDE.md authority matrix — only declared dependencies and expected directories; never unplanned additions. All remediation actions are reported in the task completion summary as `Auto-remediated: {error} → {fix} → {retry result}`.

**Output Redirection Convention** — Commands known to produce verbose output (npm/pip/cargo install, docker build, go build, and similar) redirect stdout+stderr to `/tmp/legion-*` temp files. Agents check the exit code, surface only the last 20 lines on failure, and report a one-line confirmation on success. Test runners, linters, and type-checkers are explicitly excluded — their output is always kept visible.

Both conventions are documented in `skills/workflow-common/SKILL.md` and injected into agent prompts via `commands/build.md`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add Auto-Remediation Pattern and Output Redirection Convention to workflow-common | 959c6ca | skills/workflow-common/SKILL.md |
| 2 | Update build command with Execution Resilience instructions | 24cbce6 | commands/build.md |

## Decisions Made

1. **BLOCKER vs ENVIRONMENT as the primary gate** — The classification determines whether an agent self-heals or escalates. The boundary is clear: errors that reference code behavior, API contracts, or test logic are BLOCKER; errors that reference system state (deps, versions, dirs) are ENVIRONMENT.

2. **Max 1 remediation attempt** — Prevents agents from entering retry loops. If the first fix attempt fails or the retry after a successful fix also fails, the error escalates immediately to BLOCKER. This avoids wasting compute on unresolvable environment issues.

3. **Authority matrix as remediation scope boundary** — Auto-remediation inherits the same scope limits as all other autonomous actions. Agents can install declared dependencies, create expected directories, and run standard setup commands. They cannot add unplanned dependencies, modify build config, or change CI/CD settings even to resolve environment issues.

4. **Transparent remediation status** — An agent that auto-remediated and ultimately succeeded is reported as "Complete" (not "Complete with Warnings"). The remediation details are included in SUMMARY.md under a dedicated `## Auto-Remediation` section for visibility without polluting the status signal.

5. **Identical agent prompt content** — The Execution Resilience section is word-for-word the same in both personality-injected and autonomous agent prompts. All agents receive the same resilience contract regardless of execution mode.

6. **Output redirection excludes diagnostics** — The never-redirect list (test runners, linters, type-checkers) is explicit and non-negotiable. These outputs contain actionable information that agents must see to act on. The ambiguity rule ("if unsure, do NOT redirect") defaults to safety.

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

All plan verification checks passed:

**workflow-common:**
- PASS: `## Auto-Remediation Pattern` section present
- PASS: `## Output Redirection Convention` section present
- PASS: BLOCKER vs ENVIRONMENT classification table present (7 BLOCKER refs, 6 ENVIRONMENT refs)
- PASS: Max 1 remediation attempt per error documented
- PASS: Authority matrix referenced for scope limits
- PASS: `tail -20` temp file pattern present
- PASS: Never-redirect list present
- PASS: Test commands (npm test, jest, pytest) excluded from redirection
- PASS: Lint/typecheck (eslint, tsc --noEmit) excluded from redirection
- PASS: Section order correct (Error Handling → Auto-Remediation → Output Redirection → Division Constants)

**build.md:**
- PASS: `## Execution Resilience` in personality agent prompt
- PASS: `## Execution Resilience` in autonomous agent prompt (2 total)
- PASS: BLOCKER referenced (5 times)
- PASS: ENVIRONMENT referenced (5 times)
- PASS: Auto-remediation reporting in Step 4.f result processing
- PASS: Output redirection instruction present (verbose commands reference)
- PASS: Temp file reference present
- PASS: Last 20 lines reference present

## Self-Check: PASSED

All files present and all commits verified:
- skills/workflow-common/SKILL.md — FOUND
- commands/build.md — FOUND
- .planning/phases/34-execution-resilience/34-01-SUMMARY.md — FOUND
- Commit 959c6ca — FOUND
- Commit 24cbce6 — FOUND
