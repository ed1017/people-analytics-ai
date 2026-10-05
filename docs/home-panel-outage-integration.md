# Combined Home panel and outage checkpoint

Local integration branch `integration/home-panel-outage` combines accepted-context fix `d3f8f9d`, source-outage fallback `626b128` and the preserved panel checkpoint `974f8dc` (its two source commits). PR129 remains at `d3f8f9d`; no combined changes are pushed.

Conflict resolution retains accepted user statements and numeric assumptions in fresh initialization, the local-origin source binding and warnings, panel collapse/latest-applied selection, and the correct explicit confirmation for local versus linked attachment. The pending chat diff reaches either kind of panel. Apply saves only the reviewed working draft; cross-goal switches invalidate it. One fallback proposal has three state-aware action controls, with Compare disabled and explained; no extra recommendations are generated. A verified active fallback is not duplicated in a separate “saved records need review” summary.

## Release-blocking crash reproduced

An isolated production build of exact `d3f8f9d` was exercised with intercepted synthetic API responses. One explicit goal and one Pin received a schema-valid preparation with `bundles: []`. It reproduced:

`TypeError: Cannot read properties of undefined (reading 'inputs') at Ct (...:10:569303)`

This matches the parent live-test function, line and column. Source inspection identifies `calculatePlanWhatIf(draft.inputs)` before `if (!draft)` in `HomeBundlePlans`. A valid empty proposal leaves `session.drafts[selected]` undefined; the parent mounted the component for every preparation record, including zero bundles. This is a rendering failure, not a credential or evidence-request diagnosis. The live response body itself was not retrieved; the exact failure is demonstrated with a valid empty response locally. Direct hosted static-asset retrieval returned 403 and was not retried; the isolated build supplied the matching stack.

The combined branch mounts the selected-plan component only for a nonempty proposal, explicitly displays the unavailable explanation/question with the preserved goal, and defensively guards the conditional-input read and Apply readiness when no draft exists. It neither fabricates a plan nor automatically retries. Ordinary reload of a saved empty preparation remains usable.

`tests/browser/home-preparation-resilience.mjs` covers empty, missing and malformed preparation responses, reload without resubmission, and delayed empty/valid responses arriving after a goal switch, at desktop/mobile/200%-equivalent reflow. `EXPECT_D3_CRASH=1` runs the one-case reproduction against the isolated old build. All APIs are intercepted; no live model call or credential diagnostic is involved.

## Limits and hold

The fallback retains its original limits: one generic local template per supported turnover/additional-capacity path, explicitly illustrative or user-entered assumptions, no causal effectiveness claim, no mixed/replacement fallback and no new cross-page linked-field handoff. The panel remains browser-local. Real-model acceptance and ordinary release checks are still required before any merge. Held eNPS files remain untouched.

Final combined validation: 1,084 unit tests; 453 browser checks (45 preparation resilience, 75 combined fallback/panel, 36 panel, 21 accepted context, 48 what-if, 117 unified attachment, 18 clarification, 36 composer, 57 compact layout); lint, standalone TypeScript, production build and whitespace checks pass. The isolated old-head reproduction is an additional expected-failure check, not counted among the 453 passing fixed-build checks. Tests use synthetic intercepted responses. Responsive checks cover desktop, mobile and 200%-equivalent reflow; long content remains scrollable rather than promised to fit one screen.
