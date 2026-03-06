'use strict';

/*
 * Agent Metadata Schema (Phase 5: Agent Metadata Enrichment)
 *
 * Four required frontmatter fields for every agent:
 *
 *   languages:        [string]  — Programming or markup languages the agent works with.
 *                                 Non-technical agents use [markdown] or [markdown, yaml].
 *   frameworks:       [string]  — Frameworks, libraries, or tools the agent uses.
 *                                 Non-technical agents list domain-specific tools.
 *   artifact_types:   [string]  — Types of outputs the agent produces.
 *   review_strengths: [string]  — What the agent is best at reviewing.
 *
 * Constraints:
 *   - All 4 fields required (minimum 1 value each)
 *   - Values must be lowercase, hyphenated: /^[a-z0-9-]+$/
 *   - Maximum 8 values per field
 *   - Values must be specific to the agent, not generic
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const AGENTS_DIR = path.join(ROOT, 'agents');
const CATALOG_PATH = path.join(ROOT, 'skills', 'agent-registry', 'CATALOG.md');

const SECTION_PATTERNS = [
  [/^## .*Identity/im, 'identity section'],
  [/^## .*(Core Mission|Mission)/im, 'mission section'],
  [/^## .*(Critical Rules|Rules You Must Follow)/im, 'critical-rules section'],
  [/^## .*(Technical Deliverables|Workflow Process|Implementation Process|Execution Process|Deliverables|Process)/im, 'deliverables/process section'],
  [/^## .*(Anti-Patterns|What You Must Not Do|Common Rationalizations|Failure Modes)/im, 'anti-patterns section'],
  [/^## .*(Done Criteria|Success Criteria|Definition of Done|Completion Criteria|Exit Criteria)/im, 'done-criteria section'],
];

function listAgents() {
  return fs.readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.md')).sort();
}

test('agent contract: 53 agents, minimum size, and required sections', () => {
  const files = listAgents();
  assert.equal(files.length, 53, 'expected 53 built-in agent files');

  for (const file of files) {
    const fullPath = path.join(AGENTS_DIR, file);
    const text = fs.readFileSync(fullPath, 'utf8');
    const lines = text.split(/\r?\n/).length;

    assert.ok(lines >= 80, `${file} must be at least 80 lines`);

    for (const [pattern, label] of SECTION_PATTERNS) {
      assert.match(text, pattern, `${file} missing ${label}`);
    }
  }
});

const METADATA_FIELDS = ['languages', 'frameworks', 'artifact_types', 'review_strengths'];
const VALUE_PATTERN = /^[a-z0-9-]+$/;

function parseFrontmatter(text) {
  const parts = text.split(/^---\s*$/m);
  if (parts.length < 3) return {};
  const block = parts[1];
  const result = {};
  for (const field of METADATA_FIELDS) {
    const match = block.match(new RegExp(`^${field}:\\s*\\[(.+)\\]`, 'm'));
    result[field] = match ? match[1].split(',').map((v) => v.trim()) : null;
  }
  return result;
}

test('agent contract: metadata fields valid when present', () => {
  const files = listAgents();
  for (const file of files) {
    const text = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8');
    const meta = parseFrontmatter(text);
    for (const field of METADATA_FIELDS) {
      if (meta[field] === null) continue; // skip if absent
      assert.ok(Array.isArray(meta[field]) && meta[field].length >= 1,
        `${file}: ${field} must be a non-empty array`);
      assert.ok(meta[field].length <= 8,
        `${file}: ${field} must have at most 8 values (has ${meta[field].length})`);
      for (const val of meta[field]) {
        assert.match(val, VALUE_PATTERN,
          `${file}: ${field} value "${val}" must be lowercase hyphenated`);
      }
    }
  }
});

test('agent contract: all 53 agents have metadata (completeness gate)', () => {
  const files = listAgents();
  const missing = [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8');
    const meta = parseFrontmatter(text);
    for (const field of METADATA_FIELDS) {
      if (meta[field] === null) {
        missing.push(`${file}: missing ${field}`);
      }
    }
  }
  assert.equal(missing.length, 0,
    `${missing.length} metadata fields missing across agents:\n  ${missing.join('\n  ')}`);
});

test('split-role integrity: generalist senior + laravel specialist', () => {
  const senior = fs.readFileSync(path.join(AGENTS_DIR, 'engineering-senior-developer.md'), 'utf8').toLowerCase();
  const laravel = fs.readFileSync(path.join(AGENTS_DIR, 'engineering-laravel-specialist.md'), 'utf8').toLowerCase();
  const catalog = fs.readFileSync(CATALOG_PATH, 'utf8');

  assert.ok(!senior.includes('fluxui') && !senior.includes('livewire'), 'engineering-senior-developer should remain stack-agnostic');
  assert.ok(laravel.includes('laravel') && laravel.includes('livewire'), 'engineering-laravel-specialist should retain framework specialization');

  assert.ok(catalog.includes('engineering-senior-developer'), 'catalog must include engineering-senior-developer');
  assert.ok(catalog.includes('engineering-laravel-specialist'), 'catalog must include engineering-laravel-specialist');
});
