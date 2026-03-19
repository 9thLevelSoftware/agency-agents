'use strict';

/**
 * Dispatch Conformance Tests
 *
 * Part 1: Validates board, dispatch, and enhanced review settings in schema and settings.json
 * Part 2: Validates dispatch-capable adapter .md files contain valid Dispatch Configuration sections
 */

const { describe, test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA_PATH = path.join(ROOT, 'docs', 'settings.schema.json');
const SETTINGS_PATH = path.join(ROOT, 'settings.json');
const ADAPTERS_DIR = path.join(ROOT, 'adapters');

function loadJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// ============================================================
// Part 1: Settings Schema Conformance
// ============================================================

// 1. Schema — board property
describe('Schema: board property', () => {
  let schema;

  before(() => {
    schema = loadJSON(SCHEMA_PATH);
  });

  test('schema defines board property (type object)', () => {
    assert.ok(schema.properties.board, 'schema should define board property');
    assert.strictEqual(schema.properties.board.type, 'object');
  });
});

// 2. Schema — dispatch property
describe('Schema: dispatch property', () => {
  let schema;

  before(() => {
    schema = loadJSON(SCHEMA_PATH);
  });

  test('schema defines dispatch property (type object)', () => {
    assert.ok(schema.properties.dispatch, 'schema should define dispatch property');
    assert.strictEqual(schema.properties.dispatch.type, 'object');
  });
});

// 3. Schema — review.evaluator_depth
describe('Schema: review.evaluator_depth', () => {
  let schema;

  before(() => {
    schema = loadJSON(SCHEMA_PATH);
  });

  test('schema defines review.evaluator_depth', () => {
    const reviewProps = schema.properties.review.properties;
    assert.ok(reviewProps.evaluator_depth, 'schema.review should define evaluator_depth');
    assert.strictEqual(reviewProps.evaluator_depth.type, 'string');
    assert.deepStrictEqual(reviewProps.evaluator_depth.enum, ['single', 'multi-pass']);
  });
});

// 4. Schema — review.coverage_thresholds
describe('Schema: review.coverage_thresholds', () => {
  let schema;

  before(() => {
    schema = loadJSON(SCHEMA_PATH);
  });

  test('schema defines review.coverage_thresholds', () => {
    const reviewProps = schema.properties.review.properties;
    assert.ok(reviewProps.coverage_thresholds, 'schema.review should define coverage_thresholds');
    assert.strictEqual(reviewProps.coverage_thresholds.type, 'object');
  });
});

// 5. Settings — board defaults
describe('Settings: board defaults', () => {
  let settings;

  before(() => {
    settings = loadJSON(SETTINGS_PATH);
  });

  test('settings.json has board section with default_size: 5', () => {
    assert.ok(settings.board, 'settings.json should have board section');
    assert.strictEqual(settings.board.default_size, 5);
  });

  test('settings.json board has min_size: 3', () => {
    assert.strictEqual(settings.board.min_size, 3);
  });

  test('settings.json board has discussion_rounds: 2', () => {
    assert.strictEqual(settings.board.discussion_rounds, 2);
  });

  test('settings.json board has assessment_timeout_ms: 300000', () => {
    assert.strictEqual(settings.board.assessment_timeout_ms, 300000);
  });

  test('settings.json board has persist_artifacts: true', () => {
    assert.strictEqual(settings.board.persist_artifacts, true);
  });
});

// 6. Settings — dispatch defaults
describe('Settings: dispatch defaults', () => {
  let settings;

  before(() => {
    settings = loadJSON(SETTINGS_PATH);
  });

  test('settings.json has dispatch section with enabled: true', () => {
    assert.ok(settings.dispatch, 'settings.json should have dispatch section');
    assert.strictEqual(settings.dispatch.enabled, true);
  });

  test('settings.json dispatch has fallback_to_internal: true', () => {
    assert.strictEqual(settings.dispatch.fallback_to_internal, true);
  });

  test('settings.json dispatch has timeout_ms: 300000', () => {
    assert.strictEqual(settings.dispatch.timeout_ms, 300000);
  });

  test('settings.json dispatch has max_retries: 1', () => {
    assert.strictEqual(settings.dispatch.max_retries, 1);
  });
});

// 7. Settings — review.evaluator_depth
describe('Settings: review.evaluator_depth', () => {
  let settings;

  before(() => {
    settings = loadJSON(SETTINGS_PATH);
  });

  test('settings.json has review.evaluator_depth = "multi-pass"', () => {
    assert.ok(settings.review, 'settings.json should have review section');
    assert.strictEqual(settings.review.evaluator_depth, 'multi-pass');
  });
});

// 8. Settings — review.coverage_thresholds values
describe('Settings: review.coverage_thresholds', () => {
  let settings;

  before(() => {
    settings = loadJSON(SETTINGS_PATH);
  });

  test('settings.json has coverage_thresholds.overall = 70', () => {
    assert.ok(settings.review.coverage_thresholds, 'settings.json should have coverage_thresholds');
    assert.strictEqual(settings.review.coverage_thresholds.overall, 70);
  });

  test('settings.json has coverage_thresholds.business_logic = 90', () => {
    assert.strictEqual(settings.review.coverage_thresholds.business_logic, 90);
  });

  test('settings.json has coverage_thresholds.api_routes = 80', () => {
    assert.strictEqual(settings.review.coverage_thresholds.api_routes, 80);
  });
});

// ============================================================
// Part 2: Adapter Dispatch Configuration Conformance
// ============================================================

const DISPATCH_ADAPTERS = ['gemini-cli.md', 'codex-cli.md', 'copilot-cli.md'];

const VALID_CAPABILITIES = [
  'code_implementation',
  'code_review',
  'testing',
  'refactoring',
  'bug_fixing',
  'ui_design',
  'ux_research',
  'web_search',
  'large_analysis',
  'security_audit',
  'performance_analysis',
  'documentation',
];

const VALID_PROMPT_DELIVERY = ['file_path', 'stdin_pipe', 'content_flag'];

/**
 * Parse the `## Dispatch Configuration` fenced yaml block from an adapter file.
 * Returns a flat object of key -> value (strings, booleans, integers, arrays).
 */
function parseDispatchSection(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');

  const headingMatch = text.match(/^##\s+Dispatch Configuration\s*$/m);
  if (!headingMatch) {
    throw new Error(`No "## Dispatch Configuration" section found in ${filePath}`);
  }

  const afterHeading = text.slice(headingMatch.index + headingMatch[0].length);

  const fenceMatch = afterHeading.match(/```yaml\r?\n([\s\S]*?)```/);
  if (!fenceMatch) {
    throw new Error(`No fenced yaml block found after "## Dispatch Configuration" in ${filePath}`);
  }

  const yamlText = fenceMatch[1];
  const lines = yamlText.split(/\r?\n/);
  const result = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '' || line.trim().startsWith('#')) continue;

    const topMatch = line.match(/^([a-z][a-z0-9_]*):\s*(.*)/);
    if (!topMatch) continue;

    const key = topMatch[1];
    const rawVal = topMatch[2].trim();

    if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
      const inner = rawVal.slice(1, -1);
      result[key] = inner
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter((s) => s.length > 0);
      continue;
    }

    if (rawVal === '') {
      const items = [];
      while (i + 1 < lines.length && /^\s+-\s+/.test(lines[i + 1])) {
        i++;
        items.push(lines[i].trim().slice(2).trim().replace(/^["']|["']$/g, ''));
      }
      result[key] = items;
      continue;
    }

    if (rawVal === 'true') { result[key] = true; continue; }
    if (rawVal === 'false') { result[key] = false; continue; }
    if (rawVal === 'null') { result[key] = null; continue; }
    if (/^\d+$/.test(rawVal)) { result[key] = parseInt(rawVal, 10); continue; }

    result[key] = rawVal.replace(/^["']|["']$/g, '');
  }

  return result;
}

describe('Adapter Dispatch Conformance: Dispatch Section Presence', () => {
  for (const file of DISPATCH_ADAPTERS) {
    const filePath = path.join(ADAPTERS_DIR, file);

    describe(file, () => {
      test('has a parseable ## Dispatch Configuration section', () => {
        assert.doesNotThrow(
          () => parseDispatchSection(filePath),
          `${file}: dispatch section must be parseable`
        );
      });
    });
  }
});

describe('Adapter Dispatch Conformance: Dispatch Fields', () => {
  for (const file of DISPATCH_ADAPTERS) {
    const filePath = path.join(ADAPTERS_DIR, file);

    describe(file, () => {
      let dispatch;
      try {
        dispatch = parseDispatchSection(filePath);
      } catch (e) {
        dispatch = {};
      }

      test('available is true', () => {
        assert.strictEqual(dispatch.available, true,
          `${file}: dispatch.available must be true`);
      });

      test('capabilities is a non-empty array of valid entries', () => {
        assert.ok(Array.isArray(dispatch.capabilities) && dispatch.capabilities.length > 0,
          `${file}: dispatch.capabilities must be a non-empty array`);
        for (const cap of dispatch.capabilities) {
          assert.ok(VALID_CAPABILITIES.includes(cap),
            `${file}: unknown capability "${cap}"`);
        }
      });

      test('invoke_command is a non-empty string', () => {
        assert.equal(typeof dispatch.invoke_command, 'string');
        assert.ok(dispatch.invoke_command.length > 0);
      });

      test('prompt_delivery is a valid value', () => {
        assert.ok(VALID_PROMPT_DELIVERY.includes(dispatch.prompt_delivery),
          `${file}: prompt_delivery "${dispatch.prompt_delivery}" must be one of: ${VALID_PROMPT_DELIVERY.join(', ')}`);
      });

      test('timeout_ms is a positive integer', () => {
        assert.ok(Number.isInteger(dispatch.timeout_ms) && dispatch.timeout_ms > 0,
          `${file}: timeout_ms must be a positive integer`);
      });

      test('detection_command is a non-empty string', () => {
        assert.equal(typeof dispatch.detection_command, 'string');
        assert.ok(dispatch.detection_command.length > 0);
      });
    });
  }
});
