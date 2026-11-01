# France recruitment intentions: source and implementation record

Status: released and publicly verified in PR529. Baseline PR527/528 has 61 of 197 vacancies eligible for at least one non-pay reference, with 59 pay benchmarks. Coverage is conditional on planned duties matching the reference, not proof of actual duties or complete market intelligence.

## Source

France Travail BMO 2026 national published table: https://statistiques.francetravail.org/bmo/bmo?le=0&pp=2026&ss=1. Inspected through the actual official interface with France entière, all sectors, year 2026, rows by Métier. The source reports employers' recruitment intentions for 2026, anticipated recruitment difficulty and seasonal share. Fieldwork was October–December 2025. These are not current job advertisements, available candidates, realized hires or time to fill.

National HTML retrieved November 1, 2026: 159,232 bytes, SHA256 `9dbe93a7f33110b3b967af32ad9a840f4e106e10b50e363f9bb0592beca0d31d`. Local evidence: `integration-evidence/fr-bmo-2026/national-occupations.html`. Counts are published rounded to tens; under four projects are displayed as zero with no difficulty rate. Do not infer suppressed values or recompute percentages from rounded counts.

Official dataset catalogue specifies Licence Ouverte / Open Licence: https://www.data.gouv.fr/datasets/enquete-besoins-en-main-doeuvre-bmo. Attribute France Travail and the national table directly. The previously recovered basin workbook establishes FAP2021 codes but is not used to manufacture national sums. Its SHA256 is `735d0443b799b4c18c145055f87244a355a48b6286ee98ddbab272491d9792e0`.

## Conditional mappings

| App role | Vacancies | FAP2021 | Projects | Anticipated difficult recruitment | Seasonal |
| --- | ---: | --- | ---: | ---: | ---: |
| Software Engineer | 1 | M2X90, IT and telecom research/development engineers and cadres | 18,330 | 57.4% | 0.7% |
| Technology Consultant | 2 | M2X93, information-systems experts and consultants | 4,880 | 45.5% | 0.4% |
| Infrastructure Engineer | 2 | M2X92, IT and telecom production, operations and maintenance cadres | 1,980 | 40.9% | 1.0% |

Require explicit confirmation of engineer-level software design/development, information-systems expert advice, or engineer-level infrastructure operations respectively. Exclude routine helpdesk/technician work from the infrastructure mapping. These are broad occupational-family references, not title-specific estimates. INSEE PCS descriptions help review duties but no exact PCS-to-FAP crosswalk is asserted. FP&A and Sourcing remain unmatched; broad finance/purchasing labels alone do not establish a suitable match. Existing modeled duties are not rewritten.

Reader and AI context must expose the same canonical source facts and uncertainty. Attachment remains explicit and revision-bound. No automatic changes to pay, timing, funding, allocation or approvals. Existing market messages, source revisions, plans, Track/Review and backups must remain valid.

## Validation and release

Implemented three additive conditional references, candidate coverage 66/197; all 104 earlier references remain byte-identical. Source extraction passed against both original hashes. Independent review passed after finding and correcting France selection and country labeling in actual market chat messages. The backend group passed 114/115 initially; its sole historical US-only infrastructure count was narrowed to US and the corrected network suite passed 6/6. Final affected entrypoint/UI tests passed 28/28. Focused TypeScript has zero diagnostics. Exact-commit CI, isolated staging and desktop/mobile public acceptance subsequently passed as recorded below. No paid model requests are authorized or performed. Mocked context checks do not establish fresh model-answer quality.


PR529 runtime `679faf34c70f8b04afd3a63db57bb223a56e1267`, merge `614e506a800ff83fbb3a752a505930b073e9e7e7`, deployment `dpl_34hXBL8g9ahysU27DR9Y6Jes35Zz`. Exact CI41281261563 passed. Staging and direct public acceptance each passed ten groups at1440 and390 widths, HTTP200 only, eight intercepted explanation requests each, empty error arrays and drained teardown. Actual charts/details inspected. The same staged deployment was promoted unchanged; public deployment identity verified. Source archive `cae5d50f64f06882bfb8f208285712b74540a825685b086ea66634b74fb00066`,1238 inputs,1093 manifest entries,private inputs unchanged. Non-pay coverage66/197; pay59. No paid calls or fresh model-answer acceptance.
