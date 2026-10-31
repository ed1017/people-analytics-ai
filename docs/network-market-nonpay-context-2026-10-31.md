# Network and market-research non-pay context

Status: PR514 published and public acceptance passed on October 31, 2026.

## Reviewed scope

Three modeled US vacancies may use broader national occupation references only after explicit duty confirmation:

- `CLOUD-ENG` Cloud Engineer and `INFRA-ENG` Infrastructure Engineer: Computer Network Architects, O*NET 15-1241.00 / BLS 15-1241. Require network design/implementation and network architecture/capacity analysis. Generic application deployment, server-only operations, routine administration and helpdesk do not qualify. [Official occupation duties](https://www.onetonline.org/link/summary/15-1241.00).
- `SALES-OPS` Sales Operations Specialist: Market Research Analysts and Marketing Specialists, O*NET 13-1161.00 / BLS 13-1161. Require substantive customer/market/competitor research and demand/trend analysis informing strategy. CRM administration, pipeline reporting, order processing and quota/commission administration alone do not qualify. [Official occupation duties](https://www.onetonline.org/link/summary/13-1161.00).

Stable role IDs resolve reference/display title differences; no fuzzy aliases. Existing Lab task references support crosswalk review, not proof of actual vacancy duties. No Lab changes. No pay eligibility expansion or automatic changes to timing, budget, skills proficiency or readiness.

## Verified source handoff

Parent Linux extraction on October 31 at 23:17 UTC verified unchanged original sources. This executor transcribed the bounded payload into `integration-evidence/network-market-nonpay-source-handoff.json`; it did not redownload or claim possession of the original Linux paths.

- BLS 2025-2035 `occupation.xlsx`, 413,524 bytes, SHA256 `08ee182f992d972593e64559ce467bad75967d2228f11ad5e2f86d4ec0ee6c00`, exact Line item records in Tables 1.2/1.10 rows 103 and 73. [Source](https://www.bls.gov/emp/ind-occ-matrix/occupation.xlsx); public domain, cite BLS. Original counts in thousands, normalized by 1000; percentages unscaled; independently rounded components retained.
- O*NET 31.0 `software_skills.csv`, 3,557,545 bytes, SHA256 `6aabb96b464288db849580e6510530efff3f80e25dde2bb23f1fc36bb526b016`. Database release August 2026; software content last updated 30.3/May 2026. [Source](https://www.onetcenter.org/dl_files/database/db_31_0_csv/software_skills.csv). CC BY4.0: credit O*NET 31.0/USDOL-ETA, link licence, identify modifications, no endorsement. No row-specific observation date or current posting date is asserted.

The O*NET handoff contains only 22 In Demand=Y rows: 13 for Network Architects and 9 for Market Research. Preserve full occupation row totals 278/149 and full Hot Technology counts 101/51 separately. Omitted N means not flagged by the source, not no demand. Firewall software is Hot Technology=N and In Demand=Y; those flags must not be conflated. No posting shares, ranks, candidate counts or proficiency claims.

| Occupation | Employment 2025 | Employment 2035 | Published numeric change | Decade change | Annual openings | Annual exits | Annual transfers | Annual separations |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Network architects |181,800|195,800|14,100|7.7%|9,600|2,800|5,300|8,200|
| Market research |952,700|1,019,000|66,300|7.0%|82,000|24,800|50,600|75,400|

Flows are annual averages across 2025-2035; growth percentages cover the full decade. Do not force rounded stocks or components to sum. Employment is not available applicants; projected openings are not current postings or hires. Shared occupation values are not additive across internal roles.

## Compatibility and acceptance contract

Use a separate versioned bounded fixture and append six canonical references. Preserve all 54 deployed PR512 reference hashes/versions, existing full source fixtures, pay references, saved attachments, goals, Track/Review and backups. Released conditional coverage is 49/197 with any non-pay context, software 46, outlook 45 and UK difficulty 3 (overlapping); pay 59 unchanged.

Required checks: source counts/coordinates/flags and rounding, immutable baseline hashes, explicit conjunctive consent, country/mixed-role isolation, no pay expansion, exact canonical explanations and general-chat scope, cancel/stale/reopen/reload, actual prior backup restoration, independent review, aggregate tests, exact CI, staged and direct public desktop/mobile acceptance. No paid model calls. Release evidence follows.

## Verified release

- PR514 runtime/head `1de45475444159d60326016bf227f01abcf7bddc`; merge `9d494368ccaf702afe1af82c915021ea2620b5ec`.
- Exact-commit CI [41252910636](https://github.com/ed1017/people-analytics-ai/actions/runs/41252910636) succeeded. Independent code/source review and six focused tests passed; 150 affected regression tests and the type graph passed. The full isolated build also passed generated checks and TypeScript.
- Production-equivalent stage `people-analytics-g30vmqsqs-ed-56dc.vercel.app`, deployment `dpl_5mCHaUvyWtrHuCgYnMcj1xJSqLnn`, was promoted only after staged acceptance. The public hostname resolves to that exact deployment.
- Archive SHA256 `646135aae37fc0024468e1b4643feef0cd6d53e9806782f2cfd85326f9d884b8`; 1,212 runtime inputs and 1,067 manifest files. Existing private runtime inputs were preserved.
- Staged and public 1440px/390px runs each passed ten workflow groups and nine mocked explanation requests. Checks cover actual PR512 backup restore, isolated tracking-goal copy, explicit source/duty consent, cancel, stale capture, immutable versions, explicit clear/reopen, reload, Overview carry, foreign/mixed-role rejection and backup round trip. Existing attached context/pay/allocations survive; the separate hash tests cover all 54 prior canonical references.
- Reports: `integration-evidence/position-market-network-sales-context-{stage,public}-1de4547-{1440,390}.json`. All report no failures, browser/bridge errors, unexpected requests or mock validation failures; teardown drained. Desktop/mobile screenshots inspected. The protected stage uses exact authenticated GET response replay; public document/source GETs are direct, HTTP 200, without that replay. This does not measure staging latency.
- Readiness and chat transport were mocked in all browser runs; no paid requests or fresh model answer/tool-choice acceptance. The canonical catalogue and exact saved-revision payload are tested, not fine-tuning or universal retrieval.

## Next evidence boundary

Five remaining US vacancies need actual planned duties before a further non-pay match can be justified. Existing Lab task examples are not those vacancies' duty contracts. No additional extraction is pending for the two occupations released here.

| Role / vacancy count | Required evidence before implementation |
|---|---|
| IT Engineer / 1 | Business information requirements analysis plus systems design/integration/testing could support 15-1211. Routine provisioning, helpdesk or maintenance alone cannot. |
| Corporate Development / 1 | Organizational/process diagnosis plus operating-model improvement could support 13-1111. M&A sourcing, valuation and deal execution alone cannot. |
| Customer Success Specialist / 2 | Substantive service selling or negotiated renewals/expansion could support 41-3091, respecting its industry exclusions. Onboarding/support/adoption alone cannot. |
| Product Manager / 1 | Actual remit and resource/management authority are needed. Reject a blanket 11-1021 General Operations match from a Lab title; product discovery/backlog/roadmap alone is insufficient. |

The smallest next input is a short planned-duty description for these roles, especially Product Manager. Do not manufacture matches just to raise coverage. Non-US source boundaries remain: UK suppressed/absent/low-base cells stay unavailable; Australia and Singapore specific reuse terms unresolved; India's inspected industrial source excludes needed professional roles; prior denied Canada/Germany routes stay off limits. No verified role-specific available-applicant count or measured US/UK hiring duration is supplied by this release. Lab remains user-owned; chart overlay remains preview-only.
