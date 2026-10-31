# Market-to-position AI handoff

Updated October 31, 2026. This is the concise continuation record for coding agents and explanation-context work. Read the linked source records instead of treating this document as a new numerical dataset or model acceptance result.

## Current release and owned work

PR499 is live at runtime `fed6ef7d8fda265572ca6107f6946e744ebe21b8`, deployment `dpl_9obRQcR1Qi84mTALwgappaRcB8B6`. Conditional pay references cover **54 of 197** modeled vacancies: 35 US, 14 UK and five Japan. This is eligible reference coverage, not proof of candidate supply, recruiting feasibility, approved funding or an adopted assumption. User confirmation is still required. See [US ML release](us-machine-learning-market-reference-2026-10-31.md), [Japan release](japan-position-market-reference-2026-10-31.md) and [earlier UK/US references](market-reference-next-batch-2026-10-31.md).

The active grounding audit found that position explanations receive derived annual USD payroll but omit the adopted market provenance. The bounded fix is in progress: resolve the canonical adoption for the exact saved scenario/revision, validate it against pinned sources and scope, and include its native statistic and calculation basis. Do not claim this handoff is live until its release acceptance is recorded. Existing packets with no market evidence must retain unknown provenance. No paid model calls are authorized in this batch.

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
- `planning.positionMarketAssumptionsV1` stores v1/v2/v3 adoptions. `positionMarketForCapture` resolves saved scenario/revision evidence. A current draft adoption must never stand in for another saved revision or goal. The forthcoming model extension must reuse canonical validation, not trust client-provided prose or hashes as authorization.
- Track and Review compare matching target/result scope, unit and date. Backup/restore preserves these relationships and old source versions. It does not reconstruct the database or deployment.

## Verification and known test limitations

PR497: 166 affected checks, 62 independent focused checks, CI 41231621323; public desktop/mobile each 11 groups. PR499: 116 affected checks, 64 independent focused checks, CI 41233627411; public desktop/mobile each 7 groups. Both had clean direct public reports and inspected images. No provider answer was generated by these checks.

The protected staging transport can report post-test teardown errors; keep them separate from actual functional failures. The Japan harness initially captured storage before asynchronous planning defaults settled; its correction waits for initialization and stable bytes, retaining strict cancellation equality. The US ML harness initially used a raw goal ID instead of the Action Plan's serialized key; its correction uses the rendered contract and asserts active-goal identity. These were test corrections, not concealed app fixes.

## Remaining source requirements

143 vacancies remain without conditional pay references: India 59, US 16, Canada 15, Singapore 11, Germany 10, Australia 9, Brazil 7, France 7, UK 6, Japan 3. Do not fill these with guessed wages.

- **Australia:** official original `ANZSCO Occupation data - February 2026.xlsx` at the [JSA download](https://www.jobsandskills.gov.au/sites/default/files/2026-07/ANZSCO%20Occupation%20data%20-%20February%202026.xlsx) remains unavailable. Desktop 60s/120s attempts returned no bytes; Linux GET and one transient retry returned 503, also no source bytes. This is an upstream/network failure, not an observed access denial; retries stopped. No hash, ZIP integrity, cells or workbook licence was verified. Official HTML pages for 2247 and 2713 show May 2025 weekly non-managerial full-time adult-rate medians, but the ABS customised report's specific reuse/attribution terms remain unresolved. General JSA CC BY4.0 excludes third-party content. Do not publish new app records from page values alone. Qualified page-only evidence is retained outside the app in `integration-evidence/australia-page-evidence-20261031.json`.
- **Singapore:** official 2025 monthly wage workbook is readable, SHA256 `aca07332918a4ce079e6418b8bfa21ed6ddf1b793b04264afe8aa0353ce26b43`; product-specific reuse authority is unresolved. Monthly basic/gross medians for full-time resident employees are not annual employer cost. No new mappings are published.
- **India:** the inspected industrial wage source excludes the professional roles needed. A permitted professional-role source with compatible pay basis and reuse terms is required.
- **US:** request exact national detailed rows 13-2031 and 15-1211 from the already verified original workbook before considering conditional budgeting or systems-integration mappings. Duties still need narrowing. Generic cloud/infrastructure titles span different occupations; no all-other substitution or state inference.
- **Canada/Germany:** prior denied routes must not be retried or circumvented. **France/Brazil:** currently held evidence does not establish a compatible detailed role/cost contract.

Lab methodology validation remains user-owned. The chart-target overlay is preview-only. Preserve spending, accounting, credentials and access controls. A documentation update or mocked payload test is not live-AI reliability proof.
