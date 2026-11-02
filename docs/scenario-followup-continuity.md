# Scenario follow-up continuity and decision clarity

## Scope

The reviewed defect was in the guided staffing example: ordinary follow-ups after Continue this scenario in chat cleared its model context. This change retains the exact reviewed draft and chosen option without creating a new goal. It does not add costs, attrition, contractor or automation models.

## Ownership and persistence

The browser-owned guidedScenarioChatV1 receipt contains the complete validated draft, input key and selected candidate. It is bound to dataset token, workspace owner, discussion scope and saved-scenario signature. Restoring a receipt recalculates results from inputs; it does not trust saved result objects or revive pending edits. A different saved revision, dataset or discussion cannot inherit it. Explicit new-problem/reset clears the active owner's receipt before changing ownership. Saving a reviewed plan clears continuity in the same proposal transaction, preserving its expected revision.

## Reader and model agreement

Recruiting hires and accepted offers name their actual monthly period (September 2026 for the supplied snapshot). YTD voluntary turnover retains the existing same-period target; it is not compared to an annual target. Staffing tables identify evaluated versus displayed options; the chart explains identical monthly coverage can share a line. Reader labels use develop, move and hire while existing internal keys and legacy edit aliases remain compatible.

At the decision point, shared reader/model copy states the entered backfill count, unmodeled donor-team capacity loss and attrition, and readiness dates rather than gradual productivity ramps. All existing calculations and source records are unchanged.

## Repeatable verification

Open the five-FTE staffing example, calculate, choose an option, and Continue this scenario in chat. Ask What about backfill? and What if attrition increases? Inspect the constructed scenarioReview for the identical draft/inputKey, option and dataset. Propose a budget edit; cancel once and accept once, then recalculate. Reload, switch goals, open a different saved revision, and reset/new problem to verify isolation. Review and save a continued plan; reopen it and verify calculations and saved assumptions.

Automated tests execute the actual component with the real DecisionStore and calculators. Browser follow-up transport is locally mocked: no paid provider request or fresh provider-answer quality claim. Release and public verification details will be recorded after gates pass.

## Release record

- PR #552 merged as e51d95bd21b95ecc37a583f9e0b28cf6ceddaf4f; runtime candidate 324034959fe7a8862dd514f216e95a357b49abce.
- Exact-head CI 41380056011 passed every contract group, generated-artifact check and TypeScript check. Vercel production build and TypeScript passed.
- Tested and promoted deployment: dpl_5AW1aA9ZomUiAP67UhjwKsigzY8U, people-analytics-qgs6fqizg-ed-56dc.vercel.app. Archive SHA256 01b0f967ea04bb1120bfb1c003b9a20993cc69c16c15d5e893afdc8cc9ade5b6; 1,302 entries; private inputs unchanged.
- Deep staged desktop 1440/mobile 390 checks passed ordinary backfill/attrition payload retention, pending/canceled/accepted edits, recalculation, reload and unsent draft, reviewed save, goal/exploration isolation, reset and separate position-plan preservation. Final exact-host smoke passed both widths. All 1,030 runtime entries were byte-identical to the deep-tested 2b265e9 candidate; the last commit corrected only an older test wording assertion.
- No page, blocked-request, mock or pre-teardown errors occurred in accepted staged runs. Protected-stage teardown later emitted bridge/closed-context errors; these are not represented as clean teardown or application-answer acceptance.
- An initial automatic promotion review rejected an apparent host/evidence mismatch. Reading both exact-host reports and Vercel deployment metadata resolved it; the same promotion command then succeeded. No alternative route or access change was used.
- Direct-public verification passed 8/8 functional groups at 1440 and 390 pixels. Entry/reload documents returned HTTP 200; no stage asset replay, page errors, blocked requests, mock errors or bridge errors; teardown drained cleanly. Each width made five locally mocked Home requests and zero paid provider calls. Reports: integration-evidence/scenario-followup-public-3240349-{1440,390}.json. Screenshots inspected. A separate real GET of public-ai-capabilities confirmed all five routes configured after promotion.

## Known limits and unchanged behavior

The test transport intercepts AI requests locally and checks exact constructed context. It does not verify a fresh paid provider answer. Paid AI calls remain paused, with no budget or access change.

After saving, the existing public-ai-evidence-client.mjs exact-source gate can withhold a saved-plan follow-up with "Exact public evidence for this saved plan is unavailable. Earlier plans are kept." The browser test did not bypass this gate. The reviewed plan and source lineage remained saved; this differs from the fixed ordinary continued-scenario context loss.

The separate group-capacity question path still opens GroupWorkforceTrend inside Overview and hides HomeConversationSplit until Back to conversation. This is an in-app view change (overall-overview-page.tsx riskRequest), not a new route. The screenshot navigation question was diagnosed only; no navigation redesign is included here.
