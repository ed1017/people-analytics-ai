# Modeled role duties and conditional market references

Status at preparation: candidate implementation, not a published release. The verified live baseline covers 96 of 197 modeled vacancies with non-pay external references. This candidate adds six independently reviewed conditional matches, taking candidate coverage to 102 of 197. Authoring a fictional duty template does not itself increase external-reference coverage.

## Authorized scope

The owner approved defining realistic missing duties for the fictional company. Eleven country-role templates cover thirteen modeled vacant positions. They were authored from the existing role identities, internal role-skill requirements and business context before external matching. Country/team/level intersections remain modeled, not observed employee assignments. No new approval, skill proficiency, capacity, pay or readiness is inferred.

| Country | Role | Vacancies | Duty emphasis | New external match in this candidate |
| --- | --- | ---: | --- | --- |
| Canada | Strategy Analyst | 1 | Strategic choices, business cases and recommendations | NOC 11201, conditional broader reference |
| Canada | Business Operations Specialist | 1 | Service processes, handoffs and improvement | NOC 11201, conditional broader reference |
| Canada | Sales Account Executive | 1 | Business-service prospecting, proposals and commercial terms | NOC 64101, non-technical service sales |
| Canada | Sales Operations Specialist | 1 | Pipeline definitions, reporting and sales-process support | None |
| Canada | AI Architect | 1 | Applied AI application requirements, interfaces and evaluation | NOC 21231, broader software/system design |
| United Kingdom | Business Operations Specialist | 1 | Service processes and operational improvement | England NCS Business analyst guidance |
| United Kingdom | Client Operations Specialist | 1 | Service commitments, delivery handoffs and escalation | None |
| United Kingdom | Corporate Development Analyst | 3 | Acquisition screening, valuation and due diligence | None |
| Germany | People Analytics Analyst | 1 | Statistical workforce analysis and HR decision support | ESCO Data analyst 2511.3, broader analytical reference |
| Germany | Customer Success Specialist | 1 | Onboarding, adoption and support | None |
| Japan | Talent Management Specialist | 1 | Talent reviews, development and succession coordination | None |

The original four US templates remain unchanged in `position-modeled-duties-v1.json`. The additive fixture is `position-modeled-duties-expansion-v1.json`; existing records keep their original IDs, versions and content. The serialized original four-template SHA-256 is `a919c7be027a79ad63bd5cbc17d9fdd1adb9daa0ad8431dbed42a55c766372ba`. The new German Customer Success template retains the original non-sales duties, and the UK Corporate Development template retains the transaction-focused duties. Neither was rewritten to obtain an occupational match. People Analytics does not acquire a predictive-model requirement.

## Reviewed external sources

| Source | Exact original SHA-256 | Candidate use and boundary |
| --- | --- | --- |
| Statistics Canada NOC 2021 v1.0 elements CSV | `50c3e31a90b0150cc5b8efd29ec020c2fd9ea5fc5b0a171ed65d3cd9a0abf32f` | Four Canadian mappings. Preserve some-or-all duty wording, subgroup conditions and may/usually entry guidance. Classification descriptions are not measured demand or available applicants. |
| National Careers Service Business analyst page, captured 1 November 2026 | `6f21a2b50b0f4eadd679d99017fef232874d823d6cadfe3d88837a3e4dc9420d` | Nine skills and six tasks in source order. England careers guidance, conditionally applied to the UK scenario; publication/update date remains unavailable. |
| ESCO v1.2.0 Data analyst occupation response | `15f89371dd4011480b0d1f56e2362cc6e15a5f764bb4a14e0b8c452ebd31f8cb` | 67 categorical relations: 36 essential and 31 optional. European taxonomy, not German measured demand or exact People Analytics requirements. Big-data, RDF and data-engineering relations do not become mandatory vacancy duties. |

NOC 11201 reuses original records 1817–1820 and 1823 for organizational process/strategy analysis; 21231 uses records 6191–6195 for software/system design and integration. The additional 64101 extraction retains the business-services example at record 21239, main-duty records beginning at 21364, entry guidance and exclusions. Engineering registration guidance is not presented as a universal requirement for AI architecture.

The NCS source is [Business analyst](https://nationalcareers.service.gov.uk/job-profiles/business-analyst), reused under OGL v3. The ESCO fixture retains its official occupation URI, selected-version request, attribution and CC BY 4.0 notice. Canonical source identities, complete selected content and reuse information are stored in the respective immutable source fixtures; source order is not a ranking.

## Review trail

Executor evidence artifacts are outside the release source; paths below identify the retained review record, not public download links:

- `integration-evidence/modeled-duty-expansion-design-20261101.json`: eleven authored templates, exact modeled vacancy IDs, internal skill requirements and rationale; SHA-256 `04c404caf3c5067c317fa460c00ba33afdc44fea016e967390abfb8d970c499d`.
- `integration-evidence/modeled-duty-source-fit-independent-20261101.json`: Canadian original-record review and initial held-role decisions.
- `integration-evidence/gb-modeled-duty-match-review-20261101.md`: accepted Business Operations scope and held Client Operations/Corporate Development assessments.
- `integration-evidence/modeled-duty-followup-20261101/review.json` and `data-analyst-v1.2.0.json`: later Data Analyst source review. This supports a different broader analytical reference; it does not reverse the earlier rejection of a whole Data Scientist or HR officer profile.

The corresponding source fixtures are `statcan-noc-duty-expansion-v2021.json`, `ncs-business-analyst-career-profile-20261101.json` and `esco-people-analytics-skills-v120.json` under `releases/2026-10-21/source/lib/data/`.

## Explicit consent, saved state and AI

Modeled duties and external references are separate choices. Reviewing or saving a fictional duty template does not attach an external source, confirm its fit or authorize staffing. An external reference requires its own selection, duty confirmation and reviewed attachment. No automatic latest revision is selected after reload.

The existing `planning.positionModeledDutiesV1` and `planning.positionMarketContextV1` ledgers bind their immutable records to the exact saved allocation revision and signature. Country and role must be homogeneous. Cancel and stale confirmation must not write. Backup validation preserves original records; Track goal copying rebinds the outer goal while retaining saved records and the original exploration. No new storage engine or destructive migration is introduced.

The canonical explanation reader resolves only the explicitly selected modeled-duty and external-context revisions. Fictional assumptions remain distinguishable from cited source content. General market lookup may show eligible conditional references but does not imply the user has adopted duties. Neither path changes allocation, funding, costs, timing or readiness. Mocked transport tests establish payload and source integrity, not fresh provider answer quality; this batch makes no paid model calls.

## Remaining source-fit boundaries

Seven of the thirteen newly modeled vacancies remain without a new matched source in this batch: Canada Sales Operations; UK Client Operations and three Corporate Development positions; Germany Customer Success; Japan Talent Management. Clear fictional duties resolve the missing-definition issue, not the independent source-fit question. The current reviewed sources are too broad or materially different; no blanket claim is made that no suitable source exists.

## Australia is a separate follow-on

The owner-supplied original six-digit and four-digit Australian OSL workbooks have been recovered. Their identities are respectively `9d35938318b7032f95a1f203962f83d00800622a98a8f2df17d8ace90fedcedd` (151,746 bytes) and `0eab13fc886e4b8e7852a56dfe6863b8e32101996e5e7c167495b9a030e4ec39` (81,658 bytes). `integration-evidence/au-osl-rights-duty-review-20261101.md` records the separate rights and conditional role-fit review. JSA's published CC BY 4.0 terms support a bounded attributed extraction subject to their exclusions; an unresolved blanket reuse-rights prohibition is not the current status. Exact workbook rows, taxonomy granularity and mappings still require their own review and release. This candidate adds no Australian coverage.

## Release evidence pending

This document records the candidate contract and reviewed evidence, not a deployment completion. Exact commit, CI, staged/public acceptance and final live coverage belong in the release record after those gates pass. Existing roadmap and release records are not changed by this document.
