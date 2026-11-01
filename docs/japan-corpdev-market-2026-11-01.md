# Japan occupational skills and US valuation software

Status: implementation and verification in progress, not released. Candidate adds six unique vacancies to the France baseline of 66/197, for 72/197 non-pay coverage. Pay remains 59. Coverage means an eligible reference with matching planned duties, not complete market intelligence or verified employee skills.

## Japan source contract

Four conditional role references cover five vacancies: AI Engineer (1) and Machine Learning Engineer (2) use jobtag profile325; Cloud Engineer (1) uses318; Backend Software Engineer (1) uses broader web-services profile314. Require ML model/data development, infrastructure design/construction, or web-service database/API/internal-processing duties respectively. Do not count Data Architect or Talent Management without a separate reviewed match.

Official catalogue: https://shigoto.mhlw.go.jp/User/download. Original IPD_DL_numeric_7_00.csv: 1,514,940 bytes, SHA256 `0284e82309b70fa7f7597e849c175099ab9e1ef7717e8f81d547400ec34c4e23`, CP932. Original XLSX: 1,820,799 bytes, SHA256 `a09aef2c1874200da1cda8910d5a6eebc484f183c29ed1d7458f8531575b2ffd`. Version 7.00 released March 17, 2026; internal update February 10, 2026. These dates are not each profile's observation year. Originals and extraction evidence are in integration-evidence/jp-br-nonpay-20261101.

Independent source review verified all 117 means, variable IDs, Japanese labels and CSV coordinates. Each profile has 39 skill means; all are strictly positive. Workbook variable definitions specify mean range 0–7, while the public rating guide explains levels 1–7 with item-specific anchors. Preserve both facts. A future zero is retained raw but not plotted or interpreted without its definition; blanks and suppression are never converted to zero. Per-item observation date, sample size, SE and CI remain unknown. Means are not O*NET Importance, employee proficiency, hiring demand, available applicants or training duration. Alphabetical presentation is not a skill ranking. English labels are identified as translations; Japanese originals remain available.

Terms Article 9 https://shigoto.mhlw.go.jp/User/tos permit processing downloadable numeric occupational data with JILPT attribution, original filename/version, actual download date and modification acknowledgement. Not CC/public domain; no tests, images or videos are included. Rating guide: https://shigoto.mhlw.go.jp/User/about_ability.

## US Corporate Development

One US vacancy conditionally uses O*NET 31.0 Financial and Investment Analysts 13-2051.00 software flags for quantitative business valuation and transaction analysis. The existing fictional CORPDEV-ANA duty template is unchanged; no automatic confirmation. Exact eight In Demand=Y rows from the 180-row occupation extract are preserved from source SHA256 `6aabb96b464288db849580e6510530efff3f80e25dde2bb23f1fc36bb526b016`. O*NET bulk database CC BY4.0 attribution and modification notice retained. Flags are categorical, not posting volume, prevalence, rank or individual proficiency. No exact core-skill rows exist for this code; none substituted. No pay or outlook reference added.

## Preservation and verification

Source attachment remains explicit, scoped and revision-bound. Original chat messages, source versions, plans, goals, Track/Review and backups remain intact. US-only candidate passed 59 focused/existing tests; Japan backend six tests and shared UI 37 tests passed. Independent combined review, exact CI, staged and public desktop/mobile acceptance remain pending. No paid model requests; mocked request validation is not fresh model-answer acceptance.

Final combined backend checks passed 65/65; shared UI/entrypoint checks passed 37/37. Independent combined source/code review passed, including all 117 raw Japan means, translated labels, bounds, saved chat countries and previous reference identity. Focused TypeScript has zero diagnostics; line-ending normalization resolved the review hygiene finding without changing behavior. CI/staging/public checks remain pending.
