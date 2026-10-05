# Aggregate voluntary-exit forecast: conditional synthetic demo

This isolated implementation estimates **counts of recorded voluntary separation events**, company-wide, for October–December 2026. It is an offline retrospective demonstration, with source-completeness and historical-vintage limitations made explicit. It is not a qualified operational forecast, a turnover rate, individual employment scoring, or evidence that an intervention changes exits. No runtime route, Home/navigation change, model-service transmission, database write, schema/security change or deployment is included.

## Source qualification on 2026-10-05

Read-only connector queries succeeded against the already authorized People Analytics database. [Reproduction queries](aggregate-exit-qualification.sql) return aggregate counts and metadata only. [The captured aggregate fixture](../tests/fixtures/aggregate-exit-history.json) contains no employee identifiers or attributes. The existing application reads this source in `app/api/attrition/route.ts`.

| Question | Observed evidence | Consequence |
| --- | --- | --- |
| Monthly voluntary exits | `attrition_monthly_trend` contains 33 consecutive months, Jan 2024–Sep 2026. The underlying `separations` table has 32 event-bearing months, Feb 2024–Sep 2026. | Counts exist; snapshots alone were not treated as labels. |
| January 2024 | No separation events. The view is anchored to snapshot months and coalesces missing joined separation counts to zero. | Exclude January as an **unverified join zero**; do not silently train on it. |
| Calendar coverage | Each of the remaining 32 months has separation events dated both the first and last calendar day. Each snapshot month has exactly one month-end date, with snapshot-row count equal to distinct employees. | Calendar closure/coverage checks pass. This does **not** prove all source events arrived or the synthetic generator is complete. Demo explicitly assumes included counts complete. |
| Event integrity | No duplicate employee/date separation pairs or null event keys in the aggregate audit. No duplicate employee/snapshot-date pairs. | No observed duplicate inflation; IDs never leave aggregate queries. |
| Cohort | Numerator is all records with `separation_type = 'voluntary'`, without BU, country, status or current-employee filters. Every recorded voluntary exit has a prior-month snapshot; none has an exit-month-end snapshot. | Changing company-wide event population, not a fixed cohort or an individual risk set. Snapshot membership alone does not independently verify full cohort completeness. |
| Denominator/exposure | 33 month-end headcounts grow from 8,400 to 10,000. The trend view divides counts by distinct people in that snapshot month. Current YTD summary uses the mean of Jan–Sep month-end counts. | A month-end stock excludes that month's leavers and is not measured average at-risk exposure/person-time. No future exposure or appropriate rate denominator is established. **No rate forecast.** |
| Provenance | User describes this project history as synthetic. All source rows in both audited tables have insertion timestamp `2026-09-28 01:50:05.925777+00`. Project metadata reports creation on Sep 27, 2026. No versioned generator/completion watermark was supplied or established by inspected definitions/columns/comments. | Label provenance `user-declared-synthetic`; do not invent a generator or assert verified completeness. Fixture records insertion timestamp at JavaScript millisecond precision. |
| Temporal availability | Batch insertion is after historical forecast origins, and even precedes some generated September event dates. No as-known-at-origin vintages/revision history are available. | Actual historical replay is blocked. Use explicitly retrospective final-data splits; calendar dates are not evidence of label availability. Do not derive first-observed timestamps from event dates. |

Outcome: **32 months are usable only for a conditional retrospective synthetic count demonstration**. `countForecastQualified`, `rateForecastQualified`, `pointInTimeValidated`, `completenessVerified` and `generatorProvenanceVerified` remain false. Closing the operational-data gap requires source completion/generator evidence and historical vintages; a rate additionally requires the correct historical and future exposure definition. More sophisticated models cannot close those gaps.

## Reproducible method

`lib/ml/aggregate-exit-forecast.ts` accepts only a strict, bounded aggregate contract. Unknown fields, employee features, counts coerced from strings, invalid dates, duplicate/gapped months and incomplete event-boundary evidence fail closed. A true zero voluntary count is retained when the all-separation event evidence exists. An all-event-empty interior/trailing month is not silently made zero. The source inspection metadata are declarations, not cryptographic provenance or an authorization mechanism.

After excluding January, three shared development origins (Jan, Feb and Mar 2026) permit paired 12/24/all-history comparisons, each predicting three months ahead. These origins have at least 24 months available so the requested 24-month comparator can be computed; this is a mechanical comparison constraint, **not a universal statistical adequacy gate**. Their outcomes end by June. Nine forecast errors cover **five distinct months**, and these overlapping folds are dependent. A final chronological assessment trains through June and scores July–September. All methods use identical target/horizon pairs. Predictions use only the training prefix; preprocessing/settings never use later counts.

Methods are a mean of the last three counts, the same calendar month one year earlier, and simple exponential smoothing. The candidate initializes its level with the first training count and chooses alpha from `[0.2, 0.5, 0.8]` using training-only one-step squared error; ties choose the lowest alpha. It has no trend, covariates or seasonal fit. The comparison protocol selects it only if development monthly MAE improves at least 10% against **each** baseline; otherwise it selects the better baseline, with ties favoring recent mean. This is a transparent demo choice, not a statistical significance or efficacy threshold. The final method is then fitted through September.

Monthly MAE, RMSE, signed prediction-minus-actual bias, each forecast horizon, and three-month-total errors are all returned. Final assessment outcomes do not affect selection. **Those counts were visible during data qualification**, so the July–September block is not called an untouched or preregistered confirmatory holdout. No prospective performance validation exists.

Rolling-origin evaluation must restrict each training set to prior observations and evaluate the intended multi-step horizon. [Hyndman and Athanasopoulos, time-series cross-validation](https://otexts.com/fpp3/tscv.html). The smoothing recurrence follows [simple exponential smoothing](https://otexts.com/fpp3/ses.html), with the explicitly constrained initialization/grid above.

## Observed demonstration result

| Method | Development monthly MAE | Jul–Sep monthly MAE | Jul–Sep monthly RMSE | Jul–Sep total error |
| --- | ---: | ---: | ---: | ---: |
| Recent three-month mean | 3.926 | 2.333 | 2.380 | +3.000 |
| Seasonal naive | 4.222 | 5.000 | 5.260 | +15.000 |
| Exponential smoothing | 3.960 | 1.861 | 2.678 | −4.749 |

Recent mean is selected on development. Smoothing's smaller later monthly MAE does not override that decision; its later RMSE and total absolute error are also larger than recent mean. These numbers describe this synthetic extract only.

Selected forecast: **67 expected voluntary exits in each of Oct, Nov and Dec; 201 additional exits**. Recorded Jan–Sep 2026 voluntary exits total **605**, giving **806 expected full-year exits** under the demo assumptions. Expected counts can be fractional in general; calculations sum unrounded points. There is no rate, causal benefit, staffing commitment or personnel recommendation.

Uncertainty is intentionally `null`: three overlapping development origins and one assessment quarter do not provide independent calibration, and no verified stochastic generator is available. Neither a Poisson assumption, residual percentile band nor model-disagreement range is asserted as a confidence interval. Interval construction needs explicit distribution/error assumptions and appropriate multi-step treatment; see [prediction intervals](https://otexts.com/fpp3/prediction-intervals.html). Summing monthly bounds would not establish quarter coverage.

### Recency sensitivity added at the user's request

The output includes `historyWindowComparisons` for 12/24/all available months at identical origins. This was requested after the assessment counts were already visible, so it is descriptive sensitivity analysis, not a new untouched model-selection experiment. The main selected baseline remains unchanged; its effective lookback is three months, regardless of the larger history supplied.

| Smoothing history | Development monthly MAE | Jul–Sep monthly MAE | Oct–Dec expected total |
| --- | ---: | ---: | ---: |
| 12 months | 3.712 | 2.305 | 201.476 |
| 24 months | 3.960 | 1.861 | 201.260 |
| All available (32 at final fit) | 3.960 | 1.861 | 198.531 |

Recent-mean metrics/forecast remain 3.926 / 2.333 / 201 across windows; seasonal-naive remains 4.222 / 5.000 / 207. Twelve-month smoothing improves development MAE about 5.4% against recent mean, below the stated 10% demonstration threshold, and does not establish a recency winner or empirical adequacy. Each alpha fit sees only its own trailing training window. No rates or intervals are inferred from the variation between methods/windows.

The [app-wide inventory and sequence](predictive-analytics-roadmap.md) separates baseline/fitted/scenario methods, verifies the existing hiring reference, inventories dated fields and historical availability gaps, and explains hire/start/capacity semantics. Shared `predictive-evidence.ts` types are output metadata only; they do not change model inputs or activate another domain.

## Reproduce and integrate

With Node 24 and repository dependencies installed:

```sh
node --test tests/aggregate-exit-forecast.test.mjs
node tests/manual/aggregate-exit-demo.mjs > /tmp/aggregate-exit-demo-report.json
npx --no-install tsc --noEmit --incremental false
npx --no-install eslint lib/ml/aggregate-exit-forecast.ts tests/aggregate-exit-forecast.test.mjs tests/manual/aggregate-exit-demo.mjs
```

The runner is offline, accepts no source/live-mode overrides and reads only the tracked fixture/evaluator. It emits file SHA-256 identities plus canonical dataset/protocol fingerprints, full fold predictions/metrics, qualification blockers and the conditional forecast. Fingerprints establish reproducibility, not source authenticity. Node's existing typeless-package warning does not change execution; this slice does not alter the shared package manifest.

Validation on this implementation: **904 repository tests pass, including 25 forecast tests**; full ESLint, standalone TypeScript, genuine optimized Next build and whitespace checks pass. Tests cover strict aggregates/calendar evidence, zero handling, per-window fitted parameters, future/assessment mutations, baseline alignment, output provenance, unavailable rates/intervals, reproducibility and immutable results. Independent source/doc review found no material remaining issue. No UI/browser behavior changed and no live-model or operational forecast validation is claimed.

Captured fixture SHA-256 is `64acf5cbb0cddbaa0614e20ee3895cd026ebe3ec9c91fed622820b53b44d63cd`; canonical dataset fingerprint is `7887ad425425356be28dc143c2776069309ced0cf05a602a842ee8216b75c280`; protocol fingerprint is `268252ee00c4e2413811879b3225e40261c5014ce7378c2d81a764359a01a354`. The runner also emits the current evaluator file hash. Retain these with the tested Git commit when handing off the report.

Proposed integration for the UI owner: a separately reviewed **Synthetic count forecast** evidence panel showing source/exclusion, recorded YTD, remaining-year and full-year counts, selected baseline, chronological comparisons and unavailable uncertainty. Preserve the conditional-demo label and blockers alongside the number. Do not import the Node evaluator or fixture into Home, add a fetch/LLM boundary, auto-fill retention-effect assumptions, or expose probabilities. No UI integration is implemented here; parent coordinates merge and product presentation after review.

Branch begins at `3aeb1699c3f47e9363172a48eec81b5d9bcbdb41`. The reported foundation `b62df6ff778d65ba29cd466e28abdaec2cb59434` was not recovered: local object lookup failed, no matching remote forecast branch existed, and GitHub returned “No commit found” for that SHA. This is a new implementation, not a continuation of verified foundation code/tests. The disabled eNPS gate remains untouched. The two held eNPS SQL/contract files named in delegation are absent from this checkout and have not been reconstructed, activated or removed.
