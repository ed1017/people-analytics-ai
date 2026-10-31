# UK position hiring-difficulty references

Status: implementation and verification in progress; not yet published.

## Source and bounded scope

DfE Employer Skills Survey 2024, UK national K02000001, Calendar year, sector Total, fully specified SOC2020 hierarchy. Source CSV: https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/1c000555-8188-4e28-ac32-22313d8702a1/csv. Original 35,100,885 bytes; SHA256 `557dbafc39bdcfd96ec6637d8dcaef42c6babbb467359efe7cbed67d1ca65156`. Parent Linux extraction verified original bytes and exact rows; this Windows batch uses that verified payload, not a new download. Release July 24, 2025; fieldwork June 2024 through January 2025. Open Government Licence v3.0; retain DfE attribution and source definitions.

Only two numeric rows are proposed: SOC3571 Human resources and industrial relations officers (CSV row160050), and SOC2421 Chartered and certified accountants (row160121). Existing reviewed duty mappings cover Talent Acquisition Specialist, Talent Management Specialist and Accountant: three modeled GB vacancies. Role mapping requires explicit applicability confirmation. These are occupational survey references, not authenticated company records or Finance approvals.

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

Required checks: source/raw-string and published-density invariants; three-vacancy coverage; all47 old-reference hashes; suppressed/absent/low-base exclusion; exact-country/catalogue routing; canonical saved-context explanations; explicit consent/cancel/stale/repeated flows; original saved records and backup restoration; desktop/mobile rendering; independent review, aggregate tests, CI, isolated stage and public acceptance. No paid model calls. Release results will be recorded after verification.
