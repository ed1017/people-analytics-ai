# Same-workforce performance rating field — 2026-10-06 proposal

Status: local implementation and SQL proposal, **not a database migration deployment or approval to release ratings**. No remote writes, grants, RLS changes, raw records, new public API or model-input changes. The independent turnover chart is PR157.

## Verified existing schema and population

Read-only Supabase metadata and aggregate inspection on 2026-10-06 confirmed:

- `employee_snapshots` has a unique `(snapshot_date, employee_id)` key and already carries location, business unit and job level. There is no performance rating, review date, review period or rating availability field. It contains 33 monthly snapshots from January 2024 to September 2026. The dashboard uses the September 30, 2026 snapshot: 10,000 employees. It applies scalar country via snapshot location, business unit via snapshot org unit, and level via snapshot job level. It adds no separate employment-status eligibility rule.
- `performance_reviews` already contains nullable numeric `performance_rating`, nullable `review_date`, required `review_period`, and employee identity. Existing review rows cover 2024 Annual (8,994), 2025 Annual (9,553), 2026 YTD (10,000). The observed rows have no null or noninteger/out-of-range ratings. This does not prove an employee-by-employee period join or verified source availability.
- Both tables have RLS enabled. `service_role` can SELECT snapshots, but cannot SELECT performance reviews. Neither `anon` nor `authenticated` can SELECT either table. No privileges changed. Copying protected reviews into snapshots would make those values readable through an existing server role and is therefore an access expansion even without a GRANT.
- Rating calibration, generator provenance and release timestamps are unverified. `created_at` is not accepted as release availability. Matching aggregate row counts do not prove matched employee populations. No raw person rows or identities were exported.

## Concrete local change

`database/workforce_performance_rating.proposed.sql` adds five nullable fields to the existing snapshot rows: `performance_rating SMALLINT`, `performance_review_date DATE`, `performance_review_period TEXT`, `performance_available_at TIMESTAMPTZ`, and `performance_rating_status TEXT`. This is one new rating field with required time/availability metadata, not another dataset. Existing records initially remain entirely null; no invented values or automatic backfill.

A CHECK requires either all-null/unavailable metadata or a fully dated `rated`/`not_rated` record. Rated values are integers 1–5; not-rated records have no numeric value. Review date cannot exceed snapshot date; known availability cannot precede review date. Null/unavailable differs from a verified not-rated employee, and neither is zero. No semantic category names (such as meets expectations) are inferred.

The guarded rollback removes only empty added fields and refuses if any new field was populated. If populated, disable consumption and retain data; do not drop columns. Both scripts preserve original rows, grants and RLS.

The Supabase CLI was not installed. A pinned 2.81.3 installation could fetch npm packages but its GitHub binary/checksum download failed with `EAI_AGAIN github.com`. The files therefore remain explicitly named proposals outside `supabase/migrations`; no timestamped migration is invented. A releaser must use `supabase migration new workforce_performance_rating` to materialize the reviewed SQL when CLI access is available. The proposal SQL was executed only in isolated local PGlite PostgreSQL for verification.

`database/workforce_performance_aggregate.proposed.sql` is a parameterized read-only query over those new snapshot fields. It matches the dashboard's exact September 2026 population and existing scalar filter semantics; it has no new picker, cohort, annual denominator or review-table read. It reports five category counts, verified not-rated counts and unavailable counts separately. Future releases and other review periods remain unavailable. It withholds all counts for a small selected population or a positive category below 10. **This single-query suppression is insufficient for public release:** the existing top-filter combinations can permit cross-query differencing. This query is not an installed function or app endpoint.

The UI consumes an optional aggregate on the existing dashboard response, bound to the current country/org/level selection. It replaces the standalone synthetic Career Mobility box and duplicate controls with an inline Performance ratings field. Existing movement-event charts retain their explicit company-wide scope. No endpoint currently emits the new aggregate: production values remain unavailable. Draft response fixtures exercise future display only; they are tests, not a new shipped workforce dataset. The consumer rejects stale filters, unexpected fields, inconsistent totals, a mismatch with the dashboard headcount, and small-cell values; filter changes and loading clear previous values. This client validation does not substitute for server privacy/release approval.

The retired synthetic career artifact/generator/component and its independent unit tests are retained in the repository for provenance and rollback; the page no longer imports or mounts it. It is not used to populate workforce ratings.

## Exact outstanding approval / source work

1. Empty field DDL only: approve the reviewed five-column addition and CHECK if this draft is to be applied. No data copying or grants are part of that migration.
2. Before population, approve an explicit transfer of the protected review fields into the existing app-readable snapshots, with exact employee-period alignment and a verified availability/source contract. Proposed first period is **2026 YTD / snapshot 2026-09-30**, not an Annual result. If transferring protected data is not authorized, leave the fields empty.
3. Before public aggregate release, approve a finite set of existing top-filter query signatures jointly reviewed against differencing, the exact output contract and server access path. No new RLS, grants, SECURITY DEFINER function or public source access is proposed for automatic installation. Existing `dashboard_overview_filtered` remains untouched until that review.

These are factual access/source blockers, not permission requirements invented by a skill. The schema-field request is being prepared; it does not implicitly authorize copying protected values into an app-readable table or publishing new sensitive aggregates. No remote migration should be applied from this draft as a shortcut around those boundaries.

## Validation

See `tests/manual/workforce-performance-sql.mjs` (run with `PGLITE_MODULE` pointing to pinned `@electric-sql/pglite@0.3.14` installed outside this repository), `tests/workforce-performance.test.mjs`, and `tests/browser/workforce-performance.mjs`. Tests cover nullable migration preservation, strict field constraints, unchanged privileges/RLS, scalar filter intersections, exact count reconciliation, missing and delayed releases, review-period mismatch, guarded rollback, stale scope rejection, missing/suppressed/malformed responses, no duplicate controls and responsive rendering. Browser fixtures block all external network activity. The built-page suite `tests/browser/workforce-performance-page.mjs` replaces the old standalone-demo browser suite. Final build/lint/TypeScript and full unit results are recorded in the PR.

Documentation checked: Supabase Column Level Security through MCP search_docs, https://supabase.com/docs/guides/database/postgres/column-level-security. The requested changelog.md fetch was unavailable (markdown handling failure and HTTP403); no current API/CLI behavior was assumed from it.

Final local validation: 1,403 unit tests; 14 local PostgreSQL assertions; 44 component browser assertions; 56 built-page browser assertions across desktop, compact, 320px phone and 200% equivalent reflow in two palettes. Lint, TypeScript and production webpack build pass. Desktop populated and phone unavailable captures inspected. All browser API responses are fixtures, with model and external requests blocked. Remote ratings availability and protected-source release are not validated by these fixture tests.
