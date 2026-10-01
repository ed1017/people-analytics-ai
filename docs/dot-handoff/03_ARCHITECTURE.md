# Architecture Handoff

## Product architecture

The product is intentionally organized as three connected workspaces with Workforce AI spanning all of them.

### 1. Workforce Analytics — “Understand Our Workforce”

Purpose: measurement and diagnosis.

Current destinations:
- Overview
- Workforce Composition
- Attrition
- Talent Acquisition
- Survey & Sentiment

Labor Cost was moved conceptually out of general Workforce Analytics and into Workforce Planning because it is primarily a planning/economics decision surface.

### 2. Talent Management — “Realize Our Potential”

Purpose: understand talent supply, capability, preferences, movement, and aggregate succession coverage.

Current destinations:
- Skills Intelligence
- Learning & Development
- Career Interests
- Career Growth & Internal Mobility
- Succession Planning

Important distinction:
- Career Interests = recorded preferences, desired destinations, relocation willingness, and preference coverage.
- Career Growth & Internal Mobility = observed descriptive promotions/lateral moves/transfers and supported job-level transitions.

### 3. Workforce Planning — “Plan Our Future”

Purpose: convert evidence into governed workforce decisions.

Current destinations:
- Planning Overview
- Scenario Modeling
- Position & Workforce Design
- Workforce Response
- Execution & Feasibility
- Labor Cost Planning

The core planning logic follows:

**Plan → Design → Respond → Execute**

Plan asks what workforce is needed. Design translates that into positions/roles/recruiting/skills. Respond decides how to close gaps with Build/Move/Buy. Execute tests timing, constraints, and feasibility.

## North-star workflow

The broader product direction developed into:

**Observe → Investigate → Simulate → Decide → Monitor**

This is why the product should not regress to static dashboards. Dashboards are the evidence/observation layer; the differentiator is the governed decision workflow that follows.

## AI architecture

The AI is a cross-domain assistant, not the system of record and not the calculation engine.

AI responsibilities:
- interpret natural-language questions;
- understand active page and business context;
- choose approved/governed tools;
- combine supported evidence across domains;
- explain deterministic results;
- compare user-defined options;
- summarize risks, gaps, and tradeoffs.

AI must not:
- invent headcount, cost, attrition, readiness, succession, or scenario values;
- replace deterministic planning engines with generated math;
- fabricate unsupported BU/country/level cuts;
- turn descriptive Talent evidence into employee recommendations;
- infer suppressed Succession values;
- auto-approve or write source-system decisions.

## Technical stack

Current `package.json` / repo stack:
- Next.js 16.3.6
- React 19.2.8
- TypeScript
- Tailwind CSS 4
- shadcn 4.21
- Recharts 3.10
- Supabase JS 2.117 / PostgreSQL backend
- OpenAI JS 7.23
- Vercel deployment
- GitHub source control

UI/support libraries also include Base UI, lucide-react, class-variance-authority, `cn`, and `tw-animate-css`.

## Repository architecture

Important top-level areas:
- `app/` — Next.js application routes/API surface.
- `components/` — UI/page/workspace components, including the modularized Planning experience.
- `lib/` — shared types, navigation, data/tool helpers, planning/AI support.
- `database/` — versioned SQL for key governed views/access changes.
- `docs/` — product architecture and governance/rollout notes.
- `tests/` — focused Node test suites for succession, Talent scope, evidence handoff, career growth, accessibility, and Planning navigation.

Current navigation source of truth:
- `lib/app-navigation.ts`

Current database SQL tracked in Git includes:
- `database/position_action_structural_inventory.sql`
- `database/position_skill_requirement_map.sql`
- `database/ta_requisition_metrics_server_access.sql`
- `database/workforce_response_strategy_signals.sql`

Not every database object used by the app necessarily has its full creation history represented in the small `database/` folder; Supabase remains an external source of runtime database truth.

## Planning-engine architecture

The Planning side evolved deliberately in layers:

1. deterministic enterprise scenario engine;
2. segment decomposition;
3. true BU scenario engine;
4. position inventory actions;
5. structural BU × level × job-profile actions;
6. recruiting-demand linkage;
7. skill-demand linkage;
8. Build/Move/Buy evidence;
9. skill response plans;
10. whole-role response planning;
11. internal talent readiness;
12. development-pathway evidence;
13. recruiting feasibility;
14. multi-role response portfolio;
15. BU demand ownership;
16. BU response allocation;
17. time-phased execution;
18. hard constraints;
19. constraint-aware scheduling;
20. modular presentation/components;
21. dedicated Planning destinations;
22. shared state across those destinations.

This sequencing matters. Later features depend on earlier deterministic layers; they should not be reimplemented as disconnected LLM prompts.

## Shared Planning session

The promoted Planning destinations are not independent mini-apps. They are views into one shared planning workspace/session. Cross-destination navigation must preserve the active plan rather than reconstructing it from scratch.

PR #67 is the current implementation milestone for this behavior.

## Evidence handoff architecture

Cross-journey evidence should be explicit and typed, not implied by global filters.

The first implemented handoff is Skills Intelligence → Planning:
- user explicitly selects/carries evidence;
- evidence keeps its own scope/date/denominator;
- selected business context travels separately;
- Planning revalidates source freshness;
- the packet becomes context, not an automatic action.

This pattern is a good model for future cross-journey connections.

## UI shell principles

Final shell direction:
- grouped far-left navigation;
- three workspace headings + journey subtitles;
- AI available across the product;
- page-specific filters rather than one universal filter panel;
- fixed navigation widths with responsive/collapsed behavior;
- desktop and 390px mobile are both first-class regression targets.

The top journey-toolbar experiment from PRs #58–#59 is superseded by PR #60 and must not be treated as the intended architecture.

## Deployment and development workflow

Historical workflow:
- local Windows repo at `C:\Users\edwin\Projects\people-analytics-project`;
- PowerShell;
- prefer `npm.cmd` commands;
- feature branch → PR → preview/validation → merge to `main` → Vercel production;
- build is a hard gate;
- historical lint debt must be reported accurately rather than hidden.

## Product explanation

A concise explanation to preserve:

> The product starts with the analytics layer, but it does not stop at telling someone what happened. It moves into the workforce decision: model what you need, translate that into positions and skills, decide how to Build, Move, or Buy the talent, and check whether the plan can actually be executed. The AI helps across the process, but the workforce calculations remain deterministic and governed.