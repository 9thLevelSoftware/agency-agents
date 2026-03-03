---
name: legion:codebase-mapper
description: Brownfield codebase analysis — architecture mapping, framework detection, risk assessment, dependency graphs, test coverage, API surface, config/environment, pattern library, monorepo support, and CODEBASE.md generation
triggers: [codebase, analyze, brownfield, architecture, map, existing]
token_cost: high
summary: "Comprehensive codebase analysis producing structured CODEBASE.md. Maps architecture, frameworks, patterns, risks, dependency graphs, test coverage, API surface, config/environment, and pattern library. Supports monorepo detection and standalone re-analysis. Consumed by /start, /plan, /build, /review, and /status."
---

# Codebase Mapper

Brownfield codebase analysis engine for Legion. Analyzes existing codebases to produce a structured map of architecture, patterns, frameworks, risk areas, dependency graphs, test coverage, API surface, config/environment, and code patterns. The output artifact is `.planning/CODEBASE.md`, consumed by 5 commands: `/legion:start` (brownfield detection), `/legion:plan` (context injection + risk cross-reference via plan-critique), `/legion:build` (agent prompt enrichment), `/legion:review` (convention checking), and `/legion:status` (staleness detection). Standalone re-analysis is available via `/legion:quick analyze codebase`.

All operations use Read, Bash, Glob, and Grep -- no external dependencies, no custom scripts, no MCP servers. The analysis is Claude reading and reasoning over files using a structured protocol.

References:
- State File Locations from `workflow-common.md` (state paths, degradation pattern)
- Brownfield Conventions from `workflow-common.md` (lifecycle, paths, integration points)
- `/legion:start` in `start.md` (brownfield detection trigger, user opt-in)
- `/legion:plan` in `plan.md` (CODEBASE.md context injection during phase decomposition)
- `/legion:build` in `build.md` (agent context injection via wave-executor Step 3.5)
- `/legion:review` in `review.md` (convention checking via review-loop Step 2.5)
- `/legion:plan` (critique) in `skills/plan-critique/SKILL.md` (risk cross-reference)
- `/legion:status` in `status.md` (staleness detection)
- `/legion:quick` in `quick.md` (standalone re-analysis routing)

---

## Section 1: Principles & Detection

Core rules governing brownfield analysis and the detection heuristic that determines when to run.

### Principles

1. **Opt-in only** -- brownfield analysis is never automatic. The user is always asked via AskUserQuestion before any analysis begins. No background scanning, no silent analysis.
2. **Human-readable markdown** -- the output artifact (`.planning/CODEBASE.md`) follows the same structured markdown convention as STATE.md, ROADMAP.md, and all other Legion state files. No JSON, no binary, no databases.
3. **Graceful degradation** -- every consumer checks for CODEBASE.md existence before using it. If absent, the workflow proceeds identically to greenfield mode. Brownfield analysis is an enhancement, never a requirement.
4. **Heuristic-based** -- all detection uses file presence and content grep, not AST parsing or LSP analysis. Simple, auditable, and sufficient for planning-time orientation.
5. **Depth-limited** -- analysis constrains itself to avoid consuming the context window on large codebases. Work with counts and samples, never full enumeration.
6. **Calibrated scoring** -- risk levels use per-file rates relative to project size, not absolute counts. A 5-file project with 10 TODOs is HIGH; a 500-file project with 10 TODOs is LOW.

### When to Run

- Triggered by `/legion:start` when existing source code is detected in the project directory
- Can be re-triggered manually if the codebase has changed significantly
- NEVER runs automatically -- always prompted via AskUserQuestion
- If `.planning/CODEBASE.md` already exists and is <30 days old, skip and inform the user
- If `.planning/CODEBASE.md` exists but is >30 days old, offer re-analysis

### Source Code Detection Heuristic

Check for non-Legion files in the current directory. Run these checks in order:

```
1. Any source files outside .planning/ and .claude/?
   Glob("*.{ts,js,py,rb,go,rs,java,swift,kt,c,cpp,cs}")
   Glob("src/**", "app/**", "lib/**", "components/**")

2. Any dependency manifests at root?
   package.json, Gemfile, pyproject.toml, requirements.txt, go.mod, Cargo.toml, pom.xml

3. Any build/config files?
   Makefile, Dockerfile, docker-compose.yml, tsconfig.json, webpack.config.*
```

**Decision logic:**
- If ANY of the above are found: existing codebase detected. Proceed to AskUserQuestion.
- If NONE found: pure greenfield. Skip brownfield flow silently.
- If ONLY .md files found: content project, not a codebase. Skip brownfield flow silently.

### Constants

```
CODEBASE_MAP_PATH = '.planning/CODEBASE.md'
MAX_TREE_DEPTH = 2
MAX_FILE_SAMPLE = 10  (per category — don't enumerate every file)
STALE_THRESHOLD_DAYS = 30
```

### Graceful Degradation

- If CODEBASE.md does not exist: all consumers skip brownfield context silently
- If CODEBASE.md is stale (>30 days): consumers warn but do not block
- Never error, never block, never require brownfield analysis for workflow completion
- All workflows function identically to their pre-brownfield behavior when CODEBASE.md is absent

---

## Section 2: Map Generation (BROWN-01)

Building the structural map of the codebase. This section produces the file tree, language distribution, entry points, and module structure that form the foundation of CODEBASE.md.

### 2.1: File Tree Summary

Generate a depth-limited directory tree, excluding noise directories and files:

```bash
# Depth-limited tree summary (max 2 levels, ignore noise)
find . -maxdepth ${MAX_TREE_DEPTH} \
  -not -path './.git/*' \
  -not -path './node_modules/*' \
  -not -path './.planning/*' \
  -not -path './.claude/*' \
  -not -name '*.lock' \
  -not -name 'package-lock.json' \
  -not -name 'yarn.lock' \
  -not -name '.DS_Store' \
  | sort
```

**Large codebase handling:**
- Count entries at depth 2. If >500 entries: reduce to `maxdepth 1`
- For depth-1 results, add per-directory file counts:
  ```bash
  # Count files per top-level directory
  for dir in $(find . -maxdepth 1 -type d -not -name '.git' -not -name 'node_modules' -not -name '.planning' -not -name '.claude'); do
    echo "$dir: $(find "$dir" -type f | wc -l) files"
  done
  ```
- Never enumerate every file in a directory -- summarize by count

### 2.2: Language Distribution

Count files by extension to understand the language composition:

```
For each detected extension:
  count = Glob("**/*.{ext}") result count
  percentage = (count / total_source_files) * 100

Sort by count descending.
Only include extensions with >= 2 files (filter noise from single-file extensions).
```

**Output format:**

| Extension | File Count | % of Codebase |
|-----------|-----------|---------------|
| .ts       | 47        | 38%           |
| .md       | 23        | 19%           |
| .js       | 15        | 12%           |

**Extension detection approach:**
1. Run `find . -type f -not -path './.git/*' -not -path './node_modules/*' -not -path './.planning/*' -not -path './.claude/*' -not -name '*.lock'` via Bash
2. Extract extensions, count occurrences, sort by frequency
3. Filter to extensions with >= 2 files

### 2.3: Entry Points

Identify project entry points by checking for known patterns:

| Ecosystem | Entry Point Indicators |
|-----------|----------------------|
| Node.js   | `package.json` fields: `main`, `module`, `bin`, `scripts.start` |
| Python    | `__main__.py`, `manage.py`, `app.py`, `main.py`, `wsgi.py` |
| Ruby      | `config.ru`, `bin/rails`, `Rakefile` |
| Go        | `main.go` in root, `cmd/` directory with `main.go` files |
| Rust      | `src/main.rs`, `src/lib.rs` |
| Java      | `src/main/java/**/Application.java`, `pom.xml` |
| Generic   | `src/index.*`, `app/main.*`, `Makefile` targets |

**Detection protocol:**
1. Check for each indicator file using Glob
2. For `package.json`: Read and extract `main`, `module`, `bin` fields
3. For `Makefile`: Read first 20 lines to find target names
4. Record each found entry point with its path and type

**Output format:**

| Type | Path | Evidence |
|------|------|----------|
| npm main | src/index.ts | package.json "main" field |
| CLI | bin/cli.js | package.json "bin" field |
| Makefile | Makefile | `build` and `serve` targets |

### 2.4: Module Structure

Detect how the codebase is organized by examining directory layout:

| Structure Type | Detection Heuristic |
|---------------|-------------------|
| Monorepo | Multiple `package.json` or `go.mod` files in subdirectories; `packages/`, `apps/`, or `workspaces` in root manifest |
| Flat | All source in root directory or single `src/` directory with no subdirectories |
| Domain-driven | Directories named by business domain (e.g., `users/`, `billing/`, `orders/`) |
| MVC | `controllers/`, `models/`, `views/` directories present |
| Component-based | `components/`, `modules/`, `features/` directories present |
| Layered | `api/`, `services/`, `repositories/` (or `data/`) directories present |
| Clean Architecture | `domain/`, `application/`, `infrastructure/` directories present |

**Detection protocol:**
1. List top-level and second-level directories using Glob
2. Match directory names against heuristic patterns above
3. If multiple patterns match, report the most specific one
4. Use directory name heuristics only -- do not read every file

**Output:** Single line describing detected structure type with evidence. Example:
```
Module structure: Component-based (components/, modules/ directories detected)
```

---

## Section 3: Pattern Detection (BROWN-02)

Identifying frameworks, libraries, and conventions used in the codebase. Uses two-stage detection (file presence THEN content grep) to avoid false positives.

### 3.1: Framework Detection Protocol

Two-stage detection to avoid false positives:

```
Stage 1: Check indicator file exists (Glob)
Stage 2: Read or Grep for specific framework marker within that file
Both stages must pass for a detection to be reported.
```

#### Node.js / JavaScript Ecosystem

Indicator file: `package.json`
If exists, Read `package.json` and check `dependencies` and `devDependencies`:

| Marker in dependencies | Detection |
|----------------------|-----------|
| `"express"` | Express.js |
| `"fastify"` | Fastify |
| `"next"` | Next.js |
| `"react"` | React |
| `"vue"` | Vue.js |
| `"@angular/core"` | Angular |
| `"svelte"` | Svelte |
| No framework deps | Vanilla Node.js |

Test frameworks (check `devDependencies`):

| Marker in devDependencies | Detection |
|--------------------------|-----------|
| `"jest"` | Jest |
| `"vitest"` | Vitest |
| `"mocha"` | Mocha |
| `"cypress"` | Cypress |
| `"@playwright/test"` or `"playwright"` | Playwright |

#### Python Ecosystem

Indicator files: `requirements.txt`, `pyproject.toml`, `setup.py`, `Pipfile`
Read the indicator file and check for:

| Marker | Detection |
|--------|-----------|
| `django` | Django |
| `flask` | Flask |
| `fastapi` | FastAPI |
| `pytest` | pytest test suite |

For `pyproject.toml`: check under `[project.dependencies]` or `[tool.poetry.dependencies]`.
For `requirements.txt`: check line starts (e.g., `django==`, `django>=`, `Django`).

#### Ruby Ecosystem

Indicator file: `Gemfile`
Read `Gemfile` and check for:

| Marker | Detection |
|--------|-----------|
| `gem 'rails'` or `gem "rails"` | Ruby on Rails |
| `gem 'sinatra'` or `gem "sinatra"` | Sinatra |
| `gem 'rspec'` or `gem "rspec"` | RSpec test suite |

#### Go Ecosystem

Indicator file: `go.mod`
Read `go.mod` and check `require` block for:

| Marker | Detection |
|--------|-----------|
| `github.com/gin-gonic/gin` | Gin |
| `github.com/labstack/echo` | Echo |
| `github.com/gorilla/mux` | Gorilla Mux |

#### Rust Ecosystem

Indicator file: `Cargo.toml`
Read `Cargo.toml` and check `[dependencies]` for:

| Marker | Detection |
|--------|-----------|
| `actix-web` | Actix Web |
| `rocket` | Rocket |
| `tokio` | Tokio async runtime |

#### Unknown / Custom

If none of the above match:
- Report "Custom / Unknown" with file extensions as evidence
- Do not guess -- state the evidence and let the planner decide
- Example: "Custom (primary extensions: .lua, .zig -- no recognized framework markers)"

### 3.2: Convention Detection

Analyze naming patterns and project structure conventions:

**File naming pattern** (sample up to MAX_FILE_SAMPLE source files):
- `kebab-case`: `my-component.ts`, `user-service.py`
- `camelCase`: `myComponent.ts`, `userService.py`
- `snake_case`: `my_component.py`, `user_service.rb`
- `PascalCase`: `MyComponent.tsx`, `UserService.java`
- Mixed: multiple patterns observed (note the dominant one)

**Test location:**
- Co-located: test files next to source files (e.g., `Component.test.tsx` beside `Component.tsx`)
- Separate directory: `test/`, `tests/`, `spec/`, `__tests__/` at project root or per-module
- No tests detected: note absence as a convention signal

**Config style:**
- `.env` files present (environment variable configuration)
- `config/` directory (centralized configuration)
- Environment-specific configs (`config.production.ts`, `settings/dev.py`)

**Import style:**
- Relative imports (`./`, `../`)
- Absolute imports (`@/`, `src/`, path aliases in tsconfig)
- Barrel files (`index.ts` re-exports)

**Linting/formatting tools** (check for config files):
- `.eslintrc.*`, `eslint.config.*` -- ESLint
- `.prettierrc.*`, `prettier.config.*` -- Prettier
- `.rubocop.yml` -- RuboCop
- `pyproject.toml [tool.black]` or `[tool.ruff]` -- Black / Ruff
- `.editorconfig` -- EditorConfig

### 3.3: Architecture Style Inference

Based on directory names and structure, infer the architecture pattern:

| Architecture | Directory Signals |
|-------------|-------------------|
| MVC | `controllers/` + `models/` + `views/` (or `templates/`) |
| Clean Architecture | `domain/` + `application/` + `infrastructure/` |
| Feature-based | `features/{name}/` with co-located code, tests, types |
| Layered | `api/` + `services/` + `repositories/` (or `data/`) |
| Flat | All files in root or single directory, no structural subdirectories |
| Monorepo | `packages/` or `apps/` with individual package manifests |
| Component-based | `components/` directory with self-contained UI modules |

**Important:** All inference is heuristic. Include "(inferred from directory structure)" in the evidence column. Do not state architecture style as certain unless strong framework signals confirm it (e.g., Rails projects are definitively MVC).

**Output format:**

| Layer | Technology | Evidence |
|-------|-----------|----------|
| Runtime | Node.js 20 | package.json `engines` field |
| Framework | Next.js 14 | `"next": "^14.0.0"` in dependencies |
| Language | TypeScript | tsconfig.json present, .ts files |
| Test | Jest | `"jest"` in devDependencies |
| Architecture | Feature-based | features/ directory with co-located files (inferred from directory structure) |

---

## Section 4: Risk Assessment (BROWN-03)

Flagging complexity, technical debt, and hotspots to inform planning. All risk levels are relative to project size using per-file rates.

### 4.1: Complexity Indicators

Find large files as a complexity signal:

```bash
# Find source files and count lines, sorted by size
find . -type f \( -name '*.ts' -o -name '*.js' -o -name '*.py' -o -name '*.rb' -o -name '*.go' -o -name '*.rs' -o -name '*.java' -o -name '*.swift' \) \
  -not -path './.git/*' -not -path './node_modules/*' -not -path './.planning/*' -not -path './.claude/*' \
  | xargs wc -l 2>/dev/null \
  | sort -rn \
  | head -20
```

**Thresholds (per file):**

| Lines | Risk Level | Meaning |
|-------|-----------|---------|
| >500 | HIGH | File likely has multiple responsibilities; refactoring candidate |
| 200-500 | MEDIUM | Manageable but worth noting for agents |
| <200 | LOW | Normal file size |

Report the top 5 largest files with their line counts.

### 4.2: Technical Debt Markers

Count TODO/FIXME/HACK/XXX markers across all source files:

```
Grep pattern: "TODO|FIXME|HACK|XXX"
Scope: all source files (exclude .git, node_modules, .planning, .claude, lock files)
```

**Calculate per-file debt density:**
```
debt_density = total_markers / total_source_files
```

| Density | Risk Level | Meaning |
|---------|-----------|---------|
| > 1.0 markers/file | HIGH | Significant accumulated debt |
| 0.3-1.0 markers/file | MEDIUM | Normal development debt |
| < 0.3 markers/file | LOW | Well-maintained codebase |

**Output:** Total marker count, file count, density rate, and top 5 files by marker count.

### 4.3: Git Hotspot Detection (optional)

Files changed most frequently in the last 90 days -- high churn indicates complexity or instability:

```bash
# Files changed most in the last 90 days
git log --since="90 days ago" --name-only --format="" \
  | sort | uniq -c | sort -rn | head -10
```

**Skip conditions** (skip silently, do not error):
- Not a git repository (`git rev-parse --is-inside-work-tree` fails)
- No git history (new repo with no commits)
- Fewer than 10 commits in the last 90 days (not enough data)

**When available:** Report top 10 most-changed files with change counts. Files appearing in both hotspots AND complexity indicators are high-priority risk areas.

### 4.4: Dependency Risk

Check for warning signs in project configuration:

| Check | Risk Signal | How to Detect |
|-------|------------|---------------|
| Missing lockfile | Unreproducible builds | `package.json` without `package-lock.json` or `yarn.lock`; `Gemfile` without `Gemfile.lock`; `requirements.txt` without pinned versions |
| No `.gitignore` | Risk of committed artifacts | Glob(`.gitignore`) returns no results |
| No CI config | No automated quality checks | None of: `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, `.circleci/`, `.travis.yml` |
| No README | Poor onboarding signal | Glob(`README*`) returns no results |
| Outdated manifests | Potential security/compat issues | Lockfile last-modified date is significantly older than manifest (check via Bash `stat` if available) |

### 4.5: Risk Summary

Produce a consolidated risk table:

| Area | Risk Level | Why | Recommendation |
|------|-----------|-----|----------------|
| Large files | HIGH | 3 files over 500 lines (auth.ts: 847, api.ts: 612, utils.ts: 523) | Break into smaller modules before adding features |
| Technical debt | MEDIUM | 0.6 markers/file (23 TODOs across 38 files) | Address TODOs in files agents will modify |
| Dependencies | LOW | Lockfile present, CI configured | No action needed |
| Git hotspots | MEDIUM | auth.ts changed 15 times in 90 days | Coordinate changes carefully; avoid parallel edits |

**Calibration rules:**
- Risk levels are relative to project size -- use per-file rates, not absolute counts
- A 5-file project with 10 TODOs is HIGH; a 500-file project with 10 TODOs is LOW
- Calibrate complexity thresholds to the project's average file size
- When in doubt, use MEDIUM -- avoid both false alarms (all HIGH) and false comfort (all LOW)

---

## Section 5: CODEBASE.md Format

The exact output format for the `.planning/CODEBASE.md` artifact. This file is the single deliverable of brownfield analysis and the single input for brownfield context injection.

### Template

```markdown
# Codebase Map

**Analyzed:** {YYYY-MM-DD}
**Root:** {absolute_path}
**Confidence:** {HIGH | MEDIUM | LOW}

## Architecture Overview

{2-3 paragraph narrative summary of the codebase. Describe the primary language, framework,
architecture style, and overall organization. Note any unusual patterns or notable characteristics.
This section is the executive summary -- agents read this first for orientation.}

## Language Distribution

| Extension | File Count | % of Codebase |
|-----------|-----------|---------------|
| {ext}     | {count}   | {pct}%        |

## Detected Stack

| Layer | Technology | Evidence |
|-------|-----------|----------|
| Runtime | {e.g., Node.js 20} | {e.g., package.json engines field} |
| Framework | {e.g., Next.js 14} | {e.g., "next": "^14.0.0" in dependencies} |
| Language | {e.g., TypeScript} | {e.g., tsconfig.json present, .ts files} |
| Test | {e.g., Jest} | {e.g., "jest" in devDependencies} |
| Architecture | {e.g., Feature-based} | {e.g., features/ directory (inferred from directory structure)} |

## Conventions Detected

- **File naming**: {pattern} (e.g., kebab-case for files, PascalCase for components)
- **Module structure**: {description} (e.g., feature-based with co-located tests)
- **Config location**: {description} (e.g., .env for secrets, config/ for app settings)
- **Test approach**: {description} (e.g., co-located .test.ts files using Jest)
- **Import style**: {description} (e.g., absolute imports via @ alias in tsconfig)
- **Linting/formatting**: {tools} (e.g., ESLint + Prettier configured)

## Entry Points

| Type | Path | Evidence |
|------|------|----------|
| {type} | {path} | {how detected} |

## Risk Areas

| Area | Risk Level | Why | Recommendation |
|------|-----------|-----|----------------|
| {area} | {HIGH/MEDIUM/LOW} | {explanation} | {what to do} |

## Technical Debt Signals

- **TODO/FIXME count**: {N} markers across {M} files (density: {rate}/file)
- **Large files (>500 lines)**: {list of files with line counts}
- **Files without tests**: {observation if detectable}
- **Git hotspots**: {top 3 most-changed files, or "N/A -- not a git repo"}

## Agent Guidance

Distilled advice for agents working on this codebase:

- **Preferred**: {patterns agents should follow -- e.g., "Use TypeScript strict mode, follow existing kebab-case naming, import via @ alias"}
- **Avoid**: {patterns agents should NOT introduce -- e.g., "Do not add CommonJS require() calls, do not create .js files"}
- **Touch with care**: {specific files or areas that are high-risk -- e.g., "auth.ts (847 lines, 15 changes in 90 days) -- coordinate carefully"}

## Dependency Graph

{Section 8 output — fan-out/fan-in summary, key dependency chains.
If no recognized import patterns: "No recognized import patterns detected."}

## Test Coverage Map

{Section 9 output — test convention, coverage ratio, files without tests.
If no test convention detected: "No test convention detected."}

## API Surface

{Section 10 output — route table grouped by resource.
If no web framework or routes detected: "No web framework detected or no HTTP route definitions found."}

## Config & Environment

{Section 11 output — config files, env variables, secret exposure warnings.
If no config patterns detected: "No configuration files or environment variable patterns detected."}

## Pattern Library

{Section 13 output — max 5 patterns with canonical examples.
If no patterns detected: "No recurring code patterns detected."}

## Monorepo Structure

{Section 14 output — package map, cross-package dependencies.
If not a monorepo: omit this section entirely — no placeholder.}
```

### Confidence Scoring

The overall confidence level in the CODEBASE.md header reflects the quality of detection:

| Level | Criteria |
|-------|----------|
| HIGH | Multiple strong signals: framework marker found in dependency file, clear directory structure, entry points identified, git history available |
| MEDIUM | Heuristic inference: directory structure suggests pattern but no manifest confirmation, or manifest exists but is minimal |
| LOW | Limited data: few files, no dependency manifests, ambiguous structure, no git history |

**Per-detection confidence** is expressed through the Evidence column in the Detected Stack table:
- Strong evidence: `"next": "^14.0.0" in package.json dependencies`
- Heuristic evidence: `features/ directory (inferred from directory structure)`
- Weak evidence: `"Custom / Unknown (primary extensions: .lua, .zig)"`

---

## Section 6: Integration Patterns

How callers consume this skill. Each integration point follows the same contract: check existence, use if present, skip if absent.

### 6.1: /legion:start Integration (Brownfield Branch)

After the pre-flight check (Step 1) and before the questioning flow (Step 3):

```
1. Run Source Code Detection Heuristic (Section 1)
2. If existing source detected:
   Use AskUserQuestion:
     "I detected an existing codebase in this directory. Would you like me to analyze it
      before we start planning? This maps your architecture, frameworks, and risk areas
      so agents can work with your existing patterns."

     Option 1: "Yes, analyze the codebase first"
       -> Run Section 2 (Map Generation) to build structural map
       -> Run Section 3 (Pattern Detection) to identify frameworks and conventions
       -> Run Section 4 (Risk Assessment) to flag complexity and debt
       -> Write .planning/CODEBASE.md using Section 5 format
       -> Display summary to user:
          "{N} files across {M} languages. Detected: {framework}. {risk_count} risk areas flagged."
       -> Continue to questioning flow (Step 3)

     Option 2: "No, skip the analysis"
       -> Proceed directly to questioning (greenfield mode)
       -> No CODEBASE.md created

     Option 3: "I'll run /legion:plan directly"
       -> Abort start, let user plan manually
       -> No CODEBASE.md created

3. If no existing source detected:
   Skip brownfield flow entirely (pure greenfield)
   Do not mention brownfield analysis to the user
```

### 6.2: /legion:plan Integration (Context Injection)

In `plan.md` step 3 (READ PHASE DETAILS), after reading existing state:

```
1. Check if .planning/CODEBASE.md exists
2. If yes:
   a. Read .planning/CODEBASE.md
   b. Check the "Analyzed" date in the header
      - If >30 days old: warn user:
        "CODEBASE.md is {N} days old. Consider re-analyzing with /legion:start."
      - Do NOT auto-re-analyze — let the user decide
      - Do NOT block planning — proceed with existing data
   c. Extract these sections for phase-decomposer context:
      - Risk Areas: areas that overlap with files the phase will modify
      - Agent Guidance: Preferred/Avoid/Touch-with-care directives
      - Conventions Detected: style rules for task instructions
      - Detected Stack: technology context for agent selection
   d. Include extracted data in phase-decomposer prompt:
      - Risk areas that overlap with the phase's target files
      - Convention rules appended to task action instructions
      - "Touch with care" areas noted in relevant plans
3. If no:
   Skip silently (greenfield project or user declined analysis)
   Do not mention CODEBASE.md to the user
```

### 6.3: /legion:build Integration (Agent Context Injection)

During `/legion:build` → wave-executor Section 3 (Personality Injection), Step 3.5:

1. Check if `.planning/CODEBASE.md` exists
2. If yes:
   - Extract Agent Guidance (Preferred/Avoid), Conventions Detected, and Risk Areas
   - Filter Risk Areas to rows overlapping with the current plan's `files_modified`
   - Compose a `## Codebase Context` block with three subsections:
     - Conventions (bullet list)
     - Agent Guidance (Preferred/Avoid)
     - Risk Areas (filtered table or "No risk areas overlap")
   - Inject this block into the agent's execution prompt after `# Execution Task`
     and before `{PLAN_CONTENT}`
3. If no: inject nothing — agents receive standard prompts (identical to greenfield)

The injection applies to both personality-injected and autonomous execution templates.

### 6.4: /legion:review Integration (Convention Checking)

During `/legion:review` → review-loop Section 3 (Review Prompt Construction), Step 2.5:

1. Check if `.planning/CODEBASE.md` exists
2. If yes:
   - Extract Detected Stack table and Conventions Detected bullet list
   - Compose a `## Codebase Conventions (from CODEBASE.md)` block with:
     - Detected Stack table
     - Conventions bullet list
     - Note: "Non-conformance with established conventions is a WARNING-level finding
       unless the plan explicitly calls for a different pattern."
   - Inject this block into the review prompt after `## Files to Review`
     and before `## Your Review Instructions`
3. If no: skip silently — review agents receive standard prompts

### 6.5: Plan Critique Integration (Risk Cross-Reference)

During `/legion:plan` → plan-critique Section 1 (Pre-Mortem Analysis), Step 1:

1. Check if `.planning/CODEBASE.md` exists
2. If yes:
   - Extract the Risk Areas table
   - Cross-reference each plan's `files_modified` against Risk Areas
   - If overlap with HIGH or MEDIUM risk: pre-seed Step 2 failure headlines
     with risk-informed scenarios
3. If no: skip — no pre-seeded headlines

Additionally, plan-critique Section 2 (Assumption Hunting) gains a new category
"e. Codebase assumptions" that checks convention currency, risk area accuracy,
and stack compatibility when CODEBASE.md exists.

### 6.6: Caller Contract

Every command that integrates with brownfield analysis MUST follow this contract:

```
1. Check if .planning/CODEBASE.md exists
2. If yes: use codebase data to enrich the operation
3. If no: skip silently, proceed with default behavior
4. Never error on missing CODEBASE.md
5. Never block workflow completion on CODEBASE.md
6. Never require brownfield analysis for any operation
7. Never auto-trigger analysis without user consent
```

This is identical to the Memory Conventions and GitHub Conventions degradation pattern -- the three optional integrations (Memory, GitHub, Brownfield) all follow the same contract.

### References

| Consumer | File | Integration Point |
|----------|------|------------------|
| `/legion:start` | `commands/start.md` | Brownfield detection branch after pre-flight (Step 1b) |
| `/legion:plan` | `commands/plan.md` | Context injection during phase decomposition (Step 3) |
| `/legion:build` | `commands/build.md` | Agent context injection via wave-executor Step 3.5 |
| `/legion:review` | `commands/review.md` | Convention checking via review-loop Step 2.5 |
| `/legion:plan` (critique) | `skills/plan-critique/SKILL.md` | Risk cross-reference during pre-mortem (Step 1) |

---

## Section 7: Standalone Re-Analysis

Protocols for re-running codebase analysis outside the `/legion:start` flow.

### 7.1: Triggering

Standalone re-analysis can be triggered via:
- **`/legion:quick analyze codebase`** — routed by `quick.md` Step 2.5 keyword matching
- **Staleness detection** — `/legion:status` detects CODEBASE.md age > 30 days and suggests re-analysis

### 7.2: Re-Analysis Protocol

```
Step 1: Check prerequisites
  - Verify .planning/ directory exists
  - If not: error — "No Legion project found. Run /legion:start first."

Step 2: Check existing analysis age
  - If .planning/CODEBASE.md exists:
    - Read the "Analyzed:" date from the header
    - Calculate age in days
    - If age <= STALE_THRESHOLD_DAYS (30):
      Inform user: "CODEBASE.md is {age} days old (threshold: 30 days). Still current."
      Use AskUserQuestion: "Re-analyze anyway?"
        - "Yes, re-analyze" → continue to Step 3
        - "No, keep current" → exit
  - If .planning/CODEBASE.md does not exist:
    Continue to Step 3 (first-time analysis)

Step 3: Confirm with user
  Use AskUserQuestion:
    "Ready to analyze the codebase? This will map architecture, frameworks,
     conventions, and risk areas."
    - "Yes, analyze" → proceed to Step 4
    - "Cancel" → exit

Step 4: Execute analysis
  Run Section 2 (Map Generation), Section 3 (Pattern Detection),
  Section 4 (Risk Assessment) in sequence.
  If Sections 8-14 are available in this SKILL.md, also run:
  - Section 8 (Dependency Graph)
  - Section 9 (Test Coverage Map)
  - Section 10 (API Surface Detection)
  - Section 11 (Config & Environment Surface)
  - Section 13 (Pattern Library Extraction)
  - Section 14 (Monorepo Support) — only if monorepo detected in Section 2.4
  Write .planning/CODEBASE.md using Section 5 format.

Step 5: Report results
  Display summary:
  "Codebase analysis complete:
   - {file_count} files across {language_count} languages
   - Stack: {detected_frameworks}
   - {risk_count} risk areas flagged
   - Analysis written to .planning/CODEBASE.md"
```

### 7.3: Staleness Detection

Reusable protocol for any command to check CODEBASE.md freshness:

```
1. Check if .planning/CODEBASE.md exists
2. If no: return { available: false }
3. If yes:
   a. Read the "Analyzed:" date from the header (format: YYYY-MM-DD)
   b. Calculate age = current_date - analyzed_date (in days)
   c. Return { available: true, age: {days}, stale: age > STALE_THRESHOLD_DAYS }
```

Used by `/legion:status` (Step 2h) and `/legion:quick` (Step 2.5 routing).

---

## Section 8: Dependency / Import Graph (BROWN-04)

Maps file-level import relationships to identify coupling, fan-out hotspots, and dependency chains.

### 8.1: File Selection

Select up to MAX_FILE_SAMPLE (10) files for import analysis using these priority sources:
1. Entry points identified in Section 2.3
2. Largest files identified in Section 4.1 (complexity indicators)
3. Git hotspots from Section 4.3 (if available)
4. If fewer than 10 files from above: fill from top-level source files alphabetically

### 8.2: Import Extraction by Language

Apply language-specific grep patterns to extract imports from selected files:

| Language | Import Patterns |
|----------|----------------|
| TypeScript/JavaScript | `import .* from ['"]`, `require\(['"]`, `import\(['"]` (dynamic) |
| Python | `^import `, `^from .* import` |
| Go | `^import \(` (block), `^import "` (single) |
| Ruby | `^require `, `^require_relative ` |
| Rust | `^use `, `^extern crate ` |
| Java/Kotlin | `^import ` |

For each detected import:
- Classify as **internal** (relative path or project path alias) or **external** (package/module name)
- Resolve relative imports to actual file paths where possible (e.g., `./utils` → `src/utils.ts`)
- External dependencies are noted but not traced further

### 8.3: Adjacency List Format

Build the dependency graph as an adjacency list:

```
{source_file} -> [{imported_file_1}, {imported_file_2}, ...]
```

Example:
```
src/index.ts -> [src/config.ts, src/routes/api.ts, src/middleware/auth.ts]
src/routes/api.ts -> [src/services/user.ts, src/services/billing.ts]
src/middleware/auth.ts -> [src/config.ts, src/services/user.ts]
```

External dependencies are listed separately:
```
External: express, @prisma/client, zod, jsonwebtoken
```

### 8.4: Fan-out / Fan-in Summary

Calculate coupling metrics from the adjacency list:

**Fan-out** (most-importing files — files that depend on many others):
Top 5 files by number of imports, descending.

**Fan-in** (most-imported files — files that many others depend on):
Top 5 files by number of times they appear as an import target, descending.

High fan-in files are critical dependencies — changes to them have wide impact.
High fan-out files may have too many responsibilities.

### 8.5: Output Format

Output for CODEBASE.md `## Dependency Graph` section:

```markdown
## Dependency Graph

**Files analyzed**: {count} | **Internal edges**: {count} | **External deps**: {count}

### Fan-out (most imports)
| File | Import Count |
|------|-------------|
| {file} | {count} |

### Fan-in (most imported)
| File | Imported By |
|------|------------|
| {file} | {count} files |

### Key Dependency Chains
{2-3 notable dependency chains, e.g., "index.ts → api.ts → user.ts → db.ts (4 hops)"}
```

**Graceful degradation**: If no recognized import patterns are found in any sampled file, output:
```
## Dependency Graph
No recognized import patterns detected. Import analysis requires source files with standard import syntax.
```

---

## Section 9: Test Coverage Map (BROWN-05)

Maps which source files have corresponding test files and which lack test coverage.

### 9.1: Test File Detection Patterns

Detect test files using these conventions:

| Convention | Pattern | Example |
|-----------|---------|---------|
| Co-located .test | `{name}.test.{ext}`, `{name}.spec.{ext}` | `utils.test.ts`, `api.spec.js` |
| __tests__ directory | `__tests__/{name}.{ext}` | `__tests__/utils.ts` |
| test/ directory | `test/{name}.{ext}`, `test/{name}.test.{ext}` | `test/utils.test.ts` |
| spec/ directory | `spec/{name}_spec.{ext}` | `spec/utils_spec.rb` |
| Go convention | `{name}_test.go` | `utils_test.go` |
| Java convention | `{Name}Test.java`, `Test{Name}.java` | `UtilsTest.java` |
| Python convention | `test_{name}.py`, `{name}_test.py` | `test_utils.py` |

### 9.2: Detection Protocol

```
Step 1: Determine dominant test convention
  - Glob for each test pattern above
  - The pattern with the most matches is the dominant convention
  - If no test files found at all: skip to graceful degradation

Step 2: Sample source files
  - Select up to MAX_FILE_SAMPLE (10) source files from the primary source directory
  - Prioritize: entry points, largest files, files from Section 8 fan-in list (if available)

Step 3: Check for matching test files
  For each sampled source file, check if a corresponding test file exists
  using the dominant convention:
  - source: src/utils.ts → test: src/utils.test.ts or __tests__/utils.ts
  - source: lib/auth.py → test: tests/test_auth.py or lib/auth_test.py

Step 4: Compute coverage ratio
  coverage_ratio = files_with_tests / files_sampled
  Classify:
  - >= 0.8: HIGH coverage (most files have tests)
  - 0.4-0.79: MEDIUM coverage (partial test suite)
  - < 0.4: LOW coverage (minimal or no tests)
```

### 9.3: Output Format

Output for CODEBASE.md `## Test Coverage Map` section:

```markdown
## Test Coverage Map

**Test convention**: {dominant convention, e.g., "co-located .test.ts files"}
**Coverage**: {ratio}% of sampled files ({count}/{sample_size}) — {HIGH|MEDIUM|LOW}

### Files Without Tests
| Source File | Lines | Risk Note |
|-------------|-------|-----------|
| {file} | {lines} | {e.g., "Large file, high fan-in"} |
```

**Graceful degradation**: If no test convention is detected:
```
## Test Coverage Map
No test convention detected. No files matching common test patterns (.test., .spec., __tests__/, test/, _test.go, Test*.java) were found.
```

---

## Section 10: API Surface Detection (BROWN-06)

Identifies HTTP route definitions to map the project's API surface.

### 10.1: Route Detection by Framework

Apply framework-specific grep patterns based on the framework detected in Section 3.1:

| Framework | Route Pattern | Grep Expression |
|-----------|--------------|-----------------|
| Express | `app.get/post/put/delete/patch` | `app\.(get\|post\|put\|delete\|patch)\s*\(` |
| Fastify | `fastify.get/post/put/delete` | `fastify\.(get\|post\|put\|delete)\s*\(` |
| Next.js (App Router) | `app/` directory with route.ts/js | Glob: `app/**/route.{ts,js}` |
| Next.js (Pages Router) | `pages/api/` directory | Glob: `pages/api/**/*.{ts,js}` |
| FastAPI | `@app.get/post/put/delete` | `@app\.(get\|post\|put\|delete)\s*\(` |
| Django | `path()` in urls.py | `path\s*\(` in `**/urls.py` |
| Rails | `routes.rb` with get/post/resources | `(get\|post\|put\|patch\|delete\|resources)\s` in `config/routes.rb` |
| Go net/http | `http.HandleFunc` | `http\.HandleFunc\s*\(` |
| Go Gin | `router.GET/POST/PUT/DELETE` | `\.(GET\|POST\|PUT\|DELETE)\s*\(` |

### 10.2: Detection Protocol

```
Step 1: Determine web framework
  Use the framework detected in Section 3.1 (Detected Stack).
  If no web framework detected: skip to graceful degradation.

Step 2: Apply route grep
  Run the appropriate grep expression from 10.1.
  Sample up to MAX_FILE_SAMPLE (10) route files.

Step 3: Extract route information
  For each matched line, extract:
  - HTTP method (GET, POST, PUT, DELETE, PATCH)
  - Route path (e.g., "/api/users/:id")
  - Handler function name (if visible on the same line)

Step 4: Group by resource prefix
  Group routes by the first path segment after /api/ (or root):
  - /api/users/* → "users" resource
  - /api/billing/* → "billing" resource
  - / → "root" resource
```

### 10.3: Output Format

Output for CODEBASE.md `## API Surface` section:

```markdown
## API Surface

**Framework**: {framework} | **Routes detected**: {count} | **Resources**: {count}

| Method | Path | Handler | File |
|--------|------|---------|------|
| GET | /api/users | listUsers | src/routes/users.ts |
| POST | /api/users | createUser | src/routes/users.ts |
| GET | /api/users/:id | getUser | src/routes/users.ts |
```

**Graceful degradation**: If no web framework is detected or no routes are found:
```
## API Surface
No web framework detected or no HTTP route definitions found. API surface analysis requires a recognized web framework (Express, Fastify, Next.js, FastAPI, Django, Rails, Go net/http, Gin).
```

---

## Section 11: Config & Environment Surface (BROWN-07)

Maps configuration files, environment variables, and potential secret exposure risks.

### 11.1: Config File Detection

Glob for common configuration file patterns:

| Category | Glob Patterns |
|----------|--------------|
| Environment | `.env`, `.env.*`, `.env.example`, `.env.local` |
| App config | `config/`, `*.config.{ts,js,json,yaml,yml}` |
| Build tools | `webpack.config.*`, `vite.config.*`, `rollup.config.*`, `esbuild.*`, `tsconfig*.json` |
| CI/CD | `.github/workflows/*.yml`, `.gitlab-ci.yml`, `Jenkinsfile`, `.circleci/config.yml` |
| Containers | `Dockerfile*`, `docker-compose*.yml`, `.dockerignore` |
| Secrets management | `.vault`, `*.keystore`, `credentials.json` (check .gitignore status) |

### 11.2: Environment Variable Extraction

Detect environment variables referenced in the codebase:

| Language/Runtime | Grep Pattern |
|-----------------|-------------|
| Node.js | `process\.env\.` or `process\.env\[` |
| Python | `os\.environ`, `os\.getenv` |
| Ruby | `ENV\[` |
| Go | `os\.Getenv` |
| Generic | `.env` file entries (KEY=value format) |

If `.env.example` exists, read it to get the canonical list of expected environment variables.

**Sensitive variable detection**: Flag variables whose names contain:
`SECRET`, `KEY`, `TOKEN`, `PASSWORD`, `CREDENTIAL`, `API_KEY`, `PRIVATE`, `AUTH`

### 11.3: Secret Exposure Check

Check for potential secret exposure:

| Check | How | Risk |
|-------|-----|------|
| `.env` tracked by git | `git ls-files .env` — if it returns a result, .env is committed | HIGH |
| Hardcoded key patterns | Grep for patterns like `['"]\w{20,}['"]` near `key`, `secret`, `token` assignments | MEDIUM |
| Missing .gitignore entries | Check if `.gitignore` includes `.env`, `*.key`, `credentials.*` | MEDIUM |

### 11.4: Output Format

Output for CODEBASE.md `## Config & Environment` section:

```markdown
## Config & Environment

**Config files**: {count} detected | **Env variables**: {count} referenced | **Sensitive vars**: {count}

### Config Files
| File | Category | Notes |
|------|----------|-------|
| .env.example | Environment | {count} variables defined |
| tsconfig.json | Build tools | TypeScript configuration |
| docker-compose.yml | Containers | Multi-service setup |

### Environment Variables
| Variable | Source | Sensitive |
|----------|--------|-----------|
| DATABASE_URL | .env.example | No |
| JWT_SECRET | process.env reference | Yes |
| API_KEY | process.env reference | Yes |

### Secret Exposure Warnings
{List any findings from 11.3, or "No secret exposure issues detected."}
```

**Graceful degradation**: If no config patterns are detected:
```
## Config & Environment
No configuration files or environment variable patterns detected.
```

---

## Section 12: Change Impact Analysis (BROWN-08)

Dynamic analysis consumed by `/legion:plan` — NOT stored in CODEBASE.md.

### 12.1: Impact Trace Protocol

Given a list of `files_modified` from a plan:

```
Step 1: Look up fan-in from Section 8 (Dependency Graph)
  For each file in files_modified:
  - Find all files that import this file (fan-in from Section 8.4)
  - These are "directly affected" files

Step 2: Classify impact
  For each directly affected file:
  - If file also appears in Risk Areas (Section 4.5): impact = HIGH
  - Otherwise: impact = MEDIUM

  For transitive dependencies (files that import directly affected files):
  - impact = LOW (note but do not trace further)

Step 3: Produce impact summary
  | Modified File | Directly Affected | Impact Level |
  |--------------|-------------------|-------------|
  | {file} | {list of importing files} | {HIGH/MEDIUM} |

  If any HIGH impact files detected, add a warning:
  "### Downstream Impact Warning
   Changes to {files} affect {count} downstream files, including {high_risk_files}
   which are in Risk Areas. Coordinate carefully."
```

### 12.2: Integration

This analysis is consumed dynamically by `/legion:plan` (phase-decomposer) to:
- Add "### Downstream Impact Warning" to task instructions when `files_modified` overlaps with high-fan-in files
- Inform wave assignment — plans modifying high-impact files should run in earlier waves so dependent plans can adapt

This is NOT stored in CODEBASE.md — it is computed on-demand during plan generation.

### 12.3: Graceful Degradation

Requires Section 8 (Dependency Graph) output in CODEBASE.md.
- If `## Dependency Graph` section is absent: skip impact analysis silently
- If Dependency Graph exists but has no fan-in data: skip silently
- Never error, never block plan generation

---

## Section 13: Pattern Library Extraction (BROWN-09)

Identifies recurring code patterns and extracts canonical examples for agent guidance.

### 13.1: Pattern Detection Protocol

```
Step 1: Sample source files
  Select up to MAX_FILE_SAMPLE (10) source files from the primary source directory.
  Prioritize: entry points, most-imported files (Section 8 fan-in), largest files.

Step 2: Detect patterns by category
  For each sampled file, look for these pattern types:

  a. Component patterns (frontend):
     - React functional components: `export (default )?function \w+`
     - React class components: `class \w+ extends (React\.)?Component`
     - Vue SFC: `<template>`, `<script>`, `<style>` blocks
     - Svelte components: `<script>` with reactive declarations

  b. Service/module patterns (backend):
     - Class-based services: `class \w+Service`
     - Factory functions: `function create\w+`
     - Module exports: `module.exports` or `export default`
     - Dependency injection: constructor parameter patterns

  c. Error handling patterns:
     - Try/catch blocks: `try {` ... `catch`
     - Error middleware: `(err, req, res, next)`
     - Custom error classes: `class \w+Error extends Error`
     - Result types: `Result<`, `Either<`

  d. Test patterns:
     - Test structure: `describe(` ... `it(` or `test(`
     - Setup/teardown: `beforeEach`, `afterEach`, `setUp`, `tearDown`
     - Assertion style: `expect(`, `assert.`, `should.`

Step 3: Extract canonical examples
  For each detected pattern type:
  - Find the file with the cleanest, most representative example
  - Extract a 10-20 line code snippet showing the pattern
  - Note the file path and approximate line range
  - Count how many files follow this pattern (usage count)
```

### 13.2: Output Format

Output for CODEBASE.md `## Pattern Library` section (max 5 patterns):

```markdown
## Pattern Library

{count} recurring patterns detected across {files_sampled} sampled files.

### Pattern 1: {pattern_name}
- **Type**: {component | service | error-handling | test}
- **Canonical example**: `{file_path}` (lines {start}-{end})
- **Usage count**: {count} files follow this pattern
- **Guidance**: {1-2 sentence description of when and how to use this pattern}

```{language}
{10-20 line code snippet}
```
```

**Graceful degradation**: If no clear patterns are detected:
```
## Pattern Library
No recurring code patterns detected in the sampled files. Pattern detection requires recognizable component, service, error handling, or test structures.
```

---

## Section 14: Monorepo Support (BROWN-10)

Detects monorepo structure and provides per-package analysis.

### 14.1: Monorepo Detection

Leverages Section 2.4 (Module Structure) detection. A monorepo is confirmed when:
- Multiple `package.json` files exist in subdirectories, OR
- Root manifest has a `workspaces` field, OR
- `pnpm-workspace.yaml` exists, OR
- `lerna.json` exists, OR
- Multiple `go.mod` files exist in subdirectories, OR
- `Cargo.toml` has a `[workspace]` section

If none of these conditions are met: this section is omitted entirely from CODEBASE.md.

### 14.2: Per-Package Analysis

```
Step 1: List all packages (up to 10)
  - Read the workspace configuration to find package directories
  - For npm/pnpm/yarn: parse workspaces field or pnpm-workspace.yaml
  - For Go: find all go.mod files
  - For Rust: parse [workspace] members in root Cargo.toml
  - Cap at 10 packages — for larger monorepos, list the 10 most recently
    modified packages (by git log if available)

Step 2: Run scoped analysis per package
  For each package, run a lightweight version of Sections 2-4:
  - Language distribution (Section 2.2) scoped to the package directory
  - Framework detection (Section 3.1) checking the package's own manifest
  - Entry points (Section 2.3) within the package
  - File count and approximate line count

Step 3: Build cross-package dependency map
  - Read each package's manifest for internal workspace dependencies
  - For npm: check dependencies/devDependencies for workspace: protocol or
    packages that match other workspace package names
  - For Go: check import paths that match other modules in the monorepo
  - For Rust: check [dependencies] for path = "../" references
```

### 14.3: Output Format

Output for CODEBASE.md `## Monorepo Structure` section:

```markdown
## Monorepo Structure

**Workspace tool**: {npm workspaces | pnpm | yarn workspaces | lerna | Go modules | Cargo workspace}
**Packages**: {count}

### Package Map
| Package | Path | Language | Framework | Files | Entry Point |
|---------|------|----------|-----------|-------|-------------|
| {name} | {path} | {lang} | {framework or "—"} | {count} | {entry or "—"} |

### Cross-Package Dependencies
| Package | Depends On |
|---------|-----------|
| {name} | {comma-separated list of internal dependencies} |
```

All monorepo analysis is stored in the root `.planning/CODEBASE.md` — no separate per-package files.

### 14.4: Graceful Degradation

If the project is not a monorepo (Section 14.1 conditions not met):
- This section is omitted entirely from CODEBASE.md
- No placeholder, no fallback message
- The analysis silently skips monorepo-specific steps
