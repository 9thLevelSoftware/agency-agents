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
