#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ERRORS = [];
const WARNINGS = [];
const TELEMETRY = [];

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function fail(msg) {
  ERRORS.push(msg);
}

function warn(msg) {
  WARNINGS.push(msg);
}

function linesCount(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  return text.split(/\r?\n/).length;
}

function listMarkdown(dirRel) {
  const dir = path.join(ROOT, dirRel);
  return fs.readdirSync(dir)
    .filter((entry) => entry.endsWith('.md'))
    .map((entry) => path.join(dir, entry));
}

function parseExecutionContext(commandFileRel) {
  const body = read(commandFileRel);
  const match = body.match(/<execution_context>([\s\S]*?)<\/execution_context>/);
  if (!match) return [];

  return match[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function bytesForSkillPath(skillPathRel) {
  const abs = path.join(ROOT, skillPathRel);
  if (!fs.existsSync(abs)) return 0;
  return fs.statSync(abs).size;
}

function parseWorkflowCommonSkillMap() {
  const text = read('skills/workflow-common-core/SKILL.md');
  const sectionMatch = text.match(/## Command-to-Skill Mapping \(Core\)([\s\S]*?)## Context Budget Ceiling \(Core\)/);
  if (!sectionMatch) {
    fail('workflow-common-core mapping table not found');
    return new Map();
  }

  const rows = sectionMatch[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('| `/legion:'));

  const mapping = new Map();

  for (const row of rows) {
    const cols = row.split('|').map((c) => c.trim()).filter(Boolean);
    // cols: command, always, conditional
    if (cols.length < 2) continue;
    const command = cols[0].replace(/`/g, '').replace('/legion:', '');
    const always = cols[1]
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => item !== '—');
    mapping.set(`${command}.md`, always);
  }

  return mapping;
}

function checkVersionSync() {
  const pkg = JSON.parse(read('package.json'));
  const changelog = read('CHANGELOG.md');
  const topMatch = changelog.match(/^## \[([^\]]+)\]/m);

  if (!topMatch) {
    fail('CHANGELOG.md top version header not found');
    return;
  }

  const changelogVersion = topMatch[1];
  if (pkg.version !== changelogVersion) {
    fail(`Version mismatch: package.json=${pkg.version}, CHANGELOG.md=${changelogVersion}`);
  }
}

function checkReadmeMetrics() {
  const readme = read('README.md');
  const commands = listMarkdown('commands').length;
  const skills = fs.readdirSync(path.join(ROOT, 'skills'), { withFileTypes: true }).filter((d) => d.isDirectory()).length;
  const agents = listMarkdown('agents').length;
  const lineCounts = listMarkdown('agents').map((file) => linesCount(file));
  const minLines = Math.min(...lineCounts);
  const maxLines = Math.max(...lineCounts);

  const markerMatch = readme.match(/<!-- legion-metrics:start -->([\s\S]*?)<!-- legion-metrics:end -->/);
  if (!markerMatch) {
    fail('README metrics marker block missing (<!-- legion-metrics:start --> ... <!-- legion-metrics:end -->)');
    return;
  }

  const block = markerMatch[1];
  const expectedLines = [
    `- Commands: ${commands}`,
    `- Skills: ${skills}`,
    `- Agents: ${agents}`,
    `- Agent personality line range (current): ${minLines}-${maxLines}`,
  ];

  for (const expected of expectedLines) {
    if (!block.includes(expected)) {
      fail(`README metrics block is out of sync. Missing: "${expected}"`);
    }
  }
}

function checkRuntimeSupportTable() {
  const readme = read('README.md');
  if (!readme.includes('| Runtime | Status | Notes |')) {
    fail('README runtime support matrix missing (expected table header: "| Runtime | Status | Notes |")');
    return;
  }

  const runtimes = [
    'Claude Code',
    'OpenAI Codex CLI',
    'Cursor',
    'GitHub Copilot CLI',
    'Google Gemini CLI',
    'Kiro CLI (formerly Amazon Q Developer CLI)',
    'Windsurf',
    'OpenCode',
    'Aider',
  ];

  for (const runtime of runtimes) {
    if (!readme.includes(`| ${runtime} |`)) {
      fail(`README runtime support matrix missing runtime row for: ${runtime}`);
    }
  }
}

function checkCommandSkillMapping() {
  const mapping = parseWorkflowCommonSkillMap();

  for (const [commandFile, alwaysSkills] of mapping.entries()) {
    const commandPathRel = `commands/${commandFile}`;
    if (!fs.existsSync(path.join(ROOT, commandPathRel))) {
      fail(`workflow-common-core maps ${commandFile}, but the command file does not exist`);
      continue;
    }

    const executionContext = new Set(parseExecutionContext(commandPathRel));

    for (const skillName of alwaysSkills) {
      const skillPath = `skills/${skillName}/SKILL.md`;
      if (!executionContext.has(skillPath)) {
        fail(`${commandFile}: missing always-load skill in <execution_context>: ${skillPath}`);
      }
    }
  }
}

function checkContextBudgets() {
  const softBudgetsKb = {
    'commands/build.md': 180,
    'commands/plan.md': 180,
    'commands/review.md': 180,
    'commands/status.md': 120,
  };

  for (const [commandRel, softKb] of Object.entries(softBudgetsKb)) {
    const contextSkills = parseExecutionContext(commandRel);
    const totalBytes = contextSkills.reduce((sum, skillPath) => sum + bytesForSkillPath(skillPath), 0);
    const totalKb = totalBytes / 1024;
    const hardKb = softKb * 1.25;
    const estTokens = Math.ceil(totalBytes / 4);

    TELEMETRY.push({
      command: commandRel,
      skills: contextSkills.length,
      kb: totalKb,
      estTokens,
      softKb,
      hardKb,
    });

    if (totalKb > hardKb) {
      fail(`${commandRel} context budget too high: ${totalKb.toFixed(1)}KB (hard limit ${hardKb.toFixed(1)}KB, soft ${softKb}KB)`);
    } else if (totalKb > softKb) {
      warn(`${commandRel} context budget above soft ceiling: ${totalKb.toFixed(1)}KB (soft ${softKb}KB)`);
    }
  }
}

function main() {
  checkVersionSync();
  checkReadmeMetrics();
  checkRuntimeSupportTable();
  checkCommandSkillMapping();
  checkContextBudgets();

  if (TELEMETRY.length > 0) {
    console.log('\nContext Budget Telemetry:');
    for (const row of TELEMETRY) {
      console.log(`- ${row.command}: ${row.kb.toFixed(1)}KB (~${row.estTokens} tokens), skills=${row.skills}, soft=${row.softKb}KB, hard=${row.hardKb.toFixed(1)}KB`);
    }
  }

  if (WARNINGS.length > 0) {
    console.log('\nWarnings:');
    for (const msg of WARNINGS) {
      console.log(`- ${msg}`);
    }
  }

  if (ERRORS.length > 0) {
    console.error('\nRelease checks failed:');
    for (const msg of ERRORS) {
      console.error(`- ${msg}`);
    }
    process.exit(1);
  }

  console.log('Release checks passed.');
}

main();
