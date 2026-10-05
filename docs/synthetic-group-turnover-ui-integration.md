# Synthetic group turnover disclosure integration

Local integration on `integration/synthetic-group-turnover-ui`, combining source consumer `ea37df4437d5d62153287a237ad9a1c937e0d2e4` with released main `81905a967e4fab1f5916beb61680017a49d0b87e`. The code/build validation checkpoint is `e9f062cae881968d928cfd0953646ff107af5176`; the final checkpoint adds tests and this report. This work is not pushed or released.

The existing synthetic exit example's **Source, version and reproduction** disclosure now contains one selectable family/seed/group case. The default forecast surface remains collapsed. Two fixed count methods, their assessment errors and explicitly qualified retrospective ranges are shown without selecting a new winner. Existing exit-example totals and hiring/satisfaction outputs remain unchanged.

The display retains the 500 separately seeded synthetic-history qualification, 2 of 20 passed uncertainty gates, reversal failures with zero coverage, unavailable October–December ranges and unscored actuals, missing calibration reasons and small-group suppression. It explicitly states that operational forecasting is unavailable and that goals/workforce filters do not narrow this separate benchmark. Assessment ranges were not available at the historical forecast origin. No real-world accuracy, individual risk, turnover rate or causal effect is inferred.

## Evidence and failure behavior

The static projection is guarded by mandatory `npm run prebuild` invoking `node tests/manual/generate-group-turnover-consumer.mjs --check`. The Node verifier and raw evidence do not enter the browser bundle. The UI verifies the complete supplied projection against the build-verified artifact; missing or edited candidates show no group figures. This is fixed build evidence, not live freshness.

- Evidence commit: `2d9dd96329c42cac89024f7f8f64fb67f18bb502`.
- Workforce manifest SHA-256: `f53e69f8176092908fd5d70c75ea10dcf39ce681c07f29d156c51747dc94ec4a`.
- Group report SHA-256: `4fb1ea163d580d16b7d2aab4a70d47e2a5c21ea652e93d69a65b4c42d7611731`.
- Projection identity: `6f76782c3da5b1c326f4a6b55e04792c1f5258e2f8712aa26205439a098265e8`.

An isolated temporary copy passed the build check unchanged, then failed after editing a count while retaining the original identity, and separately failed after changing a pinned evidence file. Repository evidence was never edited or regenerated. The generator, consumer implementation/pins/projection and evidence directories are byte-identical to the source branch. Hiring/satisfaction and earlier exit artifacts are byte-identical to released main. Held eNPS files are untouched.

## Validation

- All 1,258 recursive unit tests pass, including three UI projection tests and ten source consumer tests.
- Production build (including mandatory prebuild), ESLint, TypeScript and whitespace checks pass.
- Consumer projection verification and existing action-plan analysis artifact reproduction pass without regeneration.
- 64 new component browser checks cover desktop, 390px, 320px and a 683px reflow viewport representing 200% desktop zoom. They exercise controls, qualified and failed gates, suppression, missing/stale evidence, keyboard disclosure entry, overflow, 44px controls and absence of runtime errors or API/model requests. This is reflow validation, not physical-device or browser-native zoom certification.
- Existing analysis-demo and forecast-readiness component suites pass 102 and 33 checks respectively, including unchanged hiring/satisfaction behavior and accessibility checks.
- The integrated production build passes 470 additional browser checks: palette scope 43, evidence scope 48, compact Home 57, unified attachment 117, tradeoff prose 21, phone workspace 80, composer space 36 and palette selector 68. Combined browser total: 669. All API responses are intercepted fixtures; no live model call is used.

The separate main-background Light redesign and removal of Original from the palette selector are held for user preview approval and are not included. Hosted ML acceptance and release coordination remain outstanding; no push, PR or deployment is performed for this checkpoint.

## Release integration after Dark / Light

PR139's accepted palette head `cfabf86887046bbcb1b1f3b06b0053b5ad99bbb6` was merged as main `7333c4e4b39e4c6e11d754084df14c68b77c6739`. Integration checkpoint `0babbdfb51a37872a25465e2ccd754bae77c2e00` merges that release without conflicts or changes to the ML implementation/evidence. The earlier local-only/palette-hold notes above describe the prior checkpoint and are superseded by this release integration.

Hosted acceptance supplied by the parent thread:

- PR139 exact accepted preview: https://people-analytics-aaciv9ncf-ed-56dc.vercel.app/ — new-origin Light default, exactly Dark/Light beside Perspective, full Home/Workforce Light canvas/cards, dark text/navigation, keyboard and persistence in both modes; restored Light.
- PR138 original tested head `725b92da4da5e73ca2c5d0abde4e951670eb1572`: https://people-analytics-ihraiyh0v-ed-56dc.vercel.app/ — Home/core Attrition hydrate and original 605/201/806 exit totals and limitations pass. The new group disclosure was not expanded because of the prior functional approval denial; local component tests cover it. No restricted disclosure or rules/status routes were retried.

Known hosted source limitation: Exit Survey Feedback remains unavailable; Listening dimensions reported a statement timeout in the console. This is not a successful data-source validation and is not presented as one. The UI retains honest unavailable states. No database, access, permissions or model-boundary change is included, and no attempt was made to bypass or repair the source timeout.

Combined release validation passes: 1,258 unit tests; 718 browser checks (519 production-shell Home/palette/mobile checks plus 64 group-disclosure, 102 analysis-demo and 33 readiness checks); mandatory prebuild evidence guard, production build, ESLint, TypeScript, consumer projection verification, existing analysis-artifact reproduction and whitespace checks. No evidence regeneration or model request was performed. The tested implementation at `0babbdfb51a37872a25465e2ccd754bae77c2e00` is unchanged by the release-report commit.
