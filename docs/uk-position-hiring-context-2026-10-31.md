# UK position hiring-difficulty references

Status: live and verified on October 31, 2026 (PR510).

## Source and bounded scope

DfE Employer Skills Survey 2024, UK national K02000001, Calendar year, sector Total, fully specified SOC2020 hierarchy. Source CSV: https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/1c000555-8188-4e28-ac32-22313d8702a1/csv. Original 35,100,885 bytes; SHA256 `557dbafc39bdcfd96ec6637d8dcaef42c6babbb467359efe7cbed67d1ca65156`. Parent Linux extraction verified original bytes and exact rows; this Windows batch uses that verified payload, not a new download. Release July 24, 2025; fieldwork June 2024 through January 2025. Open Government Licence v3.0; retain DfE attribution and source definitions.

Two numeric rows are published: SOC3571 Human resources and industrial relations officers (CSV row160050), and SOC2421 Chartered and certified accountants (row160121). Existing reviewed duty mappings cover Talent Acquisition Specialist, Talent Management Specialist and Accountant: three modeled GB vacancies. Role mapping requires explicit applicability confirmation. These are occupational survey references, not authenticated company records or Finance approvals.

| SOC | Occupation-response base | Vacancies | Hard-to-fill vacancies | Skill-shortage vacancies | Published hard-to-fill density | Published skill-shortage density |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 3571 | 67 | 10,600 | 3,200 | 2,700 | 30.3747202081464% | 25.2094447650735% |
| 2421 | 54 | 3,900 | 1,100 | 600 | 28.2965542462185% | 15.7169911100923% |

Use published densities directly, never ratios reconstructed from rounded counts. Skill-shortage vacancies are a subset of hard-to-fill vacancies; do not add the two categories. The base counts occupation responses from sites, not unique employers. The app's conservative base of at least50 is a presentation policy, not a claim that the original CSV uses that suppression threshold. Counts are rounded, national and dated; no available-applicant count, local estimate or days-to-fill is implied. No automatic timing, budget, skill proficiency or readiness assumption.

## Excluded evidence

- SOC2135 Cyber security professionals, row160111: base c; all five measures u.
- SOC1136 Human resource managers/directors, row160092: base15; all five measures u.
- SOC3544 Data analysts, row160150: base5; all five measures u.
- SOC3552 Business sales executives, row160153: base29; all five measures u.
- SOC2136 IT quality/testing has no2024 row anywhere in the inspected source; only2022 rows exist. No year or broader-occupation substitution. Absence cause is unknown.
- Previously inspected software2134 base33 and solicitors2412 base49 remain held from primary detailed comparisons under the app policy.

DfE EES guidance defines c as confidential/suppressed and u as low reliability: https://dfe-analytical-services.github.io/analysts-guide/statistics-production/ud.html. Preserve raw symbols and absent-versus-suppressed states; neither is zero. Fully specified hierarchy selection excludes repeated Total variants, preventing duplicate aggregation. No unrestricted use of major-group2: HR3571 is in major-group3.

## Compatibility and acceptance contract

Append canonical hiring-difficulty references without altering any of the47 released US reference objects or versions captured from runtime db929e7. Reuse explicit review/attach/reopen, saved allocation scope, goal isolation, canonical server reconstruction and backup validation. General chat may read GB references independently but never attaches them or changes a plan. Existing US, unsupported geography and exact occupation codes remain distinct.

Required checks: source/raw-string and published-density invariants; three-vacancy coverage; all47 old-reference hashes; suppressed/absent/low-base exclusion; exact-country/catalogue routing; canonical saved-context explanations; explicit consent/cancel/stale/repeated flows; original saved records and backup restoration; desktop/mobile rendering; independent review, aggregate tests, CI, isolated stage and public acceptance. No paid model calls. Release results follow.


## Verified release

- Runtime `ce8ade7d41d8356fbb1cba02afbf3c2d9063bc25`; merge `cd646916ea616f37552f3f9a610e52acc9356398`; deployment `dpl_CxX5bYj6yBhaBxSRKvFhPrUBHszc`.
- Exact CI `41249015675` passed. Independent review included 26 focused tests; 148 affected aggregate tests and the position type graph passed. The isolated production build passed full TypeScript and generated checks.
- Archive SHA256 `b6b8e061d0c58dd45e4e485044fa831c0fbd86206f8c6a21bbb893be5b4254bf`: 1,207 runtime inputs, 1,062 manifest files; private inputs unchanged. Tested stage `people-analytics-dqgs6s5zz-ed-56dc.vercel.app` was promoted unchanged; canonical www.ed-ai.app resolves to that deployment.
- Staged and direct public desktop (1440px) and mobile (390px) each passed nine workflow groups and nine intercepted explanation requests: actual previous public backup, explicit goal copy, consent/cancel, stale revision, immutable context/reopen/clear, reload isolation, Overview handoff, eligible/unsupported roles, and backup restoration. Public navigation returned HTTP 200; application, mock, blocked-request and bridge errors were zero; teardown drained. Public screenshots were inspected.
- Protected-stage bridge cleanup timed out after all assertions, producing four already-handled route errors per width. There were zero bridge errors before teardown; direct public runs had none. This is recorded as a harness cleanup limitation, not a production error or omitted test.
- Coverage: three UK vacancies gain hiring-difficulty context; any non-pay context is now 43/197. Software remains 40/197, outlook 39/197, pay 59/197. These overlap and must not be added together. All 47 previous US canonical references retain their exact hashes and versions.

General chat can retrieve UK hiring-difficulty references by explicit country and reviewed role/code; this is covered by deterministic routing/tool tests. Browser explanation POSTs were locally fulfilled with canonical-payload assertions. No paid requests, fresh model tool-choice acceptance, or fresh provider-answer-quality claims. No spending, access, credentials, Lab or chart-overlay changes.

Evidence files: `integration-evidence/UK-HIRING-CONTEXT-RELEASE.json`, `UK-HIRING-CONTEXT-PACKAGE.json`, `uk-hiring-context-aggregate.log`, and `position-market-uk-hiring-{stage,public}-ce8ade7-{1440,390}.json` in the authorized executor workspace. They contain test artifacts, not secrets or new source authority.

## Remaining source boundaries

All six requested follow-up codes are resolved: 3571 numeric; 2135/1136/3544/3552 low-reliability; 2136 absent in 2024. No further extraction is awaited for this slice. Wider exact-role UK coverage requires eligible published observations; suppressed cells cannot be reconstructed. Direct available-applicant counts and measured role-specific hiring time remain unverified. Australia customised-report rights and Germany duration-workbook rights remain unresolved; do not publish those held records. Existing broader UK nation context remains separate.
