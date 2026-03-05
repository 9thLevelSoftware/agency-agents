#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function parseExecutionContext(commandFile) {
  const text = fs.readFileSync(commandFile, 'utf8');
  const match = text.match(/<execution_context>([\s\S]*?)<\/execution_context>/);
  if (!match) return [];

  return match[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function resolvePhaseFromState(stateText) {
  if (!stateText) return 1;
  const m = stateText.match(/Phase:\s*(\d+)/i);
  return m ? Number(m[1]) : 1;
}

function phaseDir(projectPath, phase) {
  const phasesRoot = path.join(projectPath, '.planning', 'phases');
  if (!fs.existsSync(phasesRoot)) return null;
  const prefix = String(phase).padStart(2, '0') + '-';
  const match = fs.readdirSync(phasesRoot).find((entry) => entry.startsWith(prefix));
  return match ? path.join(phasesRoot, match) : null;
}

function commandFile(projectRoot, command) {
  return path.join(projectRoot, 'commands', `${command}.md`);
}

function computeConditionalSkills(projectPath, command) {
  const conditional = [];
  const memoryPath = path.join(projectPath, '.planning', 'memory', 'OUTCOMES.md');
  const codebasePath = path.join(projectPath, '.planning', 'CODEBASE.md');
  const statePath = path.join(projectPath, '.planning', 'STATE.md');

  if (fs.existsSync(memoryPath)) {
    conditional.push('skills/memory-manager/SKILL.md');
    conditional.push('skills/workflow-common-memory/SKILL.md');
  }

  if (fs.existsSync(codebasePath) && ['plan', 'build', 'status'].includes(command)) {
    conditional.push('skills/codebase-mapper/SKILL.md');
  }

  const stateText = safeRead(statePath) || '';
  if (stateText.includes('## GitHub')) {
    conditional.push('skills/github-sync/SKILL.md');
    conditional.push('skills/workflow-common-github/SKILL.md');
  }

  if (command === 'plan') {
    const roadmapText = safeRead(path.join(projectPath, '.planning', 'ROADMAP.md')) || '';
    if (/MKT-|marketing/i.test(roadmapText) || /DSN-|design/i.test(roadmapText)) {
      conditional.push('skills/workflow-common-domains/SKILL.md');
    }
  }

  if (command === 'review') {
    conditional.push('skills/workflow-common-domains/SKILL.md');
  }

  return Array.from(new Set(conditional)).sort();
}

function check(report, label, ok, detail) {
  report.checks.push({ label, ok, detail });
}

function generateDryRunReport({ command, projectPath, phase }) {
  const project = path.resolve(projectPath);
  const report = {
    command,
    dryRun: true,
    deterministic: true,
    noSideEffects: true,
    projectPath: project,
    phase: null,
    checks: [],
    skills: {
      always: [],
      conditional: [],
    },
    plannedActions: [],
    success: false,
  };

  const root = path.resolve(__dirname, '..');
  const cmdFile = commandFile(root, command);
  report.skills.always = parseExecutionContext(cmdFile).sort();
  report.skills.conditional = computeConditionalSkills(project, command);

  const projectFile = path.join(project, '.planning', 'PROJECT.md');
  const roadmapFile = path.join(project, '.planning', 'ROADMAP.md');
  const stateFile = path.join(project, '.planning', 'STATE.md');

  const projectText = safeRead(projectFile);
  const roadmapText = safeRead(roadmapFile);
  const stateText = safeRead(stateFile);

  if (command === 'status') {
    check(report, 'PROJECT.md exists', !!projectText, projectFile);
    check(report, 'ROADMAP.md readable (optional for routing depth)', !!roadmapText, roadmapFile);
    check(report, 'STATE.md readable (optional for routing depth)', !!stateText, stateFile);
    report.phase = phase || resolvePhaseFromState(stateText);
    report.plannedActions.push('Render progress dashboard from current planning files.');
    report.plannedActions.push('Route to next recommended /legion: command without writing files.');
  }

  if (command === 'plan') {
    check(report, 'PROJECT.md exists', !!projectText, projectFile);
    check(report, 'ROADMAP.md exists', !!roadmapText, roadmapFile);
    check(report, 'STATE.md exists', !!stateText, stateFile);
    report.phase = phase || resolvePhaseFromState(stateText);
    const phaseHeading = `### Phase ${report.phase}:`;
    check(report, `ROADMAP contains ${phaseHeading}`, !!(roadmapText && roadmapText.includes(phaseHeading)), phaseHeading);
    report.plannedActions.push('Read phase context and decompose into wave-structured plans.');
    report.plannedActions.push('Recommend agents with confidence labeling and ask for confirmation.');
  }

  if (command === 'build') {
    check(report, 'PROJECT.md exists', !!projectText, projectFile);
    check(report, 'ROADMAP.md exists', !!roadmapText, roadmapFile);
    check(report, 'STATE.md exists', !!stateText, stateFile);
    report.phase = phase || resolvePhaseFromState(stateText);
    const dir = phaseDir(project, report.phase);
    check(report, `Phase ${report.phase} directory exists`, !!dir, dir || 'missing phase directory');
    const planCount = dir ? fs.readdirSync(dir).filter((f) => f.endsWith('-PLAN.md')).length : 0;
    check(report, 'Plan files discovered', planCount > 0, `${planCount} plan file(s)`);
    report.plannedActions.push('Build wave dependency map from phase plan files.');
    report.plannedActions.push('Execute wave plan set in dry-run preview mode only.');
  }

  if (command === 'review') {
    check(report, 'PROJECT.md exists', !!projectText, projectFile);
    check(report, 'ROADMAP.md exists', !!roadmapText, roadmapFile);
    check(report, 'STATE.md exists', !!stateText, stateFile);
    report.phase = phase || resolvePhaseFromState(stateText);
    const dir = phaseDir(project, report.phase);
    check(report, `Phase ${report.phase} directory exists`, !!dir, dir || 'missing phase directory');
    const summaryCount = dir ? fs.readdirSync(dir).filter((f) => f.endsWith('-SUMMARY.md')).length : 0;
    check(report, 'Execution summaries discovered', summaryCount > 0, `${summaryCount} summary file(s)`);
    report.plannedActions.push('Select review team and rubric path (classic/panel).');
    report.plannedActions.push('Run deterministic review-cycle preview with no writes or spawns.');
  }

  report.success = report.checks.every((c) => c.ok);
  return report;
}

function parseArgs(argv) {
  const args = { command: '', projectPath: process.cwd(), phase: null };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--command') {
      args.command = argv[i + 1] || '';
      i += 1;
    } else if (token === '--project') {
      args.projectPath = argv[i + 1] || process.cwd();
      i += 1;
    } else if (token === '--phase') {
      args.phase = Number(argv[i + 1]);
      i += 1;
    }
  }
  return args;
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  if (!['plan', 'build', 'review', 'status'].includes(args.command)) {
    console.error('Usage: node scripts/dry-run-report.js --command <plan|build|review|status> [--project /path] [--phase N]');
    process.exit(1);
  }

  const report = generateDryRunReport(args);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.success ? 0 : 2);
}

module.exports = {
  generateDryRunReport,
};
