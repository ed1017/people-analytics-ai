# Local selection and unpublished release split

## Selection boundary

`lib/workforce-mix-selection.ts` is internal and Node-only, like the bounded search. There is no public route or component entry. The caller supplies the current saved solution, independently active goal ID/text, selected saved evidence ID, displayed search fingerprint, and explicit unsaved-edit status. These must come from the current workflow, not from the imported search report.

`stageWorkforceMixSelection` checks that context, replays the full bounded search through the existing calculator, and compares the complete report. Verification does not run a new saved plan, persist calculations, approve an option, or replace the original. It returns only one or two selected input proposals and their binding. Only the three mix counts differ from the saved input. Missing metrics, unknown/failed constraints, invalid or omitted mixes, duplicates, the original mix and the existing hiring-only core option are rejected. All non-mix totals, dates and backfill assumptions remain unchanged.

Search method v2 fingerprints the complete selected result record and its referenced saved evidence snapshots, in addition to input/timing/dependency identity. This closes same-ID metadata/evidence edits that v1's payload-only binding did not detect. Old reports must be regenerated; no persisted report migration is performed. Hashes detect differences, not authenticity of a fully rewritten local state.

`previewSelectedWorkforceMixes` is a separate explicit action that revalidates the whole proposal before calling the existing `previewWorkforceAlternatives`. That workflow still requires its own explicit retention action; approvals remain versioned and separate. Staging never invokes this bridge automatically. Existing review history is neither accepted nor overwritten by the selection API.

`lib/workforce-selection-session.ts` manages ephemeral pending/staged state with a generation counter. The host must publish every goal, evidence or input change through `setContext`, including A → B → A transitions. Cancel and superseding selections invalidate late replies; reloading creates an empty session. Copies isolate caller mutations. Before any review action, re-read current context and use the revalidating bridge. No staged data is stored.

A passing selection remains **conditional on entered assumptions**. Candidate pools are not assignable employees; operational capacity, source-team effects, overlap, learning outcomes and hiring execution remain unverified.

## Cumulative release split

| Capability | Local release assessment | Public exposure boundary |
| --- | --- | --- |
| `80967c7` synthetic hiring evaluation foundation | Offline protocol, temporal split/label checks, median baselines and aligned evaluation metrics are reviewable with synthetic fixtures. | No trained model, verified production dataset, validated deployment, or predictive performance claim. Keep internal until data provenance and evaluation acceptance are independently established. |
| `8a9c7ad` bounded deterministic search, plus v2 identity correction here | Conditional arithmetic and explicit trade-off comparisons are suitable for offline review. Full bounds/budget, omissions, fixed path totals and unknowns remain visible. | No public entry yet. Exposing comparisons requires explicit reviewed assumptions and capacity limitations; never present ranking as approval or operational feasibility. |
| Selection adapter and ephemeral lifecycle | Offline stage/revalidate/explicit-preview operations are covered by unit and mocked-browser checks. Original plans, history and approvals remain intact. | Keep internal until an explicit staging handoff is integrated and reviewed in the existing alternatives panel. No silent replacement of its existing drafts. |
| Live agent, production data and operational staffing decisions | Not part of this release. | No authentication work, model transmission, new data acquisition, capacity verification, automatic application or approval is implied. |

The prior branches remain preserved; this branch descends from the unpublished ML and search commits. Publishing source/tests for offline review is distinct from enabling product UI or asserting operational readiness.

## Validation and next slice

Unit checks cover full report/proposal tampering, active identity, saved result metadata and same-ID evidence edits, non-mix invariance, missing metrics, bounds/caps, core-option duplication, two-option limits, versioned approvals and review retention. The mocked browser runs the actual Node verifier through a local Playwright binding; all browser requests are intercepted. It covers select/cancel, A → B → A, stale evidence, late replies, reload and unchanged saved reviews/approvals.

The next substantive unblocked slice is the explicit draft handoff in the existing alternatives review panel: present staged inputs and unchanged assumptions, require an explicit choice before replacing any existing drafts, and preserve separate Calculate, Save review and approval actions. It can be implemented with local synthetic evidence and mocked browser checks; it needs no model or new data. That public integration is deliberately not enabled by this commit.

Validation for this slice: all 369 repository unit tests pass (24 selection tests), all 11 mocked-browser checks pass, repository lint reports zero errors/warnings, standalone TypeScript passes, and the production Next build completes. Logs are retained under `/tmp/people-selection-{tests,browser,lint,typescript,build}.log`. No model/data service calls, credential inspection, push or deployment were performed for this implementation slice.
