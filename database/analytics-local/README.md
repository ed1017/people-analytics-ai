# Local public analytics schema reconstruction

This package reconstructs **83 empty public tables, 58 views and one dashboard function** from the October 22 schema catalog. It is a local verification artifact, not a production migration, data restore, API activation or full-app bootstrap. No employee records, source rows, secrets or production ledger are included.

`schema.sql` is the canonical reviewed SQL; `schema.sha256` pins its exact checked-in bytes. `contract.json` contains column types, constraint/index counts and view names for verification, not data. All tables retain RLS. Untrusted API roles receive no table or function privileges; their CREATE privilege on public is revoked. The restricted succession view owner retains only its reviewed column grants and six SELECT policies. Observed legacy broad API grants are deliberately **not** replayed. This is a safer isolated test contract, not an exact ACL clone of production.

## Run only in a disposable cluster

Use the pinned PostgreSQL 17.11 runtime and temporary-directory process described in [accounting reconstruction](../../docs/fresh-company-bootstrap.md#local-replay). No system service or production connection is needed. Bind only to `127.0.0.1:55439`. Create a new database named `pa_analytics_fixture` and these invented local roles before installation:

```sql
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE ROLE succession_aggregate_owner NOINHERIT;
```

Do not run role creation against an existing application cluster. As the trusted local postgres owner, run:

```powershell
& "$pgBin/psql.exe" -X -h 127.0.0.1 -p 55439 -U postgres -d pa_analytics_fixture -v ON_ERROR_STOP=1 -f database/analytics-local/schema.sql
node database/analytics-local/rehearse.cjs "$pgBin/psql.exe"
```

The SQL checks the exact database name and loopback address with null-safe comparisons, rejects existing public relations/functions/types, and checks the restricted owner prerequisites. Installation is transactional. The rehearsal strips inherited PG connection settings, checks column identity and constraint/index counts, executes every view against empty tables, checks RLS and denied API access, and exercises collision/rollback guards. Some guard tests temporarily drop the schema **inside rolled-back local transactions**; never point this harness at valuable data. Stop the temporary process and remove its verified directory after retaining the result summary.

## Explicit exclusions and next work

- `workforce_performance_release_v1` and Future-of-Work (`fow`) objects are installed separately by the optional [domain recovery fixture](../domain-recovery-local/README.md), preserving this package's empty public-schema test contract.
- Accounting, the operational preview-claims table and platform-managed schemas are excluded from this package.
- Empty view execution proves dependency validity, not numeric correctness with loaded data. Synthetic fixture loading, independently reconciled domain results and full app/API acceptance remain required.
- No backend activation grants or new-company data ingestion are included. Any later hosted setup requires a separately reviewed least-privilege contract; never copy legacy broad grants just to make a query work.

Production app, access controls and spending history are unchanged by this package.

Verification on October 22: the exact artifact passed 13 PostgreSQL 17.11 checks, including all 58 empty-view executions, denied API access and the reviewed collision/null-address/restricted-owner guards. This does not prove constraint definitions or numeric results from populated source data.
