# Compensation: aggregate cost context

This slice supplies a self-contained `CompensationPage` and `GET /api/compensation`, using only existing synthetic business-unit labor-cost fields from `finance_current_summary`. It does not implement salary analysis. The shared shell mount is intentionally left to the Home/header worker, who owns `app/page.tsx`, navigation and section chat.

## Verified source contract

Read-only inspection on 2026-10-05 confirmed the existing view and eight business-unit rows. No tables, views, policies, grants or credentials were changed. No person-level rows were queried.

- The view has an explicit `employee_snapshots.snapshot_date = '2026-09-30'` predicate. This supports the fixed snapshot label; it does not establish freshness. If the view predicate changes, review and update this contract and its tests together.
- The cohort is snapshot rows grouped by business unit. The predicate does not establish active-employment eligibility. The endpoint reads only `org_code`, `org_name`, `org_type`, `headcount`, `fte`, `labor_cost_usd`, all already selected by Finance.
- The source sums `total_labor_cost_usd`. Source values are already in USD. Original currencies, FX dates, cost period and refresh timestamp are not in the view. The page performs no FX conversion or annualization and avoids salary terminology for these costs.
- The view uses SQL `sum`, so it can omit employee-level nulls. Employee-level known/missing cost counts are not supplied. Even non-null business-unit values are reported aggregates, not verified complete payroll totals.
- Observed validation totals were 10,000 snapshot rows, 9,961.2 FTE and USD 2,047,306,374.48 reported cost across eight business units. These values are evidence for the inspection, not hardcoded application fallbacks.

The public contract preserves absent/invalid aggregate fields as null. If any unit is missing a measure, its company total remains null. An empty source has unavailable totals, not zero. A genuine zero remains zero; a zero or missing FTE denominator has no cost/FTE ratio. Company cost/FTE uses total cost divided by total FTE. Shares require a complete positive cost total. Duplicate unit codes or non-business-unit levels fail closed to avoid double counting. The route verifies exact row count before reporting company totals, returns `no-store`, and sanitizes source errors.

Salary distributions, base-pay medians, pay bands, compa ratios, bonus/equity, pay equity, market-pay benchmarks and forecasts remain unavailable. Source salary semantics and a separately approved aggregate/access contract would be needed for any later salary slice. No new access or person-level decisions are implied by this view.

## Main worker integration

Apply these small changes in the main worker's shared-file branch after taking this commit:

1. Import `CompensationPage` from `@/components/pages/compensation-page` into `app/page.tsx`. Replace only the `activePage === "compensation"` placeholder section with `<CompensationPage />`. It owns fetch, cancellation, loading, missing/empty/error states and retry. No shared state or Finance API changes are necessary.
2. Set the Compensation description in `lib/app-navigation.ts` to `Reported synthetic labor-cost aggregates, with source limits. Salary analysis is unavailable.`
3. Set Compensation help in `lib/page-help.ts` to `Compare reported synthetic labor costs across business units. Read the snapshot, USD units and source limits before using the figures. Salary analysis and an AI briefing are unavailable.`
4. Preserve Compensation's existing read-only chat gate and lack of contextual prompts/CSV export. Replace the old goal-takeaway unavailability text with `Reported labor-cost context is available on this page. Salary analysis and a goal-specific AI briefing are unavailable.` No Compensation data is sent to a model in this slice. Review any read-only panel copy that still calls the entire page TBD.
5. Smoke-test navigation into Compensation and back, including an already selected workforce filter and goal. Confirm the company's explicit independent scope is visible and opening this page makes no model request.

No shared shell, Home, header, navigation, goal-context, forecasting or Finance files are changed in this branch. eNPS remains disabled. `database/exit_enps_simulated_v1.proposed.sql` and `docs/exit-enps-local-contract.md` are absent from this clean checkout and have not been recreated, staged or edited; any held copies in the main worker's checkout remain theirs.

## Validation

- `node --test tests/compensation.test.mjs`: 7 passing, including actual GET execution with an isolated server-client stub.
- `node --test --test-reporter=tap tests/*.test.mjs`: 886 passing, 0 failures, 0 skipped.
- `npm run lint`: passing, plus focused lint of new implementation.
- `./node_modules/.bin/tsc --noEmit --incremental false`: passing.
- `npm run build -- --webpack`: passing with dummy build-only configuration and the repository's existing local font mock; no live AI/data calls.
- `PLAYWRIGHT_MODULE=/opt/codex/runtimes/cua/lib/node_modules/playwright/index.mjs node tests/browser/compensation.mjs`: 22 passing at 1366px and 390px, using the actual component and built CSS. Checks loading, snapshot/source/scope labels, weighted arithmetic, partial/empty source, sanitized errors, retry, keyboard scrolling and viewport containment. All HTTP is intercepted; no model calls or runtime errors. `COMPENSATION_QA_OUTPUT` optionally selects an evidence directory.

Validation is for the isolated component/endpoint and base shell. The parent owns the final shared-shell integration, combined release checks, merge and deployment.

Relevant implementation references: installed Next.js 16.3.6 `route.md` and `use-client.md` guides, [Supabase select](https://supabase.com/docs/reference/javascript/select), and the [Supabase changelog](https://supabase.com/changelog?tags=javascript). The Markdown changelog URL could not be fetched, so the official HTML changelog was reviewed instead; no relevant select API change was identified.
