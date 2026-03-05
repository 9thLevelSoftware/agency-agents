---
name: legion:agent
description: Create a new agent personality through a guided workflow
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, AskUserQuestion]
---

<objective>
Guide the user through an adaptive conversation to define a new agent personality.
Validate the schema, generate the agent .md file, and register the new agent
in the agent-registry so it appears in future planning recommendations.

Purpose: Single command for creating custom agents with validation and registry integration.
Output: New agent .md file in agents/, updated agent-registry.md.
</objective>

<execution_context>
skills/workflow-common-core/SKILL.md
skills/agent-registry/SKILL.md
skills/agent-registry/CATALOG.md
skills/agent-creator/SKILL.md
</execution_context>

<context>
@agents/engineering-senior-developer.md
@agents/testing-reality-checker.md
@agents/design-ui-designer.md
</context>

<process>
1. PRE-FLIGHT CHECK
   - Check if `.planning/PROJECT.md` exists by attempting to read it
   - If not found:
     Display: "No Legion project found. Run `/legion:start` to initialize."
     Exit — do not proceed to step 2
   - Read `.planning/STATE.md` for current project context

2. LOAD REGISTRY CONTEXT
   - Read agent-registry.md to understand existing agents, divisions, and task type taxonomy
   - Read workflow-common.md for personality paths and division list
   - List existing agents: `ls agents/` to confirm agent files
   - Note the existing task type tags from the registry — these will be used in Stage 3 for tag alignment

3. STAGE 1: AGENT IDENTITY
   Follow agent-creator.md Section 2, Stage 1 exactly:
   - Open with: "What kind of specialist do you want to add to your team? Give me the one-liner — what does this agent do?"
   - From the response, extract specialty domain, primary capability, differentiator
   - Infer division and suggested name (kebab-case, pattern: {division}-{specialty})
   - Confirm via adapter.ask_user:
     "I'll create a {division} agent — '{suggested-name}'. Specialty: {description}. Correct, or would you like to adjust?"
   - If user adjusts: update inferred values and re-confirm

4. STAGE 2: CAPABILITIES AND PERSONALITY
   Follow agent-creator.md Section 2, Stage 2 exactly:
   - Ask: "What are the top 3-5 things this agent can do that others can't?"
   - Ask: "How does this agent think and communicate? What's its personality?"
   - Ask: "Are there any hard rules it always follows?"
   - Skip questions already answered in Stage 1
   - Capture: capability list, personality traits, critical rules
   - Confirm summary via adapter.ask_user before proceeding

5. STAGE 3: REGISTRY TAGS
   Follow agent-creator.md Section 2, Stage 3 exactly:
   - Generate 3-5 task type tags from capabilities
   - Present suggested tags alongside existing registry tags for alignment
   - Confirm via adapter.ask_user
   - Generate and present the full agent file content and registry row for final review

6. VALIDATE SCHEMA
   Follow agent-creator.md Section 3 exactly:
   - Run all 8 validation checks:
     1. Name uniqueness (grep across agents/)
     2. Name format (regex ^[a-z][a-z0-9-]+$)
     3. Description (non-empty, single line, 10+ chars)
     4. Color (allowed set)
     5. Division (valid name)
     6. Body content (50+ lines)
     7. Heading check (at least one # or ##)
     8. Name in body
   - If any check fails: present errors, allow correction, re-validate
   - Do NOT proceed until all checks pass

7. GENERATE FILES
   Follow agent-creator.md Section 4 (file generation), then Section 5 (registry update):
   a. File Generation:
      - Construct path: agents/{agent-name}.md
      - Create agents/ directory if needed
      - Write the agent .md file with YAML frontmatter and substantive body (80-120 lines)
      - Verify file exists after write
   b. Registry Update:
      - Read agent-registry.md
      - Find target division table in Section 1
      - Insert new catalog row in the correct table
      - Update division agent count in heading (for non-custom divisions)
   - If either fails: follow agent-creator.md Section 6 error handling

8. CONFIRM AND COMMIT
   - Display the summary from agent-creator.md Section 7:
     Agent name, file path, division, task types, registry row
   - Suggest: "Your new agent '{agent-name}' is ready. It will appear in `/legion:plan` recommendations for tasks matching: {tags}."
   - Create a git commit:
     ```
     git add agents/{agent-name}.md skills/agent-registry/SKILL.md
     git commit -m "feat(agents): add custom agent {agent-name}

     Division: {division}
     Task types: {tags}
     File: agents/{agent-name}.md

     {adapter.commit_signature}"
     ```
   - Update STATE.md: add a line under Recent Decisions noting the custom agent creation

IMPORTANT:
- The 3-stage conversation is adaptive — skip questions the user already answered
- Validate BEFORE writing any files — no partial state
- Agent file generation produces substantive prose, not placeholder templates
- Registry update uses Edit tool for surgical table row insertion
- Error handling prevents partial state (file without registry, or registry without file)
- The commit only includes the agent file and registry — no other changes
</process>
</output>
