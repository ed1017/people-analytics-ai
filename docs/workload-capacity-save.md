# Workload proposal persistence and compact context

Source successor to `2e1153cd3b76f01c1ac9a3646146e06cd9049db2`.
The reviewed pure calculator and frozen conversational predecessor remain
unchanged. This is a source-only handoff, without merge, release or deployment.

## Retained artifact and actions

`lib/workload-plan-records.ts` owns `WorkloadPlanSnapshotV1` independently of the
catalog: `{version:1,input,report,selectedOptionId,assumptionsAcceptedAt}`. The
entire input and comparison report are retained. The reader replays the reviewed
calculator and checks the selected normalized draft and reconciled result
against the ordinary plan. A snapshot is required exactly for
`operation.kind === 'workload'`; unsupported versions/methods and altered
inputs/results fail closed. Unsupported history remains stored, read-only, with
a visible blocking notice; it is never converted to staffing-only data.

Acceptance captures `{sourceKey,at}` for the current assumptions. Plan review
captures the exact goal/text, dataset, decision revision, source key and selected
option in a save ticket. `lib/workload-plan-store.ts` checks those values and the
full current input, including binding/revision, both before and inside the
existing `commitGoalFields` callback. It rereads the current catalog, appends an
immutable proposal, packs it using the existing encoding, associates its
proposal-selection attachment and selects the existing Action Plan view.
Saving leaves `applied:false`, including when deficits or unknowns are retained.
No goal-progress measurement/event is added by this increment.

Repeated UI saves are disabled. A retry with the current store revision and
identical retained artifact reuses the existing proposal/attachment without a
write. Edits append a newer snapshot with source lineage, preserving earlier
inputs, provenance and attachments. Reload verifies and restores exact saved
bytes; it never rebinds an old snapshot to new evidence. Dataset/goal changes,
selection changes, store races, stale source/binding/revision and cross-tab
conflicts block save. Existing 450000-byte catalog, 512 KiB decision and 3 MiB
envelope limits stay unchanged. Quota failures retain prior persisted history
and visibly fail; no compression/truncation/history dropping is added.

Local Apply requires an exact current saved artifact and a selected `met`
workload option. It marks app planning state only, without operational hiring or
implementation. Both pure attachment helpers and pure Apply require workload
proof. Home has no current working workload report, so its generic Apply/link
controls are disabled for workload plans; reopen Workload & Capacity Planning
for those actions. Generic staffing search, edits, combinations and conversation
derivations cannot discard workload constraints. Saved Home/attachment cards
show the exact monthly workload constraints beside the shared plan summary.

## Model projection

Selected-plan/read-plans, saved indexes, plan-conversation and nested working/
goal contexts use validated compact references. References identify the exact
snapshot, selected option, method, draft/workload revisions and dataset, and
retain all monthly rows (1–24), target/source/manager quantities, gaps/statuses,
training/cohort assumptions, readiness, cash/budget, provenance kinds, units,
unknowns and limitations. Indexes explicitly omit monthly detail and direct a
read of the exact plan. Full provenance basis text is explicitly omitted from
the reference, while it remains in the authoritative local artifact.

Raw snapshots, raw input/report fragments and equality/source keys are rejected
at nested context boundaries, including arrays and serialized source keys.
There are no raw reports, input artifacts or duplicate comparison drafts in the
reference. Digests use the existing bounded FNV-1a checksum convention: reference
identity, not cryptographic authorization; full replay is still mandatory.

The three-month synthetic snapshot is 118669 UTF-8 bytes; its compact reference
is 5283 bytes and selected-plan view 19118 bytes. Values depend on the artifact.
The existing 64000-byte plan-context, 120000-byte accumulated solution-context
and 65000-character tool-result limits remain intact. Oversized retained
contexts fail before completion; data is not truncated to fit. A synthetic
never-called completion callback verifies the oversized multi-plan escaped
context rejection without a provider/model request.

## Focused offline acceptance

The real store/component fixture uses fictional local storage and generated
standalone bytes. Only top-frame GET `http://127.0.0.1:3100/` is fulfilled in
memory; every other request is aborted. CSP and transport guards block services.
No HTTP server, Next runtime, production startup or browser policy change runs.

The persistence browser fixture covers desktop/mobile review cancellation,
store-revision rejection, complete save and goal association, actual page
reload, immutable edit history, repeated saves/routes, met-only local Apply,
goal/dataset isolation, attached-card constraints, compact subsequent context,
reflow and zero network/runtime errors. The existing 48-assertion UI fixture
retains editor/focus/cancellation/unknowns/interruption checks. Unit cases cover
full replay, tampering, unsupported methods, lineage, unknown cash/provenance,
selection/binding/tab races, idempotency, quotas, pure attachment proof,
projection entrypoints, raw-fragment rejection and the 24-month horizon.

Independent read-only review identified four defects (Home self-derived proof,
raw fragment leakage, forged lineage and generic combine previews); each was
fixed and re-reviewed without remaining scoped findings.

```sh
node --experimental-strip-types --test --test-isolation=none tests/workload-capacity.test.mjs tests/workload-capacity-ui.test.mjs tests/workload-plan-snapshot.test.mjs tests/workload-plan-store.test.mjs tests/home-plan-alternatives.test.mjs tests/home-plan-alternative-chat.test.mjs tests/local-decisions.test.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright/index.mjs node --experimental-strip-types tests/browser/workload-capacity-save.mjs
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright/index.mjs node --experimental-strip-types tests/browser/workload-capacity-ui.mjs
```

Exact-source browser receipts and screenshots are written under the printed
OS temporary output directory. Final committed-source checks are reported in
the handoff. Never run: provider/model/token-count diagnostics, diagnostic API
harness, database/auth/credential/billing access, production startup/deployment,
user desktop/physical device actions, merge or release. Full application runtime,
real provider conversation, physical devices and screen-reader acceptance remain
unrun. No operational staffing or measured goal progress is asserted.
