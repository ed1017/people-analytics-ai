# Final company-count RF decision: reject

**Reject the remaining company-count random forest for synthetic-demo adoption
across its claimed scope. This closes the candidate.** Existing saved predictions
already show a substantial failure against an implemented seasonal-naive
baseline. No further generation, fitting, parameter search or favorable subset
is needed or proposed.

This is a **retrospective review of existing evidence**, not a new untouched
holdout. The original narrower gate's recorded pass remains unchanged in its
JSON report. The broader review includes existing baselines that were scored
but excluded from that gate. The [coverage matrix](ml-target-coverage-v1.md) now
shows the final rejection while preserving that chronology.

## Exact candidate and differences between studies

The candidate is `random-forest-base` from `performance-promotion-trees-v1`,
frozen at training commit `db92e1b` before test generation and published at
`8e39279498c2add5061e2dbf10bfa276a2fc04ee`. It has 100 trees, maximum depth 4,
minimum leaf size 20, all features eligible per split, and random state 1729.
Training comprises 8,190 monthly target rows from seeds 19101–19130, origins
through December 2024, and labels released by June 30, 2025. Its training
prediction SHA-256 is
`49063fb06fb41936b337791548d27aeef9ffe3a0f4bfdf8c23a67f7c976262a4`.

It predicts company-wide monthly voluntary-exit counts for the next three
calendar months. The quarter total sums those predictions; it is not separately
fitted. Rates, individual risk and calibrated prediction intervals remain
unavailable. No performance/promotion fields enter this base candidate; their
completed added-value tests already failed.

| Study | Target/data | Candidate and decision gate | Outcome |
|---|---|---|---|
| Original tree benchmark | Same monthly count target and constructed generator; train 12501–12530, test 14501–14520 | Same RF parameters/features, different fitted training data. Ridge penalty selected at 1. Monthly MAE required 5% aggregate gain and at most 10% scenario/origin deterioration against the selected comparator. | RF rejected on two drift cells; GB required further review. |
| Fresh robustness review | Same count target; original training pool; 40 reference and 20 transport seed clusters; added weak-signal, faster-predictor and publication-delay worlds | **GB**, not this RF, was the count candidate. Exact original fits frozen; additional bias, support and transport rules. | GB rejected on four weak-signal cells. This does not numerically test the later RF fit. |
| Performance/promotion coverage study | Same monthly target plus derived quarter-total scoring. Same count generator, new train 19101–19130/test 19301–19340; no extra transport worlds. | New RF fit with same RF settings. Ridge penalty fixed at 100. Gate comparators: Ridge, recent mean and SES. Seasonal naive and OLS scored but excluded from the gate. | Correctly passed that limited gate. |
| Final review | Exact saved newer RF predictions/labels; no new data or fit | Retain the 10% cell tolerance and include every fixed existing baseline, including seasonal naive and OLS. Same-feature Ridge remains visible. | **Reject** on the existing seasonal-naive quarter-total failure. |

The target did not become a different forecast. The fitted training data,
assessment histories, Ridge penalty, quarter-total criterion and comparator set
changed. Earlier negative studies remain preserved; the final decision uses the
exact newer candidate rather than transferring a different model's failure.

## Decisive existing evidence

At the **September 30, 2025 origin in the no-signal scenario**, forecasting
October–December **2025**, all 40 histories are forecastable and scored for RF
and every baseline.

| Quarter-total error | RF | Seasonal naive |
|---|---:|---:|
| Mean absolute error, exits | 33.11835 | 20.80000 |
| Paired histories | 40 | 40 |
| Histories with lower absolute error | 8 | 32 |

RF adds **12.31835 exits of mean absolute error**, a **59.22% deterioration**.
The existing 10% allowance permits only 22.88 exits. Ratio 1.5922 also exceeds
the earlier transport review's looser 1.20 ceiling; rejection does not depend
on a delicate new threshold. No hypothesis test, forecast interval or
independent-row significance claim is made.

Seasonal naive uses the corresponding released months one year earlier:
October–December 2024. Those counts are in the same 24-month history available
to RF, ending August 2025. RF additionally receives calendar, released indicator,
historical-headcount features and pooled training histories. Seasonal naive has
no extra information, future count, future denominator, scenario flag or
target-dependent selection advantage. Matching-feature Ridge uses exactly RF's
feature columns and training observations. Local and pooled models are not
misrepresented as identically fitted algorithms.

The audit reports **all five fixed comparators and all 35 intended cells**.
There are 1,360 common scored cases across 34 cells; the remaining 40 are the
unchanged December 2025 missing-history abstentions. Every scored cell has all
40 seeds. No method drops difficult errors or reconstructs withheld counts.

Only seasonal naive adds failed cells to the former comparator set. The second
failure is the June 2026 reversal quarter: RF MAE 150.6614 versus 136.9, ratio
1.10052. That is near the boundary; the large no-signal failure is decisive.

Pooled results still favor RF: monthly MAE 19.8846 versus seasonal 32.6762, and
quarter-total MAE 46.2910 versus seasonal 81.8743. Pooled advantage does not
establish acceptable behavior in every declared scenario. This review adds a
fixed existing baseline to the worst-cell check; it does not select a different
winner per cell or propose a baseline-switching algorithm.

## Bounded decision and unperformed work

The final decision is **reject**, including the combined monthly/quarter-total
demonstration scope. No stable-only, monthly-only or feature-enriched subset is
approved afterward. The earlier four narrow RF feature-tier passes remain
historical gate results; the added fields failed their own robust-value tests
and are not reopened as alternatives.

New weak/no-signal, level/seasonality-shift, missing/late-predictor, reversal-time
and out-of-training-range-count worlds were **not generated or evaluated** here.
Existing no-signal evidence already disqualifies the candidate under the broader
baseline comparison. This follows the instruction to avoid unnecessary tests
when existing evidence suffices. It does not claim the untested stresses pass
or that a broader untouched holdout was completed. Other target/feature studies
remain closed and unchanged.

No production model, UI, database/schema, security/access, source adapter, held
eNPS file or model-input boundary changes. Existing demo baselines remain in
place. No denied PR route was retried.

## Reproduction and audit

The rejection-only verifier imports no estimator or generator. It checks four
original artifact hashes, 50 source files, exact fit identity, calendar alignment,
released input clocks and identical support; independently recomputes monthly
and quarter-total errors; and requires an existing failure before emitting
`reject`. It cannot emit an adoption.

```sh
python -m experiments.company_count_rf_final_review_v1.review check
```

Independent read-only review additionally reconstructed all 8,190 training rows
and 37 features, labels, unit weights and imputation medians; checked the
training-before-test commit ancestry; and recomputed the decisive 40 paired
quarter errors. All checks passed without generating seeds or fitting models.

[Final evidence](evidence/company-count-rf-final-review-v1/report.json) SHA-256:
`04584290ecde1d81446460463d2e7a41b9511ecd2abd1f675308fc7989db9b51`.
The report retains the original narrow gate object, every reviewed cell and the
40 decisive saved predictions/labels. Earlier numerical evidence remains
byte-identical. This is the final disposition, not another candidate checkpoint.
