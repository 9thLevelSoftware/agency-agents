---
name: legion:intent-router
description: Parses intent flags, validates combinations, and routes to appropriate team templates — the semantic flag interpreter for /legion:build and /legion:review
triggers: [intent, flags, routing, validation, --just-, --skip-]
token_cost: low
summary: "Parses semantic intent flags like --just-harden and --skip-frontend, validates combinations against rules, resolves team templates from intent-teams.yaml. Enables semantic filtering for build and review commands."
---

# Intent Router

Interprets semantic intent flags (`--just-*` and `--skip-*`) to route execution to specific agent teams and filter criteria. Validates flag combinations, resolves templates from `intent-teams.yaml`, and produces execution instructions.

Used by `/legion:build` and `/legion:review` when intent flags are present.

---

## Section 1: Intent Flag Parsing

Extract and normalize intent flags from command arguments.

### parseIntentFlags(arguments)

```javascript
/**
 * Parse intent flags from command arguments
 * @param {string[]} args - Command arguments (e.g., ['--just-harden', '--skip-frontend'])
 * @returns {Object} Normalized intent configuration
 * 
 * Returns:
 * {
 *   rawFlags: ['--just-harden', '--skip-frontend'],
 *   intents: ['harden'],
 *   filters: {
 *     skipFrontend: true,
 *     skipBackend: false
 *   },
 *   primaryIntent: 'harden',
 *   hasConflicts: false
 * }
 */
```

**Supported Flags:**

| Flag | Intent | Description |
|------|--------|-------------|
| `--just-harden` | harden | Security audit mode |
| `--just-document` | document | Documentation-only mode |
| `--just-security` | security-only | Security review mode (review command only) |
| `--skip-frontend` | skip-frontend | Exclude frontend/UI tasks |
| `--skip-backend` | skip-backend | Exclude backend/API tasks |

**Parsing Rules:**

1. **Equals syntax supported**: `--just-harden=true` or `--just-harden`
2. **Multiple --just-* flags detected**: Flag as conflict (only one primary intent allowed)
3. **Case insensitive**: `--JUST-HARDEN` normalizes to `--just-harden`
4. **Unknown flags**: Log warning but don't fail (forward compatibility)
5. **Duplicate flags**: Deduplicate, use first occurrence

**Implementation:**

```javascript
function parseIntentFlags(args) {
  const result = {
    rawFlags: [],
    intents: [],
    filters: {
      skipFrontend: false,
      skipBackend: false
    },
    primaryIntent: null,
    hasConflicts: false
  };

  const seenFlags = new Set();
  
  for (const arg of args) {
    const flag = arg.toLowerCase().split('=')[0];
    
    if (seenFlags.has(flag)) continue;
    seenFlags.add(flag);
    
    switch (flag) {
      case '--just-harden':
        result.rawFlags.push(flag);
        result.intents.push('harden');
        result.primaryIntent = 'harden';
        break;
      case '--just-document':
        result.rawFlags.push(flag);
        result.intents.push('document');
        result.primaryIntent = 'document';
        break;
      case '--just-security':
        result.rawFlags.push(flag);
        result.intents.push('security-only');
        result.primaryIntent = 'security-only';
        break;
      case '--skip-frontend':
        result.rawFlags.push(flag);
        result.filters.skipFrontend = true;
        break;
      case '--skip-backend':
        result.rawFlags.push(flag);
        result.filters.skipBackend = true;
        break;
      default:
        if (flag.startsWith('--just-') || flag.startsWith('--skip-')) {
          console.warn(`Unknown intent flag: ${arg}`);
        }
    }
  }
  
  // Detect conflicts
  if (result.intents.length > 1) {
    result.hasConflicts = true;
  }
  
  return result;
}
```

---

## Section 2: Validation Engine

Validate flag combinations against rules from `intent-teams.yaml`.

### validateFlagCombination(intents, command)

```javascript
/**
 * Validate intent flags against combination rules
 * @param {Object} intents - Output from parseIntentFlags()
 * @param {string} command - Command context ('build', 'review', 'plan', etc.)
 * @returns {Object} Validation result with errors and suggestions
 * 
 * Returns:
 * {
 *   valid: false,
 *   errors: ['Cannot use --just-harden and --just-document together'],
 *   suggestions: ['Use --just-harden alone for security audit']
 * }
 */
```

**Validation Rules (from intent-teams.yaml):**

1. **Mutual Exclusion**: Certain flags cannot be combined
2. **Command Context**: Some flags only valid for specific commands
3. **Redundancy Detection**: Flag combinations that make no sense
4. **Empty Result Detection**: Flags that would result in no work

**Implementation:**

```javascript
function validateFlagCombination(intents, command) {
  const errors = [];
  const suggestions = [];
  
  // Load validation rules from intent-teams.yaml
  const rules = loadValidationRules();
  
  // Check mutual exclusion
  for (const rule of rules.mutual_exclusion) {
    const hasAllFlags = rule.flags.every(flag => 
      intents.intents.includes(flag) || 
      (flag === 'skip-frontend' && intents.filters.skipFrontend) ||
      (flag === 'skip-backend' && intents.filters.skipBackend)
    );
    
    if (hasAllFlags) {
      errors.push(rule.error);
      if (rule.flags.length === 2) {
        suggestions.push(`Use only --${rule.flags[0].replace('_', '-')} for this operation`);
      }
    }
  }
  
  // Check command context
  for (const rule of rules.requires_command) {
    if (intents.intents.includes(rule.flag)) {
      if (!rule.commands.includes(command)) {
        errors.push(`${rule.error} (used with ${command})`);
        if (rule.commands.length === 1) {
          suggestions.push(`Use /legion:${rule.commands[0]} instead`);
        }
      }
    }
  }
  
  // Check skip-frontend + skip-backend = nothing to build
  if (intents.filters.skipFrontend && intents.filters.skipBackend) {
    errors.push('Cannot skip both frontend and backend — nothing to build.');
    suggestions.push('Remove one skip flag to proceed');
  }
  
  // Check document + skip-frontend redundancy
  if (intents.intents.includes('document') && intents.filters.skipFrontend) {
    errors.push('--just-document already excludes implementation; --skip-frontend is redundant.');
    suggestions.push('Use --just-document alone');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    suggestions
  };
}
```

### Error Message Format

```
❌ Intent Validation Failed

Errors:
1. Cannot use --just-harden and --just-document together. Choose one intent.
2. --just-harden is only valid for /legion:build (used with review)

Suggestions:
- Use only --just-harden for this operation
- Use /legion:build instead
```

---

## Section 3: Team Template Resolution

Load and resolve team templates from `intent-teams.yaml`.

### loadIntentTeams()

```javascript
/**
 * Load and cache intent-teams.yaml configuration
 * @returns {Object} Parsed configuration with intents and validation rules
 */
function loadIntentTeams() {
  const configPath = '.planning/config/intent-teams.yaml';
  const content = fs.readFileSync(configPath, 'utf8');
  return parseYaml(content);
}
```

### resolveTeamTemplate(intentName)

```javascript
/**
 * Resolve team template for an intent
 * @param {string} intentName - Intent name (e.g., 'harden', 'document')
 * @returns {Object} Team configuration
 * 
 * Returns:
 * {
 *   intent: 'harden',
 *   description: 'Security audit with Testing + Security divisions',
 *   mode: 'ad_hoc',
 *   agents: {
 *     primary: ['testing-reality-checker', 'engineering-security-engineer'],
 *     secondary: ['testing-api-tester', 'testing-evidence-collector']
 *   },
 *   domains: ['security', 'owasp', 'stride', 'vulnerability-assessment']
 * }
 */
function resolveTeamTemplate(intentName) {
  const config = loadIntentTeams();
  const intent = config.intents[intentName];
  
  if (!intent) {
    throw new Error(`Unknown intent: ${intentName}`);
  }
  
  return {
    intent: intentName,
    description: intent.description,
    mode: intent.mode,
    agents: intent.agents || { primary: [], secondary: [] },
    domains: intent.domains || [],
    filters: intent.filter || null
  };
}
```

### resolveFilterCriteria(intentName)

```javascript
/**
 * Get filter predicates for filter_plans or filter_review mode
 * @param {string} intentName - Intent name
 * @returns {Object} Filter configuration
 * 
 * Returns:
 * {
 *   includeTaskTypes: ['security-audit', 'vulnerability-scan'],
 *   excludeTaskTypes: ['feature-implementation'],
 *   excludeAgents: ['engineering-frontend-developer'],
 *   excludeFilePatterns: ['*.tsx', 'src/frontend/**']
 * }
 */
function resolveFilterCriteria(intentName) {
  const config = loadIntentTeams();
  const intent = config.intents[intentName];
  
  if (!intent || !intent.filter) {
    return null;
  }
  
  return {
    includeTaskTypes: intent.filter.include_task_types || [],
    excludeTaskTypes: intent.filter.exclude_task_types || [],
    excludeAgents: intent.filter.exclude_agents || [],
    excludeFilePatterns: intent.filter.exclude_file_patterns || []
  };
}
```

### mapDomainsToAgents(domains)

```javascript
/**
 * Map intent domains to agents via authority matrix
 * @param {string[]} domains - List of domains from intent
 * @returns {Object} Domain to agent mapping
 * 
 * Returns:
 * {
 *   'security': 'engineering-security-engineer',
 *   'owasp': 'engineering-security-engineer',
 *   'api-testing': 'testing-api-tester'
 * }
 */
function mapDomainsToAgents(domains) {
  const authorityMatrix = loadAuthorityMatrix();
  const mapping = {};
  
  for (const domain of domains) {
    for (const [agentId, agentData] of Object.entries(authorityMatrix.agents)) {
      if (agentData.exclusive_domains?.includes(domain)) {
        mapping[domain] = agentId;
        break;
      }
    }
  }
  
  return mapping;
}
```

---

## Section 4: Execution Mode Detection

Determine execution strategy based on intent configuration.

### detectExecutionMode(intent)

```javascript
/**
 * Detect execution mode from intent configuration
 * @param {Object} intent - Intent configuration from resolveTeamTemplate()
 * @returns {string} Mode: 'ad_hoc' | 'filter_plans' | 'filter_review'
 * 
 * Modes:
 * - ad_hoc: Spawn agents dynamically for the intent
 * - filter_plans: Filter existing plans by task type/file patterns
 * - filter_review: Filter review findings by domain/severity
 */
function detectExecutionMode(intent) {
  return intent.mode || 'ad_hoc';
}
```

### getExecutionInstructions(mode)

```javascript
/**
 * Get specific execution steps for a mode
 * @param {string} mode - Execution mode
 * @returns {Object} Execution instructions
 */
function getExecutionInstructions(mode) {
  const instructions = {
    ad_hoc: {
      description: 'Spawn intent-specific team dynamically',
      steps: [
        'Resolve team template from intent-teams.yaml',
        'Load primary and secondary agent personalities',
        'Spawn agents in parallel with intent context',
        'Collect results and synthesize output',
        'Generate intent-specific summary report'
      ],
      parallel: true,
      agentCount: 'from template'
    },
    
    filter_plans: {
      description: 'Filter phase plans by intent criteria',
      steps: [
        'Load all plans for current phase',
        'Apply task type filters from intent',
        'Apply file pattern exclusions',
        'Remove plans matching exclude criteria',
        'Execute remaining plans with standard wave executor'
      ],
      parallel: false,  // Uses wave executor
      agentCount: 'from filtered plans'
    },
    
    filter_review: {
      description: 'Filter review findings by intent domains',
      steps: [
        'Execute standard review process',
        'Collect all findings from reviewers',
        'Filter findings to intent domains only',
        'Apply severity threshold if specified',
        'Generate filtered review report'
      ],
      parallel: false,  // Uses review-loop
      agentCount: 'standard review panel'
    }
  };
  
  return instructions[mode] || instructions.ad_hoc;
}
```

---

## Section 5: Filter Predicates

Create reusable filter functions for plan and review filtering.

### createAgentFilter(excludeAgents)

```javascript
/**
 * Create filter predicate for agents
 * @param {string[]} excludeAgents - Agent IDs to exclude
 * @returns {Function} Filter function (agentId) => boolean
 */
function createAgentFilter(excludeAgents) {
  const excludeSet = new Set(excludeAgents);
  return (agentId) => !excludeSet.has(agentId);
}
```

### createFileFilter(patterns)

```javascript
/**
 * Create filter predicate for file paths
 * @param {string[]} patterns - Glob patterns to match
 * @returns {Function} Filter function (filePath) => boolean
 * 
 * Supports:
 * - Exact match: "file.ts"
 * - Wildcards: "*.tsx"
 * - Directory: "src/frontend/**"
 * - Negation: "!src/backend/**" (if starts with !)
 */
function createFileFilter(patterns) {
  const minimatch = require('minimatch');  // Or implement simple glob matching
  
  return (filePath) => {
    for (const pattern of patterns) {
      const isNegation = pattern.startsWith('!');
      const actualPattern = isNegation ? pattern.slice(1) : pattern;
      const matches = minimatch(filePath, actualPattern);
      
      if (matches && !isNegation) return false;  // Exclude
      if (matches && isNegation) return true;    // Include (negated exclusion)
    }
    return true;  // Not excluded
  };
}

// Simple glob implementation if minimatch unavailable
function simpleGlobMatch(path, pattern) {
  const regex = pattern
    .replace(/\*\*/g, '<<<DOUBLESTAR>>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<<DOUBLESTAR>>>/g, '.*');
  
  return new RegExp(`^${regex}$`).test(path);
}
```

### createTaskFilter(includeTypes, excludeTypes)

```javascript
/**
 * Create filter predicate for task types
 * @param {string[]} includeTypes - Task types to include (empty = all)
 * @param {string[]} excludeTypes - Task types to exclude
 * @returns {Function} Filter function (taskType) => boolean
 */
function createTaskFilter(includeTypes, excludeTypes) {
  const includeSet = new Set(includeTypes);
  const excludeSet = new Set(excludeTypes);
  
  return (taskType) => {
    // If include list specified, must be in it
    if (includeTypes.length > 0 && !includeSet.has(taskType)) {
      return false;
    }
    // Must not be in exclude list
    if (excludeSet.has(taskType)) {
      return false;
    }
    return true;
  };
}
```

### combineFilters(filters)

```javascript
/**
 * Combine multiple filter predicates with AND logic
 * @param {Function[]} filters - Array of filter functions
 * @returns {Function} Combined filter (item) => boolean
 * 
 * All filters must return true for item to pass
 */
function combineFilters(filters) {
  return (item) => filters.every(filter => filter(item));
}

// Example usage:
const filters = [
  createAgentFilter(['engineering-frontend-developer']),
  createTaskFilter(['security-audit'], ['feature-implementation']),
  createFileFilter(['!src/frontend/**'])
];

const combined = combineFilters(filters);
const passes = combined({ agent: 'testing-api-tester', taskType: 'security-audit', file: 'src/api/auth.ts' });
// passes = true
```

---

## Section 6: Integration Guide

How to use intent-router in commands.

### In commands/build.md

```javascript
// At start of build command
const { parseIntentFlags, validateFlagCombination, resolveTeamTemplate, detectExecutionMode } = 
  require('./skills/intent-router');

function buildCommand(args) {
  // 1. Parse intent flags
  const intents = parseIntentFlags(args);
  
  // 2. Validate if flags present
  if (intents.rawFlags.length > 0) {
    const validation = validateFlagCombination(intents, 'build');
    
    if (!validation.valid) {
      console.error('❌ Intent Validation Failed\n');
      validation.errors.forEach((err, i) => console.error(`${i + 1}. ${err}`));
      console.error('\nSuggestions:');
      validation.suggestions.forEach(s => console.error(`- ${s}`));
      process.exit(1);
    }
    
    // 3. Resolve team template
    const template = resolveTeamTemplate(intents.primaryIntent);
    const mode = detectExecutionMode(template);
    
    // 4. Execute based on mode
    if (mode === 'ad_hoc') {
      // Spawn intent-specific team
      return executeAdHocTeam(template);
    } else if (mode === 'filter_plans') {
      // Filter plans and execute subset
      const filteredPlans = filterPlansByIntent(template);
      return executeFilteredPlans(filteredPlans);
    }
  }
  
  // No intent flags - standard build
  return standardBuild(args);
}
```

### In commands/review.md

```javascript
// For --just-security and other review-specific intents
const { parseIntentFlags, validateFlagCombination, resolveTeamTemplate } = 
  require('./skills/intent-router');

function reviewCommand(args) {
  const intents = parseIntentFlags(args);
  
  if (intents.intents.includes('security-only')) {
    const validation = validateFlagCombination(intents, 'review');
    
    if (!validation.valid) {
      reportValidationErrors(validation);
      return;
    }
    
    // Security-only review
    const template = resolveTeamTemplate('security-only');
    
    // Execute review with domain filtering
    return executeSecurityReview(template);
  }
  
  // Standard review
  return standardReview(args);
}
```

### Error Handling Pattern

```javascript
function handleIntentErrors(validation) {
  if (!validation.valid) {
    // Format user-friendly error
    const output = [
      '❌ Intent Validation Failed',
      '',
      'Errors:'
    ];
    
    validation.errors.forEach((err, i) => {
      output.push(`${i + 1}. ${err}`);
    });
    
    if (validation.suggestions.length > 0) {
      output.push('', 'Suggestions:');
      validation.suggestions.forEach(s => {
        output.push(`- ${s}`);
      });
    }
    
    console.error(output.join('\n'));
    
    // Exit with error code
    process.exit(1);
  }
}
```

### Command-Line Usage Examples

```bash
# Security audit build
/legion:build --just-harden

# Documentation generation
/legion:build --just-document

# Backend-only build
/legion:build --skip-frontend

# Security review only
/legion:review --just-security

# Invalid combination (will error)
/legion:build --just-harden --just-document
```

---

## Section 7: Natural Language Intent Parsing

Parse free-text user input into structured command+flags with confidence scoring. Enables users to type natural language queries (e.g., "fix the tests", "harden security", "write the docs") instead of memorizing exact `--just-*` and `--skip-*` flag names.

### 7.1 parseNaturalLanguage(input)

```javascript
/**
 * Parse natural language input into a command route with confidence scoring
 * @param {string} input - Raw user text (e.g., "fix the tests", "harden security")
 * @returns {Object} { command, flags, confidence, fallbackSuggestion }
 *
 * confidence levels:
 * - HIGH (>= 0.8): auto-route to command
 * - MEDIUM (0.5-0.79): suggest command, ask user to confirm
 * - LOW (< 0.5): show top 3 suggestions, ask user to pick
 */
function parseNaturalLanguage(input) {
  const normalizedInput = input.toLowerCase().trim();

  // Load NL patterns from intent-teams.yaml
  const { nlPatterns, commandRoutes } = loadNLPatterns();

  // Score all candidates (intent flags + direct command routes)
  const candidates = [];

  // Score intent flag patterns (e.g., harden → --just-harden)
  for (const [intentName, patterns] of Object.entries(nlPatterns)) {
    const score = scoreCandidate(normalizedInput, patterns);
    if (score > 0) {
      const intentToFlag = {
        'harden': { command: '/legion:build', flags: ['--just-harden'] },
        'document': { command: '/legion:build', flags: ['--just-document'] },
        'skip-frontend': { command: '/legion:build', flags: ['--skip-frontend'] },
        'skip-backend': { command: '/legion:build', flags: ['--skip-backend'] },
        'security-only': { command: '/legion:review', flags: ['--just-security'] }
      };
      const route = intentToFlag[intentName] || { command: null, flags: [] };
      candidates.push({
        command: route.command,
        flags: route.flags,
        confidence: score,
        label: `${route.command} ${route.flags.join(' ')}`.trim()
      });
    }
  }

  // Score direct command routes (e.g., "build it" → /legion:build)
  for (const [commandName, patterns] of Object.entries(commandRoutes)) {
    const score = scoreCandidate(normalizedInput, patterns);
    if (score > 0) {
      candidates.push({
        command: `/legion:${commandName}`,
        flags: [],
        confidence: score,
        label: `/legion:${commandName}`
      });
    }
  }

  // Sort by confidence descending
  candidates.sort((a, b) => b.confidence - a.confidence);

  if (candidates.length === 0) {
    return {
      command: null,
      flags: [],
      confidence: 0,
      fallbackSuggestion: 'No matching command found. Try /legion:status for available commands.'
    };
  }

  const best = candidates[0];

  // HIGH confidence: auto-route
  if (best.confidence >= 0.8) {
    return {
      command: best.command,
      flags: best.flags,
      confidence: best.confidence,
      fallbackSuggestion: null
    };
  }

  // MEDIUM confidence: suggest with confirmation
  if (best.confidence >= 0.5) {
    return {
      command: best.command,
      flags: best.flags,
      confidence: best.confidence,
      fallbackSuggestion: best.label
    };
  }

  // LOW confidence: top 3 suggestions
  const top3 = candidates.slice(0, 3).map((c, i) => `${i + 1}. ${c.label}`).join('  ');
  return {
    command: null,
    flags: [],
    confidence: best.confidence,
    fallbackSuggestion: `Did you mean: ${top3}`
  };
}
```

---

### 7.2 Pattern Matching Strategy

Two-tier matching system for balancing speed and accuracy:

**Tier 1: Keyword Cluster Matching** (fast, pattern-based)
- Each intent/command has a set of weighted keywords (word to weight, 0.0-1.0)
- Tokenize user input into words
- Score = sum of matched keyword weights / total possible weight for that cluster
- Fast O(n*m) lookup, good for single-word or multi-word queries

**Tier 2: Phrase Template Matching** (structured, higher confidence)
- Regex-like templates for common expressions
- Templates use `{option1|option2}` syntax for alternation and `{word}?` for optional words
- Example: `"fix {the|my|our} {tests|testing|test suite}"` matches "fix the tests", "fix my testing"
- Template match provides a confidence bonus

**Scoring Formula:**
```
final_score = keyword_score * 0.6 + template_match_bonus + exact_name_bonus

Where:
  keyword_score  = (sum of matched keyword weights) / (sum of all keyword weights)  [0-1]
  template_match = 0.3 if any phrase template matches, 0 otherwise
  exact_name     = 0.1 if input contains the exact command name (e.g., "build", "review"), 0 otherwise
```

```javascript
/**
 * Score a candidate command/intent against user input
 * @param {string} input - Normalized user input (lowercase, trimmed)
 * @param {Object} patterns - { keywords: {word: weight}, phrases: [template strings] }
 * @returns {number} Confidence score 0.0-1.0
 */
function scoreCandidate(input, patterns) {
  const inputTokens = input.split(/\s+/);

  // Tier 1: Keyword cluster score
  let matchedWeight = 0;
  let totalWeight = 0;

  for (const [keyword, weight] of Object.entries(patterns.keywords)) {
    totalWeight += weight;
    // Check if keyword appears in input (supports multi-word keywords)
    if (input.includes(keyword)) {
      matchedWeight += weight;
    }
  }

  const keywordScore = totalWeight > 0 ? matchedWeight / totalWeight : 0;

  // Tier 2: Phrase template matching
  let templateBonus = 0;

  if (patterns.phrases && patterns.phrases.length > 0) {
    for (const phrase of patterns.phrases) {
      const regex = phraseToRegex(phrase);
      if (regex.test(input)) {
        templateBonus = 0.3;
        break;  // One match is enough for the bonus
      }
    }
  }

  // Exact command name bonus
  let exactNameBonus = 0;
  // Extract command name from pattern context (first keyword with weight 1.0)
  const primaryKeyword = Object.entries(patterns.keywords)
    .find(([_, weight]) => weight >= 1.0);

  if (primaryKeyword && inputTokens.includes(primaryKeyword[0])) {
    exactNameBonus = 0.1;
  }

  // Final score (capped at 1.0)
  return Math.min(1.0, keywordScore * 0.6 + templateBonus + exactNameBonus);
}

/**
 * Convert phrase template to regex
 * @param {string} phrase - Template like "fix {the|my|our} {tests|testing}"
 * @returns {RegExp} Compiled regex
 *
 * Syntax:
 *   {a|b|c}  → matches "a", "b", or "c"
 *   {word}?  → optional group (matches "word" or nothing)
 *   \\d+     → digit sequence (passed through to regex)
 */
function phraseToRegex(phrase) {
  let pattern = phrase
    // Handle optional groups: {word}? → (?:word\s*)?
    .replace(/\{([^}]+)\}\?/g, '(?:$1\\s*)?')
    // Handle alternation groups: {a|b|c} → (?:a|b|c)
    .replace(/\{([^}]+)\}/g, '(?:$1)')
    // Normalize whitespace to flexible matching
    .replace(/\s+/g, '\\s+');

  return new RegExp(pattern, 'i');
}
```

---

### 7.3 Command Route Mapping

Natural language phrases mapped to Legion commands. Intent flags are matched via `nl_patterns` in `intent-teams.yaml`; direct command routes are matched via `command_routes`.

| Pattern Category | Example Phrases | Routes To |
|-----------------|-----------------|-----------|
| Start/initialize | "start a new project", "initialize", "set up" | `/legion:start` |
| Plan/decompose | "plan the next phase", "break down phase 3" | `/legion:plan` |
| Build/execute | "build it", "execute the plans", "run the build" | `/legion:build` |
| Review/test | "review the code", "run tests", "check quality" | `/legion:review` |
| Status/progress | "show progress", "where are we", "what's next" | `/legion:status` |
| Quick task | "quick fix", "run a one-off task" | `/legion:quick` |
| Advise/consult | "get advice on", "ask about", "consult on" | `/legion:advise` |
| Explore/research | "explore options", "research", "crystallize" | `/legion:explore` |
| Harden | "harden security", "security audit", "fix vulnerabilities" | `/legion:build --just-harden` |
| Document | "write docs", "generate documentation" | `/legion:build --just-document` |

**Cross-command detection**: When NL parsing within one command (e.g., `/legion:build`) matches a different command (e.g., `/legion:review`), the system suggests the correct command rather than silently redirecting:
```
You ran /legion:build, but your input "review the code" matches /legion:review.
Did you mean to run /legion:review instead?
```

---

### 7.4 Confidence Thresholds and Fallback

Three confidence tiers determine routing behavior:

| Level | Range | Behavior | Return Shape |
|-------|-------|----------|-------------|
| HIGH | >= 0.8 | Auto-route to matched command | `{ command, flags, confidence, fallbackSuggestion: null }` |
| MEDIUM | 0.5 - 0.79 | Suggest command, ask user to confirm | `{ command, flags, confidence, fallbackSuggestion: "<matched command>" }` |
| LOW | < 0.5 | Show top 3 suggestions, ask user to pick | `{ command: null, flags: [], confidence, fallbackSuggestion: "Did you mean: 1. ... 2. ... 3. ..." }` |

**Caller behavior by confidence level:**

```javascript
function handleNLResult(result, currentCommand) {
  if (result.confidence >= 0.8) {
    // HIGH: auto-route
    if (result.command !== currentCommand) {
      // Cross-command: suggest instead of redirect
      console.log(`Your input matches ${result.command}. Did you mean to run that instead?`);
      return;
    }
    // Same command: proceed with parsed flags
    return executeWithFlags(result.flags);
  }

  if (result.confidence >= 0.5) {
    // MEDIUM: confirm with user
    const confirmed = adapter.ask_user(
      `Did you mean: ${result.fallbackSuggestion}?`,
      ['Yes, proceed', 'No, show other options', 'Cancel']
    );
    if (confirmed === 'Yes, proceed') {
      return executeWithFlags(result.flags);
    }
  }

  // LOW: show suggestions
  console.log(result.fallbackSuggestion);
  // Let user pick or type a different command
}
```

**Edge cases:**
- Empty input: return `{ command: null, flags: [], confidence: 0, fallbackSuggestion: null }` (no-op)
- Input is an exact flag (e.g., "--just-harden"): defer to `parseIntentFlags()` in Section 1 (NL parsing is only for non-flag text)
- Multiple high-confidence matches with equal scores: prefer intent-flag matches over command routes (more specific)

---

### 7.5 loadNLPatterns()

Load natural language patterns from the `nl_patterns` and `command_routes` sections of `intent-teams.yaml`.

```javascript
/**
 * Load and cache NL patterns from intent-teams.yaml
 * @returns {Object} { nlPatterns, commandRoutes }
 *
 * nlPatterns: { intentName: { keywords: {word: weight}, phrases: [templates] } }
 * commandRoutes: { commandName: { keywords: {word: weight}, phrases: [templates] } }
 */
function loadNLPatterns() {
  const config = loadIntentTeams();  // Reuses Section 3 loader

  return {
    nlPatterns: config.nl_patterns || {},
    commandRoutes: config.command_routes || {}
  };
}
```

**Caching**: `loadNLPatterns()` uses the same `loadIntentTeams()` function from Section 3, which reads and parses `intent-teams.yaml` once per session. No additional file I/O is needed if the config is already loaded.

**Graceful degradation**: If `nl_patterns` or `command_routes` sections are missing from the config file (e.g., older version of `intent-teams.yaml`), the function returns empty objects and `parseNaturalLanguage()` will return a LOW confidence result with no suggestions. The system falls back to standard flag parsing via Section 1.

---

## Section 8: Context-Aware Suggestions

Detect project lifecycle position from STATE.md and return ranked next-action suggestions. Used by `/legion:status` to show proactive recommendations, and by the NL parser (Section 7) to augment low-confidence fallbacks.

---

### 8.1 getContextSuggestions(statePath)

```javascript
/**
 * Read project state and return context-aware action suggestions
 * @param {string} statePath - Path to STATE.md (default: '.planning/STATE.md')
 * @returns {Object} {
 *   currentPosition: { phase, status, lastActivity },
 *   suggestions: [
 *     { command: '/legion:build', description: 'Execute Phase 5 plans', priority: 1, reason: 'Phase 5 is planned but not yet built' },
 *     { command: '/legion:status', description: 'Check progress dashboard', priority: 2, reason: 'Good starting point for session orientation' }
 *   ],
 *   rawState: { ... }
 * }
 */
function getContextSuggestions(statePath = '.planning/STATE.md') {
  try {
    // 1. Read and parse STATE.md
    const stateData = parseStateMd(statePath);

    // 2. Detect lifecycle position
    const position = detectLifecyclePosition(stateData);

    // 3. Map position to suggestions (from intent-teams.yaml context_rules)
    const suggestions = mapPositionToSuggestions(position, stateData);

    return {
      currentPosition: {
        phase: stateData.phase || null,
        status: stateData.status || 'unknown',
        lastActivity: stateData.lastActivity || null
      },
      suggestions,
      rawState: stateData
    };
  } catch (error) {
    // Graceful degradation — never throw
    return {
      currentPosition: { phase: null, status: 'unknown', lastActivity: null },
      suggestions: [
        { command: '/legion:start', description: 'Initialize a new project', priority: 1, reason: 'Unable to read project state' },
        { command: '/legion:status', description: 'Check project status', priority: 2, reason: 'Retry after resolving state issues' }
      ],
      rawState: {}
    };
  }
}
```

### parseStateMd(statePath)

```javascript
/**
 * Parse STATE.md into structured data
 * @param {string} statePath - Path to STATE.md
 * @returns {Object} { phase, totalPhases, status, lastActivity, nextAction, phaseName }
 */
function parseStateMd(statePath) {
  if (!fs.existsSync(statePath)) {
    return { exists: false };
  }

  const content = fs.readFileSync(statePath, 'utf8');
  const lines = content.split('\n');

  const result = { exists: true };

  for (const line of lines) {
    // Extract "Phase: N of M"
    const phaseMatch = line.match(/Phase:\s*(\d+)\s*of\s*(\d+)/i);
    if (phaseMatch) {
      result.phase = parseInt(phaseMatch[1], 10);
      result.totalPhases = parseInt(phaseMatch[2], 10);
    }

    // Extract "Status: <value>"
    const statusMatch = line.match(/^Status:\s*(.+)/i);
    if (statusMatch) {
      result.status = statusMatch[1].trim().toLowerCase();
    }

    // Extract "Last Activity: <value>"
    const activityMatch = line.match(/^Last Activity:\s*(.+)/i);
    if (activityMatch) {
      result.lastActivity = activityMatch[1].trim();
    }

    // Extract "Next Action: <value>"
    const nextMatch = line.match(/^Next Action:\s*(.+)/i);
    if (nextMatch) {
      result.nextAction = nextMatch[1].trim();
    }
  }

  return result;
}
```

---

### 8.2 Project Lifecycle Position Detection

Parse STATE.md to determine where the project sits in its lifecycle. The position drives which suggestions are shown.

```javascript
/**
 * Detect project lifecycle position from parsed state data
 * @param {Object} stateData - Output from parseStateMd()
 * @returns {string} Lifecycle position identifier
 */
function detectLifecyclePosition(stateData) {
  // No STATE.md or empty
  if (!stateData.exists) {
    return 'no_project';
  }

  const status = (stateData.status || '').toLowerCase();
  const phase = stateData.phase || 0;
  const totalPhases = stateData.totalPhases || 0;

  // Just initialized
  if (phase === 1 && status.includes('initialized')) {
    return 'just_started';
  }

  // All phases complete
  if (phase === totalPhases && status.includes('complete')) {
    return 'milestone_complete';
  }

  // Build in progress
  if (status.includes('executing') || status.includes('in progress')) {
    return 'building';
  }

  // Plans exist, not yet built
  if (status.includes('planned')) {
    return 'planned_not_built';
  }

  // Build done, needs review
  if (status.includes('built') || status.includes('executed')) {
    return 'needs_review';
  }

  // Review active
  if (status.includes('reviewing')) {
    return 'review_in_progress';
  }

  // Review found issues
  if (status.includes('needs work') || status.includes('rework')) {
    return 'review_failed';
  }

  // Phase complete, more phases remain
  if (status.includes('complete') && phase < totalPhases) {
    return 'phase_complete';
  }

  // Phase complete and next phase not yet planned
  if (status.includes('complete')) {
    return 'needs_planning';
  }

  // Fallback
  return 'unknown';
}
```

**Lifecycle Position Reference:**

| Position | Detection Rule | Description |
|----------|---------------|-------------|
| `no_project` | No STATE.md or no phase info | Project not initialized |
| `just_started` | Phase 1, status contains "initialized" | Just ran /legion:start |
| `needs_planning` | Current phase status = "complete" and next phase not planned | Ready for next phase planning |
| `planned_not_built` | Current phase status contains "planned" | Plans exist, need execution |
| `building` | Current phase status contains "executing" or "in progress" | Build in progress |
| `needs_review` | Current phase status contains "built" or "executed" | Build done, needs review |
| `review_in_progress` | Current phase status contains "reviewing" | Review cycle active |
| `review_failed` | Current phase status contains "needs work" or "rework" | Review found issues |
| `phase_complete` | Current phase status = "complete", not last phase | Phase done, next phase available |
| `milestone_complete` | All phases complete | Ready for milestone wrap-up |

---

### 8.3 Position-to-Suggestion Mapping

Map each lifecycle position to 2-3 ranked action suggestions. Suggestions are loaded from the `context_rules` section of `intent-teams.yaml` and interpolated with runtime state data.

```javascript
/**
 * Load context rules from intent-teams.yaml and map position to suggestions
 * @param {string} position - Lifecycle position from detectLifecyclePosition()
 * @param {Object} stateData - Parsed STATE.md data for interpolation
 * @returns {Array} Ranked suggestion objects
 */
function mapPositionToSuggestions(position, stateData) {
  const rules = loadContextRules();
  const positionRules = rules[position];

  // Unknown position or missing rules — return safe defaults
  if (!positionRules || !positionRules.suggestions) {
    return [
      { command: '/legion:status', description: 'Check project status', priority: 1, reason: 'Default orientation action' },
      { command: '/legion:start', description: 'Initialize a project', priority: 2, reason: 'Start here if no project exists' }
    ];
  }

  return positionRules.suggestions.map((suggestion, index) => ({
    command: suggestion.command,
    description: interpolate(suggestion.description, stateData),
    priority: index + 1,
    reason: interpolate(suggestion.reason, stateData)
  }));
}

/**
 * Load context_rules from intent-teams.yaml
 * @returns {Object} Position-to-suggestions mapping
 */
function loadContextRules() {
  const config = loadIntentTeams();  // Reuses Section 3 loader
  return config.context_rules || {};
}

/**
 * Interpolate template strings with state data
 * @param {string} template - String with {phase}, {phase_name}, {next_phase} placeholders
 * @param {Object} stateData - Data for interpolation
 * @returns {string} Interpolated string
 *
 * Supported placeholders:
 *   {phase}      — Current phase number
 *   {phase_name} — Current phase name (from ROADMAP.md)
 *   {next_phase} — Next phase number (phase + 1)
 */
function interpolate(template, stateData) {
  if (!template) return '';

  return template
    .replace(/\{phase\}/g, stateData.phase || '?')
    .replace(/\{phase_name\}/g, stateData.phaseName || 'current phase')
    .replace(/\{next_phase\}/g, (stateData.phase || 0) + 1);
}
```

---

### 8.4 Graceful Degradation

Context-aware suggestions must never cause errors or block the status dashboard. The system degrades through multiple levels:

| Failure Mode | Behavior | Result |
|-------------|----------|--------|
| STATE.md does not exist | Return `position: 'no_project'` | Suggests `/legion:start` |
| STATE.md is malformed (no parseable fields) | Return `position: 'unknown'` | Generic safe defaults |
| intent-teams.yaml missing `context_rules` | Use hardcoded fallback suggestions | `/legion:status` + `/legion:start` |
| Position detected but no matching rule | Use default suggestions | `/legion:status` + `/legion:start` |
| Any unexpected error | Catch in `getContextSuggestions()` | Return valid empty-state response |

**Key invariant**: `getContextSuggestions()` always returns a valid object with a non-empty `suggestions` array. Callers never need to null-check the response.

```javascript
// Fallback behavior demonstration
const result = getContextSuggestions('/nonexistent/STATE.md');
// Always returns:
// {
//   currentPosition: { phase: null, status: 'unknown', lastActivity: null },
//   suggestions: [ ... at least 1 suggestion ... ],
//   rawState: {}
// }
```

---

### 8.5 Integration with NL Parser

When `parseNaturalLanguage()` (Section 7) returns LOW confidence (< 0.5), augment the fallback suggestions with context-aware suggestions. This provides users with relevant next actions even when their input is ambiguous.

```javascript
/**
 * Augment low-confidence NL results with context-aware suggestions
 * @param {Object} nlResult - Output from parseNaturalLanguage()
 * @returns {Object} Enhanced result with context suggestions merged in
 */
function augmentWithContextSuggestions(nlResult) {
  if (nlResult.confidence >= 0.5) {
    return nlResult;  // HIGH/MEDIUM confidence — no augmentation needed
  }

  // Get context-aware suggestions
  const contextResult = getContextSuggestions();

  if (contextResult.suggestions.length === 0) {
    return nlResult;  // No context available
  }

  // Build enhanced fallback message
  const contextLines = contextResult.suggestions
    .slice(0, 3)
    .map((s, i) => `${i + 1}. ${s.command} — ${s.description}`)
    .join('  ');

  const position = contextResult.currentPosition;
  const positionLabel = position.phase
    ? `Phase ${position.phase} (${position.status})`
    : 'no active project';

  // Merge: show NL suggestions first, then context suggestions
  const originalSuggestion = nlResult.fallbackSuggestion || '';
  const contextBlock = `\n\nBased on your current position (${positionLabel}):\n${contextLines}`;

  return {
    ...nlResult,
    fallbackSuggestion: originalSuggestion + contextBlock,
    contextSuggestions: contextResult.suggestions
  };
}
```

**Usage in NL parser flow (Section 7.4):**

```javascript
function handleNLResult(result, currentCommand) {
  // Augment LOW confidence results with context
  const enhanced = augmentWithContextSuggestions(result);

  if (enhanced.confidence >= 0.8) {
    // HIGH: auto-route (unchanged)
    return executeWithFlags(enhanced.flags);
  }

  if (enhanced.confidence >= 0.5) {
    // MEDIUM: confirm with user (unchanged)
    return confirmAndExecute(enhanced);
  }

  // LOW: show combined NL + context suggestions
  console.log(enhanced.fallbackSuggestion);
}
```

---

## Appendix: Intent Reference

| Intent | Mode | Primary Agents | Use Case |
|--------|------|----------------|----------|
| harden | ad_hoc | testing-reality-checker, engineering-security-engineer | Security audit |
| document | filter_plans | product-technical-writer | Generate docs only |
| skip-frontend | filter_plans | n/a | Exclude UI tasks |
| skip-backend | filter_plans | n/a | Exclude API tasks |
| security-only | filter_review | engineering-security-engineer | Security review |

## See Also

- `.planning/config/intent-teams.yaml` — Team template registry
- `skills/agent-registry/SKILL.md` — Agent resolution
- `skills/wave-executor/SKILL.md` — Plan execution
- `skills/review-panel/SKILL.md` — Review composition
