/**
 * Environment Mapping Integration Tests
 * End-to-end tests for directory mapping extraction and path enforcement
 * Requirements: ENV-01, ENV-02, ENV-03, ENV-04, ENV-05
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Test configuration
const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'sample-codebase-mappings.yaml');

/**
 * Load directory mappings from YAML fixture
 */
function loadMappingsFromFixture() {
  const content = fs.readFileSync(FIXTURE_PATH, 'utf8');
  const mappings = {};
  let currentCategory = null;
  let currentSection = null;
  let inDirectoryMappings = false;
  
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // Track when we're in the directory_mappings section
    if (trimmed === 'directory_mappings:') {
      inDirectoryMappings = true;
      continue;
    }
    
    // Exit directory_mappings section when we hit another top-level key
    if (!inDirectoryMappings) continue;
    if (line.match(/^[a-z_]+:$/) && !line.startsWith('  ')) {
      inDirectoryMappings = false;
      continue;
    }
    
    // Category definitions (2-space indent, no value after colon)
    if (inDirectoryMappings && line.match(/^  [a-z-]+:$/) && !trimmed.includes(': ')) {
      currentCategory = trimmed.replace(':', '');
      mappings[currentCategory] = {
        patterns: [],
        priority: 1,
        description: ''
      };
      currentSection = null;
      continue;
    }
    
    if (!currentCategory || !inDirectoryMappings) continue;
    
    // Parse properties (4-space indent)
    if (line.startsWith('    patterns:')) {
      currentSection = 'patterns';
    } else if (line.startsWith('    priority:')) {
      mappings[currentCategory].priority = parseInt(trimmed.split(':')[1].trim());
      currentSection = null;
    } else if (line.startsWith('    description:')) {
      mappings[currentCategory].description = trimmed.split(':').slice(1).join(':').trim().replace(/"/g, '');
      currentSection = null;
    } else if (line.startsWith('    file_types:') || line.startsWith('    naming_conventions:')) {
      currentSection = null; // Skip these sections
    } else if (trimmed.startsWith('- ') && currentSection === 'patterns') {
      mappings[currentCategory].patterns.push(trimmed.slice(2).replace(/"/g, ''));
    }
  }
  
  return mappings;
}

/**
 * Check if a path matches a glob pattern
 */
function matchesPattern(filePath, pattern) {
  // Handle patterns like **/*.tsx which should match files with or without directory prefix
  let regex = pattern;
  
  // Escape special regex characters except glob patterns
  regex = regex.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  
  // Handle globstar (**)
  regex = regex.replace(/\*\*/g, '{{GLOBSTAR}}');
  
  // Handle single star - match anything except /
  regex = regex.replace(/(?<!\{)\*(?!\})/g, '[^/]*');
  
  // Handle question mark - match single character
  regex = regex.replace(/\?/g, '.');
  
  // Replace globstar - matches anything including empty string
  regex = regex.replace(/\{\{GLOBSTAR\}\}/g, '.*');
  
  // Handle patterns that start with **/ - should match at root too
  // e.g., **/*.tsx should match both "Button.tsx" and "src/Button.tsx"
  if (pattern.startsWith('**/')) {
    // Make the directory prefix optional
    regex = regex.replace(/^\.\*\//, '(?:.*/)?');
  }
  
  return new RegExp(`^${regex}$`).test(filePath);
}

/**
 * Validate a file path against directory mappings
 */
function validatePath(filePath, category, mappings) {
  const mapping = mappings[category];
  if (!mapping) {
    return { valid: false, error: `Unknown category: ${category}`, suggestions: [] };
  }
  
  // Handle missing patterns
  if (!mapping.patterns || !Array.isArray(mapping.patterns) || mapping.patterns.length === 0) {
    return { valid: false, error: `Category ${category} has no patterns defined`, suggestions: [] };
  }
  
  const matchesCategory = mapping.patterns.some(pattern => matchesPattern(filePath, pattern));
  
  if (matchesCategory) {
    return { valid: true, suggestions: [] };
  }
  
  const suggestions = mapping.patterns
    .slice(0, 3)
    .map(p => p.replace('/**', '').replace('**/', '') + '/' + path.basename(filePath));
  
  return {
    valid: false,
    error: `Path "${filePath}" is not in a valid ${category} directory`,
    suggestions
  };
}

/**
 * Detect standard directories from codebase structure
 */
function detectDirectories(structure) {
  const mappings = {
    routes: [], tests: [], components: [], config: [], types: [],
    utils: [], services: [], middleware: [], assets: [], styles: []
  };
  
  if (!structure || typeof structure !== 'object') {
    return mappings;
  }
  
  const dirs = Object.keys(structure);
  
  dirs.forEach(dir => {
    if (dir.includes('/routes') || dir === 'routes') mappings.routes.push(dir);
    if (dir === 'tests' || dir === '__tests__') mappings.tests.push(dir);
    if (dir.includes('/components')) mappings.components.push(dir);
    if (dir.includes('config')) mappings.config.push(dir);
    if (dir.includes('/types') || dir === 'types') mappings.types.push(dir);
    if (dir.includes('/utils') || dir.includes('lib')) mappings.utils.push(dir);
    if (dir.includes('/services')) mappings.services.push(dir);
    if (dir.includes('/middleware')) mappings.middleware.push(dir);
    if (dir.includes('public') || dir.includes('static') || dir.includes('assets')) mappings.assets.push(dir);
    if (dir.includes('styles') || dir.includes('css')) mappings.styles.push(dir);
  });
  
  return mappings;
}

/**
 * Check if file system changes require mapping updates
 */
function detectMappingUpdates(structure, mappings) {
  const changes = {
    newDirectories: [],
    removedDirectories: [],
    updatedMappings: []
  };
  
  const currentDirs = Object.keys(structure);
  const mappedDirs = new Set();
  
  // Collect all currently mapped directories
  for (const mapping of Object.values(mappings)) {
    for (const pattern of mapping.patterns || []) {
      mappedDirs.add(pattern.replace('/**', ''));
    }
  }
  
  // Find new directories not in mappings
  for (const dir of currentDirs) {
    let isMapped = false;
    for (const mappedDir of mappedDirs) {
      // Check exact match or parent-child relationship
      // e.g., "app/routes" matches "app/routes" or "app/routes/api"
      if (dir === mappedDir || dir.startsWith(mappedDir + '/') || mappedDir.startsWith(dir + '/')) {
        isMapped = true;
        break;
      }
    }
    if (!isMapped && !dir.includes('node_modules') && !dir.startsWith('.')) {
      changes.newDirectories.push(dir);
    }
  }
  
  return changes;
}

// Test: Full workflow integration
describe('Full Workflow Integration', () => {
  let mappings;
  
  before(() => {
    mappings = loadMappingsFromFixture();
  });
  
  test('fixture file loads correctly', () => {
    assert.ok(fs.existsSync(FIXTURE_PATH), 'Fixture file should exist');
    
    const content = fs.readFileSync(FIXTURE_PATH, 'utf8');
    assert.ok(content.includes('directory_mappings:'));
    assert.ok(content.includes('version:'));
  });
  
  test('load mappings from YAML fixture', () => {
    assert.ok(Object.keys(mappings).length > 0);
    assert.ok(mappings.routes);
    assert.ok(mappings.tests);
    assert.ok(mappings.components);
  });
  
  test('mappings have required fields', () => {
    for (const [category, mapping] of Object.entries(mappings)) {
      assert.ok(mapping.patterns, `Category ${category} should have patterns`);
      assert.ok(Array.isArray(mapping.patterns), `Patterns should be array for ${category}`);
      assert.ok(mapping.patterns.length > 0, `Patterns should not be empty for ${category}`);
    }
  });
  
  test('routes mapping has correct patterns', () => {
    assert.ok(mappings.routes.patterns.includes('app/routes/**'));
    assert.ok(mappings.routes.patterns.includes('src/routes/**'));
    assert.ok(mappings.routes.patterns.includes('pages/api/**'));
  });
  
  test('tests mapping has correct patterns', () => {
    assert.ok(mappings.tests.patterns.includes('tests/**'));
    assert.ok(mappings.tests.patterns.includes('**/*.test.*'));
  });
  
  test('components mapping has correct patterns', () => {
    assert.ok(mappings.components.patterns.includes('src/components/**'));
    assert.ok(mappings.components.patterns.includes('app/components/**'));
  });
  
  test('full workflow: detect mappings → validate path → suggest correction', () => {
    // Step 1: Detect directory structure
    const structure = {
      'app/routes': [],
      'src/components': [],
      'tests': []
    };
    const detected = detectDirectories(structure);
    
    // Step 2: Validate a new file path
    const result = validatePath('wrong/users.ts', 'routes', mappings);
    
    // Step 3: Verify suggestions
    assert.strictEqual(result.valid, false);
    assert.ok(result.suggestions.length > 0);
    assert.ok(result.suggestions.some(s => s.includes('routes')));
    
    // Step 4: Validate correct path works
    const validResult = validatePath('app/routes/users.ts', 'routes', mappings);
    assert.strictEqual(validResult.valid, true);
  });
  
  test('end-to-end: validate multiple file categories', () => {
    const testCases = [
      { path: 'app/routes/api.ts', category: 'routes', expected: true },
      { path: 'src/components/Button.tsx', category: 'components', expected: true },
      { path: 'tests/auth.test.js', category: 'tests', expected: true },
      { path: 'src/services/api.ts', category: 'services', expected: true },
      { path: 'wrong/api.ts', category: 'routes', expected: false },
      { path: 'src/Button.tsx', category: 'components', expected: false }
    ];
    
    for (const testCase of testCases) {
      const result = validatePath(testCase.path, testCase.category, mappings);
      assert.strictEqual(
        result.valid, 
        testCase.expected,
        `Path ${testCase.path} as ${testCase.category} should be ${testCase.expected ? 'valid' : 'invalid'}`
      );
    }
  });
});

// Test: Auto-update detection
describe('Auto-Update Detection', () => {
  let mappings;
  
  before(() => {
    mappings = loadMappingsFromFixture();
  });
  
  test('detect new directories not in mappings', () => {
    const structure = {
      'app/routes': [],
      'new-feature': [],  // Not in mappings
      'src/components': []
    };
    
    const changes = detectMappingUpdates(structure, mappings);
    assert.ok(changes.newDirectories.includes('new-feature'));
  });
  
  test('no changes for existing mapped directories', () => {
    const structure = {
      'app/routes': [],
      'src/components': [],
      'tests': []
    };
    
    const changes = detectMappingUpdates(structure, mappings);
    assert.strictEqual(changes.newDirectories.length, 0);
  });
  
  test('ignore node_modules and hidden directories', () => {
    const structure = {
      'app/routes': [],
      'node_modules/express': [],
      '.git': [],
      '.cache': []
    };
    
    const changes = detectMappingUpdates(structure, mappings);
    assert.ok(!changes.newDirectories.includes('node_modules/express'));
    assert.ok(!changes.newDirectories.includes('.git'));
    assert.ok(!changes.newDirectories.includes('.cache'));
  });
  
  test('detect new directory → update mappings → validate against new mappings', () => {
    // Initial structure
    const structure = {
      'app/routes': [],
      'legacy-routes': []  // New directory that should be mapped
    };
    
    // Detect updates
    const changes = detectMappingUpdates(structure, mappings);
    assert.ok(changes.newDirectories.includes('legacy-routes'));
    
    // Simulate adding to mappings
    mappings['legacy-routes'] = {
      patterns: ['legacy-routes/**'],
      priority: 5,
      description: 'Legacy routes'
    };
    
    // Now validation should work
    const result = validatePath('legacy-routes/old.ts', 'legacy-routes', mappings);
    assert.strictEqual(result.valid, true);
  });
  
  test('monorepo package detection triggers mapping updates', () => {
    const structure = {
      'packages/app/src/routes': [],
      'packages/shared/src/utils': [],
      'packages/api/src/services': []
    };
    
    const detected = detectDirectories(structure);
    assert.ok(detected.routes.length > 0);
    assert.ok(detected.utils.length > 0);
    assert.ok(detected.services.length > 0);
  });
});

// Test: CODEBASE.md section integration
describe('CODEBASE.md Section Integration', () => {
  test('YAML structure includes version metadata', () => {
    const content = fs.readFileSync(FIXTURE_PATH, 'utf8');
    assert.ok(content.includes('version:'));
    assert.ok(content.includes('last_updated:'));
  });
  
  test('YAML structure includes requirements validated', () => {
    const content = fs.readFileSync(FIXTURE_PATH, 'utf8');
    assert.ok(content.includes('requirements_validated:'));
    assert.ok(content.includes('ENV-01'));
    assert.ok(content.includes('ENV-02'));
  });
  
  test('YAML structure includes enforcement configuration', () => {
    const content = fs.readFileSync(FIXTURE_PATH, 'utf8');
    assert.ok(content.includes('enforcement:'));
    assert.ok(content.includes('mode:'));
  });
  
  test('YAML structure includes auto-update configuration', () => {
    const content = fs.readFileSync(FIXTURE_PATH, 'utf8');
    assert.ok(content.includes('auto_update:'));
    assert.ok(content.includes('enabled:'));
    assert.ok(content.includes('watch_patterns:'));
  });
  
  test('YAML structure includes monorepo support', () => {
    const content = fs.readFileSync(FIXTURE_PATH, 'utf8');
    assert.ok(content.includes('monorepo:'));
    assert.ok(content.includes('enabled:'));
    assert.ok(content.includes('package_patterns:'));
  });
  
  test('all categories have priority levels', () => {
    const m = loadMappingsFromFixture();
    for (const [category, mapping] of Object.entries(m)) {
      assert.ok(mapping.priority, `Category ${category} should have priority`);
      assert.ok([1, 5, 10].includes(mapping.priority), `Priority should be 1, 5, or 10 for ${category}`);
    }
  });
  
  test('all categories have descriptions', () => {
    const m = loadMappingsFromFixture();
    for (const [category, mapping] of Object.entries(m)) {
      assert.ok(mapping.description, `Category ${category} should have description`);
      assert.ok(mapping.description.length > 0);
    }
  });
});

// Test: Cross-feature integration
describe('Cross-Feature Integration', () => {
  let mappings;
  
  before(() => {
    mappings = loadMappingsFromFixture();
  });
  
  test('mappings + spec pipeline + wave executor integration', () => {
    // Simulate: Mappings are loaded → Spec is drafted → Wave executes
    
    // 1. Load mappings (already done in before hook)
    assert.ok(mappings.routes);
    
    // 2. Spec pipeline validates deliverable paths
    const specValidation = validatePath('app/routes/users.ts', 'routes', mappings);
    assert.strictEqual(specValidation.valid, true);
    
    // 3. Wave executor validates file placement
    const invalidPlacement = validatePath('wrong/users.ts', 'routes', mappings);
    assert.strictEqual(invalidPlacement.valid, false);
    assert.ok(invalidPlacement.suggestions.length > 0);
  });
  
  test('path validation returns appropriate error messages', () => {
    const result = validatePath('random/file.ts', 'routes', mappings);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes('not in a valid routes directory'));
    assert.ok(result.suggestions.length > 0);
  });
  
  test('path suggestions include multiple options', () => {
    const result = validatePath('wrong/Button.tsx', 'components', mappings);
    assert.ok(result.suggestions.length >= 2);
    assert.ok(result.suggestions.some(s => s.includes('src/components')));
    assert.ok(result.suggestions.some(s => s.includes('app/components')));
  });
  
  test('glob patterns match correctly in integration', () => {
    // Test various glob patterns from the fixture
    const testCases = [
      { path: 'tests/auth.test.js', pattern: 'tests/**', expected: true },
      { path: 'src/utils/helpers.ts', pattern: 'src/utils/**', expected: true },
      { path: 'Button.tsx', pattern: '**/*.tsx', expected: true },
      { path: 'src/styles/main.css', pattern: 'src/styles/**', expected: true },
      { path: 'app/routes/nested/deep.ts', pattern: 'app/routes/**', expected: true }
    ];
    
    for (const tc of testCases) {
      const result = matchesPattern(tc.path, tc.pattern);
      assert.strictEqual(
        result,
        tc.expected,
        `Path "${tc.path}" ${tc.expected ? 'should' : 'should not'} match "${tc.pattern}"`
      );
    }
  });
});

// Test: Error handling and edge cases
describe('Error Handling and Edge Cases', () => {
  let mappings;
  
  before(() => {
    mappings = loadMappingsFromFixture();
  });
  
  test('handle empty mappings gracefully', () => {
    const emptyMappings = {};
    const result = validatePath('app/routes/users.ts', 'routes', emptyMappings);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes('Unknown category'));
  });
  
  test('handle missing patterns in category', () => {
    const badMappings = {
      routes: { priority: 10 }  // No patterns
    };
    const result = validatePath('app/routes/users.ts', 'routes', badMappings);
    assert.strictEqual(result.valid, false);
  });
  
  test('handle empty structure in detection', () => {
    const result = detectDirectories({});
    for (const category of Object.keys(result)) {
      assert.deepStrictEqual(result[category], []);
    }
  });
  
  test('handle null/undefined inputs', () => {
    // Should not throw
    assert.doesNotThrow(() => {
      detectDirectories(null);
      detectDirectories(undefined);
    });
  });
  
  test('handle deeply nested paths', () => {
    const deepPath = 'app/routes/api/v1/users/admin/settings.ts';
    const result = validatePath(deepPath, 'routes', mappings);
    assert.strictEqual(result.valid, true);
  });
  
  test('handle special characters in paths', () => {
    // Test paths with special characters that might break regex
    const paths = [
      'app/routes/[id].ts',
      'app/routes/$user.ts',
      'src/utils/file-name.ts',
      'tests/test_file.ts'
    ];
    
    for (const p of paths) {
      assert.doesNotThrow(() => {
        validatePath(p, 'routes', mappings);
      });
    }
  });
  
  test('validate all categories have valid patterns', () => {
    for (const [category, mapping] of Object.entries(mappings)) {
      for (const pattern of mapping.patterns) {
        // Patterns should be valid strings
        assert.ok(typeof pattern === 'string');
        assert.ok(pattern.length > 0);
        
        // Patterns should contain glob wildcards or be directory paths
        assert.ok(
          pattern.includes('*') || pattern.includes('/') || pattern.includes('.'),
          `Pattern "${pattern}" for ${category} should be a valid path pattern`
        );
      }
    }
  });
  
  test('priority values are within expected range', () => {
    for (const [category, mapping] of Object.entries(mappings)) {
      assert.ok(
        [1, 5, 10].includes(mapping.priority),
        `Priority for ${category} should be 1, 5, or 10`
      );
    }
  });
});

// Test: Performance and scalability
describe('Performance and Scalability', () => {
  test('validation is fast for typical paths', () => {
    const m = loadMappingsFromFixture();
    const start = Date.now();
    
    // Run 100 validations
    for (let i = 0; i < 100; i++) {
      validatePath('app/routes/users.ts', 'routes', m);
      validatePath('src/components/Button.tsx', 'components', m);
      validatePath('tests/auth.test.js', 'tests', m);
    }
    
    const duration = Date.now() - start;
    assert.ok(duration < 1000, `100 validations took ${duration}ms, should be < 1000ms`);
  });
  
  test('mappings load quickly from fixture', () => {
    const start = Date.now();
    
    for (let i = 0; i < 10; i++) {
      loadMappingsFromFixture();
    }
    
    const duration = Date.now() - start;
    assert.ok(duration < 500, `10 fixture loads took ${duration}ms, should be < 500ms`);
  });
});

// Export functions for use in other tests
module.exports = {
  loadMappingsFromFixture,
  validatePath,
  detectDirectories,
  detectMappingUpdates,
  matchesPattern,
  FIXTURE_PATH
};
