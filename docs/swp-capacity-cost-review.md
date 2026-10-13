# Optional contracted-FTE cost layer

Base: PR227 production `7177ce5f9f7abeb432b14f1d9a2ad9e5f3c11cb6`.

## Minimal versioned design

Keep `monthly-supply-workload/v1` and its complete output unchanged, including limitations. Add the independent `contracted-fte-run-rate/v1` method: monthly contracted supply FTE times an optional, manually entered USD/contracted-FTE/month rate. Rate bounds are 0–100,000 with at most two decimals. Blank is unknown; explicit zero is known. Unknown cost does not change capacity completeness or prevent a valid capacity save. This is a supply run-rate, never gap/required-FTE pricing, actual pay, cumulative spend, ROI, or assignment/productivity savings. No source compensation period, loaded components, FX, or source costs are inferred. The existing per-employee headcount demo is untouched.

The capacity engine already accounts in exact micro-FTE integers. Recover that integer from its six-decimal contracted-FTE output, multiply by integer cents with internal BigInt, then round to nearest cent with half-cent ties up. A maximum stock of 1,000,000 FTE times a 100,000 USD rate yields 10,000,000,000,000 cents (safe to persist), while the intermediate product reaches 10^19 (unsafe as a Number). BigInt never crosses JSON or React props.

Save new UI calculations as schema-v2 records, retaining the v1 calculator inputs/result and adding a separate cost snapshot. The combined capture/input key includes capacity inputs plus cost method/version, currency, units, rounding, provenance, and normalized rate. Recalculate both snapshots on save/reload and reject any discrepancy. Legacy schema-v1 records and editable drafts retain their existing fields, IDs and keys without backfill. Their cost is unknown. A cost-field edit or clearing uses the same result/capture/confirmation invalidation as capacity edits. Opening old records leaves them v1; calculating again opts into v2.

Keep the bucket version and existing bounds. Validate the entire candidate bucket before and inside the optimistic transaction. Preserve context checks, prior saved bytes, draft state, quotas and conflict handling. Mixed v1/v2 records remain capacity-comparable. Cost deltas require compatible cost semantics and two known values, and subtract the separately rounded monthly cents: right minus left. Different numeric rates are explicit comparison assumptions, not compatibility blockers.

One optional input is shown in the existing form. The capacity chart remains first. Show a final-month cost value below the FTE summary, monthly detail values, and a collapsed saved cost comparison with rates and USD/month labels.

## Review and verification

Verification receipts will be appended after local checks. Publication is held for parent coordination and independent review.

### Local receipts (2026-10-13)

- 63 focused tests passed: `node --test tests/swp-monthly-workload.test.mjs tests/swp-capacity-draft.test.mjs tests/swp-capacity-record.test.mjs tests/swp-capacity-store.test.mjs tests/review-capacity-regressions.test.mjs tests/swp-capacity-cost.test.mjs tests/capacity-presentation.test.mjs`.
- 24 adjacent tests passed: `node --test tests/monthly-scenario-compatibility.test.mjs tests/local-decisions.test.mjs tests/planning-destinations.test.mjs`.
- `npx tsc --noEmit` passed. `npm run build -- --webpack` passed, including the existing prebuild artifact checks.
- `npm run lint`: zero errors; two pre-existing unused-variable warnings in `tests/browser/conditional-hiring-plan.mjs`. Changed-file lint and `git diff --check` passed.
- `tests/browser/capacity-save.mjs`: existing real-component/store save, reopen, compare, keyboard, goal/dataset boundaries, quota and conflict checks passed at 1366px/390px.
- `tests/browser/capacity-cost.mjs`: frozen production record reopen without rewriting, mixed comparison, manual $98.72, explicit zero, unknown, edits/clearing, saves and reload passed at 1366px/390px.
- `tests/browser/capacity-save-app.mjs`: production-build real-app checks passed at 1366px/390px, including manual $98.72, zero/unknown, cost edit invalidation, capacity math, fractional percentages, keyboard, navigation, reload and no page overflow. All API data was synthetic/intercepted; both widths recorded no browser errors, mutating requests or external requests. Desktop/mobile manual-cost screenshots were inspected.
- Browser runs used `PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright/index.mjs` and local Chromium. The real-app run used the local production server on port 3510.
- Arithmetic checks include 500 deterministic rational-oracle samples, half-cent neighbors/ties, fractional FTE, maximum stock/rate, malformed inputs, and output/input tampering. 10 people, 8 contracted FTE, 50% allocation and USD12.34/FTE/month gives USD98.72/month; changing assignment or productivity alone leaves that unchanged.
- New six-month records: eight scenarios occupy 386,170 canonical bytes; the ninth exceeds the unchanged 384 KiB bucket bound. Atomic rejection preserves draft, earlier bytes, readable records and saved status. Existing one-month count-limit and transaction-time bucket validation regressions still pass.
- `tests/fixtures/swp-capacity-v1.json` was generated using the original production modules extracted with `git archive 7177ce5f9f7abeb432b14f1d9a2ad9e5f3c11cb6 lib`. Read/reopen compares complete serialized bytes with this fixture. The capacity engine and old per-employee demo source have no diff.

Initial dependency installation failed because the default npm cache was not writable. One corrected installation using `/tmp/people-analytics-npm-cache` succeeded; no package or lockfile changes were needed. No unresolved dependency, backend or transfer error remains.

The implementation is local and awaiting independent review/parent publication coordination. No paid AI, database writes, security changes, environment changes, push, merge or deployment were performed.
