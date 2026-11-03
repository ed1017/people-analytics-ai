# October 2026 synthetic workforce extension

This update is authorized fictional company data, not newly observed employment or external market evidence. The target is October 31, 2026. The generation policy is frozen in `tools/synthetic-october-2026/policy.json` before generation. It appends to the exact retained geography fixture SHA256 `47dbd4e63ca953fa8761e4d3c4e7de55aeb0f19c595224f8707d03e209015460` rather than restarting the original generator.

The October story deliberately differs by business unit: Managed Services recovers, Data/AI expands, Digital contracts, Consulting and Sales decline, and Corporate remains flat after transfers. Counts are explicit scenario assumptions. Geographic/level composition follows dated underlying events and positions, not independently perturbed dashboards. No target forecast accuracy or external benchmark is implied.

All historical snapshots and joined workforce facts through September must remain identical. Closing an open employment, assignment, position or reporting interval on an October event date is a necessary bounded change; no pre-October event or compensation fact is rewritten. New IDs must not collide, and mapped entity namespaces remain stable. Existing saved plans, revisions and their old source identities remain readable; no silent rebinding to October is permitted.

The new snapshot requires a distinct dataset identity and coherent regenerated component, joint-cell, query and public receipts. YTD turnover uses ten monthly closing stocks. October is only one month of Q4 and must not be presented as a complete quarter. Prior survey, rating, skill and external-source dates remain explicit; lack of an October observation is not zero or newly refreshed evidence.

Status: local candidate and runtime integration; not yet published. Supabase is unchanged. Production remains PR556 until review, CI and staged verification complete.

## Reconciled October result

9,092 active people, 8,904.8 FTE, 162 vacancies and 9,254 current positions. October has 171 external starts, 116 exits (77 voluntary), 15 transfers and 15 promotions. Headcount reconciles as 9,037 + 171 - 116 = 9,092. Vacancies reconcile as 197 - 115 fills + 80 replacement openings = 162; 56 expansion slots are filled and 36 exited slots are retired. Internal moves do not increase company headcount. FTE changes by 53.4 rather than copying the 55-person change.

| Business unit | September | October | Change |
|---|---:|---:|---:|
| Client Operations | 1,308 | 1,321 | +13 |
| Consulting | 970 | 964 | -6 |
| Corporate | 780 | 780 | 0 |
| Data and AI | 1,030 | 1,071 | +41 |
| Digital | 1,136 | 1,118 | -18 |
| Managed Services | 1,455 | 1,484 | +29 |
| Sales | 847 | 839 | -8 |
| Technology | 1,511 | 1,515 | +4 |

The generator applies explicit dated hires, exits, transfers, promotions, position closures and compensation changes. Geographic, level and tenure weights and clustered dates differ by business unit. Dashboard values come from those same records. This is an authored fictional October business story, not an external labor-market inference.

## Lineage and preservation

The October fixture SHA256 is `33fda750e17332f60d03dd5c155593cb7d7911043fcedcdfa07212303f115e5a`; bundle SHA256 is `05ea67e66bd41f5ac31c1a79e9b2d8aa9cf9051a3c04d8bab6815f03d51d6eaa`. All 33 prior month-end snapshots and historical joined workforce facts are retained; historical facts digest is `bc33fa0d06fa50cfff15772d66891750f7853eb553d6ebeead7863682c3075e9`. All daily October reporting forests and earlier monthly forests were independently checked. No employee assignment overlaps or invalid source foreign keys were found.

The new public identity is v5:6 with October 31 cutoff. The October position model v3 uses separate MODEL3 identifiers; v2/v1/demo registers remain unchanged for saved selections. Stored v4:5 projection references remain readable but cannot authorize a new current-data calculation. The standalone ratings/survey history generator and certificate are unchanged.

Ratings, survey responses and succession assessments retain September cohorts/dates. The auxiliary source CSVs are unchanged. October active preference coverage excludes 69 departed people without deleting their historical preferences: 4,450 active preference records; 34,301 active skill profiles. New hires have no invented skill assessments. The source has 34,746 raw skill records including historical employees.

Role recruiting uses the complete November 1, 2025–October 31, 2026 closed-requisition window, twelve buckets including zero months. It remains descriptive successful-fill history, not available hiring capacity. Annualized YTD rates use ten month-end stocks. Q4 is incomplete and cannot supply a full-quarter rate. External market references retain their original dates and licences; historical 108/197 non-pay and 59/197 pay coverage must not be relabeled as current 162-vacancy coverage without recounting.

## Local verification so far

The isolated PostgreSQL replay executes 62 application queries: 49 changed with the October data, 13 identical. Twenty public GET projections, fifty role recruiting responses and fifty internal-talent responses pass, including client compensation validation, retained September ratings and all eight capacity-risk groups. These checks use local pinned artifacts, no Supabase mutation, network request or paid AI call. Typechecking passes after restoring the already-packaged experiment dependencies. New regressions cover partial Q4, October stock history, old/new position inventories, saved September references and explicit period clarification. Historical explorer tests preserve original outputs.

Independent review found and prompted fixes for date-dependent adapters, current scope receipt rejection, retained assessment denominators, Company profile identity and planning/AI period copy. Remaining release gates: full relevant regression suite, final independent review, exact-commit CI, staged desktop/mobile checks, merge/promotion and direct public verification. No fresh provider-answer quality is claimed; paid AI testing remains paused.

## Release preparation and rollback

Before publication, all 29 focused workflow test groups passed locally (failed September-bound fixtures were corrected and rerun). Native Windows historical tests also exposed POSIX-only path assumptions and byte-hash differences from checkout line endings; full-history Linux CI remains the release gate, without relaxing frozen historical assertions. Exact Git history has now been fetched.

Supabase inspection on 2026-11-03 found public employee_snapshots still at September 30 with 10,000 people and 12,880 employee records. That is the preserved legacy population, not the live app's separately packaged 9,037-person September candidate. Do not apply the 9,037-to-9,092 delta to those tables. The public runtime serves pinned private aggregate artifacts; the AI accounting schema is separate and unchanged. A versioned database import must preserve the legacy population and its references.

Rollback: retain the PR556 production deployment and its original private archive, the unchanged September SQLite fixture and bundle, and the October candidate files. Stage production with domain assignment disabled; promote only after exact-commit CI and staged checks. If public verification fails, promote the retained PR556 deployment without rebuilding or rewriting saved browser data. New October references must remain explicitly versioned and readable, never rebound to September. No database rollback may delete historical records or touch the AI budget ledger.
