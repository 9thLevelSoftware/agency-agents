# Research: Production-Grade Architecture Patterns

**Research Date:** 2026-03-05  
**Source:** https://github.com/nagisanzenin/claude-code-production-grade-plugin  
**Focus:** Architectural concepts for Legion v5.0 integration

---

## Stack Analysis

### Production-Grade Plugin Stack
- **14 specialized agents** with sole authority domains
- **Claude Code Teams/TaskList** — native parallelism, no custom state
- **Two-wave execution** — Wave A (Build + Analysis), Wave B (Execution)
- **Internal skill parallelism** — Large skills use router + phase pattern
- **3 approval gates** — Requirements, Architecture, Production Readiness
- **Configuration:** `.production-grade.yaml` for brownfield path mapping

### Integration with Legion
- Legion already has **wave-executor** and **review-panel** skills
- **codebase-mapper** exists for brownfield detection
- **52 agents** vs production-grade's 14 — more coverage, needs authority mapping
- **Human-readable markdown state** — preserve Legion's approach over native Teams state

---

## Feature Categories

### Table Stakes (Must Integrate)

#### 1. Polymath Co-Pilot (Skill 0)
**What:** Pre-flight alignment agent with 6 modes: onboard, research, ideate, advise, translate, synthesize  
**Legion adaptation:** Create `agents/specialized-polymath.md` + `commands/explore.md`  
**Key insight:** "Every interaction is structured — arrow keys + Enter. No open-ended questions."  
**Value:** Bridges gap between "I have an idea" and "I know exactly what to build"

#### 2. Strict Authority Boundaries
**What:** Sole authority per domain prevents conflicts  
**Production-grade matrix:**
- security-engineer → OWASP, STRIDE, PII (code-reviewer must skip security)
- sre → SLOs, error budgets, runbooks (devops must skip SLO definitions)
- code-reviewer → findings only, no code changes
- devops → infrastructure, CI/CD (sre reviews but doesn't provision)
- product-manager → requirements (architect flags gaps, doesn't change)
- solution-architect → architecture (implementation follows, doesn't redesign)

**Legion adaptation:** Define in `skills/agent-registry/SKILL.md` or authority matrix file  
**Enforcement:** System prompt injection + review-panel deduplication

#### 3. Intent-Driven Partial Execution
**What:** Run specific pipeline segments without full phases  
**Production-grade commands:**
- `"Just define"` → PM + Architect only
- `"Just build"` → Backend + Frontend + Containers
- `"Just harden"` → QA + Security + Code Review
- `"Just ship"` → IaC + CI/CD + SRE
- `"Just document"` → Technical Writer only
- `"Help me think about..."` → Polymath only
- `"Skip frontend"` → Full pipeline minus frontend

**Legion adaptation:** Add semantic flags to `/legion:build` and `/legion:review`  
**Smart routing:** Map to predefined "Team Templates" in agent-registry

#### 4. Two-Wave Parallel Execution
**What:** Wave A (Build + Analysis parallel), Wave B (Execution parallel)  
**Production-grade flow:**
```
T1: PM (BRD) ───────────────── GATE 1
T2: Architect ───────────────── GATE 2
    ↓
Wave A (parallel):
  Backend ── spawns N agents (1 per service)
  Frontend ─ spawns N agents (1 per page group)
  DevOps ─── Dockerfiles + CI skeleton
  QA ─────── test plan
  Security ─ STRIDE threat model
  Code Review ─ arch conformance
  SRE ────── SLO definitions
    ↓
Wave B (parallel):
  DevOps ─── build + push containers
  QA ─────── implement tests
  Security ─ code audit + dep scan
  Code Review ─ actual review
    ↓
Remediation + SRE chaos + Data Scientist (parallel)
    ↓
GATE 3: approve production readiness
    ↓
Technical Writer + Skill Maker (parallel)
```

**Legion adaptation:** Enhance `skills/wave-executor/SKILL.md` with two-wave pattern  
**Benefit:** ~3x faster, ~45% fewer tokens vs sequential

#### 5. Adaptive Environment Mapping
**What:** `.production-grade.yaml` maps deliverables to existing directory structure  
**Config example:**
```yaml
version: "3.1"
project:
  name: "my-project"
  language: "typescript"
  framework: "nestjs"
  cloud: "aws"
paths:
  services: "services/"
  frontend: "frontend/"
  tests: "tests/"
  terraform: "infrastructure/terraform/"
```

**Legion adaptation:** Enhance `skills/codebase-mapper/SKILL.md` to generate `.planning/CODEBASE.md`  
**Path enforcement:** Dynamically inject into `spec-pipeline` and `wave-executor`

### Differentiators (Legion Enhancements)

- **52-agent coverage** across 9 divisions vs production-grade's 14 engineering-focused
- **Multi-domain support** — marketing, design, product, not just SaaS
- **Cross-CLI compatibility** — works with Claude Code, Codex CLI, Cursor, etc.
- **Personality-first** — agents maintain distinct voices (production-grade is more uniform)

### Anti-Features (Leave Behind)

- **No custom state files** — production-grade uses native Teams, Legion keeps markdown
- **No "CEO/CTO command-driven"** — too metaphor-heavy, Legion uses direct commands
- **No 14-agent minimum** — Legion adapts agent count to project needs

---

## Architecture Integration Points

### Files to Create
1. `agents/specialized-polymath.md` — Exploration agent with 6 modes
2. `commands/explore.md` — Pre-flight alignment command
3. `.planning/CODEBASE.md` template — Workspace path mappings

### Files to Modify
1. `commands/start.md` — Add Polymath hook: "Explore first or jump to planning?"
2. `commands/build.md` — Add semantic flags: `--just-harden`, `--skip-frontend`, etc.
3. `commands/review.md` — Add semantic flags + authority-aware deduplication
4. `skills/wave-executor/SKILL.md` — Add two-wave pattern + authority matrix enforcement
5. `skills/review-panel/SKILL.md` — Add domain-filtered findings + deduplication by file:line
6. `skills/codebase-mapper/SKILL.md` — Add path mapping output
7. `skills/spec-pipeline/SKILL.md` — Add path enforcement for deliverables
8. `skills/agent-registry/SKILL.md` — Add authority matrix definition

### Build Order
1. **Phase 1:** Polymath agent + explore command (foundation)
2. **Phase 2:** Authority matrix + wave executor enhancements (conflict prevention)
3. **Phase 3:** Semantic flags for build/review (intent-driven execution)
4. **Phase 4:** Codebase mapper enhancements (brownfield superiority)
5. **Phase 5:** Roster gap analysis (verify SRE/security coverage)

---

## Pitfalls from Production-Grade (Avoid)

### 1. State Management Complexity
**Issue:** Relying solely on Claude Code Teams state makes debugging hard  
**Legion solution:** Keep human-readable `.planning/` markdown alongside Teams

### 2. Over-Parallelization
**Issue:** Too many parallel agents can overwhelm context windows  
**Legion solution:** Max 3 tasks per plan (existing constraint), wave boundaries

### 3. Rigid Pipeline
**Issue:** "CEO/CTO" metaphor creates unnecessary abstraction  
**Legion solution:** Direct commands (`/legion:build`), clear intent

### 4. Engineering-Only Focus
**Issue:** 14 agents all engineering-focused, no design/marketing/PM  
**Legion advantage:** 9 divisions, 52 agents, true multi-domain

---

## Critical Success Factors

1. **Authority matrix must be lightweight** — JSON/YAML, not bureaucratic
2. **Polymath must have exit criteria** — exploration produces crystallized PROJECT.md
3. **Semantic flags need smart routing** — predefined templates, not dynamic scoring
4. **Two-wave pattern fits Legion's existing wave-executor** — natural extension
5. **Preserve Legion's core identity** — personality-first, multi-runtime, human-readable

---

## Research Summary

**What Legion gains from production-grade patterns:**
- Pre-flight alignment via Polymath (reduce misalignment)
- Strict authority boundaries (eliminate agent conflicts)
- Intent-driven partial execution (flexible, efficient)
- Two-wave parallelism (~3x faster execution)
- Enhanced brownfield mapping (better existing codebase support)

**What Legion preserves vs production-grade:**
- Human-readable markdown state (vs native Teams only)
- 52-agent versatility across 9 divisions (vs 14 engineering agents)
- Multi-runtime compatibility (Claude Code, Codex, Cursor, etc.)
- Personality-first agent design (distinct voices)
- No custom tooling constraint (pure skills/commands/agents)

**Integration complexity:** Medium — natural fit with existing wave-executor, review-panel, and codebase-mapper skills. Requires 5 phases, approximately 8-12 requirements.
