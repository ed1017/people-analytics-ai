# Company cost qualification: source evidence and next slice

Decision: **snapshot-derived monthly cost, six-month spending and cost forecasts remain unqualified.** A separately labelled user-assumption cost run-rate could be designed without asserting that the snapshot amount is monthly payroll. No runtime implementation or release is included here.

Source boundary: repository tree at released merge `938962c702e6d089d4fa7ba0ab732f8d39f13750` (identical tree to reviewed `47ad95cc`), tracked SQL, generators, documentation and locally available non-shallow Git history. No live database query was repeated. Database observations below are explicitly prior captured evidence, not fresh attestations. No original snapshot/labor-cost DDL/seed/import definition was found in the inspected tree/history; this does not rule out external files.

## Evidence map

| Question | Exact repository evidence | Conclusion |
|---|---|---|
| What is the exposed amount? | `docs/compensation-aggregate-context.md:9–15` records the view's fixed 2026-09-30 predicate and SUM of `employee_snapshots.total_labor_cost_usd`. `lib/compensation.ts:20–29,81–95` returns source USD, snapshot date, null cost period/refresh/employee coverage. `lib/finance-current.ts:22–39` inherits this contract. Introduced by `6acb70e`. | Reported synthetic stock-date aggregate, not verified monthly payroll. Null is the actual API representation of unknown period; it is not a literal `"unknown"` string. |
| Does the scenario engine define the period? | `lib/scenario-engine.ts:355–385` derives planned FTE/headcount, divides planned labor cost by planned FTE, applies relative annual inflation scaling, and multiplies by modeled FTE. `app/api/finance/route.ts:59–75` separately reads current Finance aggregates and December 2027 **planned** scenario values. | Arithmetic preserves the input cost unit; monthly planning dates and annual inflation do not establish the amount's period or make plans actuals. |
| Does an annual label settle it? | `database/position_action_structural_inventory.sql:65–75,88–94` divides December 2027 Baseline planned labor cost by planned headcount and aliases the ratio `annual_cost_per_position` (history includes `518c480`/`6fc363f`). | The alias has no period conversion or source definition. It cannot certify original snapshot semantics or be reused as observed annual salary. |
| Is base salary contracted or 1.0-FTE? | `lib/compensation-convention.ts:7–11` maps base_salary to an explicit `annual_contracted_base` demo convention (`22408b3`). `lib/simulation/compa-calibration-v2.mjs:17–22,62–68` defines its separate inactive generator's annual contracted base as range midpoint × ratio × FTE (`8f25435`). | Those conventions define those demos, not total snapshot labor cost. They do not establish bonus/benefit/tax/equity inclusion or justify applying/dividing snapshot FTE again. |
| Can another generator supply missing lineage? | `docs/synthetic-workforce-generator-v1.md:3–6` expressly says the separate synthetic experiment does not reconstruct or certify the existing database. | No transfer of semantics or vintages between datasets. |
| What did earlier qualification find? | `docs/swp-history-qualification.md:15,21–31` records the common bulk-load timestamp, empty labor_costs table, cost/FX checks and unresolved components. The sampled local-to-USD discrepancy was at most $0.13, around 0.00001% in aggregate. | Empty monthly-schema tables are not actual payroll history. Small rounding discrepancies neither establish FX rules nor prove a material FX defect. Created-at is not historical availability/completion. |

## Conservative data contract

For the existing source, retain:

- **Identity:** `employee_snapshots.total_labor_cost_usd` → `finance_current_summary.labor_cost_usd`; fixed captured snapshot 2026-09-30; user-declared synthetic provenance. Company totals must avoid duplicate/overlapping BU rows and preserve incomplete totals as null (`lib/compensation.ts:55–66`). This aggregate guard does not authenticate employee-level completeness.
- **Meaning:** reported stock-date amount in USD. `period=null`; contracted-person versus 1.0-FTE basis unverified; recurring versus one-time and cash versus accrual unverified; component inclusion unknown. `cost_per_fte_usd` is a ratio in those same unknown-period units, not monthly pay or an hourly rate.
- **FX:** reported USD values, with no new conversion. Original local-currency conversion rule, effective-rate selection, component rounding and revisions are unverified.
- **Availability:** no verified source-complete-through, correction policy or as-known-at-origin vintages. Reconciled headcount history does not qualify payroll exposure or labor cost.
- **Permitted output:** the already-labelled reported aggregate context. **Blocked:** implicit division by 12, salary/hourly-rate inference, benefit/tax markups, six-month sums presented as spending, historical cost models, operational forecasts, subgroup cost projections or cost-based recommendations.

The existing `lib/swp-history-qualification.ts:39–50` correctly blocks cost-model eligibility without monthly basis, currency, FTE/component/FX evidence and separately retains completion/vintage limitations. Do not mark a user assumption as verified observed evidence to pass that gate.

## Smallest implementable next slice

First implement a **local, pure assumed monthly run-rate calculator and tests**, with no UI activation or automatic source substitution. Keep the released demo's cost-unavailable label until the proposed contract is independently reviewed.

Input is a separately typed, explicitly user-entered **USD per contracted employee per month** assumption, plus its included/excluded components and recurring cash/accrual interpretation. Blank remains unknown; no suggested rate is inferred from the database. Use the same stated rate for both reviewed headcount paths. Each month-end output is `headcount × assumed monthly rate`, with scenario-minus-baseline difference, labelled **assumed monthly run-rate at that headcount**. This homogeneous-rate assumption is not a cost forecast or a claim about workforce composition, wages, available funding or savings. FTE is not multiplied again because the declared unit is per contracted person.

Do **not** sum those six stock-date run-rates into six-month spending. Actual expenditure additionally needs within-month payroll exposure/proration, hire/departure timing, component timing and one-time charges. Exclude inflation, currency conversion, recruiting/severance fees, subgroup controls and recommendations from this smallest slice. If the intended product must show database-derived cost or six-month spend instead, the next slice is only definition intake/reconciliation until the evidence below arrives.

## Precise missing evidence for source-derived costs

1. Original generator/import version or source-owner field specification for base salary, total compensation and total labor cost: monthly paid/accrued flow versus annualized/current run-rate, with exact period and stock/flow meaning.
2. Contracted-person versus 1.0-FTE amounts; treatment of part-time, leave and partial-month employment; an example showing whether and where FTE scaling happens.
3. Included/excluded base, bonus, benefits, employer taxes and equity; recurring/one-time and cash/accrual treatment; reconciliation of components to total cost. A residual is not a defined component.
4. Local and USD currency rules: rate-date/source/vintage selection, rounding order and component conversions, including one worked reconciliation.
5. Complete-through/revision evidence and a versioned aggregate export tied to that definition. For period spending, identify covered people/exposure and reconcile monthly totals; for historical forecasting, retain origin-available revisions. Source-qualified cost alone does not validate a model.

## Required tests

- Assumption contract: exact currency/unit/basis, explicit component labels, missing versus zero, negative/nonfinite/overflow inputs, reject annual/per-FTE/unknown basis without an explicit separate conversion contract; no source defaults.
- Arithmetic: both paths share opening/as-of/horizon and the same rate; correct six endpoint run-rates/differences, zero headcount/rate, no extra FTE factor, no sum called spending, no inferred fees/FX/inflation.
- Provenance: changing/clearing the rate invalidates results; observed amounts remain distinct from user assumptions; dates/units/basis visible; no operational/effectiveness claims.
- Future source qualification: incomplete/duplicate populations, component reconciliation, known FX rounding, coverage and revisions, period boundaries, annualized-versus-monthly rejection, missing vintage limitations and leakage tests before any fitted cost model.
- Before any UI release: preserve the existing in-shell filter/draft round trips and desktop/mobile readability; assert no AI requests and keep unsupported costs/subgroups unavailable until the applicable contract is approved.

This step changes documentation only. Existing local compensation and qualification tests can confirm present null/coverage gates; they cannot establish missing source semantics.

Validation run: `node --test tests/compensation.test.mjs tests/swp-history-qualification.test.mjs` produced 13 passes and two failures. Both failures are existing Compensation GET harness cases whose mocked module loader rejects `@/lib/dataset-runtime` (`tests/compensation.test.mjs:67`); they do not reach source/response assertions. The five pure compensation contract cases and all eight qualification cases passed. This documentation step leaves that pre-existing harness gap unchanged; no new runtime regression is inferred from it. Diff whitespace checks pass. No build is needed for the documentation-only change.
