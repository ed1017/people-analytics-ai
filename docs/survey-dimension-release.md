# Survey dimension optimization release archive

Migration `optimize_survey_listening_dimension_summary` was applied successfully as version `20261011012717` on 2026-10-11. This package archives that completed change. Merging or deploying this repository must not execute these SQL files automatically. Do not reapply the migration.

The candidate aggregates numeric responses by question before joining survey/question metadata, preserving the view's 11-column contract. Post-migration verification confirmed the catalog definition, OID, owner, ACL, `security_invoker=true`, column types/collations, source-table constraints and RLS, policies, and role flags. See [the sanitized release record](survey-dimension-release-record.json).

## Live acceptance and limits

The separately authorized acceptance returned **zero unordered differences across all 11 columns** using bidirectional `EXCEPT ALL`. It evaluated the exact baseline and installed candidate once each in one SELECT snapshot under `service_role`, with read-only mode, a 10-second statement timeout, 15-second transaction timeout and 2-second lock timeout. The connector preflight verified the current metadata and retained settings; the submitted batch checked them again before evaluating the aggregates.

Server batch elapsed time was **2,320.687 ms**; tool round trip was **5,805 ms**. The server timing includes setup and metadata guards. These are combined acceptance timings, not separate baseline/candidate performance measurements. There is **no proven end-to-end speed improvement**. An earlier acceptance attempt remains unverified; the recorded new attempt was explicitly authorized with that uncertainty acknowledged.

The original synthetic validation passed 48 semantic/RLS checks and 40 connector-adaptation checks on PostgreSQL 17.6. Four fixture setup attempts stayed within the original deadline; fixture corrections did not alter the reviewed SQL. The fixture modeled transactional history bookkeeping and cannot certify the hosted service's private implementation. The synthetic benchmark reported roughly 34–41 ms lower warm server medians, but data, collation version, indexes/statistics, plan modes and concurrency differed from production.

## Archived artifacts

- `database/survey_listening_dimension_summary_preaggregate.sql` and `database/rollback_survey_listening_dimension_summary_preaggregate.sql`: reviewed replacement definitions, retained byte-for-byte. Do not execute these bare payloads.
- `database/apply_survey_listening_dimension_summary_guarded.sql` and `database/rollback_survey_listening_dimension_summary_guarded.sql`: exact reviewed connector migration bodies, retained byte-for-byte.
- `database/inspect_survey_listening_dimension_summary_contract.sql`: catalog-only inspection.
- `database/verify_survey_listening_dimension_summary_connector.sql`: exact completed live acceptance batch, retained byte-for-byte for audit. It returns only mismatch count and timing.
- `database/verify_survey_listening_dimension_summary_results.sql`: original psql acceptance reference. Its explicit transaction delimiters must not be blindly nested inside connector-owned transactions.
- `database/survey_dimension_release_contract.json`: captured metadata contract and sanitized synthetic validation summary; raw logs are excluded.
- `database/survey_dimension_package.sha256`: checksums for all archived artifacts, including this document and the release record. From the repository root, run `sha256sum -c database/survey_dimension_package.sha256`.

## Operator safeguards

The supported DDL route is the connected Supabase `apply_migration` tool with exactly `project_id`, `name`, and the full guarded SQL body as `query`. The recorded project is `noykvmztefmmhyuwuppv`. The apply name was `optimize_survey_listening_dimension_summary`; a separately authorized compensating rollback would use `rollback_survey_listening_dimension_summary_preaggregate`. Neither merging this archive nor an ambiguous diagnostic timeout authorizes rollback, another migration, or another aggregate acceptance.

The guarded artifacts use transaction-local settings and one `DO` block, without top-level `BEGIN`/`COMMIT` or manual migration-history writes. The migration executor owns the transaction and history. Guards reject lost settings, metadata drift, or an unexpected PostgreSQL version. Apply requires the exact baseline hash and produces the candidate hash; rollback requires the reverse. The guards take `ACCESS SHARE` on the view and dependencies before replacement, then verify the resulting contract. Serialize schema changes, keep all timeout bounds, and never relax a guard merely to make an operation pass.

Catalog hashes use UTF-8 `pg_get_viewdef(view_oid,true)` on PostgreSQL 17.6 with `search_path=pg_catalog,public`:

- Baseline: `e572aa161aab4246ecd1e3a26b6754ac383b23c909aed7c2dcb0e2e1ff4da954`.
- Candidate: `e3c68cdd720994413bc3d8fe4afa21be11c15e573b8cbed333e50e88db34d7db`.

These differ from source-file checksums. If a future separately authorized operation errors or delivery is uncertain, inspect history and metadata read-only before deciding what happened; never automatically resubmit. Any further aggregate acceptance needs a fresh load budget of about two aggregate evaluations plus comparison, with no concurrent validation, no retries and no `EXPLAIN ANALYZE`.

The archive was prepared on remote `main` at `85b5678d8eccb2d8ba526ece81cdc57aad7793aa`. It contains no application changes or deployment-setting changes. Publication does not reapply SQL or require a separate manual deployment.

Historical review-only comments inside the immutable candidate payload describe its status when reviewed. The completed migration status is recorded above and in the release record; preserving those comments preserves the exact applied artifact checksum.

References: [Supabase migration API](https://supabase.com/docs/reference/api/v1-apply-a-migration), [migration history API](https://supabase.com/docs/reference/api/v1-list-migration-history), and [public MCP implementation](https://github.com/supabase-community/supabase-mcp/blob/main/packages/mcp-server-supabase/src/platform/api-platform.ts). The private hosted migration transaction implementation was not inspected.
