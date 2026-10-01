# Master Build Log

Snapshot reconstructed 2026-10-01 from project conversations and verified against the merged GitHub PR history.

Status labels:
- **CURRENT** = still reflected in current product/repo.
- **SUPERSEDED** = historically important but intentionally replaced later.
- **HISTORICAL** = build history/context; not necessarily a current behavior.

## Phase 0 — Product definition and first MVP (roughly Sep 24–29, pre-PR history)

**CURRENT/HISTORICAL** The project started as a public portfolio product combining People Analytics, Strategic Workforce Planning, workforce finance, skills intelligence, synthetic workforce/company data, and a contextual AI assistant for HR, business leaders, and Finance.

**CURRENT** The mainstream stack was intentionally selected for recruiter/market recognizability: Next.js + React + TypeScript, Tailwind, shadcn/ui, Recharts, Supabase/PostgreSQL, OpenAI API, GitHub, and Vercel.

**CURRENT** The initial public dataset was synthetic. The established baseline used about 10,000 active global employees, 5,000 active U.S. employees, 12,880 total employee-history records, 33 monthly snapshots from Jan 2024 through Sep 2026, and one active managerless record representing the CEO.

**HISTORICAL** The earliest product direction was dashboard-first People Insights Copilot: live workforce metrics, filters, charts, and AI that received active page/filter context. This was later broadened substantially into a decision/workforce-planning product.

**CURRENT** Early working areas included Overview, Finance/Labor Cost, Skills, Workforce Planning, a persona selector (HR / Leader / Finance), and a resizable/collapsible AI panel using the server-side `/api/chat` route.

**HISTORICAL** Dashboard query latency became a material issue. The filtered Overview path was optimized with a materialized filtered snapshot approach, indexing, and an optimized `dashboard_overview_filtered` path. Validation included 10,000 unfiltered active headcount and 5,000 U.S. active headcount.

**HISTORICAL** At the end of the first MVP, Talent Acquisition and Survey/Sentiment were still placeholders; scenario modeling was mostly fixed; agentic tools, freeform governed scenarios, stronger modularization, and true auth/RLS product roles were future work.

## Phase 1 — Refactor and complete core analytics (PRs #1–#7, Sep 29–30)

- **PR #1 — Phase 2A architecture refactor.** Extracted shared types, header/sidebar, AI panel and Markdown renderer, and major page components from the original monolithic page. Behavior was intended to stay unchanged. Build and manual smoke tests passed.
- **PR #2 — Build Talent Acquisition analytics module.** Added governed Supabase-backed TA API/dashboard, funnel, velocity, source effectiveness, recruiter workload, BU demand, and TA-specific AI grounding.
- **PR #3 — Build Survey and Sentiment analytics module.** Added governed listening API, engagement trend/participation, engagement/pulse/manager/onboarding/exit dimensions, BU comparisons, exit reasons, and page-grounded AI.
- **PR #4 — Add governed People Analytics AI tools.** Introduced the first read-only tool registry so AI could call Overview, Finance, Skills, Workforce Planning, TA, and Survey/Sentiment on demand rather than preloading every domain into each chat request.
- **PR #5 — Add deterministic workforce scenario modeling.** Added the governed scenario engine/API and `run_workforce_scenario` tool. Supported growth, salary inflation, attrition, fill rate, and productivity/hiring-demand reduction. Default assumptions exactly reproduced stored Baseline outputs.
- **PR #6 — Build Workforce and Attrition analytics.** Activated governed Workforce Composition and Attrition APIs/pages/tools, including 33-point trends and aggregate cuts. Required limited `service_role` read access for security-invoker analytics views.
- **PR #7 — Add Workforce and Attrition metric tooltips.** Added lightweight hover/focus KPI definitions without adding dependencies.

## Phase 2 — Scenario modeling becomes a real planning engine (PRs #8–#13)

- **PR #8 — Add custom workforce scenario controls.** Added UI for five deterministic planning levers using governed Baseline defaults and deterministic scenario execution.
- **PR #9 — Add custom scenario trajectory overlay.** Added Baseline vs Custom month-by-month headcount trajectories.
- **PR #10 — Add workforce scenario decision support.** Added assumption deltas, impact summary, and an Explain with AI flow that passes exact assumptions/results and requires governed rerun verification.
- **PR #11 — Add saved workforce scenario comparison.** Added browser-local named scenario storage and up-to-three-scenario comparison; no Supabase writes.
- **PR #12 — Add segmented workforce scenario breakdowns.** Added deterministic BU/job-family decomposition using stored Baseline shares. Explicit guardrail: this was decomposition, not an independent segment-specific rerun.
- **PR #13 — Add true business unit scenario modeling.** Added deterministic BU-specific reruns using each BU's current workforce and Baseline curve, plus enterprise implied impact while other BUs remain Baseline.

## Phase 3 — Position, recruiting, and skill-demand design (PRs #14–#17)

- **PR #14 — Add deterministic position action modeling.** Added a read-only position inventory simulator: add authorized positions, close vacant positions, freeze vacancies, and fill open vacancies. Filled-position closure/layoff inference was explicitly blocked.
- **PR #15 — Add structural position scenario modeling.** Expanded actions to BU × level × job profile, added ordered structural actions, and introduced authorized-position budget vs annualized staffed labor-cost impact.
- **PR #16 — Link position scenarios to recruiting demand.** Connected modeled position changes to requisition demand and ATS implications (hold/cancel/create/reactivate/close-as-filled) without mutating requisitions.
- **PR #17 — Link position scenarios to skill demand.** Connected structural role changes to governed role-skill requirements so authorized workforce design produces deterministic skill-demand changes and position-based gap impacts.

## Phase 4 — Build / Move / Buy and whole-role workforce response (PRs #18–#27)

- **PR #18 — Add workforce response strategy evidence.** Added deterministic evidence for Build, Move, and Buy against scenario-widened skill gaps. Borrow remained unavailable with no contingent data; Automate remained unmodeled without governed task/automation evidence. Evidence was explicitly non-optimized and non-additive.
- **PR #19 — Add workforce response plan builder.** Added user-directed allocation of one skill gap across Build/Move/Buy/Borrow/Automate, rerunning the structural scenario before calculating coverage. No automatic optimization or invented costs.
- **PR #20 — Add role workforce response planning.** Shifted from single-skill allocation to whole-role planning. Governed role skill bundles prevent double-counting capacity across required skills.
- **PR #21 — Add internal talent readiness.** Added aggregate role-ready / near-ready / longer-term internal supply for interested active employees, excluding incumbents and exposing no identities or rankings.
- **PR #22 — Add development pathway coverage.** Added course/pathway evidence for near-ready candidates and warnings when Build targets lacked mapped development paths. Course presence was kept descriptive, not predictive of readiness.
- **PR #23 — Add role recruiting feasibility.** Added whole-role Buy evidence from governed ATS history: open requisitions, external fills, trailing-12-month volume, median time-to-fill, weighted offer acceptance, applicants per fill, and scale context.
- **PR #24 — Add workforce response portfolio.** Added deterministic multi-role Build/Move/Buy planning under one structural scenario, role-capped coverage, explicit overplanning, and visibility into omitted/unplanned positive-demand roles.
- **PR #25 — Add organizational demand ownership.** Added signed BU-by-job-profile demand ownership and separated total scenario demand from the subset included in the response portfolio.
- **PR #26 — Add business unit response allocation.** Added explicit BU + job-profile destination allocation for Build/Move/Buy, reconciliation to enterprise role targets, and separate destination gaps/overallocations. Move source BU remained intentionally unmodeled.
- **PR #27 — Add time-phased workforce execution.** Added deterministic monthly execution scheduling for approved BU Build/Move/Buy allocations. User supplies effective months; timing is not inferred from course duration or recruiting history.

## Phase 5 — Constraints, feasibility, and planning architecture (PRs #28–#39)

- **PR #28 — Add workforce response constraints.** Added explicit execution constraints/capacity limits and infeasibility reporting.
- **PR #29 — Refine combined monthly cap label.** Clarified constraint wording so the combined cap was interpretable in the execution UI.
- **PR #30 — Add constraint-aware workforce scheduling.** Added deterministic scheduling under constraints. The scheduler changes timing, not approved strategy; infeasible strategies remain visibly infeasible rather than being silently altered.
- **PR #31 — Refactor workforce planning workflow UX.** Reframed the giant planning experience around a coherent Plan → Design → Respond → Execute workflow.
- **PR #32 — Split workforce planning presentation components.** Began extracting the very large planning component into smaller presentation units.
- **PR #33 — Add product architecture blueprint.** Added `docs/product-architecture.md`, locking the direction away from 'dashboard + chatbot' and defining the three product workspaces plus detailed Planning destination responsibilities.
- **PR #34 — Split workforce design controls.** Extracted Design/position controls.
- **PR #35 — Split workforce response evidence.** Extracted response evidence presentation/logic.
- **PR #36 — Split workforce response portfolio controls.** Extracted response portfolio controls.
- **PR #37 — Split workforce execution controls.** Extracted execution controls.
- **PR #38 — Organize product navigation and shell.** Consolidated product navigation/shell behavior and prepared the workspace structure.
- **PR #39 — Split workforce scenario modeling.** Completed the planned scenario-modeling split. At this point the former giant planning component had been reduced by roughly half, while shared state/API ownership still remained in the mounted planning workspace.

## Phase 6 — Promote Planning into real destinations and harden recruiter MVP (PRs #40–#52)

- **PR #40 — Add planning workspace overview foundation.** Created the small executive Planning Overview foundation.
- **PR #41 — Promote scenario modeling destination.** Exposed Scenario Modeling as a dedicated Planning destination.
- **PR #42 — Promote position workforce design destination.** Exposed Position & Workforce Design as its own destination.
- **PR #43 — Promote workforce response destination.** Exposed Workforce Response as its own destination.
- **PR #44 — Promote execution feasibility destination.** Exposed Execution & Feasibility as its own destination.
- **PR #45 — Protect dashboard filter responses.** Added stale-response protection so slower API responses cannot overwrite newer filter selections.
- **PR #46 — Standardize MVP display precision.** Normalized displayed precision across the recruiter-facing MVP.
- **PR #47 — Preserve role Buy scale precision.** Fixed rounding/precision so role-level Buy feasibility does not lose meaningful scale information.
- **PR #48 — Enlarge responsive AI panel.** Increased default AI panel width and chat/input readability while preserving responsive/mobile behavior.
- **PR #49 — Brand public Workforce AI metadata.** Removed default Next.js branding such as 'Create Next App' and applied public Workforce AI metadata.
- **PR #50 — Fix planning workflow guidance copy.** Corrected planning guidance text and encoding/mojibake issues.
- **PR #51 — Polish recruiter chart tooltips.** Reworked raw/technical chart tooltip labels into recruiter-friendly presentation.
- **PR #52 — Improve analytics table readability.** Improved table layouts so desktop tables fit without awkward internal scrolling while preserving 390px mobile behavior.

## Phase 7 — Talent Management expansion and AI-first workspace (PRs #53–#57)

- **PR #53 — Add governed Learning & Development MVP.** Added enterprise aggregate L&D/pathway coverage against current skill gaps and profile requirements. At release validation: 92 gap skills, 23 active pathways, 25% coverage, 50 profiles, 25 with pathways, 0 fully covered.
- **PR #54 — Add governed Career & Mobility MVP.** Added an enterprise aggregate preference/mobility-oriented Talent page from governed data.
- **PR #55 — Make AI panel the default focus.** Rebalanced the workspace so AI becomes a more prominent primary interaction surface rather than a narrow accessory.
- **PR #56 — Add governed enterprise succession summary.** Released the bounded enterprise Succession Planning checkpoint: fixed 13-field public contract, paired k=10 suppression, fail-closed route, enterprise-only UI/AI, and no raw-source fallback or identities.
- **PR #57 — Rename preference page to Career Interests.** Corrected the product language so the existing preference page is clearly about recorded career interests/preferences, not observed mobility outcomes.

## Phase 8 — Navigation experiment, revert, and scope correctness (PRs #58–#64)

- **PR #58 — Add top-level workspace journey toolbar.** **SUPERSEDED.** Moved workspace switching to a top journey toolbar while keeping page navigation within the active workspace.
- **PR #59 — Apply Version B workspace toolbar wording.** **SUPERSEDED WITH PR #58.** Updated toolbar hierarchy to Workforce Analytics / Talent Management / Workforce Planning with journey subtitles.
- **PR #60 — Restore grouped left workspace navigation.** Reverted the top-toolbar information architecture and restored all three grouped workspaces to the far-left navigation while preserving session/state improvements. Final journey wording: Workforce Analytics — “Understand Our Workforce”; Talent Management — “Realize Our Potential”; Workforce Planning — “Plan Our Future”.
- **PR #61 — Increase left navigation workspace typography.** Increased group headings to about 20px and journey subtitles to about 14px while preserving fixed 252px expanded / 72px collapsed widths and responsive behavior.
- **PR #62 — Fix Talent evidence scope grounding.** Fixed a serious correctness issue: selected BU/country/level context could previously cause enterprise-only Talent evidence to be described as if it were scoped to that selection. The fix separates business context from evidence population, labels enterprise 10,000-person evidence explicitly, and refuses unsupported Talent breakdowns.
- **PR #63 — Publish tested demo candidate.** Consolidated the stable Slate Mist + Blue UI, larger 17px sidebar page labels, taller resizable AI composer, vertical Planning workflow cards, and the PR62 scope fix into a tested release candidate.
- **PR #64 — Add explicit Skills to Planning evidence handoff.** Added explicit user-controlled Carry to Planning for one selected apparent skill gap, source date, enterprise denominator, skill metrics, selected business context kept separate from evidence scope, user goal, and optional assumptions. No automatic scenario execution, allocation, approvals, or source-data writes.

## Phase 9 — Career Growth, accessibility, theme refinement, and shared Planning destinations (PRs #65–#67)

- **PR #65 — Release Career Growth analytics and accessibility fixes.** Added descriptive Career Growth & Internal Mobility analytics as a distinct page from Career Interests and integrated the reproduced accessibility fixes. Validation included 36 focused checks plus integrated keyboard/focus/browser testing. During release-readiness work, interactive desktop testing was later explicitly stopped while the user was using the PC; that operational constraint remains important.
- **PR #66 — Darken Slate Mist background while preserving text contrast.** Darkened the Slate Mist background from `#B7C3D0` to `#ACBAC9` and adjusted muted text to `#354A60`, preserving cards, blue accents, fonts, and layout while improving cursor/background visibility and maintaining text contrast.
- **PR #67 — Connect five Planning destinations to shared workspace state.** Connected Planning Overview, Scenario Modeling, Position & Workforce Design, Workforce Response, and Execution & Feasibility through the existing shared Planning workspace. Sidebar/internal navigation remain synchronized and retain edited scenario assumptions and carried Skills evidence. PR validation reported 21 focused tests, TypeScript, and 26 isolated browser checks; deployed-backend and real-AI release checks were still listed as remaining at PR creation.

## Current historical interpretation

The major arc is:

1. Build a credible People Analytics dashboard MVP.
2. Replace placeholder modules with real governed analytics.
3. Make the AI tool-driven and cross-domain.
4. Move workforce planning from fixed scenarios to deterministic what-if engines.
5. Translate scenarios into position/recruiting/skill demand.
6. Add Build/Move/Buy evidence and whole-role response planning.
7. Add execution timing, constraints, feasibility, and auto-scheduling.
8. Break the giant planning workspace into a maintainable architecture and dedicated destinations.
9. Expand Talent Management with governed L&D, career preferences, succession, and observed career-growth/mobility analytics.
10. Strengthen scope correctness, accessibility, responsive UX, and explicit cross-journey evidence handoff.
11. Connect the promoted Planning destinations back to one shared stateful workspace.

That arc is intentional. Do not collapse the product back into a generic KPI dashboard or let the LLM become the source of workforce math.