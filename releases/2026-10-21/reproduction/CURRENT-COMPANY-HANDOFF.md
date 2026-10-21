# Current release and new-company handoff

This handoff tracks runtime a86acfa4ebc28015f2652685536750c300ca083a and the source manifest alongside it. The replay recipe verifies 720 files and serves 19 pinned, previously public aggregate GET responses. It does not reconstruct private data or provision a new live company.

## Three distinct contracts

1. **Public replay:** the reproduction README builds current Home and analytics components with historical public aggregate receipts. AI, database access, POST operations and non-company-wide filters fail closed. This is useful for inspection and UI reproduction, not live financial or forecasting parity.
2. **Invented company import:** `docs/company-import-handoff.md` and `tools/import-company-fixture.mjs` validate explicitly mapped invented records into the offline public-fixture format. Stable codes, denominators, units and exact percentage totals remain checked. This importer is deliberately unwired; passing it does not authorize uploading company data or replacing the 9,037-person runtime.
3. **Live company deployment:** requires separately classified aggregate inputs, provenance/receipt generation, explicit source scope and as-of dates, supported calculator contracts, backend configuration and privacy review. Neither public replay nor the offline importer supplies those steps. Keep AI disabled until those contracts and lifetime accounting are independently verified.

## Current accounting schema and applied chain

`accounting-schema.json` is a read-only catalog of current columns, not a database dump or migration. The current private schema has rollout, immutable reservation, settlement_group, settlement_member, settlement_debit and provider_usage_receipt tables. The ledger retains gross reservations; verified append-only settlement adjusts effective used budget. Unknown calls retain their holds. No production records are included.

The actual applied accounting migrations, read from migration history on October 21, are:

| Version | Applied migration |
|---|---|
| 20261020072031 | public_ai_lifetime_budget |
| 20261020150705 | raise_public_ai_cumulative_cap_to_twenty_preserve_reservations |
| 20261020193119 | public_ai_multiprice_guarded_48 |
| 20261020202346 | public_ai_verified_group_settlement_50 |
| 20261021020352 | align_reviewed_planner_pricing_ceiling_oct22 |
| 20261021024517 | private_verified_provider_usage_receipts |
| 20261021100552 | renew_reviewed_planner_pricing_oct22_0959 |

The rolling renewal is applied through October 22 09:59 UTC (app cutoff 09:57:30); all four windows were checked, with unchanged accounting rows and privileges. Do not replay old migration snippets against a new company: historical migrations include production baseline guards and accounting evidence that are neither a clean bootstrap nor public fixture data.

Admission uses `reserve_public_ai(text,text,text,bigint)` with a row lock, exact policy/reservation amounts, duplicate protection and cumulative conservation. Receipt settlement uses `settle_public_ai_call(text,text,text,jsonb)`: backend-only execution, exact normalized receipt schema, unique provider response identity, fixed reviewed prices, ten-minute freshness, immutable audit and no caller-supplied charge. Public/anonymous/authenticated execution is denied; the receipt table is not directly exposed to the backend role. No grants are added by this package.

App pricing, rollout expiry, admission SQL ceiling and settlement dispatch window must be coordinated. App policy lasts at most 24 hours and stops admission 90 seconds early. Retain old in-flight receipt eligibility when refreshing; never reset spend or clear uncertain holds per release.

The older repository schema/archive predates these accounting stages and cannot by itself reproduce the current live app. Full fresh-database provisioning, migration replay from empty storage and real-company ingestion remain unfinished. This handoff makes that gap explicit rather than claiming the replay recipe covers it.
