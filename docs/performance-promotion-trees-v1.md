# Performance and promotion RF/boosting results

**Reject RF and gradient boosting for both new targets. None of the 45
performance/promotion feature ablations demonstrates robust added value.**
The company-count RF fits passed this experiment's limited synthetic-demo
gate; all other tree fits rejected. **The subsequent
[final baseline review](company-count-rf-final-review-v1.md) rejects the RF
adoption exception** using its already-saved predictions against seasonal naive.
The original gate values below remain historical evidence, not current approval.
No app or production model changes.

The [coverage matrix](ml-target-coverage-v1.md) maps every implemented prediction
path. The [data contract](performance-promotion-data-contract-v1.md) documents
why Career Mobility's three annual observations per cohort cannot train these
forecasts and how the new, separate synthetic longitudinal histories work.
That chart's descriptive rating 3–5 share is not silently renamed: this new
forecast target is the ordinal rating 4–5 share. No interval-scale rating average
or individual promotion decision is produced.

## Frozen design and qualification

Protocol `cd958ee`, completed implementation `0bcd341`, and training-evidence
freeze `db92e1b` precede fresh test generation. Pre-generation reviews fixed
small-bin disclosures, opening-denominator custody and explicit empty-cell
handling. No model, threshold or feature changed after opening the results.

Thirty training seeds 19101–19130 cover quarterly origins March 2021–December 2024,
using labels released by June 30, 2025. All 60 models are fitted once and frozen.
The 16,800 intended training cases yield 2,790 fitted target rows for performance,
8,550 for promotion, 8,190 for counts, 8,034 for hiring and 1,800 for surveys.
Each target has four feature tiers and three estimators. Exactly the same rows,
weights and feature columns are supplied to the three estimators in each tier.

RF uses 100 trees, depth 4 and minimum leaf size 20. Boosting uses 100 trees, depth 2,
learning rate 0.05 and minimum leaf size 20. Ridge uses penalty 100 with training-only
standardization. Imputation medians use training data only. No hyperparameter
search occurs. Historical target denominators weight performance, promotion and
hiring fits; count and survey fits use equal target rows. Predictions are clipped
to each target's legal range, with no fitted recalibration or prediction interval.

Forty new test seeds 19301–19340 supply June/September/December 2025 and
March/June 2026 origins under the seven fixed stable, drift, reversal, missingness,
small-sample, no-signal and instrument-break scenarios. There are 7,000 intended
domain/decision cases, **40 independent seed-history clusters**, and 6,309 scored
cases. Repeated scenarios and months are not independent companies or people.
October–December target months/cohorts remain reserved; complete90-day follow-up
for September hiring/promotion cohorts necessarily extends into Q4.

| Target | Intended | Forecasted | Scored | Preserved support limits |
|---|---:|---:|---:|---|
| Rating4–5 share | 1400 | 1160 | 1120 | 200 small-sample and 40 incomplete-history blocks;40 changed-instrument targets unscored |
| 90-day promotion fraction | 1400 | 1200 | 1197 | 200 small-sample blocks;3 withheld target quarters unscored |
| Monthly voluntary exits | 1400 | 1360 | 1360 | 40 incomplete-history blocks |
| 90-day hiring-start fraction | 1400 | 1272 | 1272 | 120 short-history and 8 native-optimizer blocks |
| Survey favorable-answer score | 1400 | 1400 | 1360 | 40 changed-instrument targets unscored |

Promotion cohorts keep the original opening eligible denominator, including
exits and non-promotions. Labels require complete follow-up. Denominators and
identities reconcile to the opening release. Membership is not tracked across
overlapping cohorts; these aggregates cannot establish a unique-person annual
promotion rate or a time-to-promotion distribution.

## Point errors and decisions

The base tier uses released target lags/calendar/historical denominators for
the two new targets, and the unchanged original enriched inputs for the three
existing targets. Fraction errors below are percentage points; survey errors
are score points, counts are monthly exits. Values are equal-case mean MAE;
within a fraction case, target denominators weight its monthly errors.

| Target | Fixed native comparator | Native MAE | Matching Ridge | RF base | Boosting base | Decision across all four feature tiers |
|---|---|---:|---:|---:|---:|---|
| Rating4–5 share | Recent3-wave mean | 10.803 | 11.128 | 11.063 | 11.069 | Reject both |
| Promotion fraction | Recent3-cohort pooled fraction | 3.538 | 3.369 | 3.526 | 3.413 | Reject both |
| Company exit count | Recent3-month mean | 26.499 | 22.757 | 19.885 | 19.809 | Historical RF gate pass; final review rejects adoption; reject boosting |
| Hiring-start fraction | Recent3-cohort fraction | 12.847 | 13.774 | 11.169 | 10.946 | Reject both |
| Survey score | Recent3-wave mean | 6.272 | 6.028 | 5.563 | 5.638 | Reject both |

Adoption requires at least 5% aggregate MAE improvement against **both** fixed
native and matching-feature Ridge comparators, no more than 10% worsening within
any scored scenario/origin or horizon, and adequate seed support. Count trees
also face SES and quarter-total gates. Probability targets also face bias,
fixed-bin calibration and proper-score limits. Every applicable condition must
pass. There are **four conditional passes and 36 rejects** among 40 tree decisions.
Native unsupported and instrument-incomparable cells remain outside accuracy
scope; unexplained empty or low-support cells cannot silently pass.

For performance, both trees miss the aggregate improvement threshold and worsen
drift/no-signal cells. June 2026 drift RF error is 12.880 points versus a recent
mean of 9.181, about 40% worse. For promotion, neither tree improves5% over Ridge;
several scenario/date comparisons also fail. Adding performance improves
promotion RF's average by about 1.56%, below the fixed 5% requirement.

Hiring again shows average tree gains but fails local guards: base RF misses
June 2025 and June 2026 drift against recent cohorts; base boosting fails all five
no-signal origins. Survey RF misses December 2025 drift against Ridge, and both
survey trees miss all five no-signal origins against the recent mean. These
failures cannot be rescued by pooled averages or selective scenario reporting.

## Performance/promotion ablations

The four tiers are base, base+performance, base+promotion and base+both. Every
addition is compared with the **same estimator's base** on identical cases.
The rule requires 5% mean improvement and no scenario/origin worsening above 10%.
All **45 comparisons** fail to demonstrate robust added value. The complete
report retains all three additions for all three estimators and five targets.

The table illustrates the both-added arm; positive percentages mean lower MAE:

| Target | Ridge improvement | RF improvement | Boosting improvement |
|---|---:|---:|---:|
| Performance | -1.395% | -0.029% | -0.167% |
| Promotion | -0.490% | +1.553% | +0.277% |
| Exit counts | +0.065% | +0.095% | +0.062% |
| Hiring | +2.373% | +0.952% | -0.196% |
| Survey | -0.892% | +0.411% | -0.670% |

New performance and promotion outcomes share hypothetical persistent drivers.
Their random streams are separate from the original domains, with no direct
cross-domain coefficient link, but all panels share calendar/scenario drift,
reversal and reporting patterns. Thus this is not a proof of mathematical
independence or of real-world usefulness/uselessness. An own-target added field
mostly repeats its existing recent outcome lag plus availability flags. The
results give no basis to expand an app's input contract or assume these fields
help external hiring or survey forecasts.

## Historical count RF pass and final rejection

The legacy fitted SES comparator is now covered. It selects alpha0.2/0.5/0.8
using training-only one-step SSE on the same24 months supplied to the count
models. Native-fixture parity is exact across the original model's windows.
Targets stay fixed despite publication gaps; only the flat fitted level carries
over to those target dates.

| Count base method | Monthly MAE | Quarter-total absolute error |
|---|---:|---:|
| Recent mean | 26.499 | 71.190 |
| SES | 26.293 | 70.702 |
| Matching Ridge | 22.757 | 56.198 |
| RF | 19.885 | 46.291 |
| Boosting | 19.809 | 46.882 |

RF clears every declared count gate in all four tiers. Its narrowest base-arm
guard is March 2026 missingness quarter error 56.557 versus Ridge 51.709: ratio
**1.09375 against a 1.10 limit**. Boosting has a slightly smaller pooled monthly
error but fails no-signal cells against recent mean and SES, including
quarter-total errors. This illustrates why a test-set minimum is not the rule.

This RF is fitted on a new training-seed pool. Its settings match the earlier
turnover RF, while the new fixed Ridge penalty 100 differs from the earlier
tuning-selected penalty 1. The earlier RF's drift failures and the fresh GB
changed-generator rejection remain valid evidence; neither is rewritten or
reproduced by this new fit. This experiment does **not** include the earlier
extra weak-signal, faster-predictor and 60-day publication-shift worlds or provide
their qualification for these new fits. The pass is therefore exactly
`adopt-for-synthetic-demo` within this declared experiment, not broad robustness,
real-workforce adoption, or a reversal of earlier decisions. No production model
or UI changes are made. The added performance/promotion inputs are unnecessary
for the pass and fail their own added-value criterion.

**Final disposition:** reject this RF for the claimed monthly/quarter-total demo
scope. Seasonal naive was present in the saved results but absent from the
limited adoption comparator set. At September 2025's no-signal origin, the exact
RF's quarter-total MAE is 33.11835 versus seasonal naive's 20.8 across the same
40 histories, a 59.22% deterioration. The final review independently verifies
this existing failure; no new fit or holdout generation is necessary. The
earlier gate pass is preserved rather than silently reclassified as an error.

## Probability diagnostics and verification

| Probability target, base arm | RF pooled bias / ECE, pp | Boosting pooled bias / ECE, pp |
|---|---:|---:|
| Rating4–5 share | 2.376 / 2.460 | 2.330 / 2.330 |
| Promotion | 0.791 / 0.791 | 0.628 / 0.633 |
| Hiring | -1.311 / 1.566 | -1.622 / 2.950 |

Bias/ECE limits are3/5 points. Good aggregate probability diagnostics do not
override point-error failures. Brier/logloss use exact aggregate-binomial
arithmetic within each case and are averaged equally across cases; reliability
and bias are pooled by denominator and shown separately. Ten fixed probability
bins retain support counts and sparse flags. No probability recalibration,
demographic-fairness claim or forecast uncertainty is established.

The independent audit reconstructed every case metric, scenario/origin and
horizon summary, calibration bin,40 decisions and45 ablations: **2,715,157
numeric/input/decision comparisons across 7,000 cases**. A separate training audit
verified 300 fit-input/weight/imputation checks across 16,800 cases and 60 fits.
Every intended test cell contains 40 seeds. It also verified 7,407 scored
hiring/promotion cohort labels for90-day maturity and 1,120 rating labels for
category-count reconciliation and published-bin support.

The branch passes **121 Python tests, 1,367 Node tests, TypeScript**, and the
unchanged app-facing evidence check. The consumer identity remains
`6f76782c3da5b1c326f4a6b55e04792c1f5258e2f8712aa26205439a098265e8`.

```sh
python -m unittest discover -s experiments/performance_promotion_trees_v1 -t . -p 'test_*.py'
python -m experiments.performance_promotion_trees_v1.run check
```

Training report SHA-256:
`83b561d6de77d32fde4b282e0904eae485db1df96aa16d02295663e64e76d834`.
Held-out [report](evidence/performance-promotion-trees-v1/test.json) SHA-256:
`a5b06ab4683fc64e53d31249e7bcc4d9b7519ffd4745923372380ad2f4fc3b19`.
Compressed training and test cases retain features, allowed labels, predictions,
abstentions and audits. The fixed source/runtime identities bind the artifacts.

Full `run check` regeneration reproduced all four training and held-out artifacts
byte for byte under the pinned runtime, with the report hashes above unchanged.
