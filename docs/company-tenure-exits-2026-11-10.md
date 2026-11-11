# Company tenure exit composition

Status: local source candidate, layered on the business-unit level-turnover candidate a983065. Not published, pushed, deployed or browser-accepted. No paid provider calls.

## Supported questions and limits

“Show exits by tenure”, “Show company-wide voluntary turnover by tenure”, and mixed cost/rate questions have deterministic answers. Unqualified exits mean total exits; voluntary is explicit. The supported period is January–October 2026, as of October 31. Historical, ambiguous and unsupported scope/metric questions receive a boundary instead of a provider request. Actual planning/edit requests retain the existing strict planning path. Existing named-business-unit level answers take precedence, including their honest unverified tenure-join boundary.

All three current dashboard filters must be All. A selected country, business unit or level gets a scope boundary, even when the question says company-wide. Filters and saved work are never silently widened or mutated. Narrow immediate follow-ups to supported composition answers retain the metric; explicitly asking about voluntary exits changes the metric. Unsupported follow-ups and repeats of boundary answers stay deterministic and never infer counts from a refusal.

The five source bands and canonical sort order are preserved. Labels do not establish exact thresholds or the capture's band-generation algorithm. Stale repository SQL is not used to infer those semantics. The answer shows counts and shares of company exits of the same kind and period. These are not tenure turnover rates, age estimates, causal drivers, or financial losses. The 9,092 current workforce stocks are not YTD denominators. Zero company exits gives unavailable shares. No salary multiplier or downtime/cost assumption is invented.

## Evidence checks

The server-owned company attrition endpoint must retain the exact public v5:6 identity, bundle digest `10e812c2f6dda2deaf0903710d5041f16b39298cb20df4669c991bd5837e7cd4`, approved metadata and October 31 cutoff. It is requested without filters only after the all-company scope check. No new joins or arbitrary filtered reader are introduced.

Exactly five unique canonical band/sort pairs are required. Counts are safe nonnegative integers, voluntary ≤ total, regrettable ≤ voluntary. Summary and monthly counts are checked, including total = voluntary + involuntary. Band totals independently reconcile with the current summary and January–October monthly rows. The complete 34-month ordered history is required. Unknown fields, suppression markers, duplicate/missing rows, conflicting counts, stale identities and mid-read identity changes fail closed.

## Verification

- New `tests/release-tenure-exits.test.mjs`: intent boundaries, arithmetic, zero exits, corrupt evidence, pinned identity/scope, actual route repeats/follow-ups/serialized reload, unchanged planning state and zero provider dispatch.
- Existing level, quarterly and independent-workforce suites retained. Combined focused run: 29 tests passed with network/provider access guarded.
- Isolated complete runtime, copied from the reviewed level candidate and overlaid with only the tenure changes: actual packaged evidence gave 1,185 total and 863 voluntary exits. Twelve actual-route saved-work/repeat/follow-up/filter-boundary flows passed with zero provider/network attempts.
- Independent reviewer additionally exercised 44 actual-capture route checks, including four scopes and level-route precedence, with zero provider/network attempts.

The exact candidate passed the final full-runtime production build and standalone TypeScript check with external networking and provider access guarded. No live-provider acceptance is claimed. Not published or deployed; hosted and desktop/mobile browser acceptance remain pending.
