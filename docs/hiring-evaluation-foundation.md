# Offline hiring-time evaluation foundation

`lib/ml/hiring-evaluation.ts` implements the temporal evaluation portion of the [held experiment specification](workforce-overnight-review.md#implementable-ml-experiment-contract-held-no-model-trained). It is an isolated Node module: no product route, planner, database adapter, service, UI, or model imports it. The current input contract accepts **explicitly synthetic method validation only**. No model is trained and no real accuracy or operational hiring claim is produced.

## Contract and entry points

- `freezeHiringProtocol(manifest)` validates provenance/scope and freezes the three development windows, final holdout, observation boundaries, minimum samples, and coverage thresholds. It accepts no targets, so labels cannot move the cutoffs.
- `evaluateHiringBaselines(manifest, observations)` freezes that protocol before examining rows, audits normalized records, creates local split membership, and evaluates rolling and expanding training-only medians. It neither reads nor writes files or makes network requests.
- `scoreAlignedPredictions(actual, predicted)` is the reusable metric boundary for a future separately reviewed candidate. It requires identical, unique IDs and finite nonnegative day predictions, rejects missing/extra predictions, and returns aggregate errors only. No candidate generation or fitting exists here.

The manifest requires `source`, `sourceDefinitionVersion`, `provenance: "synthetic"`, `purpose: "method-validation-only"`, `jobProfileCode`, `asOf`, `openingCoverageStart`, `cohortCoverage`, `openingScopeVerified`, and `statusHistoryVerified`. `openingCoverageStart` is the first day of a complete covered month. Cohort coverage must explicitly distinguish all openings from completed fills only. Boolean provenance declarations are upstream attestations, not evidence that this module can independently verify source truth.

Each normalized row contains only `requisitionId`, `jobProfileCode`, `externalInternal`, `status`, `openedDate`, `closedDate`, `startDate`, `timeToFillDays`, and `labelFirstObservedAt`. IDs and dates can be null for auditing missingness. Dates are strict `YYYY-MM-DD`; label observation times are canonical UTC timestamps including milliseconds, e.g. `2025-07-01T00:00:00.000Z`. Acceptance duration is numeric or null, never implicitly coerced. Unexpected fields are rejected, including candidate-pool aggregates, employee attributes, and arbitrary feature objects. Status, closure, acceptance duration, and start are eligibility/label checks only; none is a predictor.

## Temporal and leakage rules

For extract day T, C is the first of the month six calendar months before T's month. Holdout openings are `[C, C+3 months)`. Development cutoffs are C−9, C−6, and C−3 months, each scoring the next three opening months and observing through c+6 months. Final holdout observation ends at T.

Opening windows are half-open. A training label must have an opening strictly before its cutoff, actual start and closure by the cutoff, and a first-observed timestamp no later than that cutoff. Development cutoffs/observation boundaries use **00:00:00 UTC inclusive**; extract T includes the full UTC day. These conventions are explicit in the frozen protocol and tested at millisecond/date boundaries. A late-arriving label cannot enter a historical training pool merely because its actual start date was earlier.

The rolling baseline uses closures in `[c−12 months, c)` from that same eligible training pool. The expanding baseline uses the whole eligible pool. Empty rolling windows produce an unavailable baseline, never an expanding-history substitution. Both score the same ID set. Later folds may legitimately train on earlier validation cohorts once their labels are observable; a row cannot be both training and scored within a fold.

Missing or future starts, cancelled/open requisitions, invalid chronology, missing acceptance evidence, and unavailable label timestamps never become zero or imputed targets. Start cannot precede opening/accepted offer, closure cannot precede acceptance, and label observation cannot precede actual start. All duplicate ID groups are conservatively excluded, including identical duplicates; no arbitrary representative is chosen. Missing IDs, ambiguous duplicates, and unusable opening dates invalidate cohort-integrity gates rather than silently shrinking a claimed denominator.

## Outputs and gates

The immutable return separates:

- `report`: frozen protocol, deterministic SHA-256 input fingerprint, coverage and exclusion counts, per-fold dispositions, training/scored counts, observed fraction, both baseline medians and metrics, and explicit failed gates. Raw requisition IDs are absent.
- `localAudit`: excluded IDs/reasons, training IDs, rolling training IDs, scored IDs, historically unavailable training IDs, and unscored IDs/reasons. Keep this audit within the authorized local execution boundary; it is not a prediction output or an API payload.

Audit reason counts can overlap and must not be summed as mutually exclusive row totals. Fold cohort/scored/unscored counts do partition each usable in-scope opening cohort. If malformed openings or duplicate IDs prevent trustworthy denominators, the observed fraction is null and the gate fails.

The specification's thresholds are enforced: 24 complete covered opening months, at least 60 training labels per fold, at least 20 development/30 holdout scored labels, at least 90% observation, known cohort/status history, verified opening scope, and a nonempty rolling baseline. Missing first-observed history is never filled from the actual start date or an assumed lag. Completed-fill-only extracts cannot establish the observation denominator. Metrics can still describe the eligible synthetic subset while gates fail; this does not authorize modeling.

`baselineEvaluationGatesPassed` summarizes those baseline/data gates. The additional `openingCalendarCoverageEligible` flag requires at least 24 complete months of eligible training-opening span in every fold and variation in calendar month. `candidateReviewGatesPassed` requires both. These are prerequisites for review, not training approval: no feature provenance or representativeness is established by counts alone. `modelTrained` and `deploymentValidated` are always false.

Metrics are MAE, median absolute error, p90 absolute error, and mean signed error (`prediction − actual`), all in calendar days. Quantiles interpolate at `(n−1)*p`, without rounding before comparisons. Zero-day targets are supported; MAPE is not used. Historical p90 error is not a forecast confidence interval.

## Reproduction and remaining work

Run `node --test tests/hiring-evaluation.test.mjs`. The fixture generator in `tests/fixtures/hiring-evaluation.mjs` creates invented calendar records solely to exercise the rules. Tests cover frozen boundaries, historical label availability, censoring, duplicate groups, date/acceptance chronology, exact sample/rate thresholds, metric alignment, holdout isolation, nonfinite inputs, deterministic fingerprints, and ID separation.

No authorized historical row dataset, verified label first-observed history, or opening-time feature provenance has become available. Before any non-fixture experiment: independently verify the extraction scope and coverage manifest, preserve the source-definition version/content hash and evaluator Git SHA, review the local exclusion/membership audit, and obtain the already specified data authorization. Retain the aggregate report with that exact code revision. The fingerprint identifies normalized input content; it is not proof of provenance.

Ridge fitting, training-only preprocessing, development-only penalty selection, candidate-versus-both-baselines acceptance rules, untouched-holdout release controls, retrospective-lag assumptions, and deployment remain unimplemented and gated. This foundation does not change source adapters, schemas, roadmap promises, eNPS exclusions, live authentication, or workforce decisions.

Validation for this foundation: 24 focused synthetic tests and 316 full-suite tests pass; standalone TypeScript and the genuine production build pass. Focused lint has no findings. Full-repository lint exits successfully with one inherited `import/no-anonymous-default-export` warning in `tests/fixtures/typescript-browser-loader.mjs`; that unrelated fixture is unchanged. No browser/product flow was modified by this foundation.
