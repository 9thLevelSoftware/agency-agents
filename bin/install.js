#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: Runtime Registry
// ─────────────────────────────────────────────────────────────────────────────
// Each entry is the complete per-runtime contract. Adding a new CLI = one entry.

const RUNTIMES = {
  claude: {
    flag: '--claude',
    label: 'Claude Code',
    agentsDir:   (home) => `${home}/.claude/agents`,
    commandsDir: (home) => `${home}/.claude/commands/legion`,
    skillsDir:   (home) => `${home}/.claude/legion/skills`,
    adaptersDir: (home) => `${home}/.claude/legion/adapters`,
    manifestDir: (home) => `${home}/.claude/legion`,
    allowedTools: null, // null = keep original (already Claude Code tool names)
    supportsAtRefs: true,
    adapterFile: 'claude-code.md',
    supportTier: 'certified',
  },
  codex: {
    flag: '--codex',
    label: 'OpenAI Codex CLI',
    agentsDir:   (home) => `${home}/.legion/agents`,
    commandsDir: (home) => `${home}/.legion/commands/legion`,
    skillsDir:   (home) => `${home}/.legion/skills`,
    adaptersDir: (home) => `${home}/.legion/adapters`,
    manifestDir: (home) => `${home}/.legion`,
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'],
    supportsAtRefs: false,
    adapterFile: 'codex-cli.md',
    supportTier: 'beta',
  },
  cursor: {
    flag: '--cursor',
    label: 'Cursor',
    agentsDir:   (home) => `${home}/.legion/agents`,
    commandsDir: (home) => `${home}/.legion/commands/legion`,
    skillsDir:   (home) => `${home}/.legion/skills`,
    adaptersDir: (home) => `${home}/.legion/adapters`,
    manifestDir: (home) => `${home}/.legion`,
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', 'Agent'],
    supportsAtRefs: false,
    adapterFile: 'cursor.md',
    supportTier: 'beta',
  },
  copilot: {
    flag: '--copilot',
    label: 'GitHub Copilot CLI',
    agentsDir:   (home) => `${home}/.legion/agents`,
    commandsDir: (home) => `${home}/.legion/commands/legion`,
    skillsDir:   (home) => `${home}/.legion/skills`,
    adaptersDir: (home) => `${home}/.legion/adapters`,
    manifestDir: (home) => `${home}/.legion`,
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'],
    supportsAtRefs: false,
    adapterFile: 'copilot-cli.md',
    supportTier: 'experimental',
  },
  gemini: {
    flag: '--gemini',
    label: 'Google Gemini CLI',
    agentsDir:   (home) => `${home}/.legion/agents`,
    commandsDir: (home) => `${home}/.legion/commands/legion`,
    skillsDir:   (home) => `${home}/.legion/skills`,
    adaptersDir: (home) => `${home}/.legion/adapters`,
    manifestDir: (home) => `${home}/.legion`,
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'],
    supportsAtRefs: false,
    adapterFile: 'gemini-cli.md',
    supportTier: 'beta',
  },
  'amazon-q': {
    flag: '--amazon-q',
    label: 'Amazon Q Developer',
    agentsDir:   (home) => `${home}/.legion/agents`,
    commandsDir: (home) => `${home}/.legion/commands/legion`,
    skillsDir:   (home) => `${home}/.legion/skills`,
    adaptersDir: (home) => `${home}/.legion/adapters`,
    manifestDir: (home) => `${home}/.legion`,
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'],
    supportsAtRefs: false,
    adapterFile: 'amazon-q.md',
    supportTier: 'experimental',
  },
  windsurf: {
    flag: '--windsurf',
    label: 'Windsurf',
    agentsDir:   (home) => `${home}/.legion/agents`,
    commandsDir: (home) => `${home}/.legion/commands/legion`,
    skillsDir:   (home) => `${home}/.legion/skills`,
    adaptersDir: (home) => `${home}/.legion/adapters`,
    manifestDir: (home) => `${home}/.legion`,
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'],
    supportsAtRefs: false,
    adapterFile: 'windsurf.md',
    supportTier: 'experimental',
  },
  opencode: {
    flag: '--opencode',
    label: 'OpenCode',
    agentsDir:   (home) => `${home}/.legion/agents`,
    commandsDir: (home) => `${home}/.legion/commands/legion`,
    skillsDir:   (home) => `${home}/.legion/skills`,
    adaptersDir: (home) => `${home}/.legion/adapters`,
    manifestDir: (home) => `${home}/.legion`,
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', 'Agent'],
    supportsAtRefs: false,
    adapterFile: 'opencode.md',
    supportTier: 'experimental',
  },
  aider: {
    flag: '--aider',
    label: 'Aider',
    agentsDir:   (home) => `${home}/.legion/agents`,
    commandsDir: (home) => `${home}/.legion/commands/legion`,
    skillsDir:   (home) => `${home}/.legion/skills`,
    adaptersDir: (home) => `${home}/.legion/adapters`,
    manifestDir: (home) => `${home}/.legion`,
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'],
    supportsAtRefs: false,
    adapterFile: 'aider.md',
    supportTier: 'experimental',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: CLI / Argument Parsing
// ─────────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const result = { runtime: null, scope: 'global', action: 'install', verify: false };

  for (const arg of argv) {
    // Runtime flags
    for (const [key, rt] of Object.entries(RUNTIMES)) {
      if (arg === rt.flag) { result.runtime = key; break; }
    }
    // Scope
    if (arg === '--global') result.scope = 'global';
    if (arg === '--local')  result.scope = 'local';
    if (arg === '--verify') result.verify = true;
    // Actions
    if (arg === '--uninstall') result.action = 'uninstall';
    if (arg === '--update')    result.action = 'update';
    if (arg === '--help' || arg === '-h')    result.action = 'help';
    if (arg === '--version' || arg === '-v') result.action = 'version';
  }

  return result;
}

function promptRuntimeSelection() {
  return new Promise((resolve) => {
    const entries = Object.entries(RUNTIMES);
    console.log('\nSelect your AI CLI runtime:\n');
    entries.forEach(([key, rt], i) => {
      console.log(`  ${i + 1}) ${rt.label}`);
    });
    console.log();

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = () => {
      rl.question(`Enter a number (1-${entries.length}): `, (answer) => {
        const num = parseInt(answer, 10);
        if (num >= 1 && num <= entries.length) {
          rl.close();
          resolve(entries[num - 1][0]);
        } else {
          console.log('Invalid selection. Try again.');
          ask();
        }
      });
    };
    ask();
  });
}

function printHelp() {
  console.log(`


Usage:
  npx @9thlevelsoftware/legion [options]

Runtime (pick one):
  --claude      Claude Code
  --codex       OpenAI Codex CLI
  --cursor      Cursor
  --copilot     GitHub Copilot CLI
  --gemini      Google Gemini CLI
  --amazon-q    Amazon Q Developer
  --windsurf    Windsurf
  --opencode    OpenCode
  --aider       Aider

  If no runtime flag is given, you'll be prompted to select one.

Scope:
  --global      Install to home directory (default)
  --local       Install to current project directory
  --verify      Verify package file hashes before installation

Actions:
  --uninstall   Remove all Legion files
  --update      Check for updates and re-install if newer version available
  --help, -h    Show this help
  --version, -v Show installed version
`);
}

function printVersion() {
  const pkg = readPackageJson();
  console.log(`Legion v${pkg.version}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: Path Resolution
// ─────────────────────────────────────────────────────────────────────────────

function normalizePath(p) {
  return p.replace(/\\/g, '/');
}

function joinPath(...args) {
  return normalizePath(path.join(...args));
}

function resolveHome() {
  const home = process.env.HOME || process.env.USERPROFILE || os.homedir();
  if (!home) {
    console.error('Cannot determine home directory. Set $HOME or $USERPROFILE.');
    process.exit(1);
  }
  return normalizePath(home);
}

function resolvePaths(runtime, scope, home) {
  const rt = RUNTIMES[runtime];
  const base = scope === 'local' ? normalizePath(process.cwd()) : home;

  // For local scope with claude, use .claude/; for others use .legion/
  const localBase = runtime === 'claude'
    ? joinPath(base, '.claude')
    : joinPath(base, '.legion');

  if (scope === 'local') {
    return {
      agentsDir:    joinPath(localBase, 'agents'),
      commandsDir:  joinPath(localBase, 'commands/legion'),
      skillsDir:    runtime === 'claude' ? joinPath(localBase, 'legion/skills') : joinPath(localBase, 'skills'),
      adaptersDir:  runtime === 'claude' ? joinPath(localBase, 'legion/adapters') : joinPath(localBase, 'adapters'),
      manifestDir:  runtime === 'claude' ? joinPath(localBase, 'legion') : localBase,
      manifestFile: runtime === 'claude' ? joinPath(localBase, 'legion/manifest.json') : joinPath(localBase, 'manifest.json'),
    };
  }

  return {
    agentsDir:    rt.agentsDir(home),
    commandsDir:  rt.commandsDir(home),
    skillsDir:    rt.skillsDir(home),
    adaptersDir:  rt.adaptersDir(home),
    manifestDir:  rt.manifestDir(home),
    manifestFile: joinPath(rt.manifestDir(home), 'manifest.json'),
  };
}

function resolveSourceRoot() {
  // npm package: __dirname is bin/, source root is one level up
  const root = normalizePath(path.resolve(__dirname, '..'));
  return {
    root,
    agentsSrc:   joinPath(root, 'agents'),
    commandsSrc: joinPath(root, 'commands'),
    skillsSrc:   joinPath(root, 'skills'),
    adaptersSrc: joinPath(root, 'adapters'),
  };
}

function readPackageJson() {
  const root = normalizePath(path.resolve(__dirname, '..'));
  return JSON.parse(fs.readFileSync(joinPath(root, 'package.json'), 'utf8'));
}
function detectSourceProvenance(sourceRoot) {
  const gitDir = joinPath(sourceRoot, '.git');
  const checksumsFile = joinPath(sourceRoot, 'checksums.sha256');
  const source = fs.existsSync(gitDir) ? 'local-git' : 'npm-package';
  return { source, checksumsFile };
}

function parseChecksumLine(line) {
  const match = line.match(/^([a-fA-F0-9]{64})\s{2}(.+)$/);
  if (!match) return null;
  return { hash: match[1].toLowerCase(), relPath: match[2] };
}

function sha256File(filePath) {
  const crypto = require('crypto');
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

function verifyPackageIntegrity(sourceRoot) {
  const checksumsFile = joinPath(sourceRoot, 'checksums.sha256');
  if (!fs.existsSync(checksumsFile)) {
    throw new Error(`Integrity verification failed: checksums file not found at ${checksumsFile}`);
  }

  const lines = fs.readFileSync(checksumsFile, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error(`Integrity verification failed: ${checksumsFile} is empty`);
  }

  const failures = [];

  for (const line of lines) {
    const parsed = parseChecksumLine(line);
    if (!parsed) {
      failures.push(`Malformed checksum line: ${line}`);
      continue;
    }

    const filePath = joinPath(sourceRoot, parsed.relPath);
    if (!fs.existsSync(filePath)) {
      failures.push(`Missing file: ${parsed.relPath}`);
      continue;
    }

    const actual = sha256File(filePath);
    if (actual !== parsed.hash) {
      failures.push(`Hash mismatch: ${parsed.relPath}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Integrity verification failed:\n- ${failures.join('\n- ')}`);
  }
}

function runRuntimeDiagnostics(runtimeKey) {
  const expectedEnv = {
    codex: 'CODEX_VERSION',
    cursor: 'CURSOR_VERSION',
    copilot: 'COPILOT_CLI_VERSION',
    gemini: 'GEMINI_CLI_VERSION',
    'amazon-q': 'Q_CLI_VERSION',
    windsurf: 'WINDSURF_VERSION',
    opencode: 'OPENCODE_CONFIG_DIR',
    aider: 'AIDER_VERSION',
  };

  const key = expectedEnv[runtimeKey];
  if (!key) return;

  if (process.env[key]) {
    console.log(`  Diagnostic: ${key} detected.`);
  } else {
    console.log(`  Diagnostic warning: ${key} is not set in this shell.`);
    console.log('  The runtime may still work, but adapter auto-detection can be less reliable.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: File Transform Engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rewrite allowed-tools in YAML frontmatter.
 * If toolList is null, returns content unchanged (keep originals).
 */
function rewriteAllowedTools(content, toolList) {
  if (!toolList) return content;

  // Replace the entire frontmatter block with the allowed-tools line rewritten
  // Uses a callback to avoid $ replacement issues in String.replace
  return content.replace(
    /^(---\r?\n)([\s\S]*?)(\r?\n---)/,
    (_, open, frontmatter, close) => {
      const toolsLine = `allowed-tools: [${toolList.join(', ')}]`;
      const newFm = frontmatter.replace(/^allowed-tools:.*\r?$/m, toolsLine);
      return open + newFm + close;
    }
  );
}

/**
 * Rewrite skill paths inside <execution_context> blocks.
 * skills/workflow-common/SKILL.md → /absolute/path/to/skills/workflow-common/SKILL.md
 */
function rewriteSkillPaths(content, installedSkillsDir) {
  return content.replace(
    /(<execution_context>)([\s\S]*?)(<\/execution_context>)/g,
    (match, open, body, close) => {
      const rewritten = body.replace(
        /^(skills\/)/gm,
        `${installedSkillsDir}/`
      );
      return open + rewritten + close;
    }
  );
}

/**
 * Rewrite @-references inside <context> blocks.
 * @skills/... → @/absolute/path/to/skills/...
 * @agents/... → @/absolute/path/to/agents/...
 * @.planning/... → unchanged (runtime project paths)
 *
 * If runtime doesn't support @-refs, strip @skills/ and @agents/ lines entirely.
 */
function rewriteContextRefs(content, installedSkillsDir, installedAgentsDir, supportsAtRefs) {
  return content.replace(
    /(<context>)([\s\S]*?)(<\/context>)/g,
    (match, open, body, close) => {
      if (supportsAtRefs) {
        // Rewrite @skills/ to absolute path
        let rewritten = body.replace(
          /^@skills\//gm,
          `@${installedSkillsDir}/`
        );
        // Rewrite @agents/ to absolute path
        rewritten = rewritten.replace(
          /^@agents\//gm,
          `@${installedAgentsDir}/`
        );
        return open + rewritten + close;
      } else {
        // Strip @skills/ and @agents/ lines for non-CC runtimes
        const lines = body.split('\n').filter(line => {
          const trimmed = line.trim();
          return !trimmed.startsWith('@skills/') && !trimmed.startsWith('@agents/');
        });
        return open + lines.join('\n') + close;
      }
    }
  );
}

/**
 * Rewrite the Agent Path Resolution Protocol in workflow-common/SKILL.md.
 * Updates Step 3 to read the npm manifest instead of installed_plugins.json.
 * Handles both the old (plugin cache) and new (npm manifest) source text.
 */
function rewriteAgentPathResolution(content, manifestFile) {
  const newStep3 = `Step 3: Fallback — read npm install manifest
  - Run: Bash  cat "${manifestFile}" 2>/dev/null
  - If the file exists and contains valid JSON:
    - Extract the "paths.agents" value
    - Set AGENTS_DIR = {paths.agents}
    - Verify by attempting to Read {AGENTS_DIR}/agents-orchestrator.md
    - If readable:
      → Log: "AGENTS_DIR: {AGENTS_DIR} (npm manifest)"
      → Done.`;

  // Try matching old format (plugin cache metadata)
  const oldPattern = /Step 3: Fallback — read install path from plugin cache metadata[\s\S]*?→ Done\./;
  if (oldPattern.test(content)) {
    return content.replace(oldPattern, newStep3);
  }

  // Try matching current format (npm install manifest) — re-stamp with correct path
  const currentPattern = /Step 3: Fallback — read npm install manifest[\s\S]*?→ Done\./;
  if (currentPattern.test(content)) {
    return content.replace(currentPattern, newStep3);
  }

  // No match — return unchanged
  return content;
}

/**
 * Compose all transforms for a command file.
 */
function transformCommand(content, runtimeKey, installedSkillsDir, installedAgentsDir) {
  const rt = RUNTIMES[runtimeKey];
  content = rewriteAllowedTools(content, rt.allowedTools);
  content = rewriteSkillPaths(content, installedSkillsDir);
  content = rewriteContextRefs(content, installedSkillsDir, installedAgentsDir, rt.supportsAtRefs);
  return content;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: File System Utilities
// ─────────────────────────────────────────────────────────────────────────────

function ensureDirs(dirs) {
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function listMdFiles(dir) {
  try {
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.md'))
      .map(f => joinPath(dir, f));
  } catch { return []; }
}

function listDirs(dir) {
  try {
    return fs.readdirSync(dir)
      .map(f => joinPath(dir, f))
      .filter(f => fs.statSync(f).isDirectory());
  } catch { return []; }
}

function copyDirRecursive(src, dest) {
  ensureDirs([dest]);
  for (const entry of fs.readdirSync(src)) {
    const srcPath = joinPath(src, entry);
    const destPath = joinPath(dest, entry);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function hasLegionFrontmatter(content) {
  return /^---[\s\S]*?\ndivision:\s*\S/m.test(content);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: Manifest Read/Write
// ─────────────────────────────────────────────────────────────────────────────

function writeManifest(paths, runtimeKey, agentFiles, scope, source, verified) {
  const pkg = readPackageJson();
  const manifest = {
    name: pkg.name,
    version: pkg.version,
    installedAt: new Date().toISOString(),
    runtime: runtimeKey,
    scope,
    source,
    verified,
    paths: {
      agents: paths.agentsDir,
      commands: paths.commandsDir,
      skills: paths.skillsDir,
      adapters: paths.adaptersDir,
      manifest: paths.manifestFile,
    },
    agents: agentFiles,
  };
  fs.writeFileSync(paths.manifestFile, JSON.stringify(manifest, null, 2) + '\n');
}

function readManifest(manifestFile) {
  try {
    return JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7: Install Pipeline
// ─────────────────────────────────────────────────────────────────────────────

function install(runtimeKey, scope, verify = false) {
  const home = resolveHome();
  const paths = resolvePaths(runtimeKey, scope, home);
  const src = resolveSourceRoot();
  const rt = RUNTIMES[runtimeKey];
  const sourceInfo = detectSourceProvenance(src.root);
  const pkg = readPackageJson();

  if (verify) {
    verifyPackageIntegrity(src.root);
    console.log('Integrity verification passed (checksums.sha256).');
  }

  if (sourceInfo.source === 'local-git' && !verify) {
    console.log('WARNING: Installing from a local git source without --verify.');
    console.log('         Use --verify to validate file integrity before install.');
  }

  console.log(`\nInstalling Legion for ${rt.label} (${scope} mode, ${rt.supportTier} runtime)...\n`);

  // Create all destination directories
  ensureDirs([paths.agentsDir, paths.commandsDir, paths.skillsDir,
              paths.adaptersDir, paths.manifestDir]);

  // ── Agents ──
  console.log('=== Agents ===');
  const installedAgents = [];
  const conflicts = [];
  const agentFiles = listMdFiles(src.agentsSrc);

  for (const agentFile of agentFiles) {
    const base = path.basename(agentFile);
    const dest = joinPath(paths.agentsDir, base);

    // Conflict detection: back up non-Legion agents
    if (fs.existsSync(dest)) {
      const existing = fs.readFileSync(dest, 'utf8');
      if (!hasLegionFrontmatter(existing)) {
        fs.copyFileSync(dest, dest + '.bak');
        conflicts.push(base);
        console.log(`  CONFLICT: ${base} — backed up to ${base}.bak`);
      }
    }

    fs.copyFileSync(agentFile, dest);
    console.log(`  ${base}`);
    installedAgents.push(base);
  }

  // ── Commands ──
  console.log('\n=== Commands ===');
  const commandFiles = listMdFiles(src.commandsSrc);

  for (const cmdFile of commandFiles) {
    const base = path.basename(cmdFile);

    // Special handling for update.md — generate it fresh
    if (base === 'update.md') {
      const updateContent = generateUpdateCommand(runtimeKey, paths.manifestFile);
      fs.writeFileSync(joinPath(paths.commandsDir, base), updateContent);
      console.log(`  legion/${base} (generated)`);
      continue;
    }

    const raw = fs.readFileSync(cmdFile, 'utf8');
    const transformed = transformCommand(raw, runtimeKey, paths.skillsDir, paths.agentsDir);
    fs.writeFileSync(joinPath(paths.commandsDir, base), transformed);
    console.log(`  legion/${base}`);
  }

  // ── Skills ──
  console.log('\n=== Skills ===');
  const skillDirs = listDirs(src.skillsSrc);
  let skillCount = 0;

  for (const skillDir of skillDirs) {
    const skillName = path.basename(skillDir);
    const destSkillDir = joinPath(paths.skillsDir, skillName);

    // Special handling for workflow-common: rewrite agent path resolution
    if (skillName === 'workflow-common') {
      ensureDirs([destSkillDir]);
      for (const entry of fs.readdirSync(skillDir)) {
        const srcPath = joinPath(skillDir, entry);
        const destPath = joinPath(destSkillDir, entry);
        if (fs.statSync(srcPath).isDirectory()) {
          copyDirRecursive(srcPath, destPath);
        } else if (entry === 'SKILL.md') {
          let content = fs.readFileSync(srcPath, 'utf8');
          content = rewriteAgentPathResolution(content, paths.manifestFile);
          fs.writeFileSync(destPath, content);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    } else {
      copyDirRecursive(skillDir, destSkillDir);
    }

    console.log(`  ${skillName}/`);
    skillCount++;
  }

  // ── Adapters ──
  console.log('\n=== Adapters ===');
  const adapterFiles = listMdFiles(src.adaptersSrc);
  for (const adapterFile of adapterFiles) {
    const base = path.basename(adapterFile);
    fs.copyFileSync(adapterFile, joinPath(paths.adaptersDir, base));
    console.log(`  ${base}`);
  }

  // ── Manifest ──
  console.log('\n=== Manifest ===');
  writeManifest(paths, runtimeKey, installedAgents, scope, sourceInfo.source, verify);
  console.log(`  Written to ${paths.manifestFile}`);

  // ── Summary ──
  console.log(`
${'='.repeat(48)}
  Legion v${pkg.version} installed successfully!

  Runtime:  ${rt.label}
  Agents:   ${installedAgents.length} -> ${paths.agentsDir}
  Commands: ${commandFiles.length} -> ${paths.commandsDir}
  Skills:   ${skillCount} -> ${paths.skillsDir}
  Scope:    ${scope}
  Support:  ${rt.supportTier}
  Source:   ${sourceInfo.source}
  Verified: ${verify ? 'yes' : 'no'}`);

  if (rt.supportTier !== 'certified') {
    console.log(`\n  NOTE: ${rt.label} is currently marked ${rt.supportTier} in Legion.`);
    console.log('  Advanced coordination features may vary by CLI runtime and version.');
    runRuntimeDiagnostics(runtimeKey);
  }
  if (conflicts.length > 0) {
    console.log(`
  WARNING: ${conflicts.length} agent file(s) conflicted.
  Backups saved as .bak files in ${paths.agentsDir}`);
  }

  console.log(`${'='.repeat(48)}

  Restart your CLI to pick up the new commands.
  Run '/legion:status' to verify.
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8: Update Command Generation
// ─────────────────────────────────────────────────────────────────────────────

function generateUpdateCommand(runtimeKey, manifestFile) {
  const rt = RUNTIMES[runtimeKey];
  return `---
name: legion:update
description: Check for Legion updates and install the latest version
allowed-tools: [Read, Bash]
---

<objective>
Check the installed Legion version against the latest npm release and update if a newer version is available.
</objective>

<process>
1. READ CURRENT VERSION
   - Read the Legion manifest:
     Run: Bash  cat "${manifestFile}" 2>/dev/null
   - Extract the "version" field from the JSON
   - If no manifest found: "Legion is not installed. Run: npx @9thlevelsoftware/legion ${rt.flag}"

2. CHECK LATEST VERSION
   - Run: Bash  npm show @9thlevelsoftware/legion version 2>/dev/null
   - If command fails: "Could not check npm registry. Check your internet connection."
   - Store as LATEST_VERSION

3. COMPARE VERSIONS
   - If installed version == LATEST_VERSION:
     Display: "Legion is up to date (v{version})."
     Stop.
   - If versions differ:
     Display: "Update available: v{installed} -> v{LATEST_VERSION}"

4. INSTALL UPDATE
   - Run: Bash  npx @9thlevelsoftware/legion@latest ${rt.flag} --global
   - Display the installer output
   - Remind user to restart their CLI

5. SHOW CHANGELOG
   - Run: Bash  npm show @9thlevelsoftware/legion --json 2>/dev/null
   - If available, show what changed in the new version
</process>
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9: Uninstall Pipeline
// ─────────────────────────────────────────────────────────────────────────────

function uninstall(runtimeKey, scope) {
  const home = resolveHome();
  const paths = resolvePaths(runtimeKey, scope, home);
  const manifest = readManifest(paths.manifestFile);

  if (!manifest) {
    console.error('No Legion manifest found. Nothing to uninstall.');
    console.error(`Expected manifest at: ${paths.manifestFile}`);
    process.exit(1);
  }

  const rt = RUNTIMES[runtimeKey];
  console.log(`\nUninstalling Legion (${rt.label}, ${scope} mode)...\n`);

  // Remove only Legion-owned agents (by filename from manifest)
  let removedAgents = 0;
  let restoredBackups = 0;
  const agentsDir = manifest.paths.agents || paths.agentsDir;

  for (const agentFile of (manifest.agents || [])) {
    const agentPath = joinPath(agentsDir, agentFile);
    if (fs.existsSync(agentPath)) {
      fs.unlinkSync(agentPath);
      removedAgents++;
    }
    // Restore .bak if it exists
    const bakPath = agentPath + '.bak';
    if (fs.existsSync(bakPath)) {
      fs.renameSync(bakPath, agentPath);
      restoredBackups++;
      console.log(`  Restored backup: ${agentFile}`);
    }
  }
  console.log(`  Removed ${removedAgents} agent files`);

  // Remove commands directory
  const commandsDir = manifest.paths.commands || paths.commandsDir;
  if (fs.existsSync(commandsDir)) {
    fs.rmSync(commandsDir, { recursive: true, force: true });
    console.log('  Removed commands/legion/');
  }

  // Remove skills
  const skillsDir = manifest.paths.skills || paths.skillsDir;
  if (fs.existsSync(skillsDir)) {
    fs.rmSync(skillsDir, { recursive: true, force: true });
    console.log('  Removed skills/');
  }

  // Remove adapters
  const adaptersDir = manifest.paths.adapters || paths.adaptersDir;
  if (fs.existsSync(adaptersDir)) {
    fs.rmSync(adaptersDir, { recursive: true, force: true });
    console.log('  Removed adapters/');
  }

  // Remove manifest
  if (fs.existsSync(paths.manifestFile)) {
    fs.unlinkSync(paths.manifestFile);
    console.log('  Removed manifest.json');
  }

  // Clean up empty parent directories
  const dirsToTry = [
    paths.manifestDir,
    // For non-claude runtimes, also try removing the agents/commands parent dirs if empty
    joinPath(commandsDir, '..'), // commands/ parent (contains legion/ subdir)
    agentsDir,
  ];
  for (const dir of dirsToTry) {
    try { fs.rmdirSync(dir); } catch { /* not empty or doesn't exist, that's fine */ }
  }

  console.log(`\nLegion uninstalled from ${scope === 'local' ? process.cwd() : '~'}.`);
  if (restoredBackups > 0) {
    console.log(`  ${restoredBackups} backed-up agent file(s) restored.`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 10: Update Check
// ─────────────────────────────────────────────────────────────────────────────

async function fetchNpmLatest(packageName) {
  const https = require('https');
  return new Promise((resolve, reject) => {
    const url = `https://registry.npmjs.org/${packageName}/latest`;
    https.get(url, { headers: { Accept: 'application/json' }, timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data).version); }
        catch { reject(new Error('Failed to parse npm registry response')); }
      });
    }).on('timeout', function() { this.destroy(); reject(new Error('Registry request timed out')); }).on('error', reject);
  });
}

async function update(runtimeKey, scope, verify = false) {
  const home = resolveHome();
  const paths = resolvePaths(runtimeKey, scope, home);
  const manifest = readManifest(paths.manifestFile);

  if (!manifest) {
    console.error('Legion is not installed. Run install first:');
    console.error(`  npx @9thlevelsoftware/legion ${RUNTIMES[runtimeKey].flag}`);
    process.exit(1);
  }

  const installedVersion = manifest.version;
  console.log(`\nInstalled version: v${installedVersion}`);
  console.log('Checking npm registry...');

  try {
    const pkg = readPackageJson();
    const latestVersion = pkg.version; // When run via npx, this IS the latest
    // Also try the registry for comparison
    let registryVersion;
    try {
      registryVersion = await fetchNpmLatest(pkg.name);
    } catch {
      registryVersion = latestVersion;
    }

    const targetVersion = registryVersion || latestVersion;

    if (installedVersion === targetVersion) {
      console.log(`Legion is up to date (v${installedVersion}).`);
      return;
    }

    console.log(`Update available: v${installedVersion} -> v${targetVersion}`);
    console.log('Re-installing...\n');
    install(runtimeKey, scope, verify);
  } catch (err) {
    console.error(`Update check failed: ${err.message}`);
    console.error('Your installed version is still functional.');
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 11: Main Entry Point
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.action === 'help')    { printHelp(); process.exit(0); }
  if (args.action === 'version') { printVersion(); process.exit(0); }

  let runtime = args.runtime;

  // Interactive runtime selection if no flag given
  if (!runtime && args.action === 'install') {
    runtime = await promptRuntimeSelection();
  } else if (!runtime) {
    console.error('Runtime flag required for this action. Use --claude, --codex, etc.');
    console.error('Run with --help for full usage.');
    process.exit(1);
  }

  if (!RUNTIMES[runtime]) {
    console.error(`Unknown runtime: ${runtime}`);
    process.exit(1);
  }

  try {
    switch (args.action) {
      case 'uninstall':
        uninstall(runtime, args.scope);
        break;
      case 'update':
        await update(runtime, args.scope, args.verify);
        break;
      default:
        install(runtime, args.scope, args.verify);
    }
  } catch (err) {
    console.error(`\nLegion installer failed: ${err.message}`);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
}

main();











