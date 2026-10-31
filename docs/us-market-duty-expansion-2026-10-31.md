# US role-duty expansion

Status: PR493 live; final direct-public desktop/mobile acceptance passed.

## Inventory boundary

The refreshed inventory eligibility check retains 34 of 197 covered vacancies and 163 unsupported. The United States has 26 unsupported vacancies. Every company-register vacancy uses `modeled-country-assignment`; the US location label is `United States`, without a verified state or city. The recovered state workbook therefore cannot establish vacancy-specific state wages. No location is inferred from business unit, role, or a national pay reference.

Remaining vacancies by country: India 59, US 26, Canada 15, UK 11, Singapore 11, Germany 10, Australia 9, Japan 8, Brazil 7 and France 7. This batch prioritizes the recovered, verified US evidence rather than manufacturing mappings for larger groups whose role-specific wage sources remain unsupported. The existing India/Canada source limitations are not bypassed.

## Bounded candidate batch

| Role | Vacancies | Wage occupation | Required duty match |
|---|---:|---|---|
| Data Engineer | 2 | 15-1243 Database Architects | Database/warehouse design and integration; not every data pipeline role |
| Business Intelligence Developer | 2 | 15-2051 Data Scientists | BI reporting tools and databases, with O*NET 15-2051.01 duties; broader occupation wages, not developer-specific pay |
| Transformation Consultant | 1 | 13-1111 Management Analysts | Organizational studies and process improvement |
| Quality Assurance Engineer | 1 | 15-1253 Software Quality Assurance Analysts and Testers | Software testing; not manufacturing quality |
| Sourcing Specialist (excluded) | 1 | 13-1023 not separately published | No automatic substitution of the broader buyer/purchasing aggregate |

The sourcing profile is `PROC-SOURCING`, so an initial recruiting interpretation was rejected before implementation. Official duties references: [database architecture](https://www.onetonline.org/link/summary/15-1243.00), [business intelligence](https://www.onetonline.org/link/summary/15-2051.01), [management analysis](https://www.onetonline.org/link/summary/13-1111.00), [software QA](https://www.onetonline.org/link/summary/15-1253.00), [procurement](https://www.onetonline.org/link/summary/13-1023.00).

Three references reuse the verified national workbook rows from PR491. The parent rechecked the original workbook hash at 2026-10-31 17:30:16 UTC and extracted the exact software QA row 150: median 104,300 (AB150), mean 111,490 (S150), USD annual wages. The original SHA-256 remains `852250997ceff9b721ff68f63e877d818f9c1ec8b1b69dd367958faedd5282b2`; raw blank ANNUAL/HOURLY flags and lexical error estimates are preserved.

SOC 13-1023 occurs nowhere in that worksheet. It publishes 13-1020 Buyers and Purchasing Agents twice, broad row 78 and detailed row 79. The source definition explains that a detailed designation can represent an aggregate. Those diagnostic rows are not substituted into procurement pay. This batch contains four roles and six additional vacancies, supporting 40 of 197; procurement remains unsupported.

HR Systems, Machine Learning, People Analytics, FP&A, Corporate Development and Cloud roles remain unresolved because their titles do not establish a single sufficiently precise occupation/duty match. No speculative pay mappings, state assignments, candidate-availability estimates or hiring-time claims are introduced.

## Compatibility and gates

All existing reference objects and saved revisions remain immutable. New national annual USD assumptions require explicit duties and wage-basis confirmation and reviewed adoption. Budget, allocation, approval status and timing do not change automatically. The BI Developer duties link must describe the actual BI duties destination rather than mislabel it Data Scientists duties.

Independent review, source invariants, affected regression/type checks, exact-commit CI and staged/public desktop/mobile acceptance are required. Acceptance restores the actual prior backup and checks original references, new adoption/cancel/stale/mixed scope, revisions, Track/Review and backup restore. No paid AI calls, permissions, credentials, Lab work or chart-overlay changes.

## Candidate validation

PR493 candidate `07cd690d940fdb6108915f8d1e5b4bff41aa693b` passed 152 affected tests, the position feature type graph and independent review. Existing first-ten US reference bytes and prior fixture rows remain unchanged. The isolated package contains 1,194 verified inputs and 1,049 manifest files; archive SHA-256 `34177ba093602a634056d36ca46c60eda5cea816237a85f3f62a538800feae05`. Five source files changed; private inputs and dependencies remain unchanged. Full build/TypeScript and exact-head CI 41225149380 passed. Staged deployment dpl_2N94372CZ5JkqR1Lh99d56GFHAA9 is ready at https://people-analytics-2sb0lgezo-ed-56dc.vercel.app without public domains. Desktop staged acceptance passed all 10 groups. Mobile passed all four role adoptions/saves, followed by a focused seven-group continuation covering revision reload, Track/Review and combined backup. The exact tested build was promoted after merge 7bafd4b6302a900bd3289eaf9c3018485d609802. Canonical www.ed-ai.app resolves to the same deployment. Direct-public acceptance subsequently passed all 10 groups at both widths.

The first staged browser fixture restored an accumulated PR491 goal containing the existing maximum of 20 position revisions. Reopening prior references and new pay adoption worked, but the app correctly rejected another save without deleting existing scenarios. This failed test attempt is retained. The harness was corrected to create a fresh goal through the UI, keep the full original workspace unchanged, and verify both goals in the combined backup. No application limit, stored history or validation is changed to make the test pass.

The fresh-goal run then passed all four role adoptions/saves and unsupported/mixed-role checks, but a leftover test selector expected the old scenario number for a successful revision save. The selector was changed to the number derived from the fresh goal's copied ledger. The established General exploration to explicit tracking-goal handoff creates that goal without pruning original data. Failed artifacts are retained; remaining reload, Track/Review and combined-backup checks subsequently passed before promotion. No production code was changed for either test-fixture correction.

## Final release evidence

Runtime `07cd690d940fdb6108915f8d1e5b4bff41aa693b`, merge `7bafd4b6302a900bd3289eaf9c3018485d609802`, deployment `dpl_2N94372CZ5JkqR1Lh99d56GFHAA9`. The canonical public hostname resolves to that deployment, whose verified source archive and build identify the runtime; public HTML has no commit header.

Final direct-public 1440px and 390px each passed 10 journey groups, with document HTTP 200, zero page/blocked/bridge errors and clean teardown. Reports and actual backup exports are `integration-evidence/position-market-us-duty-expansion-public-07cd690d-{1440,390}.json` and associated files in the authorized QA workspace. Desktop/mobile screenshots were inspected. Protected-stage runs retain the known 15-second teardown timeout and late dashboard/capabilities route-handled artifacts separately from the clean public results.

Coverage is 40 of 197 vacancies: 31 US and nine UK. The remaining 157 receive no invented pay. Original full-goal and exploration workspaces remain unchanged through explicit fresh-goal creation, adoption, saved revisions, manual Track/Review and combined backup restoration. Procurement, state-specific position rates, applicant availability and role-specific hiring time remain outside this release. No paid AI calls or safeguard changes occurred.
