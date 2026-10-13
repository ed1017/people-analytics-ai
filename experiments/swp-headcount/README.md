# Conditional retrospective company-headcount experiment

Offline only. No runtime caller, endpoint, cost or subgroup model, future forecast, interval, database access, LLM call or deployment. Source-completion and origin-vintage evidence remain unknown. The captured history is user-declared synthetic. Results cannot establish operational accuracy.

## Protocol frozen before this experiment's holdout evaluation

Use the existing qualified company month-end stock definition and captured aggregate extract `tests/fixtures/aggregate-exit-history.json` (its `monthEndHeadcount` field only). The 33 values sum to 304,203 snapshot rows, matching the qualification checkpoint. The manifest's primary source describes exits; its headcounts come from the separately documented snapshot query in `docs/aggregate-exit-qualification.sql`. No exit targets or synthetic-workforce-generator values are used. This reuse does not independently authenticate the extract or establish source vintages.

Four methods, no hyperparameter search:

1. Last observed headcount at every horizon.
2. Drift: last value plus horizon times (last minus first)/(training length minus one).
3. Annual seasonal naive: same month in the preceding year. Mechanically feasible with 12 months, but limited evidence for stable seasonality.
4. Fitted ordinary-least-squares linear trend: intercept and slope fitted on all observations available at each origin, then extrapolated. No regularization, covariates or seasonal terms.

All forecasts are floored at zero, unrounded; fractional expected stocks are allowed for scoring. Training expands from 12 to 21 months across ten development origins (December 2024–September 2025). Every origin predicts six months. Last development target is March 2026. MAE averages all 60 origin/horizon pairs equally; overlapping targets are intentionally counted once per forecast task. These are 15 unique target months and correlated errors, not 60 independent samples. Report RMSE and signed prediction-minus-actual bias, plus per-horizon and per-origin errors.

Choose the simplest method in the order above whose MAE is within 1% of the minimum development MAE. Freeze the protocol, development input hash, predictions, selection and window dates in `frozen.json` before evaluating the holdout. Refit the selected method using January 2024–March 2026, then score April–September 2026 once. Report the other methods on the same holdout for transparent comparison; do not reselect or tune using those scores.

Prespecified exploratory further-work criterion: selected development MAE at least 10% below last-value, strict origin-level wins in at least 6/10 development windows, and selected holdout MAE no worse than last-value. This heuristic asks whether further investigation is worthwhile; it is neither a business acceptance threshold nor statistical significance or operational qualification. Failure does not authorize searching the holdout for another model.

The final six months are excluded from this experiment's model selection and scoring until the freeze. They already existed in the source repository and prior qualification work; this is not a prospective blind or preregistered confirmatory study. No uncertainty intervals or confidence claims are made from this small, overlapping evaluation.

## Reproduce (Node 24; no package installation)

From repository root, first run `node --test tests/swp-history-qualification.test.mjs tests/swp-headcount-baselines.test.mjs`.

Prepared inputs and original result files are retained for review. To reproduce selection into new paths:

```sh
node experiments/swp-headcount/run.mjs develop experiments/swp-headcount/development-history.json /tmp/swp-reproduced-freeze.json
node experiments/swp-headcount/run.mjs holdout experiments/swp-headcount/holdout.json /tmp/swp-reproduced-freeze.json /tmp/swp-reproduced-results.json
```

Fresh output paths are required; the runner refuses overwrites. Freeze timestamps and downstream freeze hashes change on reproduction; numerical predictions and scores must match. `prepare.mjs` documents deterministic extraction and runs only when prepared files do not yet exist. Test fixtures are explicitly authored and never used as observed experiment data. Tests check analytic predictions, metrics, chronology, target perturbation isolation, selection, physical absence of a holdout file during development, frozen-input consistency and tampering rejection.
