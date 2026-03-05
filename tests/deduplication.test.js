/**
 * Deduplication Logic Tests
 * Validates review finding deduplication and domain filtering
 * Requirements: AUTH-03 (Finding Consolidation)
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Test configuration
const FINDINGS_PATH = path.join(__dirname, 'mocks', 'sample-findings.json');
const AUTHORITY_PATH = path.join(__dirname, 'mocks', 'authority-matrix.json');

// Severity priority (higher index = higher priority)
const SEVERITY_PRIORITY = {
  'SUGGESTION': 0,
  'WARNING': 1,
  'BLOCKER': 2
};

// Load fixtures
function loadFindings() {
  const content = fs.readFileSync(FINDINGS_PATH, 'utf8');
  return JSON.parse(content);
}

function loadAuthorityMatrix() {
  const content = fs.readFileSync(AUTHORITY_PATH, 'utf8');
  return JSON.parse(content);
}

/**
 * Deduplicate findings by file:line key
 * Keeps highest severity when multiple findings at same location
 * @param {Array} findings - Array of finding objects
 * @returns {Array} Deduplicated findings
 */
function deduplicateFindings(findings) {
  const locationMap = new Map();
  
  for (const finding of findings) {
    const key = `${finding.file}:${finding.line}`;
    
    if (!locationMap.has(key)) {
      locationMap.set(key, finding);
    } else {
      const existing = locationMap.get(key);
      const existingPriority = SEVERITY_PRIORITY[existing.severity] || 0;
      const newPriority = SEVERITY_PRIORITY[finding.severity] || 0;
      
      if (newPriority > existingPriority) {
        locationMap.set(key, finding);
      }
    }
  }
  
  return Array.from(locationMap.values());
}

/**
 * Filter findings by agent domain ownership
 * @param {Array} findings - Array of finding objects
 * @param {string} agentName - Name of the agent
 * @param {Object} authorityMatrix - Authority matrix with agent domains
 * @returns {Array} Filtered findings in agent's domains
 */
function filterByDomain(findings, agentName, authorityMatrix) {
  const agent = authorityMatrix.agents[agentName];
  if (!agent || !agent.exclusive_domains) {
    return [];
  }
  
  const agentDomains = new Set(agent.exclusive_domains);
  return findings.filter(finding => agentDomains.has(finding.rule));
}

/**
 * Compare two severities
 * @param {string} severity1 - First severity
 * @param {string} severity2 - Second severity
 * @returns {number} -1 if severity1 < severity2, 1 if severity1 > severity2, 0 if equal
 */
function compareSeverity(severity1, severity2) {
  const p1 = SEVERITY_PRIORITY[severity1] || 0;
  const p2 = SEVERITY_PRIORITY[severity2] || 0;
  return p1 - p2;
}

// Test: Deduplication by file:line
describe('Finding Deduplication', () => {
  let fixtures;
  let findings;
  
  before(() => {
    fixtures = loadFindings();
    findings = fixtures.findings;
  });
  
  test('should load findings fixture', () => {
    assert.ok(findings, 'Findings should be loaded');
    assert.ok(Array.isArray(findings), 'Findings should be an array');
    assert.ok(findings.length >= 8, `Expected at least 8 findings, got ${findings.length}`);
  });
  
  test('deduplicateFindings should be exported and functional', () => {
    assert.strictEqual(typeof deduplicateFindings, 'function');
  });
  
  test('should deduplicate findings by file:line', () => {
    const deduplicated = deduplicateFindings(findings);
    
    // Count unique file:line combinations
    const locations = new Set();
    for (const finding of findings) {
      locations.add(`${finding.file}:${finding.line}`);
    }
    
    assert.strictEqual(deduplicated.length, locations.size,
      'Deduplicated count should equal unique file:line locations');
  });
  
  test('should keep highest severity when duplicates at same location', () => {
    const deduplicated = deduplicateFindings(findings);
    
    // Check src/auth/login.js:45 - should keep BLOCKER (SEC-001)
    const loginLine45 = deduplicated.find(f => 
      f.file === 'src/auth/login.js' && f.line === 45
    );
    assert.ok(loginLine45, 'Should have finding at src/auth/login.js:45');
    assert.strictEqual(loginLine45.severity, 'BLOCKER',
      'Should keep BLOCKER severity at src/auth/login.js:45');
    assert.strictEqual(loginLine45.id, 'SEC-001',
      'Should keep SEC-001 (BLOCKER) over STYLE-001 (WARNING) and TEST-001 (SUGGESTION)');
  });
  
  test('should preserve unique findings without duplicates', () => {
    const deduplicated = deduplicateFindings(findings);
    
    // UNIQUE-001 should be preserved (only finding at src/utils/helpers.js:15)
    const uniqueFinding = deduplicated.find(f => f.id === 'UNIQUE-001');
    assert.ok(uniqueFinding, 'Should preserve unique finding (UNIQUE-001)');
  });
  
  test('should handle empty findings array', () => {
    const deduplicated = deduplicateFindings([]);
    assert.deepStrictEqual(deduplicated, []);
  });
  
  test('should handle single finding', () => {
    const single = [findings[0]];
    const deduplicated = deduplicateFindings(single);
    assert.strictEqual(deduplicated.length, 1);
    assert.strictEqual(deduplicated[0].id, findings[0].id);
  });
  
  test('should handle findings with null/undefined severity', () => {
    const withNullSeverity = [
      { ...findings[0], severity: null },
      { ...findings[0], id: 'TEST-NULL', severity: 'BLOCKER' }
    ];
    const deduplicated = deduplicateFindings(withNullSeverity);
    assert.strictEqual(deduplicated.length, 1);
    assert.strictEqual(deduplicated[0].severity, 'BLOCKER');
  });
  
  test('should correctly identify duplicates in fixture', () => {
    const fileLineCounts = {};
    for (const finding of findings) {
      const key = `${finding.file}:${finding.line}`;
      fileLineCounts[key] = (fileLineCounts[key] || 0) + 1;
    }
    
    const duplicates = Object.entries(fileLineCounts).filter(([_, count]) => count > 1);
    assert.ok(duplicates.length > 0, 'Should have duplicate locations in fixture');
    
    console.log(`  Found ${duplicates.length} locations with duplicates`);
    for (const [location, count] of duplicates) {
      console.log(`    ${location}: ${count} findings`);
    }
  });
});

// Test: Severity comparison
describe('Severity Comparison', () => {
  test('BLOCKER > WARNING', () => {
    assert.ok(compareSeverity('BLOCKER', 'WARNING') > 0);
  });
  
  test('WARNING > SUGGESTION', () => {
    assert.ok(compareSeverity('WARNING', 'SUGGESTION') > 0);
  });
  
  test('BLOCKER > SUGGESTION', () => {
    assert.ok(compareSeverity('BLOCKER', 'SUGGESTION') > 0);
  });
  
  test('equal severities return 0', () => {
    assert.strictEqual(compareSeverity('BLOCKER', 'BLOCKER'), 0);
    assert.strictEqual(compareSeverity('WARNING', 'WARNING'), 0);
    assert.strictEqual(compareSeverity('SUGGESTION', 'SUGGESTION'), 0);
  });
  
  test('unknown severities default to 0 priority', () => {
    assert.strictEqual(compareSeverity('UNKNOWN', 'SUGGESTION'), 0);
    assert.ok(compareSeverity('BLOCKER', 'UNKNOWN') > 0);
  });
});

// Test: Domain filtering
describe('Domain Filtering', () => {
  let fixtures;
  let findings;
  let authorityMatrix;
  
  before(() => {
    fixtures = loadFindings();
    findings = fixtures.findings;
    authorityMatrix = loadAuthorityMatrix();
  });
  
  test('filterByDomain should be exported and functional', () => {
    assert.strictEqual(typeof filterByDomain, 'function');
  });
  
  test('security-engineer should only see security domains', () => {
    const securityFindings = filterByDomain(findings, 'security-engineer', authorityMatrix);
    
    for (const finding of securityFindings) {
      const securityDomains = authorityMatrix.agents['security-engineer'].exclusive_domains;
      assert.ok(securityDomains.includes(finding.rule),
        `Finding ${finding.id} rule "${finding.rule}" should be in security-engineer domains`);
    }
    
    // Should include SEC-001, SEC-002, SEC-003
    const ids = securityFindings.map(f => f.id);
    assert.ok(ids.includes('SEC-001'), 'Should include SEC-001');
    assert.ok(ids.includes('SEC-002'), 'Should include SEC-002');
    assert.ok(ids.includes('SEC-003'), 'Should include SEC-003');
  });
  
  test('frontend-developer should only see frontend domains', () => {
    const frontendFindings = filterByDomain(findings, 'frontend-developer', authorityMatrix);
    
    for (const finding of frontendFindings) {
      const frontendDomains = authorityMatrix.agents['frontend-developer'].exclusive_domains;
      assert.ok(frontendDomains.includes(finding.rule),
        `Finding ${finding.id} rule "${finding.rule}" should be in frontend-developer domains`);
    }
    
    // Should include UI-001, PERF-001
    const ids = frontendFindings.map(f => f.id);
    assert.ok(ids.includes('UI-001'), 'Should include UI-001');
    assert.ok(ids.includes('PERF-001'), 'Should include PERF-001');
  });
  
  test('code-reviewer should only see code style domains', () => {
    const codeFindings = filterByDomain(findings, 'code-reviewer', authorityMatrix);
    
    for (const finding of codeFindings) {
      const codeDomains = authorityMatrix.agents['code-reviewer'].exclusive_domains;
      assert.ok(codeDomains.includes(finding.rule),
        `Finding ${finding.id} rule "${finding.rule}" should be in code-reviewer domains`);
    }
    
    // Should include STYLE-001, STYLE-002, UNIQUE-001
    const ids = codeFindings.map(f => f.id);
    assert.ok(ids.includes('STYLE-001'), 'Should include STYLE-001');
    assert.ok(ids.includes('STYLE-002'), 'Should include STYLE-002');
    assert.ok(ids.includes('UNIQUE-001'), 'Should include UNIQUE-001');
  });
  
  test('should filter out findings outside agent domain', () => {
    // Security engineer should not see UI findings
    const securityFindings = filterByDomain(findings, 'security-engineer', authorityMatrix);
    const uiFinding = securityFindings.find(f => f.id === 'UI-001');
    assert.strictEqual(uiFinding, undefined,
      'Security engineer should not see UI-001 (accessibility domain)');
    
    // Frontend developer should not see security findings
    const frontendFindings = filterByDomain(findings, 'frontend-developer', authorityMatrix);
    const secFinding = frontendFindings.find(f => f.id === 'SEC-001');
    assert.strictEqual(secFinding, undefined,
      'Frontend developer should not see SEC-001 (owasp-top-10 domain)');
  });
  
  test('should return empty array for unknown agent', () => {
    const result = filterByDomain(findings, 'unknown-agent', authorityMatrix);
    assert.deepStrictEqual(result, []);
  });
  
  test('should return empty array for agent without domains', () => {
    const modifiedMatrix = JSON.parse(JSON.stringify(authorityMatrix));
    modifiedMatrix.agents['test-agent'] = { name: 'Test Agent' };
    
    const result = filterByDomain(findings, 'test-agent', modifiedMatrix);
    assert.deepStrictEqual(result, []);
  });
});

// Test: Combined deduplication + filtering
describe('Combined Deduplication and Filtering', () => {
  let fixtures;
  let findings;
  let authorityMatrix;
  
  before(() => {
    fixtures = loadFindings();
    findings = fixtures.findings;
    authorityMatrix = loadAuthorityMatrix();
  });
  
  test('should deduplicate then filter by domain', () => {
    // First deduplicate to get highest severity per location
    const deduplicated = deduplicateFindings(findings);
    
    // Then filter for security engineer
    const securityFindings = filterByDomain(deduplicated, 'security-engineer', authorityMatrix);
    
    // Should only have security domain findings
    for (const finding of securityFindings) {
      const securityDomains = authorityMatrix.agents['security-engineer'].exclusive_domains;
      assert.ok(securityDomains.includes(finding.rule),
        `Security finding ${finding.id} should be in security domains`);
    }
    
    // src/auth/login.js:45 should have SEC-001 (BLOCKER), not STYLE-001
    const loginFinding = securityFindings.find(f => 
      f.file === 'src/auth/login.js' && f.line === 45
    );
    assert.ok(loginFinding, 'Should have finding at src/auth/login.js:45');
    assert.strictEqual(loginFinding.id, 'SEC-001');
  });
  
  test('should handle complex multi-agent scenario', () => {
    const deduplicated = deduplicateFindings(findings);
    
    // Get findings for each agent type
    const security = filterByDomain(deduplicated, 'security-engineer', authorityMatrix);
    const frontend = filterByDomain(deduplicated, 'frontend-developer', authorityMatrix);
    const code = filterByDomain(deduplicated, 'code-reviewer', authorityMatrix);
    const sre = filterByDomain(deduplicated, 'sre-chaos', authorityMatrix);
    
    // Security engineer sees OWASP findings
    assert.ok(security.some(f => f.rule === 'owasp-top-10'),
      'Security engineer should see OWASP findings');
    
    // Frontend developer sees accessibility findings  
    assert.ok(frontend.some(f => f.rule === 'accessibility'),
      'Frontend developer should see accessibility findings');
    
    // Code reviewer sees code style findings (UNIQUE-001 survives deduplication)
    assert.ok(code.some(f => f.rule === 'language-idioms'),
      'Code reviewer should see language-idioms findings');
    
    // SRE sees reliability findings
    assert.ok(sre.some(f => f.rule === 'service-level-objectives'),
      'SRE should see SLO findings');
  });
});

// Test: Fixture validation
describe('Fixture Validation', () => {
  test('fixture has expected deduplication rules', () => {
    const fixtures = loadFindings();
    assert.ok(fixtures.expected_deduplication, 'Should have expected deduplication rules');
    assert.ok(fixtures.expected_deduplication.by_file_line,
      'Should have by_file_line expectations');
  });
  
  test('fixture has domain filtering tests', () => {
    const fixtures = loadFindings();
    assert.ok(fixtures.domain_filtering_tests, 'Should have domain filtering tests');
    assert.ok(fixtures.domain_filtering_tests.security_engineer_should_keep,
      'Should have security engineer keep list');
  });
  
  test('fixture has severity order defined', () => {
    const fixtures = loadFindings();
    assert.ok(fixtures.severity_order, 'Should have severity order');
    assert.deepStrictEqual(fixtures.severity_order, ['BLOCKER', 'WARNING', 'SUGGESTION']);
  });
  
  test('all findings have required fields', () => {
    const fixtures = loadFindings();
    const requiredFields = ['id', 'file', 'line', 'severity', 'rule', 'message', 'agent'];
    
    for (const finding of fixtures.findings) {
      for (const field of requiredFields) {
        assert.ok(finding[field] !== undefined,
          `Finding ${finding.id} should have ${field}`);
      }
    }
  });
});

// Test: Edge cases
describe('Edge Cases', () => {
  test('handles findings with same file but different lines', () => {
    const testFindings = [
      { file: 'src/test.js', line: 10, severity: 'BLOCKER', rule: 'test', id: '1' },
      { file: 'src/test.js', line: 20, severity: 'WARNING', rule: 'test', id: '2' },
      { file: 'src/test.js', line: 30, severity: 'SUGGESTION', rule: 'test', id: '3' }
    ];
    
    const deduplicated = deduplicateFindings(testFindings);
    assert.strictEqual(deduplicated.length, 3, 'Should keep all (different lines)');
  });
  
  test('handles findings with same line but different files', () => {
    const testFindings = [
      { file: 'src/a.js', line: 10, severity: 'BLOCKER', rule: 'test', id: '1' },
      { file: 'src/b.js', line: 10, severity: 'WARNING', rule: 'test', id: '2' }
    ];
    
    const deduplicated = deduplicateFindings(testFindings);
    assert.strictEqual(deduplicated.length, 2, 'Should keep all (different files)');
  });
  
  test('handles all findings at same location with same severity', () => {
    const testFindings = [
      { file: 'src/test.js', line: 10, severity: 'WARNING', rule: 'test1', id: '1' },
      { file: 'src/test.js', line: 10, severity: 'WARNING', rule: 'test2', id: '2' }
    ];
    
    const deduplicated = deduplicateFindings(testFindings);
    assert.strictEqual(deduplicated.length, 1, 'Should keep only one');
    // First one wins when severity is equal
    assert.strictEqual(deduplicated[0].id, '1');
  });
});

// Export functions for use in other tests
module.exports = {
  deduplicateFindings,
  filterByDomain,
  compareSeverity,
  SEVERITY_PRIORITY
};
