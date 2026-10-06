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

Results will be appended after the frozen experiment. No production, shared UI, database, security, eNPS or planner path changes are part of this study.
