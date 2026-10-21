# Released catalog and skills retrieval

Runtime source: `6712a9281aca806ff95b8556efd3d3f24ee143c4`. This extends the existing bounded Home comparison tool, not arbitrary analytics.

| Capability | Verified source and boundary | Example |
| --- | --- | --- |
| Job-profile compa ranking | All 50 released profiles validated; 48 published means eligible, two withheld. Mean individual annual contracted base / FTE / constructed midpoint. Not market competitiveness. | Which job profile has the highest mean compa ratio? |
| Policy-band comparison | All 550 combinations of 50 listed jobs and 11 listed levels; unlisted L12 excluded. USD annual base at 1 FTE, not observed pay. | Which listed job/level has the highest policy midpoint? |
| Selected skills lists | Largest gaps, highest demand and strongest coverage lists; counts, requirement-met and profile-coverage percentages. Each remains an incomplete selected list, not a full skills inventory. | Which skill in the largest gaps list has the lowest requirement-met percentage? |

Every eligible row is checked before ranking. Withheld values never rank as zero. Suppression markers at the catalog, metadata, policy, job, level or band cause refusal before normalization. Scope and actual collection dates remain mandatory. Results are text; no invented chart, market-pay claim, individual record or missing-skill inference is added.

Verification: eight catalog/skills regressions, five actual Home application route cases using the existing released local binding and simulated provider/accounting, plus 22 existing registry/server checks. TypeScript passes. Independent focused review found and verified the suppression correction. These checks prove retrieval/formatting contracts; they do not establish live-model interpretation of every paraphrase.

## Historical, filtered and multipart assessment

| Domain | Available source | Not established |
| --- | --- | --- |
| Dashboard | Joint country × business unit × level headcount/FTE for 33 month ends, January 2024–September 2026; scoped current cost/vacancies and fixed 2026 YTD voluntary turnover | Historical cost/vacancies, arbitrary subgroup turnover periods or tenure filters |
| Attrition | Company monthly history and separate BU/level/tenure margins | Historical group series or margin intersections |
| Recruiting | Company monthly history, separate BU and source summaries | BU × source or monthly group series |
| Listening | Eleven company engagement waves, current BU and item comparisons | Historical BU/item ranking, BU × item, team or demographic results |
| Career/mobility | Company monthly composition and separate origin/destination level transitions | Monthly transition histories or employee-level mobility rates |

Evidence: `dataset-9037-joint-dashboard.mjs` scope selection and joint cube; `dataset-local-api.mjs` domain presenters; `public-9037.server.mjs` route/query restrictions; `dataset-domain-presenters.mjs` published position margins. Internal joint position rows are not a public query contract. Separate margins cannot be joined to invent intersections.

The next supported retrieval extension is typed scoped dashboard history, preserving date/code validation and distinguishing stock change from hires. Independent multi-question comparisons need a bounded multi-result completion contract, with each metric's own period and denominator. Current standalone early-return comparison routing deliberately excludes multipart/planning requests. Loosening that eligibility alone would truncate requests and is not a valid fix. No dataset-wide completeness is claimed.
