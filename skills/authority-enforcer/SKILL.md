---
name: legion:authority-enforcer
description: Validates and enforces agent authority boundaries during wave execution and review panels
triggers: [authority, boundary, domain, enforce, validate, filter]
token_cost: low
summary: "Loads authority matrix, validates agent boundaries, filters out-of-domain critiques. Used by wave-executor and review-panel to prevent conflicts."
---

# Authority Enforcer

Validates and enforces agent authority boundaries during wave execution and review panels. Prevents agent conflicts by ensuring domain ownership is respected.

---

## Section 1: Authority Loading

Load and parse the authority matrix to establish domain ownership rules.

### Step 1: Load Authority Matrix

```yaml
Input: None (uses hardcoded path)
Output: AuthorityMatrix object

Procedure:
1. Read `.planning/config/authority-matrix.yaml`
2. Parse YAML into structured object
3. Store in memory: agent_id → AgentConfig mapping
4. Build reverse index: domain → primary_agent_id
```

### Step 2: Validate Matrix Integrity

```yaml
Input: AuthorityMatrix
Output: ValidationReport

Checks:
1. All agent IDs exist in agent-registry
2. No domain is assigned to more than one agent as "exclusive"
3. Flag overlapping domains for conflict resolution
4. Verify deferred_by arrays are valid
```

**Validation Algorithm:**
```python
def validate_matrix(matrix):
    errors = []
    domain_owners = {}
    
    for agent_id, config in matrix.agents.items():
        # Check 1: Agent exists in registry
        if not registry.has_agent(agent_id):
            errors.append(f"Unknown agent: {agent_id}")
        
        # Check 2: No duplicate exclusive domains
        for domain in config.exclusive_domains:
            if domain in domain_owners:
                errors.append(
                    f"Domain conflict: '{domain}' assigned to both "
                    f"{domain_owners[domain]} and {agent_id}"
                )
            else:
                domain_owners[domain] = agent_id
    
    return ValidationReport(valid=len(errors) == 0, errors=errors)
```

---

## Section 2: Boundary Validation

Check if an agent is authorized to critique or act on a specific topic.

### Function: `validateBoundary`

```yaml
Input:
  agent_id: string          # Agent requesting action
  topic: string             # Topic/domain being addressed
  active_agents: string[]   # List of currently active agents

Output:
  authorized: boolean       # Whether agent can proceed
  domain_owner: string|null # Owner of this domain (if any)
  reason: string            # Explanation of decision
```

### Algorithm

```python
def validate_boundary(agent_id, topic, active_agents):
    # Mode check: skip validation if authority enforcement is disabled
    if not profile.authority_enforcement:
        return {
            authorized: True,
            domain_owner: None,
            reason: "Authority enforcement disabled by control mode"
        }

    # Load agent's exclusive domains from matrix
    agent_domains = matrix.get_domains(agent_id)

    # Check 1: Agent owns this topic
    if topic in agent_domains:
        return {
            authorized: True,
            domain_owner: agent_id,
            reason: "Agent has exclusive authority over this domain"
        }
    
    # Check 2: Another agent owns this topic
    for active_agent in active_agents:
        if active_agent == agent_id:
            continue
        
        active_domains = matrix.get_domains(active_agent)
        if topic in active_domains:
            return {
                authorized: False,
                domain_owner: active_agent,
                reason: f"{active_agent} has exclusive authority; defer to domain owner"
            }
    
    # Check 3: No owner for this topic
    return {
        authorized: True,
        domain_owner: None,
        reason: "Topic has no exclusive owner; general domain"
    }
```

### Topic Matching

Topics are matched using keyword normalization:

```yaml
Normalization Rules:
  - Case-insensitive matching
  - Hyphens and underscores equivalent ("ci-cd" == "ci_cd")
  - Substring matching for compound topics:
      "api-security" matches both "api" and "security"
  
Specificity Scoring:
  - Exact match: score 10
  - Substring match: score 5
  - Related domain: score 2
  - No match: score 0
```

---

## Section 3: Prompt Injection

Inject authority constraints into agent prompts to prevent conflicts proactively.

### Function: `injectAuthorityConstraints`

```yaml
Input:
  agent_id: string
  base_prompt: string
  active_agents: string[]

Output:
  enhanced_prompt: string
```

### Algorithm

```python
def inject_authority_constraints(agent_id, base_prompt, active_agents):
    constraints = []
    
    # Step 1: Add agent's own authority
    own_domains = matrix.get_domains(agent_id)
    if own_domains:
        constraints.append(
            f"## Your Authority\\n\\n"
            f"You have EXCLUSIVE AUTHORITY over these domains:\\n"
            + "\\n".join(f"- {d}" for d in own_domains)
            + "\\n\\nWhen active, other agents defer to your judgment in these areas."
        )
    
    # Step 2: Add deference rules for other active agents
    for other_agent in active_agents:
        if other_agent == agent_id:
            continue

        other_domains = matrix.get_domains(other_agent)
        if other_domains:
            agent_name = matrix.get_name(other_agent)
            constraints.append(
                f"\\n## Deference Required\\n\\n"
                f"{agent_name} ({other_agent}) has exclusive authority over:\\n"
                + "\\n".join(f"- {d}" for d in other_domains)
                + "\\n\\nDO NOT critique or override their findings in these domains."
            )

    # Step 3: Mode-specific constraints
    if profile.read_only:
        constraints.append(
            "\n## Advisory Mode Active\n\n"
            "You are in ADVISORY mode. Analyze and suggest improvements "
            "but DO NOT modify any files. Present your suggestions as a "
            "structured list of proposed changes with rationale."
        )

    if profile.file_scope_restriction:
        constraints.append(
            "\n## Surgical Mode — File Scope Restriction\n\n"
            "You may ONLY modify files explicitly listed in this plan's "
            "`files_modified` field. Do not create, edit, or delete any other files. "
            "If a task requires touching unlisted files, stop and escalate."
        )

    if not profile.human_approval_required:
        # Omit the escalation protocol section from injected constraints
        pass  # Do not append the standard "Human Approval Required" block
    else:
        # Step 3b: Inject escalation format instructions
        # When human approval is required, agents must use structured <escalation> blocks
        # for any out-of-scope decisions. Format defined in escalation-protocol.yaml.
        escalation_instructions = (
            "\n## Escalation Protocol\n\n"
            "When you encounter a decision that falls outside your autonomous scope "
            "(architecture changes, unplanned dependencies, out-of-scope files, schema changes, "
            "API contract changes, deletions, infrastructure changes, or quality gate overrides), "
            "you MUST use a structured escalation block in your output.\n\n"
            "**Format** — wrap in `<escalation>` tags with these required fields:\n\n"
            "```\n"
            "<escalation>\n"
            "severity: info | warning | blocker\n"
            "type: architecture | dependency | scope | schema | api | deletion | infrastructure | quality\n"
            "decision: What decision is needed (one sentence)\n"
            "context: Why you encountered this (2-3 sentences)\n"
            "alternatives: What you would do if authorized (optional)\n"
            "affected_files: Files that would be modified (optional)\n"
            "</escalation>\n"
            "```\n\n"
            "**Severity guide:**\n"
            "- `info` — observation only, you can continue working\n"
            "- `warning` — notable concern, you continue but it will be highlighted\n"
            "- `blocker` — you MUST stop the blocked action and work on other in-scope tasks\n\n"
            "**Do not skip this.** Ad-hoc text descriptions of out-of-scope issues are not "
            "sufficient. The wave-executor parses `<escalation>` blocks for automated routing.\n\n"
            "Reference: `.planning/config/escalation-protocol.yaml`"
        )
        constraints.append(escalation_instructions)

    # Step 3c: Add control mode context line
    control_mode_name = profile.control_mode_name if hasattr(profile, 'control_mode_name') else "guarded"
    constraints.append(
        f"\n## Active Control Mode: {control_mode_name}\n\n"
        f"Escalation behavior follows the `{control_mode_name}` profile. "
        "See `.planning/config/escalation-protocol.yaml` for severity routing rules."
    )

    # Step 4: Combine with base prompt
    if constraints:
        enhanced = "\\n\\n".join(constraints) + "\\n\\n---\\n\\n" + base_prompt
    else:
        enhanced = base_prompt
    
    return enhanced
```

### Example Output

```markdown
## Your Authority

You have EXCLUSIVE AUTHORITY over these domains:
- security
- owasp
- vulnerability-assessment
- pentest

When active, other agents defer to your judgment in these areas.

## Deference Required

Backend Architect (engineering-backend-architect) has exclusive authority over:
- backend-architecture
- database-design
- api-design

DO NOT critique or override their findings in these domains.

---

[Original prompt content...]
```

---

## Section 4: Finding Filtering

Filter findings during review synthesis to remove out-of-domain critiques.

### Function: `filterFindings`

```yaml
Input:
  findings: Finding[]      # List of review findings
  active_agents: string[]  # Agents present in review panel

Output:
  filtered_findings: Finding[]
  removed_findings: Finding[]  # With reasons
```

### Finding Structure

```yaml
Finding:
  reviewer: string        # Agent ID who made the finding
  criterion: string       # What was checked
  severity: enum          # BLOCKER | WARNING | NOTE
  message: string         # Finding description
  domain: string          # Inferred domain (auto-detected)
```

### Algorithm

```python
def filter_findings(findings, active_agents):
    # Mode check: skip filtering if domain filtering is disabled
    if not profile.domain_filtering:
        return findings, []  # Return all findings, nothing removed

    filtered = []
    removed = []

    # Build domain ownership map from active agents
    domain_ownership = {}
    for agent in active_agents:
        for domain in matrix.get_domains(agent):
            domain_ownership[domain] = agent
    
    for finding in findings:
        # Step 1: Detect domain from criterion or message
        finding_domain = detect_domain(finding.criterion, finding.message)
        
        # Step 2: Check if domain has an owner in active agents
        if finding_domain in domain_ownership:
            owner = domain_ownership[finding_domain]
            
            # Step 3: Check if reviewer IS the owner
            if finding.reviewer == owner:
                filtered.append(finding)
            else:
                # Step 4: Check severity override rule
                if finding.severity == "BLOCKER":
                    # BLOCKER from any agent overrides domain ownership
                    filtered.append(finding)
                    finding.notes = (
                        f"[OVERRIDE] Out-of-domain BLOCKER kept per severity rule "
                        f"(domain owner: {owner})"
                    )
                else:
                    # Filter out non-BLOCKER findings from non-owners
                    removed.append({
                        **finding,
                        removal_reason: (
                            f"Out-of-domain critique filtered — "
                            f"{owner} is domain authority for '{finding_domain}'"
                        )
                    })
        else:
            # No owner for this domain, keep finding
            filtered.append(finding)
    
    return filtered, removed
```

### Domain Detection

```python
def detect_domain(criterion, message):
    """
    Detect domain from criterion text and message content.
    Uses keyword matching against authority matrix domains.
    """
    text = f"{criterion} {message}".lower()
    
    # Direct keyword matching
    domain_keywords = {
        "security": ["security", "vulnerability", "pentest", "owasp"],
        "performance": ["performance", "optimization", "latency", "throughput"],
        "accessibility": ["accessibility", "a11y", "wcag", "screen reader"],
        "api-design": ["api", "endpoint", "rest", "graphql"],
        # ... etc
    }
    
    scores = {}
    for domain, keywords in domain_keywords.items():
        score = sum(1 for kw in keywords if kw in text)
        if score > 0:
            scores[domain] = score
    
    # Return highest scoring domain, or "general" if none match
    if scores:
        return max(scores, key=scores.get)
    return "general"
```

---

## Section 5: Integration Points

### With Wave Executor

```yaml
Integration Point: Agent spawning
When: Before spawning agents for a wave
Action:
  1. Load authority matrix
  2. Build domain ownership map from selected agents
  3. For each agent:
     - Load personality file
     - Inject authority constraints via injectAuthorityConstraints()
     - Include escalation format instructions (from escalation-protocol.yaml)
     - Spawn with enhanced prompt
```

```yaml
Integration Point: Escalation detection
When: After agent completes a task (wave-executor Section 5.5)
Action:
  1. Wave-executor scans agent output for <escalation> blocks
  2. Validates escalation block format against escalation-protocol.yaml
  3. Routes by severity according to control mode behavior
  4. Records escalations in SUMMARY.md Escalations section
Reference: .planning/config/escalation-protocol.yaml
```

### With Review Panel

```yaml
Integration Point: Finding synthesis
When: After all reviewers submit findings
Action:
  1. Collect all findings from reviewers
  2. Get list of agents on review panel
  3. Call filterFindings() to remove out-of-domain critiques
  4. Log removed findings for transparency
  5. Synthesize remaining findings into final report
```

### With Agent Registry

```yaml
Integration Point: Team assembly
When: Building team for a task
Action:
  1. Query agent-registry for candidate agents
  2. Check for domain conflicts in proposed team
  3. Warn if multiple agents claim same exclusive domain
  4. Suggest resolution based on specificity hierarchy
```

---

## Section 6: Conflict Resolution

### Resolving Domain Conflicts

When two agents both claim authority over a topic:

```yaml
Resolution Steps:
  1. Check Specificity Hierarchy:
     - More specific domain beats general domain
     - Example: "laravel" beats "backend-architecture"
  
  2. Check Division Priority:
     - Testing-division overrides for verification topics
     - Engineering-division overrides for implementation topics
  
  3. Default to Explicit Assignment:
     - Use authority-matrix.yaml as source of truth
     - If still ambiguous, require human decision
```

### Logging and Transparency

```yaml
All authority decisions MUST be logged:
  - Timestamp
  - Active agents
  - Topic in question
  - Decision (authorized/deferred)
  - Domain owner (if applicable)
  - Reason

Log Location: `.planning/logs/authority-decisions-{date}.log`
```

---

## Section 7: Error Handling

### Common Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| Unknown agent in matrix | Agent ID typo or removed agent | Check agent-registry, update matrix |
| Duplicate domain assignment | Two agents claim same exclusive domain | Assign to more specific agent, mark other as secondary |
| Missing authority-matrix.yaml | File deleted or moved | Regenerate from template |
| Circular deference | Agent A defers to B, B defers to A | Fix deferred_by arrays in matrix |

### Validation Command

```bash
# Validate authority matrix integrity
node bin/gsd-tools.cjs validate-authority-matrix

# Output: ValidationReport with errors/warnings
```

---

## Section 8: Usage Example

### Complete Workflow

```javascript
// 1. Load authority matrix
const matrix = loadAuthorityMatrix('.planning/config/authority-matrix.yaml');
const validation = validateMatrix(matrix);
if (!validation.valid) {
    throw new Error(`Invalid matrix: ${validation.errors.join(', ')}`);
}

// 2. Build active agents list
const activeAgents = [
    'engineering-security-engineer',
    'engineering-backend-architect',
    'testing-reality-checker'
];

// 3. Inject constraints into prompts (with mode profile)
const modeProfile = resolvedSettings.modeProfile; // from workflow-common-core
for (const agentId of activeAgents) {
    const basePrompt = loadAgentPersonality(agentId);
    const enhancedPrompt = injectAuthorityConstraints(
        agentId,
        basePrompt,
        activeAgents,
        modeProfile  // NEW: pass resolved mode profile
    );
    // Spawn agent with enhancedPrompt
}

// 4. During review, filter findings
const findings = collectFindingsFromReviewers();
const { filtered, removed } = filterFindings(findings, activeAgents);

// 5. Log removed findings for transparency
logRemovedFindings(removed);

// 6. Synthesize final report from filtered findings
const report = synthesizeFindings(filtered);
```

---

## Section 9: Maintenance

### When to Update This Skill

1. **New agent added**: Update matrix loading, add domain mappings
2. **Agent domains changed**: Update validation logic
3. **New conflict pattern identified**: Add resolution rule
4. **Integration point changed**: Update Section 5

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-05 | Initial authority enforcer with boundary validation, prompt injection, and finding filtering |
| 1.1 | 2026-03-06 | Added Mode Profile Loading (Section 10) — control mode flag integration |

---

## Section 10: Mode Profile Loading

Receive the pre-resolved control mode profile from workflow-common-core's Settings Resolution Protocol. The profile is resolved ONCE at invocation start and passed to all authority-enforcer calls — the authority-enforcer does NOT read control-modes.yaml directly.

### Input

The resolved profile is a set of 5 boolean flags passed by the caller (wave-executor or review-panel):

| Flag | Type | Effect on Authority Enforcer |
|------|------|------------------------------|
| `authority_enforcement` | boolean | When false, skip Section 2 (Boundary Validation) entirely — all agents are authorized |
| `domain_filtering` | boolean | When false, skip Section 4 (Finding Filtering) — all findings are kept regardless of domain ownership |
| `human_approval_required` | boolean | When false, suppress escalation prompts in Section 3 (Prompt Injection) — agents do not remind about human approval |
| `file_scope_restriction` | boolean | When true, add file-scope constraint to Section 3 injected prompts — agents may ONLY modify files in plan `files_modified` |
| `read_only` | boolean | When true, add read-only constraint to Section 3 injected prompts — agents suggest but do not execute changes |

### Resolution Fallback

If no profile is provided (caller does not pass it), default to the `guarded` profile:
- `authority_enforcement: true`, `domain_filtering: true`, `human_approval_required: true`
- `file_scope_restriction: false`, `read_only: false`

This ensures backward compatibility — existing callers (including review-panel) that do not yet pass a profile get the same behavior as before.

### Flag Consumption Pattern

All earlier sections check flags before executing their logic:

Section 2 (Boundary Validation):
  if not profile.authority_enforcement: return { authorized: true, reason: "authority enforcement disabled by control mode" }

Section 3 (Prompt Injection):
  if profile.read_only: append "CONSTRAINT: You are in advisory mode. Suggest changes but do NOT modify any files."
  if profile.file_scope_restriction: append "CONSTRAINT: You may ONLY modify files listed in the plan's files_modified field."
  if not profile.human_approval_required: omit the escalation protocol reminder from injected constraints

Section 4 (Finding Filtering):
  if not profile.domain_filtering: return all findings unfiltered
