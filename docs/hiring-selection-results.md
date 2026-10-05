# Chronological hiring selection: bounded synthetic result

The fixed selector provides a modest improvement over recent cohorts on these
constructed cases and avoids the fixed logistic model's reversal failure. It
does **not** consistently choose the better candidate: fallback loses to logistic
in four of nine test cases. No additional model or rule complexity is justified
by this small experiment.

## What was frozen and held separate

The rule was committed at `a62e6b1` before generating or inspecting the new test
segment. The earlier benchmark at `397c6d5` had already been inspected and informed
this rule; its old assessment is now explicitly validation material. Both original
checkpoints and reports are preserved unchanged, including `6d12bdd`.

Select logistic only when its opening-weighted Bernoulli Brier score beats the
recent-three-mature-cohort baseline in both validation windows. Otherwise select
recent cohorts, including ties and insufficient validation. There is no threshold,
seed, model-penalty or metric search and no test-driven switching. Candidates
retain the previous fitted logistic model and baseline smoothing unchanged.

| Stage | Forecast origin | Training end | Scored opening months | Label scoring cutoff |
|---|---|---|---|---|
| Past validation 1 | 2024-07-01 | 2024-03 | Jul–Sep 2024 | 2025-01-01 |
| Past validation 2 | 2025-01-01 | 2024-10 | Jan–Mar 2025 | 2025-07-01 |
| Separate test | 2025-07-01 | 2025-03 | Jul–Sep 2025 | 2026-01-01 |

The selection/test origin uses 51 mature training cohorts beginning January 2021.
Day-90 endpoint labels are released on day 92, so April 2025 is not available on
July 1. Selection and refitting occur before test outcomes are retrieved. The
test is used once for comparison, never for adapting the rule or refitting.
Tests prove that altering future counts cannot change selection or predictions.

The extended fixture preserves all original January 2021–March 2025 records
exactly. April–September 2025 uses a separate deterministic LCG stream initialized
with `seed XOR 0x9e3779b9`; all three prior seeds and scenarios are retained.
The reversal begins January 2025, so one completed validation window can detect
it. This experiment does not demonstrate advance warning of an unseen test-time
reversal. The data-generating mechanisms are inspectable and deliberately planted.

## Test metrics

Numbers below average three fixed seeds (17, 29, 43), whose cohort denominators
are identical. Each test has three monthly cohorts. Lower Brier, log loss and MAE
are better; MAE is opening-weighted cohort-fraction error in percentage points.
The machine-readable report retains all per-case metrics, signed bias, validation
comparisons, fitted coefficients, predictions, actual counts and source hashes.

| Scenario | Method | Brier | Log loss | MAE (pp) |
|---|---|---:|---:|---:|
| Improvement | Recent cohorts | 0.21594 | 0.62416 | 11.54 |
| Improvement | Fixed logistic | 0.20612 | 0.60320 | 6.14 |
| Improvement | Selected | 0.21104 | 0.61380 | 9.51 |
| Stable | Recent cohorts | 0.25647 | 0.70632 | 7.93 |
| Stable | Fixed logistic | 0.25463 | 0.70255 | 6.59 |
| Stable | Selected | 0.25647 | 0.70632 | 7.93 |
| Reversal | Recent cohorts | 0.21349 | 0.61906 | 5.09 |
| Reversal | Fixed logistic | 0.28009 | 0.75375 | 26.06 |
| Reversal | Selected | 0.21349 | 0.61906 | 5.09 |

The selector picks logistic only for improvement seed 43. It chooses recent
cohorts in the other eight cases. It matches recent cohorts in eight cases and
improves Brier by 0.01471 in one. It never loses to recent cohorts in this specific
test; that is not a robustness guarantee.

Fallback loses to logistic in these cases (selected minus logistic Brier):

| Scenario | Seed | Brier penalty |
|---|---:|---:|
| Improvement | 17 | +0.00862 |
| Improvement | 29 | +0.00612 |
| Stable | 17 | +0.00074 |
| Stable | 29 | +0.00495 |

Under reversal, selection reduces Brier relative to fixed logistic by 0.09196,
0.05107 and 0.05676 for seeds 17, 29 and 43 respectively. The practical lesson
here is to retain the simple recent baseline, not to advertise reliable winner
selection. Two validation windows are a weak basis for comparing small differences.

## Support, censoring and subgroup limits

The experiment abstains for fewer than 24 mature training cohorts, calendar gaps,
stale latest cohorts, incomplete status coverage, partially released buckets,
fewer than 30 openings in any training cohort, or fewer than 20 starts/non-starts
across training. All seven corresponding stress cases abstain with no predictions.
Missing/undersized validation can fall back only after training support passes;
it emits no small-cohort validation metrics. Test cohorts below 30 openings have
their metrics suppressed; this does not retroactively influence model selection.

Cancelled and unresolved day-90 cases remain in a complete fixed-horizon
denominator. Censored or missing follow-up is never relabeled as failure. Future
immature cohorts remain unavailable. No subgroup pooling, demographic slicing,
person-level scoring or operational small-group release is supported. The 30/20
limits are fixed experiment support rules, not statistically validated sufficiency
thresholds or privacy certification. A supplied fixture universe cannot prove
that absent source buckets never existed.

## What this justifies

This is suitable for a clearly labeled **offline experimental synthetic demo of
model comparison and fallback**, showing both wins and losses. It does not justify
presenting the selected fraction as a qualified Action Plan forecast, a calibrated
probability or evidence of real-world accuracy. No UI exposure was implemented.
The rule remains unchanged despite the four losses; more complex selection is
not supported by the current evidence.

Intervals and causal effects remain unavailable. Three seeds of one generator and
three test months cannot establish independent calibration, significance, subgroup
robustness or response to arbitrary regime shifts. Real evaluation still needs
complete all-opening cohorts, verified status/actual-start definitions and
historical availability/follow-up. The recovered survivor-selected source seed
does not provide that universe.

Reproduce with `node tests/manual/benchmark-hiring-selection.mjs --check` and
`node --test tests/hiring-model-selection.test.mjs`. The report is
`docs/evidence/hiring-selection-benchmark-v1.json`; `--write` explicitly regenerates
it. Existing reports are unchanged. No database, network source access, UI,
production or remote publishing is part of this checkpoint.

The selector is internal numerical orchestration, not an evidence-validation API:
it trusts supplied fold predictions and model metadata. The benchmark runner
recomputes them from the existing chronological evaluator; external cached model
outputs must not be substituted. Independent read-only review found no blocker
within this bounded path.

Validation: nine focused tests and all 1,103 repository tests passed, together with
TypeScript, focused ESLint, the new deterministic report check, all three prior
model/forecast artifact checks, and `git diff --check`.
