# Accepted Home planning context

This local follow-up to PR 129 preserves user intent and accepted numeric assumptions through clarification, Pin and fresh Action Plan preparation. It does not add a model input or change the model boundary.

## Confirmed failure and correction

The live acceptance sequence started with a long, prefixed reduction request, received an empty response, clarified voluntary turnover and then accepted an annualized 8.2% baseline. The short-goal recognizer did not recognize the original request; the clarification state also did not retain the preceding empty-response turn. Pin therefore adopted the model's qualitative investigation wording. Fresh pilot initialization read only the pinned goal and substituted 15% / 12%, three months and an illustrative denominator.

Home now retains the bounded, scoped user-message history in the existing goal-context notes, recognizes the reduction intent and passes those existing notes to fresh local draft initialization. In the exact regression, the pinned goal is “Reduce voluntary turnover by 20% relative within 12 months”. The original complete request and both user clarifications remain in the existing notes and normal preparation payload.

The fresh draft uses 8.2% and a derived 6.56% target over 12 months. These are user-entered conditional assumptions, not observed facts or predicted intervention effects. The unknown average-workforce denominator remains unknown; rate arithmetic is possible, but exit counts are not invented. Annualized rates cannot silently become shorter-period rates; a YTD baseline also requires period review.

The $500,000 one-time programme cap, existing HR/manager capacity and company-wide scope are displayed as constraints. The cap is not an expense or calculated budget. Remaining pilot costs, participation and dates remain visibly illustrative. Existing drafts and attachment history are not rewritten.

Preparing a proposal now says “Draft prepared”; explicit attachment and calculation review remain necessary. Recognized analytical first steps receive an analytical-first-step qualification. This is a narrow presentation heuristic, not certification that other proposals are effective interventions. The UI does not manufacture a third alternative.

## Validation

The exact sequence is covered by `tests/home-planning-intent.test.mjs` and `tests/browser/home-accepted-planning-context.mjs`, including empty response, both clarifications, Pin, normal preparation payload, explicit attachment and reload at desktop, mobile and a half-width/half-height 200%-equivalent viewport. Browser API responses are synthetic and intercepted; no live model calls occur.

Full unit, browser, lint, TypeScript and build results are reported with the tested commit. Existing ambiguous targets, conflicting target rates, unsupported mixed/replacement goals, stale edits and saved history remain covered.

## Deliberately outstanding

Real-model acceptance must be repeated by the parent before merge. This patch preserves accepted intent and assumptions; it cannot guarantee that the model produces delivery interventions instead of analytical proposals.

Source-outage fallback is separate and not implemented. The current source reader bounds each read at 12 seconds and marks timeout/network/non-OK/unusable responses unavailable. The recorded recovery from 8/18 to 17/18 sources after refresh indicates a transient condition but does not establish an upstream cause. Current Pin/proposal evidence gates remain intact; this patch does not fabricate evidence, loosen evidence validation or automatically retry sources.

The separate panel checkpoint is preserved on `feat/home-plan-panel` at `974f8dc9597197caa47ed2e607ad5a2cac3b3000`. It is not part of this branch. Remote PR 129 remains unchanged pending parent coordination.
