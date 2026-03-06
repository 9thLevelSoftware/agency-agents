'use strict';

/**
 * Observability Summary Tests (Phase 4, OBS-01)
 * Validates Agent Selection Rationale, Phase Decision Summary,
 * Score Export structure, and graceful degradation for observability.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

describe('Observability Summary — Agent Selection Rationale (wave-executor)', () => {
  const waveExecutor = fs.readFileSync(
    path.join(ROOT, 'skills', 'wave-executor', 'SKILL.md'),
    'utf8'
  );

  test('Agent Selection Rationale section exists as heading', () => {
    assert.match(waveExecutor, /## Agent Selection Rationale/);
  });

  test('candidate comparison table has required headers', () => {
    assert.match(waveExecutor, /Candidate/);
    assert.match(waveExecutor, /Semantic/);
    assert.match(waveExecutor, /Heuristic/);
    assert.match(waveExecutor, /Memory/);
    assert.match(waveExecutor, /Total/);
    assert.match(waveExecutor, /Source/);
  });

  test('contains Task type detected field', () => {
    assert.match(waveExecutor, /Task type detected/);
  });

  test('contains Confidence field', () => {
    assert.match(waveExecutor, /Confidence/);
  });

  test('contains Adapter field', () => {
    assert.match(waveExecutor, /Adapter/);
  });

  test('contains Model tier field', () => {
    assert.match(waveExecutor, /Model tier/);
  });
});

describe('Observability Summary — Phase Decision Summary (wave-executor)', () => {
  const waveExecutor = fs.readFileSync(
    path.join(ROOT, 'skills', 'wave-executor', 'SKILL.md'),
    'utf8'
  );

  test('Phase Decision Summary section exists', () => {
    assert.match(waveExecutor, /Phase Decision Summary/);
  });

  test('references decision_capture', () => {
    assert.match(waveExecutor, /decision_capture/);
  });

  test('decision summary table has required headers', () => {
    assert.match(waveExecutor, /Plan/);
    assert.match(waveExecutor, /Agent/);
    assert.match(waveExecutor, /Confidence/);
    assert.match(waveExecutor, /Adapter/);
    assert.match(waveExecutor, /Model Tier/);
    assert.match(waveExecutor, /Escalations/);
  });
});

describe('Observability Summary — Score Export (agent-registry)', () => {
  const agentRegistry = fs.readFileSync(
    path.join(ROOT, 'skills', 'agent-registry', 'SKILL.md'),
    'utf8'
  );

  test('Score Export section exists', () => {
    assert.match(agentRegistry, /### Score Export/);
  });

  test('contains score_export structure', () => {
    assert.match(agentRegistry, /score_export/);
  });

  test('contains semantic_score field', () => {
    assert.match(agentRegistry, /semantic_score/);
  });

  test('contains heuristic_score field', () => {
    assert.match(agentRegistry, /heuristic_score/);
  });

  test('contains memory_boost field', () => {
    assert.match(agentRegistry, /memory_boost/);
  });

  test('contains total_score field', () => {
    assert.match(agentRegistry, /total_score/);
  });

  test('contains recommendation_source field', () => {
    assert.match(agentRegistry, /recommendation_source/);
  });
});

describe('Observability Summary — Graceful degradation (wave-executor)', () => {
  const waveExecutor = fs.readFileSync(
    path.join(ROOT, 'skills', 'wave-executor', 'SKILL.md'),
    'utf8'
  );

  test('contains guidance to omit rationale for autonomous tasks', () => {
    assert.match(waveExecutor, /omit/i);
    assert.match(waveExecutor, /autonomous/i);
  });

  test('omission applies when autonomous is true', () => {
    assert.match(waveExecutor, /autonomous.*true/i);
  });
});

describe('Observability Summary — Score Data for Observability (phase-decomposer)', () => {
  const phaseDecomposer = fs.readFileSync(
    path.join(ROOT, 'skills', 'phase-decomposer', 'SKILL.md'),
    'utf8'
  );

  test('Score Data for Observability section exists', () => {
    assert.match(phaseDecomposer, /Score Data for Observability/);
  });

  test('references score_export structure', () => {
    assert.match(phaseDecomposer, /score_export/);
  });
});
