# Retain what-if v1 — local calculator checkpoint

Isolated from PR104, based on production `4023563005261af2c4aa74208bf022945960f2e5`. No UI, endpoint, database, model-envelope or added-capacity changes. No network or live AI calls. This checkpoint is local-only pending review.

`lib/retention-what-if.ts` calculates one user-assumed program viewed as no intervention, program with no effect, and an assumed relative-reduction range. These are not ranked interventions or predicted effects. All initial fields are blank. Historical turnover rates, survey associations and headcount are not calculator inputs.

Scope is a user-described aggregate population and a 1–24 month horizon. Baseline expected voluntary exits are user-entered. The effect lag is a whole-month assumption; direct active-period expected exits or explicitly chosen uniform allocation are required for a partial-horizon effect. Zero lag uses the full baseline; lag at/beyond the horizon produces zero active-period exits. Expected counts may be fractional. Missing effect/baseline assumptions preserve unknown outcomes.

Program cost is setup plus participant count × one-time per-participant cost plus monthly program cost × explicitly funded months. Funding duration is separate from effect lag. Costs persist in the no-effect case; blank and zero are distinct. Savings/ROI, causal effects, person-level outcomes and worsening-effect scenarios are not modeled.

`lib/retention-what-if-record.ts` defines a separate `retentionWhatIfV1` browser field, capped at ten reviews/64 KiB. Explicit retention verifies the current goal and draft. Reading recomputes results and rejects mismatched metadata, unsupported fields, duplicate review identities and altered math without repairing the original record. No global storage schema is changed.

Validation at checkpoint: 19 tests in `tests/retention-what-if.test.mjs`, whole-repository `npx tsc --noEmit`, and focused ESLint pass. Tests cover arithmetic, fractional counts, lag, uniform opt-in, unknown versus zero, cost independence, stale saves, history limits, corruption, and round-trip isolation from existing capacity/other-goal data.

Next proposed UI should remain a small explicit local review: scope/baseline; effect/timing; optional cost disclosure; concise results with math details; explicit save. Browser UI, stale-transition and responsive tests remain pending because no UI has been added.

## Progressive UI follow-up

The original calculator/storage checkpoint is preserved as `bb084736bef1af7e91a05e04bf5bb091343c9750`. UI development was checkpointed separately, then production merge `462fd7e0fb6b7fb3e245ef48b7e9fcd31d9f2a1d` (PR104) was merged into this branch without resetting either checkpoint.

Home → Compare workforce options → “No — retain current employees only” offers **Confirm goal and open Retention what-if**. Confirmation saves the exact reviewed goal and keeps the chat draft. It does not create a capacity plan, calculate, or request AI. Replacement-only goals remain unsupported. The retention UI uses four groups: scope/baseline, effect/timing, optional costs, then review. Population and horizon are entered explicitly; page filters do not provide or alter these assumptions. Quantitative inputs remain blank initially, with no benchmark effect defaults.

**Calculate retention what-if** runs the existing local calculator. **Save retention review** is separate and appends a validated review to the goal-owned `retentionWhatIfV1` field. No global browser storage schema or capacity payload changes are made. The UI displays cost, timing, conditional fewer expected exits, and the no-intervention/no-effect/effect-range comparisons for one program. Details preserve the arithmetic and limitations. Unknown inputs remain unknown; fractional expected exits are not identified people. No causal effects, ROI, savings, worsening-effect scenario, or operational capacity are inferred.

Cancel closes the editor without saving and keeps the draft while the goal view remains mounted. Reopening through Home also keeps that draft. Reload restores the last explicitly saved inputs and drops unsaved edits, as stated in the UI. Goal changes invalidate calculations; a batched away-and-back transition latches the stale state. Changed assumptions remove the Save action until recalculated. Concurrent saved-review changes are checked again at save time. Corrupt records are retained and editing is blocked.

Validation: 521 unit tests (including the original 19 retention tests), full ESLint, standalone TypeScript, and production build. The isolated retention UI and built Home flow are tested with synthetic inputs at 1366×900, 390×900, and 683×450 at DPR 2 (200% equivalent reflow). Tests cover progressive entry, missing assumptions, explicit zero effect, lag outside the horizon, costs with no effect, calculate/save boundaries, cancel, reload, changed inputs, stale/edited goals, corruption, focus, and no horizontal overflow. Built Home tests also verify exact goal/chat-draft preservation, no capacity record, no retention API, and exclusion of saved quantitative retention assumptions from a later explicitly sent chat payload. All API responses are intercepted; no live model requests are made. Browser assertion totals and exact run evidence are recorded in the draft PR.

The entire flow is usable by scrolling; long assumption reviews and results are not promised to fit one screen. The original environment dependency symlink was replaced by an isolated `npm ci` install after Turbopack rejected a node_modules symlink outside the worktree. No project build configuration was changed.

Final browser runs passed 949 assertions: isolated retention UI (69), built Home retention flow (39), Home capacity fixtures (84), built Home capacity (72), compact full-shell layout (59), contextual prompts (44), option composer (56), solution review (98), solution cards (128), pin-selection races (32), built pending cleanup (12), pending cleanup (38), journey (62), input readiness (48), local search (64), and goal copy (44). The final focus adjustment was rerun through both retention suites; the result heading is verified below the sticky app header, including at 200% reflow. Local screenshots: `/tmp/home-retention-gJwPPl/` (full shell) and `/tmp/retention-ui-jxNRix/` (isolated UI).

## Hosted-review copy follow-up

The Home guide now points retention-only goals to Retention what-if and states its Calculate-then-Save order. Replacement-only and unsure scope retain their existing guidance. The supported retention scope no longer displays the contradictory instruction to continue the conversation. Reopening a cancelled retention review clears the obsolete “Closed without saving” status through both the panel button and the Home scope action, while preserving unsaved inputs.

Follow-up validation: 19 retention unit tests; 285 affected browser assertions (75 isolated retention UI, 54 built Home retention, 84 Home capacity fixture, 72 built Home capacity); full lint, standalone TypeScript and production build. The final guide-order copy change was additionally rerun through the 54 built Home retention assertions. The preceding broader 521-unit/949-browser checkpoint remains documented above. No calculator, saved-record format, capacity payload or model-context changes were made in this follow-up.
