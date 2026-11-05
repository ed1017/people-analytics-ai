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

## Completed release, 5 November 2026

[PR568](https://github.com/ed1017/people-analytics-ai/pull/568) merged as `fc5cc2878486a671c6205f9e3b09122e8be8739c`. The exact tested runtime `ab2654457a5d0cc8e873ef33ffc5b41cea9bb131` is deployed as `dpl_852jykUia55QgfkdCWJBe4PdGvNL` (`people-analytics-ra3m9hxjx-ed-56dc.vercel.app`) and promoted to **www.ed-ai.app**. Public-domain deployment lookup confirmed that identity after promotion. The runtime was promoted without rebuilding after merge.

[Exact-commit CI](https://github.com/ed1017/people-analytics-ai/actions/runs/41968914850) passed all current and historical contracts, generated artifact checks and TypeScript. Thirty-one focused tests passed locally. Production build, type checking and private-asset audit passed. Independent review found and then verified fixes for old saved-report matrix requests and metric explanation continuity. Actual screenshot review corrected mobile header wrapping and spacing.

Protected staging and direct public browser checks each passed seven groups at desktop 1440 and mobile 390: local Explore entry; all stress families with no default matrices; preserved goals/draft; no document overflow; reload of default and requested-matrix messages; bounded explanations without provider calls; reset and repeated launch. Default has three comparison tables; explicit matrix request has twelve tables, while the original message remains matrix-free. Both public runs had zero page/transport errors and zero POSTs. The readiness response was a local configured fixture; this does not test provider availability or generated answer quality. Two stalled protected-harness attempts were terminated and rerun successfully before promotion.

The [release receipt](evidence/opening-known-hiring-release.json) records identities, checks and receipt hashes. The runtime archive contains 1,313 inputs, 7,014,903 bytes, SHA256 `b2df0b7930479f728bf6e457b9615bbfce98ada509b361ac7c1a184e042b5070`; private runtime inputs are unchanged. No database migration is involved. API spend for this task is **$0**.

Repeat the demo: open Overview, choose **Explore a synthetic hiring prediction**, read the three scenarios and limitations, then ask **Show the confusion matrix** or **Explain balanced accuracy**. Reload to retain the versioned results; Reset Conversation clears the chat without altering saved plans.

Rollback: promote the previous verified deployment `dpl_2pTY7Kijua2oa2CxetwabZ3Nzakb` (runtime `4194de402ab2ff61d2b20a9e26788f9605a389f2`). No data rollback is required. The experiment is complete as a teaching demonstration; operational prediction remains blocked by qualified real/coherent company outcomes, independently dated opening-known features and validation beyond a planted generator.
