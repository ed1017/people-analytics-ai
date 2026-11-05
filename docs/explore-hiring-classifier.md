# Explore: synthetic hiring prediction and confusion matrix

The reader can open **Explore a synthetic hiring prediction and its confusion matrix** from Explore. It appends actual saved conversation messages without a provider request. The versioned plain-text answer contains all numeric results, so history/export remains readable without the custom renderer. Opening the example preserves the unsent draft and existing goal, scenario, revisions and plan records. Exact latest-response explanations cover recall/precision and “What does that mean?” locally; unrelated questions follow the existing workflow. Explicit classifier questions supply the same bounded report to AI context. The demonstration is independent of company filters and October data.

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

Pending final release gates. Tests cover exact matrix arithmetic, inclusive threshold, null metrics, future-label isolation, partial-release rejection, full report reproduction, all-family retention, accessible axes, Explore placement, saved-text completeness, response-bound explanations, unrelated-follow-up isolation and mocked actual AI payload grounding. Independent review verified the model and identified a too-broad follow-up matcher; it was narrowed before release. No paid requests are needed to open or explain this local example.
