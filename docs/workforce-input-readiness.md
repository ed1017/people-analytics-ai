# Local workforce input readiness

Implemented as the priority-1 slice after `b93e42f0e6611de136df5d38fdc1ef2fbfdd3416`. Published checkpoint `aae644b2340dd14cd22c813272ec3cb90d191f21` is preserved. This local change is for review before any next roadmap slice.

The current workforce input editor now shows a summary before its expandable form:

- **Corrections before calculation:** missing required fields, malformed entered values, count/backfill relationships and invalid months/dates. Optional values become corrections only when their entered format/value is invalid; blank optional values remain unknown.
- **Unknown assumptions:** active-path cost/timing gaps and missing constraint limits. Explicit zero is kept distinct from blank; inactive Build/Move/backfill paths do not invent missing costs. Hiring-only cost/timing gaps are labeled separately when Buy is inactive in the user's mix.
- **Evidence and capacity:** historical arrival requires comparable role evidence at explicit calculation. Candidate pools, courses and entered counts do not establish assignable capacity or readiness.

Each actionable item has a keyboard-accessible Review button. It opens the existing editor and focuses the exact existing input/select without changing its value or saving. Invalid controls expose `aria-invalid` and link to the corresponding error description. All fields remain in the existing editor; no duplicate form or new persistence field was added.

The summary labels saved inputs versus an unsaved draft, current plan version, selected calculation version and historical/different evidence. Changed goal wording still requires explicit review/save rebinding. Edits continue to block recalculation until saved; old evidence/approvals are preserved. Unrelated store updates do not erase edits. During an existing pending request, editor/focus/save controls are disabled.

## Shared contract and limits

`workforcePlanInputIssues` in `lib/workforce-increment.ts` now collects structured field issues using the existing numeric/date rules. `validateWorkforcePlanInput` throws its first issue and retains its public signature. The calculator and summary share active-arrival horizon checks through `workforceArrivalIssues`; arithmetic, method version, return schemas and saved-record formats are unchanged.

`lib/workforce-input-readiness.ts` adds only conditional guidance over these issues. It does not calculate a scenario, fetch evidence, call a model, infer defaults or write storage. The summary explicitly says that no input corrections is **not** a completed calculation or passed constraint check. Historical date resolution, fresh evidence, arithmetic precision and actual constraint outcomes still require explicit calculation. It does not reuse historical evidence to bless an edited draft.

No changes to APIs, external transmission, source data, settings, authentication, dependencies, schemas, held eNPS files or the disabled eNPS gate. No autofill, autosave or approval action. Priorities 2/3 and live AI/ML remain separate.

## Validation

- 415 full unit tests pass, including eight readiness tests. Missing/invalid/optional/zero/inactive-path cases, historical evidence checks, field targeting, arrival horizons and correction removal are covered.
- 42 new mocked browser assertions pass at 1366px and 390px (Pixel 7 emulation on Linux Chromium). Checks include keyboard focus, error descriptions, mobile containment, no auto writes/API calls, dirty/saved states, selected historical evidence, changed goals and unrelated-state preservation.
- Existing browser regressions: 62 local search, 50 handoff, 98 built Next workspace, 11 selection and 24 lifecycle checks pass. Total: 287 browser assertions, all synthetic/intercepted. No real Windows/Android or live-model claim.
- Full lint: zero errors/warnings. Standalone TypeScript, genuine production build and `git diff --check` pass.
- A local characterization comparison against `b93e42f` covered 459 field/value variants: validation acceptance and complete deterministic calculator outputs remained identical. This specifically checks the shared-validator refactor rather than introducing new arithmetic behavior.

Logs: `/tmp/readiness-{focused,unit,lint,ts,build,browser,search-browser,handoff-browser,workspace,selection,lifecycle}.log`. New screenshots: `/tmp/workforce-readiness-iLnaHE/`. No file-navigation policy was retried or changed; browser testing used the existing permitted mocked HTTP-origin mechanism.

## Exact-diff review after `a14f8d0`

Reviewed all ten files against `b93e42f` for focus/accessibility, validation, unknown-versus-zero wording, stale context and side effects. Found and fixed one mismatch: an all-internal mix could label the historical recruiting launch as optional unknown, or omit an out-of-horizon explicit arrival error, although the required hiring-only comparison rejects those inputs. Guidance now runs the same input/arrival validators on that comparison's existing projection and labels its corrections explicitly. No calculator/API/storage changes were needed.

Added unit and desktop/mobile regressions for both cases, plus keyboard Tab departure from a focused field (no trap). Final review checks: 416 full unit tests, 48 readiness browser assertions, full lint, standalone TypeScript and genuine production build pass. Earlier 245 workflow regressions remain the preceding integrated evidence; they were not relabeled as newly rerun in this review. Logs: `/tmp/readiness-review-{unit,lint,ts,build,browser}.log`. Publication, if authorized, is a source checkpoint on `cloud-input-readiness`, not a production release.
