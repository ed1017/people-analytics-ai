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

## Independent review against the release candidate

Reviewed exact `c2943d0540621d65d67f1d85fab8c7c407699477` against
`134c04def4b60036955c78b57559782e94b7f9d9` on the separate local branch
`review/workforce-journey-independent`. Two P2 defects were reproduced before fixing:

- A what-if whose Build + Move + Buy exceeded demand directed Continue to the
  fixed role-demand field, which does not exist in that editor. The selector now
  chooses an editable correction field. A unit regression distinguishes the
  what-if target (Build) from the main-input target (role demand); keyboard browser
  regressions exercise both tested widths without saving anything.
- A delayed calculation could append a result after a synchronous A → B → A goal
  switch. React batched away the intermediate goal, bypassing the existing unmount
  cancellation. The workspace now observes store transitions and aborts the pending
  request when its goal or wording changes. The browser regression originally
  produced two results; after the fix it retains one and clears the pending ticket.
  This closes an existing cancellation weakness exposed by the journey review.

Final local validation: 457 unit tests; ESLint; standalone TypeScript; genuine
optimized Next build; whitespace checks. All 563 combined browser assertions passed:
62 journey, 100 cards, 54 intake, 98 built workspace, 48 readiness, 44 goal copy,
62 local search, 50 handoff, 11 selection, 24 lifecycle and 10 portable fixture.
The portable fixture first timed out waiting for its save control while the suites
ran concurrently; an isolated rerun passed all ten checks. No product change was
made for that timeout. The original failure and successful rerun were retained.

Evidence in this execution workspace: `/tmp/journey-independent-unit.log`,
`/tmp/journey-independent-{lint,ts,build}.log`,
`/tmp/journey-independent-browser-*.log`, and
`/tmp/journey-independent-workspace/results.json`. Before-fix reproductions are
`/tmp/journey-independent-before.log` and
`/tmp/journey-independent-roundtrip-before.log`.

Source inspection and synthetic browser coverage support explicit-only actions,
optional unknowns, historical/missing selection honesty, mounted draft preservation,
alternative review, and retained result/pin/approval boundaries. No new API, auth,
model, storage schema, permissions or eNPS changes were introduced. Browser requests
were intercepted synthetic fixtures; no live service acceptance was performed.
Linux Chromium desktop and Pixel viewport/touch emulation are not physical Windows
or Android validation. Hosted and physical-device acceptance remain outstanding.
The release branch and PR99 were not updated, pushed, merged or deployed by this review.

For acceptance, repeat the six steps above, additionally entering an invalid what-if
mix and checking Continue focuses an editable count; cancel or switch goals during a
delayed mocked calculation and verify no new result; then explicitly save, pin,
reload and reopen the exact saved version while checking original approval notes.
