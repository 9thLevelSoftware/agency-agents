'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const { recommendAgents, parseAgentMetadata, metadataScore } = require(path.join(ROOT, 'scripts', 'recommendation-engine.js'));

const cases = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'recommendation', 'cases.json'), 'utf8')
);

test('semantic-first recommendation fixtures', async (t) => {
  for (const fixture of cases) {
    await t.test(fixture.name, () => {
      const result = recommendAgents({ prompt: fixture.prompt, topN: 4 });
      const ids = result.recommendations.map((r) => r.id);

      assert.equal(result.confidence, fixture.expectedConfidence);
      assert.equal(ids[0], fixture.expectedTop);

      for (const mustInclude of fixture.mustInclude) {
        assert.ok(ids.includes(mustInclude), `${fixture.name} should include ${mustInclude}`);
      }

      if (fixture.expectedConfidence === 'low') {
        assert.ok(result.lowConfidencePrompt, 'low-confidence recommendation should include fallback guidance');
      }
    });
  }
});

test('metadata score is present in recommendation output', () => {
  const result = recommendAgents({ prompt: 'Build a React TypeScript frontend', topN: 4 });
  for (const rec of result.recommendations) {
    assert.equal(typeof rec.metadataScore, 'number', `${rec.id} should have numeric metadataScore`);
  }
});

test('technology-specific prompts produce higher confidence than generic prompts', () => {
  const specific = recommendAgents({ prompt: 'Build a Laravel PHP application with Livewire components', topN: 4 });
  const generic = recommendAgents({ prompt: 'Build an application', topN: 4 });
  const specificTop = specific.recommendations[0];
  const genericTop = generic.recommendations[0];
  assert.ok(
    specificTop.totalScore > genericTop.totalScore,
    'technology-specific prompt should produce higher total score than generic prompt'
  );
});

test('metadata scoring does not override semantic relevance', () => {
  const result = recommendAgents({ prompt: 'Build a scalable backend API and reduce latency under load', topN: 4 });
  assert.equal(result.recommendations[0].id, 'engineering-backend-architect');
  assert.ok(result.recommendations[0].semanticScore > 0, 'top recommendation should have semantic score > 0');
});

test('parseAgentMetadata returns metadata for known agents', () => {
  const metadata = parseAgentMetadata();
  assert.ok(metadata['engineering-backend-architect'], 'should have backend architect metadata');
  assert.ok(metadata['engineering-backend-architect'].languages.includes('javascript'));
  assert.ok(metadata['engineering-backend-architect'].frameworks.includes('express'));
});

test('metadataScore scores exact matches correctly', () => {
  const agent = {
    metadata: {
      languages: ['python', 'javascript'],
      frameworks: ['django', 'fastapi'],
      artifact_types: ['api-designs'],
      review_strengths: ['security'],
    },
  };
  const score = metadataScore(agent, ['python', 'django'], '');
  assert.equal(score, 6, 'exact language + framework match should score 6');
});

test('memory boost is additive and does not remove mandatory testing role', () => {
  const result = recommendAgents({
    prompt: 'Implement a new backend feature and deploy API changes',
    topN: 4,
    memoryScores: {
      'marketing-growth-hacker': 5,
      'marketing-content-creator': 5,
    },
  });

  const hasTesting = result.recommendations.some((r) => r.division === 'testing');
  assert.ok(hasTesting, 'execution recommendations must include at least one testing agent');
});
