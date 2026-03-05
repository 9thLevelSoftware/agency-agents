# Wave A Execution Protocol

Build + Analysis wave for two-wave pattern.

## Purpose

Wave A produces all build artifacts and initial analysis. It runs in two sub-phases:
1. **Build Phase**: Parallel builds per service group
2. **Analysis Phase**: Parallel analysis of build outputs

## Input

- Phase plans with `wave: A` in frontmatter
- Service group assignments from `service_group` field
- Authority matrix for domain ownership

## Output

- Built artifacts (files on disk)
- SUMMARY.md for each build plan
- Analysis findings (if analysis plans exist)
- Wave A Manifest (.planning/phases/{NN}/WAVE-A-MANIFEST.yaml)

## Execution Steps

### Step 1: Group Plans by Service

```
Parse all Wave A plans:
- Extract service_group from frontmatter
- Group plans: {service_group: [plan1, plan2, ...]}
- Ungrouped plans: service_group = "default"
```

### Step 2: Parallel Build Per Service Group

For each service group:
```
For each plan in service_group:
  1. Load agent personality
  2. Inject authority constraints
  3. Spawn agent (parallel with other plans in group)

Wait for all plans in service group to complete
Collect: SUMMARY.md files, files_modified outputs
```

Service groups run in parallel — Group 1 doesn't wait for Group 2.

### Step 3: Collect Build Outputs

After all service groups complete:
```
Wave A Build Outputs:
├── Service: frontend
│   ├── Plans: [38-01, 38-02]
│   ├── Status: complete | partial | failed
│   ├── Files: [src/frontend/...]
│   └── Summaries: [38-01-SUMMARY.md, ...]
├── Service: backend
│   ├── Plans: [38-03, 38-04]
│   ├── Status: complete
│   ├── Files: [src/backend/...]
│   └── Summaries: [38-03-SUMMARY.md, ...]
└── Overall: {status, completed_plans, failed_plans}
```

### Step 4: Spawn Analysis Agents (if any)

If Wave A has analysis plans:
```
For each analysis plan:
  1. Load analysis agent personality
  2. Inject authority constraints + read-only access to build outputs
  3. Spawn agent in parallel with other analysis agents

Wait for all analysis agents
Collect: Analysis findings, recommendations
```

### Step 5: Architecture Gate

If analysis plans existed:
```
Present to user:
"Wave A Complete — Architecture Review

Build Status:
- Frontend: ✓ Complete (2 plans)
- Backend: ✓ Complete (2 plans)

Analysis Findings:
- Security audit: 3 recommendations
- Architecture review: 1 concern

Options:
1. Proceed to Wave B (recommended if findings are minor)
2. Revise Wave A outputs (address findings first)
3. Skip gate and proceed (not recommended)
"

User selects option.
If option 2: Pause, let user fix, offer to re-run Wave A
If option 1 or 3: Continue to Wave B
```

### Step 6: Generate Wave A Manifest

Write `.planning/phases/{NN}/WAVE-A-MANIFEST.yaml`:

```yaml
wave: A
phase: 38-intent-driven
status: complete
timestamp: "2026-03-05T10:30:00Z"

service_groups:
  frontend:
    status: complete
    plans: [38-01, 38-02]
    files_created:
      - src/frontend/components/IntentFlags.tsx
      - src/frontend/hooks/useIntent.ts
    files_modified: []

  backend:
    status: complete
    plans: [38-03, 38-04]
    files_created:
      - src/backend/api/intent.ts
    files_modified:
      - src/backend/routes/index.ts

analysis_findings:
  count: 4
  by_agent:
    security-engineer: {count: 3, severity: warning}
    backend-architect: {count: 1, severity: suggestion}

outputs:
  total_files: 4
  total_plans: 4
  passed: 4
  failed: 0

gate: architecture
  status: passed
  user_decision: proceed
```

## Error Handling

**Build Failure in Service Group:**
- Mark service group status: failed
- Continue other service groups
- After all groups: if any failed, stop before analysis phase
- Report: "Wave A: {service} build failed. Fix before proceeding."

**Analysis Agent Failure:**
- Log failure but don't block Wave B
- Analysis is advisory, not blocking
- Note in manifest: "analysis_partial: true"

**Partial Wave A Failure:**
- Some service groups succeed, others fail
- Option: Proceed with partial (user decides)
- Or: Fix failed groups, re-run Wave A

## Authority Enforcement in Wave A

When spawning parallel agents:
1. Load authority matrix
2. For each agent, identify other agents in same service group
3. Inject authority constraints:
   - "You have exclusive authority over: [domains]"
   - "Other agents in this group with authority: [agent: domains]"
4. If domain conflict detected (two agents claim same domain):
   - Log warning: "Domain conflict: {domain} claimed by {agent1} and {agent2}"
   - Both agents active — findings will be merged
