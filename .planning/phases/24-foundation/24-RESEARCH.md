# Phase 24: Foundation - Research

**Researched:** 2026-03-02
**Domain:** Text substitution / markdown file rebrand — single file, zero external dependencies
**Confidence:** HIGH

## Summary

Phase 24 is a precise, bounded text-editing task on one file: `skills/workflow-common/SKILL.md`. There are 47 case-insensitive "agency" occurrences across 374 lines. Every occurrence must become "legion" (case-matched). No external tools, no new libraries, no new files — just direct Read + Edit operations.

The complexity is NOT technical — it is correctness. The risk is partial replacement: missing an occurrence, corrupting markdown table alignment, or mishandling the special case where "agency" appears as a filesystem path segment (`~/.claude/agency/`) vs. as a command prefix (`/agency:`) vs. as a brand word ("Agency"). All three patterns transform differently.

**Primary recommendation:** Read the full file, then apply a complete substitution map in a single Write operation. Do not use incremental edits — they risk partial state and broken verification.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

1. **Portfolio Filesystem Path:** Clean break — `~/.claude/agency/portfolio.md` becomes `~/.claude/legion/portfolio.md`. No migration comment or backward-compatibility logic in this file.

2. **GitHub Label Constant:** Rename from `"agency"` to `"legion"`. All references to the GitHub label in workflow-common change to `"legion"`. Display text reads "Legion label" (capitalized L).

3. **Skill Identity Text:** Full rebrand with specific text choices:
   | Element | Old Value | New Value |
   |---------|-----------|-----------|
   | Frontmatter name | `agency:workflow-common` | `legion:workflow-common` |
   | Frontmatter description | Shared workflow patterns and conventions for The Agency plugin | Shared constants, paths, and patterns for all /legion: commands |
   | Main heading | `# Agency Workflow Common` | `# Legion Workflow Common` |
   | Intro line | Shared constants, paths, and patterns used across all /agency: commands. | Shared constants, paths, and patterns used across all /legion: commands. |

4. **General Rename Rule:** Every instance of "Agency" becomes "Legion", every `/agency:` becomes `/legion:` — zero remnants. No exceptions. Success criteria #3 requires a developer reading workflow-common to see Legion as the identity with no Agency remnants.

### Claude's Discretion

None — all decisions are locked.

### Deferred Ideas (OUT OF SCOPE)

None captured during discussion.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SKL-01 | `workflow-common` skill updated with `/legion:` namespace across all shared constants and documentation | Full substitution map documented below; all 47 occurrences catalogued by line number and transformation type |
</phase_requirements>

---

## Standard Stack

### Core

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Claude Code Read tool | built-in | Read current file content | Required before Write |
| Claude Code Write tool | built-in | Overwrite file with updated content | Single atomic operation; no partial state |
| Claude Code Edit tool | built-in | Alternative: targeted edits | Use only if Write is impractical |

### Supporting

None — this phase needs no libraries, no package installs, no scripts. The task is pure text transformation of a markdown file.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single Write (full rewrite) | Multiple Edit calls | Multiple edits risk partial state if a call fails mid-way; full Write is atomic |
| Manual substitution map | Regex sed command | Bash sed is an option but claude tool gives inline verification; risk of shell escaping errors on Windows |

---

## Architecture Patterns

### Recommended Approach: Read → Transform → Write

This is the correct pattern for a single-file, multi-site substitution:

1. **Read** the entire `skills/workflow-common/SKILL.md` into context
2. **Apply all substitutions** to the in-memory content (using the substitution map below)
3. **Write** the full transformed content back to disk in one operation
4. **Verify** with a grep for any remaining "agency" (case-insensitive)

This is atomic. If any substitution is missed, verification catches it before commit.

### Substitution Map (Complete, by Line)

All 47 occurrences of "agency" (case-insensitive) mapped to their transformation:

**Pattern A: `/agency:` → `/legion:`** (command references — 40 occurrences)

```
Line 8:   /agency: commands        → /legion: commands
Line 23:  /agency:agent            → /legion:agent
Line 40:  /agency:agent            → /legion:agent
Line 103: /agency:start, /agency:plan → /legion:start, /legion:plan
Line 104: /agency:build            → /legion:build
Line 105: /agency:status           → /legion:status
Line 116: /agency:review           → /legion:review
Line 143: /agency:start            → /legion:start
Line 151: /agency:portfolio        → /legion:portfolio
Line 156: /agency:milestone, /agency:start → /legion:milestone, /legion:start
Line 177: /agency:milestone        → /legion:milestone
Line 202: /agency:build            → /legion:build
Line 203: /agency:review           → /legion:review
Line 204: /agency:plan             → /legion:plan
Line 205: /agency:status           → /legion:status
Line 241: /agency:plan             → /legion:plan
Line 242: /agency:build            → /legion:build
Line 243: /agency:plan             → /legion:plan
Line 248: /agency:plan             → /legion:plan
Line 249: /agency:build            → /legion:build
Line 250: /agency:status           → /legion:status
Line 251: /agency:review           → /legion:review
Line 252: /agency:milestone        → /legion:milestone
Line 271: /agency:start            → /legion:start
Line 272: /agency:plan             → /legion:plan
Line 277: /agency:start            → /legion:start
Line 282: /agency:start            → /legion:start
Line 283: /agency:plan             → /legion:plan
Line 302: /agency:plan             → /legion:plan
Line 303: /agency:build            → /legion:build
Line 310: /agency:plan             → /legion:plan
Line 322: /agency:plan             → /legion:plan
Line 323: /agency:build            → /legion:build
Line 324: /agency:review           → /legion:review
Line 345: /agency:review           → /legion:review
Line 351: /agency:plan             → /legion:plan
Line 352: /agency:plan             → /legion:plan
Line 364: /agency:plan             → /legion:plan
Line 365: /agency:build            → /legion:build
Line 366: /agency:review           → /legion:review
```

**Pattern B: Frontmatter and heading (locked identity text)** (3 occurrences)

```
Line 2:  name: agency:workflow-common
         → name: legion:workflow-common

Line 3:  description: Shared workflow patterns and conventions for The Agency plugin
         → description: Shared constants, paths, and patterns for all /legion: commands

Line 6:  # Agency Workflow Common
         → # Legion Workflow Common
```

**Pattern C: Filesystem path** (2 occurrences)

```
Line 19: ~/.claude/agency/portfolio.md
         → ~/.claude/legion/portfolio.md

Line 140: ~/.claude/agency/portfolio.md ... all Agency projects
          → ~/.claude/legion/portfolio.md ... all Legion projects
```

**Pattern D: Brand text "Agency" → "Legion"** (remaining occurrences)

```
Line 19:  Global portfolio registry — all Agency projects
          → Global portfolio registry — all Legion projects

Line 140: This file is shared across all Agency projects
          → This file is shared across all Legion projects

Line 143: Registration stores the project ... [all Agency → Legion]
          Projects are auto-registered ... [no "agency" word here, only /agency:start]

Line 217: Optional integration that connects Agency Workflows to GitHub
          → Optional integration that connects Legion Workflows to GitHub

Line 240: | Agency label | GitHub repo labels | On first issue creation |
          → | Legion label | GitHub repo labels | On first issue creation |

Line 241: GitHub issues with "agency" label
          → GitHub issues with "legion" label
```

### Anti-Patterns to Avoid

- **Incremental editing:** Making 10+ separate Edit tool calls risks leaving the file in partial state if the session interrupts. One Write is safer.
- **Case-insensitive blanket replace without review:** The word "agency" appears as: a path segment (`/agency/`), a command prefix (`/agency:`), a proper noun ("Agency Workflows"), and a label string (`"agency"`). Each has its own target replacement. A naive global replace is correct here since ALL occurrences transform (no exceptions), but verify afterward.
- **Forgetting the "agency" label string on line 241:** This is a quoted string `"agency"` that becomes `"legion"` — not a command reference but a GitHub label value. Easy to miss.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Verification | Custom script | grep -i "agency" on the written file | Grep in bash gives instant confirmation |
| Substitution tracking | Separate changelog | The substitution map in this document | Already catalogued — follow it exactly |

**Key insight:** This is not an engineering problem. The intellectual work was done in the CONTEXT.md (cataloguing all 47 occurrences and locking all decisions). The implementation is mechanical execution of that map.

---

## Common Pitfalls

### Pitfall 1: Missing the GitHub label string on line 241

**What goes wrong:** The phrase `"agency" label` (a quoted string value, not a command) does not contain `/agency:` so it can be overlooked during a command-focused pass.

**Why it happens:** The executor scans for `/agency:` patterns and misses the standalone string `"agency"` used as a label value.

**How to avoid:** Run final grep verification: `grep -in "agency" skills/workflow-common/SKILL.md`. Any matches = incomplete.

**Warning signs:** Grep shows 0 hits for `/agency:` but still shows hits for `"agency"`.

### Pitfall 2: Frontmatter description uses locked text, not a generic transform

**What goes wrong:** The new description is NOT just `"agency"` → `"legion"` in the old text. The CONTEXT.md specifies a completely different description string.

**Old:** `Shared workflow patterns and conventions for The Agency plugin`
**New:** `Shared constants, paths, and patterns for all /legion: commands`

**Why it happens:** Executing a simple find-replace produces the wrong result for this field.

**How to avoid:** Treat line 3 as a full-line replacement using the locked text from CONTEXT.md, not a word substitution.

**Warning signs:** Description still contains "workflow patterns and conventions" or "The Agency plugin" (even with "Legion" substituted in).

### Pitfall 3: Partial file write leaving inconsistent state

**What goes wrong:** An Edit-based approach that fails mid-sequence leaves some sections updated and others not.

**Why it happens:** 18 sections across 374 lines with 47 changes — if the session resets or a tool call errors, the file is in hybrid state (some Agency, some Legion).

**How to avoid:** Use a single Write call with the fully transformed content. Read → transform → Write is atomic.

**Warning signs:** Grep shows a mix of `/agency:` and `/legion:` references after editing begins.

### Pitfall 4: Corrupting "agency" in path-like strings inside backtick code blocks

**What goes wrong:** Lines 19 and 140 contain the path `~/.claude/agency/portfolio.md` inside backticks and prose. The path segment `agency` must become `legion`. If the executor only replaces `/agency:` command prefixes (with the colon), the filesystem path is missed.

**Why it happens:** Pattern A (`/agency:`) doesn't match path pattern (`/agency/`).

**How to avoid:** Run the substitution map by pattern group (A, B, C, D), not just one regex. Pattern C specifically covers the filesystem path.

---

## Code Examples

Verified patterns for the task execution:

### Read → Verify current state
```bash
grep -in "agency" skills/workflow-common/SKILL.md | wc -l
# Expected: 47
```

### Post-write verification
```bash
grep -in "agency" skills/workflow-common/SKILL.md
# Expected: zero output (empty)
```

### Exact frontmatter after transformation
```yaml
---
name: legion:workflow-common
description: Shared constants, paths, and patterns for all /legion: commands
---
```

### Exact heading + intro after transformation
```markdown
# Legion Workflow Common

Shared constants, paths, and patterns used across all /legion: commands.
```

### Exact portfolio path rows after transformation (lines 19, 140)
```markdown
| PORTFOLIO.md | `~/.claude/legion/portfolio.md` | Global portfolio registry — all Legion projects |
```
```markdown
The portfolio registry lives at `~/.claude/legion/portfolio.md` — outside any project directory. This file is shared across all Legion projects on the machine.
```

### Exact GitHub section after transformation (lines 217, 240-241)
```markdown
Optional integration that connects Legion Workflows to GitHub — phases link to issues, completed work produces PRs, and milestones sync. All operations use the `gh` CLI and are entirely opt-in.
```
```markdown
| Legion label | GitHub repo labels | On first issue creation |
| Phase issues | GitHub issues with "legion" label | During `/legion:plan` |
```

---

## State of the Art

This is not a technology-selection problem. The relevant "state of the art" is the project's own convention:

| Old Convention | Current Convention | Impact |
|----------------|-------------------|--------|
| `/agency:` namespace | `/legion:` namespace | This phase establishes the shared constants layer; commands and other skills follow in phases 25-26 |
| `~/.claude/agency/portfolio.md` | `~/.claude/legion/portfolio.md` | Clean break; migration logic deferred to Phase 26 portfolio-manager skill |
| GitHub label `"agency"` | GitHub label `"legion"` | Clean break; existing repos with `agency`-labeled issues will not match the new label |

---

## Open Questions

None — all decisions were locked in CONTEXT.md. There is no ambiguity in the substitution map. The work is fully specified.

---

## Sources

### Primary (HIGH confidence)

- Direct file inspection: `skills/workflow-common/SKILL.md` — full file read, all 374 lines
- `.planning/phases/24-foundation/24-CONTEXT.md` — locked decisions, specific text values
- `.planning/REQUIREMENTS.md` — SKL-01 requirement definition
- `.planning/STATE.md` — project context and phase ordering rationale

### Secondary (MEDIUM confidence)

None needed — this task requires no external research. The domain is "text editing a markdown file" and the substitution map is derived directly from reading the target file.

---

## Metadata

**Confidence breakdown:**
- Substitution map: HIGH — derived from direct file read, all 47 occurrences line-numbered
- Locked text values: HIGH — copied verbatim from CONTEXT.md
- Pitfall identification: HIGH — derived from structure of the file and common editing failure modes
- No technology research required: this phase has zero external dependencies

**Research date:** 2026-03-02
**Valid until:** Indefinite — the file does not change until this phase executes
