# Non-pay market context for position planning

Status: implementation candidate, not released. User priority changed on October 31 from incremental pay coverage to decision-useful non-pay evidence. The separate People Analytics pay candidate is held; it is not part of this slice.

## New evidence

### In-demand software references

Original O*NET® Database 31.0 `software_skills.csv`: [official download](https://www.onetcenter.org/dl_files/database/db_31_0_csv/software_skills.csv), 3,557,545 bytes, SHA256 `6aabb96b464288db849580e6510530efff3f80e25dde2bb23f1fc36bb526b016`. Database release: August 2026; software content last updated in 30.3, May 2026. Original download and all selected rows were independently compared on October 31.

The app fixture selects 3,222 rows for 17 already-reviewed full O*NET occupation codes, retaining software example, Element ID/Name, raw Hot Technology and In Demand Y/N flags and original CSV coordinates. It omits duplicate raw-column objects; values are unchanged. Of these source rows, 196 carry In Demand=Y. That count is an extraction check, not a measure of occupational demand strength. BI 15-2051.01 and purchasing 13-1023.00 remain distinct from broader wage groups.

Examples: Budget Analysts has eight flagged software examples, Computer Systems Analysts ten, and Software Developers thirty. These are categorical national occupation references, not posting percentages, vacancies, applicants, proficiency assessments or training durations. N means not flagged by this source, not zero demand. Source/list ordering is not a ranking. Do not use the US flags as measured UK/local demand.

[CC BY 4.0 bulk database terms](https://www.onetcenter.org/license_db.html) cover this download and flags. Credit O*NET® Database 31.0 and U.S. Department of Labor, Employment and Training Administration, link the licence, identify the selected/normalized subset and avoid endorsement claims. O*NET® is a trademark of USDOL/ETA. Lightcast online posting percentages are excluded because their reuse terms remain unresolved.

### Projected openings and occupational separations

Original BLS [occupation.xlsx](https://www.bls.gov/emp/ind-occ-matrix/occupation.xlsx), 413,524 bytes, SHA256 `08ee182f992d972593e64559ce467bad75967d2228f11ad5e2f86d4ec0ee6c00`. The authorized Linux research task verified Table 1.2 and Table 1.10 extracts; the app preserves eight normalized occupation records and their source rows. [BLS public-domain terms](https://www.bls.gov/opub/copyright-information.htm) apply; cite BLS.

National 2025–2035 projections provide base/projected employment, published decade change, annual-average openings, labor-force exits and occupational transfers, plus typical entry categories. Original count units are thousands; the fixture explicitly scales them by 1,000. Published changes, percentages and independently rounded components are retained rather than recomputed from rounded totals.

For example, Budget Analysts has 2,900 projected annual openings, 1,000 labor-force exits and 1,800 occupational transfers; Computer Systems Analysts has 32,900, 12,600 and 16,000 respectively. These do not measure current postings, available candidates or time to fill. Transfers mean leaving an occupation, not all job changes. Typical entry preparation does not establish a candidate's skills or a training-time guarantee. HR manager/specialist source rows do not create unreviewed internal-role mappings.

## Revision and explanation contract

The proposed `planning.positionMarketContextV1` lives in the existing saved-work store. Explicit reviewed attachments bind canonical source IDs/versions to the exact dataset, goal, scenario, allocation revision and signature. Context revisions are append-only and explicitly selected for explanation. No pay adoption is required. Attaching context must not alter allocation, finance, pay, hiring time, training duration or readiness.

Server validation reconstructs canonical evidence instead of trusting client-supplied figures or URLs. Backup/restore and tracking-goal copies must preserve and validate the attachment relationships. Legacy records with no attachment remain compatible. Selected-role duty confirmation remains necessary; a company title alone is not occupational equivalence. Mixed or unsupported scopes stay unavailable.

## Held-out evidence and next requirements

UK occupation-specific ESS difficulty is being evaluated separately: preserve published density, sample base and every suppression symbol; do not derive rates from rounded counts or silently inherit broad-group estimates. Toronto cannot be inferred from a Canada-only position. German vacancy-duration workbook rights remain unresolved. No direct role-specific available-applicant count or open US/UK measured time-to-fill was established. The company time-to-fill metric remains internal synthetic data.

Acceptance is pending independent model/UI review, regression/CI, isolated production staging and public desktop/mobile checks. Mocked explanation requests are not paid-provider answer acceptance. No paid calls, new credentials, accounting/access changes, Lab validation or target-overlay publication are included.
