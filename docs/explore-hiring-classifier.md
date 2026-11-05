# Explore: synthetic hiring prediction and confusion matrix

The reader can open **Explore a synthetic hiring prediction** from Explore. It appends actual saved conversation messages without a provider request. By explicit user direction, the default response shows probability examples and limitations, with no confusion matrix. Asking "Show the confusion matrix" while this experiment is current appends a separate matrix message. AI context follows the same request-only rule. Each versioned plain-text answer contains its numeric results, so history/export remains readable without the custom renderer. Opening the example preserves the unsent draft and existing goal, scenario, revisions and plan records. Exact latest-response explanations cover recall/precision and “What does that mean?” locally; unrelated questions follow the existing workflow. Explicit classifier questions supply the same bounded report to AI context. The demonstration is independent of company filters and October data.

## Finding and qualification

This is useful for demonstrating reproducible prediction **evaluation**, not an operational hiring classifier. Both methods predict a single class in each family at the fixed threshold: balanced accuracy is **50% throughout**. Stable-case precision is undefined because no starts are predicted. Improving/reversal recall is 100% but specificity is zero. These limitations are visible before the matrices. No threshold was retuned to make the result look better.

| Synthetic family | Openings | Actual starts | Regression accuracy | Regression Brier | Baseline Brier |
|---|---:|---:|---:|---:|---:|
| Stable | 5,200 | 2,159 | 58.48% | 0.24276 | 0.24355 |
| Improving | 5,200 | 3,258 | 62.65% | 0.23417 | 0.23602 |
| Unexpected reversal | 5,200 | 1,422 | 27.35% | 0.32078 | 0.29900 |

Lower Brier is better. Modest probability improvements in stable/improving histories do not establish general superiority. The baseline does better after reversal. The 15,600 openings are simulated outcomes across 60 histories, not independent company observations; each of 180 monthly test cohorts shares one probability and classification. Positive means actual start within 90 days. Negative includes cancellations and unresolved openings with complete day-90 follow-up, not permanent non-hires. No individual candidate or employee score is generated.

## Protocol and reproducibility

Protocol committed at `37c308d7` before evaluation; evaluator implementation committed at `5fc81f0a` before scoring. The [frozen protocol](explore-hiring-classifier-protocol.json) specifies all 20 new seeds, all three existing generator families, both fixed methods and the inclusive 0.5 threshold. No seed, parameter, model or threshold selection occurs. New seeds do not make known planted mechanisms blinded or real-world validation.

The existing fixed-penalty aggregate logistic model uses opening calendar trend and training-only centering. The baseline is the smoothed last-three-mature-cohort fraction. Origin is 1 January 2025; only completed, released training cohorts available then enter fitting. Predictions for January–March 2025 are produced before the scoring snapshot is retrieved. Complete simulated follow-up is available by 1 July 2025. Unknown or immature labels cannot become failures. These dates are a historical test, never a new October company forecast.

Confusion cells sum exact opening outcome counts, without fabricating individual records. Precision, recall, specificity, accuracy and balanced accuracy accompany Brier and log loss. Undefined denominators remain null. No confidence interval, causal effect, operational qualification or real-world accuracy is claimed. The full [report](evidence/explore-hiring-classifier-v1.json) preserves fitted coefficients, each cohort probability, later outcomes, per-seed matrices and source hashes. Source text hashes normalize CRLF to LF for cross-platform reproducibility; this portability adjustment does not change model results. Existing frozen evidence files are untouched.

```sh
node tests/manual/generate-explore-hiring-classifier.mjs --check
node --test tests/hiring-classifier-evaluation.test.mjs tests/release-hiring-prediction.test.mjs tests/release-home-prompt-categories.test.mjs
```

AI must not apply this report to current vacancies, filters, staffing demand or saved plan assumptions. It cannot infer capacity, hiring costs, savings or intervention benefits. Further predictive development needs a separately frozen protocol and an independent chronological evaluation; current test results must not become an untouched test again after tuning. Operational adoption additionally needs qualified real opening/outcome histories, calibration and a threshold justified by decision costs.

## Verification and release

Released in [PR564](https://github.com/ed1017/people-analytics-ai/pull/564), merged as `688d550754ad8063bae3af13265ae1b63ef98fd7`. Exact runtime `4194de402ab2ff61d2b20a9e26788f9605a389f2` passed [CI849](https://github.com/ed1017/people-analytics-ai/actions/runs/41952468563), including full historical regressions, artifact checks and TypeScript. Seventeen focused contracts cover exact matrix arithmetic, inclusive threshold, null metrics, future-label isolation, partial-release rejection, full report reproduction, all-family retention, accessible axes, Explore placement, saved-text completeness, response-bound explanations, unrelated-follow-up isolation and mocked actual AI payload grounding. Independent review verified the model and identified a too-broad follow-up matcher; it was narrowed before release. No paid requests are needed to open or explain this local example.


The exact staged production deployment `dpl_2pTY7Kijua2oa2CxetwabZ3Nzakb` (`people-analytics-eeyzwco3g-ed-56dc.vercel.app`) passed seven workflow groups at 1440px and 390px before promotion. The same build was promoted and resolved from the public domain. Direct acceptance at https://www.ed-ai.app passed all seven groups at both widths: default three probability tables with no matrix; preserved unsent draft/goals; no document overflow; reload; explicit matrix request adds six matrices while the original remains matrix-free; local explanation; reset/repeated launch. Both versioned responses retain their rendering after reload. Actual desktop/mobile pixels were inspected. Public runs had no page errors, transport errors or POST requests. [Verification receipt](data/explore-hiring-prediction-release-2026-11-05.json).

The browser tests used a configured-readiness fixture and blocked all provider POSTs; they establish local UI/persistence behavior, not paid model-answer quality. A separate real, nonbillable capabilities GET with the required dataset header returned `configured`, version 2 and dataset `workforce-demo-9037-public-aggregates-v5:6`. That is configuration evidence, not provider health or remaining-budget proof. This batch incurred **$0** API spending. Last recorded additional-test allowance remains $50, with $1.087391 previously used and $48.912609 remaining; no new spend ledger claim was inferred from the configuration receipt.

Verification corrections: an initial staged deployment omitted the required organization ID and correctly failed its guard; the final deployment supplies the already verified actual team ID, without weakening the guard or changing persistent access. Older prompt-count and isolated dispatch-test dependencies were updated. Browser inspection corrected the prediction's erroneous Market insights heading. Test setup selected the existing Do not show again option before reload; an initial public test targeted the apex redirect and blocked the canonical www scripts under its strict-origin policy. Final direct public tests use the observed canonical origin. A staged desktop teardown closed pending read-only requests after all assertions; final public runs drained normally without that transport error. None of these failed attempts is counted as public acceptance.

The packed runtime contains 1,310 verified files; archive SHA-256 `d58b4c1d7d7f1df6b7478f78ff1084cf0ded0019cb426e2f5581b068fa4b70f2`. All private workforce inputs match the previously verified archive byte-for-byte. No Supabase records, external market sources, saved-plan schema, thresholds or synthetic generating mechanisms changed. Existing plan/revision/backup regressions passed in CI; this new browser receipt compares goals before/after but does not claim a fresh end-to-end Track/Review exercise.

Rollback: promote the previous verified deployment `dpl_8HDScNWTA2eReKPfc8cJRkgBZ1HS` / `people-analytics-gi5qy2n5s-ed-56dc.vercel.app` (runtime `a4f5effdcf4359ed16e61011bcada704e23e9611`). There is no database migration to reverse. Retained plain-text experiment messages stay readable even without the new renderer.
