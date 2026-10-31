# Market-to-position AI handoff

Updated October 31, 2026. This is the concise continuation record for coding agents and explanation-context work. Read the linked source records instead of treating this document as a new numerical dataset or model acceptance result.

## Current release and owned work

### PR504 current - non-pay context attached to saved positions

PR504 is live at runtime `45214a6aa3fa89625849e91aa03e930fa7732ff6`, merge `59bbccb542e00bdee71b5c43234616b1fc8059a1`, deployment `dpl_97VfRULVhVFtQoMyVyBjLsDPRvGA`. Software-demand context supports 40 of 197 vacancies; 17 also have projected openings/exits/transfers. Pay coverage remains 59 of 197. Explicit append-only context attachments bind to saved allocation revisions and survive backup/tracking copies; explanations use the explicitly selected version. Independent review, 134 affected tests, build/TypeScript and CI `41242899587` passed. Public desktop/mobile each passed eight groups and seven mocked requests, HTTP 200 and clean reports. [Sources, contracts, limits and release acceptance](nonpay-position-context-2026-10-31.md).

Next priority is broader verified non-pay occupation coverage. Detailed UK survey comparisons remain separately gated by sample/suppression interpretation. People Analytics pay candidate stays held; no paid AI calls, Lab validation or target-overlay promotion.

PR502 was published at runtime `a40f891e0364e4fd42b2775678198c59230c70a9`, deployment `dpl_2o9dfFwB6gmu6H8Bi1op7a6os9J4`, including PR500 grounding. Conditional pay references cover **59 of 197** modeled vacancies: 40 US, 14 UK and five Japan. This is eligible reference coverage, not proof of candidate supply, recruiting feasibility, approved funding or an adopted assumption. User confirmation is still required. See [US ML release](us-machine-learning-market-reference-2026-10-31.md), [Japan release](japan-position-market-reference-2026-10-31.md) and [earlier UK/US references](market-reference-next-batch-2026-10-31.md).

PR500 fixed the missing explanation provenance: canonical adoption is validated for the exact saved scenario/revision and includes native statistic and calculation basis. Legacy packets without market evidence retain unknown provenance. Both mounted entrypoints passed public desktop/mobile mocked-request acceptance; this is not fresh model-answer acceptance. No paid model calls were made. [Exact release evidence](position-market-grounding-release-2026-10-31.md).

## Source and interpretation contracts

| Evidence | Authoritative artifact and basis | Interpretation boundary |
|---|---|---|
| US OEWS | `lib/data/oews-may2025-position-pay.json`; national May 2025 wage rows, workbook SHA256 `852250997ceff9b721ff68f63e877d818f9c1ec8b1b69dd367958faedd5282b2`; raw row/cell values, definitions and suppression strings retained | Annual USD mean/median for the named statistical occupation. Broader occupations and exclusions remain explicit. No city, seniority or applicant availability is inferred. Existing older regional records stay immutable. |
| UK ASHE | Pinned references in `lib/position-market-assumptions.ts`; 2026 provisional annual gross pay, tax year ending April 5, 2026; workbook SHA256 `a26908bc4e68162649c3de46b5fdfad051adcb87f256c5f667c7e4e23d0e230a`, CV workbook `124e8532d4abc6a4ab18f91f8b8ea5d97d191e6139dce7bc9d7a8a4770c695eb`; OGL v3 | Full-time adult employees in the same job for over a year. Native GBP, explicit dated planning FX, source CV/quality retained. Broad difficulty percentages are separate evidence, not exact-role hiring time. |
| Japan | `lib/data/mhlw-japan-2025-position-pay.json`; MHLW Table 1 SHA256 `05380f928b776122821214c1e8e50a963a3a4a178bb3d0a27386ae2509221cdd`; crosswalk SHA256 `49f548ac63b4c7ff7ddc4e870ea2ca885700851666d92b863f1021a8e30a393e`; full provenance/licence links in [source record](japan-position-market-reference-2026-10-31.md) | Native JPY **annualised cash estimate**, not median, base salary or an observed calendar-year total. June 2025 regular monthly cash ×12 plus the survey's prior-year bonus/special-payment component. General workers, both sexes, all industries, enterprises with 10+ employees. Explicit duties, full-time planning basis, dated FX and employer on-cost. |

The source registry contains exact publisher URLs, release/reference dates, occupations, populations, mapping rationale and qualifiers. Do not replace a source version or rewrite saved source objects during a later expansion. Raw employment totals are not available candidates. Modeled country assignments are not verified US state locations. Derived planning cost is not authenticated Finance approval.

## Data and calculation path

- Inventory selection determines eligible role/country scope. Mixed or unmapped scopes remain unavailable for automatic adoption.
- The user confirms duty applicability and modeled full-time basis, chooses a supported statistic, and enters employer on-cost. Non-USD sources additionally require a dated, explicit USD-per-native-currency assumption; there is no default FX.
- Annual planning cost per hired FTE equals the native annual wage/annualised cash × explicit FX when needed × (1 + on-cost/100). Existing scenario arithmetic applies FTE and horizon separately. Do not multiply by headcount twice or relabel an added position as an existing vacancy filled.
- Review/cancel/apply is explicit. Applying pay changes the annual hiring-cost assumption, not budget approval, allocation, timing or source-team capacity. Immutable saved revisions retain their own market capture.
- `planning.positionMarketAssumptionsV1` stores v1/v2/v3 adoptions. `positionMarketForCapture` resolves saved scenario/revision evidence. A current draft adoption must never stand in for another saved revision or goal. The released context extension reuses canonical validation; client-provided prose or hashes do not grant authorization.
- Track and Review compare matching target/result scope, unit and date. Backup/restore preserves these relationships and old source versions. It does not reconstruct the database or deployment.

## Verification and known test limitations

PR497: 166 affected checks, 62 independent focused checks, CI 41231621323; public desktop/mobile each 11 groups. PR499: 116 affected checks, 64 independent focused checks, CI 41233627411; public desktop/mobile each 7 groups. Both had clean direct public reports and inspected images. No provider answer was generated by these checks.

The protected staging transport can report post-test teardown errors; keep them separate from actual functional failures. The Japan harness initially captured storage before asynchronous planning defaults settled; its correction waits for initialization and stable bytes, retaining strict cancellation equality. The US ML harness initially used a raw goal ID instead of the Action Plan's serialized key; its correction uses the rendered contract and asserts active-goal identity. These were test corrections, not concealed app fixes.

## Remaining source requirements

138 vacancies remain without conditional pay references: India 59, US 11, Canada 15, Singapore 11, Germany 10, Australia 9, Brazil 7, France 7, UK 6, Japan 3. Do not fill these with guessed wages.

- **Australia:** official original `ANZSCO Occupation data - February 2026.xlsx` at the [JSA download](https://www.jobsandskills.gov.au/sites/default/files/2026-07/ANZSCO%20Occupation%20data%20-%20February%202026.xlsx) remains unavailable. Desktop 60s/120s attempts returned no bytes; Linux GET and one transient retry returned 503, also no source bytes. This is an upstream/network failure, not an observed access denial; retries stopped. No hash, ZIP integrity, cells or workbook licence was verified. Official HTML pages for 2247 and 2713 show May 2025 weekly non-managerial full-time adult-rate medians, but the ABS customised report's specific reuse/attribution terms remain unresolved. General JSA CC BY4.0 excludes third-party content. Do not publish new app records from page values alone. Qualified page-only evidence is retained outside the app in `integration-evidence/australia-page-evidence-20261031.json`.
- **Singapore:** official 2025 monthly wage workbook is readable, SHA256 `aca07332918a4ce079e6418b8bfa21ed6ddf1b793b04264afe8aa0353ce26b43`; product-specific reuse authority is unresolved. Monthly basic/gross medians for full-time resident employees are not annual employer cost. No new mappings are published.
- **India:** the inspected industrial wage source excludes the professional roles needed. A permitted professional-role source with compatible pay basis and reuse terms is required.
- **US:** verified rows 13-2031 and 15-1211 and conditional duty review are released in PR502. People Analytics has a reviewed but unreleased opt-in statistical/predictive duty candidate. Generic cloud/infrastructure and other remaining titles need concrete duties; no all-other substitution or state inference.
- **Canada/Germany:** prior denied routes must not be retried or circumvented. **France/Brazil:** currently held evidence does not establish a compatible detailed role/cost contract.

Lab methodology validation remains user-owned. The chart-target overlay is preview-only. Preserve spending, accounting, credentials and access controls. A documentation update or mocked payload test is not live-AI reliability proof.

## Current non-pay priority

The user requested more non-pay intelligence on October 31. Labor Market already surfaces US employment/location and national growth/openings, Toronto software vacancies, UK professional-group hiring difficulty, and qualitative occupational skills. Employment is not available applicants; projected openings are not current vacancies; O*NET requirements are not postings demand. Internal company time-to-fill is synthetic, not an external benchmark.

The next concrete integration gap is revision-bound non-pay evidence: position Details currently exposes some difficulty/skills, but numerical outlook/difficulty and skills snapshots are not pinned with the saved position explanation context. Require explicit attachment, canonical source/scope validation and backup preservation. Do not auto-adjust costs, hiring time, training duration or readiness. Broader BLS/O*NET/UK source evidence is under review, not yet integrated. Keep the separate People Analytics pay checkout held under this new priority.
