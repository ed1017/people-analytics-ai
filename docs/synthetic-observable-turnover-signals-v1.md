# Observable turnover signals: bounded synthetic results

A fixed binary signal adjustment improved held-out aggregate exit-count error when the simulator imposed a stable leading relationship. It added essentially no value in the no-signal control and substantially worsened error when the relationship reversed. These results demonstrate conditional synthetic benefit and failure, not real-world accuracy, a causal workload effect or qualified uncertainty.

## Frozen design and evidence custody

The [protocol](synthetic-observable-turnover-signals-protocol-v1.md) was committed at `5794c64b0b7857df0d1d0b26529ae54513f831b7` before generating new histories. The source lineage is `5679107bdcea1275afd1741376ff1a92386d6e5c`. Code, training rows and fitted coefficients were then committed at `5fe71914c3f8bc337fffb125e40da59d905125a3` before any held-out history was generated. The commit tree was checked against the actual training report and compressed training file before the first test run; artifact tests also verify the committed report and ancestry. The runner checks pinned source and artifact hashes. No fit, threshold, feature or model was changed after test outcomes were observed.

Training uses seeds 4001–4100, with monthly workforce histories from January 2021 through September 2025. Features are replayed at June 30, 2025. Training targets are July–September 2025; their latest release is October 3, 2025, and the training label cutoff is October 31, 2025. Testing uses separate seeds 5001–5100 and January 2021–September 2026 histories, forecasting July–September at June 30, 2026. Thus all training labels precede the test forecast date. The October 31, 2026 test scoring cutoff is a simulated retrospective release cutoff, not an additional outcome window or claim of real observations.

The constructed binary “announced workload-pressure” flag is drawn before the shock assignment or future outcomes. It is measured May 31 and available June 3. Both dates and synthetic provenance are explicit. A separate pseudo-random uniform selects a later shock with probability .2 for flag 0 and .8 for flag 1. This association is deliberately imposed; no actual workload measure or empirical predictor was discovered. Domain-separated pseudo-random streams implement the independence assumption without proving statistical or cryptographic independence.

Each history has the same ordinary and extra-exit continuations across scenarios. The extra exits follow the frozen .007 monthly-equivalent daily mechanism after scheduled company flows. Stock and person-days reconcile, while group allocations may change after extra events. All pre-target truth values, release revisions and availability clocks are preserved. The no-signal scenario uses shock probability .5 for either flag; the reversed test scenario uses .8 and .2. Assignment uniforms are reused across scenarios. There are 100 held-out company histories per scenario, with dependent groups and scenarios; neither 300 independent histories nor 1,200 independent observations is claimed.

## Methods and input controls

The original recent-three-month mean and calendar seasonal-naive count baselines are unchanged and use the actual origin of each split. June counts are unavailable at June 30 because of reporting lag; the latest training observation is May. The intercept comparator adds the training mean residual to the recent-mean forecast. The signal model adds the training residual mean for flag 0 or flag 1, equivalent to a fixed intercept and binary coefficient. Predictions are clamped at zero and not rounded. No hyperparameter search, nonlinear model or post-test adjustment was used.

Informative and no-signal models are trained separately. The reversed scenario uses the informative model unchanged. Each large group has 100 training outcomes, split into 44 flag-0 and 56 flag-1 observations, exceeding the frozen minimum of ten per cell. Informative residual corrections are 5.36 and 64.86 exits for A, and 4.50 and 64.75 for B. Their intercept-only corrections are 38.68 and 38.24. No-signal fits retain chance differences rather than silently forcing the binary coefficient to zero. Groups C and D have no usable fit because suppression applies.

Only the existing validated aggregate snapshot and a strict offline synthetic signal record enter the point-forecast function. Scenario, seed, assignment, shock probability, shock schedule and future labels are outside that feature contract. This is a research-only contract; production inputs and consumers remain unchanged.

The temporal negative controls passed. Delaying availability until July 1 produces exact intercept fallback on every one of the 1,200 scenario/group rows, including 600 usable forecasts and 600 blocked rows. Future-effective and late-available signals cannot be selected. Unexpected target or assignment fields reject. A test mutates post-origin aggregate labels while preserving accounting, confirms that the labels change, and confirms that pre-origin snapshots and forecasts do not. Informative and reversed scenarios have exactly identical inputs and predictions for each group and seed, despite different assigned outcomes.

## Held-out results

Each large-group row below has all 100 intended histories forecasted and scored. MAE is mean absolute error in the three-month exit count. RMSE and prediction-minus-actual bias, all paired comparisons and all strata are retained in the [machine-readable report](evidence/synthetic-observable-signals-v1/report.json).

| Scenario | Group | Recent-mean MAE | Seasonal-naive MAE | Intercept MAE | Signal MAE | Signal MAE change vs intercept |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Informative | A | 54.08 | 60.75 | 54.01 | 36.29 | 32.80% lower |
| Informative | B | 54.02 | 57.07 | 54.40 | 36.55 | 32.81% lower |
| No signal | A | 57.34 | 64.17 | 56.36 | 56.34 | 0.038% lower |
| No signal | B | 54.15 | 60.68 | 53.45 | 53.44 | 0.035% lower |
| Reversed | A | 57.07 | 66.10 | 55.02 | 70.08 | 27.36% higher |
| Reversed | B | 54.80 | 61.91 | 53.13 | 68.54 | 29.01% higher |

In the informative scenario, MAE is also 32.89% and 32.34% lower than the recent-mean baseline, and 40.26% and 35.95% lower than seasonal-naive, for A and B respectively. Both groups meet the preregistered descriptive criterion of at least 10% lower MAE than all three comparators. This criterion is not a significance test, operational gate or real-world validation.

Informative signal RMSE is 46.75 for A and 45.60 for B, versus intercept RMSE of 56.23 and 55.96. Signal bias is +0.89 and +0.52 counts. In the no-signal control, signal RMSE worsens from 59.30 to 59.65 for A and 55.89 to 56.35 for B. Its tiny sample MAE differences therefore do not establish a useful signal. Reversed signal RMSE is 76.45 and 74.50, versus intercept RMSE of 57.20 and 54.75.

## Failure cases and denominators

Even in the informative scenario, the signal model loses to the intercept comparator on 20 of 100 histories in each large group; it wins on 80, with no ties. Against recent-mean, it loses on 45 A histories and 49 B histories. Average improvement is not improvement for every simulated company.

The low-signal stratum also exposes a tradeoff: signal MAE is 31.33 versus recent-mean 29.13 for A, and 31.81 versus 29.33 for B. On the 51 realized no-shock histories, signal MAE is 36.57 and 36.25, while recent-mean MAE is 17.37 and 16.94 and seasonal-naive is 11.86 and 9.43. Anticipating a probabilistic shock raises predictions even in some futures where no shock occurs. On the 49 informative shock histories, the adjustment improves errors substantially; this compensates for the ordinary-future losses in the overall average. Realized branch labels are used only for retrospective audit strata, never as features or a selection rule.

No-signal comparisons split exactly 50 wins and 50 losses versus intercept, with no ties. In the reversed scenario, both groups lose on 75 histories and win on 25 versus intercept. Informative, no-signal and reversed assignments contain 49, 51 and 52 shock histories respectively; assignments were not balanced or rerolled. Test signal prevalence is 45 zeros and 55 ones.

Groups C and D remain unavailable on all 100 histories in each scenario. All four method predictions and their scored actual totals remain null. Their error metrics are null, with explicit zero scored denominators; they are not counted as successes. No prediction intervals, metric confidence intervals, significance claims, rates, individual scores or causal effects are produced. October–December workforce outcomes are never generated or scored.

## What this supports and what comes next

We can demonstrate a reproducible aggregate forecasting pipeline that uses a genuinely pre-origin constructed variable, learns a small fixed relationship from earlier training labels, beats simple baselines under the declared stable association, and visibly fails when that association disappears or reverses. The earlier adaptation and paired-prefix failures remain intact: adding an observable signal under a new stated premise does not invalidate their no-signal evidence.

For Wednesday, describe this as an offline synthetic research result: “A constructed leading indicator improves average count error when its assumed relationship holds; the same model fails when that relationship reverses.” It does not justify promoting uncertainty, changing the product's operational gates, or promising real retention benefits. The app and existing consumer outputs are unchanged.

The next meaningful evidence would be authorized aggregate observations with actual pre-forecast availability and revision histories, consistently defined voluntary exits, complete-month and cohort coverage, and enough independent periods or organizations to test signal stability. A proposed real leading variable would need a defensible measurement process and evidence that it is known before exits, rather than a downstream proxy or backfilled label. Exposure denominators are additionally required before interpreting rates. A separately frozen future evaluation should compare any proposed signal with the same simple and intercept-only baselines, retain no-signal and temporal leakage controls, and show performance during relationship changes. No new access or experiment is performed here, and this result alone does not justify extra model complexity.

## Reproduction

Training and held-out evidence retain every frozen seed, source hash, coefficient, score and missing denominator. `training-freeze.json` identifies the fit commit and training report hash. The compressed training and score files are offline audit artifacts, not new consumer inputs.

```sh
node tests/manual/generate-observable-turnover-signals.mjs --check-training
node tests/manual/generate-observable-turnover-signals.mjs --check
node --test tests/*.test.mjs tests/synthetic-workforce/*.test.mjs
npx eslint lib/ml/observable-turnover-signals/*.mjs tests/manual/generate-observable-turnover-signals.mjs tests/synthetic-workforce/observable-signals-*.test.mjs
npx tsc --noEmit
node tests/manual/generate-group-turnover-consumer.mjs --check
```

The two check modes regenerate the same frozen histories and compare artifact bytes without refitting choices or selecting new data. Prior report hashes and the consumer identity are checked throughout. No UI, database, schema, RLS, security, disabled eNPS, held SQL or held contract file was edited. Nothing was merged to main or deployed.

Validation completed: all 1,296 tests passed, including 18 new observable-signal tests; scoped ESLint and TypeScript checking passed; all 100 training histories and all 100 held-out histories reproduced byte for byte. Independent review recomputed all eight fitted group/scenario models, all 1,200 prediction mappings and all twelve summaries and strata. The prior consumer remains at identity `6f76782c3da5b1c326f4a6b55e04792c1f5258e2f8712aa26205439a098265e8`. No application build was run for this offline-only experiment.
