# Fresh accounting database and company ingestion boundary

The original `bootstrap.sql` and `rehearse.mjs` below remain a frozen October 21 artifact. For the updated October 22 contract, use [current accounting reconstruction](current-accounting-reconstruction.md).

This is an **accounting-only bootstrap**, not a complete new-company application installer. It reproduces the six-table accounting contract of runtime `a86acfa4ebc28015f2652685536750c300ca083a` and the seven applied migrations listed in [the current-company handoff](../releases/2026-10-21/reproduction/CURRENT-COMPANY-HANDOFF.md). The separate [public reproduction recipe](../releases/2026-10-21/reproduction/README.md) rebuilds the app using safe public historical fixtures; it does not prove database ingestion or real-company readiness.

## Artifact and scope

`database/fresh-accounting/bootstrap.sql` installs rollout, reservation, settlement group/member/debit, provider receipt, constraints, triggers, admission and settlement functions in one transaction. It refuses an existing accounting schema or public RPC. It deliberately creates **no roles, rollout row, enabled allowance, company records or historical settlement rows**. It is not a migration for production. Never apply it to the existing app or copy that app's ledger into a new database.

The current single-rollout ID, $20 schema ceiling, model policy IDs and reviewed price dates are retained for compatibility. They are not a budget grant to another company or a reusable certification for new models. Changing them, binding a company provider, provisioning a real project, or granting new production permissions requires a separately reviewed setup. This deliverable does not generalize multi-tenant accounting.

One intentional difference from the deployed admission definition fixes a fresh-state defect: `SUM(reserved_micro_usd)` becomes `COALESCE(SUM(reserved_micro_usd),0)`. An empty ledger is now consistent with zero gross reservations. Nonempty ledger comparisons are unchanged. No fake initial hold is inserted to evade the defect. This patch is confined to the new bootstrap, not applied to production.

## Local replay

Use a disposable PostgreSQL 17 cluster with no production connection and no existing application schema. The test runner has a fixed loopback host, port `55439`, database `pa_bootstrap_fixture`, and user `postgres`; it discards inherited `PG*` connection settings and refuses a database with user tables. Do not point an existing server at that name/port. No provider or HTTP requests are made.

The validated Windows runtime is PostgreSQL **17.11**, official EDB binary archive `postgresql-17.11-5-windows-x64-binaries.zip`, SHA-256 `80379b2c04d51c30225532e0ae04509899141e9957ed096fe749d7fd9df8f82f`. PostgreSQL's [Windows download page](https://www.postgresql.org/download/windows/) links the vendor ZIP distribution. Use the pinned archive in an isolated temporary directory; no system service or global installation is needed. The hash is our reproducibility pin, not a claim of a vendor-signed checksum.

After `initdb` of that empty directory, start only on `127.0.0.1:55439`, create the database, and run:

```powershell
& "$pgBin/createdb.exe" -h 127.0.0.1 -p 55439 -U postgres pa_bootstrap_fixture
node database/fresh-accounting/rehearse.mjs "$pgBin/psql.exe"
```

The harness first executes the **exact SQL artifact**, including rollback/reinstall/no-seed checks. Only afterward it substitutes a fixed clock in the two functions and reservation default inside this disposable database. This makes the reviewed historical window replayable after expiry; it does not renew certification or test current live pricing. It creates invented API roles and records locally. Never transfer its fixture clock, test enablement or records to a deployment. Stop the temporary server and delete only its verified temporary directory after retaining the result summary.

Production bootstrap prerequisites differ from local fixtures: pre-existing API roles, reviewed inheritance, `service_role` BYPASSRLS, trusted postgres owner, private schema outside exposed Data API schemas, and no untrusted role able to assume postgres or change the functions. Bootstrap rejects obvious incompatible role attributes but is not a full hosted-role audit. No role attribute is granted. RLS is enabled on all six tables. API roles receive no accounting access. Backend access is limited to existing reservation reads/inserts, rollout reads/counter increases, narrow numeric settlement reads, and two RPCs. It cannot reduce the counter, alter the cap/policy, read raw receipts, write settlements directly, or mutate audit records through its grants. A privileged database owner can change DDL; these controls are not a defense against the owner.

Supabase function execution must be explicitly revoked from PUBLIC before a backend grant; do not rely on default privileges. See [database function security](https://supabase.com/docs/guides/database/functions). This package explicitly grants required privileges and does not rely on automatic CRUD grants to new tables.

## Real-company ingestion contract (not implemented ingestion)

The existing [offline importer](company-import-handoff.md) supports only invented aggregate headcount/FTE snapshots. Before any real-company ingestion, obtain and review the following with its source owner in an authorized private boundary:

| Contract | Required evidence / rejection rule |
| --- | --- |
| Owner and permission | Named accountable owner; classification, retention and allowed destinations. No private upload or publication implied by passing a validator. |
| Grain and identity | Stable company, snapshot and nonoverlapping leaf-organization IDs; explicit crosswalk; duplicate keys and parent/child overlap rejected. No inferred joins from display labels. |
| Population and dates | Active/leave/contractor inclusion, timezone, snapshot vs flow definition, covered periods and as-of date. Distinct-person controls; no mixing unmatched scopes. |
| Units and missingness | Headcount integers; explicit FTE units; zero is a value, null/missing is not zero. Currency, annualization and cost components must be specified before cost support. |
| Turnover | Verified departure numerator, period, population and matching denominator method. Never sum monthly percentage rates for annual turnover. |
| Independent reconciliation | Source/config digests, owner-reviewed independent controls, extraction/version receipt and exceptions. A hash or totals calculated from the same rows is not independent truth. |
| Privacy | Identify personal/sensitive fields before import; aggregation and small-cell/complementary suppression policy reviewed separately. Closed-key validation is not privacy classification. |
| Capabilities | Explicit supported domains/routes/calculators; unavailable cost, attrition, recruiting or planning inputs stay unavailable. Do not fill missing domains from the 9,037 fixture or invent values. |
| Corrections | Versioned snapshots, prior receipt retention, explicit replacement approval and stale-source review. No silent overwrite or mixing old/new company identities. |

Acceptance sequence: reviewed private mapping and controls → offline validation/reconciliation → versioned aggregate provider with pinned identity and domain coverage → isolated API/calculator tests → protected UI tests of scope/date/zero/unsupported inputs → separate publication/data-destination approval. None of these real-company stages is claimed complete by the invented importer or this accounting rehearsal. No ingestion persistence or app binding is added here.

## Coordinated pricing refresh

The archived October 21 four-window expiry was **October 22, 2026 at 09:59 UTC**, superseding the earlier cutoff. The app's 60-second timeout plus 30-second margin stops admission at **09:57:30 UTC**. The four controls are app `verifiedAt`/`validUntil` (maximum 24 hours), rollout `pricing_valid_until`, admission-function upper ceiling, and receipt-settlement dispatch upper bound. A timestamp extension alone is not price verification.

Before the cutoff, check the same official model/default-tier prices, input/output/reasoning bounds and worst-case reservations. Choose an actually verified time and at most 24-hour end. Compare current definitions, ACLs and ledger baseline; prepare one guarded update to all four controls, with existing spend, reservations, receipts, uncertain holds and permissions preserved. Keep settlement's prior lower dispatch bound for valid in-flight receipts; its ten-minute freshness and exact replay checks remain. Run focused expiry/boundary and conservation checks, stage the matching app source, then verify deployed identity and database postconditions. If any guard fails or pricing cannot be verified, admission expires closed; never reset the ledger or simply advance dates. The existing protected release/authorization path remains required. This document does not perform a refresh.
