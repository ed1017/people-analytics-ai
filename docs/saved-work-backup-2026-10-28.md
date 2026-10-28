# Saved-work backup and navigation - October 28, 2026

Settings now offers Backup and restore saved work. The local JSON file includes the current dataset's saved goals, exploration, conversations, notes, plan versions, manual measurements, results, corrections and goal-progress history. Action plans links directly to Track and Review plan results while preserving the selected plan.

## Restore contract and boundaries

Restore previews the date and counts, then requires explicit confirmation to replace this dataset's saved goal work. It does not merge matching IDs. Download the current work first to retain both versions. Dataset, envelope version, checksum, size, nested structure and known plan/result ledgers are validated. Plan identities and revision histories are retained. A changed workspace or other-tab conflict requires a new preview. Storage failure retains the original in-memory state and stored bytes; only a successful single storage write publishes the replacement and reloads.

This is a saved-goal-work backup, not an all-browser backup. Standalone risk/trend scenarios, separately saved workforce-planning scenarios, unsaved edits, recovery state, browser preferences and other dataset workspaces are excluded and identified in the UI. There is no cloud synchronization or enterprise persistence. Prior DecisionData version 1 is supported inside the new backup envelope; there is no previous portable backup format to migrate.

## Verified release

- PR458; runtime `7453e9cf151f3888145ac3296824d07a91dd93d4`.
- Source head `79bdea17f57221d2beacbe0882aac666d9cbf097`; merge `09fd85f76bfab72a4feac4418ebcdf78693cd083`.
- Deployment `dpl_F9CEh2oocugK6aewDvbebzd3sDcZ`; preview https://people-analytics-kgqh8hdtv-ed-56dc.vercel.app; canonical www.ed-ai.app verified against this deployment.
- Independent implementation and navigation review, 1,027 runtime tests, TypeScript, final staged build and exact-head CI `40781944810` passed. Public source manifest: 968 files, private runtime inputs excluded.
- Final staged and public desktop (1440px) and mobile (390px) each passed seven checks: actual download with correction history; malformed file rejection; dataset rejection; preview/cancel without writes; confirmed restore/reload retaining corrections and unrelated storage; Escape/focus restoration; Action plans/Track/results selection continuity. No page errors or horizontal overflow.
- Unit tests cover empty/older supported data, corrupt/version/size errors, known result relationships, ID collisions through explicit replacement, workspace conflicts, quota failure and retry. Quota failure was tested at the store layer, not injected into the public browser. Browser acceptance restored isolated synthetic test work in the same context; a separate physical-device transfer was not tested.
- No paid model calls, new credentials, accounting/access changes or real visitor record modifications.

Local evidence: `decision-backup-final-stage-v2-{1440,390}.json`, `decision-backup-public-{1440,390}.json`, associated screenshots and `decision-backup-regression.log`. Earlier browser runs stopped on ambiguous test selectors; selector corrections passed without application changes. These are retained as harness failures, not product regressions.
