---
name: legion:workflow-common-github
description: Optional GitHub interaction conventions shared across commands
triggers: [github, issue, pr, milestone]
token_cost: low
summary: "Shared rules for optional GitHub issue/PR/milestone interactions when github-sync is active."
---

# Workflow Common GitHub Extension

Use only when GitHub integration is enabled and available.

## Rules
- Treat GitHub as optional integration; never fail core workflow if unavailable.
- Require both: `gh auth status` success and a valid git remote.
- Prefer idempotent updates (comment/edit) over duplicate issue creation.
- Always reflect GitHub updates in local state files when relevant.
