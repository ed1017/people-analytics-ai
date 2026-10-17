# Manually reported results for saved plans

Action plans and Track offer **Record a result** for an attached numbered plan with a supported measurement contract. The first release accepts guided additional-role coverage and explicitly linked, point-in-time active-employee headcount targets. It does not infer metrics or numeric targets from free text. Rates, percentages and period totals remain unavailable until a typed definition, population, unit and period adapter exists; no percentage arithmetic is substituted for percentage-point differences.

The form shows the exact saved target, population, unit and counting definition. A report requires a whole count or explicit unknown, measurement date, aggregate source note and confirmation that the definition and population match. The recording timestamp is separate. Guided-plan entries remain clearly labeled practice reports. Notes do not verify evidence and must not contain employee personal information.

The only arithmetic is reported count minus target on the exact target date. Interim, late and unknown reports remain visible without an end-date difference. There are no completion, success, causal-impact, forecast or plan-ranking claims. Role counts are additional qualified, allocated roles relative to the starting workforce, not company headcount or training completions.

`manualPlanResultsV1` reuses `DecisionStore.commitGoalFields` and the existing current-goal/dataset write ticket. It stores immutable target snapshots and append-only entries, including explicit supersession for corrections. Exact plan inputs, evidence digest, revision and dataset are rechecked at save. Input validation happens before the transaction so a correctable form error does not mark healthy storage unsaved. Quota, another-tab changes and stale reviews fail without publishing a candidate. The existing progress ledger, flags, plan inputs, datasets and server routes are unchanged.

Storage is local to this browser and goal/dataset workspace, with limits of 100 entries, 30 target snapshots and 220 KB. A full or unreadable ledger is retained and blocks further recording; history is never automatically pruned. Earlier target snapshots remain in history. Corrections require selecting their still-attached exact plan target. Clearing browser storage removes these local records; there is no server or cross-device synchronization.

Validation:

- `node --test tests/manual-plan-results.test.mjs` covers zero, unknown, date compatibility, unsupported percentages/intervals, correction/reload, exact target versions, isolation, stale review, quota/conflicts and bounded history.
- `tests/manual/manual-plan-results.browser.mjs` runs at 1440 and 390 px, using the real guided save flow plus clearly fictional local headcount fixtures. It checks zero, unknown correction, reload, Action plans/Track, focus, no horizontal overflow, exact-date arithmetic and cross-plan isolation. All non-GET, external and BLS requests are blocked. Set `RESULTS_BASE_URL`, `RESULTS_OUTPUT_DIR`, `PLAYWRIGHT_MODULE` and `CHROME_PATH` as needed.
- No paid AI calls, dataset activation, database writes or private uploads are involved.
