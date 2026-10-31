# Ranked vacancy market coverage

PR489 is live and direct public desktop/mobile acceptance passed. Runtime `15579b694d771182cedf848a7626f20ffe823c83`, merge `64ae833708172a358d02c626fd8c4cedc85abdfe`, deployment `dpl_6yD7TBwzsCv41Mjn8L4zddrUfdD8`.

## Inventory priorities

The immutable company-position-model-v2 register contains 197 modeled vacancies. PR487 supports six, leaving 191. These counts represent position slots, not observed applicants or Finance approvals.

| Country | Uncovered vacancies before this batch |
|---|---:|
| India | 59 |
| United States | 48 |
| United Kingdom | 17 |
| Canada | 15 |
| Singapore | 11 |
| Germany | 10 |
| Australia | 9 |
| Japan | 8 |
| Brazil | 7 |
| France | 7 |

The largest role/country groups are India Brand Marketing Specialist and Cybersecurity Analyst (four each), UK Corporate Development Analyst and Legal Counsel (three each), and US Accountant, Financial Planning and Analysis Analyst, Privacy Counsel, Project Manager and UX Designer (three each). India Program Manager also has three. Coverage is not increased by assigning ambiguous titles to convenient pay rows.

## Chosen source-backed batch

| Internal UK role | Vacancies added | ONS SOC2020 reference | Annual median GBP | Annual mean GBP | Median/mean CV |
|---|---:|---|---:|---:|---|
| Legal Counsel | 3 | 2412 Solicitors and lawyers | 57,197.90 | 74,738.30 | 7.7% / 6.3% |
| Cybersecurity Engineer | 1 | 2135 Cyber security professionals | 55,372.70 | 65,521.60 | 6.2% / 5.3% |
| HR Business Partner | 1 | 1136 Human resource managers and directors | 61,445.20 | 75,399.70 | 3.8% / 4.0% |
| Talent Acquisition Specialist | 1 | 3571 Human resources and industrial relations officers | 36,612.20 | 42,101.30 | 4.3% / 4.1% |

This targets six additional vacancies, raising total coverage from six to twelve of 197, with 185 remaining. All require explicit duties/reference confirmation. ONS explicitly lists HR business partner under 1136; it is not silently grouped with recruitment advisers. Professional-occupation hiring difficulty is relevant only as a broad reference for major group 2, not for the HR manager/associate groups.

The existing authorized [ONS ASHE Table 14](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/occupation4digitsoc2010ashetable14) archive matches SHA-256 `4719f364d596739679d1bb492a1fc42e4c8e980a5b93ffc791e350f4ba8f4f1d`. Annual gross pay and matching CV workbooks use the Full-Time sheet, rows 149, 87, 22 and 274 respectively, columns D (median) and F (mean). Population: UK full-time employee jobs, adult rates, same job more than one year; tax year ending April 5, 2026; provisional release October 22, 2026. None of these selected cells is suppressed. Values stay in GBP until the visitor enters and confirms a dated conversion assumption. Employer on-cost, salary basis, budget, readiness and Finance approval remain distinct.

Crosswalk review uses the [official ONS SOC2020 unit-group definitions](https://www.ons.gov.uk/file?uri=/methodology/classificationsandstandards/standardoccupationalclassificationsoc/soc2020/soc2020volume1structureanddescriptionsofunitgroups/soc2020volume1structureanddescriptionofunitgroups20260827.pdf). Corporate Development needs actual duties; Accountant needs qualification scope; Quality Assurance Engineer needs an IT/software distinction. Those and other ambiguous roles remain unmapped.

## Larger gaps and exact dependencies

- India: the [Labour Bureau Occupational Wage Survey](https://www.labourbureau.gov.in/ows-1) does not supply a suitable current technical/marketing-role pay series. Its industrial scope and older reference period cannot price these vacancies. The official [NQR cybersecurity qualification](https://nqr.gov.in/qualifications/11628) is a possible training reference, not a wage or employee-readiness estimate; it is not integrated in this pay batch.
- US: the committed reviewed extract covers only Software Developers, Data Scientists and Registered Nurses. The previously authorized national workbook is identified in Library as `libfile_1f07329c97ac8191b4a7cef9da0fedfa`, but the supported download helper returned `Library prepare_materialize is not available` after an initial network-discovery failure. No bytes were installed and no denied BLS route was retried. Additional exact SOC rows require that original workbook to become available and pass its recorded hash check; crosswalk review alone is insufficient.
- Canada/Germany denied downloads were not retried. Other countries require suitable dated occupation/geography evidence. Occupational employment and vacancies are not available candidates; broad hiring difficulty does not establish exact-role hiring time.

## Acceptance contract

Preserve existing v1/v2 evidence objects and immutable revisions. Verify new role/source selection, native currency and explicit FX, mixed and unsupported roles, stale/cancel/reset behavior, freeze/on-hold and fractional-FTE contracts, backup restore and Track/Review. Independent review, focused/aggregate tests, exact-head CI, production-equivalent no-domain staging and direct public desktop/mobile acceptance are required. No paid model requests, new credentials/access, Lab work or chart-overlay default changes.

The full ranked inventory and original workbook extraction are retained in executor evidence: `market-uncovered-ranking-20261031.json` and `ons-ashe-2026-fulltime-source-review.json`. No workbook binaries or private input data are committed.

## Build and staged acceptance

- Independent source/code review passed. Nineteen model and seventeen UI tests passed; all 132 affected regression tests and the position feature type graph passed. An encoding change found before commit was corrected and exact legacy-reference UTF-8 hash regressions added.
- Exact-head CI `41192575194` succeeded. Full staged build, TypeScript, generated-data and asset checks passed.
- Production-equivalent stage: https://people-analytics-79fwi8ixn-ed-56dc.vercel.app . The build had no public domains until its functional acceptance passed, then was promoted unchanged.
- Archive SHA-256 `37b8c9e5b70ffd431a946dafd6a8cf51dbd1e99fb3a6d3cfb1d125b345256c2b`; 1,193 inputs and 1,048 manifest files. Five source/test files changed, including the new four-row source fixture. Private runtime inputs, package manifests and dependency locks were unchanged. Installation reported the existing 33 dependency audit findings; no automatic upgrades were included.
- Desktop (1440px) and mobile (390px) each passed eight functional groups: actual PR487 backup restoration; all four new role review/cancel/adoption/save flows; correct occupational-group difficulty; unsupported/mixed selections; immutable reload; actual Track/Review result; expanded backup cancel/restore. Source and Review images were inspected.
- Both staged reports had zero page, blocked-request or bridge errors before teardown. The protected bridge then reached its 15-second shutdown bound and reported late route-already-handled errors on dashboard/capabilities. This limitation is retained separately from functional acceptance. Reports: `position-market-uk-professions-stage-15579b69-{1440,390}.json`.

## Public acceptance

Both direct-public widths passed all eight groups in a single run, with zero page, blocked-request or bridge errors and clean drained teardown. Reports: `position-market-uk-professions-public-15579b69-{1440,390}.json`. Actual mobile HR review and desktop legal adoption screenshots were inspected. At an explicitly entered 1.25 USD/GBP and 20% on-cost, legal median produces USD 85,796.85 and HR median USD 92,167.80 per hired FTE; these are QA assumptions, not fetched exchange rates or company-approved budgets.

Legacy US v1, BI v2 and UK software v2 records survived actual prior-release backup restore. All four new role references retained native pay, conversion, source and immutable revision relationships through reload, Track/Review and expanded backup restore. Unsupported and mixed roles stayed neutral; professional-group evidence did not appear for HR manager or recruitment-adviser occupations. Public deployment metadata resolved to the exact promoted deployment above.

Delivered coverage is 12 of 197 vacancies (3 US, 9 UK). Remaining uncovered counts: India 59, US 48, Canada 15, UK 11, Singapore 11, Germany 10, Australia 9, Japan 8, Brazil 7 and France 7. Source and mapping gaps above remain open. No paid provider calls or changes to budget, credentials, access, Lab validation or chart-overlay policy.
