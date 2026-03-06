'use strict';

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

test('split-role integrity: generalist senior + laravel specialist', () => {
  const senior = fs.readFileSync(path.join(AGENTS_DIR, 'engineering-senior-developer.md'), 'utf8').toLowerCase();
  const laravel = fs.readFileSync(path.join(AGENTS_DIR, 'engineering-laravel-specialist.md'), 'utf8').toLowerCase();
  const catalog = fs.readFileSync(CATALOG_PATH, 'utf8');

  assert.ok(!senior.includes('fluxui') && !senior.includes('livewire'), 'engineering-senior-developer should remain stack-agnostic');
  assert.ok(laravel.includes('laravel') && laravel.includes('livewire'), 'engineering-laravel-specialist should retain framework specialization');

  assert.ok(catalog.includes('engineering-senior-developer'), 'catalog must include engineering-senior-developer');
  assert.ok(catalog.includes('engineering-laravel-specialist'), 'catalog must include engineering-laravel-specialist');
});
