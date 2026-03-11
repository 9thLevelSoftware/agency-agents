#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT, 'checksums.sha256');

function readPackageJson() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
}

function collectPublishedEntries() {
  const pkg = readPackageJson();
  const include = new Set(pkg.files || []);

  // npm always packs package metadata and README files, even when they are
  // omitted from the "files" allowlist.
  include.add('package.json');

  for (const entry of fs.readdirSync(ROOT)) {
    if (/^README(?:\..+)?$/i.test(entry)) {
      include.add(entry);
    }
  }

  const bins = Object.values(pkg.bin || {});
  for (const entry of bins) {
    include.add(entry);
  }

  return Array.from(include);
}

function normalize(filePath) {
  return filePath.split(path.sep).join('/');
}

function hashFile(filePath) {
  const buf = fs.readFileSync(filePath);
  // Normalize CRLF to LF so checksums are identical on Windows and Linux
  const normalized = Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'));
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function walk(dirPath, out) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(abs, out);
    } else {
      out.push(abs);
    }
  }
}

function collectFiles() {
  const files = [];

  for (const rel of collectPublishedEntries()) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;

    if (fs.statSync(abs).isDirectory()) {
      walk(abs, files);
    } else {
      files.push(abs);
    }
  }

  const uniqueFiles = new Map();

  for (const abs of files) {
    const rel = normalize(path.relative(ROOT, abs));
    if (path.basename(rel) === 'checksums.sha256') continue;
    if (!uniqueFiles.has(rel)) {
      uniqueFiles.set(rel, abs);
    }
  }

  return Array.from(uniqueFiles.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, abs]) => abs);
}

function main() {
  const files = collectFiles();
  const lines = files.map((abs) => {
    const rel = normalize(path.relative(ROOT, abs));
    const hash = hashFile(abs);
    return `${hash}  ${rel}`;
  });

  fs.writeFileSync(OUTPUT_FILE, lines.join('\n') + '\n');
  console.log(`Wrote ${lines.length} checksums to ${OUTPUT_FILE}`);
}

main();
