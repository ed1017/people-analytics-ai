# Local selection and unpublished release split

> Historical contract/checkpoint: the authorized browser-local implementation now supersedes the unwired-search and proposed-lineage sections below. See [implemented local search](workforce-browser-local-search.md) for current behavior on the unpublished implementation branch.

## Selection boundary

`lib/workforce-mix-selection.ts` is internal and Node-only, like the bounded search. There is no public route or search entry. The alternatives panel accepts an optional internal host injection for the explicit handoff; only the mocked development harness supplies it. The caller supplies the current saved solution, independently active goal ID/text, selected saved evidence ID, displayed search fingerprint, and explicit unsaved-edit status. These must come from the current workflow, not from the imported search report.

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
| Selection adapter and ephemeral lifecycle | Offline stage/revalidate/explicit-preview operations are covered by unit and mocked-browser checks. Original plans, history and approvals remain intact. | The explicit handoff now uses the existing alternatives panel in the development harness. The production caller supplies no selection source. Keep public search entry disabled until a verified local source is integrated; never replace drafts silently. |
| Live agent, production data and operational staffing decisions | Not part of this release. | No authentication work, model transmission, new data acquisition, capacity verification, automatic application or approval is implied. |

The prior branches remain preserved; this branch descends from the unpublished ML and search commits. Publishing source/tests for offline review is distinct from enabling product UI or asserting operational readiness.

## Validation and next slice

Unit checks cover full report/proposal tampering, active identity, saved result metadata and same-ID evidence edits, non-mix invariance, missing metrics, bounds/caps, core-option duplication, two-option limits, versioned approvals and review retention. The mocked browser runs the actual Node verifier through a local Playwright binding; all browser requests are intercepted. It covers select/cancel, A → B → A, stale evidence, late replies, reload and unchanged saved reviews/approvals.

The explicit draft handoff is now implemented and checked in the existing alternatives panel, using the internal development harness. It presents assumptions before replacing any existing drafts and preserves separate Calculate, Save review and approval actions. The production caller does not supply a search selection or verifier. The next priority is release disposition, not another feature: see the [cumulative readiness review](workforce-unpublished-readiness.md) for source-only scope, findings and remaining contracts.

Validation for this slice: all 369 repository unit tests pass (24 selection tests), all 11 mocked-browser checks pass, repository lint reports zero errors/warnings, standalone TypeScript passes, and the production Next build completes. Logs are retained under `/tmp/people-selection-{tests,browser,lint,typescript,build}.log`. No model/data service calls, credential inspection, push or deployment were performed for this implementation slice.

## Explicit draft handoff

`components/workforce-selection-handoff.tsx` accepts a trusted internal verifier supplied by its host. It does not import the Node-only search at runtime, fetch evidence, or supply a production transport. `tests/fixtures/workforce-handoff.tsx` is the only host that supplies this optional selection property; its verification fetch is intercepted by Playwright and executed against the real local adapter. There was no pre-existing deterministic-search environment switch, so this keeps the established fixture-only boundary without adding settings or feature flags.

Review selected mixes verifies and displays the proposed counts, fixed assumptions and conditional-capacity warning. Replace alternative drafts verifies again and explicitly replaces at most two temporary drafts. Arrival of a new offer, review and cancel all preserve existing draft edits. Editing a draft invalidates any preview and in-flight handoff. Calculate alternatives locally produces the existing comparison; Save reviewed alternatives remains a distinct action. Cancel alternative edits clears only temporary edits/preview. No action in this handoff records approval or modifies the saved solution.

Source/goal/version/evidence changes reset ephemeral drafts; unrelated shared-state publications preserve them. A synchronous store subscription invalidates in-flight work even across batched goal changes. Each asynchronous verification returns acceptance for its own request, preventing a late replacement request from adopting a newer staged result. Reload never restores a pending selection.

The full saved-review schema remains unchanged: it retains edited inputs and recalculated comparisons, not search bounds or search-method lineage. After edits, a review is an ordinary explicit alternative; do not label it a still-verified bounded-search result.
