# Recovery and Workforce ratings — October 30, 2026

## Saved risk and trend scenarios: PR474

Runtime `c07f5d4ba57b036865a8f9a38b27806860c549c8`; merge `2ccc6c8827e0ac52c8e83bef63748cea69fc7d22`; deployment `dpl_F4vPVP5KfbLSNcU3Lt3fsR8M9kD4`; exact-head CI `41108847759` passed. The isolated production build at https://people-analytics-msv2u35g4-ed-56dc.vercel.app was promoted unchanged.

Capacity-risk and workforce-trend planners now export their saved scenario and preview a compatible backup before explicit replacement. The file binds to dataset, source and scope; it cannot supply a destination storage key. Restore changes only the saved record, preserves active edits and other records, and requires Reopen to apply the restored assumptions.

Independent review, focused regressions, build/TypeScript and CI passed. Final staged and public desktop (1440px) and mobile (390px) each passed nine acceptance checks: 36 executions of nine cases. Coverage includes actual download, confirmation/cancel, restore/reopen, concurrent saved changes, simulated quota failure and explicit retry, corrupt/wrong-dataset files, cancellation during file reading, risk/trend isolation and responsive rendering. Reports recorded no page or transport errors and no provider requests. Initial harness focus, asynchronous-preview timing and source-fixture failures were corrected and retained as test evidence. Legacy valid month-number spellings remain supported.

Evidence: `standalone-backup-{final,public}-{1440,390}.json` and corresponding inspected screenshots in the retained integration-evidence directory.

## Workforce ratings: PR475

Runtime `fc181d20ad4c716b7dcdeb8ae2d8fb8f5fd6d6c6`; merge `bda92ab81fab222da76e70aafe543728a6220e4f`; deployment `dpl_6tE2Hna459BDrvQXpSh8pBpEfeFo`; exact-head CI `41110227539` passed. Isolated build: https://people-analytics-awsk2v30q-ed-56dc.vercel.app.

The Workforce composition grid now reuses the existing verified ratings chart. It supports the September 30, 2026 snapshot and 2026 YTD company or single-business-unit scope. Country and level selections show an actionable unavailable state rather than stale company counts. Career Growth retains its existing presentation. No historical years, inferred not-rated counts, employee survey filter or new data permissions were introduced.

Independent review, rendering/contract tests, isolated build/TypeScript and exact-head CI passed. Staged desktop and mobile each passed eight checks: actual company and business-unit counts, compact placement, unsupported country/level state, reset, Career Growth compatibility, reload, isolated saved-state preservation and overflow. The initial display-label assertion assumed a friendly BU label where the existing shared context emits a code; it was corrected without changing source data. Staged reports contain close-related bridge errors with no per-error timestamps, so these are not reported as zero transport errors.

Public desktop and mobile each passed the same eight checks, with zero page errors, blocked mutation/provider attempts and bridge errors before or after teardown. The source returned 9,037 company employees with rating counts 396 / 1,071 / 4,634 / 2,409 / 527; Client Operations returned 1,308 with 76 / 155 / 663 / 334 / 80. Both widths recovered exact company counts after unsupported filters were reset. Evidence: `workforce-ratings-browser-public-fc181d20-20261030/report-{1440,390}.json` and inspected screenshots. This verifies the affected ratings flow, not every Workforce filter or fresh AI interpretation.

## Remaining scope and ownership

- Existing goal backup includes saved plans, position/funding revisions, headcount/demand and monthly-capacity scenarios, and manual results/corrections within its supported dataset. PR474 uses separate controls for standalone risk/trend scenarios.
- Older separately saved workforce comparison snapshots remain an active recovery slice. Their existing hydration checks are incomplete and storage failures can leave an unsaved session copy. A bounded validated snapshot export/restore and explicit save-failure path are in development; this record does not claim them released. Restored historical snapshots must not be described as recalculated against current data.
- Unsaved drafts, recovery state, preferences, other datasets, database reconstruction and cloud synchronization are outside these backups.
- Historical-year ratings, global multiselect and unfavorable-survey employee filtering require reviewed source/aggregation contracts. Available answer-share aggregates are not an employee cohort filter.
- Role/location applicant availability and completed hiring-time evidence remain incomplete. Employment stock, vacancies, registered jobseekers and long-unfilled vacancy shares are different measures. Denied BLS, Canadian and German archive routes were not bypassed; no new data accounts or licenses were created.
- FoW/Lab methodology validation and handoff retesting are user-owned. Agents are not treating this as active implementation work. Target-line overlays remain preview-only; video and new findings pinning remain deferred.
- Public readiness was configured in the separate read-only check. This batch made no paid provider calls and does not establish fresh model-answer quality. No cap, ledger, holds, credential, permission or renewal changes were made.
