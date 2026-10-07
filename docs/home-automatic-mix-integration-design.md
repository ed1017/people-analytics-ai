# Automatic bounded Build/Move/Buy search in Home

Design only, based on published `6c613b8` and the separate local capacity-cash correction. No implementation, merge or deployment is authorized by this document.

## Resulting behavior

Initial Home plan preparation and each changed planning constraint automatically evaluate the applicable bounded staffing combinations. They show the searched bounds, assumption provenance, number evaluated, missing inputs and cash/hour tradeoffs inside the existing Action Plans. There is no separate Search, Explore, Build Mix or Save Calculation button. Apply/Attach retain their current explicit draft/snapshot roles. Ordinary explanation requests do not trigger a new search.

Home's existing model request still composes qualitative activities and dependencies. A numerical staffing search does not estimate retention effects or optimize the full intervention plan. It must not claim a global optimum. Report the best among explored feasible candidates under a visible objective, “no match within these bounds,” or “cannot establish feasibility with these missing inputs.” State the objective, bounds, number explored and any display truncation beside the recommendation. A default display order is not a recommendation.

## Existing components to reuse

- `workforce-mix-search-core.ts`: `preflightWorkforceMixes`, complete bounded enumeration, maximum 1,000 calculator invocations and 64 emitted results; explicit truncation and missing-data outcomes. Only Build/Move/Buy counts vary. Backfills, dates, rates, total internal salary uplift, training cash and training hours stay fixed; these are not per-person values.
- `workforce-increment.ts`: the unchanged calculator for day-prorated external payroll, one-time recruiting fees, backfills, internal salary uplift and training vendor cash. Existing employee effort must be reported as hours in Home, never added to cash.
- `workforce-local-search.ts`, `workforce-search-client.ts` and worker protocol: bounded local execution, cancellation/currentness checks and reproducible report/selection identity.
- `home-capacity-adoption.ts`: existing strict reviewed-source adoption invariants (flow ownership, group capacity, disjointness, cost re-review). Do not call it on invented saved evidence.
- Capacity-cash patch contract: `planCashEstimate(draft, reviewedCash) -> {cash, coverage, reason}`; `coverage` is `reviewed`, `partial`, or `unknown`. `BundleResult.cashEstimate` and `budget` are authoritative for display and snapshots. Partial costs below the ceiling do not establish headroom. `planStaffEffort` keeps staffing training and delivery effort separate if overlap is unresolved. New records use `cash-hours-v2`; prior signed records replay unchanged.

## Necessary source adapter

The current `searchWorkforceMixesLocally` accepts only a saved `WorkforceSolution` with a current verified calculation. `matchedBundleSearch` additionally requires matching exact Home scope, a reviewed capacity mix and mappings. Initial Home proposals generally have none of these. Merely mounting the old HomePlanIntegration would restore manual steps and still fail initial generation.

Add an explicitly tagged Home-assumption source; never manufacture `WorkforceSolution` evidence/result IDs or relabel demo values as reviewed. Extract the reusable enumeration evaluator into a pure input kernel used by both the unchanged saved-source facade and the new Home facade. Preserve saved-source search version/report replay. The Home facade has its own source tag, schema version and fingerprint. Its identity includes goal/evidence/planning binding, bundle signature/input key, all assumptions with provenance, mappings, cost policy, bounds, objective dimensions and calculator version.

The existing core Pareto metric includes a monetary employee-time valuation. Home needs a separately versioned comparison projection using cash, staff hours, added employees and coverage date. Do not change the old saved-source projection or inject an hourly rate. If training and delivery hours overlap, the combined metric is unknown and cannot support dominance. Search feasibility must include Home's entire reconciled incremental cash and vendor allowances, not just the staffing calculator subtotal; aggregate duplicate sources once. Unknown or overlapping cost coverage cannot become a successful total-budget check.

## Input and execution contract

1. `resolveHomeMixContext` collects explicit goal/constraint values, current scoped planning data and visible illustrative assumptions. Whole position counts remain distinct from FTE. Missing currency conversion, arrival schedule, paid fraction or staffing-path mapping remains unresolved. Do not convert an internal role to an external salary. Existing employee effort stays in hours.
2. Build finite integer path bounds from explicit limits and known group mappings. An illustrative upper bound is allowed only as an explicitly labeled search assumption, never as observed availability. No overlapping internal groups, invented training effectiveness, new cost quote or changed headcount cap. If full bounds exceed 1,000 evaluations including reference, report the bound limit; do not silently search a prefix or imply complete coverage.
3. Return a discriminated context result: `ready` with immutable source/spec; `not-applicable` for non-capacity goals; or `needs-inputs` with exact missing dimensions and useful existing assumptions. Generation may still show qualitative plans and cash subtotals while numerical feasibility is unknown.
4. A single orchestrator accepts `initial` or `constraint-change`, deduplicates by source fingerprint, cancels superseded work and publishes results only if the active goal, evidence, revision, selected plan and constraints still match. No network fallback, retry after denial, or model loop. A rerender, comparison expansion or attachment does not rerun a current search.
5. Evaluate and select before display truncation. Honor an explicit user objective; otherwise visibly default to lowest complete incremental cash among candidates meeting the entered role-coverage, deadline, added-employee and effort constraints. Break cash ties by earlier coverage, then lower known staff hours, then fewer added employees; show tied tradeoffs where a tie-break metric is unknown. Include the selected candidate even if the normal 64-result display cap would omit it. Label it “best among explored feasible candidates for [objective]” and show the compared values, bounds and evaluated count. Missing required costs, constraints or currencies mean feasibility is unknown, not a match. Preserve nondominated tradeoffs alongside the selection. No universal optimality claim or hidden weighted score.
6. Stage each admissible candidate as an ordinary proposed Home revision with a verified source/report fingerprint. Retain whole-flow ownership, dates, salary/vendor-cost coverage and group checks. Removing an inactive staffing path must not remove unrelated activity costs. If candidate adoption needs an absent mapping, report it instead of fabricating the mapping or silently changing the component graph.
7. Apply/Attach verify the exact current candidate and reconcile the complete Home cash result. One atomic local commit saves the revision/report/snapshot. Reload verifies lineage and preserves historical attachments. No database/configuration/model changes are needed.

## Ownership boundaries for independent implementation

| Owner | Files | Integration contract |
| --- | --- | --- |
| Capacity-cash correction (this branch) | `home-capacity-assumptions.ts`, `home-plan-cash.ts`, `home-plan-what-if.ts`, `home-plan-delivery-estimate.ts`, `home-bundle-reconciliation.ts`, `home-bundle-chat-edit.ts`, `home-plan-revisions.ts`, `components/home-bundle-plans.tsx`, associated regression tests | Freeze cash/hour and replay contracts before integration. Do not concurrently edit these files. |
| Numerical adapter implementation | New `lib/home-mix-context.ts`, `lib/home-mix-search.ts`, `lib/home-mix-records.ts`; narrowly extracted pure kernel under `workforce-mix-search-core.ts`; new unit fixtures/tests | Export context resolution and an immutable, fingerprinted `HomeMixReport`; retain old saved-source report bytes/tests. Does not edit Home components or cash fix files. |
| Home orchestration implementation | New `lib/home-mix-orchestration.ts`, `components/use-home-mix-search.ts`; new browser harness | Initially consume the adapter through injected functions. Expose pending/report/needs-inputs state and proposal callback. Do not edit cash-owned files. |
| Final integration owner | Small agreed seams in `components/home-solution-bundles.tsx`, `components/home-bundle-plans.tsx`, chat proposal handling and worker dispatch; source-specific candidate adoption | Wire initial preparation and accepted changed constraints after both branches are verified. Resolve shared-file changes once. Keep existing Apply/Attach; no extra manual-search UI. |

## Required acceptance evidence

- Initial five engineering roles, no additional search action; repeat after changing budget, horizon, headcount cap, staff hours and staffing costs. Explanation-only chat is inert.
- The exact five-role $487,500 versus $10,000 case remains over budget; vendor contracts and day-prorated hire/backfill payroll survive mixed-path alternatives. Missing/non-USD/fractional/partial-period inputs remain visible and cannot create positive headroom.
- Complete finite bounds reproduce existing enumeration counts and calculator calls; objective selection uses every evaluated feasible candidate before display truncation, retains the selected candidate and explains ties. No-match, missing-data, budget-limit and truncated-display results make no global claims. Search never broadens an explicit bound.
- Concurrent edits, selected-plan changes, aborts, browser reload and delayed worker replies cannot attach stale candidates. All prior attachments/revisions remain byte-identical.
- Distinct targets, turnover denominators/rate periods and role/FTE dimensions cannot receive like-for-like ranking. Training hours cannot disappear behind generic delivery hours or be counted twice.
- Existing saved-workforce search/replay tests, full recursive application tests, Home browser flows at desktop and 390px, build and lint. No unsupported manual legacy harness is reported as passing.
