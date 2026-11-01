# Occupational core skills: source and release record

## Decision and scope

The November 1 continuation prioritizes useful non-pay market information. The existing catalogue has software flags, employment projections and UK hiring difficulty but no attachable numeric core-skill requirements. This slice adds essential and transferable skill requirements to already reviewed US occupation mappings. It does not manufacture duties or expand role/country eligibility.

Baseline: 50 of 197 vacancies have some conditional non-pay reference (47 US, 3 UK); pay coverage is 59. The remaining 147 non-pay gaps are US 4, UK 17, India 59, Canada 15, Singapore 11, Germany 10, Australia 9, Japan 8, Brazil 7 and France 7. These are eligibility counts, not actual adopted sources or proof of candidate availability. This addition enriches existing coverage rather than counting those vacancies again.

## Verified originals

Downloaded November 1 from the official O*NET 31.0 bulk CSV links. Originals remain unchanged outside the runtime fixture. Independent hash/schema checks passed.

| File | Bytes | Records | SHA256 |
|---|---:|---:|---|
| essential_skills.csv | 2328135 | 18200 | 68c4d31d8c55077238395dca40cc4e6d32e6a608b5474bb8264b1f98ae415bd7 |
| transferable_skills.csv | 6081245 | 45500 | f17d0419e818a3bf2f55076510c76c4aef01cc8f5aee2670d2f44f6f44ac60f7 |
| level_scale_anchors.csv | 45629 | 483 | 7205657fb54280827d6902b94e06f95ef0b9ed10f1f9f8ed3f02779d4c7a9573 |
| scales_reference.csv | 1006 | 33 | bcba23858ce21ecaacbde303a8993e35d46724b4afb8c9ec2b10e04f42adcfc9 |

Source base URL: https://www.onetcenter.org/dl_files/database/db_31_0_csv/ . [Database](https://www.onetcenter.org/database.html), [essential dictionary](https://www.onetcenter.org/dictionary/31.0/csv/essential_skills.html), [transferable dictionary](https://www.onetcenter.org/dictionary/31.0/csv/transferable_skills.html), [analyst methodology](https://www.onetcenter.org/dictionary/31.0/csv/appendix_analyst.html).

The downloadable O*NET®31.0 Database is CC BY 4.0. Credit O*NET 31.0 and USDOL/ETA, link the licence, identify extraction/filtering modifications and do not imply endorsement. [Database licence](https://www.onetcenter.org/license_db.html), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Interpretation contract

- All 19 existing full O*NET occupation codes are present, including 15-2051.01 separately from 15-2051.00. No suffix stripping or fallback occupation is used.
- The bounded source selection contains 380 essential and 950 transferable ratings: 35 distinct skills times two scales for 19 occupations. Anchors cover all 35 skills.
- Importance is1–5; Level is0–7 with element-specific anchors. Importance sorting is not a demand-volume score. Level ratings across different skills are not a common employee proficiency test.
- Preserve each raw rating date, domain source, N, standard error, confidence bounds and quality flags. Database release date is not each rating's observation date. The full sources span June2010–August2026.
- Recommend Suppress=Y overrides other numeric display. Level Not Relevant=Y is text, not zero. Blank IM relevance is expected. Genuine valid zero levels remain zero. N describes analyst ratings, not respondents in the fictional company or available workers.
- Occupational requirements can inform interview and training topics. They do not measure employee skill gaps, applicant supply, local hiring demand, training duration, readiness or ROI. No costs, timing, allocations or approvals change automatically.
- Existing references, saved revisions and message snapshots remain immutable; new attachment follows the existing explicit review/cancel/confirm workflow. General lookup stays read-only.

## Compatibility baseline

PR523 catalogue: 62 references, canonical JSON SHA256 `3a678c0a4dba4910c71c6f9d894181c9fb38f257e17d975e8eaee129388defae`. New references must be additive. A native backup captured from live PR523 contains an actual UI-created US software market message, unsent draft and prior goals for cross-release browser verification.

## Validation and release

Independent extraction verified all 1,330 rating records, 105 anchors and both scales. The 17 focused backend/UI tests and focused TypeScript graph passed. All 62 prior references retain their canonical hash; all 30 new role references fit existing lookup and scenario payload bounds. Historical regression compatibility and browser acceptance are in progress. This record does not yet claim a released feature or tested model answer. No paid provider calls, new credentials, access changes, denied source retries, Lab validation or chart-overlay publication are included.
