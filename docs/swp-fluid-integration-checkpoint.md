# Fluid planning integration checkpoint

This local checkpoint combines full-app reference/build source `6adf0a9d2f84edb9c27357b5e25fcd3529f16df0`, calculator PR188 `8a81f8c810750a9394f69c6126117f457432d34c`, and the preliminary PR187 response contract `502a3df7f1596914beb0c9748a73c9dfa8814b4b`. PR187's final long-conversation successor is still required before final integration verification. PR186 is separate. Nothing here authorizes publication, feature-flag changes or provider calls.

## Existing owner and intentional actions

`SwpDemandJourney` retains the sole current `DemandReview`, accepted review key and provenance history. `PlanningCalculatorDialog` receives that exact review and owns only unsaved input text. Opening or cancelling the popup changes neither the review nor its acceptance. Explicit Review calls the existing `reviewDemandEditor`, then the existing `receive` path, invalidating earlier scenario acceptance and pending comparisons. Assumption acceptance and plan save keep their separate existing controls.

The owner exposes a derived availability method through its existing control ref. It becomes true only with a current review and mounted owner. Repeated opening preserves one draft. A newer chat review closes the old draft; goal, reset, dataset, navigation, workforce-scope/filter or persona changes invalidate the owner. Every edit still checks the current review key, dataset, goal and busy state before applying. The dialog introduces no duplicated review or saved state.

Unchanged fields preserve their values and provenance exactly. Fictional/model-proposed assumptions stay assumptions; manually entered values become unverified user-supplied inputs. No input becomes a verified actual, forecast, available employee, approved budget or saved plan by opening, reviewing or discussing it. Cash ceiling remains an input, not a budget-headroom calculation. Complete staffing availability, costs/budget reconciliation and phased readiness remain unresolved operating inputs.

## Actual request path

The full-app feature uses `/api/home-solution-conversation`, rather than the ordinary `/api/chat` route modified by PR187. `solutionPlanningInstructions` supplies the shared recommendation-first guidance to that actual full-app route. It retains the original model/profile selection, strict response format, checked reference tools, limits and save boundary. A strict optional availability hint is derived from the existing UI owner; the server offers the popup only with a validated current demand review. A first proposal request cannot advertise an as-yet nonexistent review. Ordinary Home requests also carry the owner-derived boolean when applicable.

The frozen demand reference instructions/tools and fixture contents are preserved. The integrated route's complete instruction envelope is nevertheless different; acceptance of the frozen source does not certify this successor. No source manifest or frozen real-model outcome is rewritten to hide that difference.

## Checkpoint verification and limits

Local verification covers 135 focused unit/request/planning/reference/forecast checks; actual full-app POST construction with a fake provider; 68 desktop/mobile owner-flow checks; 40 desktop/mobile full-client checks using intercepted transport and the real checked reference service; and the calculator's standalone synthetic popup suite. Cases include repeated opening, cancellation/focus return, explicit review, natural chat corrections, stale review/context, busy state, untouched provenance, later deliberate acceptance/save, reload and reset. The popup fixture's out-of-band interruption now waits for React to close the modal before asserting closure.

Affected-source lint, TypeScript and the production Webpack build pass at this checkpoint. Initial build attempts exposed full `/workspace` storage and then module resolution from relocated output. Failed output was retained; build output was moved to the separate writable `/tmp` filesystem with a local dependency link. No retained data/artifacts were deleted, and no application configuration was changed for this workaround.

All replies were synthetic and local; no provider/model/token-count request, database action, credential change, remote merge or deployment occurred. Runtime feature flags remain unchanged. These checks do not prove live model recommendation quality, long-conversation continuity on the pending PR187 successor, hosted serving, real operating inputs, financial readiness, or an approved complete-context token/cost budget. Final-source build/browser/request checks and separately authorized real-model/runtime acceptance remain required after the successor is pinned.
