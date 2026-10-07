# Frozen workforce performance rating release

The user approved this exact aggregate-only release on 2026-10-06 at 14:03:54 UTC: public numeric rating counts for the company and eight business units, with individual reviews protected, country/level breakdowns unavailable, generation unverified and September 30 availability labeled simulated. The reviewed PR158 proposal was `7d3e87fa9323a33c7b3198d3eb5898dd03b16a7e`. This evidence-only follow-up is based on `e4ca8e8941b7f9970d0a0bfb17818836b5cbc2ab` (PR164), which already includes the separately integrated ratings UI and later Home changes. It does not modify application code or execute database writes.

The earlier worker implementation, based on PR159, is preserved locally at `5f582a1` on `archive/workforce-performance-worker`. It is superseded and must not be merged over the current application. Only its release scripts, operational evidence and local PostgreSQL checks are carried into this follow-up. The stage has already been applied and the release is active: these scripts are records and controlled operational procedures, not migrations to rerun automatically.

## Scope and integrity

Project `noykvmztefmmhyuwuppv`, database `postgres`. Version `workforce-performance-2026-ytd-bu-v1`. The fixed September 30 snapshot joins the existing `2026 YTD` reviews by employee ID. Country, BU and level come from snapshot dimensions. Reverification found 10,000 unique employees and reviews, exactly one match each, no orphans, invalid ratings, wrong dates, missing dimensions or unexpected BUs. Employee source context is synthetic; rating generator and category calibration remain unverified. Category labels are excluded. Not-rated status was not collected and is null, never inferred from a missing review.

Only nine signatures exist: all country/all level, and org all or one of BU-CLIENTOPS, BU-CONS, BU-CORP, BU-DATAAI, BU-DIGITAL, BU-MGSVC, BU-SALES, BU-TECH. The eight mutually exclusive BUs exhaust the population. Every numeric category and its BU complement must contain at least 10. If any BU or reconciliation fails, all nine outputs are withheld. No live recomputation, revisions, new periods or extra intersections are permitted by this release.

| Business unit | Population | Rating 1 | Rating 2 | Rating 3 | Rating 4 | Rating 5 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| BU-CLIENTOPS | 900 | 36 | 108 | 468 | 234 | 54 |
| BU-CONS | 1,800 | 72 | 216 | 936 | 468 | 108 |
| BU-CORP | 700 | 28 | 84 | 364 | 182 | 42 |
| BU-DATAAI | 1,200 | 48 | 144 | 624 | 312 | 72 |
| BU-DIGITAL | 800 | 32 | 96 | 416 | 208 | 48 |
| BU-MGSVC | 1,600 | 64 | 192 | 832 | 416 | 96 |
| BU-SALES | 800 | 32 | 96 | 416 | 208 | 48 |
| BU-TECH | 2,200 | 88 | 264 | 1,144 | 572 | 132 |
| Company | 10,000 | 400 | 1,200 | 5,200 | 2,600 | 600 |

The reproducible source SHA-256 is `6b9ad129a9b8b24f775cd0d78895140ee8c16f2425016a9b091f3ff96cde9a60`. The exact SQL serialization is in both stage and activation scripts: ordered JSONB arrays of employee ID, BU, country, level, numeric rating and review date, newline-joined and hashed inside the database. Individual records never leave the database. This is a newly pinned fingerprint of the reverified source, not a claimed comparison with the earlier proposal's MD5, whose serialization was not recorded.

Aggregate content SHA-256 is `191ff33a4dd66c0e6484627441928a77fbb3ef883b428261964d768a65e9535c`, computed over PostgreSQL `jsonb_agg(payload ORDER BY org_code)::text`, excluding extraction and publication metadata. The application accepts only this checksum and exact version/metadata. Original availability remains null. `2026-09-30T23:59:59.999Z` is a simulated display convention, separate from actual extraction and activation timestamps; never historical prediction/backtest evidence.

## Access and request boundary

`postgres` creates and owns the private `workforce_release.performance_rating_v1` aggregate-only store with RLS enabled. It contains exactly nine JSON payloads, no individual identifiers, manager keys, comments or individual ratings. A trigger freezes content, source/checksum and extraction time and prevents deletion. Publication timestamp cannot change once set; containment only deactivates.

| Role | New schema | New aggregate table | Exact invoker RPC | Raw reviews |
| --- | --- | --- | --- | --- |
| service_role | USAGE | SELECT only | EXECUTE | No SELECT |
| anon/authenticated/PUBLIC | No grant | No grant | No grant | No new grant |
| postgres | Owner | Owner/writer | Owner | Existing administrative access |

RPC `public.workforce_performance_release_v1(text,text,text)` is SECURITY INVOKER with `search_path=pg_catalog`, static qualified SQL, no raw-source query and no dynamic SQL. Default PUBLIC EXECUTE is revoked in the creation transaction. The RPC withholds all outputs unless nine rows are active together with identical activation time and valid content digest, minimum category/complement counts and exact global reconciliation. Unsupported scalar scopes return null.

The existing `/api/dashboard` retains its original dashboard RPC and response fields, adds a separate `performance_rating` field and uses the new RPC only for exact allowed scalar filters. Duplicate/array/unknown query parameters, blank values, unsupported scopes, wrong snapshot/headcount, malformed responses, RPC errors or permission denial return unavailable with null counts. No broader fallback. Ratings never enter the Home model evidence. The current route sets Cache-Control to no-store and is force-dynamic. The superseded worker implementation additionally set CDN-specific headers and provided an environment kill switch; those changes are not in current main and are not claimed here.

The Career Mobility field uses existing top filters and clears prior counts during loading. Request IDs and abort handling prevent stale filter responses from replacing current scope. Other page data keeps its existing scope. Five numeric categories, coverage and the simulated convention are visible; no rating recommendations or inferred performance effects. The API includes extraction/publication metadata. The current UI also explicitly withholds unsupported promotion-rate and time-in-level measures.

## Execution and containment

1. `database/workforce_performance_release.stage.sql` validates source/hash/access in one repeatable-read transaction and creates nine inactive rows. Run once as postgres through Supabase migration tooling. No partial stage survives validation failure.
2. Verify grants, RLS, function scope, content and inactive RPC behavior. Run local route, SQL and browser checks. Production application remains on its accepted version during preview review.
3. `database/workforce_performance_release.activate.sql` repeats the protected source/hash/access validation and activates the complete version atomically. It refuses already activated versions. A source change between stage and activation aborts.
4. For containment, run `database/workforce_performance_release.contain.sql`: deactivate every row, revoke service_role RPC EXECUTE, aggregate SELECT and schema USAGE. Preserve frozen payloads and all source data. The current main does not implement `WORKFORCE_PERFORMANCE_RELEASE_ENABLED`; do not rely on that variable. If an application-side disable is needed, remove the new aggregate RPC call in a reviewed route change and redeploy. Verify unavailable through the deployed endpoint. Removing the UI alone is insufficient.
5. The application requests no-store responses; this is not proof that every independently configured external cache obeys it. If an external cache was independently configured, purge it as part of containment. Existing open tabs/downloaded public copies cannot be recalled; new requests stop reading the release. Re-enabling or changing the frozen release requires a fresh review, including interactions with retained older public aggregates.

No raw-review grants, individual snapshot columns/copies, source updates, model inputs, eNPS files, existing policies or credentials are changed. Supabase CLI was unavailable; source scripts are not fabricated timestamp migrations. Applied migration identifiers and timestamps must be recorded below from the provider's receipt.

## Verification and receipts

Local test fixtures are synthetic and separate from the released source. PGlite replaces only its fixture database name and source fingerprint, retaining the actual stage/activate/contain scripts and role checks. It tests inactive staging, grants, invoker/RLS, anonymous and authenticated denial, all nine signatures, unsupported scopes, immutable history, all-or-none suppression, source drift before activation, frozen behavior after source changes, containment and atomic rejection of bad joins/categories. The superseded worker route tests executed its actual GET handler with isolated RPC responses and no network or credentials. Current main independently contains `tests/manual/workforce-performance-dashboard.mjs` for the built route with a loopback fake Supabase server; this evidence-only PR does not replace that test.

Stage migration `20261006142325` (`stage_workforce_performance_2026_ytd_bu_v1`) succeeded; extraction timestamp `2026-10-06T14:23:25.171107+00:00`. Live verification confirmed nine inactive rows, expected source/content hashes, RLS, invoker/search_path, exact grants and a null service-role RPC.

After the interrupted activation call, read-only recovery on October 7 found nine active rows with publication timestamp `2026-10-06T21:20:39.349149+00:00`. No activation migration entry was present. This is an observed database state, not a claim that the interrupted tool returned a successful activation receipt. No activation retry was issued. All nine service-role RPC results match the approved counts, unsupported country/level/unknown/blank scopes return null, service_role has no aggregate writes or raw-review SELECT.

Worker implementation checks before interruption: 1,427 unit tests, 34 local PostgreSQL checks, 132 browser assertions, lint, TypeScript and production build passed. Those browser/route results belong to the worker implementation, not the newer application subsequently merged through PR164.

Supabase security advisor found no finding on the new release objects. It reported 76 existing public tables with RLS/no policies and two existing callable SECURITY DEFINER warnings on `public.rls_auto_enable()`. These unrelated objects were not modified. Remediation references: [RLS/no policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [anonymous EXECUTE](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated EXECUTE](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

Evidence-only follow-up verification on the PR164 application tree: 1,448 tests passed across all 143 recursively inventoried tracked test files; 34 local PostgreSQL checks; 11 existing built-dashboard route cases using only loopback; 30 existing Career browser assertions across desktop, mobile and 200% layout; lint, explicit TypeScript, production webpack build and diff checks passed. Runtime application files are identical to the base. October 7 live read-only verification reconfirmed the content digest, all nine authorized vectors, unsupported-scope nulls, RLS, SECURITY INVOKER/search_path and the exact unchanged source/new-aggregate grant matrix. No activation retry or additional database write was performed during recovery.
