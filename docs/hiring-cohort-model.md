# Fitted aggregate hiring model: constructed benchmark

Local successor to preserved checkpoint `6d12bdd61f50eaa556a3993d27d7b051d5bd521c`.
This adds actual model fitting and chronological evaluation, with no UI, service,
database, production, source-access or persisted-plan changes. It does not alter
the existing source reports or readiness results.

## Why hiring

The turnover implementation already fits simple exponential smoothing, selecting
alpha from 0.2/0.5/0.8 using training-only one-step SSE, and compares it against
recent-three-month mean and seasonal-naive baselines. Repeating that exercise
would add little. Existing hiring code audits opening-cohort follow-up and
completed-case durations but lacks a fitted aggregate model for an all-opening
endpoint. Satisfaction has only three comparable observed engagement waves;
inventing monthly labels would not add defensible evidence.

The new target is the fraction of an opening cohort that reaches **actual start
within 90 days**. Cancelled and still-unresolved openings remain in its denominator.
An unresolved opening with complete day-90 follow-up is a known failure for that
fixed endpoint, not a permanent non-hire. Missing follow-up is not a failure.
This is neither time-to-fill regression nor a survival/time-to-start distribution.

The fitted model is binomial logistic regression with an intercept and calendar
trend, using only opening calendar information and aggregate successes/denominators.
Two parameters suit the modest 34–46 training cohorts better than a high-capacity
model. Fixed ridge penalties are 1 for slope and 0.000001 for intercept; the latter
keeps all-success/all-failure cases finite. Calendar time is measured in years and
centered using training-only opening weights. Damped Newton optimization must
converge; no hyperparameter search or assessment-based tuning occurs.

Baselines are the pooled training fraction and pooled last-three-mature-cohort
fraction, each with a fixed Beta(1,1) pseudocount to avoid infinite log loss. This
smoothing is an estimation rule, not a claim of a calibrated Bayesian interval.
The trend model fits the penalized likelihood directly. All three methods are
reported; none is automatically promoted.

## Reproducible fixture and chronological protocol

`tests/fixtures/hiring-cohort-generator.mjs` creates 51 monthly aggregate cohorts,
January 2021–March 2025, with 60–100 openings per cohort. All openings in a cohort
occur on the first day of the month. Starts occur at day 60; complete fixed-horizon
aggregate labels are released together at day 92. Other openings are partitioned
into cancelled and unresolved buckets. Bernoulli simulation is immediately
aggregated; no employee/requisition IDs, case-level scores, or new input features
are introduced. This artificial timing simplifies endpoint mechanics.
The model adapter rejects staggered within-month openings and visible cohorts
with missing declared buckets. It cannot detect buckets absent from the supplied
fixture universe; arbitrary real reporting delays require a separately verified
cohort-completion contract.

Seeds 17, 29 and 43 are fixed and all are reported. A versioned LCG produces draws.
Scenarios are stationary, gradual improvement, and improvement followed by a
January 2025 reversal. Their generating probabilities are deliberately planted.
They are not recovered company formulas or reconstructed missing records.

| Forecast origin | Latest available training cohort | Training cohorts | Scored opening cohorts | Scoring cutoff |
|---|---|---:|---|---|
| 2024-01-01 | 2023-10 | 34 | Jan–Mar 2024 | 2024-07-01 |
| 2024-04-01 | 2023-12 | 36 | Apr–Jun 2024 | 2024-10-01 |
| 2024-07-01 | 2024-03 | 39 | Jul–Sep 2024 | 2025-01-01 |
| 2025-01-01 assessment | 2024-10 | 46 | Jan–Mar 2025 | 2025-07-01 |

Every training window starts January 2021. Availability uses exact UTC days, so
92-day release dates produce differing calendar gaps. `evaluateHiringDomain` and
the existing strict revision/as-of validator select available rows and require
complete constructed follow-up. Immature cohorts are excluded. Model fitting and
prediction happen before the scoring snapshot is retrieved. The nine development
target months do not overlap; assessment has three later months. Overlapping
training histories are not independent validation experiments.

## Results and interpretation

Full coefficients, predictions, actual aggregate outcomes, per-fold metrics,
fixed protocol and source-file hashes are in
`docs/evidence/hiring-cohort-benchmark-v1.json`. The table averages each metric
across the three fixed seeds; cohort denominators are identical between seeds.
Lower Brier and log loss are better. MAE is opening-weighted error in cohort start
fractions, expressed in percentage points. The artifact also reports signed bias.
Brier/log loss use the exact Bernoulli sums from aggregate counts, retaining the
within-cohort outcome variation; they are not squared error of cohort means.

| Scenario / method | Development Brier | Assessment Brier | Assessment MAE (pp) | Assessment log loss |
|---|---:|---:|---:|---:|
| Improvement / pooled | 0.2823 | 0.2793 | 20.04 | 0.7527 |
| Improvement / recent 3 | 0.2529 | 0.2399 | 4.26 | 0.6728 |
| Improvement / logistic trend | 0.2484 | 0.2390 | 3.88 | 0.6709 |
| Stationary / pooled | 0.2459 | 0.2422 | 3.91 | 0.6774 |
| Stationary / recent 3 | 0.2474 | 0.2422 | 3.90 | 0.6775 |
| Stationary / logistic trend | 0.2465 | 0.2425 | 3.81 | 0.6782 |
| Reversal / pooled | 0.2823 | 0.2135 | 14.06 | 0.6193 |
| Reversal / recent 3 | 0.2529 | 0.2949 | 31.82 | 0.7839 |
| Reversal / logistic trend | 0.2484 | 0.3169 | 35.11 | 0.8297 |

The fitted trend marginally improves on recent cohorts under planted gradual
improvement, offers no clear advantage under stationarity, and fails badly under
an unforeseen reversal. Development and assessment predictions are identical
between the improvement and reversal scenarios until reversal outcomes arrive.
This is a useful stress test of extrapolation, not a claim of real-world efficacy.

No interval is reported. Three seeds of one inspectable generator and three
assessment months do not establish operational coverage or robustness to cohort
dependence, overdispersion, observation delays, selection or regime change. Fitted
fractions are uncalibrated group-level estimates, not validated probabilities of
achieving an Action Plan target. Counts of future openings are not forecast.
No causal or intervention-effect estimate is produced.

## Scope and remaining evidence

The recovered source hiring seed selected external fills from active synthetic
survivors, so it cannot support this all-opening endpoint without a complete
opening universe and follow-up. Actual or faithfully reproduced source evaluation
still requires the complete generator/run manifest or scoped opening/status
history, actual-start definitions, observation/revision vintages, cancellations,
unresolved cases and complete fixed-horizon follow-up. This benchmark does not
relax any source qualification gate or make missing source access unnecessary.

The runner is the offline entry point. The model's aggregate-array fitting helper
is internal numerical machinery; supplying rows to it does not certify evidence.
The fixture integration demonstrates a full path through existing source-contract
selection, fitting, prediction and scoring. Future source use requires separate
review; current integration rejects company-extract input.

Run `node --test tests/hiring-cohort-model.test.mjs` and
`node tests/manual/benchmark-hiring-cohorts.mjs --check`. Regeneration is explicit
with `--write`. Existing turnover, consumer and Action Plan artifacts remain
unchanged. Leakage tests alter future labels and verify unchanged historical fits;
other checks cover exact maturity/release boundaries, missing coverage, constant
and degenerate cohorts, analytic scoring, and chronological alignment.

Final verification: nine focused model tests and 1,094 total repository tests
passed; TypeScript, focused ESLint, deterministic new benchmark regeneration/check,
the unchanged forecast artifact checks, and whitespace checks passed. Independent
read-only review checked the likelihood math, aggregate scoring and time boundaries.
