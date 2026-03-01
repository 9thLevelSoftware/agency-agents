# Phase 4: Parallel Execution — Context

## Phase Goal
Users can type `/agency:build` and watch a team of agents execute plans in parallel, each operating in full character.

## Requirements Covered
- EXEC-01: `/agency:build` command — executes plans for current phase
- EXEC-02: Agent spawning with full personality .md injection as system prompt
- EXEC-03: Wave-based execution — complete wave N before starting wave N+1
- EXEC-04: Parallel agent dispatch within waves using Claude Code Teams
- EXEC-05: Progress tracking — update STATE.md after each plan completes
- EXEC-06: Atomic commits per completed plan

## What Already Exists (from Phases 1-3)

### Scaffold Command
`.claude/commands/agency/build.md` — has frontmatter (name, description, argument-hint, allowed-tools), objective, execution_context, context, and 4 placeholder process steps. References `wave-executor.md` as a commented-out future skill.

### Supporting Skills (ready to use)
- `.claude/skills/agency/workflow-common.md` — state paths, plan file conventions, wave execution pattern, cost profiles, personality injection pattern, error handling pattern, division constants
- `.claude/skills/agency/agent-registry.md` — 51-agent catalog, task type index, recommendation algorithm, team assembly patterns
- `.claude/skills/agency/phase-decomposer.md` — plan file format reference (how plans are structured)

### State Files
- `.planning/PROJECT.md` — project vision, requirements, constraints
- `.planning/ROADMAP.md` — phase breakdown with goals, requirements, success criteria
- `.planning/STATE.md` — current position, progress, next action
- `.planning/REQUIREMENTS.md` — requirement tracking with traceability

### Plan File Format (from phase-decomposer)
Plans have YAML frontmatter with: `phase`, `plan`, `type`, `wave`, `depends_on`, `files_modified`, `autonomous`, `requirements`, `must_haves` (truths, artifacts, key_links). Body has XML sections: `<objective>`, `<context>`, `<tasks>`, `<verification>`, `<success_criteria>`, `<output>`.

### Existing Patterns to Follow
- **Personality Injection** (workflow-common.md): Read agent .md → construct prompt with personality + task → spawn via Agent tool
- **Wave Execution** (workflow-common.md): Group by wave → execute wave in parallel → wait for all → next wave
- **State Updates** (workflow-common.md): Read STATE.md → update fields → write back
- **Cost Profiles** (workflow-common.md): Sonnet for execution agents, Opus for planning
- **Error Handling** (workflow-common.md): Capture errors → update state → report to user → don't auto-retry

### Claude Code Primitives Available
- **Agent tool**: Spawn subagents with `subagent_type`, `prompt`, `model`, `name`, `team_name`, `run_in_background`
- **TeamCreate**: Create a team with shared task list for coordinated agents
- **TaskCreate/TaskUpdate/TaskList**: Track work items within a team
- **SendMessage**: Inter-agent communication within teams
- **Bash**: Git commands for atomic commits

## Key Design Decisions

### Skills as methodology documents, not code
Like phase-decomposer and questioning-flow, the wave-executor and execution-tracker skills tell Claude HOW to execute — they're loaded as instructions. The `/agency:build` command orchestrates the process and invokes the skills' methodology.

### Two skills split by concern
Wave-executor handles the agent spawning and parallel coordination. Execution-tracker handles progress reporting and git commits. This separation keeps each skill focused and testable independently.

### Teams for parallel dispatch
Claude Code Teams (TeamCreate + Agent with team_name) provide built-in parallel agent coordination. The wave-executor skill documents how to create a team per wave (or per phase) and spawn agents as teammates.

### Sonnet for execution agents
Per the cost profile convention, agents spawned during `/agency:build` use Sonnet (not Opus) to balance cost and capability. The orchestrating build command itself runs at whatever model the user's session uses.

### Atomic commits per plan, not per wave
Each completed plan gets its own git commit. This gives cleaner git history and easier rollback if a single plan's output is problematic.

## Plan Structure
- **Plan 04-01 (Wave 1)**: Create wave-executor skill — the parallel execution engine
- **Plan 04-02 (Wave 1)**: Create execution-tracker skill — progress tracking and git commits
- **Plan 04-03 (Wave 2)**: Update build.md command to full implementation — wire both skills
