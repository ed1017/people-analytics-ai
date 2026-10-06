# Local ratings UI recovery — 2026-10-06

Status: local display implementation verified; production integration is blocked. Nothing was pushed, merged, deployed, activated, populated, or changed in remote SQL/access controls.

## Starting point and isolation

- Workspace started clean on branch `work`, main commit `119c3ee` (PR159).
- Separate local branch: `recovery/local-ratings-ui`.
- Exact PR158 proposal commit `7d3e87fa9323a33c7b3198d3eb5898dd03b16a7e` was fetched read-only. Selected UI wiring was recovered and adapted; no proposal SQL was applied or copied into a migration.
- Root AGENTS.md was read, including installed Next.js route and server/client documentation. No repository `.agents` directory or additional workspace skill files were present. Supabase skill was read; online documentation fetch failed, and no new Supabase feature/API was implemented.
- Original `work` branch was not moved. No eNPS/survey files were changed. No held files from the disconnected task were present in this clean workspace; those unavailable artifacts were not inspected or recovered.

## Implemented behavior

Career Growth & Internal Mobility now uses the existing dashboard filters and response to render one ratings bar chart plus two explicitly unavailable chart areas for promotion rate and median prior-level time. It does not import runtime fixtures or the separate invented career cohort. Recorded movement history remains available under a disclosure with its company-wide limits.

The page and its shared trust label say **Demo data**. Numeric scale/calibration limits, absent not-rated classification, and the simulated availability convention remain explicit. Ratings are excluded from AI context.

The local normalized display validator checks the fixed version/digest, snapshot/period, original-workforce source, simulated availability, company/eight-BU allowlist, exact requested scope, headcount reconciliation, complete numeric counts, category/complement minimum 10, and notRated=null/not_collected. Company totals must equal 10,000 with counts [400,1200,5200,2600,600]. Unsupported scopes, inactive/missing/malformed payloads and stale scopes return no values. The row validator does not independently prove the all-nine publication gate or authenticate the digest; that remains the frozen release's responsibility.

Existing abort/request-ID guards plus scope validation prevent a prior filter response replacing the current selection. No zero bars or unrelated demo values fill missing metrics.

## Database state supplied by parent — not independently rechecked

Project `noykvmztefmmhyuwuppv`; nine frozen rows in `workforce_release.performance_rating_v1`; `public.workforce_performance_release_v1(text,text,text)` is security-invoker and aggregate-only. Staged release is **inactive**. Supplied content digest: `191ff33a4dd66c0e6484627441928a77fbb3ef883b428261964d768a65e9535c`.

No database tools, source-table reads, RPC calls, grant checks or activation attempts were made in this recovery. The denied source-table read was not retried. The copied PR158 proposal/manifest retain their historical proposal status and are not a statement of current database state; this handoff supersedes that status for recovery purposes.

## Remaining blockers and exact integration boundary

1. **RPC wire contract missing.** PR158 documents the conceptual response but not the staged RPC's exact argument names, JSON nesting, inactive/error response or release timestamp metadata. `lib/workforce-performance.ts` defines a local normalized display contract, not a claim about the actual staged wire shape. The existing `/api/dashboard` remains unchanged and does not call the new RPC. Consequently this branch on its own cannot display staged ratings from the live server. Parent must provide the exact aggregate-only function definition/sample response, add and test a strict server projection into `performance_rating`, and preserve no-store/error/unsupported-scope withholding. `parsePerformanceFilters` is supplied and tested for that future boundary but is not currently wired into the unchanged route. Do not forward raw RPC JSON or fall back to source tables.
2. **Release remains inactive.** Any later activation is a separate parent-coordinated operation; this branch supplies no activation command and performs none.
3. **Promotion metrics unsupported.** Original-workforce verified eligibility, linked promotion outcomes and prior-level start/promotion dates are absent. Actual promotion-rate/time bars cannot truthfully be rendered. The two areas explain the missing evidence rather than inventing denominators or durations.
4. BU fixture values are invented test-only aggregates, not verified staged BU counts. Company fixture values are the supplied frozen totals. Tests establish display behavior, not live release readiness or data lineage.

## Verification and recovery artifacts

- Production `npm run build` passes, including four prebuild fixture-generation checks and TypeScript. Build used localhost-only Supabase URL and dummy keys.
- 40 targeted Node tests pass: release contract, validator, career growth, retained demo module, evidence scope, accessibility and decision-brief trust labels.
- Targeted ESLint and `git diff --check` pass.
- Built-page browser suite: 30 checks at desktop 1440px, mobile 375px, and narrow/zoom-layout 720px. Covers numeric rendering, single filter set, BU changes, unsupported country/level scopes, pending/stale responses, inactive withholding, no visible synthetic wording, responsive width, and zero external/model requests. Every API response was intercepted. The narrow viewport is not a claim of browser zoom emulation.
- Six screenshots (available/inactive for each viewport), logs, patch and Git bundle are copied to `/workspace/ratings-recovery-evidence/` for the parent. Available screenshots intentionally show a test-only BU fixture, not live data.

Reproduction: `node --test tests/workforce-performance*.test.mjs tests/career-growth-mobility.test.mjs tests/synthetic-career-demo.test.mjs tests/talent-evidence-scope.test.mjs tests/pre-demo-accessibility.test.mjs tests/decision-brief.test.mjs`. Build/start with dummy service settings; then run `tests/browser/workforce-performance-page.mjs` with HOME_BASE_URL pointing to that local server and PLAYWRIGHT_MODULE pointing to an installed Playwright module. Browser installation was isolated under `/tmp/ratings-browser`; package manifests/lockfile were unchanged.
