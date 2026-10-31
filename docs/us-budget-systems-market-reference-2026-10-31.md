# US budgeting and HR systems market references

Status: implementation candidate, not yet released. The bounded proposal adds three US Financial Planning and Analysis Analyst vacancies and two US HR Systems Specialist vacancies, moving conditional reference coverage from 54 to 59 of 197 if acceptance passes. These are modeled recruiting vacancies; reference eligibility is not funding approval or verified recruitment feasibility.

## Reviewed role scope

- **Financial Planning and Analysis Analyst → Budget Analysts, SOC 13-2031.** The user must confirm operating-budget preparation, expenditure and variance analysis, and cost planning. Investment research, securities advice, business valuation and primarily accounting/audit work are excluded. This is a budgeting occupation reference, not a universal FP&A wage. [Official O*NET duties](https://www.onetonline.org/link/summary/13-2031.00), updated 2026, reviewed October 31, 2026.
- **HR Systems Specialist → Computer Systems Analysts, SOC 15-1211.** The user must confirm substantive HR-system requirements analysis, application configuration/integration and testing system changes. Routine personnel administration, payroll processing, recruiting and general HR advisory work without systems-analysis duties are excluded. This is a broader systems-analysis reference, not an HRIS-specific wage. [Official O*NET duties](https://www.onetonline.org/link/summary/15-1211.00), updated 2026, reviewed October 31, 2026.

## Original workbook evidence

The user-supplied original `national_M2025_dl(1).xlsx` was rechecked in the authorized Linux workspace at `2026-10-31T20:32:54.884646Z`. SHA256 `852250997ceff9b721ff68f63e877d818f9c1ec8b1b69dd367958faedd5282b2`, 289,615 bytes, matches the existing source. Library identity: `libfile_67511b6bcce481919aabaf467c294a8c`; version 0. Original bytes were not modified.

Worksheet `national_M2025_dl`; May 2025 OEWS estimates. Filters: AREA 99 (U.S.), NAICS 000000, OWN_CODE 1235, cross-industry, detailed occupation. Each code occurs once under these filters. No aggregation or substitution was used.

| Occupation | Row | Annual median USD | Annual mean USD | Wage cells | Employment | Employment PRSE | Mean-wage PRSE |
|---|---:|---:|---:|---|---:|---:|---:|
| 13-2031 Budget Analysts | 114 | 91,640 | 96,370 | AB114 / S114 | 47,160 | 1.4% | 0.6% |
| 15-1211 Computer Systems Analysts | 135 | 105,850 | 114,610 | AB135 / S135 | 519,530 | 1% | 0.4% |

Both ANNUAL and HOURLY flags are blank in the source. Numeric wages are unsuppressed; raw lexical values, blank flags and existing suppression definitions remain in the fixture. Employment is a rounded employed population excluding self-employed workers, not available applicants. These are national occupation wages, not state, seniority, job-offer or employer-cost estimates.

Adoption retains explicit duty confirmation, chosen mean/median, modeled FTE basis and entered employer on-cost. Previous source records, reference IDs, saved revisions and goals remain immutable. PR500's canonical saved-context validation must carry these same source/statistic assumptions into explanation requests. No paid model call is needed to verify that contract.

## Acceptance record

Pending focused/aggregate checks, independent review, exact-head CI, production-equivalent staging and direct public desktop/mobile acceptance. No release or expanded live coverage is claimed by this document yet.
