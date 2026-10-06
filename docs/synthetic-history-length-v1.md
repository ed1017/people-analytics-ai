# Going further back: calendar history-length experiment

Older history helps some synthetic forecasts, but the longest window is not
consistently best. A 36-month turnover trend improves the stable seasonal case
relative to the existing 12-month trend, while worsening the unseen reversal.
Hiring and survey gains are smaller and scenario-dependent. Unsupported windows
remain unscored. No app model, default lookback or interval is promoted.

This experiment answers a different question from adding more independently
seeded companies: **for the same company history and future quarter, does fitting
further back in time help?** It reuses the unchanged January 2021–December 2026
generator, which is already long enough for the primary 60-month comparisons.
No earlier timeline was fabricated, no original capture was backfilled and no
simulated release timestamp was relabeled as an actual historical observation.

## Frozen design and scope

Protocol `9cc665918c21422ccb8420819e8155268d223b35` and implementation `8626fed`
were committed before new-seed generation. Seeds 10501–10530 × five families
produce **150 histories and 2,250 domain/window rows**: the current reference plus
12-, 24-, 36- and 60-month windows for each domain. No seed, parameter or window
was selected or changed after observing results.

All comparisons use June 30, 2026 as the forecast cutoff and July–September 2026
targets (September only for the quarterly survey). Scoring releases are selected
as of February 28, 2027. Each method is fitted before labels are supplied to its
scorer. October–December target periods/cohorts remain unscored; 90-day hiring
follow-up can extend into later calendar months. No interval is fitted or claimed.

Windows end at the latest selected release or due mature opening cohort, **not**
the latest convenient nonmissing row. Start/end months and explicit targets are
saved; their calendar difference reconstructs target lead. At the main cutoff:

- Turnover ends May 2026 ordinarily and April under reporting stress. For ordinary
  cases, 12/24/36/60 months begin June 2025/2024/2023/2021 respectively.
- Hiring ends March 2026 ordinarily and February under reporting stress, after
  both 90 days and the declared reporting-lag bound. Its 60-month ordinary window
  starts April 2021.
- Survey support ends March 2026. The 24/36/60-month windows request 8/12/20
  quarterly waves, starting June 2024/2023/2021 respectively.

These are calendar spans ending at available support, not calendar spans ending
at the forecast date. Reporting gaps are retained, not filled with final labels.

## Reused methods and explicit eligibility limits

| Domain | Methods | What changes with older history |
|---|---|---|
| Turnover | Recent mean of 3, same month last year, nonnegative OLS trend | OLS fits all L months; the other two methods stay fixed as controls |
| Hiring | Pooled fraction, recent 3 positive-cohort fraction, fixed-penalty logistic trend | Pooled/trend use positive exposure within L calendar cohorts; zero-opening months remain in support |
| Satisfaction | Last wave, recent mean of 3 waves, bounded equal-wave OLS trend | OLS uses all L/3 supported waves; no pooling of respondents |

The current references retain their original rules: turnover requires 24 complete
months but fits its trend to 12; hiring uses 36 calendar cohorts; satisfaction uses
eight waves. The **12-month turnover arm is an explicitly exploratory support
exception**, not a pass of the existing 24-month adapter requirement.
Every count month and seasonal comparator still must be available and complete.
Tests reproduce current predictions exactly at turnover L12, hiring L36 and
satisfaction L24.

Hiring's native minimum of 24 positive-exposure cohorts remains enforced. Both
12- and 24-calendar-month arms fail that requirement in all 150 cases because
known zero-opening months are retained. The 36-month arm scores all 150; the
60-month arm scores 148, with fixed-optimizer failures for stationary seed 10505
and survey-break seed 10516. There is no retry or tuning.

Satisfaction's 12-month arm has only four waves and fails the eight-wave minimum.
Its 60-month arm includes the generator's persistent March/June 2022 missing and
suppressed waves, so all 150 cases abstain. This tests **availability of longer
history**, not the accuracy of 20 clean waves. The current/24/36-month arms each
predict 150 cases and score 120; all 30 future instrument-break labels are withheld.
Those unavailable errors are never zero.

## Turnover results

Table entries are mean per-history monthly-count MAE over 30 common histories.
The 12-month trend equals the current trend. Recent-3 and seasonal-naive values
are identical across eligible windows; simply loading older history does not
change a fixed-window estimator.

| Family | Trend 12 | Trend 24 | Trend 36 | Trend 60 | Seasonal-naive baseline |
|---|---:|---:|---:|---:|---:|
| Stable hazard + seasonality | 14.650 | 11.284 | 10.179 | 10.455 | 11.489 |
| Gradual improvement | 9.540 | 8.278 | 7.854 | 8.671 | 8.633 |
| Unannounced reversal | 87.813 | 90.434 | 91.569 | 89.873 | 93.222 |
| Delayed reporting/revisions | 10.343 | 8.390 | 8.292 | 9.037 | 9.311 |
| Survey-break family, turnover | 14.222 | 10.959 | 9.911 | 10.574 | 9.722 |

In stable seasonal turnover, L36 beats the current trend in 25/30 histories and
loses in 5. In reversal, it wins only 8/30 and loses 22. L60 is worse than L36 on
mean error in four of five families; in reversal it is less bad, still failing
to anticipate the new regime. This is a retrospective comparison of frozen
candidates, not selection of L36 as an approved default.

All turnover families include 12% sinusoidal seasonality and evolving workforce
stock; there is no separate seasonality-off control. The 60-month windows also
include the fixed August 2021 true-zero mechanics month. These declared generator
features limit how broadly the results can be interpreted.

## Hiring and satisfaction results

Hiring entries use the unchanged opening-weighted percentage-point MAE metric.
Every pair below uses the **same scored seeds on both sides**; unpaired averages
would exaggerate improvement where an optimizer failure removes a difficult case.

| Hiring logistic trend | Paired histories | 36 months | 60 months |
|---|---:|---:|---:|
| Stable | 29 | 2.619 | 2.527 |
| Timing improvement | 30 | 2.571 | 2.595 |
| Reversal | 30 | 66.304 | 66.262 |
| Delayed reporting | 30 | 2.716 | 2.599 |
| Survey-break family, hiring | 29 | 2.451 | 2.429 |

Stable hiring L60 wins 18/29 pairs and loses 11. Its small gain does not repair
the roughly 66-percentage-point reversal error. The improvement family changes
start timing while starts generally stay within 90 days, so it is not evidence
of robustness to drift in the within-90-day probability. Pooled-fraction and
recent-cohort controls and Brier/log-loss comparisons remain in the full report.
On the same 29 stable pairs, the pooled baseline slightly worsens from 2.460 to
2.469 percentage points; the logistic gain should not be generalized to all methods.

Survey trend errors below are score percentage points, using 30 shared scored
histories per row. L24 is the current eight-wave model; L36 uses twelve waves.

| Survey family | 24 months | 36 months |
|---|---:|---:|
| Stable | 0.309 | 0.266 |
| Gradual score improvement | 0.288 | 0.269 |
| Reversal | 32.717 | 32.738 |
| Delayed reporting | 0.319 | 0.311 |

The stable gain is 0.042 score points, with 17 wins and 13 losses. Last-wave MAE
is already 0.270 in that family. Longer history is therefore not evidence of a
large general improvement. No 60-month survey accuracy comparison is available.

## Missingness, interpretation and recommendation

A separate native reporting-stress replay at November 30, 2025 requests December.
Current and L12/L24/L36 turnover forecasts all block on partial releases in 30/30
cases; L60 lacks 60 calendar months at that earlier date. Current/L24/L36 survey
forecasts all block on partial support in 30/30; L12 is too short, and L60 lacks
the requested history. Hiring current/L36 remain available, L12/L24 fail positive
support and L60 lacks calendar coverage. This generator's mature hiring labels
are not persistently missing, so its result is not a missing-label robustness
claim. Existing tests enforce overdue incomplete-cohort rejection.

**Keep app behavior unchanged.** Older complete, comparable history can help
estimate smoother patterns, but it can dilute recent behavior, retain obsolete
regimes or fail completeness requirements. The new evidence supports a separate
future evaluation of window selection across multiple earlier origins and new
holdouts, not choosing this quarter's winner or adding confidence intervals.
Do not tune another model on these now-inspected seeds and call them untouched.

This isolated branch changes no UI, AI-context, compensation, DB, security or
eNPS files. Counts remain counts, hiring fractions retain all-opening denominators,
and survey scores remain mean respondent favorable-answer shares. There are no
person-level scores, source-availability repairs or causal-effect claims.

## Reproduction and evidence

[Report](evidence/synthetic-history-length-v1/report.json) SHA-256:
`7ce316d0243f2a955e335a91acfd73802a673bd41cf22eff4c1e30078a0ae789`.
Compressed rows preserve every window, prediction, score, blocked reason,
input/label fingerprint and guard result. The report pins source files and prior
evidence; prior datasets and app-facing artifacts are unchanged.

```sh
node --test tests/synthetic-history-length.test.mjs
node tests/manual/generate-synthetic-history-length.mjs --check
# Explicit local regeneration only:
node tests/manual/generate-synthetic-history-length.mjs --write
```

Seven new tests cover reference equivalence, fixed controls, prewindow/future
invariance, calendar and maturity gaps, native missingness and paired denominators.
The full isolated-branch suite passes 1,343 tests; targeted lint, TypeScript and
prior group-consumer verification pass. No live service or database is needed.
All artifacts reproduced byte-for-byte. Independent review verified all 18 source
hashes and recomputed 1,053 metric/pair checks, including the 450 guard records;
no blocking defect was found.
