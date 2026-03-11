# Runtime Audit

Verified against official vendor documentation on March 11, 2026.

Claude Code remains the control runtime. Every other runtime below was re-audited against official docs before changing installer behavior, support tiers, and adapter claims.

| Runtime | Tier | Disposition | Local | Global | Native Legion Surface | Native Entry |
|---------|------|-------------|-------|--------|------------------------|--------------|
| OpenAI Codex CLI | Beta | Native prompts | Yes | Yes | `.codex/prompts/` plus `.agents/skills/legion/SKILL.md` | `/project:legion-start` or `/prompts:legion-start` |
| Cursor | Experimental | Rules-only | Yes | No | `.cursor/rules/legion.mdc` | Plain-language Legion requests |
| GitHub Copilot CLI | Beta | Skills and custom agent | Yes | Yes | `.github/skills/`, `.github/agents/`, `~/.copilot/skills/`, `~/.config/copilot/agents/` | `/legion-start` or `/agent legion-orchestrator` |
| Google Gemini CLI | Beta | Native commands | Yes | Yes | `.gemini/commands/legion/*.toml` or `~/.gemini/commands/legion/*.toml` | `/legion:start` |
| Kiro CLI (formerly Amazon Q Developer CLI) | Beta | Custom agent and steering | Yes | Yes | `.kiro/agents/`, `.kiro/steering/`, `~/.kiro/agents/`, `~/.kiro/steering/` | `@legion-orchestrator` |
| Windsurf | Experimental | Rules-only | Yes | No | `.windsurf/rules/legion.md` | Plain-language Legion requests |
| OpenCode | Beta | Commands and subagent | Yes | Yes | `.opencode/command/`, `.opencode/agent/`, `~/.config/opencode/command/`, `~/.config/opencode/agent/` | `/legion-start` |
| Aider | Experimental | Manual-only | No | No | None | None |

## Evidence

### Codex

- [Custom prompts](https://developers.openai.com/codex/custom-prompts)
- [Skills](https://developers.openai.com/codex/skills)
- [Prompt loader source](https://github.com/openai/codex/blob/main/codex-rs/core/src/custom_prompts.rs)

### Cursor

- [Project rules](https://docs.cursor.com/context/rules)
- [Background Agent overview](https://docs.cursor.com/background-agent/overview)
- [Custom modes beta](https://docs.cursor.com/chat/custom-modes)
- [Review mode](https://docs.cursor.com/chat/review-mode)

### GitHub Copilot CLI

- [Custom chat modes and agent profile paths](https://docs.github.com/en/copilot/customizing-copilot/creating-custom-copilot-chat-modes?tool=vscode)
- [Using custom agents in Copilot CLI](https://docs.github.com/en/copilot/how-tos/agents/copilot-cli/using-custom-agents)
- [Creating a custom agent profile](https://docs.github.com/en/copilot/customizing-copilot/creating-a-custom-agent-profile)
- [Creating a repository custom skill](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot#creating-a-repository-custom-skill)
- [Coding agent delegation and subsidiary agents](https://docs.github.com/en/copilot/how-tos/agents/copilot-coding-agent/customizing-the-coding-agent-setup/customizing-or-disabling-agent-delegation)

### Google Gemini CLI

- [Custom commands](https://google-gemini.github.io/gemini-cli/docs/cli/commands/)
- [Configuration and GEMINI.md](https://github.com/google-gemini/gemini-cli?tab=readme-ov-file#configuration)
- [Extensions](https://github.com/google-gemini/gemini-cli/blob/main/docs/extension.md)

### Kiro CLI

- [Amazon Q Developer CLI is now Kiro CLI](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/command-line.html)
- [Custom agents](https://kiro.dev/docs/cli/custom-agents/)
- [Steering](https://kiro.dev/docs/cli/steering/)
- [Subagents](https://kiro.dev/docs/cli/chat/subagents/)
- [Hooks](https://kiro.dev/docs/cli/hooks/)

### Windsurf

- [Memories and rules](https://docs.windsurf.com/windsurf/cascade/memories)
- [Planning mode](https://docs.windsurf.com/windsurf/cascade/planning-mode)
- [Ask mode](https://docs.windsurf.com/windsurf/getting-started#ask-mode)
- [MCP and hooks](https://docs.windsurf.com/windsurf/mcp)

### OpenCode

- [Custom commands](https://opencode.ai/docs/customize/commands)
- [Custom agents](https://opencode.ai/docs/customize/agents)
- [Task tool and subagents](https://opencode.ai/docs/agents/task)
- [Configuration](https://opencode.ai/docs/config)

### Aider

- [Configuration](https://aider.chat/docs/config/aider_conf.html)
- [Conventions](https://aider.chat/docs/usage/conventions.html)
- [Chat modes](https://aider.chat/docs/usage/modes.html)
- [Architect mode](https://aider.chat/docs/usage/modes.html#architect-mode)

## Resulting Policy

- Native command surfaces are only installed where the vendor documents a real discovery path.
- Rules-only runtimes get rules and an explicit plain-language entry path instead of fake `/legion:*` claims.
- Manual-only runtimes stay documented but do not receive a misleading automated install path.
