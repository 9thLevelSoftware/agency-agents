'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const { recommendAgents } = require(path.join(ROOT, 'scripts', 'recommendation-engine.js'));

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
