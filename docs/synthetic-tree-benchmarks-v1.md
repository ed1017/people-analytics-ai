# Offline random forest and gradient boosting benchmarks

**Further synthetic review is warranted for enriched gradient boosting in
turnover and enriched random forest in hiring. Reject replacement by the other
full-size tree arms, including both survey models.** No model is adopted in the
app. The decisions follow the frozen gate, not selection of a test-set champion.

This experiment compares established scikit-learn random forest and gradient
boosting regressors for voluntary-exit counts, the fraction of all openings
starting within 90 days, and quarterly survey favorable-answer scores. Added
predictors and outcomes are explicitly constructed synthetic aggregates. This
is not validation of real workforce efficacy or a production model release.

## Frozen design and new historical fields

The protocol was committed at `a387fec` and implementation at `574b738` before
new-seed generation. Training seeds are 12501–12530, tuning seeds 13501–13512,
and untouched test seeds 14501–14520. Matching scenarios share a seed's random
innovations, so 140 test histories represent **20 independent seed clusters**.
The fresh domain panels cover January 2018–September 2026, except short-history
cases which expose January 2023 onward. Earlier dates are generated assumptions,
not backfilled source observations.

| Domain | Added dated aggregate predictors | Target and denominator |
|---|---|---|
| Turnover | Overtime hours, pay-position index, manager span; released historical headcount | Monthly voluntary-exit count; historical starting headcount supports generation, not a future rate |
| Talent acquisition | Recruiter load, specialist-opening share, compensation-offer index; historical cohort sizes | Fraction of **all openings** starting within 90 days, including cancelled, no-show and unresolved openings |
| Survey trends | Workload index, manager-support index, response reach; historical respondent counts | Quarterly mean respondent favorable-answer share, expressed as score points |

Predictor states follow fixed autocorrelated processes independent of outcome
noise. The signal worlds use a deliberately nonlinear three-month-lagged
relationship to outcomes. These relationships were built into the simulator;
benchmark gains cannot establish that the named fields predict actual employees.
The no-signal world sets these indicator effects to zero while retaining marginal
predictor distributions, independent noise and calendar seasonality. The reversal
world flips relationships and changes the intercept in July 2026, without an
advance predictor flag. Stable, gradual drift, missingness, short history and
survey-instrument-break cases are also prespecified.

Predictors publish after their effective month, at seven days ordinarily and
45 days under reporting stress. Their values and age are selected only from
released records at the forecast cutoff. Missing predictor values remain null
until a training-only median imputer handles them, with explicit missing flags.
No future target predictor, exposure, opening count, respondent count, seed or
scenario identifier enters the model feature vectors.

These are separate domain benchmarks. Turnover's stock reconciles starts and
exits, but its starts are not linked to the hiring panel's outcomes, and survey
eligibility is a fixed simulated population. Do not use them as a jointly
reconciled workforce-planning scenario or claim cross-domain causal effects.

## Chronology, comparisons and eligibility

Initial training uses quarterly origins March 2021–September 2023, with labels
released by June 30, 2024. Tuning uses June and September 2024 origins from
independent companies, with labels released by June 30, 2025. The minimum tuning
MAE selects one of two fixed parameter settings for each domain/method/feature
arm. Ties use fixed grid order. A separate tuning artifact is committed before
opening the test set.

Final refitting uses training seeds only, with origins through December 2024 and
labels released by June 30, 2025. All imputers, models and parameters are frozen
before test histories are generated. Tests use June, September and December
2025, then March and June 2026 origins. Models remain frozen across those dates;
local lag inputs update only from releases available at each date. The shared
June 2025 model/first-test cutoff is an offline information boundary, not a claim
that a historical job was deployed then. Final scoring uses February 28, 2027
releases; October–December 2026 target periods remain unscored.

Tuning choices were frozen at `ef5c5bd9ac1c15ebc24cffc8d677fa324b72d607`.
The [tuning report](evidence/synthetic-tree-benchmarks-v1/tuning.json) SHA-256 is
`71d7ccc99d1b53e1fc15e9ab4d28383ecef1633e65ad868d4004949cfe297a80`.
Independent review verified all 42 source hashes against the implementation
commit, 6,930 training cases, 504 tuning cases and 13,239 dated labels/features,
including all parameter/comparator choices and hiring weights. No test seeds
were present in that artifact.

Both tree methods run on lag-only and enriched inputs. Ridge runs on the same
feature vectors and pooled training cases in each tier. Existing local baselines
retain recent/seasonal/OLS count forecasts, pooled/recent/logistic hiring
fractions, and last-wave/recent/OLS survey forecasts. The JS bridge reproduces
native predictions exactly in parity tests. Local baselines use the target
history alone; learned models additionally use the pool of training histories.
Therefore the matching-input Ridge comparison, rather than only the local trend,
is necessary to assess whether model complexity adds value.

Every method requires the same forecast and scoring support:

- Counts require 24 consecutive complete released months; the current OLS
  comparator still fits its last 12 months.
- Hiring requires 36 consecutive mature calendar cohorts, at least 24 with
  positive openings. Known zero cohorts retain their calendar position. A label
  requires 90 days plus the source's declared reporting lag, and all target
  months must be complete before a quarter enters training. Under reporting
  stress, some December 2024 training targets are still unavailable at June 2025.
- Surveys require eight consecutive complete comparable published waves.
  Missing/suppressed waves and changed instruments cannot become zero error.
- Baseline optimizer failure is a shared abstention. Missing predictors may be
  imputed; missing outcomes, immature labels and insufficient histories may not.

All learned hiring arms use identical historical target-opening sample weights.
Future opening counts are used only for final scoring, never as predictors.
An additional diagnostic refit uses just the first three training seeds with the
same tuning-selected parameters. This tests reduced training data separately
from the short-history scenario's support failures.

## Scoring and the adoption rule

Report tables use identical paired history/decision cases. MAE is in exits for
turnover, opening-weighted percentage points for hiring, and score points for
surveys. RMSE summaries are mean per-case RMSE, not pooled RMSE. Hiring also
reports exact aggregate-binomial Brier score and log loss.

Each feature tier's simple comparator is chosen on tuning data from current
baselines and matching-input Ridge. A full-size tree qualifies only for separate
review if it improves held-out aggregate MAE by at least 5%, does not worsen any
scored scenario/origin mean by over 10%, and preserves availability. Relative
comparisons use a denominator floor of `1e-8`. No test-selected champion is
promoted. Even passing this synthetic gate would not authorize adoption.

The 95% bootstrap ranges describe **paired mean-error differences**, resampling
whole test-seed clusters 1,000 times. They are not forecast prediction intervals
or independent-row significance tests. Repeated origins and matched scenarios
remain together within a resampled seed. Published forecast intervals remain
null, and operational qualification remains false.

## Held-out results

The evaluation contains 2,100 domain/decision cases across 140 matched scenario
histories. Current support guards leave 680 scored turnover cases, 639 hiring
cases and 680 survey cases; every method uses exactly those same cases. The
simple comparator below was chosen on tuning, before test results were known.

| Domain and unit | Frozen enriched comparator | Comparator MAE | RF enriched MAE | GB enriched MAE | Frozen decision |
|---|---|---:|---:|---:|---|
| Turnover, exits | ridge-enriched-full | 23.501 | 20.725 | 20.141 | GB: separate review; RF: reject |
| Hiring, percentage points | recent-3-fraction | 13.496 | 10.472 | 10.750 | RF: separate review; GB: reject |
| Survey, score points | ridge-enriched-full | 6.319 | 5.361 | 5.798 | Reject both |

Turnover GB improves aggregate MAE by **14.3%** versus matching-input Ridge;
hiring RF improves by **22.4%** versus the frozen recent-cohort comparator.
Hiring matching-input Ridge scores 13.273 points, also worse than RF’s 10.472.
The paired seed-cluster 95% error-difference ranges are −4.694 to −2.065 exits
for turnover GB and −4.563 to −1.609 points for hiring RF. These ranges describe
this synthetic sample and do not qualify forecast uncertainty.

Turnover RF improves the aggregate but exceeds 10% worsening in two gradual-drift
origins. Hiring GB fails four no-signal origins, including 57.1% worsening in
December 2025. Survey RF improves aggregate error by 15.2% but fails two drift
origins; survey GB improves by 8.2% but fails the June 2026 drift origin.

### Scenario results

The following tables average each scenario’s scored origins. Repeated or
identical values reflect intentionally matched constructions, not independent
replications. Detailed per-origin comparisons remain in the report.

**Turnover, exits**

| Scenario | Paired decisions | Frozen comparator | RF enriched | GB enriched |
|---|---:|---:|---:|---:|
| stable | 100 | 23.273 | 20.226 | 20.079 |
| gradual-drift | 100 | 23.954 | 23.678 | 21.728 |
| reversal | 100 | 29.789 | 28.159 | 27.526 |
| missingness | 80 | 23.324 | 21.194 | 20.897 |
| small-sample | 100 | 23.273 | 20.226 | 20.079 |
| no-signal | 100 | 17.585 | 11.457 | 10.751 |
| instrument-break | 100 | 23.273 | 20.226 | 20.079 |

**Hiring, percentage points**

| Scenario | Paired decisions | Frozen comparator | RF enriched | GB enriched |
|---|---:|---:|---:|---:|
| stable | 100 | 14.984 | 10.944 | 11.284 |
| gradual-drift | 100 | 12.803 | 11.646 | 10.893 |
| reversal | 100 | 18.147 | 14.226 | 14.500 |
| missingness | 100 | 15.649 | 11.537 | 11.655 |
| small-sample | 40 | 15.307 | 11.624 | 11.623 |
| no-signal | 99 | 3.585 | 2.997 | 4.472 |
| instrument-break | 100 | 14.984 | 10.944 | 11.284 |

**Survey, score points**

| Scenario | Paired decisions | Frozen comparator | RF enriched | GB enriched |
|---|---:|---:|---:|---:|
| stable | 100 | 6.102 | 5.295 | 5.533 |
| gradual-drift | 100 | 6.064 | 6.306 | 6.322 |
| reversal | 100 | 9.821 | 9.061 | 9.418 |
| missingness | 100 | 6.121 | 5.392 | 5.794 |
| small-sample | 100 | 6.102 | 5.295 | 5.533 |
| no-signal | 100 | 4.149 | 1.074 | 2.447 |
| instrument-break | 80 | 5.762 | 5.042 | 5.474 |

Only the final test origin crosses the fixed July reversal. At that origin,
turnover GB still worsens from **53.055 to 55.564 exits** versus Ridge; it passes
the frozen gate because the increase is below its 10% tolerance. Hiring RF’s
reversal MAE remains **29.264 points**, and survey RF’s remains **25.137 points**.
Passing is not evidence that an unannounced reversal has been anticipated.

### Additional predictors and training volume

| Domain | Lag-only simple comparator MAE | RF lag-only | GB lag-only |
|---|---:|---:|---:|
| turnover | 24.183 | 24.746 | 24.503 |
| hiring | 13.496 | 13.610 | 13.421 |
| satisfaction | 7.503 | 6.883 | 6.860 |

Every lag-only tree arm fails the frozen gate. The enriched versus lag-only
comparisons show that useful additional information matters here; simply
switching estimators is insufficient. They do not prove the hypothetical
predictor relationships exist in actual workforce data.

| Domain | RF enriched, 30 seeds | RF enriched, 3 seeds | GB enriched, 30 seeds | GB enriched, 3 seeds |
|---|---:|---:|---:|---:|
| turnover | 20.725 | 23.877 | 20.141 | 24.013 |
| hiring | 10.472 | 15.230 | 10.750 | 14.757 |
| satisfaction | 5.361 | 7.065 | 5.798 | 6.967 |

Reducing training histories worsens every enriched tree aggregate. The small
arms retain the full-sample tuning parameters and are diagnostics, not separately
optimized models. Short target histories are a distinct test: 60 hiring cases
abstain for insufficient calendar cohorts. Another hiring case—seed 14516,
no-signal, September 2025—preserves the existing optimizer failure.

Reporting stress blocks 20 turnover cases in December 2025. The 20 June 2026
survey instrument breaks remain unscored despite available forecasts. No arm
fills missing labels, changes the instrument definition or reduces availability.

The simple comparator is fixed across scenarios, not chosen retrospectively
per scenario. Some other simple baselines outperform it in individual strata;
all baseline scores, Brier/log loss, RMSE and paired error differences are retained
in the evidence. Twenty independent synthetic seeds and one reversal timing
cannot establish broad robustness, real-world efficacy or calibrated intervals.

## Reproduction and scope

Use Python 3.12 with the pinned [requirements](../experiments/synthetic_tree_v1/requirements.txt)
and Node 24. The available environment used NumPy 2.3.5, SciPy 1.17.0 and
scikit-learn 1.8.0. The runner fixes numeric threading and estimator random seeds;
it performs no downloads. Source/runtime hashes and artifact checksums are
stored with each phase.

```sh
python -m unittest discover -s experiments/synthetic_tree_v1 -t . -p 'test_*.py'
node --test tests/synthetic-tree-baselines.test.mjs
python -m experiments.synthetic_tree_v1.run check
# Explicit regeneration, preserving tuning-before-test sequencing:
python -m experiments.synthetic_tree_v1.run tune
python -m experiments.synthetic_tree_v1.run evaluate
```

The runner uses established [RandomForestRegressor](https://scikit-learn.org/1.8/modules/generated/sklearn.ensemble.RandomForestRegressor.html)
and [GradientBoostingRegressor](https://scikit-learn.org/1.8/modules/generated/sklearn.ensemble.GradientBoostingRegressor.html),
with training-only preprocessing following scikit-learn's
[data-leakage guidance](https://scikit-learn.org/1.8/common_pitfalls.html#data-leakage).
There is no custom tree implementation, production package change or production
model-input boundary expansion. All new benchmark code stays under `experiments/synthetic_tree_v1`.
No app, database, schema, RLS, security or held eNPS file changes.

Validation passes 39 Python tests and the full 1,360-test Node suite, including
eight new native-baseline parity/guard tests. TypeScript, targeted lint and the
unchanged app-facing group-consumer evidence verification also pass.

The [held-out report](evidence/synthetic-tree-benchmarks-v1/report.json) SHA-256 is
`b45bcb2c1ee670b52ee4a4325f9baa2011f9d51c97ae3682f0e6c88bd14ca40e`.
Compressed tuning and test evidence retains the actual dated inputs, fit audits,
predictions, labels, abstentions and metrics needed to audit each comparison.
Independent held-out review checked all 2,100 cases and 36 refits, recomputed
29,985 method-case metrics, and verified every summary, all 24 comparison gates
and all seed-cluster bootstrap ranges. It confirmed the two synthetic-review
recommendations and found no blocking defect.
Both tuning artifacts and both held-out artifacts reproduced byte-for-byte under
the pinned runtime. No parameters, predictors or gates changed after test results.

The next step is parent review of this offline evidence and, if useful, a separate
evaluation of the two candidate arms with genuinely available aggregate source
history. No app model replacement, interval publication or DB integration is
proposed by this branch. The forbidden GitHub PR route was not retried.
