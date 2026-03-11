#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const {
  LEGION_COMMANDS,
  RUNTIME_METADATA,
  RUNTIME_ORDER,
  installableRuntimeKeys,
  resolveRuntimeKey,
} = require('./runtime-metadata');

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: Runtime Registry
// ─────────────────────────────────────────────────────────────────────────────
// Runtime contracts live in bin/runtime-metadata.js so installer behavior,
// docs, and tests share the same evidence-backed source of truth.

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: CLI / Argument Parsing
// ─────────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const result = { runtime: null, scope: 'global', action: 'install', verify: false };

  for (const arg of argv) {
    const runtimeKey = resolveRuntimeKey(arg);
    if (runtimeKey) result.runtime = runtimeKey;
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

function promptRuntimeSelection(scope) {
  return new Promise((resolve) => {
    const entries = installableRuntimeKeys()
      .filter((runtimeKey) => RUNTIME_METADATA[runtimeKey].scopeSupport[scope])
      .map((runtimeKey) => [runtimeKey, RUNTIME_METADATA[runtimeKey]]);

    if (entries.length === 0) {
      throw new Error(`No Legion runtimes support ${scope} installs.`);
    }

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
  --kiro        Kiro CLI (preferred)
  --amazon-q    Deprecated alias for --kiro
  --windsurf    Windsurf
  --opencode    OpenCode
  --aider       Aider (manual-only guidance; native install disabled)

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

function dirnamePath(p) {
  return normalizePath(path.dirname(p));
}

function resolveHome() {
  const home = process.env.HOME || process.env.USERPROFILE || os.homedir();
  if (!home) {
    console.error('Cannot determine home directory. Set $HOME or $USERPROFILE.');
    process.exit(1);
  }
  return normalizePath(home);
}

function resolveTemplatePath(template, scope, home) {
  if (!template) return null;
  const projectDir = normalizePath(process.cwd());
  return normalizePath(
    template
      .replace(/\$PROJECT/g, projectDir)
      .replace(/\$HOME/g, home)
      .replace(/\$SCOPE/g, scope)
  );
}

function resolveNativeSurfaces(runtimeKey, scope, home) {
  const runtime = RUNTIME_METADATA[runtimeKey];
  return runtime.nativeSurfaces
    .map((surface) => {
      const template = scope === 'local' ? surface.localPath : surface.globalPath;
      const resolvedPath = resolveTemplatePath(template, scope, home);
      if (!resolvedPath) return null;
      return {
        ...surface,
        path: resolvedPath,
      };
    })
    .filter(Boolean);
}

function codexPromptStem(commandName) {
  return `legion-${commandName}`;
}

function codexPromptFileName(commandName) {
  return `${codexPromptStem(commandName)}.md`;
}

function codexPromptInvocation(paths, commandName) {
  return `${paths.promptNamespace}${codexPromptStem(commandName)}`;
}

function getNativeSurface(paths, surfaceKey) {
  return paths.nativeSurfaces.find((surface) => surface.key === surfaceKey) || null;
}

function resolvePaths(runtime, scope, home) {
  const rt = RUNTIME_METADATA[runtime];
  const base = scope === 'local' ? normalizePath(process.cwd()) : home;
  const nativeSurfaces = resolveNativeSurfaces(runtime, scope, home);

  let manifestDir;
  let agentsDir;
  let commandsDir;
  let skillsDir;
  let adaptersDir;
  let manifestFile;

  if (rt.storageLayout === 'claude') {
    const root = scope === 'local' ? joinPath(base, '.claude') : joinPath(home, '.claude');
    agentsDir = joinPath(root, 'agents');
    commandsDir = joinPath(root, 'commands/legion');
    skillsDir = joinPath(root, 'legion/skills');
    adaptersDir = joinPath(root, 'legion/adapters');
    manifestDir = joinPath(root, 'legion');
    manifestFile = joinPath(manifestDir, 'manifest.json');
  } else {
    const root = scope === 'local' ? joinPath(base, '.legion') : joinPath(home, '.legion');
    agentsDir = joinPath(root, 'agents');
    commandsDir = joinPath(root, 'commands/legion');
    skillsDir = joinPath(root, 'skills');
    adaptersDir = joinPath(root, 'adapters');
    manifestDir = root;
    manifestFile = joinPath(root, 'manifest.json');
  }

  const codexPrompts = getNativeSurface({ nativeSurfaces }, 'codex-prompts');
  const codexBridge = getNativeSurface({ nativeSurfaces }, 'codex-bridge');

  return {
    agentsDir,
    commandsDir,
    skillsDir,
    adaptersDir,
    manifestDir,
    manifestFile,
    nativeSurfaces,
    promptsDir: codexPrompts ? codexPrompts.path : null,
    promptNamespace: runtime === 'codex' ? (scope === 'local' ? '/project:' : '/prompts:') : null,
    bridgeSkillDir: codexBridge ? dirnamePath(codexBridge.path) : null,
    bridgeSkillFile: codexBridge ? codexBridge.path : null,
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
  // Normalize CRLF to LF so checksums match across Windows and Linux
  const normalized = Buffer.from(data.toString('utf8').replace(/\r\n/g, '\n'));
  return crypto.createHash('sha256').update(normalized).digest('hex');
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

function runRuntimeDiagnostics(runtimeKey, scope, paths) {
  const runtime = RUNTIME_METADATA[runtimeKey];
  if (!runtime || runtime.nativeSurfaces.length === 0) return;

  console.log('  Native Legion surfaces installed at:');
  for (const surface of paths.nativeSurfaces) {
    console.log(`    - ${surface.key}: ${surface.path}`);
  }

  if (!runtime.scopeSupport[scope]) {
    console.log(`  ${runtime.label} does not support ${scope} installs in Legion.`);
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
  const rt = RUNTIME_METADATA[runtimeKey];
  content = rewriteAllowedTools(content, rt.allowedTools);
  content = rewriteSkillPaths(content, installedSkillsDir);
  content = rewriteContextRefs(content, installedSkillsDir, installedAgentsDir, rt.supportsAtRefs);
  return content;
}

function generateCodexBridgeSkill(paths) {
  const mappingLines = LEGION_COMMANDS
    .map((commandName) => {
      return `- \`/legion:${commandName}\` -> \`${codexPromptInvocation(paths, commandName)}\` -> \`${paths.promptsDir}/${codexPromptFileName(commandName)}\``;
    })
    .join('\n');

  return `---
name: legion
description: Bridge Codex requests to the Legion workflow installed at ${paths.manifestDir} when the user references Legion or any legacy /legion:* command.
---

# Legion for Codex

Codex supports custom prompt commands. Legion installs native prompt files at \`${paths.promptsDir}\` and keeps this bridge skill so plain-language Legion requests and legacy \`/legion:*\` aliases still route to the right workflow.

## Native Prompt Mapping

${mappingLines}

## How To Use

1. Prefer the installed native prompt files when the user wants slash commands. For this install, the canonical entry point is \`${codexPromptInvocation(paths, 'start')}\`.
2. If the user types a legacy \`/legion:*\` alias and Codex reports it as unrecognized, map it to the matching native prompt command above.
3. If the user mentions Legion in plain language, treat it as the same intent and follow the matching Legion workflow.
4. Load only the matching Legion command markdown and only the files named in its \`<execution_context>\`.
5. Use the current project's \`.planning/PROJECT.md\`, \`.planning/ROADMAP.md\`, and \`.planning/STATE.md\` when the Legion workflow expects project state.
6. For install or update requests, check \`${paths.manifestFile}\` first and use \`${paths.commandsDir}/update.md\` as the workflow reference.

## Guardrails

- Do not claim that legacy \`/legion:*\` aliases are native Codex commands unless the runtime explicitly resolves them.
- Prefer the native Codex prompt commands at \`${paths.promptsDir}\` for slash-command entry points.
- Do not bulk-load all Legion skills. Follow the target command's execution context and keep context narrow.
- Prefer the Codex adapter at \`${paths.adaptersDir}/codex-cli.md\` when Legion behavior depends on runtime capabilities.
`;
}

function extractFrontmatterValue(content, fieldName) {
  const match = content.match(new RegExp(`^${fieldName}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim().replace(/^"|"$/g, '') : null;
}

function legionCommandFile(paths, commandName) {
  return joinPath(paths.commandsDir, `${commandName}.md`);
}

function legionRuntimeWrapperPreamble(runtimeLabel, commandName, paths) {
  return [
    `You are executing the Legion \`/legion:${commandName}\` workflow inside ${runtimeLabel}.`,
    `Read \`${legionCommandFile(paths, commandName)}\` first and treat it as the authoritative workflow definition.`,
    `Load only the matching workflow file and the files it names in \`<execution_context>\` and \`<context>\`.`,
    `Use \`${paths.manifestFile}\` if you need to resolve the installed Legion bundle paths.`,
    'Use `.planning/PROJECT.md`, `.planning/ROADMAP.md`, and `.planning/STATE.md` when the workflow expects project state.',
  ].join('\n');
}

function generateGeminiCommand(paths, commandName, commandContent) {
  const description = extractFrontmatterValue(commandContent, 'description')
    || `Run the Legion ${commandName} workflow`;
  const prompt = `${legionRuntimeWrapperPreamble('Gemini CLI', commandName, paths)}

If the user included extra text after the slash command, treat it as additional arguments or clarification.`;

  return [
    `description = ${JSON.stringify(description)}`,
    'prompt = """',
    prompt.replace(/"""/g, '\\"""'),
    '"""',
    '',
  ].join('\n');
}

function generateOpenCodeAgent(paths) {
  return `---
description: "Coordinate Legion workflows using the installed Legion bundle"
mode: subagent
---

You are Legion's orchestrator for OpenCode.

- Use \`${paths.manifestFile}\` to find the installed Legion bundle.
- Read only the matching command file under \`${paths.commandsDir}\`.
- Route legacy \`/legion:*\` aliases to the corresponding flat OpenCode commands such as \`/legion-start\`.
- Coordinate through artifacts in \`.planning/\`; do not assume direct inter-agent messaging.
`;
}

function generateOpenCodeCommand(paths, commandName, commandContent) {
  const description = extractFrontmatterValue(commandContent, 'description')
    || `Run the Legion ${commandName} workflow`;
  return `---
description: ${JSON.stringify(description)}
agent: legion-orchestrator
---

${legionRuntimeWrapperPreamble('OpenCode', commandName, paths)}

Treat \`$ARGUMENTS\` as extra user-provided arguments or clarification.
`;
}

function generateCopilotSkill(paths, commandName, commandContent) {
  const description = extractFrontmatterValue(commandContent, 'description')
    || `Run the Legion ${commandName} workflow`;
  return `---
description: ${JSON.stringify(description)}
allowed-tools: [read, search, edit, write, bash]
---

# Legion ${commandName}

${legionRuntimeWrapperPreamble('GitHub Copilot CLI', commandName, paths)}

If the user invoked this skill with extra text after \`/legion-${commandName}\`, treat it as arguments or clarification for the workflow.
`;
}

function generateCopilotAgent(paths) {
  return `---
name: legion-orchestrator
description: "Coordinate Legion workflows using the installed Legion bundle"
tools: [read, search, edit, write, bash]
---

You are Legion's orchestrator for GitHub Copilot.

- Skills such as \`/legion-start\` and \`/legion-plan\` are the primary Legion entry points.
- When the user selects this agent directly, read the matching command file under \`${paths.commandsDir}\` and execute it faithfully.
- Use \`${paths.manifestFile}\` if you need to resolve the rest of the Legion bundle.
- Prefer Legion's workflow files over ad-hoc improvisation.
`;
}

function generateCursorRule(paths) {
  const mappingLines = LEGION_COMMANDS
    .map((commandName) => `- \`/legion:${commandName}\` -> \`${legionCommandFile(paths, commandName)}\``)
    .join('\n');

  return `---
description: Route Legion requests to the installed Legion workflow bundle
alwaysApply: false
---

Legion is installed in this workspace.

There are no native Legion slash commands in Cursor. When the user asks to use Legion or types a legacy \`/legion:*\` alias:

${mappingLines}

Rules:
- Read only the matching command file first.
- Then load only the files named in that command's \`<execution_context>\` and \`<context>\`.
- Use \`.planning/PROJECT.md\`, \`.planning/ROADMAP.md\`, and \`.planning/STATE.md\` when the workflow expects project state.
- Prefer Review mode or plain chat for read-only review flows; use background agents only when a Legion plan explicitly benefits from parallel execution.
`;
}

function generateWindsurfRule(paths) {
  const mappingLines = LEGION_COMMANDS
    .map((commandName) => `- \`/legion:${commandName}\` -> \`${legionCommandFile(paths, commandName)}\``)
    .join('\n');

  return `# Legion for Windsurf

Legion is installed in this workspace.

Windsurf does not expose native Legion slash-command files. When the user asks to use Legion or types a legacy \`/legion:*\` alias, route to the matching installed workflow:

${mappingLines}

Execution rules:
- Read only the matching workflow file first.
- Then load only the files named in that workflow's \`<execution_context>\` and \`<context>\`.
- Use \`.planning/PROJECT.md\`, \`.planning/ROADMAP.md\`, and \`.planning/STATE.md\` when the workflow expects project state.
- Use Ask mode for read-only Legion advisory work.
- Use Planning mode or Todo tracking when the workflow needs multi-step execution.
`;
}

function generateKiroAgent(paths) {
  return `---
name: legion-orchestrator
description: "Coordinate Legion workflows using the installed Legion bundle"
tools: [read, edit, write, bash]
---

You are Legion's orchestrator for Kiro CLI.

- Read \`${paths.manifestFile}\` if you need to locate the installed Legion bundle.
- For any Legion request, read the matching command file under \`${paths.commandsDir}\` first and treat it as authoritative.
- Coordinate through artifacts in \`.planning/\`; do not invent hidden cross-agent state.
- If the user types a legacy \`/legion:*\` alias, map it to the matching command file instead of claiming Kiro supports that slash command natively.
`;
}

function generateKiroSteering(paths) {
  const mappingLines = LEGION_COMMANDS
    .map((commandName) => `- \`/legion:${commandName}\` -> \`${legionCommandFile(paths, commandName)}\``)
    .join('\n');

  return `# Legion Steering

Legion is installed for this Kiro environment.

Use the custom agent \`@legion-orchestrator\` when the user asks to work in Legion.

Legacy alias mapping:
${mappingLines}

Rules:
- Read only the matching command file first.
- Then load only the files named in that command's \`<execution_context>\` and \`<context>\`.
- Use \`.planning/PROJECT.md\`, \`.planning/ROADMAP.md\`, and \`.planning/STATE.md\` when the workflow expects project state.
`;
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

function backupIfChanged(filePath, content) {
  if (!fs.existsSync(filePath)) return false;
  const existing = fs.readFileSync(filePath, 'utf8');
  if (existing === content) return false;
  fs.copyFileSync(filePath, filePath + '.bak');
  return true;
}

function writeManagedFile(filePath, content, nativeArtifacts) {
  const backupCreated = backupIfChanged(filePath, content);
  fs.writeFileSync(filePath, content);
  nativeArtifacts.push({ path: filePath, backupCreated });
  return backupCreated;
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

function writeManifest(paths, runtimeKey, agentFiles, scope, source, verified, promptFiles = [], nativeArtifacts = []) {
  const pkg = readPackageJson();
  const runtime = RUNTIME_METADATA[runtimeKey];
  const manifest = {
    name: pkg.name,
    version: pkg.version,
    installedAt: new Date().toISOString(),
    runtime: runtimeKey,
    scope,
    source,
    verified,
    supportTier: runtime.supportTier,
    disposition: runtime.disposition,
    installSurface: runtime.installSurface,
    paths: {
      agents: paths.agentsDir,
      commands: paths.commandsDir,
      skills: paths.skillsDir,
      adapters: paths.adaptersDir,
      manifest: paths.manifestFile,
      native: Object.fromEntries(paths.nativeSurfaces.map((surface) => [surface.key, surface.path])),
      ...(paths.promptsDir ? { prompts: paths.promptsDir } : {}),
      ...(paths.bridgeSkillFile ? { bridgeSkill: paths.bridgeSkillFile } : {}),
    },
    agents: agentFiles,
    nativeArtifacts,
    ...(promptFiles.length > 0 ? { promptFiles } : {}),
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

function assertInstallSupported(runtimeKey, scope) {
  const runtime = RUNTIME_METADATA[runtimeKey];
  if (runtime.scopeSupport[scope]) return;

  if (runtime.disposition === 'manual-only') {
    throw new Error(
      `${runtime.label} is manual-only in Legion. Native installation is disabled. See docs/runtime-certification-checklists.md#aider.`
    );
  }

  const supportedScopes = Object.entries(runtime.scopeSupport)
    .filter(([, supported]) => supported)
    .map(([scopeName]) => scopeName)
    .join(', ');

  throw new Error(
    `${runtime.label} does not support ${scope} installs in Legion. Supported scope(s): ${supportedScopes || 'none'}.`
  );
}

function install(runtimeKey, scope, verify = false) {
  const home = resolveHome();
  const paths = resolvePaths(runtimeKey, scope, home);
  const src = resolveSourceRoot();
  const rt = RUNTIME_METADATA[runtimeKey];
  const sourceInfo = detectSourceProvenance(src.root);
  const pkg = readPackageJson();

  assertInstallSupported(runtimeKey, scope);

  if (verify) {
    verifyPackageIntegrity(src.root);
    console.log('Integrity verification passed (checksums.sha256).');
  }

  if (sourceInfo.source === 'local-git' && !verify) {
    console.log('WARNING: Installing from a local git source without --verify.');
    console.log('         Use --verify to validate file integrity before install.');
  }

  console.log(`\nInstalling Legion for ${rt.label} (${scope} mode, ${rt.supportTier} runtime)...\n`);

  const nativeDirs = paths.nativeSurfaces.map((surface) => {
    return surface.pathKind === 'dir' ? surface.path : dirnamePath(surface.path);
  });

  ensureDirs([
    paths.agentsDir,
    paths.commandsDir,
    paths.skillsDir,
    paths.adaptersDir,
    paths.manifestDir,
    ...nativeDirs,
  ]);

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
  const installedPromptFiles = [];
  const nativeArtifacts = [];
  const transformedCommands = new Map();

  for (const cmdFile of commandFiles) {
    const base = path.basename(cmdFile);
    const commandName = path.basename(base, '.md');
    let transformed;

    // Special handling for update.md — generate it fresh
    if (base === 'update.md') {
      transformed = generateUpdateCommand(runtimeKey, paths.manifestFile, scope);
      fs.writeFileSync(joinPath(paths.commandsDir, base), transformed);
      console.log(`  legion/${base} (generated)`);
    } else {
      const raw = fs.readFileSync(cmdFile, 'utf8');
      transformed = transformCommand(raw, runtimeKey, paths.skillsDir, paths.agentsDir);
      fs.writeFileSync(joinPath(paths.commandsDir, base), transformed);
      console.log(`  legion/${base}`);
    }

    transformedCommands.set(commandName, transformed);
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

  console.log('\n=== Native Runtime Surfaces ===');
  if (paths.nativeSurfaces.length === 0) {
    console.log('  none');
  }

  for (const surface of paths.nativeSurfaces) {
    switch (surface.type) {
      case 'codex-prompts': {
        for (const [commandName, commandContent] of transformedCommands.entries()) {
          const promptFile = codexPromptFileName(commandName);
          const promptPath = joinPath(surface.path, promptFile);
          const backedUp = writeManagedFile(promptPath, commandContent, nativeArtifacts);
          if (backedUp) {
            console.log(`  ${surface.key}: backed up ${promptFile}.bak`);
          }
          installedPromptFiles.push(promptFile);
          console.log(`  ${surface.key}: ${promptPath}`);
        }
        break;
      }

      case 'codex-bridge': {
        const bridgeContent = generateCodexBridgeSkill(paths);
        const backedUp = writeManagedFile(surface.path, bridgeContent, nativeArtifacts);
        if (backedUp) {
          console.log(`  ${surface.key}: backed up ${path.basename(surface.path)}.bak`);
        }
        console.log(`  ${surface.key}: ${surface.path}`);
        break;
      }

      case 'gemini-commands': {
        for (const [commandName, commandContent] of transformedCommands.entries()) {
          const commandPath = joinPath(surface.path, `${commandName}.toml`);
          const wrappedContent = generateGeminiCommand(paths, commandName, commandContent);
          const backedUp = writeManagedFile(commandPath, wrappedContent, nativeArtifacts);
          if (backedUp) {
            console.log(`  ${surface.key}: backed up ${path.basename(commandPath)}.bak`);
          }
          console.log(`  ${surface.key}: ${commandPath}`);
        }
        break;
      }

      case 'opencode-agent': {
        const backedUp = writeManagedFile(surface.path, generateOpenCodeAgent(paths), nativeArtifacts);
        if (backedUp) {
          console.log(`  ${surface.key}: backed up ${path.basename(surface.path)}.bak`);
        }
        console.log(`  ${surface.key}: ${surface.path}`);
        break;
      }

      case 'opencode-commands': {
        for (const [commandName, commandContent] of transformedCommands.entries()) {
          const commandPath = joinPath(surface.path, `legion-${commandName}.md`);
          const wrappedContent = generateOpenCodeCommand(paths, commandName, commandContent);
          const backedUp = writeManagedFile(commandPath, wrappedContent, nativeArtifacts);
          if (backedUp) {
            console.log(`  ${surface.key}: backed up ${path.basename(commandPath)}.bak`);
          }
          console.log(`  ${surface.key}: ${commandPath}`);
        }
        break;
      }

      case 'copilot-skills': {
        for (const [commandName, commandContent] of transformedCommands.entries()) {
          const skillDir = joinPath(surface.path, `legion-${commandName}`);
          const skillPath = joinPath(skillDir, 'SKILL.md');
          ensureDirs([skillDir]);
          const backedUp = writeManagedFile(skillPath, generateCopilotSkill(paths, commandName, commandContent), nativeArtifacts);
          if (backedUp) {
            console.log(`  ${surface.key}: backed up legion-${commandName}/SKILL.md.bak`);
          }
          console.log(`  ${surface.key}: ${skillPath}`);
        }
        break;
      }

      case 'copilot-agent': {
        const backedUp = writeManagedFile(surface.path, generateCopilotAgent(paths), nativeArtifacts);
        if (backedUp) {
          console.log(`  ${surface.key}: backed up ${path.basename(surface.path)}.bak`);
        }
        console.log(`  ${surface.key}: ${surface.path}`);
        break;
      }

      case 'cursor-rule': {
        const backedUp = writeManagedFile(surface.path, generateCursorRule(paths), nativeArtifacts);
        if (backedUp) {
          console.log(`  ${surface.key}: backed up ${path.basename(surface.path)}.bak`);
        }
        console.log(`  ${surface.key}: ${surface.path}`);
        break;
      }

      case 'windsurf-rule': {
        const backedUp = writeManagedFile(surface.path, generateWindsurfRule(paths), nativeArtifacts);
        if (backedUp) {
          console.log(`  ${surface.key}: backed up ${path.basename(surface.path)}.bak`);
        }
        console.log(`  ${surface.key}: ${surface.path}`);
        break;
      }

      case 'kiro-agent': {
        const backedUp = writeManagedFile(surface.path, generateKiroAgent(paths), nativeArtifacts);
        if (backedUp) {
          console.log(`  ${surface.key}: backed up ${path.basename(surface.path)}.bak`);
        }
        console.log(`  ${surface.key}: ${surface.path}`);
        break;
      }

      case 'kiro-steering': {
        const backedUp = writeManagedFile(surface.path, generateKiroSteering(paths), nativeArtifacts);
        if (backedUp) {
          console.log(`  ${surface.key}: backed up ${path.basename(surface.path)}.bak`);
        }
        console.log(`  ${surface.key}: ${surface.path}`);
        break;
      }

      default:
        throw new Error(`Unsupported native surface type: ${surface.type}`);
    }
  }

  // ── Manifest ──
  console.log('\n=== Manifest ===');
  writeManifest(paths, runtimeKey, installedAgents, scope, sourceInfo.source, verify, installedPromptFiles, nativeArtifacts);
  console.log(`  Written to ${paths.manifestFile}`);

  // ── Summary ──
  console.log(`
${'='.repeat(48)}
  Legion v${pkg.version} installed successfully!

  Runtime:  ${rt.label}
  Agents:   ${installedAgents.length} -> ${paths.agentsDir}
  Commands: ${commandFiles.length} -> ${paths.commandsDir}
  Native:   ${nativeArtifacts.length} artifact(s)
  ${paths.promptsDir ? `Prompts:  ${installedPromptFiles.length} -> ${paths.promptsDir}\n  ` : ''}Skills:   ${skillCount} -> ${paths.skillsDir}
  ${paths.bridgeSkillFile ? `Bridge:   1 -> ${paths.bridgeSkillFile}\n  ` : ''}Scope:    ${scope}
  Support:  ${rt.supportTier}
  Source:   ${sourceInfo.source}
  Verified: ${verify ? 'yes' : 'no'}`);

  if (rt.supportTier !== 'certified') {
    console.log(`\n  NOTE: ${rt.label} is currently marked ${rt.supportTier} in Legion.`);
    console.log('  Advanced coordination features may vary by CLI runtime and version.');
    runRuntimeDiagnostics(runtimeKey, scope, paths);
  }
  if (conflicts.length > 0) {
    console.log(`
  WARNING: ${conflicts.length} agent file(s) conflicted.
  Backups saved as .bak files in ${paths.agentsDir}`);
  }

  console.log(`${'='.repeat(48)}
`);

  if (runtimeKey === 'codex') {
    console.log(`  Restart Codex to pick up the Legion prompt files and bridge skill.`);
    console.log(`  Native prompt entry point: ${codexPromptInvocation(paths, 'start')}`);
    console.log('  Legacy /legion:* aliases remain bridge-only fallbacks.');
    console.log();
    return;
  }

  if (rt.entrypoints[scope]) {
    console.log(`  Restart your CLI to pick up the new Legion artifacts.`);
    console.log(`  Native Legion entry point: ${rt.entrypoints[scope]}`);
  } else {
    console.log(`  ${rt.label} does not expose a native Legion command entry point for ${scope} installs.`);
    console.log('  Use the installed native rules or steering files and ask the runtime to use Legion in plain language.');
  }
  console.log();
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8: Update Command Generation
// ─────────────────────────────────────────────────────────────────────────────

function generateUpdateCommand(runtimeKey, manifestFile, scope) {
  const rt = RUNTIME_METADATA[runtimeKey];
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
   - Run: Bash  npx @9thlevelsoftware/legion@latest ${rt.flag} --${scope}
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

  const rt = RUNTIME_METADATA[runtimeKey];
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

  let nativeArtifacts = Array.isArray(manifest.nativeArtifacts)
    ? manifest.nativeArtifacts.map((artifact) => {
        return typeof artifact === 'string' ? { path: artifact } : artifact;
      })
    : [];

  // Backward compatibility for manifests written before nativeArtifacts existed.
  if (nativeArtifacts.length === 0) {
    const promptsDir = manifest.paths.prompts || paths.promptsDir;
    for (const promptFile of (manifest.promptFiles || [])) {
      nativeArtifacts.push({ path: joinPath(promptsDir, promptFile) });
    }
    const bridgeSkillFile = manifest.paths.bridgeSkill || paths.bridgeSkillFile;
    if (bridgeSkillFile) {
      nativeArtifacts.push({ path: bridgeSkillFile });
    }
  }

  let removedNativeArtifacts = 0;
  let restoredNativeBackups = 0;
  for (const artifact of nativeArtifacts) {
    const artifactPath = artifact.path;
    if (!artifactPath) continue;
    if (fs.existsSync(artifactPath)) {
      fs.unlinkSync(artifactPath);
      removedNativeArtifacts++;
    }
    const backupPath = artifactPath + '.bak';
    if (fs.existsSync(backupPath)) {
      fs.renameSync(backupPath, artifactPath);
      restoredNativeBackups++;
      console.log(`  Restored native backup: ${artifactPath}`);
    }
  }
  if (removedNativeArtifacts > 0) {
    console.log(`  Removed ${removedNativeArtifacts} native runtime artifact(s)`);
  }

  // Remove manifest
  if (fs.existsSync(paths.manifestFile)) {
    fs.unlinkSync(paths.manifestFile);
    console.log('  Removed manifest.json');
  }

  // Clean up empty parent directories
  const nativeDirs = [
    ...paths.nativeSurfaces.map((surface) => {
      return surface.pathKind === 'dir' ? surface.path : dirnamePath(surface.path);
    }),
    ...nativeArtifacts.map((artifact) => dirnamePath(artifact.path)).filter(Boolean),
  ];
  const dirsToTry = [
    paths.manifestDir,
    // For non-claude runtimes, also try removing the agents/commands parent dirs if empty
    joinPath(commandsDir, '..'), // commands/ parent (contains legion/ subdir)
    agentsDir,
    ...nativeDirs,
    ...nativeDirs.map((dir) => dirnamePath(dir)),
    ...nativeDirs.map((dir) => dirnamePath(dirnamePath(dir))),
  ];
  for (const dir of dirsToTry) {
    try { fs.rmdirSync(dir); } catch { /* not empty or doesn't exist, that's fine */ }
  }

  console.log(`\nLegion uninstalled from ${scope === 'local' ? process.cwd() : '~'}.`);
  if (restoredBackups > 0) {
    console.log(`  ${restoredBackups} backed-up agent file(s) restored.`);
  }
  if (restoredNativeBackups > 0) {
    console.log(`  ${restoredNativeBackups} native runtime backup(s) restored.`);
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
    console.error(`  npx @9thlevelsoftware/legion ${RUNTIME_METADATA[runtimeKey].flag}`);
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
    runtime = await promptRuntimeSelection(args.scope);
  } else if (!runtime) {
    console.error('Runtime flag required for this action. Use --claude, --codex, --kiro, etc.');
    console.error('Run with --help for full usage.');
    process.exit(1);
  }

  if (!RUNTIME_METADATA[runtime]) {
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











