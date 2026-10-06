# Same-workforce performance release — reviewed proposal, 2026-10-06

**Not authorized, applied, populated or publicly released.** This read-only follow-up supersedes the incomplete transfer/release section of PR158 head `18ce0cb`. It recommends an **aggregate-only new dashboard field** from the existing workforce/review join, rather than copying protected employee ratings into snapshots. It creates no second employee population and uses no new rating generator. Existing top filters remain the only controls, with the explicit limited release set below.

The original five nullable snapshot fields and rollback SQL in PR158 are still an independent empty-field proposal. They are not prerequisites for this recommended derived field. No schema, grants, RLS, service credentials, app API, source data or model inputs changed during this follow-up. Current application behavior still shows ratings unavailable. Its current snapshot-column display contract would need to be adapted to the approved derived-source contract before release; the draft UI is not evidence that data release is complete.

## Target and verified mapping

Read-only MCP project discovery identified **Ed's People Analytics Database**, project `noykvmztefmmhyuwuppv`, database `postgres`, region us-east-2. Authorized metadata query executor/session role was `postgres`. It is the existing project used for this repository's workforce inspection; no alternative project or environment is proposed.

`README.md` describes a synthetic public portfolio, and all 12,880 employee source rows identify `source_system='synthetic'`. This is **synthetic workforce/review context, not confirmed real employee data**. The exact generator, seed/load lineage and rating calibration of the loaded reviews remain unverified. Reviews have no table/column provenance comments, release-history column or noninternal trigger providing a release trail.

The intended join is `employee_snapshots.employee_id = performance_reviews.employee_id`, with **snapshot_date=2026-09-30** and **review_period='2026 YTD'**. Country, BU and level membership are taken exclusively from that snapshot, using its location/org/level keys, exactly as the current dashboard does; no current-employee-position join or new eligibility/status restriction is introduced.

The actual join was checked, beyond matching counts:

| Check | Verified result |
| --- | ---: |
| Snapshot rows / distinct employees | 10,000 / 10,000 |
| Period review rows / distinct employees | 10,000 / 10,000 |
| Matched snapshot-review rows | 10,000 |
| Snapshot employees without a period review | 0 |
| Period reviews without a snapshot employee | 0 |
| Duplicate employee-period groups across reviews | 0 |
| Missing or invalid numeric ratings in 2026 YTD | 0 |
| Missing/non-2026-09-30 review dates in that period | 0 |
| Snapshot rows with missing country/BU/level joins | 0 |

Database uniqueness exists on snapshot `(snapshot_date,employee_id)` and review `(employee_id,review_period)`. The aggregate drift checksum of employee/BU/numeric-rating join was `3566a2384bc99c6978958b7645e9ea71` (MD5 for drift detection only, not a security signature). No employee identities or individual rows were exported. Earlier period counts (2024 Annual 8,994; 2025 Annual 9,553) are historical inventory, not authorized release periods or proof of those historical joins.

## Transformations and time convention

- Keep the stored numeric value only when it is an exact integer 1–5; cast only after validation. No scaling, averaging, imputation, ranking, calibration, outcome inference or overwriting of source records.
- Exclude `rating_category`: **all five numeric ratings occur with multiple category labels**. Do not repair them by assuming a canonical mapping and do not show “meets expectations” or threshold-derived success shares.
- Proposed join remains a left join from the snapshot population. Missing review, null/invalid rating, unknown review date or incompatible period becomes **Unavailable**, not zero and not Not rated. Duplicate keys, reviews outside the approved snapshot, unexpected BU membership or an invalid review date abort the entire candidate release for investigation; never silently deduplicate, select latest, or drop unmatched employees from the denominator.
- The source has no explicit verified not-rated/eligibility status. Proposed output is `notRated:null, notRatedStatus:'not_collected'`; never label missing review rows as Not rated. Current complete valid matches imply `rated=population` and `unavailable=0` for this candidate, but do not establish a general missing-review classification rule.
- Genuine source release history is absent. **New proposed synthetic display convention:** treat this frozen 2026 YTD review set as available at `2026-09-30T23:59:59.999Z`, explicitly labeled `availabilityKind:'simulated_convention'`, `originalAvailableAt:null`. This convention is proposed on 2026-10-06; it is not an observed historical release timestamp. Record the eventual publication/extraction timestamp separately. Do not use `created_at`, backdate an audit record, populate this as “verified release” in the old snapshot-column contract, or use it in historical prediction/backtesting. It is only a descriptive portfolio display convention and requires the exact decision below.

## Exact finite release set and overlapping-filter protection

The machine-readable manifest is `docs/workforce-performance-release-contract.json`. Only **nine signatures** are proposed, all for this one snapshot and review period:

| Country | Business unit | Level |
| --- | --- | --- |
| all | all | all |
| all | BU-CLIENTOPS | all |
| all | BU-CONS | all |
| all | BU-CORP | all |
| all | BU-DATAAI | all |
| all | BU-DIGITAL | all |
| all | BU-MGSVC | all |
| all | BU-SALES | all |
| all | BU-TECH | all |

Null/`all` may normalize to the same canonical scalar; arrays, duplicates, arbitrary period/date/columns, unknown codes and multiple query parameters are not accepted. **Any country or level selection yields rating status Unavailable with all rating numbers withheld**, even though existing workforce headcount continues to follow those filters. No silent fallback to a BU/global rating distribution for a narrower selection. No automatic expansion to every combination or period.

The eight BUs are a fixed, mutually exclusive, exhaustive partition of the 10,000 snapshot employees. Each BU's five numeric category counts **and each category's complement within that BU must be at least 10**. This is stronger than a positive-cell-only check: a homogeneous BU is withheld too. Read-only checks confirm all eight BUs currently pass. In contrast, only 1 of 590 country×BU×level cells passes the earlier positive-count/complement rule. That evidence rules out publishing all narrow intersections under a simple minimum-10 gate.

**Complementary suppression is global and fail-closed:** if any one BU, category/complement, membership, count reconciliation or source-mapping check fails, **withhold all nine rating outputs, including the global total**, rather than release seven BUs plus a subtractable global residual. The fixed allowlist does not automatically change after a failed check. Once approved, one frozen release supplies all nine outputs; no live recomputation or date switching.

Why the nine overlapping outputs do not reconstruct a hidden finer rating bucket from current headcount totals:

1. Eight BU distribution vectors are the only independent rating equations. The global distribution is their exact sum; it adds no new equation. There are no country, level, country×BU, BU×level or prior-period rating equations in this release.
2. Existing public workforce totals describe group membership sizes, not rating allocation. With a BU of size N and category count c, the count of that rating in a subgroup of size n can range from `max(0,c-(N-n))` to `min(n,c)`. Because c≥10 and N−c≥10, any subgroup of 1–9 employees retains the full feasible range 0…n. Fixed headcount intersections do not assign ratings to those employees.
3. The release contains no individual identities or manager keys. Metadata/source-code inspection found no public functions referring to performance ratings/reviews; the existing `talent_overview` view is not SELECT-accessible to service_role, anon or authenticated. The application has no rating-reading API path. The separate historical synthetic career demo is a different invented population and supplies no equations on this joined population.
4. This is a bounded reconstruction argument for these outputs and existing membership totals, **not differential privacy or protection against arbitrary external personal knowledge**. New rating outputs, public exports, releases with changing membership, different periods or revisions must be reviewed jointly against retained older releases before publication. Do not “refresh” this version in place.

A local mathematical test exhausts every category/complement split for BU sizes 20–100 and every subgroup size 1–9, verifies the nine-signature partition, and tests all-or-none release gating. It uses invented counts solely for tests, not a new displayed dataset.

## Exact transfer, execution and new readers — recommended route

No employee-level transfer is proposed. An authorized **postgres administrator**, using the existing administrative connection, performs the protected join and validations in a single repeatable-read transaction after approval. Only the resulting nine reviewed aggregate JSON objects are written to a new private publication store `workforce_release.performance_rating_v1`; no employee IDs, names, manager IDs, review IDs, comments or individual rows enter that store. Its version and content checksum are fixed and audited. This is a derived publication cache of the existing workforce, not a separately generated workforce dataset.

Proposed database access is explicit and limited:

- `postgres` owns the new private schema/store and is its only writer. Enable RLS on the new store. No existing table, grant, owner, policy or RLS setting changes.
- Revoke PUBLIC access to the new schema/store. Grant only schema USAGE and table SELECT on this **aggregate-only store** to existing `service_role`; no INSERT/UPDATE/DELETE. The store contains only the nine already-approved public payloads. No grant on `performance_reviews`, and no population of snapshot rating columns.
- A fixed `public.workforce_performance_release_v1(text,text,text)` function is **SECURITY INVOKER**, with a fixed safe search_path and schema-qualified static query. In the same creation transaction, revoke its default PUBLIC EXECUTE, then grant EXECUTE only to service_role. It can read only the exact active version/allowlisted row from the store; it never queries raw reviews/snapshots or accepts a caller-selected version/table. Unknown signatures return unavailable/null counts. No new privileged SECURITY DEFINER function.
- The existing server `/api/dashboard` may call this exact RPC with the same validated scalar top filters and add a new derived `performance_rating` field. Raw source grants remain unchanged. Its values stay out of AI/model context. Existing dashboard RPC stays unchanged.
- **New readers:** service_role gains these nine aggregate rows and the fixed invoker function; every app visitor may receive those approved aggregates from the server. anon/authenticated gain no direct SQL/RPC rights. Public publication of these aggregates is an explicit access expansion even though no individual ratings are copied.

Proposed response: fixed version/source (`employee_snapshots JOIN performance_reviews`), synthetic provenance label, snapshot/review period (`2026 YTD`, not Annual), normalized filters, convention metadata above, release timestamp/checksum, status, and—only for approved available signatures—population, rated, numeric counts 1–5, unavailable, `notRated:null`, `notRatedStatus:'not_collected'`. No category calibration labels, mean score, rankings, rates of meeting expectations or effectiveness. Nonavailable outputs have no numeric rating counts, totals or rates. The existing headcount response remains its own already-public contract. This response is a proposal; PR158's initial UI validator needs a subsequent local update before the release can be enabled.

## Containment and rollback, including after population

Recommended aggregate-only route: before activation, stage the store version disabled. Validate the exact frozen source and grant matrix, function permissions, shape, all nine signatures, rejected country/level scopes, stale filters, browser behavior and absence of raw source access. Activate only that validated version after exact authorization.

For containment, the postgres administrator first marks the release inactive and revokes service_role EXECUTE on the exact new RPC **and SELECT on the new aggregate store**, then disables the app call and purges applicable response/deployment caches. Removing the UI alone is insufficient. Revoke schema USAGE too if no other approved object depends on it. Preserve the aggregate store, source reviews and audit records under postgres-only access; no data deletion is required. Revert application field consumption independently. Already downloaded public aggregates cannot be made private retroactively; a revoked release stops further access, not prior copies. Re-enable only a newly reviewed release. No such revokes or schema changes have been executed.

**If instead copying individual ratings into employee_snapshots is required:** that is a different, broader approval, not included in the recommended decision. Exact writer would be postgres; newly authorized reader would be service_role for **individual** new rating/date/period/availability/status columns because it already has table-level SELECT. anon/authenticated remain without SELECT. The copy would target only the verified Sep30 snapshot/2026 YTD join and would require a schema that distinguishes the simulated availability convention from verified source availability; the initial five-field CHECK/comment contract does not suffice for claiming verified release history.

After such a copy, merely hiding the UI, revoking a new RPC, or `REVOKE SELECT(performance_rating)` does **not** contain access while service_role retains table-level SELECT. A separately reviewed containment plan would revoke service_role's table-level SELECT on snapshots and replace it with SELECT on the exact preexisting column set below, checking inherited grants and named-column versus `SELECT *` consumers. That changes existing access semantics and can break wildcard consumers; it requires explicit authorization and tests before any copy, not an emergency assumption. Keep the new rating data intact but inaccessible to that role. The initial empty-field rollback correctly refuses populated values; do not defeat that guard or delete copied fields/data as a rollback shortcut.

Preexisting snapshot columns for that alternative containment allowlist: employee_snapshot_id, snapshot_date, employee_id, position_id, manager_employee_id, org_unit_id, cost_center_id, job_profile_id, job_level_id, location_id, legal_entity_id, employment_status, employment_type, work_arrangement, fte, base_salary, target_bonus, total_compensation, total_labor_cost, currency_code, tenure_months, span_of_control, is_people_manager, created_at, base_salary_usd, total_compensation_usd, total_labor_cost_usd, compa_ratio. Reverify before execution. No grants in this paragraph are executed or part of the recommended route.

## Minimum concrete user decision

Recommended exact wording for the parent to present after reviewing this artifact:

> Approve publishing synthetic **2026 YTD performance-rating counts from the existing September 30 workforce** for the whole company and the eight listed business units only, through the aggregate-only store/server route described here, using the explicitly simulated September 30 availability convention? Country or level selections will show ratings unavailable. Individual reviews will remain protected, and no individual ratings will be copied into snapshots.

“Yes” would authorize this **specified aggregate release and its new aggregate-only service-role access**, not unrestricted filters, raw-table access, copying individual ratings, source calibration claims, new periods or automatic refresh. If the user requires ratings for every country/BU/level intersection or a physical individual snapshot field, keep release held and review that different scope. There is no vague “enable ratings” decision.

## Evidence and validation

Read-only live checks above, source README and API search, plus `docs/workforce-performance-release-contract.json` and `tests/workforce-performance-release-contract.test.mjs`. No raw individual rows were exported and no DDL/DML/grants were run. One metadata inventory query had a syntax error and was corrected; its successful read-only result found the protected talent_overview view and no rating functions.

PR158's prior implementation remains independently tested at head18ce0cb: 1,403 unit tests, 14 local PostgreSQL checks, 44 component and 56 built-page browser assertions, lint, TypeScript and production webpack build. This follow-up changes proposal/verification artifacts only. Supabase CLI download previously failed with EAI_AGAIN; .proposed.sql files remain outside automatic migration directories. The recommended aggregate-only path does not use the initial snapshot-column migration or per-query aggregate SQL.
