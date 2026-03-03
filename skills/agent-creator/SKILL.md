---
name: legion:agent-creator
description: Guided agent personality creation with schema validation and registry integration
triggers: [agent, create, custom, personality, new-agent]
token_cost: medium
summary: "Guided workflow for creating new agent personalities. Validates uniqueness, generates frontmatter and personality sections, registers in catalog. Use when adding a custom agent to the legion."
---

# Agent Creator

Guided conversation engine for creating new agent personalities. Captures agent identity, validates the schema, generates the agent .md file, and inserts the registry row so the new agent appears in future planning recommendations.

References:
- Personality paths and divisions from `workflow-common.md` (Agent Personality Paths, Division Constants)
- Catalog format and recommendation algorithm from `agent-registry.md` (Section 1 row format, Section 3 scoring)
- Adaptive conversation pattern from `questioning-flow.md` (3-stage structure, AskUserQuestion usage)

---

## Section 1: Agent Schema

Complete schema for agent personality files. Every agent .md file must conform to this structure.

### Required Frontmatter Fields

| Field | Format | Validation Rule |
|-------|--------|-----------------|
| `name` | Kebab-case string | Non-empty. Must match regex `^[a-z][a-z0-9-]+$`. No spaces, uppercase, or underscores. Must match the filename (without `.md`). Must be globally unique across all agent files in `agents/`. |
| `description` | Free text (single line) | Non-empty. At least 10 characters. No newlines within the value. |
| `color` | Color keyword | Must be one of: `red`, `green`, `blue`, `purple`, `cyan`, `orange`, `yellow`, `pink`. |

### Optional Frontmatter Fields

| Field | Format | When to Include |
|-------|--------|-----------------|
| `tools` | Comma-separated list | When the agent needs specific tools beyond defaults (e.g., `WebFetch, WebSearch, Read, Write`) |

### Canonical Agent Format

All agents MUST use **Format A** — emoji headings with "Your" pronouns. The required sections are:

| Section | Heading | Purpose |
|---------|---------|---------|
| Title | `# {AgentName} Agent Personality` | Agent identity |
| Identity | `## 🧠 Your Identity & Memory` | Who you are — personality, experience, domain |
| Mission | `## 🎯 Your Core Mission` | What you do — 3-5 key capabilities |
| Rules | `## 🚨 Critical Rules You Must Follow` | Hard rules the agent always follows |
| Deliverables | `## 🛠️ Your Technical Deliverables` | Concrete output artifacts |
| Workflow | `## 🔄 Your Workflow Process` | Step-by-step task approach |
| Communication | `## 💭 Your Communication Style` | Voice, tone, how the agent communicates |
| Learning | `## 🔄 Learning & Memory` | What patterns to track across sessions |
| Metrics | `## 🎯 Your Success Metrics` | Observable success criteria |

**Conventions:**
- Use second-person "You" pronouns throughout (e.g., "You are a..." not "This agent is...")
- Every `##` canonical heading must include the emoji prefix
- Additional domain-specific `##` sections are allowed after the canonical ones
- Target size: 100-300 lines. Minimum 80 lines, maximum 350 lines
- Code examples should be concise representative snippets, not full implementations

### Body Requirements

- Minimum 80 lines of body content after the frontmatter closing `---`
- Must contain at least the 🧠 and 🎯 emoji headings (Identity and Mission)
- Must include the agent name somewhere in the body text
- Body must be substantive prose — not placeholder templates or bullet-only lists

### Division Placement

The agent must be placed in an existing division directory OR `custom`:

```
Valid divisions: Engineering, Design, Marketing, Product,
  Project Management, Testing, Support, Spatial Computing,
  Specialized, Custom
```

The `agents/` directory holds all agent files (no division subdirectories). It is created on first use if it doesn't exist.

---

## Section 2: Guided Creation Flow

A 3-stage adaptive conversation that captures everything needed to write a valid agent file. Follows the questioning-flow.md pattern: infer where possible, confirm where uncertain.

### Stage 1: Agent Identity (1-2 exchanges)

**Open with:**
> "What kind of specialist do you want to add to your team? Give me the one-liner — what does this agent do?"

From the user's response, extract:
- **Specialty domain** — the agent's primary area of expertise
- **Primary capability** — the single most important thing this agent does
- **Differentiator** — what makes it different from existing agents in the registry

Infer from the extracted information:
- **Division** — map the specialty domain to one of the 10 divisions (engineering, design, marketing, product, project-management, testing, support, spatial-computing, specialized, custom). Use `custom` only when none of the existing divisions fit.
- **Suggested name** — generate a kebab-case name following the pattern `{division}-{specialty}` (e.g., `engineering-security-auditor`, `design-motion-designer`). Keep names descriptive but concise.

**Confirm via AskUserQuestion:**
> "I'll create a {division} agent — '{suggested-name}'. Specialty: {description}. Correct, or would you like to adjust?"

Options:
- "Looks good" — proceed to Stage 2
- "Adjust" — let the user modify division, name, or description

If the user adjusts: update the inferred values and re-confirm before proceeding.

### Stage 2: Capabilities and Personality (2-3 exchanges)

Ask these questions adaptively — skip any that the user already answered in Stage 1:

1. **Capabilities:** "What are the top 3-5 things this agent can do that others can't?"
   - Capture as a capability list
   - Each capability should be specific enough to generate task type tags later

2. **Personality:** "How does this agent think and communicate? What's its personality?"
   - Capture personality traits, communication style, mindset
   - This shapes the Identity and Process sections of the generated file

3. **Hard rules:** "Are there any hard rules this agent always follows?"
   - Capture as critical rules
   - These become the Critical Rules section verbatim

**Confirm summary via AskUserQuestion before proceeding:**
> "Here's the agent I'll create:
> - **Division**: {division}
> - **Name**: {name}
> - **Capabilities**: {capability_list}
> - **Personality**: {personality_traits}
> - **Hard rules**: {rules}
> Anything to adjust?"

Options:
- "Proceed to tags" — move to Stage 3
- "Adjust" — let the user modify any captured values

### Stage 3: Registry Integration (1 exchange)

Generate 3-5 task type tags from the captured capabilities. Tags must be:
- Lowercase, hyphenated (kebab-case)
- Aligned with existing registry tags where the capability overlaps
- Specific enough to differentiate from generic tags

**Present via AskUserQuestion:**
> "For recommendations to work, I need task type tags. Based on capabilities, I suggest: {tag1}, {tag2}, {tag3}. These align with existing registry tags like: {example_existing_tags}. Add or remove any?"

Options:
- "Use these tags" — proceed to validation
- "Adjust tags" — let the user modify the tag list

After tag confirmation, generate the full agent file content and registry row. Present both to the user for final review before writing any files:

> "Here's what I'll create:
>
> **Agent file**: `agents/{agent-name}.md`
> **Registry row**: `| {agent-id} | agents/{agent-id}.md | {specialty} | {tags} |`
>
> Ready to write?"

---

## Section 3: Schema Validation

Run this validation checklist BEFORE writing any files. All checks must pass.

```
Validation Checklist:

1. Name uniqueness
   - Search: grep -rl "^name: {proposed_name}$" agents/
   - PASS: no output (name not found in any existing agent file)
   - FAIL: output lists files with the same name — name is taken

2. Name format
   - Check: proposed_name matches regex ^[a-z][a-z0-9-]+$
   - PASS: matches
   - FAIL: contains spaces, uppercase, underscores, or starts with a digit

3. Description
   - Check: non-empty AND single line (no newlines) AND at least 10 characters
   - PASS: all conditions met
   - FAIL: empty, multiline, or too short

4. Color
   - Check: value is one of: red, green, blue, purple, cyan, orange, yellow, pink
   - PASS: matches allowed set
   - FAIL: value not in allowed set

5. Division
   - Check: value is one of: Engineering, Design, Marketing, Product,
     Project Management, Testing, Support, Spatial Computing, Specialized, Custom
   - PASS: valid division name
   - FAIL: unknown division

6. Body content length
   - Check: generated body content is at least 50 lines after the frontmatter
   - PASS: 50+ lines
   - FAIL: too short — flesh out the personality content

7. Heading check
   - Check: body contains at least one # or ## heading
   - PASS: heading found
   - FAIL: no headings — body must have structured sections

8. Name in body
   - Check: the agent name (from frontmatter) appears at least once in the body text
   - PASS: name found in body
   - FAIL: name missing from body content
```

**On validation failure:**
- Present specific errors via AskUserQuestion:
  > "Validation found {N} issue(s):
  > - {error_1}
  > - {error_2}
  > Fix these before I can create the agent."
- Allow the user to provide corrections
- Re-run the full validation checklist after corrections
- Do NOT write any files until all 8 checks pass

---

## Section 4: File Generation

After all validation checks pass, generate and write the agent file.

### Step 1: Construct File Path

```
agents/{agent-name}.md
```

Example: `agents/engineering-security-auditor.md`

### Step 2: Create Division Directory (if needed)

If `agents/` doesn't exist, create it:
```bash
mkdir -p agents
```

### Step 3: Write Agent File

Generate the agent .md file with:

**YAML frontmatter:**
```yaml
---
name: {agent-name}
description: {description}
color: {color}
---
```

If tools are specified:
```yaml
---
name: {agent-name}
description: {description}
tools: {tool1}, {tool2}
color: {color}
---
```

**Body content** — generate substantive prose from the conversation data. Target 80-120 lines. Structure:

```markdown
# {AgentName} Agent Personality

## Your Identity

{2-3 paragraphs establishing who this agent is, their background,
expertise, and what drives them. Written in second person ("You are...").
Draw from Stage 2 personality traits and domain knowledge.}

## Core Mission

{Prose description of the agent's primary mission, followed by
the capability list from Stage 2 written as detailed descriptions,
not bare bullets. Each capability should be 2-3 sentences explaining
what the agent does and how.}

## Critical Rules

{The hard rules from Stage 2, each as a numbered item with
explanation of why the rule exists and what happens if violated.}

## Your Process

{Inferred workflow from the agent's capabilities. How does this agent
approach a task from start to finish? What steps does it take?
This section is generated — not directly from user input — based on
the capabilities and personality captured in Stage 2.}

## Success Criteria

{How the agent measures its own success. Derived from capabilities
and mission. Specific, observable outcomes — not vague aspirations.}
```

The body must be substantive prose — not placeholder templates. Use the user's responses to generate detailed, character-specific content.

### Step 4: Verify File

After writing, verify the file exists:
```bash
test -f agents/{agent-name}.md && echo "OK" || echo "FAIL"
```

If verification fails: report the error and do NOT proceed to registry update.

---

## Section 5: Registry Update

After the agent file is written and verified, update `agent-registry.md` to include the new agent.

### Step 1: Read agent-registry.md

Read the current content of `skills/agent-registry/SKILL.md`.

### Step 2: Find Target Division Table

Locate the division table heading in Section 1:
- For existing divisions: find `### {Division} Division ({N} agents)` heading
- For `custom` division: find `### Custom Division` heading

### Step 3: Insert Registry Row

**For existing divisions:**
- Find the last row in the division's table (the row before the next `###` heading or `---` separator)
- Insert the new row immediately after the last existing row:
  ```
  | {agent-id} | `agents/{agent-id}.md` | {specialty description} | {tag1}, {tag2}, {tag3} |
  ```
- Update the agent count in the heading: `### {Division} Division ({N+1} agents)`

**For custom division:**
- Find the `### Custom Division` table
- If the table has the placeholder text `*No custom agents yet. Run /legion:agent to create one.*`:
  - Remove the placeholder line
- Insert the new row in the table
- The heading count is not shown for Custom Division (it's dynamic)

### Step 4: Update Division Heading Count

For non-custom divisions, update the agent count in the section heading:
```
### Engineering Division (7 agents)  →  ### Engineering Division (8 agents)
```

### Step 5: Verify Registry Update

Read agent-registry.md after the edit and confirm the new row appears in the correct division table.

---

## Section 6: Error Handling

### e1: User Cancels During Any Stage
- Exit gracefully with: "Agent creation cancelled. No files were modified."
- Do NOT write partial files or registry updates
- Do NOT leave behind empty directories

### e2: Name Collision Detected
- Present the conflict:
  > "The name '{proposed-name}' is already taken by `{existing-file-path}`."
- Suggest alternatives:
  > "Try: '{proposed-name}-2', '{alternative-qualifier}-{base-name}', or provide a different name."
- Return to the name confirmation step in Stage 1

### e3: Division Directory Doesn't Exist (custom)
- Create it automatically: `mkdir -p agents`
- This is not an error — it's expected on first custom agent creation
- Log: "Created `agents/` directory."

### e4: Agent File Write Fails
- Report the error to the user
- Do NOT update agent-registry.md (no partial state)
- Suggest: "The agent file could not be written. Check file permissions and try again."

### e5: Registry Update Fails
- Report the error to the user
- Note: "The agent file was created successfully at `{path}`. The registry update failed — you can manually add the row to agent-registry.md."
- The agent file is still valid and can be manually registered later

---

## Section 7: Confirmation and Commit

After both the agent file and registry row are created:

### Display Summary

```
Agent created successfully!

- **Name**: {agent-name}
- **Division**: {division}
- **File**: agents/{agent-name}.md
- **Task types**: {tag1}, {tag2}, {tag3}
- **Registry**: Row added to agent-registry.md Section 1

Your new agent '{agent-name}' is ready. It will appear in
`/legion:plan` recommendations for tasks matching: {tags}.
```

### Commit Handling

Do NOT automatically commit. The calling command (`/legion:agent`) handles git commit in its Step 8. This skill focuses on file creation and registry update only.

---

## References

This skill is consumed by:

| Consumer | Purpose | Integration Point |
|----------|---------|-------------------|
| `/legion:agent` command | Entry point for agent creation | Wires all 7 sections into an 8-step process |
| `agent-registry.md` | New agents added to catalog | Section 5 inserts rows into Section 1 tables |
| `workflow-common.md` | Division paths and custom agent convention | Section 1 schema references division constants |
