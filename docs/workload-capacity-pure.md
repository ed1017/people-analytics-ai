# Pure workload capacity calculation contract

Source-only successor to `d937b5f3f1f81e6b35bd52508bf23db405a998a4` for review
by integration owner `01a1139b-d5e4-704a-902c-610e54b1e023`. No UI is wired.
The only runtime module changed is `lib/workload-capacity.ts`; existing application,
natural-language, editor, provider and diagnostic implementations are unchanged.

## Inputs and interpretation

`calculateWorkloadCapacity` consumes aggregate reviewed assumptions and existing
`BundleDraft` options. It accepts the stable profile code `OPS-CLIENT`; the
Technical Support Specialist label is presentation metadata, never a selector.
Exact goal ID/text, dataset token, revision, horizon and all assumption content
are bound into a deterministic source key. Required `currentBinding` pairs the
expected current ActionBinding with its dataset token. Callers supply that pair
from current reviewed context; they must not construct it by relabelling an old
draft. Every option must match it and share exact aggregate scope assumptions,
including business unit, population, role, horizon, demand and requirements. `readWorkloadCapacityReport` recomputes
the entire result against current inputs, rejecting stale or altered reports.
This is a pure in-memory contract, not a new saved record or operational approval.

Every numeric input has a value, provenance kind and assumption basis. Unknown
values stay null. Explicit zero is valid for costs, workload, coaching and baseline;
productive hours and span must be positive when known. Counts are whole people.
Nonfinite, negative, oversized or structurally invalid quantities are rejected.
Manager hours cannot exceed the pool's calendar hours. Productive hours are
bounded at 744 per role/month and must be reviewed realistic net-work assumptions.

- Ticket hours = tickets × handling minutes / 60.
- Baseline capacity = baseline roles × productive hours × availability percent.
- Total mode compares ticket hours with baseline plus additional capacity.
  Incremental mode adds ticket hours to baseline demand: a nonzero baseline
  does not silently turn a 12-role increment into 12 total roles.
- Additional role need = ceiling of positive demand minus baseline, divided by
  productive hours. Known zero factors annihilate irrelevant unknown products;
  other required unknown values propagate.
- Productivity is 0% before the first month-start with all flow prerequisites
  ready, then 100%. Paid arrival and productive readiness remain distinct.
- Before Build readiness, scheduled whole-cohort training hours debit source
  capacity. After Build/Move readiness, the cohort's full source contribution is
  permanently removed. Backfills restore contribution only after their own
  paid arrival and prerequisites are ready. Source baseline is measured before
  this option's absence/redeployment and must include those cohorts once.
- One shared manager pool supplies explicitly uncommitted hours, net of existing
  duties. Required hours = assigned additional reports × incremental report hours
  plus active trainees × incremental coaching hours. Span separately compares
  ceiling((existing reports + assigned roles) / span limit) with manager count.
  Existing reports include target baseline once. A trainee is an assigned report
  once; coaching is additional effort. Count does not imply available hours.

Training declares either per-person rates or whole-program totals. Per-person
cash/hours multiply Build count once; the normalized existing draft always stores
whole-program totals. Cash and program-hour units accept at most two decimal
places; normalization multiplies integer hundredths once, avoiding floating-point
strings that fail existing engine validation. Cohort absence vectors must sum to the reviewed training
hours and cannot extend beyond readiness or precede manager assignment. Training
also lies within its mapped learning component and learning prerequisites
(start inclusive, finish exclusive); unknown required timing prevents `met`. Move
has zero training hours. Build/Move cohort IDs must be distinct from each other
and target baseline; source/target/manager pool identities must be distinct. Unknown disjointness
keeps capacity unknown. Duplicate or overlapping pools/cohorts are rejected.

## Reuse and outputs

The existing `readBundleDraft`, `reviewBundleProposal` and
`calculateWorkforceIncrement` supply draft validation, prerequisite readiness,
cash ownership, salary proration, fees, cohort salary changes and added employee
counts. Cash excludes employee-time valuation. Normalization clones the draft;
the original values/provenance are untouched. The reviewed cash budget is
authoritative when present, including an explicit zero or an unknown/cleared
amount; only an absent reviewed-budget object permits the existing staffing
budget fallback; an all-in or unknown budget basis is unsupported.
No manager/senior leadership hiring or cost is invented. Manager deficits report
both required/missing hours and required/missing people independently.

Each monthly row reports target, source, manager-hour and manager-span gaps.
It also supplies `cashTotal` and dated `cashLines` directly from the existing
reconciled ledger, exposed as `cashLedger` on the option. Additional linked
expenses are included. Unknown amount/timing keeps affected monthly cash null;
incomplete ownership/cost reviews keep every complete monthly total null.
Known line amounts are component amounts, not a complete cash budget. Training
cash retains the existing first-planning-month convention.
Option checks cover every month, complete cash budget, added employee ceiling,
known training totals/schedule, and prerequisite-gated additional-role coverage
by the existing staffing deadline. Failures take precedence over unknowns;
every required check must pass for `met`. Even `met` is classified
`conditional-scenario`, never actual execution, verified productivity or plan save.
Reconciliation issues are preserved for review; these capacity checks do not
approve unrelated components or replace the existing plan review.

## Synthetic verification and unsupported cases

`tests/fixtures/workload-capacity.mjs` is fictional aggregate data only. The
26 adapter tests cover the 12-role 8-hire/4-train versus 4-hire/8-train comparison,
increment versus total demand with baseline, whole-program versus per-person
units, source training/redeployment/backfill timing, Build plus Move cohorts,
manager span/coaching, feasible conditional scenarios, zero/negative/invalid and
unknown assumptions, overlap rejection, deadlines and exact replay.

Focused command (47 tests with existing offline regressions):

```sh
node --experimental-strip-types --test --test-isolation=none tests/workload-capacity.test.mjs tests/workforce-increment.test.mjs tests/home-mix-integration.test.mjs
```

Unsupported: part-month starts/readiness, graded productivity, historical arrival
inference, multiple source or manager pools, manager backfill/leadership models,
per-person heterogeneous productivity, capacity changes from other scenarios,
and operational causal or actual-progress claims. Dates fit a common 1–24 month
horizon; each staffing path is a single reviewed batch. Source backfill capacity
uses the reviewed source per-role hours. The shared manager pool models target
reports and trainees; separate source/backfill supervisory needs require review.

Never run for this slice: UI/browser wiring or acceptance, application startup,
full product build, provider/model/token-count diagnostics, the diagnostic API
harness, database/credential/billing access, deployment, merge or release.
The next step is one Extra High calculation-contract review by the integration
owner before authorizing UI work.

## Six review corrections

The six initial named regressions were added before adapter changes and all
failed on the predecessor. Exact reviewer reproductions additionally verify:

1. Reviewed unknown budget → unknown, zero → not-met, sufficient → met; only
   absence permits the older capacity-budget fallback.
2. Dataset-only changes, unexpected evidence/planning digests and second-option
   business-unit/population/requirements mismatches fail closed. Reports never
   rebind old drafts to a new current dataset.
3. February learning start rejects January training; February finish rejects
   February training even with March transfer. Valid windows pass; unknown
   required starts/finishes prevent met.
4. Three trainees at 600.1 cash normalize to 1800.30; 0.1 hours each normalize
   to 0.30 with a [0.15, 0.15, 0] schedule. Whole-program totals agree; excess
   unit precision is rejected and original inputs stay untouched.
5. Manager identities `source` and `target` are rejected; the existing distinct
   synthetic pool remains valid.
6. A linked February 500 cash expense produces [74400, 64500, 90000], total
   228900. Unknown cost review makes complete totals/check/status unknown.
   Unknown training cash affects the first month without inventing later costs;
   unknown hire arrival preserves unknown timing throughout the horizon.

Arithmetic and output replay now use `workload-capacity-month-start-v2`; old
v1 reports are not treated as current. No UI, frozen acceptance source or dataset
artifact changes are included.
