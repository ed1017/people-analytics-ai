# Group turnover forest and boosting coverage

This isolated offline experiment fills two gaps: the group count forecaster emits individual monthly counts and a distinct three-month total, while the observable-signal model predicts a correction to that total. Neither is equivalent to the previous company-level count benchmark. The frozen executable protocol is `experiments/group_turnover_trees_v1/protocol.json`; its generator manifest declares new disjoint train seeds 18101–18220 and test seeds 18301–18360.

January 2021 onward constructed histories train at June 2025, with all target labels released by October 2025; held-out histories forecast at June 2026 and score July–September labels as available October 2026. Each seed defines one company history; groups, months, and scenario variants are correlated. The later scoring cutoff is retrospective, never a forecast input.

The original stock/flow, group allocation, complementary suppression, release replay, recent-three and calendar seasonal baselines remain unchanged. A visibly local copy of the original signal generator changes only imports and the explicit seed manifest; no original frozen-seed guard is bypassed silently. Models receive six released count lags and, in the signal arm, the existing released binary aggregate flag. They receive no seed, scenario, shock assignment or future outcome. A missing or delayed flag falls back to its paired lag-only model. Suppressed or history-ineligible rows have no feature vector, predictions or persisted actuals.

Fit fixed random forest, gradient boosting and standardized Ridge residual regressions independently for group A/B, target month 1/2/3 and direct quarter total, alongside original recent/seasonal and fixed intercept/signal-cell residual means. No test tuning, prediction interval, rates, individual scoring or real-world efficacy claim. Groups C/D remain unsupported; October–December outcomes remain reserved and unsupported.

The prespecified adoption rule requires at least 5% informative-scenario MAE improvement over every comparator and no more than 10% degradation against any comparator in any scored scenario. Missing/incomplete reporting and short-history controls must block. Support requires every one of 60 intended test histories per scored scenario and at least 100 training histories. All checks are conditional descriptive simulation evidence, not production approval.

Results pending the frozen implementation, training audit and held-out evaluation.
