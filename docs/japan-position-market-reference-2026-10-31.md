# Japan position-market reference

Status: PR497 is live. Conditional pay-reference coverage is 52 of 197 vacancies (33 US, 14 UK and five Japan); 145 remain unsupported. Runtime `f3a75bc7f9e7c504070e2c255296cf2145f502f3`, merge `f4d186e59b4f75a6fbc9448f6b957480d8c58d6b`, deployment `dpl_4gbAMzVta4hqvrskJUaDbrrV3EDV`.

## Scope and verified source

The candidate adds five modeled vacancies: one AI Engineer and two Machine Learning Engineers use wage group 1109, **Other information-processing and communications technicians**; one Backend Software Engineer uses group 1104, **Software creators**; one Cloud Engineer uses group 1101, **System consultants and designers**. These are broader statistical occupations, not exact-role salary estimates. Adoption requires confirmation of machine-learning development/training/evaluation, backend web-service/API/database development, or cloud-infrastructure design/build duties respectively. Support-only cloud operations, data-architecture and talent-management positions do not acquire an automatic wage mapping.

The official [MHLW AI profile](https://shigoto.mhlw.go.jp/User/Occupation/Detail/325) and [web-development profile](https://shigoto.mhlw.go.jp/User/Occupation/Detail/314) link to an occupation crosswalk updated March 17, 2026. Its sheet `職業分類対応表`, cells I325/J325 and I314/J314, establishes the wage groups. The downloaded crosswalk is 72,636 bytes, ZIP/CRC valid, SHA-256 `49f548ac63b4c7ff7ddc4e870ea2ca885700851666d92b863f1021a8e30a393e`.

The [official 2025 wage Table 1](https://www.e-stat.go.jp/stat-search/file-download?fileKind=4&statInfId=000040421116), published March 24, 2026, is 130,357 bytes, ZIP/CRC valid, SHA-256 `05380f928b776122821214c1e8e50a963a3a4a178bb3d0a27386ae2509221cdd`. Sheet `男女計、男、女` identifies both sexes, all industries, general workers, enterprises with at least 10 employees. The chosen cells are numeric and unsuppressed.

| Statistical occupation | Monthly cash, thousand JPY | Bonus/special payments, thousand JPY | Derived annualised cash, JPY | Rounded job tag display, JPY |
|---|---:|---:|---:|---:|
| 1101 System consultants and designers | H21:542.1 | J21:2,385.2 | 8,890,400 | 8,890,000 |
| 1104 Software creators | H22:390.8 | J22:1,095.1 | 5,784,700 | 5,785,000 |
| 1109 Other IT/communications technicians | H23:415.8 | J23:1,108.0 | 6,097,600 | 6,098,000 |

The [official infrastructure profile](https://shigoto.mhlw.go.jp/User/Occupation/Detail/318) explicitly includes cloud design and implementation. Crosswalk row 318 maps it to 1101; it is not a guessed assignment to a generic IT group. The source's J21 lexical value `2385.1999999999998` represents the published one-decimal-thousand value 2,385.2. Component conversion rounds to integer yen to avoid binary floating-point residue, preserving the other references exactly.

The [job tag method](https://shigoto.mhlw.go.jp/User/topics/detail/584) annualises regular monthly cash by 12 and adds bonuses/special payments. Regular cash reflects June 2025; the [survey definition](https://www.mhlw.go.jp/toukei/list/chinginkouzou_b.html) uses the preceding-calendar-year bonus measure with survey-specific treatment for newer employees. These are constructed annualised survey earnings, not observed calendar-year totals, medians, base salaries or employer total costs. The underlying component calculation is retained separately from job tag's rounded display. No rounding discrepancy is concealed or used to fabricate a second statistic.

[MHLW copyright terms](https://www.mhlw.go.jp/chosakuken/) specify Public Data Licence 1.0 unless separately marked, with source attribution and identification of processing. Job tag's separate terms distinguish government statistics from JILPT occupational material. This integration uses statistical facts, original concise labels, and brief duty paraphrases/links; it does not copy occupational tests or long descriptive material.

## Planning and persistence contract

The new reference retains annualised JPY source earnings separately from an explicitly entered, dated USD-per-JPY assumption and employer on-cost. Applying the reviewed result changes the annual hiring-cost assumption only; funding approval, budget, allocation, timing, fractional FTE and donor effects remain distinct. No default exchange rate is supplied.

The additive v3 saved adoption format preserves original v1/v2 references and validators. The single available statistic is annualised cash; no median or second bar is invented. New saved revisions, stale-ticket checks, goal isolation, Track/Review and backup round trips passed staged and direct public verification. No paid AI calls, account/access changes, Lab work or target-overlay publication are part of this slice.

## Verified release acceptance

- Exact candidate: `f3a75bc7f9e7c504070e2c255296cf2145f502f3`; PR497 merge: `f4d186e59b4f75a6fbc9448f6b957480d8c58d6b`.
- Production-equivalent stage: https://people-analytics-9qugv6lik-ed-56dc.vercel.app; deployment `dpl_4gbAMzVta4hqvrskJUaDbrrV3EDV`. The tested production build was promoted without rebuilding. Canonical www.ed-ai.app lookup resolved this deployment.
- Source package SHA-256: `8dae2f753305f659019e4a6a36f84e1de5a5f87bb7ae2e18099c52d842082ca2`; 1,195 verified inputs, 1,050 manifest files. Private inputs and dependency locks were unchanged.
- 166 affected regression checks, 62 independently run focused checks, position type graph, full build/TypeScript and exact-head CI `41231621323` passed. Independent code review found no blocking issue. No PR approval review was submitted.
- Final staged desktop/mobile each passed ten journey groups, with earlier exact-head checks separately proving restoration/reopening of the previous Japan v3 and PR495 v1/v2 backups. Initial strict cancel snapshots caught independent planning-default initialization; the harness now waits for all initialization fields and stable storage, retaining full equality after cancel. No application change was required. Protected transport had its known post-test teardown timeout; functional reports were clean.
- Direct public desktop (1440px) and mobile (390px) each passed all 11 groups, HTTP 200 throughout, zero page/blocked/bridge errors and drained teardown. Actual rendered images were inspected. Coverage includes all four role groups, explicit dated FX, cancel/stale inputs, mixed/unmapped roles, original goal/exploration preservation, immutable revisions/reload, dated Track result and Review, and actual backup download/cancel/restore.
- Evidence files: `integration-evidence/position-market-japan-public-f3a75bc-{1440,390}.json`, corresponding images/backups and `JAPAN-MARKET-RELEASE.json`. No paid AI calls or accounting, credentials, access, Lab or target-overlay changes.

## Remaining evidence boundary

The remaining 145 vacancies are India 59, US 18, Canada 15, Singapore 11, Germany 10, Australia nine, Brazil seven, France seven, UK six and Japan three. These counts describe missing conditional pay references, not applicant availability. US inventory locations remain modeled country assignments, so no state wages are inferred.

Australia's exact official `ANZSCO Occupation data - February 2026.xlsx` transfer timed out twice without bytes; no access denial was bypassed. A permitted original transfer is needed to verify wage cells and workbook-specific reuse terms. Singapore's June 2025 workbook is available, but dataset-specific reuse authority remains unresolved. India's inspected industrial wage source excludes the professional roles required here. Canada's and Germany's prior denied routes were not retried. France's available broad net-pay table and Brazil's unverified detailed extracts do not support the required role/cost contract. Remaining US/UK/Japan roles require stronger duty crosswalks or appropriate source coverage. No guessed mappings were added.
