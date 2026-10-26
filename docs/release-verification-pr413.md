# PR413 production acceptance and readiness diagnosis

Reconciled October 26, 2026. This documentation update does not deploy application code.

## Production identity

- [PR413](https://github.com/ed1017/people-analytics-ai/pull/413), merged as `f3567f5c5ddfa91a09651cb4a85e453375c39d24`.
- Reviewed source head: `59e7bbffdf0c236abab7533c62b7741c347be65a`.
- Runtime: `df84a97a65d202104a3073f2ba809168b772aae1`.
- Deployment: `dpl_EkWHP14PvoKYLo7Po3v8eMstkxcQ`, promoted and verified READY at https://www.ed-ai.app.
- Original package SHA-256: `8d759aed60696682272a78e8ba2bc691f1eb06bbfa152f451ad9d3e3fabed2a1` (not the public source-subset hash).
- [Exact-head CI40245668163](https://github.com/ed1017/people-analytics-ai/actions/runs/40245668163) passed, with independent review, 17 focused checks, TypeScript and lint. Parent reviewed actual desktop/mobile previews before promotion.

## What passed

The demonstrated defect was a prior save error disabling valid unchanged demand inputs after storage readiness recovered. PR413 separates an operation error from current calculation validation, retaining explicit Save, pending/invalid-input gates and original revisions.

Public desktop (1440px) and touch/mobile (390px) acceptance covered initial save/reopen, demand-only edit, deliberately injected storage-quota failure, retained edited demand and original revision, explicit Retry saving, unchanged-input Save, exact revision 2 reopen and revision 1 preservation. The quota error text was test-only; it is absent from committed application code.

These checks used real deployed calculations and browser persistence with controlled source-currentness receipts in isolated synthetic browser state. Each run recorded four source GET checks, zero paid attempts and zero bridge errors. They do not establish fresh model interpretation. Retained evidence: `demand-storage-public-pr413-storage-acceptance-{1440,390}.json`, corresponding network records and `PROJECTION-SAVE-RETRY-ACCEPTANCE.md` in the operator's local integration-evidence directory; private evidence is not distributed in this source repository.

## Subsequent harness-only readiness repair

Initial public storage runs stopped before failure injection at an unrelated configured-state assertion. Capabilities responses completed through the CLI bridge in 5,179, 9,280 and 20,208ms; the last included 12,585ms queueing. The application's transport/body-validation deadline is 5,000ms. Eventual HTTP 200 therefore does not prove timely receipt acceptance.

On October 25 at 23:56:46 UTC, a fresh ordinary browser request completed in 667ms. At 23:58:20 UTC, the repaired shared harness completed in 792ms. Both had matching request/response dataset identity `workforce-demo-9037-public-aggregates-v4:5`, valid configured receipts with about 30 seconds remaining, and actual visible configured state. No paid calls were made.

Only the exact canonical-public capabilities GET now uses ordinary browser transport in the local harness. Paid/external guards run first; local mode, preview deployments and other requests retain their previous transports. Receipt headers, body, expiry and application validation are unchanged. Independent review caught and cleared a local-mode isolation issue. One transport-policy test plus 28 existing readiness/dispatch tests passed (29 total), including expiry, malformed receipts, dataset mismatch, timeout and late-response rejection. No application commit or deployment was required for this harness repair.

Retained diagnostic records: `READINESS-TRANSPORT-DIAGNOSIS.md`, `readiness-direct-first.json`, `readiness-direct-browser.json`, and inconclusive-attempt records in local integration evidence. Original failing response bodies were not retained. Measured bridge latency establishes this verification failure mode, not the individual cause of every historical warning.

## Still open or deferred

- Original intermittent model/final-answer rejection: original rejected output unavailable; no fresh paid acceptance in this continuation.
- Earlier intermittent source-loading trigger: recovery is tested, but its original cause remains unproven.
- Career Interests: retained legacy component tests only; its URL intentionally redirects to Workforce.
- The bounded core-journey audit found no further concrete product defect. This is not a whole-project completion claim or unrestricted natural-language guarantee.
- Existing onboarding/video, pinning, new engines, wholesale redesign and real-company ingestion deferrals remain in the [active roadmap](roadmap-status-2026-10-17.md).

No pricing renewal, paid provider call, cap, ledger, hold, access or safeguard change accompanies this reconciliation.
