# Fluid planning integration source

This separate source combines full-app reference/build `6adf0a9d2f84edb9c27357b5e25fcd3529f16df0`, calculator PR188 `8a81f8c810750a9394f69c6126117f457432d34c`, and final PR187 continuity successor `1441dcaea8f1e33c08334a3e0168d2bde232f296`. It also simplifies the optional calculator popup. PR186 and PR189 are excluded. Runtime feature flags, frozen reference contents, and saved data remain unchanged. The route-scoped model policy successor is described below. Publication of this source is separate from permission to merge, deploy or make provider calls.

`vercel.json` disables automatic Git deployment for the exact source branch `codex/home-solution-sol-policy-20261009` only. It does not change any existing production branch setting. This follows [Vercel's branch-specific deployment control](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled) so publishing the source does not request a preview rollout. Any later branch rename or deployment requires a fresh review of that setting.

## Grounded comparative recommendations successor

This narrow successor starts from `02ddda844bcd4470a9dac9c015ed56b519ae6d68`. A coordinator-reported ordinary Home Preview response recommended a staged combination while timing and capacity were unknown, yet called cross-training “the fastest reversible way.” The report motivates this change; no full response or invented measurements are included here.

Shared scoped guidance now requires comparative claims such as fastest, cheapest or best to follow available evidence about alternatives or name the decisive condition briefly alongside the recommendation. It still leads with useful advice, without a caveat list or a predetermined hiring/training answer. In that grounded-comparison predecessor, only this shared guidance changes application behavior; ordinary chat scope, model/provider settings, calculator and explicit review/save ownership remain unchanged.

Successor validation passed 124 focused tests, affected-source lint and a production Webpack build including TypeScript and all six prebuild artifact checks. The final 31 request tests also passed after adding the initial-opener assertion. The build used local dummy Supabase values, no model key, and a network-blocking preload. Existing network-isolated actual-POST regressions check that both Home paths receive the rule, including sparse/unavailable sources and comparative follow-ups. They validate request construction, not generated recommendation quality. The earlier Preview observation and canary commit `679ba42dacfd2056ba4c0fddfd897abe49d66a5e` remain separate snapshots; neither certifies this successor. Refreshing this branch's fluid manifest creates a new review target and does not rewrite frozen reference manifests.

## Fictional staffing Apply/reload successor

This separate local successor preserves grounded-comparison source `f76ed89ba388ae088bb9f9e2f096a9db10dc96e6` and the successful earlier fixture source `02ddda844bcd4470a9dac9c015ed56b519ae6d68` as distinct ancestors. A hosted review found that Apply changed the fictional Build 3 / Move 2 / Buy 0 result from complete conditional cash $26,800 to Unknown, persisting all 12 candidates as unresolved after reload.

The reset occurs before storage in `proposalFromReport`: every changed cash line invalidated component completeness and cash distinctness, including the explicitly bounded fictional scenario whose unchanged listed cost sources were already assumed exhaustive and distinct across its mixes. New proposal version 2 retains those exact illustrative premises only for that scenario and only when all affected reviews and distinctness are explicitly illustrative and complete. Missing cash, unknown overlap, and changed entered/adopted reviews remain unresolved. Components, expenses, costs, provenance and review/save controls are not removed or promoted to verified facts.

Version 1 proposal/history replay retains the original reset rule and exact contents. A new version 2 selection appends independently instead of replacing a matching older entry. No migration or automatic repair of already-saved Unknown values occurs. The new fixture records the original failure from the predecessor; it is fictional local test data, not exported operational records.

Validation: 52 focused tests, TypeScript, scoped lint and diff checks pass with network blocked and no provider key. The regression crosses actual mix preparation, reconciliation, browser DecisionStore persistence, reload, explicit attachment confirmation and attachment history. It preserves $26,800 conditional cash, 80 staff hours, zero added employees and one feasible candidate within the stated fictional assumptions; negative tests retain genuine unknowns and legacy history. The full hosted browser check remains separate. Existing guidance-only production-build evidence is reused; it is not represented as a production build of this successor.

## Home solution route model policy successor

This separate successor starts from preserved Apply/reload repair `b550102e08456aa13584c24667ffe8c94037ef2d`. The actual `/api/home-solution-conversation` route now sends `gpt-6.1-sol`, medium reasoning and explicit `service_tier: default` for both general Home and valid SWP requests. The model/tier policy is a server-owned constant in that route, not a client field or hidden test override. SWP mode and dataset binding validation still run; a configured SWP model that conflicts with Sol is rejected before transport. An absent SWP profile no longer makes this route fall back to Luna. The shared `CHAT_MODEL` and every unrelated route remain unchanged.

No credentials or environment settings are modified. Enable the existing full-conversation feature at build time to route general Home through this endpoint; when disabled, ordinary `/api/chat` retains its existing Luna policy. Goal-progress behavior continues to follow its separate existing flag. Current valid Sol SWP profile settings may remain in place. SDK retries, call/turn deadlines, output limit, tools, instructions, dataset guards and deliberate review/save controls remain unchanged.

Validation passed 87 targeted route-policy, legacy-Home, save/reload, cost-unknown and historical-replay tests, scoped lint, and a production Webpack build including TypeScript and all six prebuild artifact checks. Build-time flags enabled full Home conversation and goal progress; dummy Supabase values and a network-blocking preload prevented remote calls. No model key, provider call, deployment or hosted acceptance occurred. The separate acceptance harness must verify the actual route's Standard tier without inserting one.

## Calculator ownership and direct editing

`SwpDemandJourney` remains the sole owner of the current `DemandReview`, acceptance key and provenance history. `PlanningCalculatorDialog` receives that review and owns only unsaved input text. An explicit request or the **Open Planning Calculator** button opens one modal directly into editable boxes, with no additional Edit step. Short labels and unit help accompany the fields; advanced role assumptions, source explanations and optional reviewed-results details start collapsed. Source labels remain visible beside inputs. Results remain conditional estimates, never verified actuals.

Repeated opening keeps the current draft. Cancel and Escape unmount it and restore the last reviewed values on reopening, preserving review, acceptance and saved plans. Explicit **Review planning inputs** calls the existing `reviewDemandEditor` and `receive` path, invalidating earlier acceptance and pending comparisons. Separate assumption acceptance and explicit plan saving retain their existing controls. Reviewing alone cannot save a plan.

A newer review closes the old draft. Goal, reset, dataset, navigation, scope/filter and persona changes invalidate the owner. Every edit checks current review key, dataset, goal and busy state. Availability is derived from that owner, not duplicated review state. Untouched inputs retain exact values and provenance; changed inputs become unverified user entries. Budget is an input only; this calculator does not establish costs, remaining budget, employee availability or phased readiness.

## Two request paths

Ordinary Home uses `/api/chat`: at most eight recent user/assistant turns plus one scoped, recognized user objective of at most 240 characters. The objective stays in memory on the existing scoped-history ref, is interpreted separately from model history, clears on topic/workflow/context changes, and is never restored from archived transcript. A successful current reply uses `completeHomePlanningTurn`. The integration retains `datasetFetch` and carries both `planningObjective` and the independently derived calculator availability boolean.

The full-app feature uses `/api/home-solution-conversation`. Its existing checked solution state retains up to 32 turns, with provenance and tool constraints. The ordinary Home eight-turn objective contract does not apply to that route; no `planningObjective` field was added to `SolutionRequest`. `solutionPlanningInstructions` supplies shared recommendation-first guidance on this actual route, using validated demand context or its retained history. The server offers the popup only with a validated current review and a strict availability hint. A first proposal cannot advertise a nonexistent review.

Frozen demand reference instructions, tools, response format and fixture bytes are preserved. The integrated route appends request-dependent guidance, so its complete instruction envelope is different. Earlier acceptance of the frozen source does not certify this successor or its recommendation quality. Both route modes need explicit coverage in any subsequent runtime acceptance.

## Verification and conflict review

Local checks cover 143 focused regression/request/planning/reference/forecast cases; 72 desktop/mobile owner assertions; 50 full-client assertions using intercepted HTTP and the checked reference service; 108 standalone popup assertions; and ordinary Home pointer/continuity and auto-send suites. The latter also cover topic clears beyond the recent window. Popup assertions include open then type without Edit, collapsed advanced details, Cancel/Escape and reopening, touch targets, keyboard focus, stale context, busy state, unchanged provenance, deliberate acceptance/save, reload and reset. Synthetic replies establish construction and state transitions, not model judgment.

Final PR187 had two conflict blocks in the ordinary Home `ask` signature/body and call. Resolution preserves both arguments, dataset-aware fetch, scoped objective capture, current-request guards and `completeHomePlanningTurn`. Parent diffs were reviewed locally and combined checks were run. Separate independent conflict review remains for the coordinator; this source does not claim it has happened.

Inherited browser fixtures required the real dataset bootstrap and explicit compile-time feature flags. Their request checks now account for the separate calculator hint without weakening the objective assertion. The production build uses local output under `/tmp` because `/workspace` filled during earlier attempts. Failed output was preserved; no retained artifacts were deleted and no application configuration changed for this workaround.

## New acceptance source pin

`tests/fixtures/swp-fluid-source-manifest.json` is separate from all frozen manifests. It pins every app/components/lib/public source file, the existing root configuration closure, all test sources and relevant integration documentation. The preserved fixture and base model-contract digests are also checked. The runtime source commit is recorded separately from later documentation/manifest commits.

Verify an externally reviewed manifest file digest with:

```sh
node --experimental-strip-types tests/manual/verify-swp-fluid-source.mjs <external-manifest-sha256>
```

The verifier uses local files only. `create-swp-fluid-source.mjs --write` explicitly regenerates this new manifest; regeneration produces a new review target and cannot reuse earlier acceptance. Neither script authorizes execution. No provider runner, credentials or paid budget is embedded.

Before any later paid acceptance, the coordinator must approve the exact new source digest, route and feature-flag mode, transport, full instruction/context token budget, turn/tool limits and semantic criteria. That acceptance must exercise the composed runtime envelope rather than silently reuse the frozen reference driver unchanged. Any production merge/deployment requires its own authorization. This integration does not switch workforce datasets or modify preservation/restore work.
