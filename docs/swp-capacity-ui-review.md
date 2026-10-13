# Compact Planning workspace — local review

Base: `d7905ca122d01344c6e87187429e5e4c349c459b` (reviewed monthly engine). The engine itself is unchanged.

## User flow

Planning has one main entry. Overview and Scenarios share a capacity form. Design, Response and Execution remain available in Advanced tools; the existing canonical routes and legacy URL normalization remain supported. Stored plans and earlier scenario tools remain mounted in a disclosure, including existing saved scenarios. The previous Scenario link opens that disclosure. No working tool or data was deleted.

One named homogeneous workload (include its work unit in the name), explicit opening month-end, and 1–6 months. Only the horizon starts at 3; all numerical staffing/workload assumptions start blank. Recurring hire/departure counts, allocation, productivity and optional FTE/person assumptions are in one secondary disclosure. An unchecked optional choice explicitly assumes one FTE for every hire and departure. A separate confirmation asserts recurring values, no transfers, and start-of-month outflows before full-month inflows. No full-time or zero-movement values are silently supplied.

Calculate calls the sole reviewed monthly engine locally. Blank values remain unknown, including zero people with unknown FTE/person. Invalid inputs show an error instead of a result. Every value change and confirmation withdrawal clears the prior result; opening/closing disclosures does not. No automatic AI, calculation or save. The monthly comparison shows available FTE, required FTE, signed gap, plus distinct people/contracted FTE. Mobile renders each month as a compact card; desktop uses a table.

Draft and result live in the existing Planning session provider, keyed by dataset token and goal workspace key. They survive page unmounts, Advanced tools, and Back navigation in the current browser session. Reload or dataset cutover clears them. This is not persistent storage. Existing saved scenarios remain untouched.

## Stable integration seam for the parallel save/compare work

`lib/swp-capacity-draft.ts` exports:

```ts
type CapacityDraft = {
 scope: string; openingDate: string; months: string;
 people: string; fte: string; volume: string; effort: string; hours: string;
 hires: string; exits: string; hireFte: string; exitFte: string;
 allocation: string; productivity: string;
 fullTimeMovements: boolean; confirmed: boolean;
};
capacitySpec(draft: CapacityDraft): MonthlyWorkloadSpec;
```

Numbers stay strings in the draft to distinguish blank from zero. Allocation/productivity inputs are percentages and the adapter explicitly converts them to fractions. Movement ratios are FTE/person. `scope` is trimmed and used as scope ID, label and named work unit; examples include “Service desk — tickets”. The adapter repeats monthly inputs; it performs no capacity arithmetic.

`components/workforce-planning/planning-session-context.tsx` exports:

```ts
type CapacitySession = {
 draft: CapacityDraft;
 result: ReturnType<typeof calculateMonthlyWorkload> | null;
 error: string;
};
```

`usePlanningSession()` exposes `capacitySession` and `setCapacitySession`. `components/workforce-planning/capacity-workspace.tsx` owns editing, explicit calculation and display. A successful result includes the exact cloned `MonthlyWorkloadSpec` at `result.assumptions`, engine version, partial/calculated status and points. Persistence should use the reviewed input/result/version seam, validate freshness and goal/dataset scope, and remain a separate explicit action. No compatibility helper or save/compare code from the parallel worker is integrated yet. Legacy `ScenarioModelResponse` is not reused for this result.

## Verification and limits

- 66 focused/compatibility tests: adapter, reviewed engine, demand/provenance, headcount and Planning destinations.
- 11 URL/chat-navigation tests; canonical labels kept aligned.
- Local production-build app browser fixture flow at 1366, 390 and 320 px: confirmation, blank/zero/invalid inputs, edits clear results, keyboard disclosure/submit, independent capacity equations, page unmount/Back recovery, earlier scenario and Design/Response/Execution routes, no page overflow.
- Existing goal-linked legacy browser flow at 1366 and 390 px: stored draft/results/comparison and additional evidence state preserved.
- Synthetic intercepted API data only. All mutating API and external requests blocked. Final local production-build runs had no page exceptions, mutating API attempts or external requests. An earlier dev-server run attempted the existing Vercel analytics script, which was blocked. Screenshots reviewed for desktop and mobile.
- Full lint (zero errors; two pre-existing unused-variable warnings in tests/browser/conditional-hiring-plan.mjs), TypeScript and production build logs packaged with the review artifact. Local webpack is used because the environment's external node_modules symlink is unsupported by Turbopack; no configuration was changed.

Not included: persistent monthly saved scenarios, cross-scenario comparison, cost estimates, general ledger/transfer editing, varying inputs by month, AI exposure, skills matching, action plans or exports. The comparison here is supply versus required capacity within a scenario. No real database/model evidence, production browser test, or live model validation is claimed. No deployment or publication.


## Combined UI review amendment

Base UI commit: `66b85e450846e6f74203df1069c970517f540937`.

- Allocation and productivity percentages accept at most four decimal places, mapping to six fraction decimals in the unchanged engine. Scaled-integer conversion removes binary division noise for inputs such as 33.3% and 66.6%. Excess precision is rejected rather than silently rounded; blanks remain unknown. The form describes the limit.
- The planning-source load error is outside the stored-tools disclosure, with alert semantics, so it remains visible on failed initial Design/Response/Execution deep links and with stored tools collapsed. A compact advanced-view note retains the distinction between calculation scope and dashboard Country/Business Unit/Level filters.
- The accessible name is now “Open Stored scenario tools”, including the visible button wording.
- The real-app flow adds fractional percentages, Back/Forward and reload clearing. Six failed-load deep-link cases cover three advanced routes at desktop/mobile widths and verify the visible scope note, error and return to the manual calculator.
- A separate real-component fixture exercises the actual PlanningSessionProvider, capacity form and DatasetBoundary: draft/result isolation across goals, restoration when returning to a goal, and deliberate clearing on dataset remount. This is a fixture of the boundary, not a live dataset cutover. No cross-dataset draft restoration is claimed.

The reviewed engine is byte-for-byte unchanged. Save/compare remains unintegrated. Tests, screenshots, lint/type/build logs and exact delta accompany the amendment; no publication or external data/model validation.

Final amendment validation: 79 combined unit/compatibility/navigation tests passed (including 25 adapter/engine tests), full lint passed with the same two pre-existing warnings, TypeScript and production build passed. Production-build browser runs passed for the capacity flow at 1366/390/320 px, failed-load routes at 1366/390 px (six cases), and legacy goal-linked state at 1366/390 px. The goal/dataset real-component session fixture also passed. Browser source requests were intercepted; final app runs had no page exceptions or mutating API attempts. Screenshots include fractional-percentage results and visible mobile load errors/scope notes.
