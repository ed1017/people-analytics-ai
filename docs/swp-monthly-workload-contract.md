# Monthly supply versus workload contract v1

Local pure calculation only: `lib/swp-monthly-workload.ts`, exported `calculateMonthlyWorkload(unknown)`. Version: `monthly-supply-workload/v1`. No UI integration, source/API reads, persistence, model calls or changes to existing engines. Base is released PR225 merge `00bd4af004c4f3a4ea77643e408d7f82924a9c16`.

## Scope and provenance

Each scenario names one homogeneous workload scope and one work-unit definition. Opening stock and every monthly row must bind to the same scope ID. A company scope is allowed only when a meaningful homogeneous company workload is explicitly supplied. Company stock must not silently become capacity for a narrower role slice.

Every number carries its literal unit and a nonempty provenance note. Known values require `user-assumption`; missing values require `value:null` and `unknown`. This deliberately manual first contract accepts neither source-verified claims nor automatic model proposals. Input provenance survives in a cloned assumptions snapshot. A future data adapter must establish its own scoped, dated source contract rather than relabel these inputs as facts.

Shape/version/metadata errors throw. Missing numerical values yield `needs-inputs`, their paths, and null dependent outputs. Independent results remain available: known demand can be calculated with unknown supply; known contracted FTE can be retained when headcount is unknown. Zero is accepted where dimensionally meaningful. Productive hours must be positive because they are a divisor.

## Calendar and accounting

An exact month-end opening date precedes 1–24 explicit, ordered, contiguous monthly rows. Supported years are 2000–2100. No invented January horizon, interpolation or carry across missing months.

All four movement paths have whole people counts and exactly one FTE mode: explicit contracted FTE or an assumed FTE/person ratio. Exits include all separations, including retirement. Exits and outward transfers are disjoint departures from opening stock; same-month hires cannot hide an impossible departure total. Remaining opening stock must be feasible before inflows are added. Inflows are then present for the whole month. This start-of-month convention does not model ramp, mid-month joins or leave dates.

Company-level internal transfers must be explicit zero on both sides; internal redeployment does not add company supply. At workload-group boundaries, transfer-in/out counts are distinct scoped movements. Aggregate inputs assert disjointness but cannot prove individual identity or reconcile unprovided counterpart scopes. No skills fit, redeployment readiness or available-person claim follows.

Headcount is bounded to 1,000,000; contracted FTE is between zero and headcount when both are known. This contract assumes at most 1 contracted FTE/person and excludes overtime from contracted FTE. FTE arithmetic uses integer millionths, including per-person conversion, so subtracting 0.1 FTE three times from 0.3 yields exactly zero. Display rounding is left to a future caller.

## Equations and units

For each month, after start-of-month movements:

- `HC = opening HC + hires - exits + transfers in - transfers out` (people).
- `F = opening FTE + hire FTE - exit FTE + transfer-in FTE - transfer-out FTE` (contracted FTE).
- `allocated FTE = F * allocation` (share 0–1).
- `workload hours = volume * hours per work unit` (hours/month).
- `effective hours per FTE = productive hours per FTE * (1 + productivity uplift)` (hours/FTE/month).
- `required FTE = workload hours / effective hours per FTE`.
- `capacity hours = allocated FTE * effective hours per FTE` (hours/month).
- `gap FTE = required FTE - allocated FTE`; `gap hours = workload hours - capacity hours`. Positive means shortfall; negative means surplus.

Productive hours are net of non-work time but before scope allocation. Allocation describes the share assigned to this workload; do not repeat leave/admin deductions in both fields. Volume/effort must be before productivity. Uplift is applied exactly once as throughput, not again as lower workload, extra FTE, or reduced hiring. The fixed accounting literals make these assertions explicit and reject unsupported alternate conventions. Their real-world truth cannot be established by aggregate arithmetic.

No automatic annual/monthly conversion is accepted. Units are literal `people`, `FTE`, `FTE/person`, `work-units/month`, `hours/work-unit`, `hours/FTE/month`, and `fraction`. Wrong units, extra keys, overlapping FTE modes, attrition-rate fields, separate retirement adjustments and productivity-hiring reductions are rejected.

## Support limits and deferred extensions

Inputs have at most six decimal places; people are whole integers. Volume and hours/work-unit are each at most 1,000,000. Productive hours cannot exceed calendar hours in the specific month. Allocation and FTE/person are 0–1. Throughput uplift is 0–1 (0–100%); this is a support bound, not evidence of achievable improvement. Derived magnitudes above 1e12 throw; no infinities or clamping.

Deferred: rates/forecasts, growth curves, automatic conversion of annual assumptions, historical fitting, changing contracted hours, mid-month timing/ramp, multi-scope transfer reconciliation, scope aggregation, staffing recommendations, costs/savings, confidence, skills-match scores, AI exposure and action-plan effects. The existing Scenario engine's hiring-demand productivity lever must not be stacked on this model.

## Verification

15 focused contract tests cover units, monthly dimensions, fractional FTE conservation, signed shortfall/surplus, per-person versus explicit movement FTE, zero/unknown separation, partial outputs, fixed-precision stock arithmetic, non-January/leap windows, scope/date mismatch, bounds, infeasible stock/outflows, company transfer double counting, retirement/rate duplicates, productivity applied once, provenance and input immutability. Existing headcount and workload-period/provenance tests are also run for compatibility. No browser checks or deployment are required for this unconnected pure module.

### Partial-stock review amendment

Before headcount becomes unknown through an unknown departure count, validation checks the maximum remaining people (opening people minus known departure counts) against known remaining contracted FTE. Unknown additional departures cannot increase that maximum. This rejects the reviewed 10 people/8 FTE minus 4 people/1 FTE, plus unknown people/0 FTE departure: at most 6 people cannot carry 7 FTE. Inflows cannot repair this opening-stock contradiction. The bound is used only for validation, never substituted for unknown headcount. This is a local necessary feasibility check, not a general constraint solver or proof that unknown inputs are feasible. Two additional focused tests cover either outflow path, masking inflows, the feasible boundary and unresolved FTE.

Sparse month arrays are rejected by an own-index check before mapping; missing rows cannot silently skip validation. A focused boundary test covers a fully sparse array, an interior hole, and an explicit undefined row. The amended focused suite contains 18 tests.
