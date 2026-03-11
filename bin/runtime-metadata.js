'use strict';

const LEGION_COMMANDS = [
  'start',
  'plan',
  'build',
  'review',
  'status',
  'quick',
  'advise',
  'portfolio',
  'milestone',
  'agent',
  'explore',
  'update',
];

const SUPPORT_TIERS = ['certified', 'beta', 'experimental'];

const RUNTIME_METADATA = {
  claude: {
    key: 'claude',
    flag: '--claude',
    aliases: [],
    label: 'Claude Code',
    adapterFile: 'claude-code.md',
    supportTier: 'certified',
    disposition: 'native-commands',
    installSurface: 'native slash commands, agents, and skills',
    scopeSupport: { local: true, global: true },
    storageLayout: 'claude',
    allowedTools: null,
    supportsAtRefs: true,
    nativeSurfaces: [],
    entrypoints: {
      local: '/legion:start',
      global: '/legion:start',
    },
    evidence: [],
  },
  codex: {
    key: 'codex',
    flag: '--codex',
    aliases: [],
    label: 'OpenAI Codex CLI',
    adapterFile: 'codex-cli.md',
    supportTier: 'beta',
    disposition: 'native-prompts',
    installSurface: 'native prompt files plus a bridge skill',
    scopeSupport: { local: true, global: true },
    storageLayout: 'legion',
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'],
    supportsAtRefs: false,
    nativeSurfaces: [
      {
        key: 'codex-prompts',
        type: 'codex-prompts',
        pathKind: 'dir',
        localPath: '$PROJECT/.codex/prompts',
        globalPath: '$HOME/.codex/prompts',
      },
      {
        key: 'codex-bridge',
        type: 'codex-bridge',
        pathKind: 'file',
        localPath: '$PROJECT/.agents/skills/legion/SKILL.md',
        globalPath: '$HOME/.agents/skills/legion/SKILL.md',
      },
    ],
    entrypoints: {
      local: '/project:legion-start',
      global: '/prompts:legion-start',
    },
    evidence: [
      {
        title: 'Custom prompts',
        url: 'https://developers.openai.com/codex/custom-prompts',
        verifiedOn: '2026-03-11',
      },
      {
        title: 'Skills',
        url: 'https://developers.openai.com/codex/skills',
        verifiedOn: '2026-03-11',
      },
      {
        title: 'Prompt loader source',
        url: 'https://github.com/openai/codex/blob/main/codex-rs/core/src/custom_prompts.rs',
        verifiedOn: '2026-03-11',
      },
    ],
  },
  cursor: {
    key: 'cursor',
    flag: '--cursor',
    aliases: [],
    label: 'Cursor',
    adapterFile: 'cursor.md',
    supportTier: 'experimental',
    disposition: 'rules-only',
    installSurface: 'workspace rules only',
    scopeSupport: { local: true, global: false },
    storageLayout: 'legion',
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', 'Agent'],
    supportsAtRefs: false,
    nativeSurfaces: [
      {
        key: 'cursor-rule',
        type: 'cursor-rule',
        pathKind: 'file',
        localPath: '$PROJECT/.cursor/rules/legion.mdc',
      },
    ],
    entrypoints: {
      local: 'plain-language Legion requests',
      global: null,
    },
    evidence: [
      {
        title: 'Project rules',
        url: 'https://docs.cursor.com/context/rules',
        verifiedOn: '2026-03-11',
      },
      {
        title: 'Background agent',
        url: 'https://docs.cursor.com/background-agent/overview',
        verifiedOn: '2026-03-11',
      },
      {
        title: 'Custom modes beta',
        url: 'https://docs.cursor.com/chat/custom-modes',
        verifiedOn: '2026-03-11',
      },
      {
        title: 'Review mode',
        url: 'https://docs.cursor.com/chat/review-mode',
        verifiedOn: '2026-03-11',
      },
    ],
  },
  copilot: {
    key: 'copilot',
    flag: '--copilot',
    aliases: [],
    label: 'GitHub Copilot CLI',
    adapterFile: 'copilot-cli.md',
    supportTier: 'beta',
    disposition: 'skills-and-custom-agent',
    installSurface: 'repository or user skills plus a custom agent profile',
    scopeSupport: { local: true, global: true },
    storageLayout: 'legion',
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'],
    supportsAtRefs: false,
    nativeSurfaces: [
      {
        key: 'copilot-skills',
        type: 'copilot-skills',
        pathKind: 'dir',
        localPath: '$PROJECT/.github/skills',
        globalPath: '$HOME/.copilot/skills',
      },
      {
        key: 'copilot-agent',
        type: 'copilot-agent',
        pathKind: 'file',
        localPath: '$PROJECT/.github/agents/legion-orchestrator.agent.md',
        globalPath: '$HOME/.config/copilot/agents/legion-orchestrator.agent.md',
      },
    ],
    entrypoints: {
      local: '/legion-start or /agent legion-orchestrator',
      global: '/legion-start or /agent legion-orchestrator',
    },
    evidence: [
      {
        title: 'Custom agent profile paths',
        url: 'https://docs.github.com/en/copilot/customizing-copilot/creating-custom-copilot-chat-modes?tool=vscode',
        verifiedOn: '2026-03-11',
      },
      {
        title: 'Copilot CLI custom agents',
        url: 'https://docs.github.com/en/copilot/how-tos/agents/copilot-cli/using-custom-agents',
        verifiedOn: '2026-03-11',
      },
      {
        title: 'Create a custom agent profile',
        url: 'https://docs.github.com/en/copilot/customizing-copilot/creating-a-custom-agent-profile',
        verifiedOn: '2026-03-11',
      },
      {
        title: 'Create a repo skill',
        url: 'https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot#creating-a-repository-custom-skill',
        verifiedOn: '2026-03-11',
      },
      {
        title: 'Coding agent subagents',
        url: 'https://docs.github.com/en/copilot/how-tos/agents/copilot-coding-agent/customizing-the-coding-agent-setup/customizing-or-disabling-agent-delegation',
        verifiedOn: '2026-03-11',
      },
    ],
  },
  gemini: {
    key: 'gemini',
    flag: '--gemini',
    aliases: [],
    label: 'Google Gemini CLI',
    adapterFile: 'gemini-cli.md',
    supportTier: 'beta',
    disposition: 'native-commands',
    installSurface: 'native custom commands',
    scopeSupport: { local: true, global: true },
    storageLayout: 'legion',
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'],
    supportsAtRefs: false,
    nativeSurfaces: [
      {
        key: 'gemini-commands',
        type: 'gemini-commands',
        pathKind: 'dir',
        localPath: '$PROJECT/.gemini/commands/legion',
        globalPath: '$HOME/.gemini/commands/legion',
      },
    ],
    entrypoints: {
      local: '/legion:start',
      global: '/legion:start',
    },
    evidence: [
      {
        title: 'Custom commands',
        url: 'https://google-gemini.github.io/gemini-cli/docs/cli/commands/',
        verifiedOn: '2026-03-11',
      },
      {
        title: 'Configuration and GEMINI.md',
        url: 'https://github.com/google-gemini/gemini-cli?tab=readme-ov-file#configuration',
        verifiedOn: '2026-03-11',
      },
      {
        title: 'Extensions',
        url: 'https://github.com/google-gemini/gemini-cli/blob/main/docs/extension.md',
        verifiedOn: '2026-03-11',
      },
    ],
  },
  kiro: {
    key: 'kiro',
    flag: '--kiro',
    aliases: ['--amazon-q'],
    label: 'Kiro CLI (formerly Amazon Q Developer CLI)',
    adapterFile: 'kiro-cli.md',
    supportTier: 'beta',
    disposition: 'custom-agent-and-steering',
    installSurface: 'custom agent plus steering files',
    scopeSupport: { local: true, global: true },
    storageLayout: 'legion',
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'],
    supportsAtRefs: false,
    nativeSurfaces: [
      {
        key: 'kiro-agent',
        type: 'kiro-agent',
        pathKind: 'file',
        localPath: '$PROJECT/.kiro/agents/legion-orchestrator.md',
        globalPath: '$HOME/.kiro/agents/legion-orchestrator.md',
      },
      {
        key: 'kiro-steering',
        type: 'kiro-steering',
        pathKind: 'file',
        localPath: '$PROJECT/.kiro/steering/legion.md',
        globalPath: '$HOME/.kiro/steering/AGENTS.md',
      },
    ],
    entrypoints: {
      local: '@legion-orchestrator',
      global: '@legion-orchestrator',
    },
    evidence: [
      {
        title: 'Amazon Q Developer CLI is now Kiro CLI',
        url: 'https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/command-line.html',
        verifiedOn: '2026-03-11',
      },
      {
        title: 'Custom agents',
        url: 'https://kiro.dev/docs/cli/custom-agents/',
        verifiedOn: '2026-03-11',
      },
      {
        title: 'Steering',
        url: 'https://kiro.dev/docs/cli/steering/',
        verifiedOn: '2026-03-11',
      },
      {
        title: 'Chat subagents',
        url: 'https://kiro.dev/docs/cli/chat/subagents/',
        verifiedOn: '2026-03-11',
      },
      {
        title: 'Hooks and permissions',
        url: 'https://kiro.dev/docs/cli/hooks/',
        verifiedOn: '2026-03-11',
      },
    ],
  },
  windsurf: {
    key: 'windsurf',
    flag: '--windsurf',
    aliases: [],
    label: 'Windsurf',
    adapterFile: 'windsurf.md',
    supportTier: 'experimental',
    disposition: 'rules-only',
    installSurface: 'workspace rules only',
    scopeSupport: { local: true, global: false },
    storageLayout: 'legion',
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'],
    supportsAtRefs: false,
    nativeSurfaces: [
      {
        key: 'windsurf-rule',
        type: 'windsurf-rule',
        pathKind: 'file',
        localPath: '$PROJECT/.windsurf/rules/legion.md',
      },
    ],
    entrypoints: {
      local: 'plain-language Legion requests',
      global: null,
    },
    evidence: [
      {
        title: 'Rules and memories',
        url: 'https://docs.windsurf.com/windsurf/cascade/memories',
        verifiedOn: '2026-03-11',
      },
      {
        title: 'Planning mode',
        url: 'https://docs.windsurf.com/windsurf/cascade/planning-mode',
        verifiedOn: '2026-03-11',
      },
      {
        title: 'Ask mode',
        url: 'https://docs.windsurf.com/windsurf/getting-started#ask-mode',
        verifiedOn: '2026-03-11',
      },
      {
        title: 'Hooks',
        url: 'https://docs.windsurf.com/windsurf/mcp',
        verifiedOn: '2026-03-11',
      },
    ],
  },
  opencode: {
    key: 'opencode',
    flag: '--opencode',
    aliases: [],
    label: 'OpenCode',
    adapterFile: 'opencode.md',
    supportTier: 'beta',
    disposition: 'commands-and-subagent',
    installSurface: 'custom commands plus a Legion subagent',
    scopeSupport: { local: true, global: true },
    storageLayout: 'legion',
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', 'Agent'],
    supportsAtRefs: false,
    nativeSurfaces: [
      {
        key: 'opencode-commands',
        type: 'opencode-commands',
        pathKind: 'dir',
        localPath: '$PROJECT/.opencode/command',
        globalPath: '$HOME/.config/opencode/command',
      },
      {
        key: 'opencode-agent',
        type: 'opencode-agent',
        pathKind: 'file',
        localPath: '$PROJECT/.opencode/agent/legion-orchestrator.md',
        globalPath: '$HOME/.config/opencode/agent/legion-orchestrator.md',
      },
    ],
    entrypoints: {
      local: '/legion-start',
      global: '/legion-start',
    },
    evidence: [
      {
        title: 'Custom commands',
        url: 'https://opencode.ai/docs/customize/commands',
        verifiedOn: '2026-03-11',
      },
      {
        title: 'Custom agents',
        url: 'https://opencode.ai/docs/customize/agents',
        verifiedOn: '2026-03-11',
      },
      {
        title: 'Task tool and subagents',
        url: 'https://opencode.ai/docs/agents/task',
        verifiedOn: '2026-03-11',
      },
      {
        title: 'Configuration directories',
        url: 'https://opencode.ai/docs/config',
        verifiedOn: '2026-03-11',
      },
    ],
  },
  aider: {
    key: 'aider',
    flag: '--aider',
    aliases: [],
    label: 'Aider',
    adapterFile: 'aider.md',
    supportTier: 'experimental',
    disposition: 'manual-only',
    installSurface: 'manual instructions only',
    scopeSupport: { local: false, global: false },
    storageLayout: 'legion',
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'],
    supportsAtRefs: false,
    nativeSurfaces: [],
    entrypoints: {
      local: null,
      global: null,
    },
    evidence: [
      {
        title: 'Configuration',
        url: 'https://aider.chat/docs/config/aider_conf.html',
        verifiedOn: '2026-03-11',
      },
      {
        title: 'Conventions via AGENTS.md and CONVENTIONS.md',
        url: 'https://aider.chat/docs/usage/conventions.html',
        verifiedOn: '2026-03-11',
      },
      {
        title: 'Chat modes',
        url: 'https://aider.chat/docs/usage/modes.html',
        verifiedOn: '2026-03-11',
      },
      {
        title: 'Architect mode',
        url: 'https://aider.chat/docs/usage/modes.html#architect-mode',
        verifiedOn: '2026-03-11',
      },
    ],
  },
};

const RUNTIME_ORDER = [
  'claude',
  'codex',
  'cursor',
  'copilot',
  'gemini',
  'kiro',
  'windsurf',
  'opencode',
  'aider',
];

function resolveRuntimeKey(arg) {
  for (const runtimeKey of RUNTIME_ORDER) {
    const runtime = RUNTIME_METADATA[runtimeKey];
    if (arg === runtime.flag || runtime.aliases.includes(arg)) {
      return runtimeKey;
    }
  }
  return null;
}

function installableRuntimeKeys() {
  return RUNTIME_ORDER.filter((runtimeKey) => {
    const runtime = RUNTIME_METADATA[runtimeKey];
    return runtime.scopeSupport.local || runtime.scopeSupport.global;
  });
}

module.exports = {
  LEGION_COMMANDS,
  SUPPORT_TIERS,
  RUNTIME_METADATA,
  RUNTIME_ORDER,
  installableRuntimeKeys,
  resolveRuntimeKey,
};
