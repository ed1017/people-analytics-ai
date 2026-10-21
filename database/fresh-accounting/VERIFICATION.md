# Fresh accounting rehearsal — 2026-10-21

Exact `bootstrap.sql` SHA-256: `a1be0ecaf171a25c0dc962a7565bc6c842d6065841ad0d721ab213c0b88ee7c9`.

**21/21 database checks passed** on PostgreSQL 17.11 Windows x64 (msvc-19.44.35229). The exact SQL installed in a newly initialized temporary localhost cluster. All six tables' columns/types/nullability/defaults matched the published current-release schema receipt. No production database, provider call, private company data or hosted resource was involved.

Passed: transaction rollback; exact install without seed; schema receipt comparison; repeat refusal; uninitialized refusal; six-table RLS/API denial; disabled refusal; first-call empty-SUM regression; policy/amount/expiry refusal; invalid/unknown receipt hold preservation; conservative charge; replay/conflict; backend/API privilege restrictions; immutable receipts/settlements; duplicate response rollback; explicit settlement rollback; old unmatched hold retention; second-model pricing; concurrent receipt replay; concurrent cap admission; correction-debit halt.

After exact installation, function clocks and reservation timestamp default were replaced **only in the disposable database** with October 21 12:00 UTC. This tests the historical certified window deterministically, not present-day price validity. The runner and [handoff](../../docs/fresh-company-bootstrap.md) disclose this distinction. Fixture enablement and invented records never leave the local database.

The existing importer/provider suites passed **17/17**: renamed mapping, integer percent-sum precision, explicit zero, missing/null rejection, independent controls, duplicate/unknown grain, overflow, closed schemas, tampering, CLI and unsupported-route behavior. This is invented aggregate validation, not a real-company ingestion approval.

A focused independent review covered SQL, empty-ledger fix, no-seed initialization, grants, conservation, runner and contract. No blocking issue remained. No new app build or hosted UI claim is made for this SQL/docs-only increment; existing current-release public build evidence is linked from the handoff. Real-company source approval, private ingestion, provider binding and complete fresh application schema remain separate work.
