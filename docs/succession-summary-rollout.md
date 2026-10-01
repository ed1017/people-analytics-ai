# Succession enterprise summary rollout dependency

Status: application preparation only. Do not merge or deploy this branch until the separately pending PostgreSQL role-membership exception is explicitly approved and the real aggregate runtime is revalidated.

## Public contract

The public succession API is fixed to exactly 13 fields:

1. as_of_date
2. small_cell_threshold
3. critical_job_profiles
4. filled_critical_positions
5. positions_with_recorded_plan
6. positions_without_recorded_plan
7. recorded_plan_coverage_pct
8. plan_coverage_suppressed
9. positions_with_ready_now
10. positions_without_ready_now
11. ready_now_plan_pct
12. ready_now_suppressed
13. suppression_reason

No fingerprint, source identifier, employee/candidate/position/plan identifier, free text, profile breakdown, risk distribution, ranking, or arbitrary dimension is public.

## Runtime dependency

The route reads only `public.succession_coverage_public_summary_v1` through the existing server Supabase client.

While that approved aggregate is absent, inaccessible, drift-blocked, empty, multi-row, or contract-invalid, the route returns HTTP 503 with a generic unavailable message. There is no fixture fallback and no raw-source fallback.

The route accepts GET only, accepts no query parameters or request body, and selects only the 13 allowlisted columns.

## Interpretation

The UI and AI context are enterprise-only.

- Recorded plan coverage is a source-record coverage measure.
- Ready-now is a recorded source assessment category.
- Neither is a prediction, recommendation, promotion decision, transfer decision, suitability score, or person ranking.
- Paired k=10 suppression hides both sides of a partition whenever either side is 1–9.
- Readiness detail is suppressed whenever upstream plan coverage is suppressed.
- Suppressed values must never be reconstructed or estimated.

## Fixture tests

`npm run test:succession` runs dependency-free Node fixture tests for:

- the expected 1,885 / 240 / 1,645 / 12.7% and 31 / 209 / 12.9% enterprise semantics;
- valid zero state versus unavailable zero-row/multi-row results;
- population, plan-partition, readiness-partition, paired and upstream suppression;
- invalid types, suppression categories, nonfinite values, negative values, inconsistent counts/percentages, and extra fields;
- query parameter, filter, body, and non-GET rejection;
- confirmation that the fingerprint is not part of the public field allowlist.

These are synthetic application fixtures. They are not live-database verification.

## Before merge

After the narrow membership decision is resolved, repeat the database rollout and verify the real runtime independently:

- approved role attributes and exact membership state;
- six SELECT-only RLS policies;
- exact column grants;
- owner-rights view and fixed 13-field output;
- service_role SELECT only on the view for new succession access;
- no direct anon/authenticated/PUBLIC view read;
- no new raw succession service_role access;
- real one-row reconciliation and approved snapshot drift lock;
- route 200 only for the valid real aggregate;
- route fail-closed behavior for unavailable/drift/invalid aggregate;
- TypeScript/build, responsive desktop/mobile UI, and grounded AI context.

No merge or production deployment should occur before those checks pass.
