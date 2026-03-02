---
name: legion:codebase-mapper
description: Brownfield codebase analysis — file mapping, framework detection, risk assessment, and CODEBASE.md generation
---

# Codebase Mapper

Brownfield codebase analysis engine for Legion. Analyzes existing codebases before planning to produce a structured map of architecture, patterns, frameworks, and risk areas. The output artifact is `.planning/CODEBASE.md`, consumed by `/legion:start` (brownfield detection branch) and `/legion:plan` (context injection into phase decomposition).

All operations use Read, Bash, Glob, and Grep -- no external dependencies, no custom scripts, no MCP servers. The analysis is Claude reading and reasoning over files using a structured protocol.

References:
- State File Locations from `workflow-common.md` (state paths, degradation pattern)
- Brownfield Conventions from `workflow-common.md` (lifecycle, paths, integration points)
- `/legion:start` in `start.md` (brownfield detection trigger, user opt-in)
- `/legion:plan` in `plan.md` (CODEBASE.md context injection during phase decomposition)

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

### 6.3: Caller Contract

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
