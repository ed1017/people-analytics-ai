# Opening-known synthetic hiring experiment

This is a separate teaching experiment, **not a change to company records or evidence of real hiring accuracy**. The earlier calendar-only test remains available in retained messages and its original report. Scores across these different generators are not an apples-to-apples model improvement.

## Frozen design and timing

The [protocol](opening-known-hiring-protocol.json) was committed at `2ea42105`; generator/model/evaluator and the opening-time clarification were frozen at `885ead31`. Development-only custody and gate tests were committed at `63d172ea` before assessment. Four development seeds (119001–119004) were used for implementation checks, including correction of a numerical convergence stopping condition. No feature, penalty, threshold or seed was selected using assessment results.

The new generator plants a logit relationship with three fictional binary process facts: defined scope, reserved interview panel and a flexible start window. The fixed intercept is -0.2 and each centered binary feature has coefficient +0.7. These are authored simulation parameters, not measured effects or recommended interventions. There are eight feature combinations; each normally contains 40 openings per month. In the mix-shift test the count becomes 10 + 10 times the number of true features. In reversal, all three slopes switch sign while the intercept stays fixed. Every family is reported.

Features are constructed separately from outcomes, with availability at the opening timestamp. Labels are simulated start-by-90-day counts, released on day 91; negatives split into cancellations (floor of 30%) and unresolved searches. Unknown future outcomes are never failures. There are no person identifiers, protected attributes or employee/candidate risk scores.

Training uses January 2022–June 2025 cohorts released before the frozen model origin, 1 October 2025. Predictions for October–December occur **at each opening**, using its then-known features; November/December features are not claimed known on October 1. No later test outcomes update the model. All predictions for all histories are materialized before the assessment outcomes are retrieved at 1 April 2026.

Twenty fresh seeds per family (120001–120020) yield 60 histories, 1,440 feature/month cells and 50,400 simulated openings. Seeds are new but mechanisms are known; this is not blinded or real-world validation. Matched seeds across scenarios and shared probabilities within cells mean these are not independent observations of real people. No confidence intervals or significance claims are made.

## Methods and prespecified teaching gate

The fitted model is penalized binomial logistic regression on the three centered binary features, with fixed slope penalty 1 and a near-unpenalized intercept. Damped Newton iterations fit eligible training counts. The overall-rate baseline uses all training outcomes with add-one smoothing. A stronger baseline remembers each of the eight feature-group rates with the same smoothing (unseen cells fall back to the overall rate). Both baselines are retained, so learning the planted grouping is not falsely attributed only to sophisticated modeling.

Threshold is inclusive 0.5, fixed before assessment. For stable and mix-shift cases the teaching gate requires logistic balanced accuracy ≥60%, Brier at least 0.02 below the overall baseline, and no more than 0.005 worse than the feature-group baseline. All cases/methods must retain complete accounting, finite probability errors and both observed classes. Reversal performance is not required to pass those thresholds: displaying its failure prominently is part of the educational design. This permissive **teaching gate is not a robustness or operational qualification gate**.

## Held-out results

| Scenario | Openings | Overall BA | Group BA | Logistic BA | Overall Brier | Group Brier | Logistic Brier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Stable relationships | 19,200 | 50.0% | 72.0% | 72.0% | 0.248664 | 0.190726 | 0.190662 |
| Changed opening mix | 12,000 | 50.0% | 69.8% | 69.8% | 0.254998 | 0.195143 | 0.195084 |
| Relationships reverse | 19,200 | 50.0% | 27.3% | 27.3% | 0.248503 | 0.425183 | 0.425281 |

BA means balanced accuracy; lower Brier is better. The teaching gate passes. Both feature methods recover planted signal in ordinary conditions, with almost identical results. Both fail badly after reversal and lose to the overall baseline. No meaningful superiority over the group baseline is demonstrated. Do not average away the stress failure or advertise 72% as real hiring accuracy.

[Full evidence](evidence/opening-known-hiring-v1.json) retains every case, fitted coefficient, prediction timestamp, opening feature, later outcome count, confusion count, log loss and source hash. Five fixed probability bins retain opening-weighted predicted versus observed fractions, with nulls for empty bins. This is descriptive calibration on synthetic assessment cases, not a calibration guarantee. [Development summary](evidence/opening-known-hiring-development-v1.json) remains separate.

## Reader and AI behavior

A fresh **Explore a synthetic hiring prediction** request opens the new report locally. The default displays all three scenarios, both baselines, probability errors and the prominent reversal failure. It makes no provider request or plan mutation. Only an explicit matrix request adds confusion matrices. Labels include positive/negative meanings, threshold, class counts, actual/predicted orientation and undefined metrics.

The original calendar-only report and exact saved answer strings are unchanged. Rendering recognizes both versions; ordinary follow-ups bind to the latest exact response, not stale workspace state. Both default and matrix answers contain full versioned plain text for reload/export. AI receives the same bounded report and request-only matrix policy for explicit experiment questions. This context is never current-vacancy, workforce-filter, staffing-cost, capacity-gain or causal evidence.

## Reproduction and release checks

```sh
node tests/manual/evaluate-opening-known-hiring.mjs --check
node tests/manual/package-opening-known-hiring.mjs --check
node --test tests/opening-known-hiring.test.mjs tests/release-opening-known-hiring.test.mjs tests/release-hiring-prediction.test.mjs
```

The packaged report omits full cases, retains summary/calibration/examples, and includes the full-report SHA256. CI reproduces both full and packaged artifacts. Unit tests cover feature availability, future-label rejection, constant-probability optimizer correctness, accounting, calibration, development-only observer ordering and gate failures. Integration tests cover old/new saved versions, request-only matrices, all stress cases, unrelated questions and actual mocked model payloads. No fresh paid-provider answer quality is implied. API spend for this experiment is $0; no API spending increase is requested or required.

Runtime release, exact CI and desktop/mobile acceptance are pending until recorded in the completed release PR. The previous verified build `4194de402ab2ff61d2b20a9e26788f9605a389f2`, deployment `dpl_2pTY7Kijua2oa2CxetwabZ3Nzakb`, remains the rollback target. No database migration is involved.
