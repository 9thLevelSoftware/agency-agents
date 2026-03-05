'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const { generateDryRunReport } = require(path.join(ROOT, 'scripts', 'dry-run-report.js'));

function fixture(name) {
  return path.join(ROOT, 'tests', 'fixtures', 'dry-run', name);
}

function snapshotTree(rootDir) {
  const entries = [];
  function walk(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const item of items) {
      const abs = path.join(dir, item.name);
      const rel = path.relative(rootDir, abs).replace(/\\/g, '/');
      if (item.isDirectory()) {
        entries.push({ rel, type: 'dir' });
        walk(abs);
      } else {
        const stat = fs.statSync(abs);
        entries.push({ rel, type: 'file', size: stat.size, mtimeMs: stat.mtimeMs });
      }
    }
  }
  walk(rootDir);
  return entries;
}

function assertDeterministicNoSideEffects(input) {
  const before = snapshotTree(input.projectPath);
  const first = generateDryRunReport(input);
  const second = generateDryRunReport(input);
  const after = snapshotTree(input.projectPath);

  assert.deepEqual(first, second, 'dry-run report should be deterministic');
  assert.deepEqual(before, after, 'dry-run should not modify filesystem state');

  return first;
}

test('dry-run fixture suite: success and failure prerequisites', () => {
  const planOk = assertDeterministicNoSideEffects({ command: 'plan', projectPath: fixture('ok'), phase: 1 });
  assert.equal(planOk.success, true);

  const planFail = assertDeterministicNoSideEffects({ command: 'plan', projectPath: fixture('missing-roadmap'), phase: 1 });
  assert.equal(planFail.success, false);

  const buildOk = assertDeterministicNoSideEffects({ command: 'build', projectPath: fixture('ok'), phase: 1 });
  assert.equal(buildOk.success, true);

  const buildFail = assertDeterministicNoSideEffects({ command: 'build', projectPath: fixture('missing-plans'), phase: 1 });
  assert.equal(buildFail.success, false);

  const reviewOk = assertDeterministicNoSideEffects({ command: 'review', projectPath: fixture('ok'), phase: 1 });
  assert.equal(reviewOk.success, true);

  const reviewFail = assertDeterministicNoSideEffects({ command: 'review', projectPath: fixture('missing-summaries'), phase: 1 });
  assert.equal(reviewFail.success, false);

  const statusOk = assertDeterministicNoSideEffects({ command: 'status', projectPath: fixture('ok'), phase: 1 });
  assert.equal(statusOk.success, true);

  const statusFail = assertDeterministicNoSideEffects({ command: 'status', projectPath: fixture('missing-project'), phase: 1 });
  assert.equal(statusFail.success, false);
});
