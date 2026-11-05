# Hiring prediction improvement assessment — 5 November 2026

## Decision

Keep the current Explore demo unchanged. A fixed 50/50 blend of calendar-trend regression and recent-history probability **fails the prespecified robustness gate**. It improves probability errors over the recent-history baseline in stable and improving simulations, but worsens them after reversal. Balanced accuracy remains 50%. This is a negative result for one defensible candidate, not proof that all possible models have been exhausted.

The user authorized continued predictive development, with the confusion matrix only on request. No threshold, generator, app data or reader result was changed to manufacture better performance. This research incurs $0 provider spending and needs no runtime deployment or database migration. The live PR564 result and its saved message versions remain intact.

## Experiment custody and scope

Protocol and evaluator were committed together at `a0339d36` **before scoring**. [Protocol](hiring-blend-protocol.json); [full reproducible evidence](evidence/hiring-blend-holdout-v1.json). Earlier v1 results informed this candidate, so those earlier results are development evidence, not an untouched assessment reused for selection.

Seeds 91301–91330 were not in v1. All three unchanged generating families are retained: 90 simulated histories, 270 test cohorts, 23,400 simulated openings. Training uses mature released cohorts available on 1 January 2025. All forecasts for January–March are constructed before any July scoring snapshot is requested. Every case, fitted coefficient, forecast, outcome, confusion count and source hash is retained. Text hashes normalize line endings only.

This is fresh chronological synthetic assessment with **known mechanisms**, not blinded mechanisms or real-world validation. It does not predict the October company dataset, current vacancies or individuals. The same seed across families intentionally supplies matched simulated histories; neither those families nor the openings within cohorts are independent company observations. There is no significance or confidence-interval claim.

The candidate is fixed equal weighting, without search, tuning or family-specific selection. Threshold remains inclusive 0.5. Pooled-history, recent-three-cohort and logistic-trend results are all reported. The necessary gate requires strictly lower Brier and log loss than recent history in every family, without lower balanced accuracy. Passing that gate alone would not qualify an operational classifier.

## Results

Lower Brier and log loss are better. Each family contains 7,800 openings.

| Family | Recent Brier | Blend Brier | Recent log loss | Blend log loss | Blend balanced accuracy |
| --- | ---: | ---: | ---: | ---: | ---: |
| Stable | 0.245044 | 0.244662 | 0.683217 | 0.682438 | 50% |
| Improving | 0.236318 | 0.234457 | 0.665587 | 0.661780 | 50% |
| Unexpected reversal | 0.295338 | 0.307736 | 0.785112 | 0.810651 | 50% |

The blend is less wrong after reversal than pure trend regression (Brier 0.321203), but worse than recent history. This trade-off does not meet the gate. Pooled history happens to perform best after reversal (0.213763) and stable conditions (0.244432), but performs poorly during improvement (0.285175). Selecting a different winner using each test family's identity would be hindsight, not a deployable method.

All four methods predict only one class within each family across these test histories. The apparent 73.35% reversal accuracy of pooled history is an all-negative prediction, with zero recall and 50% balanced accuracy. Do not present it as a successful classifier upgrade.

## Why more complexity is not the next automatic step

Only calendar month enters the fitted model. Within a monthly cohort, every opening has the same probability and decision; there are no opening-level explanatory features. In the generator, the improving and reversal families are identical before assessment. A regression test verifies identical fitted models and predictions for every matched pair despite different later outcomes. An unannounced future regime change cannot be inferred from these identical histories. More complex fitting alone cannot resolve this missing information.

This finding does not rule out modest probability improvements or a different justified decision threshold. It does rule out claiming that changing a threshold adds explanatory information. Thresholds should follow a defined decision and costs, with development-only selection and a new frozen assessment, not an attempt to make the confusion matrix look better.

## Next concrete options

1. **Qualify existing company opening/outcome history before adding model complexity.** Audit opening-known role/location and event availability, completed 90-day follow-up including cancelled/unresolved searches, and historical revisions using the existing [source-gap register](predictive-analytics-roadmap.md). Final statuses or bulk-import timestamps cannot establish historical feature availability. This would establish whether a richer aggregate model is supportable; it does not promise improved scores.
2. **If a richer synthetic teaching experiment is wanted, define it separately.** Prespecify meaningful opening-known group features, heterogeneous outcomes and stress conditions in a separately labeled generator/version, with a new development/assessment boundary. Do not rewrite the current company dataset, retrofit easy predictors or present planted signal as discovery. That is a new data-model design choice, not completed work in this assessment.
3. **Keep the present probability/evaluation demonstration honest.** The existing local Explore path already does this and retains request-only matrices. No runtime change is justified by this experiment.

## Verification

Seventeen focused tests pass: four new blend tests, four original classifier tests and nine existing Explore integration tests. New checks cover exact fixed weights and input preservation, all-family gate failure conditions, all-training-before-scoring order, all 90 histories/fresh seeds, full artifact reproduction, and identical pre-reversal fitted predictions. Existing tests retain future-label isolation, incomplete-release rejection and request-only matrix/AI-context behavior.

```sh
node tests/manual/evaluate-hiring-blend.mjs --check
node --test tests/hiring-blend-holdout.test.mjs tests/hiring-classifier-evaluation.test.mjs tests/release-hiring-prediction.test.mjs
```

CI now reproduces the report and runs the new checks alongside the original frozen report. Existing report bytes and application source are unchanged. No fresh browser or provider-answer acceptance is claimed for this research-only change; PR564's public verification remains the runtime record.
