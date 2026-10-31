# US position-market pay expansion

Status: PR491 live; direct-public desktop/mobile acceptance passed.

## Source recovery and provenance

The user supplied the national and state May 2025 OEWS originals. Supported Windows materialization failed at the required extended-attribute step (`os.setxattr` unavailable), without installing an accepted workbook. The parent then used the supported Linux Library workflow, verified ZIP integrity and exact original hashes, and relayed a bounded source-row payload. No denied BLS download was retried and the original files were not modified.

National attachment: `national_M2025_dl(1).xlsx`, Library `libfile_67511b6bcce481919aabaf467c294a8c`, file `file_00000000d0b081f98be1026cec8cc85c`, version 0, 289,615 bytes. Original SHA-256: `852250997ceff9b721ff68f63e877d818f9c1ec8b1b69dd367958faedd5282b2`. This is the workbook hash, not the older derived JSON hash. Worksheet `national_M2025_dl`; field definitions in `Field Descriptions`; source vintage May 2025, released May 15, 2026.

All twelve requested rows uniquely matched AREA 99, NAICS 000000, ownership 1235, detailed occupation and cross-industry filters. Nine are new candidate references; Software Developers, Data Scientists and Registered Nurses are parity controls. Source annual mean/median cells are preserved, as are blank ANNUAL/HOURLY flags and lexical error estimates. `*` means wage unavailable, `**` employment unavailable and `#` a top-coded wage threshold, not an exact value. Employment and its PRSE never become applicant supply or wage uncertainty.

The state attachment was also recovered but is not used by this batch. Country-only modeled positions do not establish a state or metro mapping.

## Bounded mapping review

| Internal US role | Vacancies | National occupation reference | Mapping condition |
|---|---:|---|---|
| Accountant | 3 | 13-2011 Accountants and Auditors | Accounting records and financial statements |
| Privacy Counsel / Legal Counsel | 3 / 1 | 23-1011 Lawyers | Legal advice; broader lawyer pay, not privacy-specialist wages |
| Project Manager | 3 | 13-1082 Project Management Specialists | Project schedule, staffing and budget coordination |
| User Experience Designer | 3 | 15-1255 Web and Digital Interface Designers | Digital-interface and usability duties |
| Information Security Analyst | 2 | 15-1212 Information Security Analysts | Security assessment and controls |
| Management Consultant | 2 | 13-1111 Management Analysts | Organizational analysis and management advice |
| Communications Specialist | 2 | 27-3031 Public Relations Specialists | Organizational/public communications |
| Data Architect | 2 | 15-1243 Database Architects | Database and warehouse architecture |
| Total Rewards Specialist | 1 | 13-1141 Compensation, Benefits, and Job Analysis Specialists | Specialist compensation/benefits work, not manager/director pay |

Official O*NET occupation definitions were independently reviewed. Each reference remains broader than an employer-specific role; adoption requires explicit duties and wage-basis confirmation. No automatic FP&A, Data Engineer, generic operations or machine-learning mapping is added. Exact-ID eligibility tests confirm 22 additional vacancies, raising coverage from 12 to 34 of 197.

## Contract and release gates

The new references supply national USD annual wages, excluding employer benefits. They do not establish location premiums, seniority bands, total compensation, company-approved funding, hiring time or available candidates. The visitor explicitly selects a statistic and employer on-cost; existing budget, allocation, timing and approval state stay unchanged. Supporting source/mapping details remain under Details.

Prior US software/BI and UK reference objects must remain byte-compatible. New immutable evidence binds to the selected position scope and exact saved revision, survives backup and Track/Review, and is invalidated only for incompatible current edits. No original history is rewritten.

Required gates: independent source/code review; raw source and parity validation; exact coverage and suppression tests; focused/aggregate regressions; type graph and exact-head CI; production-equivalent no-domain staging; direct public desktop/mobile checks of adoption, cancel, stale/mixed/unsupported scope, original revisions, reload, Track/Review and backup restore. No paid AI calls, new permissions, Lab work or chart-overlay default changes.

Candidate PR491 is `9932e961736f027c3c2ac7dcf25d6c13ac6dde4d`. Independent review found no blocking issue. The 145 affected model/UI/storage/finance/handoff/tracking/backup/source tests and the position feature type graph passed. The exact ID coverage test confirms 34 of 197 (25 US and nine UK), with 163 unsupported vacancies left neutral.

The isolated production package has 1,194 inputs and 1,049 manifest files. Its archive SHA-256 is `63ebb90024667e60aedd2875218fb0b3d96a957cdb42cc787b926a73f4b3ad6b`; only five source files changed and private inputs remain identical to the prior accepted package. Full build/TypeScript and exact-head CI `41219477499` passed. Production-equivalent deployment `dpl_64sEzx63QYUqeAjxMm29iScMDxVd`, `https://people-analytics-hob8dhg1d-ed-56dc.vercel.app`, was tested without public domains before promotion. PR491 merged as `3fff83aeb95aea1662dc0d4bc368e6453d114a4e`; the same tested runtime `9932e961736f027c3c2ac7dcf25d6c13ac6dde4d` was promoted without rebuilding.

The first protected desktop run timed out waiting for navigation after the restore button had executed. Its final DOM was the dataset-loading screen, with no page errors or bridge errors before teardown. Late route-already-handled/closed-context errors occurred during the bounded teardown. This is retained as a failed staging attempt, not counted as passed restoration. An isolated desktop retry and the mobile run each passed all 14 journey groups. Both protected runs retained the known 15-second teardown timeout and late dashboard/capabilities route-already-handled messages; no page, blocked-request or pre-teardown bridge errors occurred.

Final direct-public 1440px and 390px runs each passed all 14 groups, with all document responses HTTP 200, zero page/blocked/bridge errors and clean teardown. Reports are `integration-evidence/position-market-us-batch-public-9932e961-{1440,390}.json` in the authorized QA workspace, with screenshots and actual exported backups. Actual desktop/mobile images were inspected. The public hostname resolved through Vercel deployment lookup to `dpl_64sEzx63QYUqeAjxMm29iScMDxVd`; its verified package/build establishes the source identity. Public HTML has no commit header, so no header-based SHA claim is made.

Acceptance covered the prior PR489 backup, all nine national references, explicit mean/median/on-cost adoption and cancellation, stale review, same-SOC mixed roles, unsupported FP&A, original revision preservation, reload, dated manual Track/Review results, and expanded backup cancel/restore. No paid provider calls occurred. The original workbook remains in Library; only bounded verified rows and provenance are included in source. Remaining 163 vacancies, applicant availability and role-level hiring time are not invented. State-specific mappings are outside this batch.
