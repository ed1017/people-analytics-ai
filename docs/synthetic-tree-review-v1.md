# Fresh review of tree forecast candidates

**Verdict: reject adoption for all three domains.** Keep the existing synthetic-demo
baselines. Fresh reference averages improve, but the candidates fail prespecified
worst-case or changed-generator conditions; the survey stability gate does not
repair the drift failures. No narrower post-test success is promoted.

This review makes a fixed adopt-for-synthetic-demo or reject decision for the
turnover gradient-boosting candidate, hiring random-forest candidate, and a
survey random forest with an observable stability gate. It changes no production
model, database, security setting or held eNPS file. All source history and
outcomes remain explicitly constructed synthetic aggregates.

## Frozen candidates and fresh evidence

The parent [tree benchmark](synthetic-tree-benchmarks-v1.md) is preserved at
`23a1532c87e8d684cfd89ddce4c00d40b33d12e0`. This review's protocol was committed
at `95e09af`, and implementation at `b2d0eb4`, before any new seed generation.
Original parameters, training seeds, preprocessing and features are unchanged.
Before generating fresh histories, the six candidate/comparator refits must
match every original audit field, including training rows, weights, feature
names, imputer medians and the hash of training predictions.

Turnover GB and hiring RF are the previously named review candidates. Survey RF
is fixed from the original **tuning** result, 4.901 versus GB's 5.098 score-point
MAE; no old test result selects a new survey model. The original test's broad
drift failure motivates checking an observable gate, not tuning its formula or
threshold against those old outcomes. This review reads original saved refit
audits and tuning choices, not original test-outcome rows.

| Role | New seeds | Dates and use |
|---|---|---|
| Observable calibration | 16501–16520 | June/September 2024 origins; released inputs only, no target labels |
| Reference validation | 15501–15540 | June/September/December 2025 and March/June 2026 origins |
| Alternative-world validation | 17501–17520 | Same five validation origins; reused across three fixed stress worlds |

The original stable, gradual-drift, reversal, missingness, short-history,
no-signal and survey-instrument-break scenarios remain. Scenario histories share
seed innovations. There are 40 independent reference seed clusters and 20
transport seed clusters—not hundreds of independent companies. The three shift
worlds also share those 20 seeds. All model fitting still uses original training
labels released by June 30, 2025. The new survey threshold is committed separately
before either fresh test set opens.

## Challenging generator assumptions

The original simulator deliberately makes historical indicators useful. Fresh
seeds within that simulator cannot alone test whether gains depend on its
chosen dynamics. Three prespecified sensitivity worlds challenge those choices:

- **Weaker signal:** average the original outcome probability with the same
  scenario's zero-indicator-state probability. This halves the probability-scale
  effect relative to neutral indicators while preserving drift, reversal
  intercepts, seasonality and instrument identity. For hiring this is not a
  halving of logit coefficients.
- **Faster predictors:** reduce stationary AR(1) persistence from 0.94 to 0.50,
  retaining variance, innovation streams and the three-month causal lag.
- **Later publication:** add 60 days to predictor publication times only. Outcome
  releases and values remain identical to the reference construction. Features
  must use older available indicators rather than the unpublished recent values.

World, scenario and seed identifiers never enter model vectors. The original
complete-month, 90-day hiring-follow-up and comparable-published-wave guards
remain shared across methods. Future target opening counts, respondents and
headcounts never become predictors. The tests mutate or remove post-origin
releases and verify that features, groups, gate decisions and predictions cannot
change. These alternative worlds are still hypothetical, not independent
real-world validation or empirical estimates of workplace relationships.

## Survey stability gate and coverage

Tree regressors cannot extrapolate a smooth trend beyond their training support
in the same way a linear trend can. A recent observable change is a plausible
reason to abstain, but the original drift failure does not prove that such a
gate will identify it. This review therefore tests one simple gate without
fitting an error classifier or selecting thresholds using forecast errors.

For the latest eight complete released waves, compute seven adjacent score
changes. The gate score is the absolute equal-wave OLS slope of the last four
waves divided by the larger of one score point or the median absolute deviation
of those seven changes around their median. The threshold is the fixed 95th
percentile of eligible new calibration-case scores, using linear interpolation.
Only scores strictly above the cutoff abstain. There is no scenario-specific
threshold, future instrument flag, target label or forecast residual in the rule.

Coverage is measured against **all baseline-eligible forecasts**, including
those whose later targets prove instrument-incomparable. Scored coverage is
reported separately. Retained errors compare candidate and baseline on the same
cases; ungated and excluded-case errors remain visible. The gate must retain
90% per world and 80% within every eligible scenario/origin. It cannot earn
adoption merely by discarding most difficult forecasts.

## Acceptance and subgroup/calibration checks

Adoption is allowed only if every applicable frozen condition passes. Otherwise
the domain receives a concrete rejection; no favorable post-test subset is
promoted after broad rejection.

- Reference aggregate MAE must improve at least 5% against each fixed comparator,
  with the upper endpoint of a 95% paired seed-cluster bootstrap difference below
  zero. There are 2,000 fixed-seed resamples. These are conditional error-difference
  diagnostics, not forecast prediction intervals or real-world significance.
- No reference scenario/origin or historical-exposure-tertile mean may worsen
  by more than 10%. Reference criterion cells require 20 distinct seeds.
- In each alternative world, aggregate MAE may worsen by no more than 5%, and
  scenario/origin means by no more than 20%; cells require ten distinct seeds.
- Hiring must have at most three percentage points of absolute pooled bias and
  five points of ten-bin expected calibration error in every world. Exact
  aggregate-binomial Brier score and log loss may worsen by no more than 2%.
- Count absolute mean bias may not exceed 10% of mean observed count; survey
  absolute mean bias may not exceed two score points, in each world.
- Native abstentions remain explicit. Entirely unsupported short-history cells
  are outside forecast scope; instrument-incomparable cells remain outside
  accuracy scope. Other insufficient criterion support rejects adoption.

Turnover and survey use their frozen matching-input Ridge comparators. Hiring
must pass **both** the original recent-three-cohort baseline and matching-input
Ridge; a benefit from pooled training or extra information cannot alone be
attributed to the tree algorithm. Other native baselines are also reported.

Exposure tertiles use only released historical denominator means, with cutoffs
calibrated separately by domain. Missing-predictor and stale-predictor groups
are also reported; stale means effective age above 60 days. Rare groups are
marked insufficient scope. These are aggregate operational coverage checks;
there are no employee demographic fields and no demographic-fairness claim.

Hiring reliability tables use fixed ten-percentage-point probability bins,
recording opening observations, cohort rows and distinct seeds. Bins with fewer
than five seeds or 500 openings are marked sparse. Pooled opening-weighted
calibration/proper scores are separate from equal-case average MAE. No model
probabilities are recalibrated. Count and survey bias are point-forecast
accuracy diagnostics, not probability-calibration claims.

## Results and concrete verdicts

The fresh evaluation has **10,500 domain/decision cases**: 4,200 reference cases
and 2,100 in each alternative world. The table uses the fixed primary comparator;
hiring is additionally required to beat matching-input Ridge.

| Domain | Reference scored pairs | Comparator MAE | Candidate MAE | Final verdict and decisive failures |
|---|---:|---:|---:|---|
| turnover | 1360 | 24.035 | 19.481 | Reject: four weak-signal scenario/date failures |
| hiring | 1265 | 12.198 | 9.140 | Reject: two reference and additional weak-signal/delay failures |
| satisfaction | 1308 | 6.972 | 5.842 | Reject: drift failures persist after gating; fast-world bias fails |

Units are monthly exits, hiring percentage points and survey score points.
Survey numbers are conditional on the gate retaining the same cases for RF
and Ridge. Hiring matching-input Ridge scores **11.262** versus RF’s **9.140**.
Reference mean gains are 18.9% for turnover, 25.1% for hiring versus recent cohorts
(18.8% versus Ridge), and 16.2% for retained survey cases. All four reference
bootstrap error-difference intervals are below zero. This does not override
failed worst-case conditions.

### Dependence on simulator assumptions

| Domain | World | Scored pairs | Primary comparator | Candidate |
|---|---|---:|---:|---:|
| turnover | reference | 1360 | 24.035 | 19.481 |
| turnover | weak-signal | 680 | 16.885 | 17.348 |
| turnover | fast-predictors | 680 | 28.849 | 25.530 |
| turnover | delayed-predictors | 680 | 25.266 | 22.243 |
| hiring | reference | 1265 | 12.198 | 9.140 |
| hiring | weak-signal | 638 | 6.380 | 6.728 |
| hiring | fast-predictors | 637 | 14.794 | 10.982 |
| hiring | delayed-predictors | 633 | 10.533 | 10.197 |
| satisfaction | reference | 1308 | 6.972 | 5.842 |
| satisfaction | weak-signal | 667 | 4.561 | 3.546 |
| satisfaction | fast-predictors | 673 | 9.363 | 8.745 |
| satisfaction | delayed-predictors | 652 | 6.926 | 6.187 |

**Turnover:** weakening the indicator effect removes the aggregate advantage
over Ridge and causes four drift/missingness scenario-date means to worsen by
more than the allowed 20%. For example, June 2025 gradual-drift MAE is **23.447**
versus Ridge’s **16.435**, about 42.7% worse. The weak-signal average bias is
+9.065 exits, within the declared 10%-of-mean-count bias limit, but that does not
repair the local failures. Faster predictors and later publication do not erase
the aggregate advantage in this sample. The effect is conditional on the
simulated relationship, not a general benefit from complexity.

**Hiring:** reference RF fails the December 2025 no-signal case against recent
cohorts and March 2026 gradual drift against Ridge. In the weak-signal world,
aggregate MAE is **6.728 versus 6.380**, a 5.46% deterioration that exceeds the
fixed 5% limit. There are also ten comparator-specific scenario/date failures
under weaker signal and six under late publication. The report keeps all
19 failures, including overlapping comparisons against the two baselines.

**Surveys:** reference retained December 2025 drift error is **7.104** versus
Ridge’s **6.398**, about 11.0% worse. Drift also fails in weaker-signal and
faster-predictor worlds. Fast-world mean bias reaches **+2.104 score points**,
above the frozen two-point limit. The gate is rejected as a sufficient repair
along with the candidate; no second threshold was tried.

### Survey gate: useful-looking averages do not demonstrate a repair

The committed threshold is **2.652581057817451**, derived from 240 eligible
calibration cases across 20 independent seeds. Its 95th-percentile construction
is not a 95% forecast-coverage guarantee.

| World | Eligible forecasts retained | Retained scored cases | Ungated RF MAE | Retained RF MAE | Excluded RF MAE |
|---|---:|---:|---:|---:|---:|
| reference | 96.21% | 1308 | 5.905 | 5.842 | 7.488 |
| weak-signal | 98.14% | 667 | 3.511 | 3.546 | 1.754 |
| fast-predictors | 99.00% | 673 | 8.672 | 8.745 | 1.709 |
| delayed-predictors | 95.86% | 652 | 6.169 | 6.187 | 5.744 |

Coverage passes the frozen 90% overall and 80% per-cell limits; the lowest
observed scenario/date retention is 90%. The reference gate excludes 52 scored
cases and one future instrument-incomparable target. In weak-signal and fast
worlds, the excluded cases actually have **lower** errors than retained cases.
This simple observable statistic is not a reliable indicator of model failure.
It neither detects every gradual drift nor anticipates an unannounced reversal.

### Calibration, worst cases and subgroup support

| Hiring world | Signed bias, pp | Ten-bin ECE, pp |
|---|---:|---:|
| reference | 0.683 | 0.915 |
| weak-signal | -2.314 | 2.334 |
| fast-predictors | 0.811 | 2.540 |
| delayed-predictors | -0.259 | 1.782 |

All aggregate hiring calibration and proper-score limits pass. They do not
establish adequate accuracy in every scenario. Some occupied reliability bins
have absolute gaps above ten points; each bin’s opening count and distinct seed
support is disclosed, with sparse bins explicitly marked. Calibration is for
aggregate opening outcomes, not individual hiring decisions.

| Reference domain | Worst scenario/date mean MAE | Worst single history/date MAE |
|---|---:|---:|
| turnover | 54.674 | 162.805 |
| hiring | 23.044 | 65.750 |
| satisfaction | 26.172 | 50.476 |

Every reference worst scenario/date is the June 2026 reversal. Individual
worst cases reach 162.805 exits, 65.750 hiring points and 50.476 survey points.
These are observed errors in this simulation, not bounds on future errors.

Reference exposure-tertile groups contain 26–40 distinct seeds for turnover,
37–39 for hiring, and 24–33 for retained surveys. Every required exposure group
meets its 20-seed minimum and its error comparison passes. Stale-feature groups
are represented. Naturally missing **added predictor** values have no scored
turnover cases in these selected dates: they coincide with native unavailable
outcome support. Their performance is explicitly unqualified. Missing-indicator
coverage is present for 20 hiring and 20 survey cases in the late-publication
world, with 20 distinct seeds each. This is not demographic coverage evidence.

Reference native guards preserve 40 turnover partial-history abstentions,
120 short-history hiring abstentions, 15 existing hiring-optimizer failures
and 40 survey instrument-incomparable scores. No new tree prediction bypasses
those controls and no missing error is assigned zero.

The review records **27 failed conditions**: four turnover, 19 hiring and four
survey. Thresholds, model identities and all test worlds remained unchanged
after opening these results. The decision is closed for this candidate set:
**retain the existing synthetic-demo baselines; do not adopt these candidates**.
There is no additional tuning or promotion proposed by this review.

## Reproduction and scope

```sh
python -m unittest discover -s experiments/synthetic_tree_review_v1 -t . -p 'test_*.py'
python -m experiments.synthetic_tree_review_v1.run check
# Explicit regeneration; preserve calibration-before-test freeze:
python -m experiments.synthetic_tree_review_v1.run calibrate
python -m experiments.synthetic_tree_review_v1.run evaluate
```

Use the parent's pinned Python/NumPy/SciPy/scikit-learn environment and Node 24.
The runner verifies both original and new source/runtime hashes. All new code
is isolated under `experiments/synthetic_tree_review_v1`; no production package
or model-input boundary changes. Domain panels remain separate simulations,
not a jointly reconciled workforce plan. October–December 2026 target periods
remain unscored. Published intervals and real-world qualification remain absent.

Calibration was committed at `1bde35e` before any fresh test histories were
generated. [Calibration report](evidence/synthetic-tree-review-v1/calibration.json)
SHA-256: `71eb0010d3cb19aff8e0739f98b6c95445379daa4a95b9983deaf6659419f6b5`.
[Final report](evidence/synthetic-tree-review-v1/report.json) SHA-256:
`73fef82c676318773166888c3f133bc24b3625965bab6c820c018a14a7e5f67a`.

Verification passes 38 new and 39 existing Python tests, the 1,360-test Node
suite, TypeScript and the prior app-facing evidence check. Independent review
recomputed 226,581 numeric comparisons, all 27 failed conditions, subgroup and
survey-gate coverage, reliability bins and all four bootstrap comparisons. It
verified 9,519 complete hiring target-cohort maturities, six frozen refit audits,
new seed manifests, release clocks and 52 source hashes, with no blocking issue.
The full `run check` regeneration reproduced all four calibration and test
artifacts byte for byte, including the final report hash above.
