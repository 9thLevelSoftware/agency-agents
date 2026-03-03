---
name: legion:marketing-workflows
description: Marketing campaign planning — campaign documents, content calendars, cross-channel coordination, and marketing-specific phase decomposition
triggers: [marketing, campaign, content, social, channel, audience]
token_cost: high
summary: "Domain-specific workflows for marketing phases. Covers campaign planning, content calendars, cross-channel coordination across 8 marketing agents. Activates when MKT-* requirements or marketing keywords detected."
---

# Marketing Workflows

Structured marketing campaign engine for Legion. Provides domain-specific decomposition for marketing-focused phases — campaign planning with guided questioning, content calendar generation, and cross-channel coordination across 8 marketing specialist agents. All operations produce human-readable markdown artifacts at `.planning/campaigns/`.

References:
- State File Locations from `workflow-common.md` (state paths, degradation pattern)
- Marketing Workflow Conventions from `workflow-common.md` (lifecycle, paths, wave pattern)
- Marketing Campaign team assembly from `agent-registry.md` Section 4 (Strategy + Content + Channel specialists)
- Phase decomposition from `phase-decomposer.md` (marketing domain detection trigger)
- `/legion:plan` in `plan.md` (campaign questioning and document generation entry point)
- `/legion:build` in `build.md` (marketing wave execution with core messaging handoff)

---

## Section 1: Principles & Marketing Domain Detection

Core rules governing marketing workflows and the detection heuristic that determines when marketing-specific decomposition activates.

### Principles

1. **Marketing-first decomposition** -- when a marketing phase is detected, use marketing-specific wave patterns (Strategy, Creation, Distribution) rather than generic engineering patterns (Build, Test, Deploy). Marketing tasks are not code tasks.
2. **Human-readable artifacts** -- campaign documents follow the same structured markdown convention as STATE.md, ROADMAP.md, and all other Legion state files. No JSON, no binary, no databases.
3. **Graceful degradation** -- every consumer checks for marketing phase signals before applying marketing patterns. Non-marketing phases see zero impact. Campaign documents are never required for non-marketing workflow completion.
4. **Channel-driven team assembly** -- the user's channel selection drives which agents are assigned. Not all 8 marketing agents are needed for every campaign. A 2-channel campaign gets 3-4 agents; a 5-channel campaign gets 6-7.
5. **Core message consistency** -- all channel agents work from a single core messaging brief produced in Wave 1. Consistency is structural (shared input), not manual (per-channel review).
6. **Content templates, not content** -- calendars and plans specify content types, themes, and responsible agents. Actual content creation happens during execution (Wave 2), not during planning.

### When Marketing Workflows Apply

Marketing-specific decomposition activates when ANY of these signals are present:

1. **Requirement IDs**: Phase requirements include MKT-* IDs
2. **Keywords in phase description**: "campaign", "content calendar", "social media", "cross-channel", "marketing", "brand awareness", "audience", "engagement strategy", "content strategy", "channel strategy"
3. **Agent signal**: agent-registry recommends majority marketing-division agents for the phase

When detected: use marketing-specific wave patterns (Section 6) and offer campaign document generation during planning.
When not detected: standard phase decomposition applies -- no impact.

### Constants

```
CAMPAIGN_DIR = '.planning/campaigns'
CAMPAIGN_FILE_PATTERN = '{CAMPAIGN_DIR}/{campaign-slug}.md'
DEFAULT_CHANNELS = ['twitter', 'instagram', 'tiktok', 'reddit', 'blog', 'email']
CONTENT_TYPES = ['social-post', 'thread', 'reel', 'story', 'blog-post', 'email',
                 'video-script', 'infographic', 'ama', 'poll']
```

### Channel-Agent Mapping

| Channel | Primary Agent | Backup Agent |
|---------|--------------|--------------|
| Twitter | marketing-twitter-engager | marketing-social-media-strategist |
| Instagram | marketing-instagram-curator | marketing-content-creator |
| TikTok | marketing-tiktok-strategist | marketing-instagram-curator |
| Reddit | marketing-reddit-community-builder | marketing-content-creator |
| Blog/Web | marketing-content-creator | marketing-social-media-strategist |
| Email | marketing-content-creator | marketing-growth-hacker |
| App Store | marketing-app-store-optimizer | marketing-growth-hacker |
| Growth/Funnel | marketing-growth-hacker | marketing-social-media-strategist |

### Graceful Degradation

- If `.planning/campaigns/` directory does not exist: create it when the first campaign is planned
- If no campaign document exists for a phase: standard decomposition, no marketing enrichment
- If marketing-workflows skill is referenced but phase is not marketing: skip silently
- Never error, never block, never require campaign documents for non-marketing workflow completion

---

## Section 2: Campaign Planning Workflow (MKT-01)

Structured campaign creation with guided questioning, document generation, agent team assembly, and lifecycle management. This section drives the campaign planning flow triggered by `/legion:plan` when a marketing phase is detected.

### 2.1: Campaign Brief Questioning

When a marketing phase is detected during `/legion:plan`, gather campaign parameters using AskUserQuestion. This replaces the generic decomposition questioning for marketing phases.

Key questions (adapt based on responses -- do not ask all if answers imply others):

```
Q1: "What's the primary objective for this campaign?"
  Options:
  - "Brand awareness / Launch announcement"
  - "User acquisition / Growth"
  - "Community building / Engagement"
  - "Product promotion / Conversion"

Q2: "Who is your target audience?"
  Free text -- capture demographics, interests, platforms they use

Q3: "Which channels should we target?" (multi-select)
  Options from DEFAULT_CHANNELS, filtered to those with available agents
  Show the Channel-Agent Mapping so the user knows who handles each

Q4: "What's the campaign timeline?"
  Options:
  - "Sprint (1-2 weeks)" -- high intensity, few channels
  - "Standard (4-6 weeks)" -- full campaign cycle
  - "Ongoing (3+ months)" -- sustained presence

Q5: "What's the key message or value proposition?"
  Free text -- this becomes the core message for cross-channel coordination (Section 4)
```

If the user has already provided campaign details in the phase description or CONTEXT.md, extract answers from existing context rather than re-asking. Only ask for missing parameters.

### 2.2: Campaign Document Generation

After brief questioning, generate the campaign document at:
  `{CAMPAIGN_DIR}/{campaign-slug}.md`

The slug is derived from the campaign name: lowercase, spaces to hyphens, strip non-alphanumeric (except hyphens), max 40 characters.
Example: "Product Launch Q2" becomes `product-launch-q2`

Use the format from Section 5. Populate all sections from the brief answers:
- **Objectives**: from Q1 + follow-up specifics
- **Target Audience**: from Q2
- **Channel Strategy**: from Q3 + Channel-Agent Mapping (Section 1)
- **Core Messaging**: from Q5
- **Timeline**: from Q4 + default phase structure for the selected pattern
- **Content Calendar**: generate using Section 3 patterns
- **Agent Assignments**: from channel selection + agent-registry Section 4 Marketing Campaign team

### 2.3: Agent Team Assembly

For marketing campaigns, use the agent-registry Section 4 Marketing Campaign team assembly pattern:

**Required roles (always included):**

| Role | Agent | Responsibilities |
|------|-------|-----------------|
| Strategy Lead | marketing-social-media-strategist | Overall strategy, cross-channel alignment, campaign brief ownership, Wave 1 leadership |
| Content Lead | marketing-content-creator | Core content production, editorial calendar, brand voice consistency, long-form assets |

**Channel-specific roles (1 per selected channel):**
- Map each selected channel to its primary agent using the Channel-Agent Mapping table (Section 1)
- If a channel's primary agent is already assigned as Strategy Lead or Content Lead, no duplicate -- the agent covers both roles
- Each channel specialist owns platform-native content formats for their channel

**Optional roles (add based on campaign objectives):**

| Condition | Role | Agent | Division |
|-----------|------|-------|----------|
| Objectives include "acquisition" or "conversion" | Growth/Analytics | marketing-growth-hacker | marketing |
| Campaign is visually intensive (Instagram, TikTok focus) | Visual Design | design-visual-storyteller | design |
| Campaign requires detailed performance tracking | Analytics | support-analytics-reporter | support |

### 2.4: Campaign Lifecycle

Each campaign follows this lifecycle:

```
Planning --> Active --> Measuring --> Complete
```

- **Planning**: Campaign document created, content calendar drafted, agents assigned. Status in campaign doc: `Planning`
- **Active**: Content being produced and distributed across channels. Status: `Active`
- **Measuring**: Campaign ended, collecting metrics and learnings. Status: `Measuring`
- **Complete**: Final report written, outcomes recorded to memory (if memory layer active). Status: `Complete`

Campaign status is tracked in the campaign document header, not in STATE.md. The campaign document is the source of truth for campaign lifecycle.

---

## Section 3: Content Calendar Generation (MKT-02)

Time-based content planning with channel assignments, content type taxonomy, scheduling patterns, and assignment rules.

### 3.1: Calendar Structure

Content calendars live inside the campaign document (## Content Calendar section). Format is a weekly grid with channel assignments and content types.

```
| Week | Phase | Key Theme | Content Items |
|------|-------|-----------|---------------|
| W1 | Pre-launch | Teaser/Anticipation | Twitter thread, Instagram teaser, Blog draft |
| W2 | Launch | Core announcement | All channels: coordinated launch burst |
| W3-4 | Sustain | Engagement/Value | Regular cadence per channel |
| W5+ | Optimize | Best performers | Double down on top-performing content |
```

Calendar detail level: specify content TYPE and responsible AGENT per slot. Do NOT write actual content -- content creation happens during Wave 2 execution.

### 3.2: Content Type Taxonomy

Each content item maps to a type, channel, and responsible agent:

| Type | Channels | Typical Agent | Cadence |
|------|----------|---------------|---------|
| Thread/Carousel | Twitter, LinkedIn | marketing-twitter-engager | 2-3x/week |
| Short-form Video | TikTok, Instagram Reels | marketing-tiktok-strategist | 2-3x/week |
| Stories | Instagram | marketing-instagram-curator | Daily during active phase |
| Long-form Post | Blog, Medium | marketing-content-creator | 1-2x/week |
| Email Newsletter | Email list | marketing-content-creator | Weekly |
| Community Post | Reddit | marketing-reddit-community-builder | 2-3x/week |
| Poll/Interactive | Twitter, Instagram | Platform-specific agent | Weekly |
| AMA/Q&A | Reddit | marketing-reddit-community-builder | 1x per campaign |
| Infographic | All visual channels | design-visual-storyteller (cross-div) | As needed |
| App Store Update | App Store, Play Store | marketing-app-store-optimizer | Per release cycle |

### 3.3: Scheduling Patterns

Three standard patterns based on campaign timeline (from Q4 in brief questioning):

**Sprint (1-2 weeks):**
- High frequency: daily content on primary channels
- Focus: 2-3 channels maximum
- Pre-create all content before launch date
- No optimization phase -- measure after sprint ends
- Best for: product launches, event promotions, time-sensitive announcements

**Standard (4-6 weeks):**
- Week 1: Teaser content (2-3 posts across channels)
- Week 2: Launch burst (daily across all selected channels)
- Weeks 3-4: Sustain cadence (3-4x/week per channel)
- Week 5: Optimization (boost top performers, adjust underperformers)
- Week 6: Measurement and learnings capture
- Best for: feature launches, seasonal campaigns, partnership promotions

**Ongoing (3+ months):**
- Month 1: Establish presence, build baseline metrics, test content types
- Month 2: Optimize based on Month 1 data, double down on winners
- Month 3+: Sustained cadence with monthly themes, quarterly reviews
- Review and adjust monthly; major strategy review quarterly
- Best for: brand building, community growth, thought leadership

### 3.4: Assignment Rules

1. Each content item has exactly ONE responsible agent (no shared ownership)
2. Agent assignment follows the Channel-Agent Mapping (Section 1)
3. Strategy Lead (marketing-social-media-strategist) reviews all content for brand consistency -- review role, not creation
4. Content Creator (marketing-content-creator) handles all long-form content regardless of distribution channel
5. Channel specialists own platform-native formats (Reels, TikToks, Threads, Reddit posts)
6. Cross-division agents (design-visual-storyteller, support-analytics-reporter) support but do not own content slots
7. When a channel has no specialist assigned, Content Creator is the fallback

---

## Section 4: Cross-Channel Coordination (MKT-03)

Ensuring consistent messaging across all channels through core message derivation, channel adaptation, consistency validation, and structured handoff patterns.

### 4.1: Core Message Derivation

Every campaign has ONE core message. All channel content derives from this single source of truth. Derived from:
- Campaign objective (Q1 from brief questioning)
- Key value proposition (Q5 from brief questioning)
- Target audience (Q2 from brief questioning)

**Core Messaging Format (included in campaign document):**

```
Core Message: {one sentence that captures the campaign's central idea}

Supporting Points:
  1. {rational benefit -- what the audience gains}
  2. {emotional benefit -- how it makes them feel}
  3. {social proof -- why others trust/use it}

Campaign Hashtags: {2-3 consistent hashtags used across all channels}
Primary CTA: {the single action we want the audience to take}
```

The Strategy Lead (marketing-social-media-strategist) owns core message derivation. This is produced in Wave 1 before any content creation begins.

### 4.2: Channel Adaptation Framework

Same core message, adapted for each channel's norms and audience expectations:

| Channel | Tone | Format | Length | CTA Style |
|---------|------|--------|--------|-----------|
| Twitter | Conversational, punchy | Thread or single tweet | 280 chars or 5-7 tweet thread | "Reply with..." or link |
| Instagram | Aspirational, visual | Caption + visual | 150-300 words | "Link in bio" or "DM us" |
| TikTok | Casual, authentic | Script + visual notes | 15-60 second script | "Follow for more" or link in bio |
| Reddit | Informative, value-first | Text post or comment | 200-500 words | Subtle, never salesy |
| Blog | Authoritative, detailed | Article structure | 800-2000 words | In-text CTA or end CTA |
| Email | Personal, direct | Newsletter format | 200-400 words | Button CTA |

**Adaptation rule:** The core message stays the same. Only the format, tone, length, and CTA style change per channel. If a channel adaptation contradicts the core message, the adaptation is wrong -- fix the adaptation, not the core message.

### 4.3: Consistency Validation Checklist

Before Wave 2 (content creation) begins, the Strategy Lead verifies:

- [ ] All channel agents have received the core message and supporting points
- [ ] Campaign hashtags are defined and consistent across all channels
- [ ] Visual style guidelines are shared with visual channels (Instagram, TikTok)
- [ ] CTA destinations are aligned (all channels point to the same landing page/action)
- [ ] Tone guidelines per channel are documented in the campaign document
- [ ] Launch timing is coordinated (stagger by 2-4 hours across channels for maximum reach)
- [ ] Channel adaptation guidelines (Section 4.2) are included in each agent's execution context

During `/legion:review` for marketing phases, the review agent checks this list against produced content.

### 4.4: Cross-Channel Handoff Pattern

The handoff between waves ensures all agents work from shared context:

**Strategy Lead (marketing-social-media-strategist) produces in Wave 1:**
  - Core messaging brief (Section 4.1 format)
  - Channel adaptation guidelines (Section 4.2 table)
  - Timing coordination plan
  - Content calendar with assignments (Section 3)

**Each Channel Agent receives in Wave 2:**
  - Core messaging brief (as context in their execution prompt)
  - Channel-specific adaptation guidelines (their row from Section 4.2)
  - Content calendar assignments for their channel only
  - Campaign document reference for full context

**Content Creator (marketing-content-creator) produces in Wave 2:**
  - Long-form content (blog posts, email copy, landing page copy)
  - Content that channel agents can excerpt or reference for shorter formats

### 4.5: Coordination During Execution

During `/legion:build` for marketing phases:

1. Wave 1 agent (Strategy Lead) produces the core messaging brief as part of their SUMMARY.md
2. Wave 2 agents receive Wave 1 output as context (SUMMARY.md from Wave 1 is injected into Wave 2 prompts)
3. All Wave 2 agents get the SAME core messaging brief plus their channel-specific instructions
4. If Wave 3 exists (distribution phase): agents receive all prior summaries as context
5. `/legion:review` for marketing phases uses the Consistency Validation Checklist (Section 4.3) as a review criterion

---

## Section 5: Campaign Document Format

Full format specification for campaign documents produced at `.planning/campaigns/{campaign-slug}.md`. This is the canonical output artifact of marketing workflows.

### Template

```markdown
# Campaign: {Campaign Name}

**Created:** {YYYY-MM-DD}
**Status:** Planning | Active | Measuring | Complete
**Timeline:** {start_date} to {end_date}
**Owner:** {primary marketing agent -- typically marketing-social-media-strategist}

## Objectives

- **Primary**: {main campaign goal -- e.g., "Launch product X awareness"}
- **Secondary**: {supporting goals -- e.g., "Build email list to 5K subscribers"}
- **Success Metrics**:

| Metric | Target | Measurement |
|--------|--------|-------------|
| Reach | {target} | Platform analytics |
| Engagement | {target} | Platform analytics |
| Conversions | {target} | Landing page tracking |

## Target Audience

- **Primary**: {demographic, psychographic, behavioral description}
- **Secondary**: {adjacent audience segment}
- **Channels where they live**: {platform list with rationale}

## Core Messaging

- **Key Message**: {one-sentence core message}
- **Supporting Messages**:
  1. {rational benefit}
  2. {emotional benefit}
  3. {social proof}
- **Tone**: {brand voice for this campaign}
- **Hashtags**: {campaign-specific hashtags}
- **CTA**: {primary call-to-action}

## Channel Strategy

| Channel | Agent | Role | Content Types | Frequency |
|---------|-------|------|---------------|-----------|
| {channel} | {agent-id} | {role description} | {content types} | {frequency} |

## Content Calendar

| Week | Phase | Key Theme | Content Items |
|------|-------|-----------|---------------|
| W1 | {phase} | {theme} | {type: agent, type: agent, ...} |
| W2 | {phase} | {theme} | {content items} |

## Agent Assignments

| Agent | Role | Responsibilities | Deliverables |
|-------|------|-----------------|--------------|
| {agent-id} | {role} | {what they do} | {what they produce} |

## Cross-Channel Consistency

- All channels use the same core message (adapted for platform format per Section 4.2)
- Visual assets: consistent color palette, typography, imagery style
- Hashtag usage: campaign hashtags on all platforms
- Timing: coordinated launch across channels (staggered by 2-4 hours)
- Voice: consistent brand tone, adapted for platform norms

## Timeline

| Phase | Dates | Activities |
|-------|-------|-----------|
| Pre-launch | {dates} | Teasers, audience building, content creation |
| Launch | {dates} | Coordinated multi-channel launch |
| Sustain | {dates} | Regular content, engagement, optimization |
| Measure | {dates} | Performance analysis, learnings capture |
```

### Status Values

| Status | Meaning | Set When |
|--------|---------|----------|
| Planning | Campaign document being drafted, not yet approved | During `/legion:plan` campaign questioning |
| Active | Campaign is live, content being produced/distributed | When `/legion:build` begins marketing phase execution |
| Measuring | Campaign ended, collecting results | After all content waves complete |
| Complete | Final learnings captured, campaign archived | After review and outcome recording |

### Multiple Campaigns

A single phase may produce multiple campaign documents. Each gets its own file:
- `.planning/campaigns/product-launch-q2.md`
- `.planning/campaigns/community-growth-summer.md`

The phase plan references all campaign documents in its `@context` block.

---

## Section 6: Integration Patterns

How callers consume this skill. Each integration point follows the same contract: detect marketing phase, use marketing patterns if detected, skip silently if not.

### 6.1: /legion:plan Integration (Marketing Phase Detection)

In phase-decomposer, after reading ROADMAP phase details:

```
1. Run Marketing Domain Detection (Section 1 heuristic)
   - Check for MKT-* requirement IDs in the phase
   - Check for marketing keywords in the phase description
   - Check if agent-registry recommends majority marketing agents

2. If marketing phase detected:
   a. Read marketing-workflows skill for domain-specific patterns
   b. Run Campaign Brief Questioning (Section 2.1) via AskUserQuestion
   c. Generate campaign document (Section 2.2) at .planning/campaigns/{slug}.md
   d. Use marketing-specific wave pattern for plan decomposition:

      Wave 1: Strategy & Planning
        Agents: marketing-social-media-strategist + marketing-growth-hacker
        Produces: campaign strategy brief, success metrics, audience analysis

      Wave 2: Content Creation
        Agents: marketing-content-creator + channel specialists (in parallel)
        Produces: content assets per channel, adapted from core messaging

      Wave 3 (optional, if phase scope includes execution):
        Agents: all channel agents in parallel
        Produces: published content, engagement reports

   e. Generate plan files with marketing-aware task descriptions
   f. Reference campaign document in plan context: @.planning/campaigns/{slug}.md

3. If not marketing phase:
   Standard decomposition proceeds (no impact from this skill)
```

### 6.2: /legion:build Integration (Marketing Execution)

During wave-executor for marketing phases:

```
1. Wave 1 agents receive campaign document as context
   - Campaign doc path: .planning/campaigns/{slug}.md
   - Agent personality is injected per standard personality injection pattern

2. Wave 1 SUMMARY.md includes the core messaging brief
   - This is the key handoff artifact between Wave 1 and Wave 2
   - Strategy Lead ensures core message is explicit in their summary

3. Wave 2 agents receive:
   - Campaign document (from .planning/campaigns/)
   - Wave 1 SUMMARY.md (contains core messaging brief)
   - Their channel-specific assignments from the content calendar
   - Channel adaptation guidelines for their platform

4. If Wave 3 exists:
   - Distribution agents receive all prior summaries
   - Focus is on publishing and engagement, not content creation
```

### 6.3: /legion:review Integration (Marketing Quality)

During review-loop for marketing phases, review agents check:

1. **Core message consistency**: content across channels reflects the same core message
2. **Channel adaptation**: each channel's content follows platform-specific norms (Section 4.2)
3. **Calendar completion**: all content calendar assignments are fulfilled (no gaps)
4. **Brand voice**: consistent tone across all produced content, adapted per channel
5. **CTA alignment**: all channels drive toward the same action
6. **Consistency checklist**: all items from Section 4.3 are satisfied

### 6.4: Caller Contract

Every command that integrates with marketing workflows MUST follow this contract:

```
1. Check if phase is marketing (Section 1 heuristic)
2. If yes: use marketing-specific patterns for that operation
3. If no: standard behavior, skip silently
4. Never error, never block, never require marketing workflows for non-marketing phases
5. If a marketing operation fails mid-way: log the error, continue the workflow
6. Campaign documents are supplementary artifacts -- workflow completion does not depend on them
```

This is identical to the GitHub Conventions, Memory Conventions, and Brownfield Conventions degradation pattern -- all optional integrations follow the same contract.

---

## References

This skill is consumed by:

| Consumer | Operation | Section |
|----------|-----------|---------|
| `phase-decomposer.md` | Marketing domain detection, campaign-aware decomposition | Sections 1, 6.1 |
| `plan.md` | Campaign brief questioning, document generation | Sections 2, 6.1 |
| `build.md` | Marketing wave execution, core messaging handoff | Sections 4, 6.2 |
| `review.md` | Cross-channel consistency review | Sections 4.3, 6.3 |
| `workflow-common.md` | Marketing Workflow Conventions, campaign paths | Section 1 (constants) |
| `agent-registry.md` | Marketing Campaign team assembly pattern | Section 2.3 (team assembly) |

Campaign document format is defined in Section 5.
Marketing domain detection is defined in Section 1 and must be checked before applying marketing patterns.
All consumers should handle non-marketing phases silently per Section 6.4 caller contract.
