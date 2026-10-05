# Home recruiter walkthrough: goal, plan and explicit calculation

This presentation slice is separate from the synthetic Attrition forecast candidate. It changes no database, authentication, billing, permissions, model input envelope or supported calculator scope. The held eNPS files are excluded.

## Current behavior

- Only the former Home navigation row is labelled Action Planning, with modest emphasis and the same selected state. The separate Planning group, route and Insight to Action header are unchanged.

- General exploration has no Compare workforce options control. A valid active saved goal is required; a stored but unselected goal does not qualify. Click handling rechecks the saved goal synchronously. Switching or deleting a goal invalidates the existing scope review.
- A reviewed structured reply shows a highlighted goal card first. Short explicit outcomes such as `Reduce turnover` retain the user's exact words; open discovery questions retain the reviewed suggested problem. The brief recorded summary uses existing allowlisted facts and identifies scope, missing dates and synthetic provenance. It does not infer causes.
- Pin is the primary action. Evidence, limitations and the associated long reply are collapsed. Optional exploration links derive from validated live finding/question pairs, use source labels, and retain draft and stale-response protections. Invalid metadata produces no links. Ordinary unrelated replies remain expanded.
- Plan #1 / Plan #2 controls are small tabs with selected state, arrow/Home/End keys and a labelled panel. The selected plan is one brief description and seven stacked bullets: Approach, Stakeholders, People needed, Cost, Timeline, Expected outcome and How success is measured. Assumptions follow underneath. Only the Plan selectors are boxed side by side. Individual hypothetical values retain an Illustrative label; an unresolved complete budget is Not yet assessed. There is no separate parallel pilot summary. Proposed diagnostic titles remain diagnostic. Proposed roles are not assigned people.
- The shared comparison caveat appears once. Only current calculations with matching reviewed scope expose numerical tradeoffs. Illustrative assumptions remain visibly labelled underneath the plan; exclusions, completeness, overlap, source evidence and provenance stay in one collapsed Why these plans area. Individual illustrative cost rows are not silently added into a complete budget.
- Guided example instructions describe the current pin-first flow. Starting the example collapses Intro & instructions. Example steps remain collapsed; the example does not approve, calculate, attach or claim AI capability gains.
- The starting guide asks What do you want to achieve? and offers five short common prompts. A skills-specific follow-up permits a mix of training, internal moves and hiring; it is not shown for unrelated goals. The shared helper and composer placeholder describe goals, comparison, plan building/editing and general questions. The composer has a 48px minimum. Home assistant body typography remains 14px/21px. Long replies and drafts remain scrollable and complete.

## Actual calculation coverage and outstanding product gap

The coordinated draft preparation is one existing model response. `reconcileBundle` calculates one explicitly reviewed draft's ledger, dependencies and optional staffing path; it does not enumerate or rank a scenario space. Comparing saved drafts checks matching scope and current input identities. There is no trustworthy scenario-execution count to display on these qualitative cards.

Separately, the existing capacity planner's explicitly run bounded local search varies Build/Move/Buy counts under saved scope and assumptions. Its executed report records `summary.enumerated`, `calculatorInvocations`, complete enumeration, status counts and return filtering. Nondominated candidates describe bounded tradeoffs, not a weighted best or retention effect. This slice does not automatically connect that search to qualitative full-plan generation.

The current generator contract allows zero to three proposals and explicitly permits fewer. Its instructions request coordinated components and at least one delivery/pilot task for improvement goals, but the parser validates shape, references and dependency graphs; it does not establish that generated content is a complete intervention or meaningfully different. Two returned diagnostic proposals therefore do not prove that three integrated solutions were explored. Preserving the explicit outcome at pinning avoids changing an improvement goal into an investigation goal, but it does not by itself solve content quality.

The original pin → efficient scenario search → ranked full plans intent remains incomplete. It requires an explicit reviewed search binding and execution-count contract, supported objective/constraint semantics, and coordinated intervention proposals that can be reconciled against the searched staffing assumptions. Display cleanup does not establish that diagnostic proposals are complete interventions, or that generated prose is semantically reliable. No new claims about retention effects or real-world ML performance are introduced.

## Conversational editing audit

The current Discuss changes action sends a scoped discussion request and preserves the typed draft. It does not parse or adopt an assumption patch. The working form calls validated `reviseBundleDraft` / `reviseBundleProposal` paths; save and calculation remain separate. Removing it now would remove the supported editing path. Chat-based editing requires a separate bounded change contract, exact goal/plan/revision binding, preview and explicit adoption, persisted provenance, field validation and stale/in-flight guards before deterministic recalculation. A budget ceiling or requested finish month must not be silently interpreted as an observed expense or readiness date.

## Attach and linked planning audit

The existing application preview can map compatible reviewed Development quote inputs and added-capacity inputs for the same goal. It defaults every field to Preserve, requires compatibility checks, and separately commits chosen changes with a receipt and version history. Source headcount and catalogue-scenario selection remain read-only; missing provider quotes and broader Finance/execution bucket coverage are not inferred.

A unified Attach flow still needs to combine attachment and supported planning-field application in one reviewed atomic commit. Explicit Save of a later accepted plan revision should update only fields whose prior application receipt and source binding still match; manually changed destination values need a conflict/replacement review. This linking is not implemented in the UI checkpoint, and it must not claim all Planning buckets are synchronized.

## Verification

The browser suites use intercepted synthetic responses and browser-owned test records. They do not call live OpenAI, database or other external services. Coverage includes general/selected/deleted/switched goals; draft and saved-history preservation; stale scope/evidence/response changes; exact finding-question dispatch; compact tabs and keyboard navigation; missing inputs; unsupported replacement scope and separate retention scope; explicit input save and unchanged calculator payload; focus of calculated cards; desktop, mobile, 200% reflow and simulated keyboard geometry.

Local acceptance: 903 unit tests and 509 browser assertions passed, with lint, TypeScript and production build. Browser counts: recruiter flow 87; bundle labels 24; illustrative pilot 30; combined plan math/history 48; pinned goals 58; supported capacity flow 72; live finding controls 69; dock geometry 61; compact reply typography 60. Screenshots were inspected at desktop, mobile and 200% reflow. These checks use supplied fixtures; they do not validate current live model prose quality.

Preview acceptance and exact release checks remain required before merging this candidate.
