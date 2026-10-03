# Derived workforce journey — selector and UI wiring

Selector preserved at `ce9a637eb6e693978ca5f8906522fec418cb15ba`.
UI integration base: `134c04def4b60036955c78b57559782e94b7f9d9` (PR99),
with changes isolated on `local-workforce-journey-ui`. Release branch unchanged.

“Continue this decision” derives the next review step and opens/focuses an existing
control. It does not click that control. Assumptions and clarification collapse once
a saved calculation exists, remain available through a disclosure, and stay mounted
to preserve temporary edits while reviewing this decision. Evidence-review links open
the enclosing disclosure before focusing their existing fieldset.

There is no new schema, validator, API, model, planner or storage boundary. Main input
and card components publish read-only projections of their existing temporary state;
their existing edit/save handlers remain authoritative. Goal switching/reload retains
the established behavior: durable records resume, ephemeral drafts/confirmations are
cleared and pending work is cancelled. This slice does not introduce draft persistence.

`selectWorkforceJourney(records, transient?, verificationContext?)` derives a
single next step and semantic focus target. Feed existing selected goal records,
raw workforce solution, exact inspected result ID, existing alternative history,
load readiness and actual storage writability. Do not persist its output/context.
Inputs must be existing JSON-compatible records. Readers preserve their current
validation semantics; this projection never repairs or migrates malformed data.

| Step | Future host action / focus |
| --- | --- |
| loading / choose-goal | Wait for hydration / focus saved goal selector |
| storage-blocked / unavailable | Show existing storage or record notice; retain records |
| start-inputs / align-goal | Start existing guided inputs / explicit goal-copy review |
| working | Show existing operation and cancellation control; do not start another |
| review-proposal | Focus existing proposed-change review |
| correct-inputs | Focus first shared-validator field; show all corrections |
| save-inputs | Explicitly save reviewed draft using existing lifecycle |
| calculate | Explicit Calculate action on saved assumptions |
| historical | Read-only historical inspection; offer explicit return to current inputs/calculation |
| verify-result | Run existing cancellable card/lineage worker verification |
| compare | Show saved result, alternatives and hiring benchmark; offer priority and tailoring |
| review-alternatives | Review staged alternatives before existing explicit review/save action |
| preview-tailoring / save-solution | Explicit preview / explicit save of reviewed revised solution |

Focus targets are semantic identifiers, not guessed DOM selectors. The eventual
host maps them to existing controls/field refs. No output triggers a write, run,
request, pin, approval, navigation or preference automatically. “Save solution” is
guidance, never permission: the existing asynchronous preview identity, validation,
lineage and save guards must still run. Approval remains a separate existing action.

Temporary proposal/draft/operation/alternative/tailoring state comes from existing
host state. Bind it with `workforceJourneyContext` when created and replace its
binding only for a genuine new interaction. This equality token covers the selected
goal (including context), full solution/evidence, selected result, alternative history
and load/write status. Never refresh an old draft's token to make it appear current.
Stale temporary guidance is ignored and flagged. Existing component lifecycle guards
control draft retention/invalidation; disclosure and Continue never remount drafts. Tailoring `preview: ready` may be supplied
only after the host's existing worker has validated that exact current draft; edits
must reset it to `needed`. The selector does not validate a preview or calculate.

Set `verificationContext` only after existing card loading/lineage verification has
succeeded against those exact records; a selector-generated token alone proves
nothing. Clear/recheck it after context changes, failures or cancellation. Saved card comparisons require this signal. An active alternative draft can be
focused independently; its existing explicit worker preview/save checks still apply. The selector performs no cryptography or worker work.
A cancelled transient falls back to saved records; a persisted pending ticket still
requires existing lifecycle cancellation/recovery and remains `working`.

For reopening, resolve a pin through the existing guarded asynchronous resolver,
then supply its exact selected result ID and scoped records. Never silently fall back
from a missing explicit selection. An older result remains historical even if inputs
later revert. No pin records or duplicate saved-solution index are introduced.

Shared readiness distinguishes blocking missing/invalid inputs from optional unknown
costs/timing/constraints. Optional unknowns do not prevent explicit calculation; they
remain disclosed. Candidate pools never establish assignable capacity. This slice
makes no live-agent, ML, forecast, browser compatibility or operational-capacity claim.

The host maps semantic targets through `data-journey` / `data-journey-field`. Tailoring
corrections are scoped to the active what-if editor, avoiding similarly named main
assumptions. Missing explicit result references display an unavailable selection and
allow explicit selection of retained history; no latest-result fallback is substituted.
Older-version results remain historical even after an input reversion, including for
approval availability.

## Local acceptance

1. Select a saved synthetic goal. Continue focuses the existing guided-plan start;
   starting remains an explicit button action.
2. Continue opens the next blocking field. Optionally use the existing explicit AI
   clarification control with a mocked response, review its proposal, and save inputs.
3. Continue focuses Calculate. Cancel a delayed mocked calculation and check that
   the late reply adds no result. Calculate again explicitly.
4. Once verified, Continue focuses comparison priority. Edit an option; Continue
   focuses a correction in that option or its reviewed explicit Save action.
5. Save the revision, pin it explicitly, and reopen its exact saved result. Original
   calculations, evidence and approval notes remain attached to their prior versions.
6. Collapse/reopen assumptions with an unsaved input draft; Continue preserves it.
   Change goals during a pending worker operation and confirm no late result crosses
   into the new goal. Reload resumes durable records, not transient edits.

Validation uses synthetic fixtures and intercepted local APIs. The dedicated browser
suite covers desktop Chromium and Pixel 7 viewport/touch emulation, keyboard focus,
cancellation, goal interruptions and an unavailable-Worker path. This is not actual
Windows or Android device coverage, hosted acceptance, or live-agent/ML validation.

## Validation of this slice

Passed: 456 unit tests; full ESLint; standalone TypeScript; genuine optimized Next
build; whitespace checks. Combined browser coverage: 559 assertions (58 journey,
100 cards, 54 intake, 98 built workspace, 48 readiness, 44 goal copy, 62 local search,
50 handoff, 11 selection, 24 lifecycle, 10 portable fixture). Existing suites now
explicitly open the new assumptions disclosure when exercising its controls.

All browser APIs were synthetic/intercepted; no live agent, model, authentication or
database requests were used. No push, PR update, merge or deployment is part of this
slice. Independent review and hosted/physical-device acceptance remain release gates.
