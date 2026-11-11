# Visible conditional staffing recommendations

This increment changes the normal fixed-role staffing presentation. It does not change the guided service-team priority summaries or introduce another staffing calculator.

The existing recommendation, after budget-period and delivery-target checks, appears before the editable planner and option cards. It includes the existing listed-cash rationale, cost horizon, known-subtotal warning when incremental costs are incomplete, unresolved conditions and next step. The chosen card is labeled **Conditional recommendation**. When the review gates suppress a recommendation, the summary says so and does not promote another mix.

Every internal option shows its release assumption and backfill input. Missing backfill is explicitly unknown rather than zero; an entered zero remains visible as an entered zero. Readiness is visible even when unknown, and a known later readiness date does not imply coverage from period start. Denied release, unresolved pool overlap, incomplete cost coverage and unspecified new-hire training remain visible without opening Details. The saved fixed-role quick summary reads these conditions from its existing checked receipt and still requires a matching result input key.

The headline always describes the actual gated recommendation. Selecting another mix only changes the inspected chart. Unapplied revisions are labeled previews, invalid edits retain an explicitly labeled last-valid preview, and the existing apply, pin, disabled-state and duplicate-pin guards remain intact. Reset restores the applied inputs.

## Boundaries

- Calculator enumeration, ranking, input parsing, budget confirmation, delivery conflict checks and persisted formats are unchanged.
- Listed cash is not total employer cost or proof of operational feasibility. Actual people, skills and staffing availability are not verified.
- No employer-cost, uncovered-hours cost, productivity, savings or ROI estimate is added. Missing inputs are not filled from another scenario or data source.
- No provider calls, database changes, live-service changes, push, deployment or browser automation are part of this local increment.

## Local verification

The regression coverage includes missing versus zero backfill, denied release, unknown readiness, known late active paths despite another unknown date, no recommendation, incomplete incremental cash, pending positive and zero budgets, unapplied and invalid edits, reset, manual inspection differing from the recommendation, saved-receipt conditions and stale-result rejection.

- Focused presentation, deadline, budget-period, current-summary and cost-basis checks: 45 passing tests, no skips.
- Complete-runtime staffing checks: 99 passing tests, no skips.
- Changed-file ESLint and full TypeScript pass. The production build passes its prebuild checks, compilation, page generation and postbuild asset audit.
- The isolated runtime overlays the entire candidate public source and preserves all 145 runtime-only inputs byte-for-byte. Private runtime inputs are not added to this repository.
- The source manifest records changed source hashes only. Its historical deployment identity is not evidence that this increment is deployed.

Desktop/phone browser acceptance, integration checks and exact-head remote CI remain separate publication gates.
