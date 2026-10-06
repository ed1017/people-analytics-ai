# Conditional hiring duration: frozen RF and boosting comparison

This is an offline comparison for the existing `log1p(opening-to-actual-start days)` target in `origin/cloud-hiring-holdout-verified` (`9efd7eff9593c3c2447674b7fa098651ecee931c`). It is distinct from the existing 90-day all-opening start fraction. The target is conditional on a completed external fill. It cannot predict whether an opening fills, adjust for informative censoring, or establish assignable staffing capacity.

The four reference TypeScript modules under `experiments/hiring_duration_trees_v1/reference/` are byte-identical snapshots of that revision, tested against Git. The native evaluator supplies all membership, cohort eligibility, chronological boundaries and median baselines. Native development-selected Ridge is the numerical reference; Python Ridge predictions must agree within `1e-8` days in all four folds before any result is emitted.

## Frozen design, before evidence seeds

The protocol and complete implementation are committed before generating any history with seeds 28501–28520. Seed 17 is reserved for implementation tests, not evidence. The 20 seeds are independent synthetic histories; scenarios reuse seeds and are correlated stresses, not additional independent replicates. No tree hyperparameter search, holdout selection or post-test feature change is allowed.

Each history has monthly openings from January 2021 through September 2026, normally 20 openings per month; small-support histories have four. These are newly invented histories, not the app's small static demo sample or real employment records. Openings have dated start, closure and first-observed timestamps. One opening every third month is cancelled, retained in the denominator and unscored. The generator supplies deterministic complete-cohort declarations for its own invented records; this does not verify any external source.

Duration is generated in log space from seasonality and noise, capped at 8–120 days. Separate stresses use nonlinear seasonality, no calendar signal, gradual upward duration drift after January 2025, a 30-day label-publication lag instead of two days, missing label timestamps, and small support. These stresses test explicitly documented mechanisms; they are not independent evidence about the world's true data-generating process.

All trees and Ridge receive exactly the same opening-month sine/cosine columns. Preprocessing uses only each fold's available training labels. Candidate trees have fixed settings in `protocol.json`; targets are log-transformed and all predictions are back-transformed with the same nonnegative rule. Ridge alone preserves its existing development selection among penalties 0.1, 1 and 10. This gives the incumbent its established selection procedure, without selecting either tree on held-out outcomes.

The native development cohorts are July–September 2025, October–December 2025 and January–March 2026. Each model is refitted using labels available at that fold's opening boundary. The held-out cohort opens April–June 2026; models are fitted before April 1 and labels are observed through October 3, 2026. The experiment predicts conditional duration for that three-month opening cohort, not a separately trained one-/three-/six-month event probability. Opening calendar is known metadata; no observed start, closure or acceptance field is a predictor.

All existing eligibility rules remain intact: at least 24 months' opening coverage/calendar history, 60 available training labels, 20 labels per development fold, 30 holdout labels, at least 90% observed within every cohort, complete opening provenance declarations, valid dated labels and a rolling baseline. Training labels require start, closure and first observation by the fold boundary. Blocked histories receive no tree fit or candidate accuracy claim. No cancellation imputation, relaxed gate or inverse-censoring correction is introduced.

## Decision criteria

Each tree must beat Ridge and both rolling/expanding medians on the reference seasonal holdout by at least 10% and two days MAE; its paired history-seed bootstrap 95% upper endpoint must be below zero. At least two reference development folds must meet the same improvement threshold and no reference development fold may worsen MAE by over 5%. Holdout mean seed-level p90 absolute error must not worsen by over 5% in any qualified scenario; stress MAE must not worsen by over 10%. Each scored scenario needs all 20 qualified seeds. Missing-label and small-support histories must remain blocked. Every applicable gate must pass for `adopt-for-synthetic-demo`; otherwise reject. Unsupported scope is reported explicitly. The bootstrap describes uncertainty across these invented histories, not real-world or individual forecast uncertainty.

## Reproduction

From the repository root:

```sh
python -m unittest experiments.hiring_duration_trees_v1.test_run -v
python -m experiments.hiring_duration_trees_v1.run evaluate
python -m experiments.hiring_duration_trees_v1.run check
```

`evaluate` refuses to overwrite preserved evidence. `check` regenerates both aggregate artifacts in a temporary directory and requires byte identity. Persisted reports contain seed/scenario/fold metrics, source hashes, qualification counts and native Ridge parity; no requisition rows or IDs are published. The local Node bridge holds reference IDs in memory solely to ensure aligned comparisons.

The results below follow the frozen experiment. No production, shared UI, database, security, eNPS or planner path changes are part of this study.


## Results: reject both trees

Protocol and implementation freeze: `55946691d8430d185d47f4903213fa0cd52e0392`, before evidence-seed generation. Both candidates receive **reject** under the preregistered scope. Keep the existing baselines/reference; no production model adoption is authorized by this study.

One hundred of 140 seed/scenario histories qualify: all 20 seeds in each of five scored scenarios. All 20 missing-label and all 20 small-support histories are blocked. The 400 qualified fits have 60 openings per scoring cohort and normally 59 scored completed fills, with one retained cancellation. Three development cohorts have only 58 observed labels because an additional fill has not matured by the evaluation boundary. The unchanged native evaluator excludes these labels. Each holdout has 59 scored labels, totaling 5,900 scored holdout openings across the five scenarios; correlated scenario variants are not independent replicates.

Mean seed-level holdout MAE, in days (lower is better):

| Scenario | Ridge | Expanding median | Rolling median | RF | Gradient boosting |
|---|---:|---:|---:|---:|---:|
| seasonal | 4.906 | 8.695 | 8.897 | 4.954 | 4.945 |
| nonlinear-seasonal | 5.392 | 4.311 | 4.236 | 5.517 | 5.874 |
| no-signal | 4.225 | 4.228 | 4.239 | 4.253 | 4.242 |
| gradual-drift | 17.300 | 23.497 | 19.267 | 16.988 | 17.194 |
| delayed-labels | 4.906 | 8.748 | 9.739 | 4.951 | 4.944 |
| missing-labels | unsupported | unsupported | unsupported | blocked | blocked |
| small-support | unsupported | unsupported | unsupported | blocked | blocked |

Both trees beat the medians in the reference seasonal world but fail to improve on equal-feature Ridge. Their reference MAE differences from Ridge are positive: RF +0.048 days, boosting +0.039 days. The paired history-seed 95% intervals are respectively [+0.0114, +0.0865] and [+0.0041, +0.0795] days. This provides no evidence of an RF/boosting advantage for the existing target and features.

Both also fail nonlinear-seasonal stress against the two medians, exceeding the 10% MAE-worsening allowance. Their nonlinear-stress p90 errors exceed the 5% allowance against Ridge and both medians. Each candidate accumulates eight preregistered failure codes; every code and per-fold metric is retained in the JSON report. Improved drift means are not used to rescue a candidate that fails the complete scope.

Missing-label histories fail timestamped-label-history and observation-fraction qualification. Small-support cohorts have only 12 openings and 11 completed labels, below the unchanged 20-development/30-holdout label minima. These are **unsupported**, not negative accuracy results. Their labels are never used to fit either tree.

This closes RF and gradient-boosting comparison for the implemented calendar-only conditional duration target. It does not add performance/promotion predictors to a contract that only accepts calendar predictors, create an all-opening duration target, validate censoring correction, or claim prediction-interval calibration. No alternative hyperparameters were tried after observing these outcomes.

## Validation and preserved evidence

Both aggregate artifacts were regenerated byte for byte by the complete `check` command. Eight implementation tests pass, including byte-identical reference sources, native chronological memberships, unavailable training labels, fail-closed eligibility, numerical Ridge parity and held-out-outcome mutation invariance. Across all 400 qualified fold fits, maximum Python/native QR Ridge prediction discrepancy is `2.63e-13` days (tolerance `1e-8`). A separate arithmetic audit independently recomputed all 300 scenario/fold/model summary values from saved seed metrics and checked source hashes, cohort counts, both decisions and absence of published requisition data.

- [Aggregate report](evidence/hiring-duration-trees-v1/report.json)
- [Seed/scenario/fold aggregate evidence](evidence/hiring-duration-trees-v1/cases.json)

- `report.json` SHA-256: `a7b6ea661ed1d5cfcab4594a4770e2a906eadb89afe777e905c8ddb8274a3bb3`
- `cases.json` SHA-256: `3a3557b9c622192b29ecc62394823f8c8d0c67aa4a054160e8df3d2380e7c10d`
