# Solution model/tool identifier contract

The protected fictional Preview run `ff3dacd6-0469-4ae0-ae4d-d9303530105e`
returned packet IDs in activity citations. The validator requires evidence-item IDs.
The preserved application arguments and result are in
`tests/fixtures/preserved-evidence-identifier-failure.json`; their original SHA-256
values are regression-checked. No provider internals or credential values are included.

The model context now includes the exact `actionEvidenceCatalog` used by validation.
Evidence reads include the matching catalog entries beside each packet. Schema and
instructions distinguish packet lookup IDs from citation IDs. Invalid new/adapted
activity citations return bounded structured feedback with exact allowed IDs before
constraints or working evaluations change. No alias inference or prefix repair occurs.
Retained activities still copy their actual source evidence. Direct evaluation and
save validation remain strict.

## Namespace audit

| Namespace | Authoritative identifier | Result |
| --- | --- | --- |
| Packet lookup | `currentEvidence.sources[].id` | Distinct from citation IDs; read tool still requires packet IDs. |
| Citation | `citationCatalog[].id` with source/location/scope/date | Catalog was missing from model context; now present in compact context and reads. |
| Saved source | Stable plan ID + `draft.revision` | Existing exact source checks retained. Display number is not an ID. |
| Working source | Candidate ID + outer evaluation revision | Existing checks retained; nested draft revision is a different identity. |
| Computed metric | Current tool's `verifiedMetricReferences` | Existing exact current-turn validation and stale-reference tests retained. |
| Candidate activity | Local activity ID | Dependencies and `audienceOf` refer to candidate activities; source activity refers to the exact source component. |
| Participant cohort | Exact group ID in source inputs | Found sole-group fallback accepted fabricated explicit targets. Fallback now requires null target; unknown explicit IDs and ambiguous null references fail. |
| Lineage | Exact source ID/revision and server-owned equality keys | Compact projection retains usable IDs and server validation; changed/deleted sources still fail. |

Regression coverage includes the preserved failed response, explicit test-authored
correction and selection, packet/item cross-use, fabricated/stale/unloaded/suppressed
citations, rejected-call state preservation, retained activity behavior, source
revisions, participant cohort/activity targets and bounded loop exhaustion.

The older context replay remains unchanged as a source fixture. Replay now explicitly
omits the one historical invalid-citation evaluation rejected by preflight and reports
that transformation. Other calculations and selection remain checked. It reaches the
third-turn continuation at 80,481 bytes, below the unchanged 120,000-byte guard;
no third final model answer is invented. These are offline checks, not real-model
acceptance. Four rounds and six tools per turn are unchanged.

## Proposed next verification (not reserved or launched)

Run only `goal-select-refine`, its original three fictional turns, on the reviewed
published fix. A future fresh reservation would be at most 12 count and 12 generation
requests: 12 × $0.081 = $0.972. With the accepted prior retained bound of $2.11896,
the temporary conservative ceiling would be $3.09096, under the existing $50 cap.
These are reservation/request envelopes, not billed spend.

Before a separately authorized launch, generate fresh run/reservation IDs, verify the
exact source manifest and upload inventory, and independently review the one-sequence
harness. Use the existing protected Preview build-only route and fixture-only loaders,
without new endpoints. Preserve verified chunked receipts; semantically review every
completed turn. Stop at first service/provider/budget failure, never retry an ambiguous
launch, and reconcile unused allowance only after complete terminal receipts. The other
four sequences remain pending until this initial path is stable. No provider call,
deployment or new reservation is part of this fix.
