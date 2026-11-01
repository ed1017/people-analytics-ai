# UK occupation demand: source and release record

## Scope and decision

The user requested the next non-pay expansion after PR525/526. This batch adds published Skills England demand classifications for existing reviewed UK occupation mappings. Expected coverage is 61 of 197 vacancies, up from 50; UK coverage rises from 3 to 14 of 20. Pay remains 59 of 197. No duties are invented or changed to obtain a match.

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

Implementation passes 55 affected backend tests, 15 existing hiring tests and 33 shared UI/chat tests; focused TypeScript has zero diagnostics. Independent extraction reproduced all nine selected raw rows. Final review and browser acceptance are pending. No live release is claimed here yet. No paid provider calls, credentials/access changes, source-denial bypass, Lab validation or chart-overlay promotion are authorized by this batch.
