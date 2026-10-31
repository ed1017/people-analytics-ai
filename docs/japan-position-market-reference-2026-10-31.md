# Japan position-market reference

Status: source verification passed; implementation and hosted acceptance are in progress. This is not yet a live capability. Production remains PR495 with 47 of 197 vacancies eligible for conditional pay references.

## Scope and verified source

The candidate adds four modeled vacancies: one AI Engineer and two Machine Learning Engineers use wage group 1109, **Other information-processing and communications technicians**; one Backend Software Engineer uses group 1104, **Software creators**. These are broader statistical occupations, not exact-role salary estimates. Adoption requires confirmation of machine-learning development/training/evaluation duties or backend web-service/API/database development duties respectively. Generic infrastructure, cloud and data-architecture positions remain unmapped.

The official [MHLW AI profile](https://shigoto.mhlw.go.jp/User/Occupation/Detail/325) and [web-development profile](https://shigoto.mhlw.go.jp/User/Occupation/Detail/314) link to an occupation crosswalk updated March 17, 2026. Its sheet `職業分類対応表`, cells I325/J325 and I314/J314, establishes the wage groups. The downloaded crosswalk is 72,636 bytes, ZIP/CRC valid, SHA-256 `49f548ac63b4c7ff7ddc4e870ea2ca885700851666d92b863f1021a8e30a393e`.

The [official 2025 wage Table 1](https://www.e-stat.go.jp/stat-search/file-download?fileKind=4&statInfId=000040421116), published March 24, 2026, is 130,357 bytes, ZIP/CRC valid, SHA-256 `05380f928b776122821214c1e8e50a963a3a4a178bb3d0a27386ae2509221cdd`. Sheet `男女計、男、女` identifies both sexes, all industries, general workers, enterprises with at least 10 employees. The chosen cells are numeric and unsuppressed.

| Statistical occupation | Monthly cash, thousand JPY | Bonus/special payments, thousand JPY | Derived annualised cash, JPY | Rounded job tag display, JPY |
|---|---:|---:|---:|---:|
| 1104 Software creators | H22:390.8 | J22:1,095.1 | 5,784,700 | 5,785,000 |
| 1109 Other IT/communications technicians | H23:415.8 | J23:1,108.0 | 6,097,600 | 6,098,000 |

The [job tag method](https://shigoto.mhlw.go.jp/User/topics/detail/584) annualises regular monthly cash by 12 and adds bonuses/special payments. Regular cash reflects June 2025; the [survey definition](https://www.mhlw.go.jp/toukei/list/chinginkouzou_b.html) uses the preceding-calendar-year bonus measure with survey-specific treatment for newer employees. These are constructed annualised survey earnings, not observed calendar-year totals, medians, base salaries or employer total costs. The underlying component calculation is retained separately from job tag's rounded display. No rounding discrepancy is concealed or used to fabricate a second statistic.

[MHLW copyright terms](https://www.mhlw.go.jp/chosakuken/) specify Public Data Licence 1.0 unless separately marked, with source attribution and identification of processing. Job tag's separate terms distinguish government statistics from JILPT occupational material. This integration uses statistical facts, original concise labels, and brief duty paraphrases/links; it does not copy occupational tests or long descriptive material.

## Planning and persistence contract

The new reference must retain annualised JPY source earnings separately from an explicitly entered, dated USD-per-JPY assumption and employer on-cost. Applying the reviewed result changes the annual hiring-cost assumption only; funding approval, budget, allocation, timing, fractional FTE and donor effects remain distinct. No default exchange rate is supplied.

An additive saved adoption format must preserve original v1/v2 references and validators. The single available statistic is annualised cash; no median or second bar is invented. New saved revisions, stale-ticket checks, goal isolation, Track/Review and backup round trips require verification before publication. No paid AI calls, account/access changes, Lab work or target-overlay publication are part of this slice.
