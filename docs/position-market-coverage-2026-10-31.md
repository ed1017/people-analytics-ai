# Position-market coverage expansion

Status: implementation and acceptance in progress; not yet released.

## Inventory coverage

The immutable company-position-model-v2 register contains 197 vacancies: 51 in the United States and 20 in the United Kingdom. This release targets six current vacancies, up from two, without changing the register or manufacturing missing evidence.

| Reviewed planning reference | Vacancies before | Vacancies after |
|---|---:|---:|
| US software roles / Software Developers | 2 | 2 |
| US Business Intelligence Analyst / broader Data Scientists occupation | 0 | 1 |
| UK software roles / Programmers and software development professionals | 0 | 3 |
| Total | 2 | 6 |

The UK slots are one each of Frontend Software Engineer, Backend Software Engineer and Software Engineer. The US addition is one Business Intelligence Analyst. All six current covered slots are modeled 1-FTE recruiting vacancies. Coverage does not establish Finance approval or observed employee attributes. The remaining 191 vacancies do not receive an unsupported pay assumption.

## Source and assumption boundaries

The existing reviewed May 2025 OEWS extract supplies US pay. O*NET identifies Business Intelligence Analysts as occupation 15-2051.01 within the broader Data Scientists wage group; the UI must name that broader reference and require the visitor to confirm the duties match. It must not present a BI-specific wage estimate. Source: https://www.onetonline.org/link/summary/15-2051.01 .

The existing ONS ASHE reference supplies UK SOC 2020 2134 annual gross GBP pay for full-time employee jobs, adult rates, same job more than one year, April 2025 to April 2026. The provisional October 2026 release supplies median GBP 59,862.50 and mean GBP 69,120.60, with recorded quality and archive/workbook/cell provenance. There is no automatic exchange rate. The visitor must supply and confirm a dated USD-per-GBP planning assumption before adoption into the USD scenario. Native pay, statistic, FX direction/rate/date, employer on-cost and rounded USD result remain distinct in saved evidence.

Mixed roles/countries, unsupported mappings, invalid conversion assumptions and regional mismatches cannot silently adopt another source. Broad hiring-difficulty and qualitative skills references do not supply candidate availability, training success or hiring time. Existing software v1 records must remain byte-compatible; new evidence versions retain exact historical interpretation through save, backup and Track/Review.

## Release gates

Independent review; old/new evidence invariants and malformed/stale input tests; exact-head CI; production-equivalent staging without domain assignment; desktop/mobile adoption, cancel, mixed-scope, restore, saved revision and Track/Review acceptance. No paid provider calls, new data credentials, denied-source retries, Lab changes or chart-overlay promotion.

Release identities and completed acceptance will be recorded below after verification.
