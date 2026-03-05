---
name: legion:workflow-common-domains
description: Optional cross-domain conventions for design/marketing/specialized workflows
triggers: [design, marketing, domain, campaign, brief]
token_cost: low
summary: "Shared optional conventions for domain workflows that are not always loaded in core execution."
---

# Workflow Common Domain Extension

Use for domain-specific workflows only.

## Rules
- Activate only when phase requirements or task context indicates domain relevance.
- Marketing workflows produce campaign artifacts under `.planning/campaigns/`.
- Design workflows produce design artifacts under `.planning/designs/`.
- Domain extensions refine execution; they never replace core phase/state flow.
