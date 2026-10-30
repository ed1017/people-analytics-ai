# Market and Talent Inventory publication - October 30, 2026

PR460 market exploration and PR461 Talent Inventory are now published together. Talent Inventory contains 9,234 modeled positions (9,037 filled and 197 vacant) reconciled to 2,889 reviewed synthetic aggregate cohorts. A separate 76-position worked example supports the explicit 12-vacancy allocation: hire 3, repurpose 6, train 3. Location and observed position FTE remain unknown where absent. Allocation, readiness, costs and donor impacts are scenario assumptions; the baseline is unchanged.

## Release identity and recovery

- PR461 candidate: `8d3c6d212f25e5ce3c9c9f186578e8649f24bede`; merge: `65fa9c5881d986104da8e5a14364d896d9f79726`.
- Deployment: `dpl_CZ9qXzZoDfJNgHtsWmZnaqrzj5Pq`; https://people-analytics-q94ddbyqg-ed-56dc.vercel.app. www.ed-ai.app resolves to this deployment.
- Runtime package: SHA-256 `8d9216927cdc12e3ac1ab00b48b11890d1cb882c02013482ed5d2ceadc8b7a0d`, 1,128 entries. All 983 public manifest files match. Private/runtime-only inputs remain byte-identical to the healthy PR458 package based on runtime `7453e9cf151f3888145ac3296824d07a91dd93d4`.
- The earlier files-based PR460 deployment `dpl_CdypkJ6ZfcKXGACgad97C9YrPoPr` failed at runtime and was rolled back to `dpl_F9CEh2oocugK6aewDvbebzd3sDcZ`. That build did not reproduce the existing per-deployment organization metadata. The replacement used the existing authenticated CLI, `--prod --skip-domain` and the exact existing organization ID. No guard was relaxed or persistent permission changed. Public domains stayed on the healthy rollback until staged runtime and behavioral checks passed; promotion reused that tested production build.

## Acceptance

Independent feature and package review passed; exact-head CI `40970994357` passed. Prior focused tests: 41 inventory/model/storage/dashboard/backup and 32 market/source/carry tests. The root aggregate passed 3,093 tests; required hosted tests passed 341 with one skip. The complete production package passed build, TypeScript and generated-data checks, resolving the incomplete public-source build's excluded-input limitation for this deployment.

Final protected staging and direct public browser acceptance each passed 14 checks at 1440px and 390px: actual HTTP200 entry; reconciled counts and filtering; explicit unknown-FTE assumption; 12=3+6+3; immutable capture and budget revision; invalid allocation blocks save; comparison/original reopen; reload; real goal switching; old-plan preservation; US exact values and optional training-reference carry; Canada and UK native-unit carries; and final position-draft preservation. Tests used isolated synthetic saved work, not visitor records. Screenshots were inspected locally. No page exceptions or horizontal overflow were observed. Staged position API returned HTTP200 with 2,889 cohorts and the expected September 30 snapshot.

The protected browser harness initially needed more asset-loading time. Separate test-fixture and composite Action Plan option-selector errors were corrected without app changes. Final reports are `talent-market-stage-v4-{1440,390}.json` and `talent-market-public-{1440,390}.json`, with local screenshots and package metadata retained.

## Limits retained

The internal `/api/bls` route and `/api/public-ai-capabilities` return HTTP503 with `Unavailable in the public synthetic release.` on both the previous healthy deployment and this candidate. The reviewed static market references work independently. This release does not claim live-AI restoration or new live BLS access. A bounded passive public diagnostic recorded two canceled dashboard GETs (`net::ERR_ABORTED`) and the same internal BLS HTTP503. The settled initial inventory view had no console errors or HTTP errors. This does not establish that every earlier rapid-navigation console message has a proven cause; the diagnostic and acceptance logs are retained.

No paid AI calls, external denied-source retries, new credentials, accounting changes or persistent security changes were made. Employment stock is not applicant availability; observed hiring time and a genuine position register remain evidence gaps. Existing saved goals, plans and versions are preserved.
