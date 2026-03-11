---
name: legion:update
description: Check for Legion updates and install the latest version from npm
allowed-tools: [Read, Bash]
---

<objective>
Check the installed Legion version against the latest npm release and update if a newer version is available. Uses the npm registry — no marketplace or git clone required.
</objective>

<context>
Self-contained command with no additional context dependencies.
</context>

<execution_context>
skills/workflow-common-core/SKILL.md
</execution_context>

<process>
1. DETECT RUNTIME
   - Follow the CLI Detection and Adapter Loading protocol from workflow-common
   - Store the detected CLI identifier (e.g., "claude-code", "codex-cli")
   - Map to installer flag:
     - claude-code → --claude
     - codex-cli → --codex
     - cursor → --cursor
     - copilot-cli → --copilot
     - gemini-cli → --gemini
     - kiro-cli → --kiro
     - amazon-q → --amazon-q (deprecated alias for --kiro)
     - windsurf → --windsurf
     - opencode → --opencode
     - aider → --aider

2. READ INSTALLED VERSION
   - Determine install scope and manifest location:
     - First check for a local install in the current project:
       - Claude Code: `.claude/legion/manifest.json`
       - All others: `.legion/manifest.json`
     - If no local manifest exists, fall back to the global install path:
       - Claude Code: `~/.claude/legion/manifest.json`
       - All others: `~/.legion/manifest.json`
   - Store the winning scope as INSTALL_SCOPE (`local` or `global`)
   - Run: Bash  cat "{MANIFEST_PATH}" 2>/dev/null
   - If file not found or empty:
     Display: "Legion is not installed. Run: npx @9thlevelsoftware/legion {runtime_flag}"
     Stop.
   - Parse the JSON and extract the "version" field
   - Store as INSTALLED_VERSION

3. CHECK LATEST VERSION
   - Run: Bash  npm show @9thlevelsoftware/legion version 2>/dev/null
   - If command fails:
     Display: "Could not check npm registry. Verify internet connection and that npm is installed."
     Stop.
   - Store as LATEST_VERSION

4. COMPARE VERSIONS
   - If INSTALLED_VERSION == LATEST_VERSION:
     Display: "Legion is up to date (v{INSTALLED_VERSION})."
     Stop.
   - Display: "Update available: v{INSTALLED_VERSION} -> v{LATEST_VERSION}"

5. CONFIRM AND INSTALL
   - Use adapter.ask_user to confirm:
     "Update Legion from v{INSTALLED_VERSION} to v{LATEST_VERSION}?"
     - Option 1: "Yes, update now"
     - Option 2: "No, skip this update"
   - If user confirms:
     Run: Bash  npx @9thlevelsoftware/legion@latest {runtime_flag} --{INSTALL_SCOPE}
     Display the installer output
   - Remind user to restart their CLI to pick up updated commands
</process>

<error_handling>
- If manifest not found: direct user to install via npx @9thlevelsoftware/legion
- If npm is not installed: suggest installing Node.js 18+ first
- If npm registry is unreachable: inform user and suggest trying again later
- If the installer fails: display the error and suggest running the command manually
</error_handling>
