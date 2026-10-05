# Group turnover forecast checkpoint

This offline extension uses the existing workforce generator and the same recent-mean / seasonal-naive count definitions as the earlier turnover vintage evaluator. It introduces no production model-input endpoint. Hiring's 90-day start model, satisfaction analysis, existing forecast artifacts and all UI files remain unchanged.

## Data qualification

The 72-month January 2021–December 2026 company simulation is partitioned into four fixed synthetic groups. Their daily and monthly stocks, actual external starts, voluntary/other exits and person-days reconcile exactly. Generation is seeded and reproducible. Definitions and scenario assumptions are pinned in `lib/ml/group-turnover/protocol.json`; the original generator checkpoint is `eef227603a30a679e6977085208d7c061005b088`. These histories are newly constructed experiments, not recovered historical observations.

Every group release preserves its company's effective and simulated availability dates and revision chain. Ordinary reporting delay leaves May as the last available month at June 30; stress reporting leaves April. Partial and missing releases remain null, later corrections do not rewrite earlier snapshots, and a recorded zero is valid. Group headcount below 50 or a positive voluntary count below five suppresses all numerical stock, flow and exposure fields. Complementary suppression withholds at least two groups whenever one is hidden. This fixed-group exercise is not a formal or repeated-release privacy guarantee. Truth files are offline audit artifacts and must never be shipped to the browser or used as model inputs.

Forecasts require dense, complete released history from January 2021 with at least 24 months. Missing or withheld periods block rather than disappear. Target dates remain fixed despite reporting delays. The forecast uses only voluntary counts; exact historical exposure does not supply future headcount, so rate forecasts remain unavailable.

## Evaluation and uncertainty

The protocol was committed at `faa39a92d0022216dbdbd6785b0e16b33995f18e` before group data generation and scoring. The recent three-month mean is the primary method, fixed in advance; twelve-month seasonal naive is the paired comparator. No assessment-based model selection occurs.

The assessment forecast uses June 30, 2026 releases for July–September. Each range candidate uses eleven earlier disjoint quarterly errors, with each forecast made from its own historical release snapshot and error labels available by June 30. The normalized absolute-error order statistic is the maximum of eleven scores. It produces a candidate for the three-month total only, with nonnegative clipping and outward integer rounding. It is not a time-series conformal guarantee. Non-exchangeability requires additional analysis; see [Oliveira et al.](https://arxiv.org/abs/2203.15885).

Five families each use 100 predeclared validation seeds (1001–1100), separate from demo seeds 17, 29, 43. One seeded history supplies one assessed quarter total per group. Every seed, including blocked forecasts, remains in the denominator. A family/group range may be published only if all 100 cases are forecastable and scored, observed coverage is at least 90%, and the two-sided 95% Wilson lower bound is at least 90% (at least 96/100 covered). See the [NIST Wilson interval reference](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm). Results are conditional on these visible generators and scenarios, with no pooled rescue, operational coverage claim, or simultaneous group guarantee.

The qualification gate is calculated at the simulated July 1, 2027 scoring cutoff and is explicitly retrospective. It was not known at the historical forecast origin. October–December point forecasts use September 30 releases; the reserved quarter is never scored and its published intervals are always null. Failed range checks remain unavailable; diagnostic candidate ranges in the compressed validation audit are not displayable qualified intervals.

## Frozen-run results

All five families produced count comparisons for 100 validation histories in each large group. The following errors are for the **three-month total**, in exits; A/B denotes the two large groups. These are conditional simulation scores, not operational accuracy estimates.

| Family | Recent mean quarter MAE A / B | Seasonal naive quarter MAE A / B | Candidate coverage A / B | Qualified ranges |
| --- | ---: | ---: | --- | --- |
| Stationary | 18.74 / 20.51 | 12.18 / 12.22 | 91/100 / 96/100 | B only |
| Gradual improvement | 14.70 / 13.15 | 10.81 / 9.37 | 90/100 / 90/100 | Neither |
| Regime reversal | 131.15 / 127.15 | 141.50 / 136.02 | 0/100 / 0/100 | Neither |
| Reporting stress | 19.31 / 18.08 | 11.93 / 12.43 | Unavailable / unavailable | Neither |
| Survey break | 18.50 / 19.61 | 11.13 / 11.65 | 96/100 / 93/100 | A only |

Only 2 of 20 family/group gates passed; both had 96/100 covered and Wilson lower bound approximately 90.16%. Reporting-stress point forecasts were possible at the assessment origin, but incomplete earlier calibration vintages made their ranges unavailable. Both small groups abstained across all families. Six demo cases (three seeds for each passing family/group) receive a retrospectively qualified assessment range. Every year-end interval remains null.

Seasonal naive had lower quarter MAE in four families; recent mean had lower MAE under the constructed reversal, where both methods substantially underpredicted the changed process. The primary method remains the prespecified recent mean. These results do not support treating recent mean as a generally superior model. Any future model selection requires a newly declared development/assessment protocol, not reuse of these scored holdouts.

## Reproduction and integration

```sh
node --test tests/synthetic-workforce/*.test.mjs
node tests/manual/generate-synthetic-workforce.mjs --check
node tests/manual/generate-group-turnover.mjs --check
```

`--write` rebuilds only the separate `docs/evidence/synthetic-group-turnover-v1` directory. The report pins protocol, generator extension, implementation and artifact hashes, with 500 validation case hashes and 15 compressed demo truth/release pairs. Validation reproduces from source; its full histories need not be persisted. Original workforce evidence remains byte-identical. Node 24.19.0 and UTC are recorded for exact reproduction.

The integration boundary is `report.json` → its already gated `demos` projection. `forecast.methods[].points` and `expectedTotal` carry July–September count predictions and baseline comparisons; `yearEnd.forecast` carries unscored October–December counts. `trainingEnd`, `reportingGapMonths`, `reasons`, `intervalStatus`, `intervalReasons` and `qualificationAvailableAt` must remain visible or available in the explanation. Never display a suppressed group's numbers, a raw validation candidate range, a rate or person-risk score. A future consumer should bind all report/code hashes before serving a small static projection. The main UI owner can then choose the placement; this branch changes neither Home nor shared navigation and does not switch the current production forecast.

Validation: 1,241 repository tests pass, including 49 synthetic-workforce tests. Targeted ESLint, TypeScript and whitespace checks pass. Tests cover source-clock rejection, calendar lags, original-baseline parity, future-label invariance, suppression, all-seed denominators, corrupted gate publication, independent metric arithmetic and artifact replay. Read-only architecture review verified the gate hardening. Full regeneration checks reproduce all 31 original workforce artifacts and all 32 group-forecast artifacts byte-for-byte, including the 500 validation histories. This is offline verification; no application build or hosted browser behavior is changed by this extension.

Next integration milestone: review the evidence and add a pinned consumer projection with assertions for count-only labels, data cutoff, suppression, unavailable ranges and unscored year-end targets; hand it to the main UI worker before any UI or release change. Existing operational source qualification remains blocked where historical availability/completeness evidence is absent. Synthetic validation cannot clear that source blocker.
