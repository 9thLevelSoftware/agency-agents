'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { RUNTIME_METADATA, RUNTIME_ORDER } = require('../bin/runtime-metadata');

const ROOT = path.resolve(__dirname, '..');
const INSTALLER = path.join(ROOT, 'bin', 'install.js');

const LOCAL_INSTALLABLE_RUNTIMES = RUNTIME_ORDER.filter((runtimeKey) => {
  return RUNTIME_METADATA[runtimeKey].scopeSupport.local;
});

const GLOBAL_INSTALLABLE_RUNTIMES = RUNTIME_ORDER.filter((runtimeKey) => {
  return RUNTIME_METADATA[runtimeKey].scopeSupport.global;
});

function runInstaller(args, cwd, homeDir) {
  return spawnSync(process.execPath, [INSTALLER, ...args], {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      HOME: homeDir,
      USERPROFILE: homeDir,
    },
  });
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function resolveTemplate(template, projectDir, homeDir, scope) {
  return normalizePath(
    template
      .replace(/\$PROJECT/g, normalizePath(projectDir))
      .replace(/\$HOME/g, normalizePath(homeDir))
      .replace(/\$SCOPE/g, scope)
  );
}

function expectedManifestPath(runtimeKey, scope, projectDir, homeDir) {
  const runtime = RUNTIME_METADATA[runtimeKey];
  const rootDir = scope === 'local' ? projectDir : homeDir;

  if (runtime.storageLayout === 'claude') {
    return path.join(rootDir, '.claude', 'legion', 'manifest.json');
  }

  return path.join(rootDir, '.legion', 'manifest.json');
}

function expectedNativePath(surface, scope, projectDir, homeDir) {
  const template = scope === 'local' ? surface.localPath : surface.globalPath;
  if (!template) return null;
  return resolveTemplate(template, projectDir, homeDir, scope);
}

function expectedNativeFiles(runtimeKey, scope, projectDir, homeDir) {
  const runtime = RUNTIME_METADATA[runtimeKey];
  const expected = [];

  for (const surface of runtime.nativeSurfaces) {
    const surfacePath = expectedNativePath(surface, scope, projectDir, homeDir);
    if (!surfacePath) continue;

    switch (surface.type) {
      case 'codex-prompts':
        expected.push(path.join(surfacePath, 'legion-start.md'));
        expected.push(path.join(surfacePath, 'legion-update.md'));
        break;
      case 'codex-bridge':
      case 'copilot-agent':
      case 'cursor-rule':
      case 'windsurf-rule':
      case 'opencode-agent':
      case 'kiro-agent':
      case 'kiro-steering':
        expected.push(surfacePath);
        break;
      case 'gemini-commands':
        expected.push(path.join(surfacePath, 'start.toml'));
        expected.push(path.join(surfacePath, 'update.toml'));
        break;
      case 'copilot-skills':
        expected.push(path.join(surfacePath, 'legion-start', 'SKILL.md'));
        expected.push(path.join(surfacePath, 'legion-update', 'SKILL.md'));
        break;
      case 'opencode-commands':
        expected.push(path.join(surfacePath, 'legion-start.md'));
        expected.push(path.join(surfacePath, 'legion-update.md'));
        break;
      default:
        throw new Error(`Unhandled native surface type in tests: ${surface.type}`);
    }
  }

  return expected;
}

function assertRunOk(result, contextLabel) {
  assert.equal(
    result.status,
    0,
    `${contextLabel} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
}

function assertRunFailed(result, contextLabel, pattern) {
  assert.notEqual(result.status, 0, `${contextLabel} should have failed`);
  const output = `${result.stdout}\n${result.stderr}`;
  assert.match(output, pattern, `${contextLabel} should mention ${pattern}`);
}

function assertManifest(runtimeKey, scope, projectDir, homeDir) {
  const manifestFile = expectedManifestPath(runtimeKey, scope, projectDir, homeDir);
  assert.ok(fs.existsSync(manifestFile), `${runtimeKey}: manifest.json should exist`);
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const runtime = RUNTIME_METADATA[runtimeKey];

  assert.equal(manifest.runtime, runtimeKey, `${runtimeKey}: runtime mismatch in manifest`);
  assert.equal(manifest.scope, scope, `${runtimeKey}: scope mismatch in manifest`);
  assert.equal(manifest.supportTier, runtime.supportTier, `${runtimeKey}: support tier mismatch`);
  assert.equal(manifest.disposition, runtime.disposition, `${runtimeKey}: disposition mismatch`);
  assert.ok(fs.existsSync(manifest.paths.agents), `${runtimeKey}: agents directory missing`);
  assert.ok(fs.existsSync(manifest.paths.commands), `${runtimeKey}: commands directory missing`);
  assert.ok(fs.existsSync(path.join(manifest.paths.commands, 'build.md')), `${runtimeKey}: build.md missing`);
  assert.deepEqual(
    Object.keys(manifest.paths.native || {}).sort(),
    runtime.nativeSurfaces
      .filter((surface) => scope === 'local' ? surface.localPath : surface.globalPath)
      .map((surface) => surface.key)
      .sort(),
    `${runtimeKey}: native surface manifest keys mismatch`
  );

  for (const surface of runtime.nativeSurfaces) {
    const expectedPath = expectedNativePath(surface, scope, projectDir, homeDir);
    if (!expectedPath) continue;
    assert.equal(
      manifest.paths.native[surface.key],
      expectedPath,
      `${runtimeKey}: native surface path mismatch for ${surface.key}`
    );
  }

  return { manifestFile, manifest };
}

test('installer local mode installs runtime-native artifacts for every supported runtime', async (t) => {
  const sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'legion-local-smoke-'));
  const homeDir = path.join(sandboxRoot, 'home');
  fs.mkdirSync(homeDir, { recursive: true });

  t.after(() => {
    fs.rmSync(sandboxRoot, { recursive: true, force: true });
  });

  for (const runtimeKey of LOCAL_INSTALLABLE_RUNTIMES) {
    await t.test(`${runtimeKey} local install + uninstall`, () => {
      const runtime = RUNTIME_METADATA[runtimeKey];
      const projectDir = path.join(sandboxRoot, `project-${runtimeKey}`);
      fs.mkdirSync(projectDir, { recursive: true });

      const installResult = runInstaller([runtime.flag, '--local'], projectDir, homeDir);
      assertRunOk(installResult, `${runtimeKey} local install`);

      const { manifestFile, manifest } = assertManifest(runtimeKey, 'local', projectDir, homeDir);
      const nativeFiles = expectedNativeFiles(runtimeKey, 'local', projectDir, homeDir);

      if (runtime.nativeSurfaces.length > 0) {
        assert.ok(Array.isArray(manifest.nativeArtifacts), `${runtimeKey}: nativeArtifacts should be recorded`);
        assert.ok(manifest.nativeArtifacts.length >= nativeFiles.length, `${runtimeKey}: nativeArtifacts should include native files`);
      }

      for (const filePath of nativeFiles) {
        assert.ok(fs.existsSync(filePath), `${runtimeKey}: expected native artifact missing at ${filePath}`);
      }

      const uninstallResult = runInstaller([runtime.flag, '--local', '--uninstall'], projectDir, homeDir);
      assertRunOk(uninstallResult, `${runtimeKey} local uninstall`);
      assert.ok(!fs.existsSync(manifestFile), `${runtimeKey}: manifest.json should be removed after uninstall`);
      for (const filePath of nativeFiles) {
        assert.ok(!fs.existsSync(filePath), `${runtimeKey}: native artifact should be removed after uninstall: ${filePath}`);
      }
    });
  }
});

test('installer global mode installs runtime-native artifacts for every globally supported runtime', async (t) => {
  const sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'legion-global-smoke-'));
  const homeDir = path.join(sandboxRoot, 'home');
  const projectDir = path.join(sandboxRoot, 'project');
  fs.mkdirSync(homeDir, { recursive: true });
  fs.mkdirSync(projectDir, { recursive: true });

  t.after(() => {
    fs.rmSync(sandboxRoot, { recursive: true, force: true });
  });

  for (const runtimeKey of GLOBAL_INSTALLABLE_RUNTIMES) {
    await t.test(`${runtimeKey} global install + uninstall`, () => {
      const runtime = RUNTIME_METADATA[runtimeKey];

      const installResult = runInstaller([runtime.flag, '--global'], projectDir, homeDir);
      assertRunOk(installResult, `${runtimeKey} global install`);

      const { manifestFile } = assertManifest(runtimeKey, 'global', projectDir, homeDir);
      const nativeFiles = expectedNativeFiles(runtimeKey, 'global', projectDir, homeDir);
      for (const filePath of nativeFiles) {
        assert.ok(fs.existsSync(filePath), `${runtimeKey}: expected global native artifact missing at ${filePath}`);
      }

      const uninstallResult = runInstaller([runtime.flag, '--global', '--uninstall'], projectDir, homeDir);
      assertRunOk(uninstallResult, `${runtimeKey} global uninstall`);
      assert.ok(!fs.existsSync(manifestFile), `${runtimeKey}: global manifest.json should be removed after uninstall`);
      for (const filePath of nativeFiles) {
        assert.ok(!fs.existsSync(filePath), `${runtimeKey}: global native artifact should be removed after uninstall: ${filePath}`);
      }
    });
  }
});

test('installer rejects unsupported scope and manual-only runtime installs', () => {
  const sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'legion-unsupported-'));
  const homeDir = path.join(sandboxRoot, 'home');
  const projectDir = path.join(sandboxRoot, 'project');
  fs.mkdirSync(homeDir, { recursive: true });
  fs.mkdirSync(projectDir, { recursive: true });

  try {
    assertRunFailed(
      runInstaller(['--cursor', '--global'], projectDir, homeDir),
      'cursor global install',
      /does not support global installs/i
    );
    assertRunFailed(
      runInstaller(['--windsurf', '--global'], projectDir, homeDir),
      'windsurf global install',
      /does not support global installs/i
    );
    assertRunFailed(
      runInstaller(['--aider', '--local'], projectDir, homeDir),
      'aider local install',
      /manual-only/i
    );
  } finally {
    fs.rmSync(sandboxRoot, { recursive: true, force: true });
  }
});

test('deprecated --amazon-q alias installs the Kiro runtime contract', () => {
  const sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'legion-kiro-alias-'));
  const homeDir = path.join(sandboxRoot, 'home');
  const projectDir = path.join(sandboxRoot, 'project');
  fs.mkdirSync(homeDir, { recursive: true });
  fs.mkdirSync(projectDir, { recursive: true });

  try {
    const installResult = runInstaller(['--amazon-q', '--local'], projectDir, homeDir);
    assertRunOk(installResult, 'amazon-q alias local install');

    const { manifestFile, manifest } = assertManifest('kiro', 'local', projectDir, homeDir);
    assert.equal(manifest.runtime, 'kiro', 'amazon-q alias should write kiro runtime in manifest');
    assert.ok(fs.existsSync(path.join(projectDir, '.kiro', 'agents', 'legion-orchestrator.md')), 'kiro custom agent should exist');

    const uninstallResult = runInstaller(['--kiro', '--local', '--uninstall'], projectDir, homeDir);
    assertRunOk(uninstallResult, 'kiro uninstall after amazon-q alias install');
    assert.ok(!fs.existsSync(manifestFile), 'kiro manifest should be removed after uninstall');
  } finally {
    fs.rmSync(sandboxRoot, { recursive: true, force: true });
  }
});

test('installer --verify validates checksums in local source installs', () => {
  const sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'legion-verify-'));
  const homeDir = path.join(sandboxRoot, 'home');
  const projectDir = path.join(sandboxRoot, 'project');
  fs.mkdirSync(homeDir, { recursive: true });
  fs.mkdirSync(projectDir, { recursive: true });

  try {
    const installResult = runInstaller(['--codex', '--local', '--verify'], projectDir, homeDir);
    assertRunOk(installResult, 'codex install --verify');
    assert.match(installResult.stdout, /Integrity verification passed/, 'verify output should confirm checksum validation');
  } finally {
    fs.rmSync(sandboxRoot, { recursive: true, force: true });
  }
});
