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
