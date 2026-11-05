# Opening-known hiring feature audit — 5 November 2026

## Decision

The existing October company data does **not** support a defensible improvement experiment for start-within-90-days classification or historical duration prediction. Do not train or promote a model from this extract. All 4,690 mature requisitions have a recorded start, exactly 45 days after opening. A constant rule would look perfect but would simply reproduce the generator. There are no mature negative examples for classification and no mature duration variation to explain.

The existing Explore evaluation remains a separate synthetic experiment with request-only confusion matrices. No application, company dataset, saved history, permissions, database records or API budget changed. No new model was fitted. This is a source assessment, not a new performance result.

## Source identity and checks

Read-only metadata and aggregate queries inspected `workforce_october_2026` in the existing Supabase project on 5 November. It is the verified private October mirror, **not** the application's live database connection. Its population and lineage are documented in [the October release record](synthetic-october-2026.md). App data remains served from its immutable aggregate archive. The separate `public` schema preserves the older September population and must not be mixed into this assessment as October history.

[SQL](hiring-opening-feature-audit.sql) and [bounded aggregate results](evidence/hiring-opening-feature-audit-v1.json) retain the exact queried counts. No employee, applicant or requisition identifiers were exported. A separate read-only SQLite query of the retained October fixture confirms 4,690 mature records, 4,690 starts and minimum/maximum duration of 45 days. This is cross-representation consistency, not independent empirical validation.

| October opening population | Requisitions | Recorded start by day 90 | No hire record | Full 90-day window |
| --- | ---: | ---: | ---: | --- |
| Opened through 2 August | 4,690 | 4,690 | 0 | Yes |
| Opened 3 August–28 October | 455 | 293 | 162 | No |
| Total | 5,145 | 4,983 | 162 | Mixed; never treat all as mature |

The cutoff is 31 October 2026. Maturity uses `opened_date + 90 <= cutoff`, including the boundary. Early observed starts in immature cohorts are known positives, but excluding their unresolved peers or labeling those peers negative would bias a completed-cohort evaluation. All 162 unfilled openings are immature. There are no cancelled requisitions in this October extract. All requisitions declare one opening, no requisition has multiple hire rows, and there are no filled-without-hire, nonfilled-with-hire, start-before-opening or future-start contradictions in this query.

Quarter aggregates retain all cohorts. Every mature cohort has the constant 45-day duration. Recent Q3/Q4 records show other durations (19–59 days across the displayed quarter summaries), but their full 90-day observation windows are incomplete. They cannot supply an unbiased mature holdout merely because some have already started.

## Feature and leakage findings

| Candidate field | Actual evidence | Decision |
| --- | --- | --- |
| Role, level, location, organization | All 5,145 populated; 50 role IDs, 10 location IDs. Adapter joins the position dimensions. | Plausible modeled opening attributes, but no verified first-observed/revision history. Populated values do not establish historical availability or predictive signal. No mature outcome variation exists here anyway. |
| Opening month/date | Present; baseline generator sets opening to start minus 45 days for successful paths. | Legitimate descriptive event coordinate, but in this generator it is constructed from the successful path. Do not claim empirical temporal prediction from a random split. |
| Approval date | Complete, never after opening. Adapter copies opening date into approval date. | Not independent lead-time or decision information. |
| Salary budget | Both required range fields missing on all 5,145 requisitions. | Unavailable; do not substitute eventual compensation or offer salary as opening-known budget. |
| Target start date | Equals actual start on 201 recent records; October `recruit()` updates the planned date when filling a prior vacancy. Baseline plans were start plus three days. | Retrospective constructed plans, with no original plan version. Exclude as an opening-time predictor. |
| Requisition type | Adapter derives filled records' internal/external type from their hire; unfilled defaults external. | Outcome-derived construction, not verified opening intent. Exclude. |
| Current status, stage, funnel counts, offer/acceptance, closure and actual start | Adapter emits successful-path applications as Hired; events happen after opening. | Outcome or later pipeline information. Exclude from opening-time features; dated events may define targets only after completeness qualification. |
| `created_at` | One timestamp, 17 October 2026, on every requisition. | Adapter explicitly labels this a fixed reproducibility timestamp, not source observation time. Even the 25 records whose stamp precedes opening do not establish availability. |

Metadata inspection found no first-observed/revision/supersession columns in these hiring tables. Assignment validity, monthly snapshots and import receipts exist, but do not establish hiring-feature vintages or a complete historical event feed. The private mirror's completion seal proves import parity; it is not a 90-day historical observation attestation.

## Generator and adapter provenance

The retained baseline generator `synthetic-realism-baseline-20261023/generate.py`, SHA256 `d6473a34fc2cfd4c5271c3e0a04878a8a0a91f06b9ff351ef957802233126b12`, lines 103–109 constructs a complete successful path: opening `start - 45`, application `start - 35`, interview `start - 24`, offer `start - 17`, acceptance `start - 12`. Its open vacancies are added near the September cutoff, not sampled as mature failed searches.

The retained October adapter `synthetic-october-candidate-20261103/serving-prep/build_adapter.py`, SHA256 `b2a66971dd091bc6d458041e84a79a7f243435d7843b894c38b809fa822d7463`, line 14 declares the fixed generation stamp; lines 124–126 define the dimension joins, copied approval date, outcome-derived requisition type and Hired application status. These two hashed files are retained local artifacts, not new public source datasets or scripts copied into this PR. Relevant committed continuation logic is in `tools/synthetic-october-2026/extend.py` lines 67–74 and `policy.json`.

The extension intentionally makes October hiring/mobility heterogeneous for a coherent fictional business story. That permission and implementation do not create a mature predictive label history. No historical facts or generator rules were changed during this audit.

## Legitimate alternative checked: preserved September data

The separate `public` population has 5,310 requisitions mature by its own 30 September cutoff; 4,580 have an observed start by day 90, 347 have no hire row and 136 are currently cancelled. These aggregates are descriptive and overlap by status; do not add them as disjoint classes. The query's rows are not asserted to establish a verified one-opening prediction grain. Its records share the bulk timestamp 28 September 2026, with no verified historical feature/status vintages.

This is potentially richer source material, but it is not the current company's October population and is not a ready substitute. Missing hire rows are not automatically confirmed negative labels. Earlier [source-gap findings](predictive-analytics-roadmap.md) still require generator/coverage provenance, grain, feature snapshots and temporal availability. No source-supported observation timeline was established by the inspected metadata or local October lineage. Do not fabricate dates or combine populations to create class balance.

## Smallest sound next steps

1. **For the existing October data:** a classifier needs mature negative cases and variable outcomes that this generator does not produce historically. Waiting for modeled later months without defining their outcomes is not evidence. A separately specified, versioned synthetic hiring experiment could model complete opening cohorts, cancellations/unresolved cases, opening-known features, observation/revision times and varied durations. It must remain explicitly constructed and separate from preserved company history, with development data and a frozen future assessment. This is a data-model design choice, not a trained improvement ready to publish.
2. **For the preserved legacy population:** recover its original generator or authentic source contract establishing all-opening coverage, status completeness and first-known feature/label times. Then assess it separately, confirm grain, and freeze a chronological experiment before examining candidate performance. Current schema presence alone is insufficient.
3. **For a near-term portfolio demonstration:** retain the existing honest evaluation and baseline comparisons. A confusion matrix requires both adequately observed classes for useful balanced-accuracy interpretation. A perfect constant-duration or all-positive result from these company records would mislead readers.

No further model search against this October target is justified by the inspected evidence. This is a concrete data boundary, not an access denial or an API-budget blocker. The current prediction goal remains limited by source design; no claim is made that every possible alternative data source or predictive target has been exhausted.
