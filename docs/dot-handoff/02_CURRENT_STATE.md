# Current State — 2026-10-01 Handoff Snapshot

## Git and release state

- Repository: `ed1017/people-analytics-ai`
- Default branch: `main`
- Current main HEAD at snapshot: `d128b456ee8a6e2e96d79fc21af2d943c85e4936`
- HEAD commit message: merge PR #67, `Connect five Planning destinations to shared workspace state`
- Latest merged PR: #67
- Public app: `https://ed-workforce-ai.vercel.app`

Important: PR #67's own release notes state that focused tests, TypeScript, and isolated browser checks passed, but deployed-backend and real-AI checks remained for release verification. Verify the live deployment before declaring the post-#67 release fully runtime-verified.

## Current application navigation

`lib/app-navigation.ts` is the current navigation source of truth.

### Workforce Analytics
- Overview
- Workforce Composition
- Attrition
- Talent Acquisition
- Survey & Sentiment

### Talent Management
- Skills Intelligence
- Learning & Development
- Career Interests
- Career Growth & Internal Mobility
- Succession Planning

### Workforce Planning
- Planning Overview
- Scenario Modeling
- Position & Workforce Design
- Workforce Response
- Execution & Feasibility
- Labor Cost Planning

Legacy `workforce-planning` still exists as an internal page type/compatibility concept, but the user-facing Planning architecture is now the dedicated destination structure above.

## Current Planning behavior

The five core Planning destinations share one mounted Planning workspace/session. PR #67 connected the sidebar destinations and internal navigation to the existing shared state so users can move among them without losing the active planning work.

State intended to survive Planning destination changes includes:
- edited scenario assumptions;
- structural/position planning context;
- response-plan state;
- execution/feasibility state;
- explicit Skills → Planning evidence handoff context.

The planning logic remains deterministic. The AI can explain or invoke governed tools; it should not generate scenario math independently.

## Current cross-journey evidence handoff

Skills Intelligence can explicitly carry one selected apparent skill gap into Planning.

The packet includes:
- selected skill;
- source page/date;
- enterprise evidence scope;
- 10,000-person enterprise denominator;
- skill-specific demand/attainment/gap metrics;
- selected business context stored separately from evidence scope;
- user-stated business goal;
- optional user-stated assumptions.

It does not automatically:
- run a scenario;
- allocate Build/Move/Buy;
- approve anything;
- write source data;
- rank/recommend employees;
- infer BU/country/level-specific Skills evidence.

Planning revalidates evidence freshness. Current/stale/unavailable states must remain explicit.

## Current UI state

- Final information architecture is grouped left navigation, not the top toolbar experiment.
- Expanded sidebar width: 252px.
- Collapsed/mobile sidebar width: 72px.
- Group headings were increased to approximately 20px with approximately 14px journey subtitles.
- Page labels were later standardized at 17px in the stable demo candidate.
- Theme: Slate Mist + Blue.
- PR #66 darkened the Slate Mist background from `#B7C3D0` to `#ACBAC9` and adjusted muted text to `#354A60`.
- AI workspace is intentionally prominent and resizable; current behavior includes side preference/state preservation and a larger composer.
- Mobile 390px overflow has repeatedly been tested/fixed and should remain a regression target.

## Current analytics and Talent capabilities

Live/implemented product capabilities include:
- Overview and workforce health;
- Workforce Composition;
- Attrition;
- Talent Acquisition;
- Survey & Sentiment;
- Labor Cost / workforce finance;
- Skills Intelligence;
- Learning & Development pathway coverage;
- Career Interests/preference analytics;
- Career Growth & Internal Mobility descriptive analytics;
- enterprise Succession Planning summary;
- deterministic enterprise and BU workforce scenarios;
- position inventory and structural workforce design;
- recruiting-demand and skill-demand linkage;
- Build/Move/Buy evidence and plans;
- internal readiness and development-pathway evidence;
- role recruiting feasibility;
- multi-role response portfolio;
- BU demand ownership and response allocation;
- time-phased execution;
- hard constraints and constraint-aware scheduling;
- cross-domain governed AI tools.

## Current automated test scripts

`package.json` currently exposes:

- `npm run test:succession`
- `npm run test:talent-scope`
- `npm run test:handoff`
- `npm run test:career-growth`
- `npm run test:a11y`
- `npm run test:planning-nav`
- `npm run build`
- `npm run lint`

Historical lint debt has existed throughout the project. A clean build/TypeScript result must not be restated as 'lint is clean' unless lint is actually run and passes.

## Known documentation drift

`docs/product-architecture.md` remains highly useful and mostly reflects the intended architecture, but some wording is behind the current product: it still describes several Planning promotions as future even though PRs #40–#44 and #67 have now implemented them. It also does not fully reflect the later Career Growth & Internal Mobility page.

`docs/succession-summary-rollout.md` contains an old pre-merge warning stating the Succession branch should not merge until a membership exception is approved. That warning was overtaken by PR #56, whose merged validation notes state that the governed aggregate, exact PostgreSQL membership exception, view access, route behavior, tests, responsive UI, and grounded AI runtime were validated. Treat the rollout document as historical preparation unless/until it is reconciled.

README is directionally correct but does not enumerate every later Talent/UI capability. The code, merged PR history, and this handoff are newer.

## Immediate next verification

Before new feature work, verify the deployed application at current main:

1. confirm production is serving a build that includes `d128b456…` / PR #67;
2. exercise all five Planning destinations against the deployed backend;
3. verify shared scenario/workspace state survives cross-destination navigation;
4. verify carried Skills evidence remains correctly scoped and revalidated;
5. verify real AI grounding uses the active Planning destination and does not invent calculations;
6. run current focused tests plus build/TypeScript;
7. keep testing non-interactive while the user is actively using the PC.

Only after that should Dot pick up the next roadmap feature.