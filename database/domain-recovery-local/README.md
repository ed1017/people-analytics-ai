# Local Future-of-Work and performance recovery

This is an **isolated schema/fixture verification package**, not a production migration or API activation. It adds 17 legacy `fow` tables, 12 views, one frozen performance-release table and six functions after the [public analytics reconstruction](../analytics-local/README.md). No production rows, credentials, employee records or ledger contents are included. `schema.sha256` pins the SQL bytes.

The current Future-of-Work UI uses `lib/future-work-example.ts`, a local illustrative capacity calculator. Restoring this legacy schema does not connect or replace that UI, run AI scoring, or establish measured productivity savings. The legacy `fow.seed_builtin()` routine is deliberately excluded. Four deterministic hash/group-size helpers are retained for schema compatibility; no seed data is imported.

## Disposable localhost rehearsal

First install and test `database/analytics-local` in the dedicated temporary PostgreSQL 17.11 cluster described there. Use only `127.0.0.1:55439`, database `pa_analytics_fixture`, and its invented local roles. Then, as the local postgres owner:

```powershell
& "$pgBin/psql.exe" -X -h 127.0.0.1 -p 55439 -U postgres -d pa_analytics_fixture -v ON_ERROR_STOP=1 -f database/domain-recovery-local/schema.sql
node database/domain-recovery-local/rehearse.cjs "$pgBin/psql.exe"
```

The SQL rejects existing recovery schemas/functions and requires the public analytics prerequisite. It preserves table RLS and the performance SELECT policy but revokes all API schema/table/sequence/function privileges. A policy alone grants no access. This intentionally does not copy production ACLs. Installation is atomic; the harness strips inherited PG environment variables. Run once against a fresh fixture: it inserts invented data. Negative fixture tests use rolled-back transactions, including local TRUNCATE; never point the harness at valuable data. Stop and remove the temporary cluster after collecting results.

## What this establishes

- Schema columns and identities, 12 empty-view executions, RLS and denied API access.
- Invented task exposure: partial coverage, unknown unscored jobs, failed scoring runs excluded, replacement by later successful scores, job/function suppression, scored-only weighted denominators and exclusion of another dataset's unscored jobs from the first rollup. This is not scoring tenancy: legacy latest scores are selected globally by task ID, so cross-dataset shared-task score isolation is not claimed.
- Invented nine-row performance release: digest consistency, aggregate totals, unsupported scopes, frozen fields/deletion, deactivation, small-category suppression and invalid-total rejection.

The performance fixture retains the schema's fixed source-hash marker **only to exercise its existing constraint**. Its invented payload is not the production release, and the marker does not authenticate those invented counts. Actual source-file provenance and full payload semantics remain separate application validations.

Populated results for unrelated legacy adoption/readiness/register views remain unverified; these are not used by the current illustrative FOW UI and are outside this bounded acceptance increment. Full analytics data reconstruction and hosted activation are not implied. See the [public MVP acceptance boundary](../../docs/public-mvp-acceptance-boundary.md). No production permissions/data, provider calls or spending state are changed.
