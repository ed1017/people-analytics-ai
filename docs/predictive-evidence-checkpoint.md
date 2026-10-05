# Predictive evidence checkpoint

This local checkpoint connects the existing readiness validator to the offline forecast-preview reproduction workflow. It preserves PR126's preview component, generated preview artifact, evaluator and forecast protocol byte-for-byte. It adds no UI, Action Planning integration, model service, database access, schema change or production release.

The outcome is **tested evaluation machinery, not newly validated workforce forecasts**. Existing historical evidence remains insufficient for operational point-in-time evaluation. The [machine-readable checkpoint](evidence/predictive-evidence-checkpoint.json) contains exact training/scoring windows, predictions, actuals, monthly/horizon/quarter errors, blockers and SHA-256 identities. Hashes identify local inputs/code; they do not authenticate source truth.

## Existing evidence reused

No new source query was made. The [turnover source audit](aggregate-exit-forecast.md), [readiness inventory](predictive-readiness-proposal.md) and its linked hiring/satisfaction audits are the evidence anchors. The existing turnover extract has 33 snapshot months, Jan 2024–Sep 2026; 32 months have underlying separation events. January's join-supplied zero remains unknown/excluded. Calendar-boundary events do not prove completion.

The source rows were bulk inserted on Sep 28, 2026, after the historical origins and before some September event dates. Source-first-observed times, revision vintages and scoped completion are absent/unverified. The checkpoint maps those unknowns to null instead of using insertion/event dates as availability. The adapter uses a local revision-1 envelope solely to represent the captured extract; this is not recovered source revision history. The readiness adapter's `company-extract` class means an existing source extract; its original provenance remains **user-declared synthetic**, never verified real-world history. Satisfaction/hiring get empty unavailable contracts because their previous audits did not establish usable as-known history. Their missing inputs are not converted to generated company evidence.

All three source checks block forecasting; all three also block causal effects. No intervention/comparison outcomes were added. A structural contract pass elsewhere cannot override those source gaps.

## Retrospective preview benchmark reproduced unchanged

The existing evaluator trains from Feb 2024 through Jan, Feb and Mar 2026 (24/25/26 months); each origin predicts the next three months. These development folds cover Feb–Jun 2026: nine errors, five distinct target months. The chronological assessment trains Feb 2024–Jun 2026 (29 months), scoring Jul–Sep 2026. Its outcomes were already visible during qualification and previous iterations. It is **not an untouched or confirmatory holdout**.

| Method | Development MAE | Assessment MAE | Assessment RMSE | Assessment total signed error |
|---|---:|---:|---:|---:|
| Recent three-month mean | 3.926 | 2.333 | 2.380 | +3.000 |
| Seasonal naive | 4.222 | 5.000 | 5.260 | +15.000 |
| Simple exponential smoothing | 3.960 | 1.861 | 2.678 | −4.749 |

Errors are in exit counts; signed error is prediction minus recorded count. The existing development rule keeps recent mean. Smoothing's later assessment MAE does not change selection. The checkpoint reuses the preview generator and checks agreement on selected method/protocol fingerprint. It does not retune or claim fresh performance evidence. Rates, intervals and causal effects remain unavailable.

## Separately constructed rolling-origin exercise

`turnover-vintages-v1-seed-20261005` generates 36 aggregate monthly counts, Jan 2023–Dec 2025, with a simple seasonal wave, drift, bounded noise, a deliberately included zero and one delayed revision. The data and simulated observation/completion timestamps are newly constructed, wholly separate from the existing extract. This small fixture is not a calibrated workforce simulator. The seasonal structure naturally helps a seasonal comparator; its results say nothing about which method is better for the company. No seed/model/window search was performed to improve reported scores.

| Training period | Origin cutoff (UTC) | Scoring months |
|---|---|---|
| Jan 2023–Dec 2024 | Jan 1, 2025, 00:00 | Jan–Mar 2025 |
| Jan 2023–Mar 2025 | Apr 1, 2025, 00:00 | Apr–Jun 2025 |
| Jan 2023–Jun 2025 | Jul 1, 2025, 00:00 | Jul–Sep 2025 |
| Jan 2023–Sep 2025 | Oct 1, 2025, 00:00 | Oct–Dec 2025 |

The later scoring snapshot has cutoff Feb 1, 2026, 00:00 UTC. At each origin the existing validator reconstructs the latest known revision and checks declared completion, availability, population and target. The evaluator additionally requires exactly one known count per protocol month, checks snapshot scope and rejects conflicting values for the same revision. A Nov 2024 correction observed one millisecond after the Apr 1 cutoff is excluded from that origin but available at later origins.

Methods are fixed recent-three-month mean and twelve-month seasonal naive. There is no candidate fitting, tuning, winner selection or effect estimation. The targets are disjoint quarters, but expanding training sets overlap, so independence is not asserted. All fixtures and results are visible; this is a reproducible rolling-origin mechanics exercise, not a held-out real-world experiment.

| Constructed-data baseline | Monthly MAE (12 errors) | Monthly RMSE | Monthly bias | Quarter-total MAE (4 quarters) |
|---|---:|---:|---:|---:|
| Recent three-month mean | 6.583 | 8.043 | −1.083 | 17.750 |
| Seasonal naive | 4.500 | 5.148 | −2.667 | 8.000 |

The report also preserves each horizon and each fold. Scoring failures retain valid predictions but expose no actual/error values or aggregate comparison. Training failures produce no predictions for that fold. A partially blocked run never silently averages only the successful folds. No interval, turnover rate, goal probability or causal benefit is produced.

## Minimal source requirements for the next evidence increment

Shared: versioned source/population/metric definitions; actual observation timestamps; revision IDs and predecessors; scoped completeness status, covered-through period, actual recorded time and evidence reference at each origin and scoring cutoff. Preserve null, suppressed and confirmed-zero statuses. Do not backfill historical availability with calendar dates, ingestion dates or simulated times. A future prospective snapshot process could build evidence when historical vintages cannot be recovered, but this checkpoint does not implement or authorize source capture.

| Domain | Required aggregate outcome contract and evaluation conditions |
|---|---|
| Turnover count | One count per defined calendar month/population, voluntary classification and revisions; reconcile event-empty months against completion. At least twelve prior calendar months are mechanically necessary for the current seasonal comparator, plus observed targets for the intended horizon; this is not an adequacy threshold. This fixed constructed protocol uses 24/27/30/33-month prefixes and twelve scoring months. Rates additionally require matching measured risk exposure/person-time and explicit future exposure assumptions. |
| Satisfaction | Comparable observed waves with instrument, items, scoring, eligibility and population versions; wave close and label availability; respondent favorable-share numerator/valid respondent denominator; eligible count only for participation; missingness and reviewed cell/complementary/query-set suppression. Do not relabel mean answer share as percent satisfied employees or use independent eNPS. Qualify wave cadence and number before choosing a forecast protocol. |
| Hiring | One chosen role with the complete opening cohort, preserving open/cancelled/no-show dispositions, stage definitions, actual starts and their availability/revisions. Accepted/hire/planned-start dates cannot substitute for actual start; capacity is separate. Establish maturity using a fixed follow-up horizon or a justified censoring-aware estimator before reporting error on completed starts alone. Only opening-known inputs belong in an opening-time model. |
| Causal effects | Dated assignment and comparison design, independent assigned units, aligned pre/post outcomes in both arms, adherence/exposure and missing follow-up, contemporaneous changes and design-specific identification analysis. Ordinary forecasts and synthetic benefits cannot supply this evidence. |

## Reproduction and tests

With the existing dependencies and Node 24:

```sh
node tests/manual/predictive-evidence-checkpoint.mjs --check
node tests/manual/predictive-evidence-checkpoint.mjs --stdout > /tmp/predictive-evidence-checkpoint.json
node tests/manual/generate-exit-demo-presentation.mjs --check
node --test tests/turnover-vintage-evidence.test.mjs tests/predictive-readiness.test.mjs tests/aggregate-exit-forecast.test.mjs tests/exit-demo-presentation.test.mjs
```

The offline runner accepts no source override and no live mode. `--write` refreshes only the tracked checkpoint after an intentional local implementation change. Tests recompute metrics, enforce paired targets and blocked-fold handling, check late revision/future-label/scoring-snapshot isolation, preserve zero counts, reject unknown features/scope changes, and reproduce the exact report. No browser/build verification is needed for this offline-only change; the existing preview artifact check verifies that presentation generation remains unchanged.

Integration remains local. The new worktree starts from PR126 head `c67cdf4`, with the two prior readiness commits cherry-picked as dependencies. Parent can review this checkpoint and sequence integration; no source head was rewritten and no changes were pushed.
