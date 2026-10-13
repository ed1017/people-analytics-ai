# Optional assumed monthly cost run-rates

This local slice extends the released company-wide synthetic headcount comparison with one blank, optional **Monthly USD cost per employee** input. It does not qualify snapshot labor-cost semantics. Source-derived costs remain unavailable; no source rates, annual conversions, FTE factors, inferred components, FX, spending totals, subgroup models or recommendations are introduced. The synthetic-baseline disclaimer is unchanged.

The user defines what their entered rate covers. The same rate applies to both headcount paths at each of the six month ends. Results are labelled **calculated from your rate, not sourced actual cost or statistically predicted spend**. They are monthly run-rates at the displayed stock-date headcount, not payroll paid during that month. No six-month total is computed.

## Contract and arithmetic

`SwpUserMonthlyCost` is separate from the hire/departure assumptions: `{basis:'user-entered', currency:'USD', unit:'per-employee-month', amount:number}`. Other units, currencies, provenance and extra fields are rejected. Blank input maps to null, never zero. Explicit zero is valid. Rates must be finite amounts from USD 0 through 100,000 per employee/month, with at most two decimal places. This explicit support limit is not a salary estimate. Combined with the existing six-month horizon and maximum 1,000,000 monthly hires, headcount is at most 6,010,000 and a run-rate at most USD 601,000,000,000 (<2^40). Dollar-number rounding is then much smaller than half a cent, so two-decimal formatting preserves integer-cent results. Rate cents and headcount × cents must be safe integers. Excess precision, exponent-form UI input, negative/nonfinite values and unsafe products fail with a visible error.

The existing headcount and monthly flow calculations are unchanged. Cost uses integer-cent products and differences, then converts to USD for display. Every row is baseline headcount × rate, user-scenario headcount × the same rate, and scenario minus baseline. Without a scenario, the pure contract leaves scenario cost/difference null; the existing UI still asks for both hire/departure inputs before Compare.

For the authored test rate USD 12.34 and 100 hires/60 departures monthly, March headcounts are 10,300 and 10,240. Their assumed monthly costs are USD 127,102.00 and USD 126,361.60, difference −740.40. The test rate is not a suggested pay rate and is never a UI default. Clearing/editing any input invalidates prior calculated rows; Reset clears rate, hires, departures and results. Closing/reopening or reloading retains the existing transient-demo behavior. Other workspace filters and unassigned planning drafts retain the reviewed navigation behavior.

The additional six-row table appears only after a rate is applied. It shows exact cents, has explicit USD/month units, and stays within its own keyboard-focusable horizontal scroll region on narrow screens. No new route, persistence, network call or package was added.

## Route harness repair

The two old `tests/compensation.test.mjs` failures came from its strict VM module loader not recognizing the route's later `@/lib/dataset-runtime` import. The test now supplies the **actual local `withDatasetRequest` wrapper**, rather than bypassing or faking it, and passes a Request into GET. The existing database stub remains isolated and cannot use sockets or credentials.

Existing exact-row-count, null/zero, no-store and sanitized-error assertions remain. Added checks verify the legacy dataset response header and that a mismatched request token returns 409 before the database stub is touched. No production route or dataset-runtime implementation changed.

## Validation

- 31 passing tests: qualification/baseline contracts, reviewed headcount arithmetic, three cost contract cases covering cents/units/provenance/zero/null/invalid/overflow, and all eight compensation tests including the repaired GET cases and real-wrapper mismatch rejection.
- Component fixture at 1366/390/320 pixels: blank rate, exact decimal costs, zero, clearing, editing invalidation, invalid/unsafe values, reset, reload, no page overflow and cost provenance labels.
- Built-app desktop/mobile round trips: optional cost calculation/reset alongside populated filters and the existing unassigned-draft preservation checks; no AI or external requests. Local API fixtures remain explicit, not live-source validation.
- Targeted ESLint, webpack build/TypeScript and diff checks. No paid AI, database, access, secret or environment-setting changes; no push or publication.

Reproduce with the existing commands in `swp-headcount-comparison.md`; add `tests/compensation.test.mjs` to the contract test invocation. The earlier failures recorded in `swp-cost-definition-contract.md` describe the prior checkpoint and are repaired here. Its missing source-definition evidence remains unresolved.

## Narrow cents correction after independent review

The prior implementation admitted USD 8,744,853,645.37/employee/month: integer-cent multiplication remained safe but converting the large product to a dollar Number could display October scenario .38 instead of exact .37. The explicit rate cap now rejects that case and USD 100,000.01, while retaining zero and the cap itself. A regression compares all six baseline/scenario/difference displays against BigInt cent oracles for 20 rate/flow combinations (360 formatted outputs), including maximum supported growth and near-cap fractional rates. BigInt is used only in the test oracle, not a new runtime money model.

Added browser coverage reloads with a populated cost result, asserting all three inputs and cost rows clear, and exercises the cost table inside the actual mobile shell, including horizontal scrolling and visible USD/month units. Blank/zero and navigation behavior are unchanged.
