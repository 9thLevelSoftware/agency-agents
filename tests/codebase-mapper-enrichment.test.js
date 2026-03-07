'use strict';

/**
 * Codebase Mapper Enrichment Tests — Dependency Risk (MAP-01)
 *
 * Validates that SKILL.md contains the Section 4.6 specification for
 * package-level dependency risk assessment, and that the CODEBASE.md
 * template includes the corresponding output sections.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKILL_PATH = path.join(ROOT, 'skills', 'codebase-mapper', 'SKILL.md');
const FIXTURE_PATH = path.join(
  ROOT,
  'tests',
  'fixtures',
  'codebase-mapper',
  'sample-npm-outdated.json'
);

const skillContent = fs.readFileSync(SKILL_PATH, 'utf8');

// --- Dependency Risk — SKILL.md specification ---

describe('Dependency Risk — SKILL.md specification', () => {
  test('Section 4.6 exists in codebase-mapper SKILL.md', () => {
    assert.ok(
      skillContent.includes('### 4.6: Package-Level Dependency Risk (MAP-01)'),
      'Section 4.6 header must exist with MAP-01 tag'
    );
  });

  test('Section 4.6 defines ecosystem detection table with npm, pip, bundle, cargo, go', () => {
    assert.ok(
      skillContent.includes('#### 4.6.1: Ecosystem Detection'),
      'Subsection 4.6.1 must exist'
    );
    const ecosystems = ['npm', 'pip', 'bundler', 'cargo', 'go'];
    for (const eco of ecosystems) {
      assert.ok(
        skillContent.includes(`| ${eco === 'bundler' ? 'Ruby' : eco === 'npm' ? 'Node.js' : eco === 'pip' ? 'Python' : eco === 'cargo' ? 'Rust' : 'Go'} | ${eco}`),
        `Ecosystem detection table must include ${eco}`
      );
    }
  });

  test('Section 4.6 includes outdated detection protocol', () => {
    assert.ok(
      skillContent.includes('#### 4.6.2: Outdated Package Detection'),
      'Subsection 4.6.2 must exist'
    );
    assert.ok(
      skillContent.includes('npm outdated --json'),
      'Must reference npm outdated --json command'
    );
    assert.ok(
      skillContent.includes('major version behind'),
      'Must categorize by major version severity'
    );
  });

  test('Section 4.6 includes heavy dependency detection with thresholds', () => {
    assert.ok(
      skillContent.includes('#### 4.6.3: Heavy Dependency Detection'),
      'Subsection 4.6.3 must exist'
    );
    assert.ok(
      skillContent.includes('Ratio > 50'),
      'Must define HIGH threshold at ratio > 50'
    );
    assert.ok(
      skillContent.includes('Ratio 20-50'),
      'Must define MEDIUM threshold at ratio 20-50'
    );
    assert.ok(
      skillContent.includes('Ratio < 20'),
      'Must define LOW threshold at ratio < 20'
    );
  });

  test('Section 4.6 includes unmaintained package heuristic', () => {
    assert.ok(
      skillContent.includes('#### 4.6.4: Unmaintained Package Heuristic'),
      'Subsection 4.6.4 must exist'
    );
    assert.ok(
      skillContent.includes('>2 years'),
      'Must define 2-year staleness threshold'
    );
  });

  test('Section 4.6 includes graceful degradation for each subsection', () => {
    assert.ok(
      skillContent.includes('#### 4.6.6: Graceful Degradation'),
      'Subsection 4.6.6 must exist'
    );
    // Each subsection has its own skip condition
    const skipConditions = [
      'Package manager not available or no lockfile found',
      'Heavy dependency analysis requires Node.js/npm',
      'Lockfile unavailable for unmaintained package detection',
    ];
    for (const condition of skipConditions) {
      assert.ok(
        skillContent.includes(condition),
        `Must include skip condition: "${condition}"`
      );
    }
    assert.ok(
      skillContent.includes('Never error, never block analysis completion'),
      'Must state never-error guarantee'
    );
  });
});

// --- Dependency Risk — CODEBASE.md template ---

describe('Dependency Risk — CODEBASE.md template', () => {
  test('Template includes ## Dependency Risk section', () => {
    assert.ok(
      skillContent.includes('## Dependency Risk'),
      'CODEBASE.md template must include ## Dependency Risk'
    );
  });

  test('Template includes Outdated Packages table with required columns', () => {
    assert.ok(
      skillContent.includes('### Outdated Packages'),
      'Must include Outdated Packages subsection'
    );
    const requiredColumns = ['Package', 'Current', 'Latest', 'Severity'];
    for (const col of requiredColumns) {
      assert.ok(
        skillContent.includes(col),
        `Outdated Packages table must include column: ${col}`
      );
    }
  });

  test('Template includes Heavy Dependencies subsection', () => {
    assert.ok(
      skillContent.includes('### Heavy Dependencies'),
      'Must include Heavy Dependencies subsection'
    );
    assert.ok(
      skillContent.includes('Transitive count'),
      'Must include transitive count metric'
    );
  });

  test('Template includes Potentially Unmaintained subsection', () => {
    assert.ok(
      skillContent.includes('### Potentially Unmaintained'),
      'Must include Potentially Unmaintained subsection'
    );
  });

  test('Template includes Dependency Risk Summary table', () => {
    assert.ok(
      skillContent.includes('### Dependency Risk Summary'),
      'Must include Dependency Risk Summary subsection'
    );
    const summaryMetrics = [
      'Outdated packages',
      'Major version behind',
      'Heavy dependencies',
      'Potentially unmaintained',
    ];
    for (const metric of summaryMetrics) {
      assert.ok(
        skillContent.includes(metric),
        `Summary table must include metric: ${metric}`
      );
    }
  });

  test('Template includes graceful degradation placeholder for missing ecosystem', () => {
    assert.ok(
      skillContent.includes(
        'No package manifest detected (package.json, requirements.txt, Gemfile, Cargo.toml, go.mod)'
      ),
      'Must include no-manifest placeholder text'
    );
  });
});

// --- Dependency Risk — calibration logic ---

describe('Dependency Risk — calibration logic', () => {
  test('Risk calibration thresholds are relative to dependency count', () => {
    // Section 4.6.2 must state percentage-based thresholds
    assert.ok(
      skillContent.includes('50% of dependencies outdated'),
      'HIGH threshold must be percentage-based (>50%)'
    );
    assert.ok(
      skillContent.includes('20-50% outdated'),
      'MEDIUM threshold must be percentage-based (20-50%)'
    );
    assert.ok(
      skillContent.includes('Less than 20% outdated'),
      'LOW threshold must be percentage-based (<20%)'
    );
    // Section 4.6.5 must reference relative calibration
    assert.ok(
      skillContent.includes(
        'Risk levels are relative to total dependency count, not absolute numbers'
      ),
      'Must explicitly state relative calibration'
    );
  });

  test('Outdated risk levels use major/minor/patch severity categories', () => {
    assert.ok(
      skillContent.includes('major version behind (HIGH)'),
      'Must map major version behind to HIGH'
    );
    assert.ok(
      skillContent.includes('minor version behind (MEDIUM)'),
      'Must map minor version behind to MEDIUM'
    );
    assert.ok(
      skillContent.includes('patch only (LOW)'),
      'Must map patch only to LOW'
    );
  });

  test('Sample npm outdated fixture is valid JSON with expected structure', () => {
    const fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
    const packages = Object.keys(fixture);
    assert.ok(packages.length > 0, 'Fixture must contain at least one package');

    for (const pkg of packages) {
      const entry = fixture[pkg];
      assert.ok('current' in entry, `${pkg} must have "current" field`);
      assert.ok('latest' in entry, `${pkg} must have "latest" field`);
      assert.ok('wanted' in entry, `${pkg} must have "wanted" field`);
    }

    // Verify fixture includes at least one major-version-behind package
    const hasMajorBehind = packages.some((pkg) => {
      const current = fixture[pkg].current.split('.')[0];
      const latest = fixture[pkg].latest.split('.')[0];
      return parseInt(latest) > parseInt(current);
    });
    assert.ok(
      hasMajorBehind,
      'Fixture must include at least one package with a major version behind'
    );
  });
});

// --- Test Coverage Enrichment — SKILL.md specification (MAP-02) ---

describe('Test Coverage Enrichment — SKILL.md specification', () => {
  test('Section 9.4 exists (Coverage Tool Integration)', () => {
    assert.ok(
      skillContent.includes('### 9.4: Coverage Tool Integration (MAP-02)'),
      'Section 9.4 header must exist with MAP-02 tag'
    );
  });

  test('Section 9.4 defines coverage report detection for nyc, jest, pytest-cov, go test, SimpleCov, cargo-tarpaulin', () => {
    assert.ok(
      skillContent.includes('#### 9.4.1: Coverage Report Detection'),
      'Subsection 9.4.1 must exist'
    );
    const tools = [
      'nyc/istanbul (Node.js)',
      'jest (Node.js)',
      'pytest-cov (Python)',
      'go test (Go)',
      'SimpleCov (Ruby)',
      'cargo-tarpaulin (Rust)',
    ];
    for (const tool of tools) {
      assert.ok(
        skillContent.includes(`| ${tool} |`),
        `Coverage report detection table must include ${tool}`
      );
    }
  });

  test('Section 9.4 includes extraction logic for JSON summary, LCOV, Cobertura XML, Go cover formats', () => {
    assert.ok(
      skillContent.includes('#### 9.4.2: Coverage Percentage Extraction'),
      'Subsection 9.4.2 must exist'
    );
    const formats = [
      'JSON summary (nyc/jest)',
      'LCOV',
      'Cobertura XML',
      'Go cover profile',
    ];
    for (const fmt of formats) {
      assert.ok(
        skillContent.includes(fmt),
        `Extraction logic must cover format: ${fmt}`
      );
    }
  });

  test('Section 9.4 includes quality classification thresholds (>=80 HIGH, 50-79 MEDIUM, <50 LOW)', () => {
    assert.ok(
      skillContent.includes('#### 9.4.3: Coverage Quality Classification'),
      'Subsection 9.4.3 must exist'
    );
    assert.ok(
      skillContent.includes('>= 80%'),
      'Must define HIGH threshold at >= 80%'
    );
    assert.ok(
      skillContent.includes('50-79%'),
      'Must define MEDIUM threshold at 50-79%'
    );
    assert.ok(
      skillContent.includes('< 50%'),
      'Must define LOW threshold at < 50%'
    );
  });

  test('Section 9.4 includes graceful degradation to sample-based ratio', () => {
    assert.ok(
      skillContent.includes('#### 9.4.4: Graceful Degradation'),
      'Subsection 9.4.4 must exist'
    );
    assert.ok(
      skillContent.includes('No coverage reports found. Coverage estimated from test file matching'),
      'Must include fallback message for missing coverage reports'
    );
    assert.ok(
      skillContent.includes('Never run test suites or coverage tools'),
      'Must explicitly state never-run guarantee'
    );
  });

  test('Section 9.5 exists (Critical File Coverage Correlation)', () => {
    assert.ok(
      skillContent.includes('### 9.5: Critical File Coverage Correlation (MAP-02)'),
      'Section 9.5 header must exist with MAP-02 tag'
    );
  });

  test('Section 9.5 defines risk scoring formula using fan-in and complexity', () => {
    assert.ok(
      skillContent.includes('#### 9.5.1: Critical File Identification'),
      'Subsection 9.5.1 must exist'
    );
    assert.ok(
      skillContent.includes('fan_in_score * 10'),
      'Risk formula must include fan_in_score * 10'
    );
    assert.ok(
      skillContent.includes('complexity_score / 100'),
      'Risk formula must include complexity_score / 100'
    );
    assert.ok(
      skillContent.includes('risk >= 30: CRITICAL'),
      'Must define CRITICAL threshold at risk >= 30'
    );
    assert.ok(
      skillContent.includes('risk >= 10: HIGH'),
      'Must define HIGH threshold at risk >= 10'
    );
  });

  test('Section 9.5 includes ranked output table format', () => {
    assert.ok(
      skillContent.includes('#### 9.5.2: Output'),
      'Subsection 9.5.2 must exist'
    );
    const columns = ['File', 'Lines', 'Fan-in', 'Risk Score', 'Risk Level', 'Recommendation'];
    for (const col of columns) {
      assert.ok(
        skillContent.includes(col),
        `Output table must include column: ${col}`
      );
    }
    assert.ok(
      skillContent.includes('top 5, sorted by risk score descending'),
      'Must specify top 5 sorted by risk score'
    );
  });

  test('Section 9.5 includes graceful degradation for missing cross-reference data', () => {
    assert.ok(
      skillContent.includes('#### 9.5.3: Graceful Degradation'),
      'Subsection 9.5.3 must exist'
    );
    assert.ok(
      skillContent.includes('Section 8 fan-in data not available'),
      'Must handle missing Section 8 fan-in data'
    );
    assert.ok(
      skillContent.includes('Section 4.1 data not available'),
      'Must handle missing Section 4.1 data'
    );
    assert.ok(
      skillContent.includes('Never block on missing cross-reference data'),
      'Must state never-block guarantee'
    );
  });
});

// --- Test Coverage Enrichment — CODEBASE.md template (MAP-02) ---

describe('Test Coverage Enrichment — CODEBASE.md template', () => {
  test('Template Test Coverage Map includes Source field', () => {
    assert.ok(
      skillContent.includes('**Source**:'),
      'Test Coverage Map template must include Source field'
    );
  });

  test('Template includes Critical Untested Files subsection', () => {
    assert.ok(
      skillContent.includes('### Critical Untested Files'),
      'Template must include Critical Untested Files subsection'
    );
  });

  test('Critical Untested Files table has required columns (File, Lines, Fan-in, Risk Score, Risk Level, Recommendation)', () => {
    // Extract the Critical Untested Files table area
    const critIdx = skillContent.indexOf('### Critical Untested Files');
    assert.ok(critIdx !== -1, 'Critical Untested Files section must exist');
    const tableArea = skillContent.substring(critIdx, critIdx + 300);
    const columns = ['File', 'Lines', 'Fan-in', 'Risk Score', 'Risk Level', 'Recommendation'];
    for (const col of columns) {
      assert.ok(
        tableArea.includes(col),
        `Critical Untested Files table must include column: ${col}`
      );
    }
  });

  test('Template preserves graceful degradation placeholder', () => {
    assert.ok(
      skillContent.includes(
        'No test convention detected. No files matching common test patterns (.test., .spec., __tests__/, test/, _test.go, Test*.java) were found.'
      ),
      'Must preserve graceful degradation placeholder text'
    );
  });
});
