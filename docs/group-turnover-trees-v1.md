# Group turnover forest and boosting coverage

This isolated offline experiment fills two gaps: the group count forecaster emits individual monthly counts and a distinct three-month total, while the observable-signal model predicts a correction to that total. Neither is equivalent to the previous company-level count benchmark. The frozen executable protocol is `experiments/group_turnover_trees_v1/protocol.json`; its generator manifest declares new disjoint train seeds 18101–18220 and test seeds 18301–18360.

January 2021 onward constructed histories train at June 2025, with all target labels released by October 2025; held-out histories forecast at June 2026 and score July–September labels as available October 2026. Each seed defines one company history; groups, months, and scenario variants are correlated. The later scoring cutoff is retrospective, never a forecast input.

The original stock/flow, group allocation, complementary suppression, release replay, recent-three and calendar seasonal baselines remain unchanged. A visibly local copy of the original signal generator changes only imports and the explicit seed manifest; no original frozen-seed guard is bypassed silently. Models receive six released count lags and, in the signal arm, the existing released binary aggregate flag. They receive no seed, scenario, shock assignment or future outcome. A missing or delayed flag falls back to its paired lag-only model. Suppressed or history-ineligible rows have no feature vector, predictions or persisted actuals.

Fit fixed random forest, gradient boosting and standardized Ridge residual regressions independently for group A/B, target month 1/2/3 and direct quarter total, alongside original recent/seasonal and fixed intercept/signal-cell residual means. No test tuning, prediction interval, rates, individual scoring or real-world efficacy claim. Groups C/D remain unsupported; October–December outcomes remain reserved and unsupported.

The prespecified adoption rule requires at least 5% informative-scenario MAE improvement over every comparator and no more than 10% degradation against any comparator in any scored scenario. Missing/incomplete reporting and short-history controls must block. Support requires every one of 60 intended test histories per scored scenario and at least 100 training histories. All checks are conditional descriptive simulation evidence, not production approval.

**Decision: reject RF and gradient boosting for all supported A/B targets and both feature arms. Groups C/D remain unsupported.** There are 32 supported model decisions (2 groups × 4 targets × 2 arms × 2 tree methods), all rejected, plus 32 unsupported C/D decisions. Retain the existing methods; no production change is proposed.

## Data qualification and scope

Training has 120 eligible histories for each of A and B in each of the informative and no-signal scenarios. Released binary cells contain 58 and 62 histories. Groups C/D have zero eligible histories because native suppression remains binding. All fit labels were available by October 31, 2025 and precede the June 2026 test origin. There are 960 training scenario/group rows, 32 fitted group/target/arm/scenario configurations, and four explicit unsupported fit records.

Testing retains exactly 60 new seed histories per scenario: 1,680 scenario/group rows and 13,440 target/arm result rows. All 60 A/B histories score in each of the five numeric scenarios; all short-history and incomplete-reporting controls block, and C/D never emit a numeric actual, feature vector or forecast. The monthly predictions are for July, August and September from the June 30 origin, whose last released count month is May. Thus their leads from the last released observation are two, three and four months. Direct quarter total is separately fitted; it is not the sum of three separately fitted tree predictions.

No-signal is a separately trained information ablation, matching the original signal experiment, not transport of the informative model into a changed relationship. Reversal, delayed signal and missing signal retain the informative training fits without refitting. This generator uses the original stationary stock/flow family with imposed target-quarter shocks; these failures do not establish results for every other original workforce generator family. A negative adoption decision does not require claiming coverage of those untested families.

## Informative-scenario count error

Each row below uses the same 60 histories for all six methods. Units are voluntary exits. “Simple” is the fitted intercept correction in the lag-only arm and the fixed two-cell signal residual correction in the signal arm; the latter quarter target is the existing observable-signal comparator. Monthly cell corrections extend the same definition to monthly labels.

| Group | Target | Features | Recent | Seasonal | Simple | Ridge | RF | GB | Decision |
|---|---|---|---:|---:|---:|---:|---:|---:|---|

| A | month-1 | lag-only | 20.994 | 23.067 | 18.423 | 18.760 | 19.111 | 19.388 | Reject both |
| A | month-1 | released-signal | 20.994 | 23.067 | 13.804 | 13.958 | 15.296 | 16.157 | Reject both |
| A | month-2 | lag-only | 21.006 | 23.850 | 19.626 | 19.390 | 20.499 | 21.150 | Reject both |
| A | month-2 | released-signal | 21.006 | 23.850 | 14.261 | 14.305 | 15.598 | 16.659 | Reject both |
| A | month-3 | lag-only | 18.461 | 23.217 | 17.040 | 17.074 | 17.800 | 18.070 | Reject both |
| A | month-3 | released-signal | 18.461 | 23.217 | 12.178 | 12.440 | 13.374 | 14.733 | Reject both |
| A | quarter-total | lag-only | 59.617 | 65.833 | 54.721 | 55.111 | 56.655 | 58.308 | Reject both |
| A | quarter-total | released-signal | 59.617 | 65.833 | 38.482 | 39.188 | 41.990 | 44.293 | Reject both |
| B | month-1 | lag-only | 19.339 | 23.383 | 16.982 | 16.987 | 16.735 | 16.931 | Reject both |
| B | month-1 | released-signal | 19.339 | 23.383 | 13.553 | 13.613 | 13.746 | 14.674 | Reject both |
| B | month-2 | lag-only | 19.444 | 22.417 | 17.218 | 16.907 | 16.538 | 16.823 | Reject both |
| B | month-2 | released-signal | 19.444 | 22.417 | 12.867 | 13.013 | 12.041 | 13.204 | Reject both |
| B | month-3 | lag-only | 17.578 | 20.600 | 15.650 | 15.228 | 15.055 | 15.015 | Reject both |
| B | month-3 | released-signal | 17.578 | 20.600 | 11.917 | 11.592 | 11.450 | 12.351 | Reject both |
| B | quarter-total | lag-only | 55.350 | 62.900 | 49.294 | 48.742 | 47.809 | 48.861 | Reject both |
| B | quarter-total | released-signal | 55.350 | 62.900 | 36.064 | 35.436 | 34.910 | 36.666 | Reject both |

RF on group B's second monthly target with the signal is the only candidate clearing every informative-scenario benefit threshold. It still fails reversal: MAE 23.460 versus recent-mean 18.833 and seasonal 20.150, exceeding the 10% degradation limit. No favorable scenario is promoted after that failure.

For the signal quarter target in group A, RF/GB improve over recent mean but are worse than both matching-input Ridge and the existing cell-mean adjustment. For group B, signal RF improves only 1.48% over Ridge and 3.20% over the cell means, below the required 5%. Reversal then raises group B signal RF/GB MAE to 67.347/65.673 versus recent mean 52.983 and seasonal 54.733.

## Ablation and stress results

| Group | Scenario | Recent | Seasonal | Simple signal/fallback | Ridge signal/fallback | RF signal/fallback | GB signal/fallback |
|---|---|---:|---:|---:|---:|---:|---:|
| A | informative | 59.617 | 65.833 | 38.482 | 39.188 | 41.990 | 44.293 |
| A | no-signal | 49.817 | 52.567 | 54.517 | 53.822 | 56.298 | 55.228 |
| A | reversed | 51.217 | 53.533 | 68.501 | 67.591 | 67.151 | 64.316 |
| A | delayed-signal | 59.617 | 65.833 | 54.721 | 55.111 | 56.655 | 58.308 |
| A | missing-signal | 59.617 | 65.833 | 54.721 | 55.111 | 56.655 | 58.308 |
| B | informative | 55.350 | 62.900 | 36.064 | 35.436 | 34.910 | 36.666 |
| B | no-signal | 52.533 | 54.083 | 56.244 | 54.858 | 55.020 | 56.542 |
| B | reversed | 52.983 | 54.733 | 67.782 | 65.141 | 67.347 | 65.673 |
| B | delayed-signal | 55.350 | 62.900 | 49.294 | 48.742 | 47.809 | 48.861 |
| B | missing-signal | 55.350 | 62.900 | 49.294 | 48.742 | 47.809 | 48.861 |

The signal helps in its imposed stable association; it reverses value when the association reverses. Trees do not fix this dependence. Absent or unavailable signals produce exactly the corresponding lag-only predictions, including the simple intercept fallback. These are availability controls, not learned imputation. Reporting-incomplete and short-history variants produce zero forecasts for every method and target. The complete evidence retains every intended row, blocked reason, MAE, RMSE, signed bias, paired MAE difference and all 101 failed threshold comparisons (68 informative benefit checks and 33 stress checks).

No confidence interval, calibration guarantee or demographic fairness claim follows. The unit is the seed history, not each of its correlated groups, targets, arms or scenarios. No future exposure denominator is known, so group turnover rates remain unsupported. October–December outcomes are not generated or scored. Existing interval qualification is not inherited by the tree methods.

## Reproduction and custody

Protocol commit: `1dda801`. Implementation freeze: `347ad57`. Training histories and fitted-prediction audit frozen before test generation: `e37c6cc`. The generation clone is byte-identical to the original after only its explicitly tested import substitutions. The new manifest guards reject original or wrong-split seeds; original files and their seed guards are unchanged. The cloned `generator-protocol.json` retains legacy model/evaluation narrative metadata from the source experiment; those sections are not used by this generator or model runner. The new `protocol.json` is authoritative for all model settings, sample counts, comparisons and decisions in this study.

```sh
node --test experiments/group_turnover_trees_v1/test_extract.mjs
python -m unittest experiments.group_turnover_trees_v1.test_run -v
python -m experiments.group_turnover_trees_v1.run check
```

The frozen stage sequence was `train`, commit its two evidence files, then `evaluate`. `check` verifies source/runtime custody, refits all frozen models to exact training-prediction hashes, regenerates held-out histories, and requires byte-identical test/report artifacts. Training history regeneration was separately compared byte-for-byte. The source manifest includes all numerically used generation/evaluation modules; the transitive `predictive-readiness.ts` import reached through the unused vintage validator is not included and is not invoked numerically here.

Guard tests: **7 Node + 10 Python passed**, covering original generator/base prediction parity, native suppression, blocked support, delayed/future signal releases, unknown fields, post-origin outcome mutation, arbitrary model-feature rejection, unchanged predictions under outcome/metadata mutation, frozen thresholds and independent hand-calculated metrics. Independent source review found no material leakage, input fairness or scoring issue.

Artifacts:

- `docs/evidence/group-turnover-trees-v1/training-rows.json.gz`: training inputs and allowed labels, with C/D nulls.
- `docs/evidence/group-turnover-trees-v1/training-fit.json`: source/runtime fingerprints and per-model fit audit.
- `docs/evidence/group-turnover-trees-v1/test-cases.json.gz`: every held-out input/label row and prediction.
- `docs/evidence/group-turnover-trees-v1/report.json`: complete metrics and decisions.

Report SHA-256: `619fbef2ed6370a2479aa453e4b0c1a1336988bf085620b06c00dcba04bc9089`.

Independent final audit recomputed **13,952 numeric, decision and fallback comparisons** across all 1,680 raw cases and 13,440 prediction rows, checked 20 source hashes, and confirmed every decision, paired difference, release clock, quarter reconciliation, suppression and blocked-control/fallback invariant. Held-out report/test bytes and training-history bytes reproduced exactly.
