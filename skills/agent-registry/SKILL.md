---
name: legion:agent-registry
description: Maps all 52 Legion agents by division, capability, and task type for intelligent team assembly
triggers: [agent, recommend, team, catalog, assign, match]
token_cost: low
summary: "Maps all 52 agents by division, capability, and task type. Recommendation algorithm is semantic-first with heuristic tiebreak scoring. Use when assembling teams or selecting agents for plans."
---

# Legion Agent Registry

Complete catalog of all agent personalities. Includes 52 built-in agents across 9 divisions plus any custom agents created via `/legion:agent`. Use this registry to assemble the right team for any project task.

> Agent catalog and task-type index are in `CATALOG.md` in this directory.

---

## Section 3: Recommendation Algorithm

When assembling a team for a task, follow this semantic-first process:

### Step 1: Parse Intent and Constraints
Extract:
- Primary objective (build, review, optimize, diagnose, launch)
- Domain signals (engineering, design, marketing, testing, product, support, spatial)
- Hard constraints (platform, runtime, deadline, no-new-dependencies, etc.)

**Custom agents:** Custom agents added via `/legion:agent` are first-class candidates in every step below.

### Step 2: Build a Semantic Shortlist (Primary Ranking)
Map natural-language intent to normalized concepts before any point scoring.

Baseline concept normalization:
- `scalability`, `latency`, `throughput` -> `performance`
- `harden`, `exploit`, `vulnerability` -> `security`
- `a11y`, `wcag`, `screen reader` -> `accessibility`
- `funnel`, `conversion`, `growth loop` -> `growth`
- `refactor`, `cleanup`, `maintainability` -> `code-quality`
- `onboarding`, `activation`, `retention` -> `product`

Shortlist rules:
1. Prefer agents with direct semantic overlap between normalized concepts and `task_types`.
2. Include cross-division specialists when their specialty text clearly matches intent.
3. Keep shortlist to top 6-8 agents before tie-breaking.

### Step 3: Apply Heuristic Tiebreak (Secondary)
Use points only to break ties inside the semantic shortlist:
- **Exact task-type match**: +3
- **Partial specialty match**: +1
- **Division alignment**: +2

Notes:
- Heuristics refine ranking; they do not replace semantic intent matching.
- If no semantic shortlist forms, fall back to heuristic scoring across all agents and label low confidence.

### Step 4: Confidence Classification
Classify confidence from top-candidate quality:
- **High confidence**: strong semantic alignment + top score >= 8
- **Medium confidence**: partial semantic alignment or top score 5-7
- **Low confidence**: weak semantic evidence or top score <= 4

If confidence is low:
1. Label recommendation explicitly as low confidence.
2. Offer 2-3 alternatives from different divisions.
3. Ask for user guidance before locking assignment.

### Step 5: Team Size and Composition Guardrails
- **2 agents** for single-domain tasks.
- **3 agents** for standard feature work.
- **4 agents** for cross-domain work.
- Never exceed 4 agents for one discrete task; split larger efforts.

### Step 6: Apply Memory Boost (Optional, Additive Only)
If `.planning/memory/OUTCOMES.md` exists:
1. Recall agent scores via memory-manager.
2. Add memory score to shortlisted agents only.
3. Re-rank candidates.
4. Show memory influence in output (for transparency).

Constraints:
- Memory boost is additive and cannot override mandatory-role constraints.
- Memory boost cannot promote unrelated agents with zero semantic/heuristic relevance.
- Agents with fewer than 2 recorded outcomes are excluded from memory boosting.
- If memory is unavailable, skip silently.

### Step 7: Enforce Mandatory Roles
- **Execution teams** (code-writing/deployment) MUST include at least one Testing-division agent.
- **Cross-division teams** MUST include a coordinator: `project-manager-senior`, `project-management-project-shepherd`, or `agents-orchestrator`.
- **User-facing change teams** SHOULD include a Design-division reviewer.

### Step 8: Conflict Resolution
- If two agents remain tied in one division, prefer broader production reliability for delivery tasks.
- For exploratory work, prefer rapid-learning profiles (`engineering-rapid-prototyper`, `project-management-experiment-tracker`).
---

## Section 4: Team Assembly Patterns

Pre-configured team compositions for common project scenarios.

### Feature Build (Web)
> Standard web feature from design through deployment.

| Role | Agent | Division |
|------|-------|----------|
| Lead Developer | engineering-frontend-developer | engineering |
| Backend | engineering-backend-architect | engineering |
| UI/UX | design-ui-designer | design |
| QA | testing-evidence-collector | testing |

### API Development
> Backend service, API endpoint, or integration work.

| Role | Agent | Division |
|------|-------|----------|
| Architect | engineering-backend-architect | engineering |
| Integration Testing | testing-api-tester | testing |
| Performance | testing-performance-benchmarker | testing |

### Design Sprint
> User research through high-fidelity design delivery.

| Role | Agent | Division |
|------|-------|----------|
| Research | design-ux-researcher | design |
| Architecture | design-ux-architect | design |
| Visual Design | design-ui-designer | design |
| Brand Review | design-brand-guardian | design |
| Feedback | product-feedback-synthesizer | product |

### Marketing Campaign
> Multi-platform content campaign from strategy to execution.

| Role | Agent | Division |
|------|-------|----------|
| Strategy | marketing-social-media-strategist | marketing |
| Content | marketing-content-creator | marketing |
| Visual | design-visual-storyteller | design |
| Analytics | support-analytics-reporter | support |
| Platform Lead (pick 1-2) | marketing-twitter-engager / marketing-instagram-curator / marketing-tiktok-strategist / marketing-reddit-community-builder | marketing |

### Full Launch
> End-to-end product launch spanning all divisions. Split into sub-tasks and coordinate.

| Role | Agent | Division |
|------|-------|----------|
| Orchestrator | agents-orchestrator | specialized |
| Producer | project-management-studio-producer | project-management |
| Frontend | engineering-frontend-developer | engineering |
| Backend | engineering-backend-architect | engineering |
| UI/UX | design-ui-designer | design |
| QA Lead | testing-reality-checker | testing |
| Marketing | marketing-growth-hacker | marketing |
| Analytics | data-analytics-reporter | specialized |

### Quick Fix / Bug Patch
> Targeted bug fix or hotfix with minimal team.

| Role | Agent | Division |
|------|-------|----------|
| Developer | engineering-senior-developer / engineering-laravel-specialist (Laravel stacks) | engineering |
| QA Verification | testing-evidence-collector | testing |

### XR / Spatial Computing Build
> Immersive experience development for visionOS, WebXR, or spatial platforms.

| Role | Agent | Division |
|------|-------|----------|
| Platform Engineer | visionos-spatial-engineer / macos-spatial-metal-engineer | spatial-computing |
| Interaction Design | xr-interface-architect | spatial-computing |
| Immersive Dev | xr-immersive-developer | spatial-computing |
| QA | testing-performance-benchmarker | testing |




