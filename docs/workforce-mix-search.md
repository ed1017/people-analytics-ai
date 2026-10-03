# Bounded deterministic workforce mix search

`lib/workforce-mix-search.ts` is an offline foundation for comparing Build/Move/Buy combinations with the existing single-role incremental calculator. The Node facade is not imported by the UI or live agent. The browser-local worker uses the same pure search core with Web Crypto; see [implemented local search](workforce-browser-local-search.md). It performs no model request, data acquisition, storage write, approval, or real-world action.

## Source and explicit search contract

`searchWorkforceMixes(solution, evidenceResultId, spec)` requires a readable saved solution, no pending calculation, and a current saved `single-role-workforce-review` result. Saved inputs must match that result's version; business-unit/role and recruiting scope must match. Historical timing is taken only from that selected saved result.

The search specification has exactly these fields:

```ts
{
  build: { min: 0, max: 3 },
  move: { min: 0, max: 3 },
  buy: { min: 0, max: 3 },
  maxEvaluations: 100,
  maxResults: 64,
  resultFilter: "all", // or "entered-constraints-met"
  assumptionPolicy: "preserve-reviewed-path-totals-and-timing"
}
```

Bounds are integers within the saved additional role demand. Every enumerated mix sums exactly to that demand; replacement hiring and multi-role/BU allocation are outside this calculator's contract. Bounds are never widened automatically. The full domain size is computed before any calculator call. `maxEvaluations` includes one reference recalculation plus all generated mixes, with a hard maximum of 1,000 calls. A domain over budget is rejected; partial enumeration is never represented as complete. `maxResults` caps returned alternatives at 64, plus the separately reported saved reference.

Only Build, Move and Buy counts change. All other strings in the saved input remain unchanged: scope, demand, horizon, constraints, backfills, dates, unit rates, total internal annual uplift, training cash and training hours. The required assumption policy explicitly acknowledges this fixed-total comparison. Totals are not silently scaled into per-person quotes. Inactive-path zeroing is solely the existing calculator's behavior. A newly active path with unknown cost/timing stays unknown or is reported invalid by the calculator; no supporting assumption is invented.

In particular, a saved backfill count larger than a candidate's internal cohort makes that mix invalid. Search does not reduce backfills to manufacture a passing option. Invalid mixes include an explanation and no calculated plan, and cannot enter the constraint-match set.

## Comparisons and limits

Every valid candidate includes the full result from `calculateWorkforceIncrement` and a projection of incremental cash, employee-time value (separate from cash), added employees, and the first modeled month with full conditional role coverage. The saved reference is recalculated with that same engine; original snapshots are never rewritten.

Status is `met`, `not-met`, `unknown`, or `invalid`. `met` means only that the engine's three entered limits pass. A known failed limit remains failed even when another limit is unknown. Missing limits or values cannot silently become zero. Aggregate counts include all enumerated cases, even those filtered or capped from the returned list.

Candidates that meet entered limits and have all four trade-off dimensions known are compared by ordinary Pareto dominance: no greater cash, time value or headcount and no later coverage, with at least one strict improvement. Equal alternatives are retained as nondominated. Unknown dimensions are incomparable rather than treated as favorable. This comparison runs over the complete bounded domain **before** truncation. It introduces no weighted score or universal best: `preferredOptionId` is always null.

Results are emitted in ascending Build, then Move, then Buy order, explicitly not quality order. Filtering, omitted counts and truncation are reported. A capped list may omit nondominated alternatives. Claims of “nondominated” apply only to the modeled dimensions and explicit bounds, never all possible plans.

## Capacity gap — intentionally not filled

The existing engine cannot prove available internal capacity, source-team impact, course effectiveness, overlapping candidate pools, simultaneous hiring capacity, or real arrival dates. Current aggregate readiness/candidate counts are not approved assignable capacity. This foundation therefore stops at conditional scenario arithmetic: bounds are explicit assumptions, and `operationalFeasibilityVerified` is always false. It does not label its output an executable or capacity-feasible staffing plan.

Operational capacity filtering needs a separate reviewed contract with scope, as-of dates, path-specific capacity/overlap rules and explicit approvals. Cost/timing changes beyond fixed saved totals similarly require explicit reviewed alternative inputs, not inferred scaling. Neither gap blocks these conditional comparisons, but both block operational recommendations.

## Identity, persistence and validation

Results bind to goal/solution/version/result identity plus SHA-256 fingerprints of saved input, timing, complete selected result record, referenced evidence snapshots and dependency text. Private owner/approval text is not copied into outputs. Fingerprints establish content identity, not authenticity of unsigned browser storage. `workforceMixSearchIsCurrent` checks source currency only. Re-run the deterministic search to validate serialized comparison values; a matching binding alone does not validate a tampered result.

The method does not save/apply anything. The internal local selection adapter now revalidates chosen results and stages unchanged-source proposals for a separate explicit review action. See [selection contract and release split](workforce-selection-release.md). Public UI entry remains gated.

Tests in `tests/workforce-mix-search.test.mjs` cover exact calculator agreement, integer bounds, domain/result limits, reproducibility, saved-source changes, failed/unknown constraints, missing path assumptions, unchanged backfills/path totals, Pareto ties/trade-offs, and unchanged notes/approvals. The largest tested domain has 990 mixes plus one reference calculation; results remain capped at 64.
