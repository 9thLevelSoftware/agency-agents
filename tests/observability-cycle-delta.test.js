'use strict';

/**
 * Observability Cycle Delta Tests (Phase 4, OBS-02)
 * Validates Cycle Comparison, two-tier fingerprint strategy,
 * Cycle Delta in REVIEW.md template, graceful degradation,
 * verification guidance, and escalation/stale loop coverage.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const reviewLoop = fs.readFileSync(
  path.join(ROOT, 'skills', 'review-loop', 'SKILL.md'),
  'utf8'
);

describe('Cycle Delta — Cycle Comparison section (review-loop)', () => {
  test('Cycle Comparison substep exists', () => {
    assert.match(reviewLoop, /Cycle Comparison/);
  });

  test('contains cycle_delta data structure', () => {
    assert.match(reviewLoop, /cycle_delta/);
  });

  test('contains findings_resolved classification', () => {
    assert.match(reviewLoop, /findings_resolved/);
  });

  test('contains findings_new classification', () => {
    assert.match(reviewLoop, /findings_new/);
  });

  test('contains findings_unchanged classification', () => {
    assert.match(reviewLoop, /findings_unchanged/);
  });

  test('contains findings_downgraded classification', () => {
    assert.match(reviewLoop, /findings_downgraded/);
  });

  test('contains findings_upgraded classification', () => {
    assert.match(reviewLoop, /findings_upgraded/);
  });
});

describe('Cycle Delta — Two-tier fingerprint strategy (review-loop)', () => {
  test('documents Location fingerprint', () => {
    assert.match(reviewLoop, /[Ll]ocation fingerprint/);
  });

  test('documents Full fingerprint', () => {
    assert.match(reviewLoop, /[Ff]ull fingerprint/);
  });

  test('location fingerprint excludes severity from the key', () => {
    // Location fingerprint format: {file}:{line_range}:{issue_summary_hash}
    // Full fingerprint format: {file}:{line_range}:{severity}:{issue_summary_hash}
    // The location fingerprint must NOT include severity
    const locationMatch = reviewLoop.match(
      /[Ll]ocation fingerprint[^:]*:\s*`([^`]+)`/
    );
    assert.ok(locationMatch, 'Location fingerprint definition should exist in backticks');
    const locationFormat = locationMatch[1];
    assert.ok(
      !locationFormat.includes('severity'),
      'Location fingerprint must not include severity in its key'
    );
  });
});

describe('Cycle Delta — REVIEW.md template sections (review-loop)', () => {
  test('Cycle Delta section heading exists', () => {
    assert.match(reviewLoop, /## Cycle Delta/);
  });

  test('Progression Summary subsection exists', () => {
    assert.match(reviewLoop, /Progression Summary/);
  });

  test('Findings Resolved subsection exists', () => {
    assert.match(reviewLoop, /Findings Resolved/);
  });

  test('Findings New subsection exists', () => {
    assert.match(reviewLoop, /Findings New/);
  });

  test('Findings Unchanged subsection exists', () => {
    assert.match(reviewLoop, /Findings Unchanged/);
  });

  test('Severity Changes subsection exists', () => {
    assert.match(reviewLoop, /Severity Changes/);
  });
});

describe('Cycle Delta — Single-cycle graceful degradation (review-loop)', () => {
  test('contains guidance to omit Cycle Delta for single-cycle reviews', () => {
    assert.match(reviewLoop, /[Oo]mit.*Cycle Delta/);
  });

  test('single-cycle omission language is present', () => {
    assert.match(reviewLoop, /single-cycle review/i);
  });
});

describe('Cycle Delta — Verification guidance (review-loop)', () => {
  test('contains Cycle Delta verification section', () => {
    assert.match(reviewLoop, /Cycle Delta verification/);
  });

  test('contains Sample test scenario', () => {
    assert.match(reviewLoop, /Sample test scenario/);
  });

  test('contains invariant formula referencing all five classification types', () => {
    assert.match(
      reviewLoop,
      /findings_resolved.*findings_new.*findings_unchanged.*findings_downgraded.*findings_upgraded/
    );
  });
});

describe('Cycle Delta — Escalation and Stale Loop coverage (review-loop)', () => {
  test('## Cycle Delta appears exactly 3 times (Sections 7, 8, 8.5)', () => {
    const matches = reviewLoop.match(/## Cycle Delta/g);
    assert.ok(matches, 'Should find ## Cycle Delta headings');
    assert.equal(
      matches.length,
      3,
      `Expected 3 occurrences of "## Cycle Delta" but found ${matches.length}`
    );
  });

  test('Section 8 (Escalation) references Cycle Delta', () => {
    // Verify Cycle Delta appears after Section 8 heading
    const section8Idx = reviewLoop.indexOf('## Section 8: Escalation');
    assert.ok(section8Idx > -1, 'Section 8: Escalation must exist');
    const afterSection8 = reviewLoop.slice(section8Idx);
    assert.match(afterSection8, /## Cycle Delta/);
  });

  test('Section 8.5 (Stale Loop Abort) references Cycle Delta', () => {
    // Verify Cycle Delta appears after Section 8.5 heading
    const section85Idx = reviewLoop.indexOf('## Section 8.5: Stale Loop Abort');
    assert.ok(section85Idx > -1, 'Section 8.5: Stale Loop Abort must exist');
    const afterSection85 = reviewLoop.slice(section85Idx);
    assert.match(afterSection85, /## Cycle Delta/);
  });
});
