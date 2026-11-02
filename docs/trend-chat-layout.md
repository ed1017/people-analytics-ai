# Workforce trend planning in the conversation

The workforce trend entry in Home keeps the conversation and composer visible. Trend controls and save/reopen actions render in the left response column; trend metrics, charts, comparisons and method details use the right results column. On narrow screens the existing split layout stacks these regions. This is a presentation restoration, not a route change or a rollback of earlier releases.

The same GroupCapacityRisk and GroupWorkforceTrend instances own calculations and assumptions. Moving into demand/staffing planning keeps the trend component mounted and hides its portaled results; returning retains its selected business unit and edits. Back to conversation closes the controls and returns focus to the composer. Existing trend backup/save schemas are unchanged: they retain source, lookback, horizon and edits, not a newly invented selected-group field. Standalone risk-summary usage keeps its original layout.

Explicit reset/new problem now atomically retires continued-scenario receipts in both the current goal and the destination General exploration workspace. Otherwise an older General receipt could reappear after reload. The single existing checked storage transaction preserves other goals, plan fields and revisions, and aborts on quota or cross-tab conflicts. Ordinary close remains scoped to its current owner.

Verification: focused actual-component/context and storage tests, group calculation regressions, independent review and the position feature TypeScript graph. Release CI and desktop/mobile stage/public checks are recorded below when complete. All AI transport testing is deterministic or mocked; no paid provider call or fresh provider-answer quality claim is included.
