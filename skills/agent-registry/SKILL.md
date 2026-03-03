---
name: legion:agent-registry
description: Maps all 51 Legion agents by division, capability, and task type for intelligent team assembly
triggers: [agent, recommend, team, catalog, assign, match]
token_cost: low
summary: "Maps all 51 agents by division, capability, and task type. Recommendation algorithm scores agents against task descriptions. Use when assembling teams or selecting agents for plans."
---

# Legion Agent Registry

Complete catalog of all agent personalities. Includes 51 built-in agents across 9 divisions plus any custom agents created via `/legion:agent`. Use this registry to assemble the right team for any project task.

> Agent catalog and task-type index are in `CATALOG.md` in this directory.

---

## Section 3: Recommendation Algorithm

When assembling a team for a task, follow this decision process:

### Step 1: Parse Task Description
Extract key terms from the task description. Match terms against the `task_types` tags in the Agent Catalog above.

**Custom agents:** Custom agents added to the Section 1 catalog via `/legion:agent` are automatically eligible for recommendation. Their task type tags are matched identically to built-in agents. No changes to the scoring algorithm are needed.

### Step 2: Match Agents to Task Types
For each extracted term, find all agents whose task types contain a match. Weight matches:
- **Exact match** on a task type tag: 3 points
- **Partial match** (substring in specialty description): 1 point
- **Division alignment** (task category maps to a division): 2 points

### Step 3: Rank Candidates
1. **Primary division match** ranks highest -- agents whose division directly maps to the task domain
2. **Cross-division support** ranks second -- agents from other divisions whose task types overlap
3. Break ties by specificity: prefer agents with narrower specializations over generalists

### Step 4: Cap Team Size
- **2 agents** for single-domain tasks (e.g., "fix a CSS bug")
- **3 agents** for standard feature work (e.g., "build a settings page")
- **4 agents** for cross-domain work (e.g., "build and launch a new feature")
- Never exceed 4 agents per discrete task; split larger efforts into sub-tasks

### Step 4.5: Apply Memory Boost (Optional)

If `.planning/memory/OUTCOMES.md` exists:

1. Call memory-manager Section 4 "Recall Agent Scores" with the task types extracted in Step 1
2. Receive an `agent_id → memory_score` mapping (scores in range [0, 5])
3. For each agent in the current candidate list:
   - If the agent has a memory_score: add it to their recommendation score
   - Memory scores are additive — they boost existing scores, not replace them
4. Re-rank candidates with the updated scores
5. Display memory influence in the recommendation output:
   - For each agent with a memory boost: "(+{score} from {task_count} past outcomes)"
   - Example: "engineering-senior-developer — 8 points (+2.3 from 5 past outcomes)"

**Constraints**:
- Memory boost CANNOT override Step 5 (Mandatory Roles). A testing agent is still required for code execution teams regardless of memory scores.
- Memory boost CANNOT promote an agent from a completely unrelated division. An agent must have at least 1 point from Step 2 matching to receive a memory boost.
- If memory is unavailable (no OUTCOMES.md): skip this step entirely, proceed to Step 5. No warning, no placeholder.
- Minimum data threshold: agents with fewer than 2 recorded outcomes are excluded from memory boosting (prevents one-off noise from influencing recommendations).

If `.planning/memory/OUTCOMES.md` does not exist: skip this step entirely.

### Step 5: Mandatory Roles
- **Every execution team** (teams that write or deploy code) MUST include at least one agent from the Testing division
- **Cross-division tasks** (spanning 2+ divisions) MUST include a coordinator: either `project-manager-senior`, `project-management-project-shepherd`, or `agents-orchestrator`
- **User-facing changes** SHOULD include a Design division agent for review

### Step 6: Conflict Resolution
- If two agents from the same division are equally ranked, prefer the one with broader scope (e.g., `engineering-senior-developer` over `engineering-rapid-prototyper` for production code)
- If the task is exploratory or experimental, prefer `engineering-rapid-prototyper` and `project-management-experiment-tracker`

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
| Developer | engineering-senior-developer | engineering |
| QA Verification | testing-evidence-collector | testing |

### XR / Spatial Computing Build
> Immersive experience development for visionOS, WebXR, or spatial platforms.

| Role | Agent | Division |
|------|-------|----------|
| Platform Engineer | visionos-spatial-engineer / macos-spatial-metal-engineer | spatial-computing |
| Interaction Design | xr-interface-architect | spatial-computing |
| Immersive Dev | xr-immersive-developer | spatial-computing |
| QA | testing-performance-benchmarker | testing |
