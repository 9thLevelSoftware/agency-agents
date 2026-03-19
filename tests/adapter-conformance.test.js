'use strict';

/**
 * Adapter Schema Conformance Tests
 *
 * Validates all 9 adapter .md files against the ADAPTER.md specification.
 * Checks: CLI identity, capabilities, detection, max_prompt_size,
 * known_quirks, required markdown sections, and tool mappings completeness.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ADAPTERS_DIR = path.join(ROOT, 'adapters');

const VALID_SUPPORT_TIERS = ['certified', 'beta', 'experimental'];

const CAPABILITY_FLAGS = [
  'parallel_execution',
  'agent_spawning',
  'structured_messaging',
  'native_task_tracking',
  'read_only_agents',
];

const REQUIRED_TOOL_CONCEPTS = [
  'spawn_agent_personality',
  'spawn_agent_autonomous',
  'spawn_agent_readonly',
  'coordinate_parallel',
  'collect_results',
  'ask_user',
  'model_planning',
  'model_execution',
  'model_check',
  'shutdown_agents',
  'cleanup_coordination',
  'global_config_dir',
  'plugin_discovery_glob',
  'commit_signature',
];

// --- Adapter file discovery ---

function listAdapterFiles() {
  return fs
    .readdirSync(ADAPTERS_DIR)
    .filter((f) => f.endsWith('.md') && f !== 'ADAPTER.md')
    .sort();
}

// --- YAML frontmatter parser (regex-based, no external dependencies) ---

function parseAdapterFrontmatter(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);

  // Find frontmatter between --- delimiters
  let start = -1;
  let end = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      if (start === -1) start = i;
      else {
        end = i;
        break;
      }
    }
  }
  if (start === -1 || end === -1) {
    throw new Error(`No YAML frontmatter found in ${filePath}`);
  }

  const fm = {};
  let currentNested = null;
  let quirksArray = null;

  for (let i = start + 1; i < end; i++) {
    const line = lines[i];
    if (line.trim() === '' || line.trim().startsWith('#')) continue;

    // Handle indented items for capabilities/detection
    if (currentNested && /^ {2}/.test(line)) {
      const kv = line.trim().match(/^([a-z][a-z0-9_-]*):\s*(.*)/);
      if (kv) {
        let val = kv[2].trim().replace(/^"|"$/g, '');
        if (val === 'true') val = true;
        else if (val === 'false') val = false;
        fm[currentNested][kv[1]] = val;
      }
      continue;
    }

    // Handle known_quirks array items
    if (quirksArray !== null && /^ {2}-/.test(line)) {
      quirksArray.push(
        line
          .trim()
          .slice(2)
          .trim()
          .replace(/^"|"$/g, '')
      );
      continue;
    }

    // Flush quirks if we hit a non-indented line
    if (quirksArray !== null) {
      fm.known_quirks = quirksArray;
      quirksArray = null;
    }
    currentNested = null;

    // Top-level key
    const topMatch = line.match(/^([a-z][a-z0-9_-]*):\s*(.*)/);
    if (topMatch) {
      const key = topMatch[1];
      const val = topMatch[2].trim();
      // UPDATE THIS LIST when ADAPTER.md adds new nested objects
      if (key === 'capabilities' || key === 'detection' || key === 'dispatch') {
        currentNested = key;
        fm[key] = {};
      } else if (key === 'known_quirks') {
        if (val === '[]') {
          fm.known_quirks = [];
        } else {
          quirksArray = [];
        }
      } else if (key === 'max_prompt_size') {
        fm[key] = parseInt(val, 10);
      } else {
        fm[key] = val.replace(/^"|"$/g, '');
      }
    }
  }

  // Flush any trailing quirks array
  if (quirksArray !== null) fm.known_quirks = quirksArray;

  return fm;
}

// --- Get markdown body (after frontmatter) ---

function getMarkdownBody(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const firstDelim = text.indexOf('---');
  if (firstDelim === -1) return text;
  const secondDelim = text.indexOf('---', firstDelim + 3);
  if (secondDelim === -1) return text;
  const bodyStart = text.indexOf('\n', secondDelim);
  return bodyStart === -1 ? '' : text.slice(bodyStart + 1);
}

// --- Tests ---

const adapterFiles = listAdapterFiles();

describe('Adapter Conformance: YAML Frontmatter - CLI Identity', () => {
  for (const file of adapterFiles) {
    describe(file, () => {
      const filePath = path.join(ADAPTERS_DIR, file);
      const fm = parseAdapterFrontmatter(filePath);

      test('cli is a non-empty string', () => {
        assert.equal(typeof fm.cli, 'string', `${file}: cli must be a string`);
        assert.ok(fm.cli.length > 0, `${file}: cli must be non-empty`);
      });

      test('cli_display_name is a non-empty string', () => {
        assert.equal(
          typeof fm.cli_display_name,
          'string',
          `${file}: cli_display_name must be a string`
        );
        assert.ok(
          fm.cli_display_name.length > 0,
          `${file}: cli_display_name must be non-empty`
        );
      });

      test('version is a non-empty string', () => {
        assert.equal(typeof fm.version, 'string', `${file}: version must be a string`);
        assert.ok(fm.version.length > 0, `${file}: version must be non-empty`);
      });

      test('support_tier is one of certified, beta, experimental', () => {
        assert.ok(
          VALID_SUPPORT_TIERS.includes(fm.support_tier),
          `${file}: support_tier "${fm.support_tier}" must be one of ${VALID_SUPPORT_TIERS.join(', ')}`
        );
      });
    });
  }
});

describe('Adapter Conformance: YAML Frontmatter - Capabilities', () => {
  for (const file of adapterFiles) {
    describe(file, () => {
      const filePath = path.join(ADAPTERS_DIR, file);
      const fm = parseAdapterFrontmatter(filePath);

      for (const flag of CAPABILITY_FLAGS) {
        test(`capabilities.${flag} is a boolean`, () => {
          assert.ok(
            fm.capabilities && typeof fm.capabilities[flag] === 'boolean',
            `${file}: capabilities.${flag} must be a boolean (got ${fm.capabilities?.[flag]})`
          );
        });
      }
    });
  }
});

describe('Adapter Conformance: YAML Frontmatter - Detection', () => {
  for (const file of adapterFiles) {
    describe(file, () => {
      const filePath = path.join(ADAPTERS_DIR, file);
      const fm = parseAdapterFrontmatter(filePath);

      test('detection.primary is a non-empty string', () => {
        assert.ok(
          fm.detection && typeof fm.detection.primary === 'string' && fm.detection.primary.length > 0,
          `${file}: detection.primary must be a non-empty string`
        );
      });

      test('detection.secondary is a non-empty string', () => {
        assert.ok(
          fm.detection &&
            typeof fm.detection.secondary === 'string' &&
            fm.detection.secondary.length > 0,
          `${file}: detection.secondary must be a non-empty string`
        );
      });
    });
  }
});

describe('Adapter Conformance: YAML Frontmatter - Limits & Quirks', () => {
  for (const file of adapterFiles) {
    describe(file, () => {
      const filePath = path.join(ADAPTERS_DIR, file);
      const fm = parseAdapterFrontmatter(filePath);

      test('max_prompt_size is a positive integer', () => {
        assert.equal(
          typeof fm.max_prompt_size,
          'number',
          `${file}: max_prompt_size must be a number`
        );
        assert.ok(
          Number.isInteger(fm.max_prompt_size) && fm.max_prompt_size > 0,
          `${file}: max_prompt_size must be a positive integer (got ${fm.max_prompt_size})`
        );
      });

      test('known_quirks is an array', () => {
        assert.ok(
          Array.isArray(fm.known_quirks),
          `${file}: known_quirks must be an array (got ${typeof fm.known_quirks})`
        );
      });

      test('known_quirks entries are lowercase-hyphenated strings', () => {
        const quirks = fm.known_quirks || [];
        for (const q of quirks) {
          assert.equal(typeof q, 'string', `${file}: known_quirks entry must be a string`);
          assert.ok(q.length > 0, `${file}: known_quirks entry must be non-empty`);
          assert.match(
            q,
            /^[a-z0-9-]+$/,
            `${file}: known_quirks entry "${q}" must match lowercase-hyphenated format`
          );
        }
      });
    });
  }
});

describe('Adapter Conformance: Required Markdown Sections', () => {
  for (const file of adapterFiles) {
    describe(file, () => {
      const filePath = path.join(ADAPTERS_DIR, file);
      const body = getMarkdownBody(filePath);

      test('contains Tool Mappings heading', () => {
        assert.match(
          body,
          /^#+\s+.*Tool Mappings/im,
          `${file}: missing "Tool Mappings" heading`
        );
      });

      test('contains Interaction Protocol heading', () => {
        assert.match(
          body,
          /^#+\s+.*Interaction Protocol/im,
          `${file}: missing "Interaction Protocol" heading`
        );
      });

      test('contains Execution Protocol heading', () => {
        assert.match(
          body,
          /^#+\s+.*Execution Protocol/im,
          `${file}: missing "Execution Protocol" heading`
        );
      });
    });
  }
});

describe('Adapter Conformance: Tool Mappings Completeness', () => {
  for (const file of adapterFiles) {
    describe(file, () => {
      const filePath = path.join(ADAPTERS_DIR, file);
      const body = getMarkdownBody(filePath);

      for (const concept of REQUIRED_TOOL_CONCEPTS) {
        test(`contains tool mapping for ${concept}`, () => {
          assert.ok(
            body.includes(concept),
            `${file}: missing tool mapping for "${concept}"`
          );
        });
      }
    });
  }
});

describe('Adapter Conformance: Cross-adapter Consistency', () => {
  test('exactly 9 adapter files exist (excluding ADAPTER.md)', () => {
    assert.equal(
      adapterFiles.length,
      9,
      `Expected 9 adapter files, found ${adapterFiles.length}: ${adapterFiles.join(', ')}`
    );
  });

  test('all adapter cli values are unique', () => {
    const cliValues = [];
    for (const file of adapterFiles) {
      const fm = parseAdapterFrontmatter(path.join(ADAPTERS_DIR, file));
      cliValues.push(fm.cli);
    }
    const unique = new Set(cliValues);
    assert.equal(
      unique.size,
      cliValues.length,
      `Duplicate cli values found: ${cliValues.join(', ')}`
    );
  });
});

describe('Adapter Conformance: Detection Cross-Reference with workflow-common', () => {
  // Parse the detection entries from workflow-common SKILL.md Step 1
  const workflowCommonPath = path.join(ROOT, 'skills', 'workflow-common', 'SKILL.md');
  const wcText = fs.readFileSync(workflowCommonPath, 'utf8');

  // Extract the Step 1 detection block (between "Step 1:" and "Step 2:")
  const step1Match = wcText.match(
    /Step 1: Tool probe \(primary detection\)([\s\S]*?)(?=Step (?:1\.5|2):)/
  );
  const step1Block = step1Match ? step1Match[1] : '';

  // Build a map of CLI display name → detection text from workflow-common
  const wcDetectionMap = {};
  const detectionLines = step1Block.split(/\r?\n/);
  for (const line of detectionLines) {
    const match = line.match(/^\s+-\s+([\w\s()]+?):\s+(.+)/);
    if (match) {
      const cliName = match[1].trim();
      const detectionText = match[2].trim();
      wcDetectionMap[cliName] = detectionText;
    }
  }

  // Map adapter cli values to their workflow-common display names
  const cliToDisplayName = {
    'claude-code': 'Claude Code',
    'codex-cli': 'Codex CLI',
    cursor: 'Cursor',
    'copilot-cli': 'Copilot CLI',
    'gemini-cli': 'Gemini CLI',
    'kiro-cli': 'Kiro CLI',
    windsurf: 'Windsurf',
    opencode: 'OpenCode',
    aider: 'Aider',
  };

  for (const file of adapterFiles) {
    describe(file, () => {
      const filePath = path.join(ADAPTERS_DIR, file);
      const fm = parseAdapterFrontmatter(filePath);
      const wcDisplayName = cliToDisplayName[fm.cli];

      test('has a matching entry in workflow-common Step 1', () => {
        assert.ok(
          wcDisplayName && wcDetectionMap[wcDisplayName],
          `${file}: adapter cli "${fm.cli}" (display: "${wcDisplayName}") has no detection entry in workflow-common Step 1. ` +
            `Found entries for: ${Object.keys(wcDetectionMap).join(', ')}`
        );
      });

      test('detection.primary shares key paths with workflow-common entry', () => {
        if (!wcDisplayName || !wcDetectionMap[wcDisplayName]) return; // skip if no entry

        const adapterPrimary = fm.detection.primary.toLowerCase();
        const wcEntry = wcDetectionMap[wcDisplayName].toLowerCase();

        // Extract filesystem paths (dotfile patterns like .codex/prompts, .cursor/rules, etc.)
        const pathPattern = /[.~][\w/.-]+/g;
        const adapterPaths = (adapterPrimary.match(pathPattern) || []).map((p) =>
          p.replace(/^~\//, '')
        );
        const wcPaths = (wcEntry.match(pathPattern) || []).map((p) => p.replace(/^~\//, ''));

        // For tool-based detection (Claude Code), check for keyword overlap instead
        if (adapterPaths.length === 0 && wcPaths.length === 0) {
          // Both use non-path detection (e.g., "TeamCreate tool is available")
          // Check that at least one significant keyword appears in both
          const adapterWords = new Set(adapterPrimary.split(/\s+/).filter((w) => w.length > 3));
          const wcWords = new Set(wcEntry.split(/\s+/).filter((w) => w.length > 3));
          const overlap = [...adapterWords].filter((w) => wcWords.has(w));
          assert.ok(
            overlap.length > 0,
            `${file}: adapter detection.primary "${fm.detection.primary}" shares no keywords with ` +
              `workflow-common entry "${wcDetectionMap[wcDisplayName]}"`
          );
          return;
        }

        // At least one filesystem path from the adapter should appear in the workflow-common entry
        if (adapterPaths.length > 0) {
          const anyPathMatch = adapterPaths.some(
            (ap) => wcPaths.some((wp) => wp.includes(ap) || ap.includes(wp))
          );
          assert.ok(
            anyPathMatch,
            `${file}: adapter detection paths [${adapterPaths.join(', ')}] don't match ` +
              `workflow-common paths [${wcPaths.join(', ')}]. These should be consistent.`
          );
        }
      });
    });
  }
});

describe('Adapter Conformance: Capability-Quirk Consistency', () => {
  for (const file of adapterFiles) {
    describe(file, () => {
      const filePath = path.join(ADAPTERS_DIR, file);
      const fm = parseAdapterFrontmatter(filePath);
      const quirks = fm.known_quirks || [];

      test('agent_spawning: true must not have "no-agent-spawning" quirk', () => {
        if (fm.capabilities && fm.capabilities.agent_spawning === true) {
          assert.ok(
            !quirks.includes('no-agent-spawning'),
            `${file}: capabilities.agent_spawning is true but known_quirks contains "no-agent-spawning"`
          );
        }
      });

      test('parallel_execution: true must not have "no-parallel-execution" quirk', () => {
        if (fm.capabilities && fm.capabilities.parallel_execution === true) {
          assert.ok(
            !quirks.includes('no-parallel-execution'),
            `${file}: capabilities.parallel_execution is true but known_quirks contains "no-parallel-execution"`
          );
        }
      });
    });
  }
});
