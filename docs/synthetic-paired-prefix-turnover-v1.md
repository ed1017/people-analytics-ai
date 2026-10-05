# Paired-prefix control: results and Wednesday demo implications

This bounded synthetic control passed its information-boundary checks and exposed a large baseline failure under the specified future shock. It does not establish universal unpredictability, validate real workforce accuracy, or justify a new model. No operational gate or published output changes.

## Preregistration and custody

The design was frozen at `56413d688c38b913a36bae16f510aa51a14d6b7f`, before generating any of the fresh seeds 3001–3100. See [the frozen protocol](synthetic-paired-prefix-turnover-protocol-v1.md) and [executable protocol](../lib/ml/paired-prefix-turnover/protocol.json). The source lineage is `1c8c435178956c404291740e761ffd73428cfb2d`; the existing negative report and consumer identity are hash checked by the runner.

All 100 seeds were retained, with two potential continuations per history and four existing aggregate groups. The experimental unit is a paired company history: these are not 200 independent histories or 400 independent group experiments. Both continuations retain identical pre-July truth, release revisions and availability clocks. The model receives only the identical June 30, 2026 aggregate snapshots. Available ordinary training observations end in May because of release lag. Each continuation has 69 workforce months, January 2021–September 2026; October–December workforce outcomes are neither generated nor scored.

One domain-separated Bernoulli(.5) draw assigns a realized continuation per company, shared by its groups. There were 52 shock and 48 no-shock assignments, without balancing or rerolling. Separation of deterministic pseudo-random streams implements the assignment assumption; it is not an empirical or cryptographic proof of independence.

The shock adds daily voluntary exits in July–September with probability `1-(1-.007)^(1/calendar-days-in-month)` from stock remaining after the original scheduled company flows. Stocks and person-days are recomputed and reconciled, without clipping. This borrowed .007 parameter does not reproduce the earlier reversal scenario exactly. Extra events can alter later group allocation, so paired differences are constructed simulation contrasts, not identified causal effects.

## Unchanged methods and results

The only evaluated point method is the existing recent-three-month mean count baseline. Its original eleven-quarter calibration procedure supplies an unpublished candidate range. This is an information-boundary control, not another model-selection exercise. The candidate range uses nominal alpha .1 for interval scoring; empirical coverage below is not a promise of 90% future coverage. Bias means prediction minus actual; MAE, RMSE, widths and interval scores are in exit-count units.

All 100 observed-prefix comparisons and all 400 group forecast, calibration and range comparisons matched exactly. Both potential continuations necessarily receive the same forecast. The results below are conditional on this simulator, fixed shock size, selected baseline and chosen quarter.

| Group and continuation | Scored / intended | Candidate coverage | MAE | RMSE | Bias | Mean width | Mean interval score |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A, no shock | 100 / 100 | 96 / 100 | 19.56 | 23.22 | +17.10 | 84.14 | 90.74 |
| A, shock | 100 / 100 | 0 / 100 | 90.75 | 92.74 | −90.75 | 84.14 | 1057.74 |
| B, no shock | 100 / 100 | 92 / 100 | 20.43 | 23.66 | +17.23 | 79.10 | 88.70 |
| B, shock | 100 / 100 | 2 / 100 | 85.50 | 87.28 | −85.50 | 79.10 | 1002.70 |

Every A shock outcome exceeded the upper candidate bound; 98/100 B shock outcomes did. Ordinary continuations also have negative cases: 4/100 A and 8/100 B outcomes fell below the lower bound. Ordinary counts were overpredicted on average. These are failures to report, not grounds to adjust the frozen method or shock after observing results.

| Group and assignment mixture | Effective intended weight | Candidate coverage | MAE | RMSE | Bias | Mean interval score |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A, realized 52/48 draw | 100 | 46 / 100 | 56.96 | 69.23 | −39.56 | 597.94 |
| A, design-weighted 50/50 | 100 | 48% | 55.155 | 67.60 | −36.825 | 574.24 |
| B, realized 52/48 draw | 100 | 45 / 100 | 55.05 | 65.65 | −36.43 | 577.90 |
| B, design-weighted 50/50 | 100 | 47% | 52.965 | 63.94 | −34.135 | 545.70 |

Design-weighted metrics average per-pair branch losses with weights .5; RMSE is the square root of weighted MSE. The percentages are weighted coverage, not a claim of additional independent observations. Mean widths remain 84.14 for A and 79.10 for B. There are no confidence intervals or significance claims for these empirical metrics.

Across the 100 complete pairs, shock-minus-ordinary actual counts averaged +107.85 for A and +102.73 for B; absolute errors increased by 71.19 and 65.07. Ordinary coverage became a shock miss in 96 A pairs and 90 B pairs. Both continuations were covered in zero A pairs and two B pairs. Groups C and D remain suppressed/unavailable for every seed: zero scored forecasts and zero candidate ranges, null MAE/RMSE/coverage, and no exposed actual totals. They are not counted as successful predictions.

## What the control establishes

Under the explicit premise that future branch assignment supplies no anticipatory information to the observed prefix, this unchanged forecasting pipeline produces identical outputs for the two branches. It has no branch-specific signal to act on. The experiment also measures how badly its historical candidate ranges fail under this particular extra-exit mechanism.

It does not test every possible model or show that real workforce changes lack signals. The previous simulator families had different prefixes and random streams, so this control cannot retroactively prove that their failures were intrinsically unavoidable. A model aware of a specified shock distribution might target a different unconditional count or range; that is outside this frozen baseline experiment and would not identify which branch occurred from an identical prefix. No new model or wider range was selected here.

The quarter, synthetic stationary history, shock probability and size, unchanged scheduled flows, group partition, suppression, release lag and calibration history all condition the result. The ordinary branch's higher coverage cannot be promoted into evidence of real accuracy, and the shock branch's low coverage cannot support a universal impossibility claim.

## Wednesday demonstration

We can honestly demonstrate the existing synthetic aggregate count workflow: explicit provenance and data cutoffs, point baselines and their previous comparisons, suppression, retained failure cases, and uncertainty withheld when qualification fails. This control can be shown as an offline audit: the same historical inputs produce the same forecast, while the two specified futures reveal very different errors. The new evidence does not alter the existing hiring, satisfaction or turnover consumer outputs.

Suggested wording: “These are synthetic aggregate planning examples. We preserve what was known at the forecast date and show where the baseline fails. In a controlled unannounced-shock experiment, the historical ranges missed nearly every shock outcome, so we have not qualified those ranges for operational use.”

Reliable real-world accuracy, useful anticipatory event information, coverage across structural changes, causal retention benefits and calibrated year-end ranges remain research. This experiment does not validate October–December forecasts. More complex models are not justified by this result alone; the next evidence question is whether authorized aggregate information available before the forecast date contains a reproducible signal, with a separately frozen evaluation. That work is not implemented here.

No UI, database, schema, RLS, security, input-boundary or person-level scoring changes were made. The disabled eNPS feature and held SQL/contract files remain untouched. The release owner can review this evidence before deciding on any demo narration or UI integration; this branch does not integrate it into the app.

## Reproduction and evidence

[Machine-readable report](evidence/synthetic-paired-prefix-v1/report.json) contains exact metrics, source hashes, assignment counts and all seed fingerprints. `pairs.json.gz` retains every paired score; `example-releases.json.gz` contains the preregistered seed 3001 audit example. These are synthetic retrospective evidence artifacts, not consumer inputs. Published intervals and causal effects remain null; operational qualification and real-world validation remain false.

Run from the repository root:

```sh
node tests/manual/generate-paired-prefix-turnover.mjs --check
node --test tests/*.test.mjs tests/synthetic-workforce/*.test.mjs
npx eslint lib/ml/paired-prefix-turnover/*.mjs tests/manual/generate-paired-prefix-turnover.mjs tests/synthetic-workforce/paired-prefix-*.test.mjs
npx tsc --noEmit
node tests/manual/generate-group-turnover-consumer.mjs --check
```

The first command regenerates all 100 pairs and checks every artifact byte. Targeted tests independently check weighted losses, unavailable denominators, temporal invariants, stock/exposure reconciliation, artifact custody and preservation of prior outputs.

Validation completed: all 1,278 tests passed, including 17 new paired-control tests; scoped ESLint and TypeScript checking passed; all 100 pairs reproduced byte for byte; and the original consumer check retained identity `6f76782c3da5b1c326f4a6b55e04792c1f5258e2f8712aa26205439a098265e8`. Independent review recomputed every assignment and all four groups' mixture metrics without finding a defect. No application build or deployment was performed for this offline-only change.
