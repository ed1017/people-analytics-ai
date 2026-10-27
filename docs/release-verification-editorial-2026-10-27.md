# Editorial and guided-demo release verification - October 27, 2026

Status: candidate prepared; hosted staging, exact-head release CI, promotion and public desktop/mobile verification are pending. PR438 remains the last verified public release in this record.

- Candidate runtime: `394fedbb6c7162216df1b1c50bd961b364aa4038`
- Runtime baseline: `5d52980ea5dd2218125d81ca62f92947784291d9`
- Scope: 103 runtime files, including presentation, narrowly scoped behavior fixes and regression tests; documentation is separate.

## Changes

- Overview, risk cards, shared planners and workforce modules lead with the result and action. Repeated defensive prose and internal QA language are removed from primary presentation; calculation definitions and provenance remain in closed Details. Genuine missing-input, error, suppressed-value, stale-data and unsaved-work states remain distinct.
- The red workload-risk card no longer displays the standalone fictional-workload introduction. Its unchanged calculated shortfall and scenario provenance remain available through Details.
- The introduction locks background-page scrolling and contains its own scroll region. Closing restores page styles and focus. Repeat-on-load behavior, the explicit opt-out checkbox, contacts and saved work remain.
- Explicitly adopting the worked example now runs the existing guarded local comparison, removing a separate calculation click. The original inputs, shared calculations and explicit save step remain.
- A supported named-BU FTE-decline question now receives the measured net change, its chart and concise investigation/action guidance. It does not assign unverified causes or convert headcount movements into FTE.
- About keeps the product case study and verified contacts. README leads with the product, demonstration and creator decisions; historical release and operational notes move to a separate document.

## Completed local verification

Independent review passed. The final aggregate run passed 901 of 901 tests. TypeScript passed. Lint reported zero errors and one unused-variable warning in a test. Focused tests cover primary-versus-Details presentation, preserved metric quantities and unknown/suppressed states, intro preferences and scroll restoration, scenario calculations and explicit adoption, saved-revision behavior, exact/paraphrased FTE-investigation routing, scope guards and error handling.

An isolated Chromium check at desktop and mobile widths reproduced background scrolling at the intro boundary before the lock, and verified containment afterward. The separate report of a blank screen has not been causally reproduced. Hosted integration verification remains pending.

## Digest baseline correction

Two aggregate tests had stale public-envelope digest constants. The unchanged committed PR438 baseline reproduced the same failures using the same pinned inputs. The predecessor of the position-dashboard release produced the old digest. Commit `6400ea60f01b2c1b8a717cacf3a3247df32ffc0a` added the already-released position fields `frozen_positions`, `open_requisition_vacancies`, `on_hold_requisition_vacancies` and `uncovered_vacancies`, changing the hashed public field projection.

A read-only public dashboard response at October 27 15:24:37 UTC confirmed the current token and digest. Only the two stale golden constants were corrected; rejection, scope, immutability, historical-save and currentness assertions remain. The 24 affected tests then passed. This editorial release does not regenerate the dataset or relax its validation.

## Evidence and verification boundaries

Relevant source and regression records in the versioned source include:

- [FTE investigation routing and response](../releases/2026-10-21/source/lib/home-fte-investigation.mjs) and [tests](../releases/2026-10-21/source/tests/home-fte-investigation.test.mjs).
- [Intro scroll lock](../releases/2026-10-21/source/lib/intro-scroll-lock.ts) and [orientation tests](../releases/2026-10-21/source/tests/home-orientation.test.mjs).
- [Module presentation tests](../releases/2026-10-21/source/tests/module-editorial-presentation.test.mjs) and [planner presentation tests](../releases/2026-10-21/source/tests/planner-editorial-presentation.test.mjs).
- [Historical README operational record](readme-operational-record-2026-10-27.md).

The available FTE history establishes net change, not a reconciled movement-level FTE decomposition or causal attribution. Investigation suggestions are guidance, not measured findings. The original visitor-reported AI failure remains without a correlated request trace; controlled and deterministic coverage does not establish fresh provider-answer acceptance. No paid model calls, accounting changes, credentials, pricing-policy changes or access changes are part of this release.

## Hosted and production checklist

Pending: exact candidate deployment identity; desktop/mobile intro scrolling, short viewport, focus, opt-out and draft preservation; worked-example adoption and actual $325,000/$200,000 outputs; risk Details; settled Workforce, Talent Acquisition, Skills, Finance, Learning, Listening, Positions and About rendering; primary-copy inventory, overflow and page errors; exact-head release CI; promotion and matching public verification.

CI follow-up: the new module render test originally required private runtime files absent from the public checkout. It now uses explicit invented presentation fixtures without skipping cases; five checks pass without private inputs. Application bytes are unchanged from the independently reviewed fcc86d6 candidate. The first unpromoted stage rejected a missing organization-ID binding; corrected staging uses the documented non-secret deployment-scoped ID and leaves identity guards and persistent settings unchanged.

Final presentation follow-up: repeated Labor Market interpretation was moved into existing closed Details while occupation, geography, date, wage/jobs units and missing/reset behavior remain visible. Ten focused render/carry tests and independent semantic review passed. Five obsolete source-root copy assertions were updated to the new wording while retaining numeric, scope, suppression and closed-Details checks.

