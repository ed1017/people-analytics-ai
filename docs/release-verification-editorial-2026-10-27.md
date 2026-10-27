# Editorial and guided-demo release verification - October 27, 2026

Status: PR440 merged and the exact tested deployment promoted. Direct public desktop and mobile verification passed.

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

An isolated Chromium check at desktop and mobile widths reproduced background scrolling at the intro boundary before the lock, and verified containment afterward. The separate report of a blank screen has not been causally reproduced. Protected desktop/mobile integration checks passed.

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

## Hosted and production verification

Runtime `394fedbb6c7162216df1b1c50bd961b364aa4038`, deployment `dpl_Ew6ENEJWrRvPq9HNF41xeSDT4wWe`, source `4b2db3792b30e6763fec81cd2a54b1d9a297f1d2`, merge `b9a4484b644cd2d8d9e5a4b16ce94bee8218ba6c`.

Exact source-head CI [40535413252](https://github.com/ed1017/people-analytics-ai/actions/runs/40535413252) passed every step, including 3,092/3,092 root regression contracts, generated-artifact verification and TypeScript. The new versioned editorial checks passed 34 tests with one existing private-source skip. The 901-test runtime suite and ten final market presentation/carry checks passed. Independent semantic review approved both runtime increments.

Protected 1,440px and 390px checks covered intro scrolling at a short viewport, focus restoration, ordinary dismissal/reload, explicit checkbox opt-out/re-enable, manual reopening and retained drafts; explicit example adoption and unchanged $325,000/$200,000 recommendations; risk Details; settled Workforce, Attrition, Compensation, Succession, Talent, Skills, Finance, Learning, Listening, Positions, About and static Labor Market references. Final Labor Market/Overview checks verified the last copy-only increment. No page errors or horizontal overflow were found in completed checks.

The exact staged deployment was promoted without rebuilding. Both public aliases point to it. Direct public desktop checks passed the main journey, actual Listening source, Labor Market presentation and dataset-scoped readiness (HTTP200, configured, five routes). Public mobile checks also passed the same core journey. Dataset-scoped readiness at 15:58:24 and 15:58:33 UTC returned configured for all five routes; actual Listening data loaded at both widths.

### Preserved diagnostic limits

- The first unpromoted package returned HTTP500 because its deployment-scoped organization ID was omitted. The corrected package used the documented existing ID; identity guards and persistent settings were unchanged.
- A protected-preview readiness request aborted at 4.942 seconds while its transport delivered a valid HTTP200 response after 11.056 seconds. Direct public readiness passed; this is not provider-answer acceptance.
- Listening initially displayed unavailable during a preview sweep. Fresh timed actual-source checks passed at both widths; the original timeout trigger remains unproven.
- Optional national indicators are outside the public source projection. After the observed503, subsequent browser coverage used an explicitly labeled unavailable fixture and did not repeat upstream requests. Static sourced labor-market references remained visible.
- A local Windows source-root run failed 39 cases, including confirmed CRLF digest and path-separator incompatibilities; no goldens or guards were weakened. The exact Linux CI run passed all 3,092 cases.
- Local disk exhaustion interrupted a final screenshot pass. Only generated build cache and one obsolete package lock were removed; source, user data and evidence were retained. The final staged check then passed.

No paid model requests, source-data regeneration, financial settings, credentials or access changes were made. The specific FTE question passed actual synthetic-data binding/service acceptance with zero model rounds: Managed Services decreased 27.8 FTE, from 1,451.6 in June to 1,423.8 in September 2026, with four dated observations and investigation guidance. This does not prove fresh provider interpretation or a reconciled causal decomposition.

