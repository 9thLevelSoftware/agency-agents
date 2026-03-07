#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, 'skills', 'agent-registry', 'CATALOG.md');
const AGENTS_DIR = path.join(ROOT, 'agents');

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'the', 'to', 'for', 'of', 'in', 'on', 'with', 'without',
  'need', 'help', 'improving', 'improve', 'our', 'thing', 'please', 'make', 'do',
]);
const SEMANTIC_MAP = {
  scalability: 'performance',
  latency: 'performance',
  throughput: 'performance',
  harden: 'security',
  exploit: 'security',
  vulnerability: 'security',
  a11y: 'accessibility',
  wcag: 'accessibility',
  'screen reader': 'accessibility',
  funnel: 'growth',
  conversion: 'growth',
  'growth loop': 'growth',
  refactor: 'code-quality',
  cleanup: 'code-quality',
  maintainability: 'code-quality',
  onboarding: 'product',
  activation: 'product',
  retention: 'product',
};

const DIVISION_HINTS = {
  engineering: ['code', 'backend', 'frontend', 'api', 'implementation', 'feature', 'refactor', 'deploy'],
  design: ['ui', 'ux', 'visual', 'accessibility', 'design'],
  marketing: ['campaign', 'growth', 'social', 'content', 'acquisition'],
  testing: ['qa', 'test', 'validation', 'verify', 'benchmark'],
  product: ['roadmap', 'prioritization', 'feedback', 'discovery'],
  support: ['operations', 'finance', 'legal', 'reporting', 'infrastructure'],
  'project management': ['coordination', 'timeline', 'program', 'project'],
  'spatial computing': ['visionos', 'xr', 'webxr', 'realitykit', 'metal'],
  specialized: ['orchestrate', 'lsp', 'analytics pipeline'],
};

function normalizeToken(token) {
  return token.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

function parseCatalog() {
  const content = fs.readFileSync(CATALOG_PATH, 'utf8');
  const lines = content.split(/\r?\n/);
  const agents = [];
  let currentDivision = '';

  for (const line of lines) {
    const divisionMatch = line.match(/^###\s+(.+?) Division/);
    if (divisionMatch) {
      currentDivision = divisionMatch[1].trim().toLowerCase();
      continue;
    }

    if (!line.startsWith('| ')) continue;
    if (line.includes('| ID |') || line.includes('|----|')) continue;

    const cols = line.split('|').map((c) => c.trim()).filter(Boolean);
    if (cols.length < 4) continue;
    const id = cols[0];
    if (!/^[a-z0-9-]+$/.test(id)) continue;

    const specialty = cols[2].toLowerCase();
    const taskTypes = cols[3]
      .split(',')
      .map((t) => normalizeToken(t.trim()))
      .filter(Boolean);

    agents.push({
      id,
      division: currentDivision,
      specialty,
      taskTypes,
    });
  }

  return agents;
}

function parseYamlArray(line) {
  const match = line.match(/\[([^\]]*)\]/);
  if (!match) return [];
  return match[1].split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

function parseAgentMetadata() {
  const metadataMap = {};
  let files;
  try {
    files = fs.readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.md'));
  } catch {
    return metadataMap;
  }

  for (const file of files) {
    const id = file.replace(/\.md$/, '');
    let content;
    try {
      content = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8');
    } catch {
      continue;
    }

    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) {
      metadataMap[id] = { languages: [], frameworks: [], artifact_types: [], review_strengths: [] };
      continue;
    }

    const fm = fmMatch[1];
    const fields = { languages: [], frameworks: [], artifact_types: [], review_strengths: [] };
    for (const fieldName of Object.keys(fields)) {
      const re = new RegExp(`^${fieldName}:\\s*(.+)$`, 'm');
      const m = fm.match(re);
      if (m) fields[fieldName] = parseYamlArray(m[1]);
    }
    metadataMap[id] = fields;
  }

  return metadataMap;
}

function metadataScore(agent, concepts, promptLower) {
  if (!agent.metadata) return 0;
  let score = 0;
  const meta = agent.metadata;
  const allFields = [
    { values: meta.languages, exact: 3 },
    { values: meta.frameworks, exact: 3 },
    { values: meta.artifact_types, exact: 2 },
    { values: meta.review_strengths, exact: 2 },
  ];

  for (const concept of concepts) {
    let matched = false;
    for (const field of allFields) {
      if (field.values.includes(concept)) {
        score += field.exact;
        matched = true;
        break;
      }
    }
    if (!matched) {
      for (const field of allFields) {
        if (field.values.some((v) => v.includes(concept) || concept.includes(v))) {
          score += 1;
          break;
        }
      }
    }
  }

  return score;
}

function extractConcepts(prompt) {
  const lower = prompt.toLowerCase();
  const rawTokens = lower.split(/\s+/).map(normalizeToken).filter((token) => token && !STOP_WORDS.has(token));
  const concepts = new Set(rawTokens);

  for (const [source, target] of Object.entries(SEMANTIC_MAP)) {
    if (lower.includes(source)) {
      concepts.add(target);
    }
  }

  return Array.from(concepts);
}

function divisionAlignmentScore(promptLower, division) {
  const hints = DIVISION_HINTS[division] || [];
  for (const hint of hints) {
    if (promptLower.includes(hint)) return 2;
  }
  return 0;
}

function semanticScore(agent, concepts) {
  let score = 0;
  for (const concept of concepts) {
    if (agent.taskTypes.includes(concept)) {
      score += 4;
      continue;
    }
    if (agent.taskTypes.some((tag) => tag.includes(concept) || concept.includes(tag))) {
      score += 2;
      continue;
    }
    if (agent.specialty.includes(concept)) {
      score += 1;
    }
  }
  return score;
}

function heuristicScore(agent, concepts, promptLower) {
  let score = 0;

  for (const concept of concepts) {
    if (agent.taskTypes.includes(concept)) {
      score += 3;
    } else if (agent.taskTypes.some((tag) => tag.includes(concept) || concept.includes(tag))) {
      score += 1;
    } else if (agent.specialty.includes(concept)) {
      score += 1;
    }
  }

  score += divisionAlignmentScore(promptLower, agent.division);
  return score;
}

function isExecutionTask(promptLower) {
  return /(build|implement|code|feature|endpoint|refactor|fix|deploy|migration|service)/.test(promptLower);
}

function hasTestingAgent(candidates) {
  return candidates.some((c) => c.division === 'testing');
}

function needsCoordinator(candidates) {
  const divisions = new Set(candidates.map((c) => c.division));
  return divisions.size >= 2;
}

function classifyConfidence(topCandidate) {
  if (!topCandidate) return 'low';
  const effectiveSemantic = (topCandidate.metadataBoost >= 6)
    ? Math.max(topCandidate.semantic, 4)
    : topCandidate.semantic;
  if (effectiveSemantic >= 6 || (effectiveSemantic >= 4 && topCandidate.heuristic >= 8)) return 'high';
  if (effectiveSemantic >= 2 || topCandidate.heuristic >= 5) return 'medium';
  return 'low';
}

function recommendAgents({ prompt, topN = 4, memoryScores = {} }) {
  const agents = parseCatalog();
  const agentMetadata = parseAgentMetadata();
  const promptLower = prompt.toLowerCase();
  const concepts = extractConcepts(prompt);

  const scored = agents.map((agent) => {
    agent.metadata = agentMetadata[agent.id] || { languages: [], frameworks: [], artifact_types: [], review_strengths: [] };
    const semantic = semanticScore(agent, concepts);
    const heuristic = heuristicScore(agent, concepts, promptLower);
    const baseline = semantic + heuristic;
    const metaBoost = baseline > 0 ? metadataScore(agent, concepts, promptLower) : 0;
    const memoryBoost = baseline > 0 ? Number(memoryScores[agent.id] || 0) : 0;

    return {
      id: agent.id,
      division: agent.division,
      semantic,
      heuristic,
      metadataBoost: metaBoost,
      memoryBoost,
      total: baseline + metaBoost + memoryBoost,
    };
  });

  let shortlist = scored
    .filter((item) => item.semantic > 0)
    .sort((a, b) => {
      if (b.semantic !== a.semantic) return b.semantic - a.semantic;
      if (b.heuristic !== a.heuristic) return b.heuristic - a.heuristic;
      return a.id.localeCompare(b.id);
    })
    .slice(0, 8);

  if (shortlist.length === 0) {
    shortlist = scored
      .sort((a, b) => {
        if (b.heuristic !== a.heuristic) return b.heuristic - a.heuristic;
        return a.id.localeCompare(b.id);
      })
      .slice(0, 8);
  }

  shortlist.sort((a, b) => {
    if (b.semantic !== a.semantic) return b.semantic - a.semantic;
    if (b.total !== a.total) return b.total - a.total;
    if (b.heuristic !== a.heuristic) return b.heuristic - a.heuristic;
    return a.id.localeCompare(b.id);
  });

  const chosen = shortlist.slice(0, topN);

  if (needsCoordinator(chosen) && !chosen.some((c) => ['project-manager-senior', 'project-management-project-shepherd', 'agents-orchestrator'].includes(c.id))) {
    const coordinator = scored.find((c) => ['project-manager-senior', 'project-management-project-shepherd', 'agents-orchestrator'].includes(c.id));
    if (coordinator) {
      const replaceIndex = Math.max(0, chosen.length - 1);
      chosen[replaceIndex] = coordinator;
    }
  }

  if (isExecutionTask(promptLower) && !hasTestingAgent(chosen)) {
    const testing = shortlist.find((c) => c.division === 'testing') || scored.find((c) => c.division === 'testing');
    if (testing) {
      let replaceIndex = -1;
      for (let i = chosen.length - 1; i >= 0; i--) {
        if (!['project-manager-senior', 'project-management-project-shepherd', 'agents-orchestrator'].includes(chosen[i].id)) {
          replaceIndex = i;
          break;
        }
      }
      if (replaceIndex >= 0) {
        chosen[replaceIndex] = testing;
      } else {
        chosen[chosen.length - 1] = testing;
      }
    }
  }

  const uniqueChosen = [];
  const seen = new Set();
  for (const candidate of chosen) {
    if (seen.has(candidate.id)) continue;
    uniqueChosen.push(candidate);
    seen.add(candidate.id);
  }

  while (uniqueChosen.length < Math.min(topN, shortlist.length)) {
    const next = shortlist.find((c) => !seen.has(c.id));
    if (!next) break;
    uniqueChosen.push(next);
    seen.add(next.id);
  }

  const confidence = classifyConfidence(uniqueChosen[0]);

  return {
    prompt,
    concepts,
    confidence,
    lowConfidencePrompt: confidence === 'low'
      ? 'Low-confidence match. Provide preferred domain, platform, or constraints to refine recommendations.'
      : null,
    recommendations: uniqueChosen.map((item) => ({
      id: item.id,
      division: item.division,
      semanticScore: item.semantic,
      heuristicScore: item.heuristic,
      metadataScore: item.metadataBoost,
      memoryBoost: item.memoryBoost,
      totalScore: item.total,
    })),
  };
}

if (require.main === module) {
  const prompt = process.argv.slice(2).join(' ').trim();
  if (!prompt) {
    console.error('Usage: node scripts/recommendation-engine.js "task description"');
    process.exit(1);
  }
  const result = recommendAgents({ prompt });
  console.log(JSON.stringify(result, null, 2));
}

module.exports = {
  recommendAgents,
  parseCatalog,
  parseAgentMetadata,
  metadataScore,
};


