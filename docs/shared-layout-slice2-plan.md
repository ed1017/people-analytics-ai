# Slice 2 preparation: container-aware evidence layout

This is a separate preparation artifact; no slice 2 runtime code is included in slice 1.

## First adoption patch

Add a small shared evidence layout module, following the existing `OverviewPage` container-query pattern. A chart/table pair must stack when its own evidence container is narrow, even if the browser window is wide. Introduce a named, keyboard-focusable table scroll region with visible focus and an overflow cue. Keep actual tables and every data column; do not reduce body or chart-label fonts to fit.

Apply first to Hiring, Employee Listening, Skills and Career Mobility. The measured problems are viewport `xl` grids at Hiring line 78, Listening line 201, Skills line 157 and Mobility line 334, plus unlabelled horizontal wrappers on those pages. Use one shared minimum-width rule rather than four guessed viewport breakpoints. Keep full-width primary summary metrics before secondary charts/tables. Preserve `EvidenceScopeNotice` population/date and selected-context mismatch warnings. Move Skills' handoff form after its current summary, preserving the mounted input state and action gating. Listening's optional synthetic forecast must follow observed metrics and remain explicitly synthetic; it must not authorize business-unit survey release or team targeting.

## Second adoption patch

Apply the reviewed container and table patterns to Workforce/Attrition and Scenario Modeling. Put observed Attrition metrics before the synthetic forecast. Put the primary scenario comparison before optional business-unit/training calculators. Optional controls may use accessible native disclosures that preserve edits. Do not change calculation inputs, outcomes, defaults or state ownership.

## Required fixture evidence before adoption is called complete

For each touched page, add populated rows and chart series with long labels, realistic column counts, empty and unavailable states. The earlier layout audit had sparse tables; it is not populated-table acceptance. Exercise 1366×768, 1024×768, 390×844 and 320px, AI-panel resizing and 200% browser zoom (separately identify any viewport-only approximation). Show table columns remain available through keyboard scrolling, focus outlines and descriptive region names. Verify summary-first reading order, retained edits after disclosure toggles, no document overflow and no duplicated recommendations. Keep provider and production claims separate from offline fixture evidence.

Compensation, Learning, Succession and partial Position/Response/Execution views are excluded from these adoption patches until their populated fixtures are supplied. This is an explicit test-coverage boundary, not a claim their layouts are fixed. Compact shared plan summaries/legacy display adapters remain slice 3.

Return separate exact commits, bounded production/test diffs and before/after evidence for independent review. No paid calls, database/security changes, publication or unrelated features.
