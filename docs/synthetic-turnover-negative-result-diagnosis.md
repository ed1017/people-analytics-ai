# Scientific diagnosis of the negative result

**Retain unavailable intervals; do not promote the tested heuristics.** The experiment at `88c45787f0eec363ce7edbbe418e4bd004542acd` found poor generalization, not evidence that a larger model would repair coverage. Original consumer/model outputs remain unchanged.

## What was verified

| Item | Verified interpretation |
| --- | --- |
| Target and units | A group's **total voluntary exit-event count for July–September 2026**; not a monthly count, turnover rate, individual probability or headcount. |
| Forecast origin | June 30, 2026. July/August/September are origin horizons 1/2/3. Reporting delay leaves May available ordinarily and April under stress: leads from the last released month are 2/3/4 and 3/4/5. Target months were not shifted. |
| Calibration | Eleven earlier quarter totals, through January–March 2026. Predictions use each earlier origin's releases; calibration labels use revisions available by June 30. Normalized residuals are converted back to count bounds, clipped at zero and rounded outward. Monthly bounds are not summed. |
| Scoring and availability | Final assessment labels and gate qualification are retrospective at the **simulated July 1, 2027 cutoff**. This is not information available at the historical forecast origin or a real future observation. October–December remains unscored. |
| Coverage denominator | Inclusive containment of one quarter total per seeded group history. Conditional coverage uses issued-and-scored cases; issuance-and-coverage uses all 100 intended histories. Abstentions and missing calibration remain distinct. |

The [independent audit](evidence/synthetic-turnover-negative-result-audit.json) regenerated the same 500 histories without fitting a new model. It independently selected vintages, recomputed assessment/calibration count totals and predictions, and checked coverage, widths and interval scores across 2,000 group cases, 22,000 folds and 60 method summaries. Ten targeted tests also cover scale arithmetic, baseline parity and future-label invariance. No target, unit, cutoff or coverage-arithmetic error was found; these checks are not a proof that every implementation defect is impossible.

## What failed—and what the experiment does not prove

The reversal introduces a July increase beyond the June-available history. Historical residuals do not represent that changed process. Adaptive ranges cover only 0/100 and 2/100 large-group totals; the abstention variant covers 0/93 and 1/92 issued totals. Reporting stress instead fails a data-completeness requirement: only 7/11 calibration quarters are usable. Small groups remain suppressed. Stationary/improving misses and mixed width/score changes indicate additional point-forecast bias and finite-sample calibration instability, not a single universal defect.

A genuinely exogenous shock with no pre-origin observable correlate cannot be identified from that history alone. **This experiment does not establish that strong premise.** The simulator hard-codes the reversal date; families have different pre-change trends and random streams. Simulator knowledge could reveal the change, but using its label or future schedule as a forecast input would violate this experiment's information boundary. Failure of these fixed heuristics therefore establishes neither absolute unpredictability nor that all history-based models must fail. It also supplies no evidence that increasing model capacity is the remedy.

## Minimal defensible next step—not executed

Before another heuristic, preregister a small **paired-prefix identifiability control**: identical pre-cutoff releases, with a prespecified shock/no-shock continuation assigned independently after the cutoff. Keep the current methods fixed, choose shock distribution and evaluation seeds before generation, and report conditional coverage and width in both branches. Identical forecasts before the branch would distinguish missing information from anticipatory leakage; any marginal coverage claim would depend explicitly on the declared shock probability. Do not tune magnitudes to observed ranges or reuse scored seeds/current reserved-quarter outcomes for selection.

For operational forecasting, the immediate requirement is trustworthy aggregate completion/revision timestamps and as-of outcome history. Predicting a known upcoming change additionally requires a relevant signal demonstrably available before the origin, assessed prospectively under a separately reviewed input contract. Without such evidence, retain abstention or explicitly conditional scenarios; increasing capacity alone does not establish coverage.

Reproduce the read-only audit with `node tests/manual/verify-turnover-negative-result.mjs`. It accepts no alternative seeds or source inputs and leaves all existing evidence untouched.
