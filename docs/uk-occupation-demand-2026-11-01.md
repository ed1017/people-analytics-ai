# UK occupation demand: source and release record

## Scope and decision

The user requested the next non-pay expansion after PR525/526. This batch adds published Skills England demand classifications for existing reviewed UK occupation mappings. Verified live coverage is 61 of 197 vacancies, up from 50; UK coverage rises from 3 to 14 of 20. Pay remains 59 of 197. No duties are invented or changed to obtain a match.

Newly eligible: Legal Counsel 3; HR Business Partner 1; Business Intelligence Analyst 1; Software Engineer, Frontend Software Engineer and Backend Software Engineer 1 each; Cybersecurity Engineer 1; Quality Assurance Engineer 1; Sales Account Executive 1. Existing HR officers/accountants receive an additional reference. All mappings retain their explicit duty acknowledgement. Corporate Development 3, AI Engineer 1, Business Operations 1 and Client Operations 1 remain unsupported in the UK.

## Source contract

[Official 2025 release](https://explore-education-statistics.service.gov.uk/find-statistics/occupations-in-demand/2025), published December 11, 2025; release updated January 8, 2026. [Download and explicit Data guidance licence](https://explore-education-statistics.service.gov.uk/find-statistics/occupations-in-demand/2025/explore). [Methodology](https://explore-education-statistics.service.gov.uk/methodology/occupations-in-demand-2025-methodology).

Original supporting CSV: 110,147 bytes, 368 records, SHA256 `c951a2e8d38cb9be3ac7e8bd7f8d7bdd4809906083c8d56e07ed24e3032ed3ac`. Download URL: https://content.explore-education-statistics.service.gov.uk/api/releases/b20e696c-8f0a-4dcc-a1e2-3cb4b963ab80/files/a8afa497-df8d-4407-905f-f2af7179f2fb . Retain all raw fields and header-based record coordinates for the nine selected SOC2020 rows: 1136, 2134, 2135, 2136, 2412, 2421, 3544, 3552, 3571.

The published government outputs are released under Open Government Licence v3.0. This does not grant reuse of underlying third-party microdata. Attribution credits Skills England/Department for Education and links the source and OGL.

## Interpretation and preservation

- Published Critical demand, Elevated demand and Not in high demand are categories from a composite assessment. They are not a shortage score, applicant count, hiring duration or staffing approval.
- Preserve the named indicators in demand, uncertainty and imputation fields. The summary CSV does not supply five individual indicator categories; do not manufacture those or derive the classification from its informational index. All selected rows report no flagged uncertainty and no imputed indicators; this is a source flag, not a claim of certainty.
- Source periods differ: visa grants Q4 2024–Q2 2025 and online adverts Q4 2024–Q3 2025 both use employment denominators July 2024–June 2025; hourly wage and hours change compare the year to April 2024 with the year to April 2025; wage premium uses the year to April 2025. Wage/hours inputs exclude Northern Ireland although the overall release is UK-level.
- Official statistics in development; methodology changed from the prior release. No unqualified trend comparison. Missing/excluded records stay unavailable, not Not in high demand.
- Reader cards and AI lookup use the same canonical values. Source attachment is explicit and creates a revision; no automatic cost, timing, allocation or approval updates. Prior chat snapshots, saved plans and source revisions remain unchanged.

Baseline canonical catalogue: 92 references, JSON SHA256 `1c886d41b75bb4b987bef142a019ba60e318258d0acb951c90f97d6607dda5d7`. Twelve additive role references are expected.

## Other source research and boundaries

Australia JSA 2026 OSL is a distinct non-pay source from the held ABS wages workbook. Its official XLSX retrieval timed out twice (one bounded retry), zero bytes, no denial. No ratings or workbook-specific rights were verified; no app records added. Possible duty-fit candidates are not coverage claims. India, Singapore and prior denied Canada/Germany routes remain gated.

France Travail BMO2026 original workbook was recovered: 3,755,481 bytes, SHA256 `735d0443b799b4c18c145055f87244a355a48b6286ee98ddbab272491d9792e0`, ZIP integrity passed. Official data.gouv catalogue specifies Open Licence. It contains 53,786 basin-level records and suppressed values, not national rows. Do not infer national totals by zero-filling or summing suppressed cells. National published figures and duty crosswalks remain a separate next research step; no French records are included in this release.

## Validation and release

PR527 runtime `13529d2a74c1af166b8713f2ac902aa91d916322`; merge `4128b7ab02fb66defb55348b0afe991ca85effd6`. Exact deployment `dpl_EviE3unKvTZFURht5Wc3TBfoWDRd` (`people-analytics-r8qlf41hv-ed-56dc.vercel.app`) was built without domains, tested and promoted unchanged. Public deployment identity is confirmed; direct public desktop/mobile acceptance passed the same ten groups, HTTP 200, eight mocked responses each, no replay, empty error arrays and drained teardown.

Independent extraction verified all nine raw records against the 368-row original. Review corrected the five indicator period labels to official methodology and confirmed the existing duty crosswalks. No numerical source values or prior references changed. Fourteen focused tests passed after the metadata correction. The full affected market workflow passed 133 tests; focused TypeScript had zero diagnostics. Exact CI 41276975592 passed every step, including 3,095 historical tests, generated artifacts and TypeScript. Hosted prebuild, compilation and input audit passed.

Initial CI41276728249 found an obsolete test expecting every UK Frontend reference to be absent. The test now explicitly rejects US-only outlook/software/core-skill references and requires the exact UK demand reference, retaining mixed-role guards. The final exact head was rebuilt and tested; the earlier isolated deployment was never promoted.

Final source archive SHA256 `885748f33ac1f92e3f01bed081f92fefd75195682222412bbc3d3d00cd1a2020`, 1,233 runtime inputs and 1,088 manifest entries; private inputs unchanged. Staged desktop 1440/mobile 390 each passed ten journey groups: actual pre-upgrade chat/backup preservation, three published categories, source periods, consent/cancel, stale attachment, immutable revisions, Inventory/Overview context, reload, unsupported/foreign/mixed scope, restore and Track copy. HTTP 200 throughout, eight mocked responses each, all error arrays empty and teardown drained. Focused category/details images were inspected.

All model traffic was intercepted or blocked; canonical tool/context behavior was tested, not fresh model answer quality. No paid calls, new credentials/access, denied-route workarounds, Lab validation or chart-overlay promotion occurred.
