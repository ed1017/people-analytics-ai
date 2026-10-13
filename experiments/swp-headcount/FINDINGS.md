# Result: drift merits further conditional investigation

The development-selected drift baseline met the prespecified exploratory further-work criterion. The fitted linear trend did not beat drift. This is a conditional retrospective result on an existing synthetic aggregate extract, not an operational forecast or calibrated interval. No October–March future forecast is issued.

| Method | Development MAE | Development RMSE | Development bias | Holdout MAE | Holdout RMSE | Holdout bias |
|---|---:|---:|---:|---:|---:|---:|
| Last-value | 161.38 | 179.59 | -161.38 | 177.00 | 196.69 | -177.00 |
| **Drift (selected)** | **21.75** | **24.82** | **+21.69** | **2.27** | **2.37** | **-2.27** |
| Seasonal-naive | 587.50 | 587.98 | -587.50 | 575.67 | 575.71 | -575.67 |
| Fitted linear trend | 35.04 | 37.09 | +35.03 | 10.99 | 11.11 | +10.99 |

All errors are in people; bias is prediction minus actual. Development has 60 forecasts across ten overlapping origins and 15 unique target months. Holdout is one origin with six targets. No independence, significance or calibrated coverage is claimed.

Selection used development MAE alone, with a fixed 1% simplicity tie-break. Drift improved development MAE by **86.52%** against last-value and won **10/10** paired origin MAE comparisons. Its holdout MAE was also lower than last-value, satisfying the fixed three-part exploratory rule. This result does not justify reselecting from the holdout or searching additional models against it.

Drift development MAE by horizon 1–6: **6.21, 12.41, 18.82, 25.12, 31.23, 36.73** people. Its positive development bias grows with horizon. The far lower final-block error should not be treated as a stable future error estimate; the six held-out values follow an unusually smooth, near-linear path in this synthetic history. The original generator remains unidentified.

## Leakage and reproducibility evidence

- Protocol/method/test code committed at `42883ae` before development scoring.
- Selected drift, development predictions, exact input hash and criteria committed at `35d108a` before final holdout scoring.
- Development runner opens only a 27-month file. Every fit sees only its origin's prefix; target perturbation tests confirm forecasts do not use target values.
- All development targets end by March 2026. Final holdout trains through March and scores April–September 2026. No holdout error is a selection input; no retraining occurs between its six targets.
- CLI refuses overwriting freeze/results and verifies protocol/input hashes, windows, development scores and selected model before scoring the holdout. Git commits preserve chronology; hashes establish consistency, not trusted source provenance.
- Original numerical results were reproduced into new paths without changing selection or settings. This mechanical replay is a reproducibility check, not an additional independent trial.
- All 13 focused tests pass, including eight existing qualification tests; targeted ESLint and qualification TypeScript checks pass. Node emits its existing typeless-package module warning; no package configuration was changed.

The final block was untouched by this experiment's selection/scoring until the freeze, but its data were previously present in the repository and inspected in earlier work. Therefore it is not a newly blinded or prospective confirmatory holdout. Completion and as-known-at-origin history remain unknown. The 2026-10-05 captured extract has SHA-256 `64acf5cbb0cddbaa0614e20ee3895cd026ebe3ec9c91fed622820b53b44d63cd`; its 33 headcounts sum to 304,203, consistent with the subsequent qualification checkpoint. That checksum/count consistency is not a fresh live-source comparison.

## What this supports next

There is enough evidence for a bounded company-headcount baseline/scenario prototype carrying the conditional retrospective label, with drift as the reviewed baseline candidate and visible user assumptions separated from it. Further statistical validation needs additional independently released periods and source completion/vintage evidence. Retain last-value as a comparator. A richer seasonal model or broad search is unsupported by these 33 observations and this one reserved block.

Cost period/components/FTE basis and historical subgroup membership remain unresolved. No cost forecasts, subgroup models, staffing actions, efficacy claims, intervals, production changes or paid calls are included.
