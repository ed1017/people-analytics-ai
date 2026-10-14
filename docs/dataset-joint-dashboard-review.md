# Inactive joint dashboard integration

This separate proposal extends the constructed candidate's dashboard with a pinned joint aggregate. It does not register a provider, change `dataset-runtime.ts`, select a dataset, configure a server filesystem loader, publish a release or authorize activation. The company artifact and all sealed components retain their original bytes and identities.

## Metric contract

`voluntary-ytd-nine-month-average-stock-v2` means:

`2026 YTD voluntary exits / (sum of January–September month-end headcounts / 9) × 100`.

The month-end stock follows half-open employment and assignment intervals. The numerator uses the assignment at exit. Internal transfers and promotions have outgoing/incoming group legs and no company headcount effect. The full generated calendar must be validated before an absent occupied cell can mean zero.

The old RPC groups only occupied observations and omits zero-stock months from its average. That implementation is not the definition of a nine-calendar-month average. The new version includes verified zero-stock months, exposes the unrounded denominator and numerator, and rounds the final rate to one decimal. A zero denominator is null with `unavailable-zero-denominator`; it is not a zero rate. A flow divided by average changing stock can exceed 100%, so the new metric is not clamped as a fixed-cohort share. Legacy runtime values and legacy Home input limits remain unchanged.

## Validation boundary

The company reader now checks all fixed aggregate projections before returning a provider. Its closed recursive schemas reject unknown fields, private-field additions, unexpected text vocabulary, malformed dates, wrong numeric types, invalid nulls and duplicate identities. It checks stock partitions, the sealed company population/cost/vacancies, monthly flows and the declared turnover denominator, then invokes existing domain validators through in-memory requests. No network, model or original handler is involved.

The joint reader additionally requires separately supplied byte pins, exact source/parent bindings, bounded arrays, the exact catalog/calendar, integer count/FTE/money units, and strictly ordered change points and event keys. Every cell's monthly headcount identity is checked, each YTD voluntary numerator is reconciled to its events, and company history/flows and available dimension partitions must match the validated company artifact. Rounding follows aggregation, not individual cell rounding.

These are schema and accounting checks, not anonymization or proof of real-world truth. A self-consistent aggregate cannot by itself prove source completeness or every derived statistic. The exact reviewed bytes also require independent local source reconciliation and trusted publication/code pins. Retained seal metadata contains private operational information; this implementation does not make the artifact public-safe.

## Empty scopes and evidence identity

The new receipt is version 2 with `verified_aggregate`, the sidecar digest, metric contract and `positive` or `known-empty` stock status. It is never labeled as a verified RPC. Recognized empty scopes return 33 calendar points, verified zero stock/FTE/labor cost, their independently counted vacancies and a null rate when the YTD denominator is zero. An empty current scope can still have a calculable historical YTD rate. Unknown filter codes remain unsupported with no overview rather than fabricated zeroes.

Dashboard and Home consumers recognize the new receipt. The rate is nullable and formats as unavailable when null. Home evidence bindings include the sidecar digest/contract, and candidate projection inputs include the digest in their source relation. This prevents a saved calculation from silently rebuilding against a different aggregate revision. Projection tools still require positive opening stock; a verified empty cohort receives an explicit tool limitation rather than being called missing data. No employee is added to satisfy that restriction.

Ratings remain company/eight-BU only. Country/level filters do not acquire a rating release. Pay means remain company-only with existing withholding. Other presenters retain their current scope contracts and independent eligibility/denominator rules. Global dashboard filters do not turn company-wide role evidence into filtered supply or add country coverage to structural planning.

## Local review

The manual suite requires an explicit private directory containing reviewed input pins and independently generated interval-SQL references:

```sh
DATASET_JOINT_REVIEW_ROOT=/private/review-directory \
node --import ./tests/fixtures/dataset-review-offline.mjs --test \
  tests/manual/dataset-joint-dashboard.test.mjs
```

The private suite checks every supported scope and month, every known-empty current scope, null versus available turnover, Home binding, unsupported filters and rehashed malicious artifacts. Private artifacts, SQL, fixtures, configuration and test receipts must remain outside Git. Existing frozen release tests and byte pins are not regenerated to hide failures.

Before hosted use, independently review the complete diff, metric change and privacy boundary; establish successor release/implementation pins and a deliberate cache/session generation change; implement a reviewed server loading configuration and any required publication/preservation approvals; and review activation/rollback separately. The prior provider, frozen releases and data must remain intact. This proposal supplies no hosted recovery certificate, forecast validation, storage-capacity proof or completed production cutover.
