# Retain what-if v1 — local calculator checkpoint

Isolated from PR104, based on production `4023563005261af2c4aa74208bf022945960f2e5`. No UI, endpoint, database, model-envelope or added-capacity changes. No network or live AI calls. This checkpoint is local-only pending review.

`lib/retention-what-if.ts` calculates one user-assumed program viewed as no intervention, program with no effect, and an assumed relative-reduction range. These are not ranked interventions or predicted effects. All initial fields are blank. Historical turnover rates, survey associations and headcount are not calculator inputs.

Scope is a user-described aggregate population and a 1–24 month horizon. Baseline expected voluntary exits are user-entered. The effect lag is a whole-month assumption; direct active-period expected exits or explicitly chosen uniform allocation are required for a partial-horizon effect. Zero lag uses the full baseline; lag at/beyond the horizon produces zero active-period exits. Expected counts may be fractional. Missing effect/baseline assumptions preserve unknown outcomes.

Program cost is setup plus participant count × one-time per-participant cost plus monthly program cost × explicitly funded months. Funding duration is separate from effect lag. Costs persist in the no-effect case; blank and zero are distinct. Savings/ROI, causal effects, person-level outcomes and worsening-effect scenarios are not modeled.

`lib/retention-what-if-record.ts` defines a separate `retentionWhatIfV1` browser field, capped at ten reviews/64 KiB. Explicit retention verifies the current goal and draft. Reading recomputes results and rejects mismatched metadata, unsupported fields, duplicate review identities and altered math without repairing the original record. No global storage schema is changed.

Validation at checkpoint: 19 tests in `tests/retention-what-if.test.mjs`, whole-repository `npx tsc --noEmit`, and focused ESLint pass. Tests cover arithmetic, fractional counts, lag, uniform opt-in, unknown versus zero, cost independence, stale saves, history limits, corruption, and round-trip isolation from existing capacity/other-goal data.

Next proposed UI should remain a small explicit local review: scope/baseline; effect/timing; optional cost disclosure; concise results with math details; explicit save. Browser UI, stale-transition and responsive tests remain pending because no UI has been added.
