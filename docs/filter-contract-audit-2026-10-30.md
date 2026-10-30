# Historical ratings and survey filter contract

Read-only reconciliation after PR478. No source permissions, database definitions or published data were changed by this audit.

## Performance

The current 9,037-person release exposes five rating counts for 2026 YTD at September 30, 2026, for the company or one business unit, with all countries and levels. Company counts are 396, 1,071, 4,634, 2,409 and 527. Not-rated is uncollected, not zero. See `lib/dataset-local-api.mjs`, `lib/dataset-demo-contracts.mjs` and `lib/workforce-performance.ts` in the versioned source.

The historical source audit in `docs/build-decision-log.md` records 8,994 reviewed employees in 2024 Annual, 9,553 in 2025 Annual and 10,000 in 2026 YTD. Those are legacy-dataset inspection results, not current-company rating distributions. The preserved database schema is an empty reconstruction. It does not make those records available to the application. The legacy release RPC exposes only its fixed company/BU rows; raw historical review access is not part of the current application contract.

A historical selector needs a dataset-specific release with period and snapshot, eligible-population rule, five rating counts, rated and independently calculated not-rated counts, permitted intersections, and minimum-10 plus complementary suppression over the complete query set. Relabeling the current distribution or mixing the legacy 10,000-person source into the current company would be incorrect.

## Survey

The current public survey response was checked read-only. It contains 11 company-level quarterly waves from March 2024 through September 2026. The latest wave has 7,028 valid respondents out of 9,037 eligible and 40.4% favorability. Eight current BU rows reconcile to 7,028 respondents, with five current question dimensions. The historical SQL's June 2026 partition is not the current sealed demo release; current behavior is defined in `lib/dataset-local-api.mjs`.

Existing company waves can support a local year/wave display selector, keeping each wave's date and denominator. They cannot supply historical BU comparisons. The release has no neutral/unfavorable counts, respondent identifiers, country/level cells or historical BU/question partitions. Selecting existing BU rows for display would not constitute an employee-cohort filter or support recomputed combined cohorts.

Unfavorable filtering needs a defined answer-versus-person scoring rule, reverse-coding and missing-answer rules, three response-bin counts and denominators, wave-specific scope cells, and suppression/differencing rules for the entire supported selection set. Subtracting favorability from 100% cannot recover unfavorable share because the scale includes neutral responses.

## Decision needed

Choose a versioned synthetic historical/response-partition aggregate for the fictional current company, or supply an approved historical aggregate release with these definitions. Neither requires publishing raw employee or respondent records. No new historical or unfavorable filter was implemented from incomplete data.

## Verification

The current public performance, survey-group grounding and rendered ratings placement checks passed 23 tests. The first local attempt lacked TypeScript dependencies; rerunning with the existing installed repository dependencies passed. No provider request, source-access expansion or data mutation was made.
