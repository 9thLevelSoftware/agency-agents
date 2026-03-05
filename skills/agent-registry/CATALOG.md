---
intent_mappings:
  harden:
    - testing-reality-checker
    - engineering-security-engineer
    - testing-api-tester
    - testing-evidence-collector
  document:
    - product-technical-writer
    - engineering-frontend-developer
  security-only:
    - engineering-security-engineer
    - testing-api-tester
---

# Agent Catalog

Complete catalog of all 52 built-in agents across 9 divisions, plus any custom agents created via `/legion:agent`. Also contains the Task Type Index (reverse mapping from project need to recommended agents).

The recommendation algorithm and team assembly patterns are in `SKILL.md` in this directory.

> **Path Note:** The `agents/` paths in the File column below are relative to the plugin root directory.
> Consumers must NOT use bare `agents/{agent-id}.md` paths directly. Instead, resolve
> `AGENTS_DIR` using the **Agent Path Resolution Protocol** from `workflow-common` and read
> personality files as `{AGENTS_DIR}/{agent-id}.md`. This ensures correct resolution in both
> local development (CWD = plugin root) and global plugin installations.

---

## Section 1: Agent Catalog

### Design Division (6 agents)

| ID | File | Specialty | Task Types |
|----|------|-----------|------------|
| design-brand-guardian | `agents/design-brand-guardian.md` | Expert brand strategist and guardian specializing in brand identity development, consistency maintenance, and strategic brand positioning | branding, identity-systems, brand-strategy, style-guides, visual-identity |
| design-ui-designer | `agents/design-ui-designer.md` | Expert UI designer specializing in visual design systems, component libraries, and pixel-perfect interface creation | ui-design, design-systems, component-libraries, accessibility, visual-design |
| design-ux-architect | `agents/design-ux-architect.md` | Technical architecture and UX specialist providing developers with solid foundations, CSS systems, and clear implementation guidance | ux-architecture, css-systems, layout-frameworks, design-to-code, frontend-foundations |
| design-ux-researcher | `agents/design-ux-researcher.md` | Expert UX researcher specializing in user behavior analysis, usability testing, and data-driven design insights | user-research, usability-testing, behavior-analysis, design-validation, personas |
| design-visual-storyteller | `agents/design-visual-storyteller.md` | Expert visual communication specialist creating compelling visual narratives, multimedia content, and brand storytelling through design | visual-narratives, multimedia-content, brand-storytelling, infographics, presentation-design |
| design-whimsy-injector | `agents/design-whimsy-injector.md` | Expert creative specialist adding personality, delight, and playful elements to brand experiences with memorable joyful interactions | microinteractions, delight-design, animation, creative-direction, personality |

### Engineering Division (8 agents)

| ID | File | Specialty | Task Types |
|----|------|-----------|------------|
| engineering-ai-engineer | `agents/engineering-ai-engineer.md` | Expert AI/ML engineer specializing in machine learning model development, deployment, and integration into production systems | ai-ml, model-training, data-pipelines, ml-ops, intelligent-features |
| engineering-backend-architect | `agents/engineering-backend-architect.md` | Senior backend architect specializing in scalable system design, database architecture, API development, and cloud infrastructure | backend, api-development, database-design, microservices, cloud-architecture |
| engineering-devops-automator | `agents/engineering-devops-automator.md` | Expert DevOps engineer specializing in infrastructure automation, CI/CD pipeline development, and cloud operations | ci-cd, infrastructure, automation, deployment, cloud-ops |
| engineering-frontend-developer | `agents/engineering-frontend-developer.md` | Expert frontend developer specializing in modern web technologies, React/Vue/Angular frameworks, UI implementation, and performance optimization | frontend, react, web-performance, responsive-design, spa |
| engineering-mobile-app-builder | `agents/engineering-mobile-app-builder.md` | Specialized mobile application developer with expertise in native iOS/Android development and cross-platform frameworks | mobile-ios, mobile-android, cross-platform, react-native, flutter |
| engineering-rapid-prototyper | `agents/engineering-rapid-prototyper.md` | Specialized in ultra-fast proof-of-concept development and MVP creation using efficient tools and frameworks | prototyping, mvp, rapid-development, proof-of-concept, hackathon |
| engineering-senior-developer | `agents/engineering-senior-developer.md` | Stack-agnostic senior implementation lead for production-grade software delivery across web, backend, and platform systems | full-stack, architecture, refactoring, reliability, code-quality |
| engineering-laravel-specialist | `agents/engineering-laravel-specialist.md` | Laravel/Livewire/FluxUI implementation specialist for high-fidelity product delivery, performance, and maintainable PHP architecture | laravel, livewire, fluxui, php, blade |

### Marketing Division (6 agents)

| ID | File | Specialty | Task Types |
|----|------|-----------|------------|
| marketing-app-store-optimizer | `agents/marketing-app-store-optimizer.md` | Expert app store marketing specialist focused on ASO, conversion rate optimization, and app discoverability | aso, app-store, conversion-optimization, app-marketing, keyword-optimization |
| marketing-content-creator | `agents/marketing-content-creator.md` | Expert content strategist and creator for multi-platform campaigns, editorial calendars, compelling copy, and brand storytelling | content-strategy, copywriting, editorial-calendar, brand-storytelling, multi-platform |
| marketing-growth-hacker | `agents/marketing-growth-hacker.md` | Expert growth strategist specializing in rapid user acquisition through data-driven experimentation, viral loops, and conversion funnels | growth-hacking, user-acquisition, viral-loops, conversion-funnels, experimentation |
| marketing-instagram-curator | `agents/marketing-instagram-curator.md` | Expert Instagram marketing specialist focused on visual storytelling, community building, and multi-format content optimization | instagram, visual-content, community-building, reels, aesthetic-curation |
| marketing-social-media-strategist | `agents/marketing-social-media-strategist.md` | Cross-platform social media strategist deciding which platforms, what content mix, and how to allocate resources across all social channels | cross-platform-strategy, platform-selection, content-mix, social-media-audit, channel-allocation |
| marketing-twitter-engager | `agents/marketing-twitter-engager.md` | Expert Twitter marketing specialist focused on real-time engagement, thought leadership building, and community-driven growth | twitter, real-time-engagement, thought-leadership, community-growth, social-listening |

### Product Division (3 agents)

| ID | File | Specialty | Task Types |
|----|------|-----------|------------|
| product-feedback-synthesizer | `agents/product-feedback-synthesizer.md` | Expert in collecting, analyzing, and synthesizing user feedback from multiple channels to extract actionable product insights | user-feedback, sentiment-analysis, product-insights, feature-requests, feedback-triage |
| product-sprint-prioritizer | `agents/product-sprint-prioritizer.md` | Expert product manager specializing in agile sprint planning, feature prioritization, and resource allocation | sprint-planning, prioritization, backlog-grooming, resource-allocation, roadmap |
| product-trend-researcher | `agents/product-trend-researcher.md` | Expert market intelligence analyst specializing in emerging trends, competitive analysis, and opportunity assessment | market-research, competitive-analysis, trend-identification, opportunity-assessment, industry-intelligence |

### Project Management Division (5 agents)

| ID | File | Specialty | Task Types |
|----|------|-----------|------------|
| project-management-experiment-tracker | `agents/project-management-experiment-tracker.md` | Expert project manager specializing in experiment design, execution tracking, and data-driven decision making for A/B tests and hypothesis validation | experiment-design, ab-testing, hypothesis-validation, data-driven-decisions, experiment-tracking |
| project-management-project-shepherd | `agents/project-management-project-shepherd.md` | Expert project manager specializing in cross-functional project coordination, timeline management, and stakeholder alignment | project-coordination, timeline-management, stakeholder-alignment, risk-management, cross-functional |
| project-management-studio-operations | `agents/project-management-studio-operations.md` | Expert operations manager specializing in day-to-day studio efficiency, process optimization, and resource coordination | studio-ops, process-optimization, resource-coordination, productivity, operational-excellence |
| project-management-studio-producer | `agents/project-management-studio-producer.md` | Senior strategic leader specializing in high-level creative and technical project orchestration, resource allocation, and multi-project portfolio management | portfolio-management, creative-direction, resource-allocation, strategic-planning, executive-oversight |
| project-manager-senior | `agents/project-manager-senior.md` | Task-level project manager converting phase specifications into actionable development tasks with realistic scope and acceptance criteria | task-breakdown, spec-to-tasks, scope-management, sprint-execution, implementation-planning |

### Spatial Computing Division (6 agents)

| ID | File | Specialty | Task Types |
|----|------|-----------|------------|
| macos-spatial-metal-engineer | `agents/macos-spatial-metal-engineer.md` | Native Swift and Metal specialist building high-performance 3D rendering systems and spatial computing experiences for macOS and Vision Pro | metal, swift, 3d-rendering, macos, vision-pro |
| terminal-integration-specialist | `agents/terminal-integration-specialist.md` | Terminal emulation, text rendering optimization, and SwiftTerm integration for modern Swift applications | terminal-emulation, swiftterm, text-rendering, swift-ui, vt100 |
| visionos-spatial-engineer | `agents/visionos-spatial-engineer.md` | Native visionOS spatial computing, SwiftUI volumetric interfaces, and Liquid Glass design implementation | visionos, spatial-computing, swiftui-volumetric, liquid-glass, realitykit |
| xr-cockpit-interaction-specialist | `agents/xr-cockpit-interaction-specialist.md` | Specialist in designing and developing immersive cockpit-based control systems for XR environments | xr-cockpit, spatial-controls, immersive-ui, cockpit-design, high-presence |
| xr-immersive-developer | `agents/xr-immersive-developer.md` | Expert WebXR and immersive technology developer with specialization in browser-based AR/VR/XR applications | webxr, ar-vr, browser-3d, immersive-apps, cross-platform-xr |
| xr-interface-architect | `agents/xr-interface-architect.md` | Spatial interaction designer and interface strategist for immersive AR/VR/XR environments | spatial-ux, xr-interfaces, comfort-design, 3d-navigation, presence-optimization |

### Specialized Division (4 agents)

| ID | File | Specialty | Task Types |
|----|------|-----------|------------|
| agents-orchestrator | `agents/agents-orchestrator.md` | Spawnable coordinator agent for cross-division task execution within a build task — coordinates specialist agents through dev-QA loops when multi-agent coordination is needed | orchestration, pipeline-management, workflow-automation, agent-coordination, dev-qa-loops |
| data-analytics-reporter | `agents/data-analytics-reporter.md` | Technical data analyst building and maintaining data infrastructure — pipelines, ETL, warehouses, data quality. Pre-analysis work. | data-pipelines, etl, data-quality, data-warehouse, data-engineering |
| lsp-index-engineer | `agents/lsp-index-engineer.md` | Language Server Protocol specialist building unified code intelligence systems through LSP client orchestration and semantic indexing | lsp, code-intelligence, semantic-indexing, language-servers, developer-tooling |
| polymath | `agents/polymath.md` | Pre-flight alignment specialist who crystallizes raw ideas through structured exploration and research-first questioning | exploration, clarification, research-first, structured-questions, gap-detection |

### Support Division (6 agents)

| ID | File | Specialty | Task Types |
|----|------|-----------|------------|
| support-analytics-reporter | `agents/support-analytics-reporter.md` | Operational analytics specialist consuming clean data to produce executive dashboards, KPI tracking, and stakeholder-ready reports. Post-analysis delivery. | dashboards, kpi-reporting, business-intelligence, executive-summaries |
| support-executive-summary-generator | `agents/support-executive-summary-generator.md` | Consultant-grade AI specialist transforming complex business inputs into concise, actionable executive summaries using McKinsey SCQA, BCG Pyramid, and Bain frameworks | executive-summaries, strategy-consulting, c-suite-reporting, business-communication, frameworks |
| support-finance-tracker | `agents/support-finance-tracker.md` | Expert financial analyst and controller specializing in financial planning, budget management, and business performance analysis | financial-planning, budget-management, cash-flow, investment-analysis, financial-risk |
| support-infrastructure-maintainer | `agents/support-infrastructure-maintainer.md` | Expert infrastructure specialist focused on system reliability, performance optimization, and technical operations management | infrastructure, system-reliability, monitoring, cloud-management, cost-optimization |
| support-legal-compliance-checker | `agents/support-legal-compliance-checker.md` | Expert legal and compliance specialist ensuring business operations, data handling, and content comply with laws, regulations, and industry standards | legal-compliance, risk-assessment, policy-development, regulatory, gdpr-privacy |
| support-support-responder | `agents/support-support-responder.md` | Expert customer support specialist delivering exceptional customer service, issue resolution, and user experience optimization | customer-support, issue-resolution, multi-channel-support, customer-success, user-experience |

### Testing Division (7 agents)

| ID | File | Specialty | Task Types |
|----|------|-----------|------------|
| testing-api-tester | `agents/testing-api-tester.md` | Expert API testing specialist focused on comprehensive API validation, performance testing, and quality assurance across all systems | api-testing, integration-testing, performance-testing, security-testing, test-automation |
| testing-evidence-collector | `agents/testing-evidence-collector.md` | Screenshot-obsessed, fantasy-allergic QA specialist requiring visual proof for everything; defaults to finding 3-5 issues | visual-qa, screenshot-evidence, bug-verification, proof-collection, reality-checks |
| testing-performance-benchmarker | `agents/testing-performance-benchmarker.md` | Expert performance testing and optimization specialist focused on measuring, analyzing, and improving system performance | performance-benchmarking, load-testing, optimization, metrics-analysis, capacity-planning |
| testing-reality-checker | `agents/testing-reality-checker.md` | Stops fantasy approvals with evidence-based certification; defaults to "NEEDS WORK" and requires overwhelming proof for production readiness | production-readiness, certification, evidence-review, go-no-go, quality-gates |
| testing-test-results-analyzer | `agents/testing-test-results-analyzer.md` | Expert test analysis specialist focused on comprehensive test result evaluation, quality metrics analysis, and actionable insight generation | test-analysis, quality-metrics, test-reporting, trend-analysis, continuous-improvement |
| testing-tool-evaluator | `agents/testing-tool-evaluator.md` | Expert technology assessment specialist evaluating, testing, and recommending tools, software, and platforms for business use | tool-evaluation, technology-assessment, competitive-comparison, adoption-strategy, productivity-tools |
| testing-workflow-optimizer | `agents/testing-workflow-optimizer.md` | Testing and QA workflow optimization specialist focused on test pipeline efficiency, CI optimization, QA process improvement, and test automation strategy | test-pipeline-optimization, ci-optimization, qa-process-improvement, test-automation-strategy, flaky-test-detection |

### Custom Division

Custom agents created via `/legion:agent` appear here. This section is populated automatically by the agent-creator skill.

| ID | File | Specialty | Task Types |
|----|------|-----------|------------|

*No custom agents yet. Run `/legion:agent` to create one.*

---

## Section 2: Intent Routing

Intent flags (`--just-*`, `--skip-*`) dynamically compose agent teams for specific execution modes. These are not fixed assignments — intents are resolved at runtime from `.planning/config/intent-teams.yaml`.

### Intent-to-Agent Mappings

| Intent | Mode | Primary Agents | Secondary Agents | Description |
|--------|------|----------------|------------------|-------------|
| harden | ad_hoc | testing-reality-checker, engineering-security-engineer | testing-api-tester, testing-evidence-collector | Security audit with Testing + Security divisions |
| document | filter_plans | product-technical-writer | engineering-frontend-developer | Generate documentation without implementation |
| skip-frontend | filter_plans | — | — | Exclude frontend/UI tasks and agents |
| skip-backend | filter_plans | — | — | Exclude backend/API tasks and agents |
| security-only | filter_review | engineering-security-engineer | testing-api-tester | Security-only review audit |

### Cross-Reference with Divisions

- **harden**: Combines Testing (reality-checker, api-tester, evidence-collector) + Engineering (security-engineer)
- **document**: Uses Product (technical-writer) + Engineering (frontend-developer for component docs)
- **security-only**: Security-focused subset of harden team for review filtering

### Notes

- Intent teams are **dynamic compositions**, not fixed agent assignments
- Agents may appear in multiple intent mappings
- Primary agents are always spawned; secondary agents are spawned based on workload
- Filter intents (`skip-*`, `document`) don't spawn agents directly — they filter existing plans

---

## Section 3: Task Type Index

Reverse mapping from common project needs to recommended agents.

### Web Development
- **Primary**: engineering-frontend-developer, engineering-backend-architect, engineering-senior-developer, engineering-laravel-specialist
- **Support**: design-ux-architect, design-ui-designer, testing-api-tester
- **Coordination**: project-manager-senior, agents-orchestrator

### Mobile Development
- **Primary**: engineering-mobile-app-builder, engineering-frontend-developer
- **Support**: design-ui-designer, design-ux-researcher, marketing-app-store-optimizer
- **Testing**: testing-api-tester, testing-performance-benchmarker

### API Development
- **Primary**: engineering-backend-architect, engineering-ai-engineer, engineering-senior-developer
- **Testing**: testing-api-tester, testing-performance-benchmarker
- **Coordination**: project-manager-senior

### Design & UX
- **Primary**: design-ui-designer, design-ux-architect, design-ux-researcher
- **Creative**: design-brand-guardian, design-visual-storyteller, design-whimsy-injector
- **Validation**: testing-evidence-collector, product-feedback-synthesizer

### Content & Marketing
- **Strategy**: marketing-social-media-strategist, marketing-growth-hacker, marketing-content-creator
- **Platform-specific**: marketing-twitter-engager, marketing-instagram-curator
- **Support**: design-visual-storyteller, design-brand-guardian, marketing-app-store-optimizer

### Quality & Testing
- **Core**: testing-api-tester, testing-evidence-collector, testing-reality-checker
- **Analysis**: testing-test-results-analyzer, testing-performance-benchmarker
- **Process**: testing-workflow-optimizer, testing-tool-evaluator

### DevOps & Infrastructure
- **Primary**: engineering-devops-automator, support-infrastructure-maintainer
- **Support**: engineering-backend-architect, testing-performance-benchmarker
- **Oversight**: project-management-studio-operations

### Project Coordination
- **Leadership**: project-management-studio-producer, project-management-project-shepherd
- **Execution**: project-manager-senior, project-management-experiment-tracker
- **Operations**: project-management-studio-operations, agents-orchestrator

### XR & Spatial Computing
- **visionOS/macOS**: visionos-spatial-engineer, macos-spatial-metal-engineer, terminal-integration-specialist
- **WebXR/Immersive**: xr-immersive-developer, xr-cockpit-interaction-specialist
- **Interface Design**: xr-interface-architect, design-ux-architect

### Research & Analysis
- **Product**: product-trend-researcher, product-feedback-synthesizer, product-sprint-prioritizer
- **Data**: data-analytics-reporter, support-analytics-reporter
- **Business**: support-executive-summary-generator, support-finance-tracker, support-legal-compliance-checker

### Exploration & Clarification
- **Pre-flight Alignment**: polymath
- **Use case**: Crystallize raw ideas through structured exploration before formal planning
- **Task types**: exploration, clarification, research-first, structured-questions, gap-detection



