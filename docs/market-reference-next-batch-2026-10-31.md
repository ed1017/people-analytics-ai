# Remaining vacancy evidence and next reference batch

Status: implementation in progress, not yet released. Production baseline is PR493, runtime `07cd690d940fdb6108915f8d1e5b4bff41aa693b`, with 40 of 197 modeled vacancies eligible for a pay reference. Eligibility is not confirmation of actual duties or an approved salary.

## Reconciled coverage

The current immutable register leaves 157 vacancies without a supported mapping: India 59, United States 20, Canada 15, United Kingdom 11, Singapore 11, Germany 10, Australia 9, Japan 8, Brazil 7 and France 7. All vacancy locations use modeled country assignment. US positions have no verified state or city, so the recovered state workbook cannot justify state-specific adoption.

The largest uncovered groups are India Brand Marketing Specialist and Cybersecurity Analyst (four each), India Program Manager (three), US Financial Planning and Analysis Analyst (three), and UK Corporate Development Analyst (three). Their titles alone do not establish a suitable wage occupation.

## Selected scope

Five UK vacancies have a reviewed conditional crosswalk: Accountant to SOC2421, Quality Assurance Engineer to 2136, Business Intelligence Analyst to 3544, Talent Management Specialist to 3571, and Sales Account Executive to 3552. Adoption must confirm the relevant qualified accounting/audit, software testing, data analysis, appraisal/training-policy advice, or technical sales duties. A newly modeled title is not evidence of qualifications or duties.

The verified ONS ASHE 2026 provisional archive and annual pay/CV workbooks retain their previously recorded hashes. The new rows are 152, 88, 261 and 265; Talent Management reuses row274 as a separately versioned role reference. Values remain annual gross GBP for full-time employee jobs, adult rates, same job over one year, tax year ending April 5, 2026. QA mean CV is 11%; it is not mislabeled as below 10% precision. No chosen wage cell is suppressed.

US Sourcing Specialist can use the explicitly named **13-1020 Buyers and Purchasing Agents** aggregate with purchasing-agent duties. The May 2025 source publishes that aggregate at row 79 with median USD 77,710 and mean USD 83,770. It does not separately publish 13-1023. This is an explicit broader reference, not a substituted exact-role wage. The verified services-sales row815 supplies SOC41-3091 annual median USD69,990 and mean USD82,430. Adoption explicitly excludes advertising, insurance, financial-services and travel sales. The seven conditional references target coverage of 47/197, leaving150.

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
