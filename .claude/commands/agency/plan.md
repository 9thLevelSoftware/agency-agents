---
name: agency:plan
description: Plan a specific phase with agent recommendations and wave-structured tasks
argument-hint: <phase-number>
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, AskUserQuestion]
---

<objective>
Decompose a roadmap phase into wave-structured plans with max 3 tasks each. Recommend agents from the registry for each plan and get user confirmation. Generate plan files to `.planning/phases/{NN}-{slug}/`.
</objective>

<execution_context>
@./.claude/skills/agency/workflow-common.md
@./.claude/skills/agency/agent-registry.md
@./.claude/skills/agency/phase-decomposer.md
@./.claude/skills/agency/memory-manager.md
@./.claude/skills/agency/github-sync.md
@./.claude/skills/agency/codebase-mapper.md
@./.claude/skills/agency/marketing-workflows.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
</context>

<process>
1. PARSE PHASE NUMBER
   - Read $ARGUMENTS for a phase number (e.g., "3" from `/agency:plan 3`)
   - If no phase number given: auto-detect the next unplanned phase
     - Read ROADMAP.md progress table
     - Find the first phase where Status = "Pending" and Completed = 0
     - Use that phase number
   - Validate: phase number must exist in ROADMAP.md
   - If invalid: error with "Phase {N} doesn't exist. ROADMAP.md has {count} phases."

2. CHECK FOR EXISTING PLANS
   - Construct the phase directory path using workflow-common conventions:
     `.planning/phases/{NN}-{phase-slug}/`
   - Check if any {NN}-{PP}-PLAN.md files already exist in that directory
   - If plans exist: use AskUserQuestion
     - "Phase {N} already has {count} plan(s). What would you like to do?"
     - Option 1: "Re-plan from scratch" -- delete existing plans, proceed
     - Option 2: "Keep existing plans" -- abort, suggest /agency:build instead
   - If no plans exist: proceed directly

3. READ PHASE DETAILS
   Follow phase-decomposer skill Section 2 (Phase Analysis):
   - Read ROADMAP.md and extract phase goal, requirements list, success criteria
   - Read REQUIREMENTS.md and cross-reference full requirement descriptions
   - Read PROJECT.md for broader context
   - Read STATE.md for current progress and completed phase outputs
   - If this phase builds on prior phases, read prior phase summaries

   BROWNFIELD CONTEXT (optional — follows codebase-mapper Section 6.2):
   - Check if .planning/CODEBASE.md exists
   - If yes:
     a. Read .planning/CODEBASE.md
     b. Check the "Analyzed" date in the header
        - If >30 days old: warn user "CODEBASE.md was analyzed {N} days ago. Consider running /agency:start to refresh the codebase map."
        - Do NOT auto-re-analyze — let user decide. Continue with existing data.
     c. Extract these sections for use in step 4 (decomposition) and step 5 (agent recommendation):
        - Risk Areas table — flag risks that overlap with files this phase will modify
        - Agent Guidance — Preferred/Avoid/Touch-with-care patterns for task instructions
        - Conventions Detected — naming, structure, and config patterns agents should follow
        - Detected Stack — framework and test suite context for agent instructions
     d. When generating plan tasks in step 4, include codebase context:
        - Note risk areas that tasks touch in the task action instructions
        - Add "Follow codebase conventions" note referencing detected patterns
        - Include "Touch with care" warnings for flagged files
   - If no:
     Skip silently (greenfield project or user declined analysis)

   MARKETING PHASE DETECTION (optional — follows marketing-workflows Section 1):
   - Run marketing domain detection on the current phase:
     a. Check if phase requirements include MKT-* IDs
     b. Check if phase description contains marketing keywords
        ("campaign", "content calendar", "social media", "cross-channel", "marketing",
         "brand awareness", "audience", "engagement strategy")
   - If marketing phase detected:
     a. Read marketing-workflows skill for domain-specific patterns
     b. In step 4 (decomposition), use marketing-specific wave pattern:
        Wave 1: Strategy & Planning (Social Media Strategist + Growth Hacker)
        Wave 2: Content Creation (Content Creator + Channel Specialists)
        Wave 3 (optional): Distribution (all channel agents)
     c. In step 5 (agent recommendation), use marketing team assembly pattern:
        Required: Strategy Lead + Content Lead
        Per-channel: one specialist per selected channel
     d. Before generating plan files, run campaign brief questioning
        (marketing-workflows Section 2.1) and generate campaign document
        at .planning/campaigns/{campaign-slug}.md
     e. All plan files reference the campaign document in their context section
   - If not marketing phase:
     Skip silently (standard decomposition applies)

4. DECOMPOSE INTO PLANS
   Follow phase-decomposer skill Section 3 (Task Decomposition):
   - List all deliverables from phase requirements
   - Identify dependency layers
   - Map layers to waves
   - Group deliverables into plans (max 3 tasks per plan)
   - Validate: every requirement covered, no circular dependencies

5. RECOMMEND AGENTS
   Follow phase-decomposer skill Section 4 (Agent Recommendation):
   - For each plan, analyze task types and match against agent-registry
   - Score and rank candidates
   - Select 1-2 agents per plan (or mark as autonomous)
   - Apply mandatory roles (testing for code, coordinator for cross-division)

6. PRESENT TO USER FOR CONFIRMATION
   Follow phase-decomposer skill Section 5 (User Confirmation Gate):
   - Display the complete plan breakdown with wave structure
   - Show agent recommendations with rationale per plan
   - Show agent summary table
   - Use AskUserQuestion: "Does this plan breakdown look right?"
     - "Looks good, generate the plans" -- proceed
     - "Swap an agent" -- ask which plan, present alternatives, update
     - "Adjust the plan structure" -- discuss changes, revise decomposition
   - Loop until user confirms

7. GENERATE CONTEXT FILE
   Follow phase-decomposer skill Section 7 (Context File Generation):
   - Create `.planning/phases/{NN}-{phase-slug}/` directory
   - Write `{NN}-CONTEXT.md` with phase goal, requirements, existing assets, decisions, plan structure

8. GENERATE PLAN FILES
   Follow phase-decomposer skill Section 6 (Plan File Template):
   - For each plan, generate a `{NN}-{PP}-PLAN.md` file
   - Include complete YAML frontmatter (phase, plan, wave, depends_on, must_haves, etc.)
   - Include all XML sections (objective, context, tasks, verification, success_criteria, output)
   - Each task has detailed action instructions, verify commands, and done sentence
   - Context references include prior plan summaries for wave 2+ plans

9. GITHUB ISSUE CREATION (optional)
   Follow github-sync Section 8 (Graceful Degradation) caller pattern:
   - Check GitHub availability: gh auth status && git remote get-url origin
   - If github_available is false: skip to step 10

   If github_available is true:
   a. Ensure "agency" label exists (github-sync Section 2.1)
   b. If ROADMAP.md has milestones and the current phase falls within a milestone range:
      - Check if the GitHub milestone exists (github-sync Section 4.1)
      - If not: create it
   c. Create a GitHub issue for the phase (github-sync Section 2.2):
      - Title: "Phase {N}: {phase_name}"
      - Body: phase goal, plans checklist, requirements, success criteria
      - Label: "agency"
      - Milestone: GitHub milestone title (if available)
   d. Store the issue number in STATE.md ## GitHub section (github-sync Section 6)
   e. Confirm to user: "Created GitHub issue #{number} for Phase {N}: {phase_name}"

10. UPDATE STATE
   - Read current .planning/STATE.md
   - Update:
     - Phase: {N} of {total} (planned)
     - Status: Phase {N} planned -- {plan_count} plans across {wave_count} waves
     - Last Activity: Phase {N} planning ({date})
     - Next Action: Run `/agency:build` to execute Phase {N}: {phase_name}
   - Write updated STATE.md

11. DISPLAY SUMMARY
    - Show the user a concise summary:
      - Phase: {N} -- {phase_name}
      - Plans: {count} plans across {wave_count} waves
      - For each plan: name, wave, assigned agent(s)
      - Files to be created: list the plan file paths
    - End with: "Run `/agency:build` to execute Phase {N}: {phase_name}"
    - Do NOT dump full plan file contents -- summary only
</process>
