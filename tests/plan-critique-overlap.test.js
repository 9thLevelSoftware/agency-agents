'use strict';

/**
 * Plan Critique — Wave File Overlap Detection Tests (v6.0)
 * Validates cross-plan overlap detection for plans in the same wave.
 * Requirement: DSC-04
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const FIXTURES = path.join(__dirname, 'fixtures', 'plans-wave-overlap');

// --- YAML frontmatter parser (same pattern as plan-schema-conformance.test.js) ---

function parseYamlFrontmatter(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);

  let start = -1;
  let end = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      if (start === -1) { start = i; }
      else { end = i; break; }
    }
  }
  if (start === -1 || end === -1) {
    throw new Error(`No YAML frontmatter found in ${filePath}`);
  }

  const fm = {};
  let currentKey = null;
  let currentArray = null;

  for (let i = start + 1; i < end; i++) {
    const line = lines[i];
    if (line.trim() === '' || line.trim().startsWith('#')) continue;

    const topMatch = line.match(/^([a-z_]+):\s*(.*)/);
    if (topMatch && !line.startsWith(' ')) {
      if (currentArray && currentKey) {
        fm[currentKey] = currentArray;
        currentArray = null;
      }

      currentKey = topMatch[1];
      const val = topMatch[2].trim();

      if (val === '' || val === '[]') {
        if (val === '[]') {
          fm[currentKey] = [];
          currentKey = null;
        }
      } else if (val === 'true') {
        fm[currentKey] = true; currentKey = null;
      } else if (val === 'false') {
        fm[currentKey] = false; currentKey = null;
      } else if (/^\d+$/.test(val)) {
        fm[currentKey] = parseInt(val, 10); currentKey = null;
      } else if (val.startsWith('[') && val.endsWith(']')) {
        const inner = val.slice(1, -1).trim();
        fm[currentKey] = inner ? inner.split(',').map(s => s.trim().replace(/^"|"$/g, '')) : [];
        currentKey = null;
      } else {
        fm[currentKey] = val.replace(/^"|"$/g, '');
        currentKey = null;
      }
      continue;
    }

    if (!currentKey) continue;

    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      if (!currentArray) currentArray = [];
      currentArray.push(trimmed.slice(2).replace(/^"|"$/g, ''));
      continue;
    }
  }

  if (currentArray && currentKey) {
    fm[currentKey] = currentArray;
  }

  return fm;
}

// --- Wave overlap detection function ---

/**
 * Detects file overlaps between plans in the same wave.
 * @param {Array<{planId: string, wave: number, filesModified: string[]}>} plans
 * @returns {Array<{severity: string, planA: string, planB: string, file: string, wave: number, message: string}>}
 */
function detectWaveOverlaps(plans) {
  // Group by wave
  const waveMap = new Map();
  for (const plan of plans) {
    if (!waveMap.has(plan.wave)) {
      waveMap.set(plan.wave, []);
    }
    waveMap.get(plan.wave).push(plan);
  }

  const findings = [];

  for (const [wave, wavePlans] of waveMap) {
    if (wavePlans.length < 2) continue;

    // Check each pair
    for (let i = 0; i < wavePlans.length; i++) {
      for (let j = i + 1; j < wavePlans.length; j++) {
        const a = wavePlans[i];
        const b = wavePlans[j];
        const filesA = a.filesModified || [];
        const filesB = b.filesModified || [];

        for (const fileA of filesA) {
          for (const fileB of filesB) {
            let overlap = false;

            // Exact match
            if (fileA === fileB) {
              overlap = true;
            }
            // Directory prefix: fileA is a directory covering fileB
            else if (fileA.endsWith('/') && fileB.startsWith(fileA)) {
              overlap = true;
            }
            // Reverse directory: fileB is a directory covering fileA
            else if (fileB.endsWith('/') && fileA.startsWith(fileB)) {
              overlap = true;
            }

            if (overlap) {
              const overlapFile = fileA === fileB ? fileA : (fileA.endsWith('/') ? fileA : fileB);
              findings.push({
                severity: 'BLOCKER',
                planA: a.planId,
                planB: b.planId,
                file: overlapFile,
                wave,
                message: `Plans ${a.planId} and ${b.planId} both modify ${overlapFile} in Wave ${wave}`,
              });
            }
          }
        }
      }
    }
  }

  return findings;
}

// --- Tests ---

describe('Wave File Overlap Detection (DSC-04)', () => {

  test('1. Overlap detected — plans A and B in same wave share a file', () => {
    const plans = [
      { planId: '99-01', wave: 1, filesModified: ['skills/foo/SKILL.md', 'skills/bar/SKILL.md'] },
      { planId: '99-02', wave: 1, filesModified: ['skills/foo/SKILL.md', 'tests/new-test.js'] },
    ];
    const findings = detectWaveOverlaps(plans);
    assert.ok(findings.length >= 1, 'Should find at least 1 overlap');
    assert.equal(findings[0].severity, 'BLOCKER');
    assert.equal(findings[0].file, 'skills/foo/SKILL.md');
    assert.equal(findings[0].planA, '99-01');
    assert.equal(findings[0].planB, '99-02');
    assert.equal(findings[0].wave, 1);
  });

  test('2. No overlap — plans A and C in same wave share no files', () => {
    const plans = [
      { planId: '99-01', wave: 1, filesModified: ['skills/foo/SKILL.md', 'skills/bar/SKILL.md'] },
      { planId: '99-03', wave: 1, filesModified: ['commands/new-command.md'] },
    ];
    const findings = detectWaveOverlaps(plans);
    assert.equal(findings.length, 0, 'Should find no overlaps');
  });

  test('3. Multiple overlaps — two plans share 2+ files', () => {
    const plans = [
      { planId: '99-01', wave: 1, filesModified: ['skills/foo/SKILL.md', 'skills/bar/SKILL.md'] },
      { planId: '99-02', wave: 1, filesModified: ['skills/foo/SKILL.md', 'skills/bar/SKILL.md'] },
    ];
    const findings = detectWaveOverlaps(plans);
    assert.equal(findings.length, 2, 'Should find 2 overlaps (one per shared file)');
    const files = findings.map(f => f.file).sort();
    assert.deepEqual(files, ['skills/bar/SKILL.md', 'skills/foo/SKILL.md']);
  });

  test('4. Directory prefix matching — directory entry covers file', () => {
    const plans = [
      { planId: '99-01', wave: 1, filesModified: ['skills/foo/SKILL.md'] },
      { planId: '99-02', wave: 1, filesModified: ['skills/foo/'] },
    ];
    const findings = detectWaveOverlaps(plans);
    assert.ok(findings.length >= 1, 'Directory prefix should trigger overlap');
    assert.equal(findings[0].severity, 'BLOCKER');
  });

  test('5. Cross-wave no overlap — same file in different waves is OK', () => {
    const plans = [
      { planId: '99-01', wave: 1, filesModified: ['skills/foo/SKILL.md'] },
      { planId: '99-02', wave: 2, filesModified: ['skills/foo/SKILL.md'] },
    ];
    const findings = detectWaveOverlaps(plans);
    assert.equal(findings.length, 0, 'Different waves should not trigger overlap');
  });

  test('6. Single plan wave — no overlap possible', () => {
    const plans = [
      { planId: '99-01', wave: 1, filesModified: ['skills/foo/SKILL.md'] },
    ];
    const findings = detectWaveOverlaps(plans);
    assert.equal(findings.length, 0, 'Single plan wave cannot have overlaps');
  });

  test('7. Empty files_modified — no overlap possible', () => {
    const plans = [
      { planId: '99-01', wave: 1, filesModified: ['skills/foo/SKILL.md'] },
      { planId: '99-02', wave: 1, filesModified: [] },
    ];
    const findings = detectWaveOverlaps(plans);
    assert.equal(findings.length, 0, 'Empty files_modified cannot overlap');
  });

  test('8. Three plans pairwise — A overlaps B but not C', () => {
    const plans = [
      { planId: '99-01', wave: 1, filesModified: ['skills/foo/SKILL.md', 'skills/bar/SKILL.md'] },
      { planId: '99-02', wave: 1, filesModified: ['skills/foo/SKILL.md', 'tests/new-test.js'] },
      { planId: '99-03', wave: 1, filesModified: ['commands/new-command.md'] },
    ];
    const findings = detectWaveOverlaps(plans);
    assert.equal(findings.length, 1, 'Should find exactly 1 overlap (A-B on skills/foo/SKILL.md)');
    assert.equal(findings[0].planA, '99-01');
    assert.equal(findings[0].planB, '99-02');
    assert.equal(findings[0].file, 'skills/foo/SKILL.md');
  });

  describe('Fixture-based tests', () => {
    test('fixtures parse correctly and detect overlap between plan-a and plan-b', () => {
      const fmA = parseYamlFrontmatter(path.join(FIXTURES, 'wave1-plan-a.md'));
      const fmB = parseYamlFrontmatter(path.join(FIXTURES, 'wave1-plan-b.md'));
      const fmC = parseYamlFrontmatter(path.join(FIXTURES, 'wave1-plan-c-no-overlap.md'));

      const plans = [
        { planId: `${fmA.phase}-${fmA.plan}`, wave: fmA.wave, filesModified: fmA.files_modified || [] },
        { planId: `${fmB.phase}-${fmB.plan}`, wave: fmB.wave, filesModified: fmB.files_modified || [] },
        { planId: `${fmC.phase}-${fmC.plan}`, wave: fmC.wave, filesModified: fmC.files_modified || [] },
      ];

      const findings = detectWaveOverlaps(plans);
      assert.equal(findings.length, 1, 'Plan A and B overlap on skills/foo/SKILL.md');
      assert.equal(findings[0].severity, 'BLOCKER');
      assert.ok(findings[0].message.includes('skills/foo/SKILL.md'));
    });
  });
});
