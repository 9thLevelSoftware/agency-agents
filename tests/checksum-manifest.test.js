'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHECKSUMS_FILE = path.join(ROOT, 'checksums.sha256');
const PACKAGE_FILE = path.join(ROOT, 'package.json');

function normalize(filePath) {
  return filePath.split(path.sep).join('/');
}

function collectPublishedEntries() {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_FILE, 'utf8'));
  const include = new Set(pkg.files || []);

  include.add('package.json');

  for (const entry of fs.readdirSync(ROOT)) {
    if (/^README(?:\..+)?$/i.test(entry)) {
      include.add(entry);
    }
  }

  for (const entry of Object.values(pkg.bin || {})) {
    include.add(entry);
  }

  return Array.from(include);
}

function walk(absPath, out) {
  const entries = fs.readdirSync(absPath, { withFileTypes: true });

  for (const entry of entries) {
    const nextPath = path.join(absPath, entry.name);
    if (entry.isDirectory()) {
      walk(nextPath, out);
      continue;
    }

    out.push(normalize(path.relative(ROOT, nextPath)));
  }
}

function collectPublishedFiles() {
  const files = new Set();

  for (const relPath of collectPublishedEntries()) {
    const absPath = path.join(ROOT, relPath);
    if (!fs.existsSync(absPath)) continue;

    if (fs.statSync(absPath).isDirectory()) {
      walk(absPath, {
        push(filePath) {
          files.add(filePath);
        },
      });
      continue;
    }

    files.add(normalize(path.relative(ROOT, absPath)));
  }

  return Array.from(files)
    .filter((filePath) => filePath !== 'checksums.sha256')
    .sort((left, right) => left.localeCompare(right));
}

test('checksums manifest matches the published package file set', () => {
  const lines = fs.readFileSync(CHECKSUMS_FILE, 'utf8').trim().split(/\r?\n/);
  const actualPaths = [];

  for (const line of lines) {
    assert.match(line, /^[a-f0-9]{64}  .+$/, `invalid checksum line: ${line}`);
    actualPaths.push(line.split('  ', 2)[1]);
  }

  assert.deepEqual(
    actualPaths,
    [...actualPaths].sort((left, right) => left.localeCompare(right)),
    'checksum paths must stay sorted'
  );
  assert.equal(
    new Set(actualPaths).size,
    actualPaths.length,
    'checksum manifest must not contain duplicate paths'
  );
  assert.deepEqual(
    actualPaths,
    collectPublishedFiles(),
    'checksum manifest must track the published npm package contents'
  );
});
