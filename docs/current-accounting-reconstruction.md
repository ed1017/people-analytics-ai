# Current accounting reconstruction — October 22, 2026

This is a **no-seed accounting installation**, not full analytics database reconstruction or real-company readiness. The live app at this checkpoint is runtime `17ecb9d9378fe3554a4eec176c982e55870abe6f`, public merge `772fd5c698c6e4dfaccfaff0504a7868971cb98a` (PR344), deployment `dpl_61kXG5GEHrqaubja2iHy6hUG6uEv`. This source-only recovery package does not redeploy it or alter its ledger.

## Use the correct artifact

- [bootstrap-current.sql](../database/fresh-accounting/bootstrap-current.sql) consolidates the six-table accounting contract, cumulative $50 schema ceiling, original and bounded-4k policies, receipt settlement, immutable history and explicit backend grants.
- [rehearse-current.mjs](../database/fresh-accounting/rehearse-current.mjs) installs that exact artifact in a dedicated empty localhost database, then uses invented records and a fixed test clock.
- [23-check result](../database/fresh-accounting/CURRENT-VERIFICATION.md) records the tested SQL hash and boundaries.
- [Applied-version manifest](../database/accounting-history/manifest.json) records the twelve observed accounting migrations and hashes for available historical SQL. The first seven exact historical scripts are not supplied in this manifest. The consolidated bootstrap does not recover original production history.

The original `bootstrap.sql`/`rehearse.mjs` remain the frozen October 21 $20/window recipe. Do not mistake that archive or a table-column receipt for a current installation.

The new bootstrap refuses an existing schema or RPC. It creates no roles, rollout row, allowance, company records or historical receipts. It is **never a migration for the existing production app**. Its $50 constraint is compatibility, not authorization to activate a new budget. It retains the reviewed empty-ledger `COALESCE(SUM(...),0)` correction without inserting a fake reservation. Existing production data and permissions were untouched by this work.

## Isolated replay

Use the pinned PostgreSQL 17.11 EDB Windows archive and disposable-cluster setup in [the original rehearsal instructions](fresh-company-bootstrap.md#local-replay). Bind only `127.0.0.1:55439`; use a new `pa_bootstrap_fixture` database with no user tables, in a dedicated cluster with no existing API roles. Then run from the repository root:

```powershell
node database/fresh-accounting/rehearse-current.mjs "$pgBin/psql.exe"
```

The runner strips inherited `PG*` connection settings and checks the database name, loopback address and empty schema. It creates invented roles only in that disposable cluster. After executing the exact artifact, it freezes test time at October 22 17:00 UTC; this is not production renewal. Stop the server and remove only the verified temporary test directory afterward. No provider, HTTP or production database connection is used.

The 23 checks cover first admission, no-seed/rollback/reinstall, schema match, RLS and permissions, immutable reservations/receipts, replay/conflict, unknown usage, settlement rollback, legacy holds, concurrent admission/settlement, correction debits, both model rates, and the bounded policy's full 1,050,000-input/4,000-output maximum. An output of 4,001 is rejected. Independent review found no blocking issue; the maximum-input test was strengthened after review.

## Current window and historical migrations

At this checkpoint the coordinated app/rollout/admission/settlement upper window is **October 23, 2026 15:00 UTC**, with app admission cutoff **14:58:30 UTC**. A fixed timestamp in this artifact is not current price verification. Use the existing coordinated refresh procedure in the original instructions: verify official rates and enforced bounds, update all four controls together, retain prior in-flight receipt eligibility, compare baseline definitions/privileges, and preserve all spend and unknown holds. Expired verification fails closed.

The three newly archived scripts preserve the guarded SQL associated with the recorded renewals and $30 cap transition. Their historical names (including `CAP30-PROPOSED.sql`) are retained for provenance. The manifest records both original artifact hashes and normalized repository-byte hashes (LF with one terminal newline); a regression checks the published bytes. These are not a claim that the migration-history API returned script bytes. The scripts require old production baseline hashes, clocks and rows. **Do not replay them sequentially on a fresh database, remove their guards, or apply them to production as setup.**

## Remaining reconstruction boundary

The repository has selected analytics SQL and public aggregate fixtures, but does not contain executable DDL, dependencies and explicit least-privilege grants for every analytics backing table/view/function. Therefore this package proves accounting-only reconstruction, not a clean full-app database bootstrap. The precise next dependency is a reviewed schema-only inventory/export of those existing analytics objects and grants, followed by dependency-ordered synthetic loading and domain reconciliation. No private records or ledger dump are needed for that design; acquiring or publishing any sensitive definitions still requires its appropriate review.

Reuse the existing [offline company importer](company-import-handoff.md), its precision fixes and company/snapshot isolation contracts. No new importer, private-company ingestion, tenancy, access expansion or paid resource is introduced here. Public fixture replay and synthetic company browser checks remain separate acceptance evidence from actual live-company ingestion.
