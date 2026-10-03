# Derived workforce journey — isolated wiring contract

Base: reviewed outcomes checkpoint `5212603cbca619dc80d375dfc084c016c9b6bbe5`.
This slice adds only a pure selector, synthetic transition tests and this contract.
No component, schema, validator, API, model or storage changes. Await the integrated
head before UI wiring; this is not a deployed journey or a new state machine store.

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
Stale temporary guidance is ignored and flagged, while the host retains drafts until
its existing explicit discard/rebase flow. Tailoring `preview: ready` may be supplied
only after the host's existing worker has validated that exact current draft; edits
must reset it to `needed`. The selector does not validate a preview or calculate.

Set `verificationContext` only after existing card loading/lineage verification has
succeeded against those exact records; a selector-generated token alone proves
nothing. Clear/recheck it after context changes, failures or cancellation. All saved
comparisons require this signal. The selector performs no cryptography or worker work.
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

Before wiring: reconcile with the integration head, map controls and cancellation,
connect exact worker/draft guards, preserve unsaved-change prompts on goal changes,
and run mocked browser transition/accessibility tests on the wired UI. No UI/browser
coverage is claimed for this pure-module slice.
