'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function parseExecutionContext(commandFileRel) {
  const body = fs.readFileSync(path.join(ROOT, commandFileRel), 'utf8');
  const match = body.match(/<execution_context>([\s\S]*?)<\/execution_context>/);
  if (!match) return [];
  return match[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function skillBytes(skillRel) {
  const abs = path.join(ROOT, skillRel);
  if (!fs.existsSync(abs)) return 0;
  return fs.statSync(abs).size;
}

test('always-load command context budgets stay under hard ceilings', () => {
  const hardBudgetsKb = {
    'commands/build.md': 225,
    'commands/plan.md': 225,
    'commands/review.md': 225,
    'commands/status.md': 150,
  };

  for (const [commandRel, hardKb] of Object.entries(hardBudgetsKb)) {
    const skills = parseExecutionContext(commandRel);
    const totalBytes = skills.reduce((sum, rel) => sum + skillBytes(rel), 0);
    const totalKb = totalBytes / 1024;
    assert.ok(totalKb <= hardKb, `${commandRel} exceeds hard budget (${totalKb.toFixed(1)}KB > ${hardKb}KB)`);
  }
});
