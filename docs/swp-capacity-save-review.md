# Local monthly capacity save/compare integration

Base: released PR226 merge `c367af9eb54ba33b697f01a8cd7b687e9522d40d`.

The reviewed helper and record adapter were imported from an inline relay after Library byte transfer failed. After decoding transport HTML entities and removing one separator newline, the patch matched exactly: 29,562 bytes, SHA-256 `b7dc984c8b5789d22d8f3c94aea470dabd8fbb5ef598bf7c6208eac635089f67`. The record adapter and compatibility helpers are unchanged from that relay. The monthly calculation engine is unchanged.

## Storage and identity

The separate `planning.monthlyWorkloadScenarios` goal field contains `{version:1, scopes, entries}`. Each entry contains the reviewed `CapacityRecord` and its editable `CapacityDraft`. It does not reuse or modify legacy saved `ScenarioModelResponse` values. No backend migration or endpoint was added.

Dataset identity comes from the initialized DatasetSession and must match the live DecisionStore. Goal ID and statement come from the active saved goal, checked against the Planning workspace key. A manual workload receives an opaque browser-generated UUID when first calculated; its label is never used to infer a stable ID. Numeric edits retain that ID. Changing the workload label creates a new identity on calculation. Opening a saved scenario restores its registered scope identity; users open an existing scenario before varying the same workload. These are user-authored manual scopes, not verified database teams.

Calculation captures the normalized full input key and context binding alongside its result. Save requires a complete, confirmed, error-free current result. The reviewed adapter recalculates and compares inputs and full outputs; the separately captured input key and binding must also match. Save does not refresh a stale key.

Only an explicit Save click calls `DecisionStore.commitGoalFields`. The caller's render-time revision, current dataset/store object, active goal and statement are checked; active context is rechecked in the transaction callback. The existing API performs its optimistic revision and persisted-envelope checks before publishing. Existing localStorage cross-tab checks are retained; this does not introduce a native cross-tab compare-and-swap primitive. Quota, byte-limit and conflict failures leave the candidate unpublished and keep the displayed calculation/draft. Ordinary duplicate validation happens before the transaction so it does not unnecessarily mark the store unsaved.

Read/reopen validates the field shape, scope registry, versions, identities, input key, stored result, and editable draft. Results are recomputed with the actual calculator. Nothing is automatically reopened or saved. Current-input labels use `capacityRecordIsCurrent` plus matching scope identity; edited drafts cannot inherit a saved result's current label.

Comparison revalidates both records. Scope, opening date, contiguous month axis, versions, units and accounting conventions must match. Hires, departures, workload, allocation and productivity can differ. The compact table compares monthly signed FTE gaps and reports the count of changed assumptions.

## Presentation integration seams

`components/workforce-planning/capacity-saved-scenarios.tsx` is a standalone component with no props. It reads the existing Planning session and DecisionStore. It can be placed below the main calculation results or inside the presentation worker's results area; keep it outside the calculation form to avoid nested submission behavior.

`CapacitySession` now adds `scope: CapacityScope | null` and `capture: CapacityCapture | null`. Initial values are null. The existing CapacityWorkspace calculation handler captures scope/context/input key; edits clear `capture` and the result. Confirmation withdrawal does the same. Its only rendering insertion is `<CapacitySavedScenarios key={goalKey}/>`, plus an updated session-only footer. The original save/compare integration did not change the page layout or chart design; the compact follow-on is described below.

## Original save/compare verification (d1661ec)

- 119 combined unit/contract/compatibility/navigation/recovery tests, including 41 reviewed adapter/helper/engine tests and 8 new storage-integration tests.
- Project TypeScript and production webpack build passed.
- Full lint: zero errors, two existing unused-variable warnings in `tests/browser/conditional-hiring-plan.mjs`.
- Mocked real-component fixture at 1366/390px: explicit save, duplicate rejection, stale-edit disabled save/current labels, reopen and reload, compatible comparison, goal/dataset switching, no-goal session-only behavior, keyboard Save. Separate mocked quota and external-tab conflicts prove visible errors and unchanged draft/prior storage.
- Production-build real-app fixture at 1366/390px: styled save controls, compatible saved comparison, reload/reopen, existing calculation/navigation/invalid-input flows and no page overflow. All source APIs were intercepted; no mutating API or external requests occurred in the final run.
- Existing legacy goal-linked browser regression passed at 1366/390px. Existing capacity goal/dataset-boundary fixture also passed.

## Limits

Saves are browser-local and goal-linked, not server backups. No selected goal means session-only operation; none is silently created. Up to 20 scenarios are supported subject to existing per-goal/browser byte limits. No delete/rename/overwrite UI or migration of records after goal-statement/version changes is added. Invalid stored fields fail visibly and are not silently discarded or rewritten. Reload/dataset cutover/global workspace resets still clear unsaved session state; storage recovery remains the existing Browser storage details workflow, with no automatic retry. Opening a scenario explicitly replaces the current draft.

No paid AI, live database writes, configuration/access/secret changes, deployment or publication. The original save/compare verification did not include the compact presentation. It is not a browser-verification claim for the combined changes below.


## Combined compact integration (2026-10-13)

The compact presentation is merged with the existing capture, context binding, input invalidation and confirmation handlers unchanged. Saved controls remain outside the calculation form, below the responsive two-column worksheet. A supply/demand projection and final-month FTE summary use actual calculator points; empty, unknown, explicit-zero and discontinuous series retain their meanings. Monthly detail is a native collapsed disclosure. The footer distinguishes browser-local saved scenarios from session-only operation without a saved goal.

The complete next capacity bucket now passes `readCapacityBucket` before entering a transaction and again inside its callback. This enforces the same 384 KiB canonical-data bound used on reload, without increasing any storage limit. A ninth six-month record that would make earlier saves unreadable is rejected with a visible size-limit message; prior saved bytes and the working calculation remain intact. Ordinary preflight rejection also leaves the store in its saved state. Twenty smaller one-month records remain supported when they fit.

New tests cover the eight-record reload boundary, transaction-time candidate validation, the 20-record count limit, six chart states, saved controls outside the form, and capture/edit/confirmation behavior. Existing local browser fixtures now open Monthly detail with its keyboard path and distinguish that disclosure from Recurring assumptions. The 119 original tests were recovered by mapping every recorded test title to its source suite; they are rerun with seven boundary regressions and four presentation tests.

Combined browser verification is pending a Preview: the cloud shell's installed Chromium fails to create its local socket, including a permitted escalated retry. Historical browser receipts above do not remove this limitation. No paid AI, live database writes, configuration/access/secret changes, or publication are performed by these local checks.
