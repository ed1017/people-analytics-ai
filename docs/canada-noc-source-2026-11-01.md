# Independent Canada NOC evidence audit

Captured 2026-11-01. Source contract for the conditional Canadian occupational-guidance module. Publication requires separate integration and release acceptance.

## Source and rights

Independent classification dataset: Statistics Canada, National Occupational Classification (NOC) 2021 Version 1.0, released 2021-09-28. Catalogue: https://www.statcan.gc.ca/en/subjects/standard/noc/2021/indexV1 . Its 2026-03-20 page modification is not a new occupational observation date.

Original Elements CSV: https://www.statcan.gc.ca/en/subjects/standard/noc/2021/indexV1/noc-2021-v1.0-elements.csv

Downloaded once using the ordinary approved network path. 5,129,133 bytes; SHA256 `50c3e31a90b0150cc5b8efd29ec020c2fd9ea5fc5b0a171ed65d3cd9a0abf32f`. UTF-8 CSV; five fields: Level, Code - NOC 2021 V1.0, Class title, Element Type Label English, Element Description English. Original bytes preserved. `noc-reviewed-records.json` preserves all selected records with logical CSV record numbers (header=1). No selected record contains U+FFFD.

Statistics Canada Open Licence: https://www.statcan.gc.ca/en/terms-conditions/open-licence . It permits reuse and adaptation, including commercial distribution, subject to accurate reproduction, source acknowledgement and no endorsement/misrepresentation. Use its prescribed adapted-product attribution with product name and reference date in Details. No logos or government insignia. This is a source-terms finding, not legal assurance.

The separate ESDC hierarchy https://noc.esdc.gc.ca/Structure/Hierarchy and NOCProfile pages corroborate occupational identity. The downloaded Statistics Canada edition is the pinned content source. Do not silently combine future profile revisions with this release.

## Recommended conditional first batch: 10 of 15 Canadian vacancies

Counts verified against `nonpay-release-records-worktree/docs/data/nonpay-vacancy-coverage-2026-11-01.json`. These are proposed duty-compatible references, not verified duties of actual workers. Require explicit actual-duty confirmation before attaching to a scenario.

| App role | Vacancies | NOC | CSV records | Required substantive fit / exclusions |
|---|---:|---|---|---|
| Cloud Architect | 2 | 21231 Software engineers and designers | 6128–6202 | Cloud architect is an exact All examples entry, CSV record 6142 (not Illustrative example(s)). Requirements, architecture/models, integrated-system design/testing; exclude routine administration/support without design. |
| Talent Acquisition Specialist | 2 | 12101 Human resources and recruitment officers | 2259–2314 | Staffing requirements, candidate screening, interviews/selection and offers; exclude sourcing vendors or unrelated procurement. |
| HR Business Partner | 1 | 11200 Human resources professionals | 1620–1745 | Develop/evaluate HR policies/programs and advise management/employees; exclude clerical HR administration alone. |
| Transformation Consultant | 1 | 11201 Business management consulting | 1746–1830 | Assess managerial methods/organizational effectiveness and propose operational/process improvements; exclude implementation coordination alone. |
| Growth Marketing Specialist | 1 | 11202 Advertising, marketing and public relations | 1831–1973 | Marketing strategy, digital campaigns and post-campaign analysis; exclude sales-account administration alone. |
| Data Engineer | 1 | 21223 Database analysts and data administrators | 6040–6093 | Database architecture/data models/DBMS design, integration or data-administration standards; exclude generic pipeline operations lacking these duties. |
| Technology Consultant | 1 | 21222 Information systems specialists | 5970–6039 | Analyze/improve IT systems and internal processes, systems design/testing/quality; exclude generic commercial advice or helpdesk-only work. |
| Applied Data Scientist | 1 | 21211 Data scientists | 5839–5884 | Advanced statistical/ML modeling, experimentation, data preparation and algorithm development; exclude reporting-only analytics. |

Official corroborating profile URL for each code: `https://noc.esdc.gc.ca/Structure/NOCProfile?GocTemplateCulture=en-CA&code=CODE&version=2021.0`.

## Hold five vacancies pending narrower duty evidence

Strategy Analyst (1): no evidence choosing organizational-method consulting versus investment/market strategy. Business Operations Specialist (1): no evidence distinguishing professional organizational analysis from operational administration. Sales Account Executive (1): product/technical scope and sales duties unspecified. Sales Operations Specialist (1): no evidence separating sales execution, administration and professional analysis. AI Architect (1): architecture title alone does not distinguish systems architecture from advanced model research/design. Do not map these to all-other categories or reuse foreign profiles.

## Honest product contract

Surface Canadian occupational duties and source-described entry guidance as qualitative classification evidence. Preserve source qualifiers such as usually/may; qualifications are not universal employer requirements. In particular, the 21231 P.Eng. statement concerns regulated engineering practice and approval of engineering drawings/reports, not an automatic licensing requirement for every cloud job. Prefer duties first and optional entry guidance in Details.

No demand, hiring difficulty, applicant availability, wage, proficiency rating, trend, provincial statistic or time-to-fill is present. No numeric chart or demand score can be derived. NOC is independent of the denied COPS/OaSIS resources. Neither denied catalogue nor a mirror/download of those resources was accessed. Job Bank timeout was not retried. No account, paid service, new credentials or application edits were used.


## Normalized integration proposal (not app integration)

`canada-noc-duty-guidance-canonical.json` contains eight occupations / ten conditional vacancy matches. `normalize.py` rebuilds it from the pinned original CSV and checks every selected duty, employment-requirement, exclusion and additional-information string against its exact logical source record. Raw strings retain trailing spaces and source wording. The separate mapping conditions are application-authored confirmation criteria, never presented as official NOC prose.

Suggested reusable facts kind: `occupational-duty-guidance`. Carry occupation code/title, duty preamble, ordered duties, ordered entry guidance and source-record provenance. Source list subgroup headings (Database analysts / Data administrators) remain in order; render them as headings, not additional requirements. Display duties compactly with expansion; place entry guidance, exclusions, source edition and attribution under Details. Preserve the some-or-all preamble and may/usually qualifiers. No quantitative bar, rating, demand badge or mandatory credential inference.

Attach through the existing explicit conditional duty-confirmation and revision-bound market-context contract. Looking up a reference does not automatically adopt it, validate modeled duties, or change a position's funding, cost or readiness. Include exact source/version/hash and canonical selected reference in explanations, with original allocations, old revisions, backups and goal isolation unchanged. Do not extend beyond the ten reviewed matches or infer Canadian province. Keep five held roles excluded.

Normalization verification: PASS; 78 ordered duty records plus eight preambles, 27 entry-guidance records, eight mappings, ten vacancies, five held roles. Fixture SHA256 `2b2aeac9ad1d94c61eb3d086eb9e18826b19d5e4a4b6ec522729a50bd39af270`, 46,747 bytes. App-level parser, renderer, explicit-adoption and persistence tests remain integration-owner work; no app tests or browser acceptance claimed here.


## Application fixture and module

Canonical app fixture: `lib/data/statcan-noc-duty-guidance-v2021.json`; module: `lib/position-canada-duty-guidance.ts`. The app fixture retains source records and adds explicit isHeading booleans. Exactly two Main duties records are subgroup headings: 6078 Database analysts and 6085 Data administrators. They form two groups of six substantive duties. The other seven profiles have unlabelled ordered groups. There are 76 substantive duty items, two subgroup headings and eight source preambles. No wording heuristic identifies headings.

`canadaDutyGuidanceReferences()` exports eight CA-only references using kind `occupational-duty-guidance`. The source hash and edition are pinned. Reference IDs use `statcan-noc-duties:<NOC code>:<app role>`; versions combine fixture ID, original CSV hash and conditional-duties-v1. Facts have dutyPreamble, dutyGroups(label/items), entryGuidance, exclusions, releaseDate, capturedAt, observationDate:null, taxonomy and ordering. Display normalization removes surrounding whitespace only. No mutable fixture arrays are exposed.

Source edition and capture date are separate. This classification is not a sampled workforce, observed employer requirement, proficiency assessment or labour-market demand estimate. Modeled task templates, Finance approval, pay, readiness and position counts remain independent.

## Public release appendix - PR536

Exact runtime `c0ba3d6ec604b22d0f2dbe86101955dd724ba5b1`, deployment `dpl_ArAgSAsFCgmywFKtp1YFvcYc6mQQ`, successful CI41289621631. Seven staged groups passed per width, including corrected bounded Track/backup continuation after the existing20-goal cap stopped the initial fixture. Promotion and public deployment identity are verified; all seven direct public groups passed at both widths, with HTTP200, no recorded errors, zero asset replay, drained teardown and inspected screenshots. Seven explanation requests per run were mocked. Eight references add ten eligible vacancies, publicly accepted96/197 with131 total references, preserving all123 earlier references. Pay59 and modeled duties remain unchanged. No paid calls or fresh model-output acceptance. See [reconciliation](nonpay-release-reconciliation-2026-11-01.md).
