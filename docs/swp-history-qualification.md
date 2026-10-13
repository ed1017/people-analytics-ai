# SWP historical qualification checkpoint — 2026-10-13

This checkpoint contains a local pure contract and offline tests, not a model, endpoint, data import, UI or operational forecast. Production remains unchanged. Prompt cleanup is on a separate branch. Live checks were read-only metadata and aggregate queries against the existing synthetic public schema; no person-level rows were exported.

## Definitions supported by evidence

- Company headcount is distinct employees present at month end. The existing `dashboard_headcount_trend` view uses `count(distinct employee_id)`; snapshot employee/month keys are unique. All 304,203 snapshot rows are active. Counts for all 33 month ends reconcile exactly to `hire_date <= snapshot_date` and `(termination_date is null or termination_date > snapshot_date)`. Hires on the date are included, departures on the date excluded. This is stock, not average exposure or available capacity.
- FTE history is the sum of reported snapshot FTE. All values are non-null and greater than zero and at most one. The view rounds the sum to one decimal. This establishes an aggregate reported-FTE series, not productive hours, deployability or staffing availability.
- Snapshot USD cost is a reported stock-date amount. `finance_current_summary` sums it for 30 September 2026 and divides by FTE for its cost/FTE ratio. Neither that view nor the underlying schema defines its cost period. The repository deliberately carries `cost_period: unknown`; current cost/FTE cannot establish salary or an hourly rate.

## History/population checks

33 consecutive month ends span January 2024 through September 2026; counts range from 8,400 to 10,000. No duplicate employee/month keys, invalid FTE, missing org/job/location/cost-center keys, calendar gaps or within-employee history gaps were found. Company hire/termination eligibility reconciles every month.

All snapshots share one load timestamp, 2026-09-28T01:50:05.925777Z. This includes the future-relative-to-load 30 September snapshot. `created_at` is a bulk-load marker, not historical availability. No source completion watermark or as-known-at-origin revision history has been verified.

No employee changes org, job profile, location, cost center or FTE across their snapshots. The movements table contains 600 records, including 267 org changes. All 267 have before/after month-end snapshots, but none reconciles its from/to org with those snapshots; the snapshot org stays unchanged. Multiple moves within a month could complicate individual event comparisons, but zero observed snapshot org transitions does not establish as-was membership. Company totals can reconcile while subgroup histories remain wrong or retrospectively classified. BU as-was membership is blocked; role/location/cost-center history is unverified, not certified by the absence of recorded changes. Current dimension hierarchies also lack verified historical mapping versions.

## Cost trace and unresolved definitions

The inspected repository tree and available Git history do not contain an original generator/import implementation for `public.employee_snapshots` or `public.labor_costs`. A search of public stored function definitions found no relevant seed/generator/import/snapshot function. Inspected cost columns have no explanatory comments. This is a bounded absence finding, not a claim about external source files.

The repository's `lib/ml/synthetic-workforce` generator is an explicitly separate local release/truth experiment; its documentation says it does not reconstruct or certify the existing DB. The compensation v1 adapter declares an annual-contracted-base **demo convention**, and the v2 compensation generator constructs its own pay/FTE/range population. Neither establishes original snapshot total-labor-cost period or components. Do not transplant those conventions.

`labor_costs` has zero records. Its schema names monthly effective dates, local component amounts and USD equivalents, but intended schema cannot establish observed payroll history. `employee_snapshots` has 304,203 populated, nonnegative USD labor-cost values, eight currencies and 80 cost centers. `fx_rates` has 60 month keys, but its historical revision/first-availability contract is unknown. Budgets and position plans remain separate planned amounts, not observed training targets.

For January 2024, September 2025 and September 2026 (27,815 snapshot rows), every currency had exactly one same-month FX match. Recomputing `round(local_total_labor_cost * rate_to_usd, 2)` differed by more than $0.01 on 10,705 rows, but the maximum discrepancy was only $0.13. Aggregate absolute differences were $161.46 / $180.85 / $193.15, respectively, about 0.00001% of totals. USD-denominated local-versus-USD identity matched. This is compatible with rounding or component conversion; it does not prove wrong FX or establish the original conversion algorithm. September-2026-rate substitution did not exactly reconcile older rows either.

Labor-cost/total-compensation ratios range from 1.1023 to 1.4686 in the sample. Total compensation differs from base plus target bonus on 20,888 rows. Those identities do not identify benefits, taxes, equity or their time basis; no residual is labelled as a known component.

Exact unresolved cost inputs: original generator/import rule or source-owner definition of monthly versus annualized amounts; full-time-equivalent versus contracted-FTE normalization; included benefits/taxes/equity and cash/accrual basis; FX conversion/rounding and vintages; complete-through and correction semantics. No automatic divide-by-12, benefits markup or invented rate is permitted.

## Backtest feasibility, not performance

A six-month horizon on 33 consecutive observations, with a final six-month holdout and 12 months' initial training, permits 10 expanding development origins. The last development target is March 2026; the holdout trains through March and targets April–September 2026. These overlapping origins are correlated, not 10 independent samples. The 12-month choice is a window design, not a claim of adequate evidence.

Requiring 24 training months leaves no complete six-month development target before the reserved holdout; one final holdout remains possible. A broad seasonal model search is therefore poorly supported under that separation. No statistical model has been fitted here. Missing source vintages limit even a later company-headcount backtest to conditional retrospective synthetic evidence, not demonstrated deployment-time accuracy. Uncertainty intervals remain unavailable.

## Reusable local contract

`lib/swp-history-qualification.ts` accepts reviewed aggregate series with source/version, scope/population, metric definition and evidence references. Scope dimensions are company, business unit, job profile, location and cost center; this is not an entitlement or a claim all dimensions are ready. Headcount, reported FTE and labor cost have distinct contracts. Unsupported metrics such as skill capacity are not silently substituted.

The contract checks ordered monthly history, valid values, population/membership evidence and metric definitions. Cost additionally requires verified monthly basis, currency, FTE normalization, components and FX basis. Annualized/unknown costs cannot silently become monthly endpoints or cumulative costs. `inspectable` does not imply model eligibility; `conditionalRetrospectiveEligible` does not imply validation. Operational forecast and interval availability always remain false. Evidence references are reviewer-supplied audit inputs, not authenticated source attestations.

Eight focused tests cover chronological holdout separation, insufficient windows, gaps/duplicates/order, unknown versus zero values, subgroup membership contradictions, unresolved cost semantics, fractional FTE and missing evidence references. No production caller or source data is activated.

The next supportable modeling milestone is a separately reviewed conditional company-headcount baseline experiment. Cost and as-was subgroup forecasts must first resolve the blockers above. Existing deterministic scenario arithmetic can later compare user assumptions against a qualified baseline; it must retain scenario labels and separate endpoint monthly cost from cumulative period cost.
