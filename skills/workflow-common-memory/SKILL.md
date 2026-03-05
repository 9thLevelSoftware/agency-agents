---
name: legion:workflow-common-memory
description: Optional memory conventions shared across commands
triggers: [memory, outcomes, preferences, learning]
token_cost: low
summary: "Project-scoped memory behavior and integration rules used when memory-manager is activated."
---

# Workflow Common Memory Extension

Use only when memory behavior is active.

## Rules
- Memory is project-scoped by default and never cross-project for recommendation boosts.
- Memory is additive guidance and cannot override mandatory role constraints.
- Missing memory files must not block command execution.
- Record outcomes/preferences only when workflow explicitly calls for it.
