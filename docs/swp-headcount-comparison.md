# Local company-headcount comparison

This unpublished slice follows reviewed experiment `ff2778ecae0ad00e1a94c5d874c4350954ead512`. The comparison reviewed at `bb17cfde` is accessible locally from **Planning → Scenario Modeling → Compare headcount — synthetic demo baseline**, within the existing shell at `/?page=scenario-modeling&demo=headcount`. Its return button removes only the demo parameter. The previous standalone path `/planning/headcount-demo` redirects to this in-shell location for direct links. Existing scenario panels stay mounted while hidden, preserving transient filters and unassigned planning drafts through explicit return and browser Back/Forward. No Home starter, API, database access, paid calls, push or deployment is added. There is no automated action recommendation or operational planning activation. The existing withheld Forecasting starter remains untouched on its separate branch.

Visible disclaimer, verbatim: **Synthetic demo baseline. Conditional retrospective evaluation; not validated for operational planning.**

## What the comparison means

The company-wide opening is 10,000 synthetic employees at 30 September 2026. Both paths cover the six month ends October 2026–March 2027. The reviewed drift method is refitted on all 33 captured monthly observations; its increment is `(10000 − 8400) / 32 = 50` people per month. The displayed demo baseline therefore ends at 10,300. This is a newly displayed conditional extrapolation, not the earlier retrospective April–September holdout series, and not a claim that the holdout's low error predicts future accuracy. Separate hire/departure forecasts and intervals are unavailable.

The user enters two initially blank counts: total external hires and total departures per month. Submitting applies those user-entered assumptions, held constant for six months, to the same opening stock. Formula: prior scenario headcount + hires − departures. These flows replace the baseline path; they do not modify its fitted slope or get added on top of predicted growth. Internal transfers cannot change the company total. Difference is scenario minus demo baseline; it is not a causal effect, target gap, recommended intervention or guaranteed staffing result.

Example fixture: 100 hires and 60 departures each month gives a March scenario of 10,240 versus a 10,300 demo baseline, difference −60. Explicit 0/0 gives 10,000, whereas blank fields remain unknown and produce no scenario. Edits clear the old result before recalculation. Negative, fractional, nonfinite, extra unsupported fields and infeasible outflow assumptions fail closed. Reset clears user inputs; reload starts fresh. The reviewed baseline stays unchanged throughout.

`experiments/swp-headcount/comparison.ts` requires the qualified company-headcount metric, reviewed source/version, exact 33 values and calendar. This binding prevents accidental source substitution; it does not authenticate the underlying database. Costs and intervals are null. No subgroup selector is offered.

## Reuse and regression boundary

`lib/monthly-headcount-flow.ts` extracts the existing monthly-flow branch's deterministic arithmetic. `lib/home-solution-projection.ts` calls the helper with the same resolved assumptions, retains company transfer checks, and preserves the returned point shape and negative-headcount rejection. The configured scenario branch is untouched. The new comparison calls that helper directly, so it does not fabricate conversation turn provenance or borrow the configured engine's unsupported cost/default assumptions.

The UI is `components/swp-headcount-comparison.tsx`. It renders a single six-row table, explicit date/unit labels, two labelled inputs and Compare/Reset controls. A table supplies exact, accessible values without another dashboard/card collection. No styling dependencies or packages were added.

## Validation and reproduction

Run from repository root:

```sh
node --test tests/swp-history-qualification.test.mjs tests/swp-headcount-baselines.test.mjs tests/swp-headcount-comparison.test.mjs
PLAYWRIGHT_MODULE=/tmp/people-browser/node_modules/playwright/index.mjs node tests/browser/swp-headcount-comparison.mjs
npm run build -- --webpack
```

The isolated browser fixture uses the actual component and captured aggregate history, bundles with the installed compiler, and intercepts all requests locally. Adjust `PLAYWRIGHT_MODULE` to an existing Playwright installation when necessary; Chromium is `/usr/bin/chromium`.

The actual route/navigation test runs against a locally built Next server:

```sh
npm run start -- --hostname 127.0.0.1 --port 3478
# In a separate shell:
PLAYWRIGHT_MODULE=/tmp/people-browser/node_modules/playwright/index.mjs node tests/browser/swp-headcount-route.mjs
```

It exercises the real sidebar from Planning Overview to Scenario Modeling, the labelled demo entry, comparison, reset, reload, browser Back/Forward, explicit return and the legacy-route redirect at desktop (1366px) and mobile (390px). The test uses populated synthetic country/business-unit/level options and a valid planning baseline/default response. It selects UK/Engineering/L3, edits growth and inflation assumptions, calculates a custom scenario using the existing deterministic engine locally, and types an unsaved scenario name under General exploration (no selected goal). For explicit return and both Back/Forward directions it verifies all filters, input values, exact calculated-result text and scenario name, plus identity of the original draft DOM node. This tests transient unassigned state directly, rather than relying on saved-goal persistence.

All APIs are intercepted before reaching the server. The sole scenario calculation POST is fulfilled inside the test with authored fixture data; it is not an AI request or live database operation. Demo round trips trigger zero API requests and no scenario rerun. Assertions require zero AI requests, external requests, browser exceptions or horizontal overflow. Screenshots show the in-shell demo and restored draft with production CSS. The demo explains that workspace filters do not apply to its fixed company-wide synthetic scope. Reload resets the transient demo inputs; preserving unsaved state across full reloads is outside this navigation correction. The calculation contract and reviewed comparison component are unchanged.

The correction replaces the same-tab standalone-route transition, which unmounted Home and lost transient state. `HeadcountDemoWorkspace` uses the existing app URL subscription and browser history, keeps planning children mounted, and restores focus on open/return. No new storage layer, synthetic conversation provenance or saved-goal migration is introduced. The React/Next repository guidance was checked for the URL subscription, server redirect, stable children and client/server boundaries.

Coverage: 19 tests include nine negative freeze mutations (selection, protocol, rehashed protocol, history, rehashed history, rehashed subgroup, rehashed calendar, development window, holdout window); qualification; deterministic baseline/scenario dates and arithmetic; missing versus zero; provenance separation; source/cost/subgroup rejection; helper date rollover/decimal preservation; and regression through the existing conversation engine. The new rehashed-subgroup case initially failed, then motivated rechecking the company-only contract at holdout evaluation.

Browser flows run at 1366, 390 and 320 pixels: blank and partial input, submitted comparison, edit invalidation, explicit zero, negative/fractional/text input, infeasible outflows, keyboard submission, unchanged baseline, reset, reload and invalid-source rejection. Checks assert no horizontal page overflow, no unsupported selectors, visible cost unavailability, no browser exceptions or external requests. Screenshots and machine-readable receipts accompany the review archive. The 320px screenshot was visually inspected for readable labels and values.

## Concrete inputs still needed for costs

1. Original snapshot generator/import rule or source-owner definition of **monthly versus annualized** amounts, including period boundaries and units. A stock-date amount cannot be silently divided by 12.
2. **Contracted-employee versus 1.0-FTE normalization**, and how part-time FTE applies. Salary or hourly rates cannot be inferred from current total cost/FTE.
3. Included **base pay, bonuses, employer taxes, benefits and equity**, with cash versus accrual treatment and recurring versus one-time classification. Unexplained residuals are not component evidence.
4. **Currency and FX conversion/rounding rules**, effective dates and revision vintages.
5. **Source complete-through and correction/revision semantics**, with historical availability evidence and reconciled population. `labor_costs` being an empty table cannot provide actual payroll targets.

Resolving these defines a cost metric; it does not itself validate a cost model. Historical subgroup membership remains separately unqualified. Neither capability is activated by this headcount demo.
