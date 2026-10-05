# Frozen synthetic hiring selection protocol v1

This protocol is recorded before generating or inspecting the new test segment.
It is informed by the already inspected benchmark at
`397c6d50e2c878999be2821f0e184190425eeb49`; that benchmark is validation material,
not an untouched test. No previous artifacts or model parameters are changed.

- Candidates: existing fixed recent-three-mature-cohort fraction and fitted
  two-parameter logistic trend. Preserve fitting penalties and pseudocounts.
- Selection origin: July 1, 2025 UTC. Validation forecasts originate July 1, 2024
  and January 1, 2025, each scoring its following three opening months. Both
  scoring cutoffs must be at or before the selection origin.
- Select logistic only if its exact opening-weighted Bernoulli Brier score is
  strictly lower than recent cohorts in **both** windows. Otherwise use recent
  cohorts. Ties or insufficient validation choose recent cohorts. No threshold
  sweep, metric search, seed search, rolling adaptation or test-based switching.
- Refit both fixed candidates on all fully available training cohorts at July 1,
  2025. Predict the separate July–September 2025 opening cohorts once. Score at
  January 1, 2026. Do not feed these outcomes into selection or refitting.
- Preserve January 2021–March 2025 fixture rows exactly. Extend the synthetic
  generator to September 2025 with an explicitly separate deterministic PRNG
  stream. Keep all three scenarios (improvement, January 2025 reversal, stationary)
  and all three fixed seeds (17, 29, 43); publish all nine cases.
- Compare selected policy with fixed recent cohorts and fixed logistic using
  Brier, log loss, weighted cohort-fraction MAE and signed bias. Publish per-case
  differences and cases where selection loses, even if the conclusion is negative.
- Require at least 24 contiguous, mature training cohorts, current expected label
  availability, at least 30 openings in every training/validation cohort, and at
  least 20 observed starts and 20 non-starts in training. These are conservative
  experiment support limits, not empirically calibrated sufficiency or privacy
  guarantees. No subgroup models, subgroup pooling, or demographic slicing.
- Incomplete/censored coverage, partially released cohorts, calendar gaps, stale
  history and undersized training cohorts abstain; a fitted model must not invent
  their missing labels. An insufficient validation window may only fall back to
  recent cohorts after training support passes. Include explicit boundary tests.
- Report uncertainty as unavailable. This is one constructed generator with a
  small test segment; no operational calibration, real accuracy, source completion,
  causal effect, privacy certification or Action Plan target probability follows.

The outcome may justify a clearly labeled offline experimental synthetic comparison,
but cannot alone justify exposing selected forecasts as operational predictions.
No UI, production, database or remote publishing is part of this work.
