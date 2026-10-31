# US budgeting and HR systems market references

Status: PR502 is live at runtime `a40f891e0364e4fd42b2775678198c59230c70a9`, merge `8893169c57db91d1be5da53716045cbc0ac2e441`, deployment `dpl_2o9dfFwB6gmu6H8Bi1op7a6os9J4`. Three US Financial Planning and Analysis Analyst vacancies and two US HR Systems Specialist vacancies now have conditional references. Coverage is **59 of 197**: 40 US, 14 UK and five Japan. These are modeled recruiting vacancies; eligibility is not funding approval or recruitment feasibility.

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

Independent review and five independently run targeted checks passed, alongside 72 focused checks, 113 affected aggregate checks, zero component type diagnostics, full packaged build/TypeScript and exact-head CI `41239788805`. Package SHA256 `a3253ade0482bf0c6fe20fa841e28cb7a173d59dba2fd1c4ea02e121b5c97165` includes 1,196 inputs and 1,051 manifest files. Private inputs and dependency locks are unchanged.

The production-equivalent build https://people-analytics-nfj42anxh-ed-56dc.vercel.app was promoted without rebuilding. Initial staged tests incorrectly required a replacement dialog for a non-conflicting draft, then an eligible-pay heading for an unsupported country. The corrected harness checks actual selected IDs and conditional confirmation. Four completed groups were retained; a validated QA checkpoint resumed the remaining five groups. No app code changed for these corrections. Protected staging had a post-assertion teardown timeout and already-handled dashboard route, with no pre-cleanup app or transport errors.

Direct public desktop (1440px) and mobile (390px) each passed **eight groups**, HTTP 200, zero application/blocked/mock/bridge errors and drained teardown. Actual images were inspected. Checks cover real prior-backup restoration, USD/GBP/JPY reopening, isolated goal creation, both new roles and duty consent, mean/median/on-cost, pure cancel/stale review, mixed and unsupported scopes, immutable revision/reload, a 3-FTE target versus a dated 2.5-FTE result (0.5-FTE Review gap), and actual backup cancel/restore. One locally intercepted explanation request per width verified canonical saved source context. All model and readiness responses were mocked; no paid calls or fresh provider/readiness acceptance is claimed.

Evidence: `integration-evidence/position-market-us-budget-systems-public-a40f891-{1440,390}.json`, images/backups and `US-BUDGET-SYSTEMS-MARKET-RELEASE.json`.
