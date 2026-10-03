# Proposed local search and lineage contract

Status: proposal, not a new persistence format or enabled product feature. Based on released source checkpoint `3a6a14dfb310193524dd24f0990ae3aac5fd15f5`. That branch remains unchanged; this contract and regression coverage live on a separate local branch.

## Exact missing callsite and runtime boundary

`components/workforce-solution-panel.tsx`, inside `Workspace`, calls:

```tsx
<WorkforceAlternatives
  solution={solution}
  evidenceResultId={result.id}
  input={review.input}
  blocked={dirty || busy || !currentResult || !!solution.pending}
/>
```

The supported optional property is `selection: WorkforceSelectionOffer` from `components/workforce-selection-handoff.tsx`:

```ts
{
  snapshot: WorkforceMixSearch;
  selectedIds: string[]; // one or two emitted, non-core, eligible alternatives
  verify: (context, snapshot, selectedIds) => Promise<StagedWorkforceMixSelection>;
}
```

There is no production producer of the `snapshot`, no range-confirmation/result-selection control, and no browser implementation of `verify`. The fixture host is not a product implementation. The actual verification already exists as `stageWorkforceMixSelection(context, snapshot, selectedIds)` in `lib/workforce-mix-selection.ts`. It synchronously calls `searchWorkforceMixes(solution, evidenceResultId, snapshot.spec)` in `lib/workforce-mix-search.ts`, replays all bounded calculations, compares the complete report and emits only proposal inputs. `searchWorkforceMixes` imports `createHash` from `node:crypto`; that dependency prevents a direct browser runtime import. `calculateWorkforceIncrement` itself is already used locally by the existing alternatives panel.

`AlternativeDrafts.selectionContext()` already assembles the context at the review boundary. A production host must obtain the same values independently from the current store, rather than accept a snapshot's self-reported source:

| Required value | Existing authoritative local source |
| --- | --- |
| `solution` | `readWorkforceSolution(decisionStore.getSnapshot().data.workspaces[activeGoalId].fields.workforceSolution)`; require saved storage, readable state and no pending run |
| `activeGoalId` | `snapshot.data.goals.activeId` |
| `activeGoalStatement` | The matching record in `snapshot.data.goals.goals`; must equal current saved solution scope text |
| `evidenceResultId` | The currently selected saved `single-role-workforce-review` result in `Workspace` (`workforceInspection` or latest result); require `solutionResultIsCurrent` |
| `expectedSearchFingerprint` | The last explicitly generated/displayed local search in this exact context, retained in temporary state; never an arbitrary imported proposal |
| `hasUnsavedPlanEdits` | Existing dirty/busy/current-result/pending guards, checked again immediately before accepting a result |
| Search specification | Explicitly confirmed Build/Move/Buy integer ranges, evaluation budget, output cap, filter, and `preserve-reviewed-path-totals-and-timing` policy |
| Selected candidate IDs | User selection from that report's emitted results, at most two |

All source calculations, role/BU scope and timing evidence are already present in the saved result and its referenced evidence. No external API, new data permission, database or model request is needed. No current role counts, readiness pools or ML output should supply implicit range bounds.

## Proposed implementation sequence

The verification rules and draft handoff are already defined. The **public search-settings interaction is not**: saved plan inputs contain a single mix, not approved search ranges, a chosen filter or consent to vary that mix. Copying fixture ranges or inferring them from candidate pools would manufacture planning assumptions.

Recommended contract for that missing interaction:

1. Add an explicit local comparison entry beside the existing alternatives review. The user enters/confirms each path's min/max within saved demand, sees that all non-mix totals/dates/backfills remain fixed, and chooses Compare saved assumptions locally. Do not run on mount, goal change or sidebar navigation. Do not default to broad ranges as if reviewed. Use existing hard limits of 1,000 evaluations including reference and 64 emitted results; show rejected over-budget ranges, filtering and omissions rather than widening bounds.
2. Display conditional results with existing calculator checks and unknowns. Preserve ascending enumeration order and the explicit absence of a preferred/best option. Choose one or two emitted constraint matches with known comparison metrics; core duplicates remain unavailable. Those selections produce the `selection` offer above. Merely selecting does not replace drafts.
3. Implement a browser-local adapter by extracting the pure source validation/enumeration/report construction shared with the Node facade. Use the same canonical JSON and SHA-256 bytes via asynchronous browser Web Crypto; retain the synchronous Node API for existing callers. Do not duplicate the calculator or replace fingerprints with a different checksum. Parity tests must compare entire Node/browser reports and staged inputs, not just totals. If Web Crypto is unavailable, show local verification unavailable; never fall back to a service.
4. Keep bounded work off the UI thread using a local module Worker that receives only the already-authorized saved planning context. It is local execution, not a server endpoint. Main-thread code re-reads source identity before/after each request; cancel/unmount/source change terminates the worker and discards replies using the existing generation contract. No worker starts until the explicit local action. Worker/hash portability is a technical implementation choice, not a reason to request data access.
5. Feed the result into the existing Review selected mixes → Replace alternative drafts → Calculate alternatives locally → Save reviewed alternatives flow. Keep approval separate. Do not import the SDK adapter or add a fetch route. On public activation, deliberately revise the release-boundary regression that currently requires no production selection property; retain tests prohibiting SDK/fixture/server transport and ML reachability.

This proposal does not implement steps 1–4 or assume a public launch decision. The next concrete implementation scope is the confirmed-range UI plus a shared browser/Node verifier with parity, cancel and budget tests; saved lineage can remain a separate reviewed increment.

## Minimal proposed persistent lineage, within existing storage

The existing field is `workspaces[goalId].fields.workforceAlternativeReviews`. Its strict `WorkforceAlternativeReview` v1 reader accepts exactly seven top-level fields: schema/kind/id/time, binding, revisions and comparisons. It rejects an extra lineage field. Silently attaching provenance today would make saved history unreadable; tests now demonstrate that refusal and preservation.

Propose a **v2 review record in that same existing array**, retaining the existing fields and adding `selectionOrigin: null | SelectionOriginV1`. Manual alternatives use null. Do not add a new top-level decision field, separate storage key, database table or migration that rewrites v1 records. The array still has at most ten reviews and a total 256 KiB cap including lineage; full/unreadable history is preserved without eviction.

```ts
type SelectionOriginV1 = {
  schemaVersion: 1;
  source: {
    goalId: string;
    solutionId: string;
    version: number;
    evidenceResultId: string;
    inputFingerprint: string;
    timingFingerprint: string;
    sourceResultFingerprint: string;
    evidenceFingerprint: string;
    dependencyFingerprint: string;
  };
  search: {
    methodVersion: "workforce-mix-search-v2";
    fingerprint: string;
    spec: WorkforceMixSearchSpec;
  };
  calculator: {
    name: "workforce-increment";
    methodVersion: "1";
    resultSchemaVersion: 1;
  };
  selections: Array<{ // 1–2, unique revision slots and candidate IDs
    revisionSlot: "revision-1" | "revision-2";
    candidateId: string;
    mix: {build: number; move: number; buy: number};
    selectedInputFingerprint: string;
    editedSinceSelection: boolean;
  }>;
  caveats: {
    feasibilityBasis: "entered-assumptions";
    operationalFeasibilityVerified: false;
    candidatePoolsAreAssignableCapacity: false;
    requiresExplicitReview: true;
  };
};
```

`source` can reuse the existing staged binding without duplicating raw source/evidence, employee data, goal prose, owner/approval notes or the unhashed dependency string. Source IDs point to the already-stored historical plan and evidence. `spec` includes the bounded settings and fixed-total policy; `mix`/input fingerprint disambiguate the selected option. Existing review ID/time identify this saving event, so a second lineage timestamp or new ID namespace is unnecessary.

**Calculator-version detail:** today's `calculateWorkforceIncrement` returns `version: 1`, but there is no independently declared algorithm-version constant. Do not pretend that schema number alone pins implementation semantics. Before accepting v2 lineage, declare/test a calculator method-version constant and require intentional increments on calculation-semantic changes. The proposed `methodVersion: "1"` names the current arithmetic; preserve unsupported historic versions read-only rather than replaying them with a different engine and claiming a match.

Proposed lifecycle rules:

- Keep origin temporary beside draft inputs after explicit replacement. No lineage or draft is written until Save reviewed alternatives. Calculate only builds a review preview; approval is untouched.
- Recompute/validate origin against its saved source version and evidence before saving. Match every slot's original candidate, counts and input fingerprint. Derive `editedSinceSelection` from full reviewed input equality; never trust a supplied boolean. An edited result is labeled customized from selection, and receives freshly calculated constraints rather than inheriting the original search's met status or bounds claim.
- Adding a manually entered second alternative creates no fabricated origin entry. Removing a draft removes only that slot's temporary origin mapping. Cancelled/replaced drafts never retain another option's provenance.
- A main-plan/evidence change blocks saving the stale draft/lineage. Existing historical v1/v2 reviews remain inspectable by their recorded source version; they are not upgraded to the active version and do not inherit approval.
- The reader accepts v1 unchanged and explicitly validates v2. Historical replay uses the saved referenced evidence and compatible calculator/search versions. Missing evidence, unsupported versions or tampering retains the original record with an unavailable/unverified explanation and disables a new save; it does not delete history or guess replacements.
- The sidebar can show Source plan version/result, search ranges/filter/limits, selected mix, calculator method, edited/unchanged status and conditional caveats from this bounded record. Full assumption/calculation inspection remains in existing reviewed inputs/comparisons, not a raw-data lineage duplicate.

Decisions represented by this proposal, rather than silently implemented: explicit range confirmation for public search; v2 review compatibility; and retaining immutable selection origin while allowing customized drafts. None requires external data or model access.
