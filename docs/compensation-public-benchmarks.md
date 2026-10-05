# Compensation public wage references

Additive work after PR #117, based on `6acb70ef261d133068f60826fbe6252e4425a219`. The PR #117 branch is unchanged. This adds public market context to its self-contained Compensation page without changing shared Home/header/navigation/chat files or the internal aggregate endpoint.

## Contract and source review, October 5, 2026

The bounded first release uses three public occupations (Software Developers, Data Scientists, Registered Nurses) across three geographies (United States, New York State, New York–Newark–Jersey City NY-NJ metro). These are the same nine occupation/geography pairs already present in the repository's Labor Market extract. Nothing maps internal job profiles automatically.

- [BLS downloadable tables](https://www.bls.gov/oes/tables.htm) currently list May 2025 as the latest OEWS estimates. The [release](https://www.bls.gov/news.release/ocwage.nr0.htm) is dated May 15, 2026. This is the publication date, not an observation from 2026. Estimates are frozen in the application; there is no automatic refresh.
- The three original workbooks were retrieved from existing authorized Library copies and their bytes verified against the repository's recorded SHA-256 values. These are the previously acquired originals, not a fresh download from BLS. Direct official downloads and Library signed-URL transfers failed in this environment; the authorized file downloader succeeded and Library identity/version metadata was preserved locally. No source file was changed.
- `tests/manual/verify-compensation-oews.py` re-extracts all nine rows, asserts exact workbook hashes, May 2025 field definitions, detailed SOC group, cross-industry NAICS `000000`, all-ownership code `1235`, and parity with the existing extract. `lib/data/compensation-oews-may2025.json` retains the raw selected cells and original workbook/sheet/row coordinates. No workbook binaries are committed.
- Annual wage columns are `A_PCT10`, `A_PCT25`, `A_MEDIAN`, `A_PCT75`, `A_PCT90`; currency is USD. `TOT_EMP` is estimated wage/salary employment, rounded by the source; `EMP_PRSE` describes employment-estimate error, not wage-percentile error. Hourly/annual source flags are retained, with no app-side annualization.
- The workbooks' Field Descriptions define `*` as wage unavailable, `**` as employment unavailable, and `#` as annual wages at or above USD 239,200. Those states remain explicit; no zero substitution or interpolation. All nine selected records happen to have numeric wage/employment estimates. The inherited `UpdateTime` worksheet contains an old internal value and is not used as a release or refresh date.
- [May 2025 technical notes](https://www.bls.gov/oes/2025/may/oes_tec.htm) establish the wage/salary-worker population, 2018 SOC, estimation basis and wage definition. Do not confuse these with the older page returned at the generic `/oes/current/oes_tec.htm` path during this review.
- [BLS copyright policy](https://www.bls.gov/bls/linksite.htm) permits reuse of the public-domain data with source attribution. No BLS emblem is used.

## O*NET taxonomy mapping

The [current O*NET database](https://www.onetcenter.org/database.html) is 31.0, released August 2026 according to the [archive](https://www.onetcenter.org/db_releases.html). Its occupation data uses O*NET-SOC 2019, aligned with 2018 SOC. Codes and titles were read from the [versioned occupation JSON](https://www.onetcenter.org/dl_files/database/db_31_0_json/occupation_data.json); the following exact pairs were checked against the [published crosswalk](https://www.onetcenter.org/taxonomy/2019/soc.html):

| Public occupation | O*NET-SOC 2019 | BLS 2018 SOC | Scope limit |
| --- | --- | --- | --- |
| Software Developers | 15-1252.00 | 15-1252 | Occupational wages across employers; internal duties still need review |
| Data Scientists | 15-2051.00 | 15-2051 | BLS SOC also includes Business Intelligence Analysts and Clinical Data Managers |
| Registered Nurses | 29-1141.00 | 29-1141 | BLS SOC also includes several O*NET nursing specialties |

Only these exact pairs are resolved. Suboccupations, arbitrary role titles and unknown geographies return unavailable; no fuzzy match, prefix stripping, model-selected mapping or arbitrary URL is accepted. “Source-verified” means taxonomy-pair verification, not HR approval of an internal role match. There are no internal-role, employee, salary or job-level records in this feature.

`lib/data/compensation-onet31.json` is a small application-authored selection/transcription of source facts, with condensed occupation descriptions; it is not a downloaded full O*NET database or a byte-identical extract. URLs, database/taxonomy versions, verification date and modification notice are retained. O*NET data is attributed to USDOL/ETA under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), following the [database license](https://www.onetcenter.org/license_db.html). The UI includes attribution, trademark and modification/non-endorsement notices.

## Meaning and boundaries

OEWS percentiles describe occupational wage distributions, not junior/mid/senior levels, recommended salary bands, confidence intervals or internal pay competitiveness. Wages include certain incentives but exclude overtime premiums, nonproduction bonuses and employer benefit costs; they are not total compensation or employer cost. The panel does not compare these figures numerically with the synthetic internal cost-per-FTE source, whose period and compensation components are not established.

Coverage includes full- and part-time workers in covered US nonfarm establishments and excludes self-employment. There is no non-US, specific employer, remote-job, internal-grade or specialty wage evidence. Metro coverage extends beyond NYC; geographic populations overlap and must not be added together. No location causality, inflation adjustment, annual trend, salary recommendation or forecast is calculated. Other occupations/geographies require a new source-reviewed subset and mapping review.

## Integration

This branch mounts `CompensationBenchmarks` inside `CompensationPage`, separately from the internal source's loading/error region. Once the parent mounts PR #117's page in the shared shell, the additive branch needs no additional route, prop, API or database integration. The two sources have separate headings and visible public/synthetic labels.

The main worker should update shared Compensation description/help to describe “Public US occupation wage references and synthetic workforce-cost context.” Retain the read-only AI gate; do not send the static reference to a model or infer a mapping from the current goal. No workforce filter or planning assumption is changed. The older PR #117 handoff's market-benchmark-unavailable copy is superseded only by this bounded public reference; internal salary analysis remains unavailable.

Parent owns combined shared-shell acceptance, final merge and production release. No DB/schema/RLS/auth/access/security/billing/domain changes; no credentials, purchases, live AI calls or changes to disabled eNPS/held proposals.

## Reproduction

Use the three original files with the recorded exact names in one directory, then run `python tests/manual/verify-compensation-oews.py DIRECTORY` (verification-only). The optional `--write` regenerates the same bounded JSON; new source hashes/periods require explicit review. Python/openpyxl are verification-environment tools, not application dependencies.

Run focused tests with `node --test tests/compensation-benchmarks.test.mjs tests/compensation.test.mjs`, then the repository's full unit suite, full lint, TypeScript and production build. UI QA: `PLAYWRIGHT_MODULE=/opt/codex/runtimes/cua/lib/node_modules/playwright/index.mjs node tests/browser/compensation-benchmarks.mjs` after building CSS. The fixture mounts the actual Compensation page, intercepts its internal endpoint as unavailable, visits all nine selections at 1366px/390px, and verifies values, scopes, source links, licensing details, keyboard scrolling, viewport containment and absence of data/AI fetches. Existing `tests/browser/compensation.mjs` verifies the internal page states still work alongside the new panel.

## Validation

On October 5, 2026: all 13 focused tests and all 892 full-suite tests passed; full ESLint, TypeScript (`--noEmit --incremental false`), and the Webpack production build passed. The build used synthetic placeholder service values and the existing local font mocks. The new browser suite passed 58 checks and the existing internal-cost browser suite passed 22 checks at 1366px/390px; both actual-page fixture screenshots were visually reviewed. No live AI calls or live database reads were needed for this additive branch. Combined shared-shell navigation and release acceptance remain with the parent worker.
