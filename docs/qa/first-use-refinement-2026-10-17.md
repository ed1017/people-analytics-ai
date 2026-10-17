# First-use refinement

Follow-up to the live first-time review after PR #291. This bounded pass addresses its three findings:

- Make workspace controls secondary: collapse the Action Plan/filter strip while retaining a visible current goal/scope label, disclose the repeated planning-step row, and collapse initial chat controls. Mobile uses the same Browse pages and Workspace controls on Overview and full-app screens. Existing destinations remain unchanged.
- Make final demo review scannable: retain the chosen mix, incremental cash, conditional readiness, uncovered work, scoped target and unknowns; surface the earliest proposed checkpoint. Measurement requirements and full proposed owner/checkpoint lists remain in native disclosures. The service-demand bridge retains its explicit target. Save/reopen and calculation paths are unchanged.
- Give the recorded headcount chart readable start/middle/end dates and a verified endpoint change in people in place of duplicate current-headcount KPI. Keep the zero baseline, missing-month gaps and accessible series. No annualization, causal interpretation or forecast is inferred. Invalid or single-snapshot history withholds change.

Validation includes rendered summary tests for both staffing choices, historical endpoint positive/negative/zero/unavailable cases, existing independent arithmetic tests, build/types/lint, independent review, and focused desktop/mobile browser acceptance. Browser acceptance checks one plan choice through save/reload/reopen/Track, keyboard disclosures, active scope, chart change against its dashboard response and existing navigation. Local runs use synthetic fixtures; production evidence is recorded separately in the PR. No paid model calls, server writes, population or access changes.
