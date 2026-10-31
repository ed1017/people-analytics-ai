# Remaining vacancy evidence and next reference batch

PR495 is live at runtime `8e17f49f6ab2ec39c282178a54f2d73a9d7de9b1`, merge `4bbcc2a8e476caecbdf00aad03f0bd3ab7b42171`, deployment `dpl_5SzQeQsQRzYKg6CxcJFzofgA6nvD`. Coverage increased from 40 to 47 of 197 modeled vacancies. Eligibility is not confirmation of actual duties or an approved salary.

## Reconciled coverage

Before this batch, the immutable register left 157 vacancies without a supported mapping: India 59, United States 20, Canada 15, United Kingdom 11, Singapore 11, Germany 10, Australia 9, Japan 8, Brazil 7 and France 7. After release, the US remainder is 18 and UK remainder six; the other country counts are unchanged, totaling 150. Supported coverage is 33 US and 14 UK. All vacancy locations use modeled country assignment. US positions have no verified state or city, so the recovered state workbook cannot justify state-specific adoption.

The largest uncovered groups are India Brand Marketing Specialist and Cybersecurity Analyst (four each), India Program Manager (three), US Financial Planning and Analysis Analyst (three), and UK Corporate Development Analyst (three). Their titles alone do not establish a suitable wage occupation.

## Selected scope

Five UK vacancies have a reviewed conditional crosswalk: Accountant to SOC 2421, Quality Assurance Engineer to 2136, Business Intelligence Analyst to 3544, Talent Management Specialist to 3571, and Sales Account Executive to 3552. Adoption must confirm the relevant qualified accounting/audit, software testing, data analysis, appraisal/training-policy advice, or technical sales duties. A newly modeled title is not evidence of qualifications or duties.

The verified ONS ASHE 2026 provisional archive and annual pay/CV workbooks retain their previously recorded hashes. The new rows are 152, 88, 261 and 265; Talent Management reuses row 274 as a separately versioned role reference. Values remain annual gross GBP for full-time employee jobs, adult rates, same job over one year, tax year ending April 5, 2026. QA mean CV is 11%; it is not mislabeled as below 10% precision. No chosen wage cell is suppressed.

US Sourcing Specialist can use the explicitly named **13-1020 Buyers and Purchasing Agents** aggregate with purchasing-agent duties. The May 2025 source publishes that aggregate at row 79 with median USD 77,710 and mean USD 83,770. It does not separately publish 13-1023. This is an explicit broader reference, not a substituted exact-role wage. The verified services-sales row 815 supplies SOC 41-3091 annual median USD 69,990 and mean USD 82,430. Adoption explicitly excludes advertising, insurance, financial-services and travel sales. The seven conditional references target coverage of 47/197, leaving 150.

## What prevents a large coverage jump

- **India (59):** the official Labour Bureau Occupational Wage Survey checked does not provide a suitable current professional-role pay series for these vacancies. A permitted current occupational dataset covering the actual technical, marketing, finance and management roles is needed, with dates, wage basis, geography and reuse rights. Skills qualifications cannot supply wages or candidate availability.
- **US (20 at baseline):** the original national workbook is recovered. Remaining constraints are principally occupational fit, not file transfer. Broad `15-1299 All Other` wages are not used to make precise infrastructure/IT-role claims. FP&A, people analytics, HR systems, machine learning, cloud, product and corporate-development roles need specific duty evidence before a crosswalk. State comparisons additionally need a genuine state-level planning scope explicitly selected by the visitor or a verified location source.
- **UK (11 at baseline):** five reviewed duty-dependent references are in this batch. Corporate development and other unresolved roles need actual duty definitions; the existence of an occupation code does not prove fit.
- **Singapore (11):** the official 2025 wage tables are relevant candidates. Their statistics page links to MOM terms; no licence bridge to the Singapore Open Data Licence was verified for this workbook. Dataset-specific notices or publisher clarification are still needed before treating reuse as established. No conclusion is made that the portfolio is commercial or that all factual reuse is prohibited. Monthly basic/gross SGD must remain distinct from annual total employment cost.
- **Australia (9):** JSA occupation profiles suggest two possible references: Management Consultant within 2247 and Privacy Counsel within 2713. Workbook notices, exact cells, quality and provenance remain to be checked. The published basis is weekly AUD for full-time non-managerial adults; annualisation and FX would be explicit planning assumptions, not source facts. The other seven roles do not yet have defensible mappings.
- **Canada/Germany (25):** earlier denied source routes were not retried or bypassed. A permitted source file or distinct openly reusable official source is required.
- **Japan/Brazil/France (22):** no source-to-duty-to-pay contract for these vacancies has been verified in this batch. They remain unsupported rather than receiving guessed external wages.

References: [ONS ASHE Table 14](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/occupation4digitsoc2010ashetable14), [ONS SOC2020 definitions](https://www.ons.gov.uk/file?uri=/methodology/classificationsandstandards/standardoccupationalclassificationsoc/soc2020/soc2020volume1structureanddescriptionsofunitgroups/soc2020volume1structureanddescriptionofunitgroups20260827.pdf), [MOM wage tables](https://stats.mom.gov.sg/Pages/Occupational-Wages-Tables2025.aspx), [MOM terms](https://www.mom.gov.sg/terms-of-use), [JSA copyright](https://www.jobsandskills.gov.au/copyright-and-disclaimer).

No employment totals are treated as available applicants, no broad hiring-difficulty series is converted into role-specific time-to-hire, and no paid provider calls or access changes are part of this release.

## Release verification

- 158 affected regression checks, the position feature type graph, full packaged build/TypeScript and exact-head CI `41228435697` passed. Independent review passed with 54 focused tests, source parity and unchanged prior reference bytes.
- The no-domain production stage was `https://people-analytics-mziwbczvc-ed-56dc.vercel.app`. Its archive SHA-256 is `3954c7a7c2dfbe59cfd109af04d52f91f53b3ab840174d8645c657606c53e02a`: 1,194 inputs and 1,049 manifest files, six changed source/test files. Private inputs and dependency locks were unchanged. The existing dependency audit findings were not modified in this data release.
- Staged desktop 1440px and mobile 390px each passed 13 groups. Both had zero page, blocked-request or bridge errors during acceptance. The protected bridge reached its 15-second teardown bound afterward; that transport limitation is retained in the reports rather than counted as a clean shutdown.
- After exact-build promotion, direct public desktop 1440px and mobile 390px each passed all 13 groups with HTTP 200, zero page/blocked/bridge errors and drained teardown. Actual rendered mobile UK-sales and procurement, and desktop US-sales evidence were inspected. The canonical hostname resolved to the exact deployment above.
- Reports: `position-market-role-expansion-{stage,public}-8e17f49-{1440,390}.json`. Checks restore the actual PR493 backup, preserve original workspaces, create a separate goal explicitly, review/cancel/adopt each new reference, reject unsupported/mixed-role cases, preserve immutable prior revisions, record a dated result through Track/Review, and export/cancel/restore the expanded backup. Entered 1.25 USD/GBP and 20% on-cost are isolated QA assumptions, not fetched rates or Finance approvals.
- New Talent Management and existing Talent Acquisition references share a source occupation but retain different immutable role identities. No old saved revision is reinterpreted. Services sales retains all four sector exclusions; procurement remains visibly the published buyer aggregate.

This release does not establish applicant availability, role-specific hiring time, actual state locations or live-model answer acceptance. Lab validation remains user-owned and the chart target overlay remains preview-only.
