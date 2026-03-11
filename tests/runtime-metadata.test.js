'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  SUPPORT_TIERS,
  RUNTIME_METADATA,
  RUNTIME_ORDER,
} = require('../bin/runtime-metadata');

const ROOT = path.resolve(__dirname, '..');
const ADAPTERS_DIR = path.join(ROOT, 'adapters');
const README = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const RUNTIME_AUDIT = fs.readFileSync(path.join(ROOT, 'docs', 'runtime-audit.md'), 'utf8');
const CERTIFICATION = fs.readFileSync(
  path.join(ROOT, 'docs', 'runtime-certification-checklists.md'),
  'utf8'
);

function parseFrontmatter(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, `${filePath}: missing YAML frontmatter`);

  const frontmatter = {};
  let currentNested = null;

  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    if (currentNested && /^  /.test(rawLine)) {
      const nested = line.trim().match(/^([a-z][a-z0-9_-]*):\s*(.*)$/);
      if (nested) {
        let value = nested[2].trim().replace(/^"|"$/g, '');
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        frontmatter[currentNested][nested[1]] = value;
      }
      continue;
    }

    currentNested = null;
    const topLevel = line.match(/^([a-z][a-z0-9_-]*):\s*(.*)$/);
    if (!topLevel) continue;
    const [, key, rawValue] = topLevel;
    if (key === 'capabilities' || key === 'detection') {
      frontmatter[key] = {};
      currentNested = key;
      continue;
    }
    frontmatter[key] = rawValue.trim().replace(/^"|"$/g, '');
  }

  return frontmatter;
}

test('runtime metadata has complete evidence-backed contracts', () => {
  for (const runtimeKey of RUNTIME_ORDER) {
    const runtime = RUNTIME_METADATA[runtimeKey];

    assert.equal(runtime.key, runtimeKey, `${runtimeKey}: key mismatch`);
    assert.ok(runtime.flag.startsWith('--'), `${runtimeKey}: flag should be a CLI flag`);
    assert.ok(SUPPORT_TIERS.includes(runtime.supportTier), `${runtimeKey}: invalid support tier`);
    assert.equal(typeof runtime.disposition, 'string', `${runtimeKey}: disposition should be a string`);
    assert.equal(typeof runtime.installSurface, 'string', `${runtimeKey}: installSurface should be a string`);
    assert.equal(typeof runtime.scopeSupport.local, 'boolean', `${runtimeKey}: local scopeSupport missing`);
    assert.equal(typeof runtime.scopeSupport.global, 'boolean', `${runtimeKey}: global scopeSupport missing`);
    assert.ok(fs.existsSync(path.join(ADAPTERS_DIR, runtime.adapterFile)), `${runtimeKey}: adapter file missing`);

    if (runtimeKey !== 'claude') {
      assert.ok(runtime.evidence.length > 0, `${runtimeKey}: evidence links are required`);
      for (const item of runtime.evidence) {
        assert.match(item.url, /^https:\/\//, `${runtimeKey}: evidence url must be https`);
        assert.equal(item.verifiedOn, '2026-03-11', `${runtimeKey}: verifiedOn must be current audit date`);
      }
    }
  }
});

test('adapter frontmatter matches runtime metadata', () => {
  for (const runtimeKey of RUNTIME_ORDER) {
    const runtime = RUNTIME_METADATA[runtimeKey];
    const adapterPath = path.join(ADAPTERS_DIR, runtime.adapterFile);
    const frontmatter = parseFrontmatter(adapterPath);

    assert.equal(
      frontmatter.cli_display_name,
      runtime.label,
      `${runtimeKey}: adapter display name must match runtime metadata`
    );
    assert.equal(
      frontmatter.support_tier,
      runtime.supportTier,
      `${runtimeKey}: adapter support tier must match runtime metadata`
    );
  }
});

test('README, runtime audit, and certification docs stay in sync with runtime metadata', () => {
  for (const runtimeKey of RUNTIME_ORDER) {
    const runtime = RUNTIME_METADATA[runtimeKey];

    assert.ok(
      README.includes(runtime.label),
      `${runtimeKey}: README should mention the runtime label`
    );
    assert.ok(
      RUNTIME_AUDIT.includes(runtime.label),
      `${runtimeKey}: runtime audit should mention the runtime label`
    );
    assert.ok(
      CERTIFICATION.includes(runtime.label.replace(' (formerly Amazon Q Developer CLI)', '')),
      `${runtimeKey}: certification checklist should mention the runtime`
    );

    for (const item of runtime.evidence) {
      assert.ok(
        RUNTIME_AUDIT.includes(item.url),
        `${runtimeKey}: runtime audit should include ${item.url}`
      );
    }
  }

  assert.ok(README.includes('--kiro'), 'README should advertise the --kiro flag');
  assert.ok(README.includes('Deprecated alias for `--kiro`'), 'README should mention the deprecated --amazon-q alias');
  assert.ok(README.includes('manual-only'), 'README should mention manual-only runtimes');
});
