# Demand provenance and incomplete reviews

A quantity correction used to require byte-identical nested and outer basis objects. A valid edit could therefore fail when both objects named the same user turn and exact quote but explained that source differently.

The source identity is now the exact tuple `kind`, `turnId`, `quote`. Both bases are validated, and a quantity edit retains the outer change basis, including its explanation. Explanations remain descriptive, unverified metadata. This never upgrades an assumption into a workforce fact. Conflicting kinds, turns or quote spans still fail the entire edit. The schema now also makes the runtime provenance rule explicit: only user-supplied inputs carry a turn and quote; all other kinds require both fields to be null.

The audit covers the other duplicated identities at this boundary:

| Representation | Contract |
| --- | --- |
| Bound goal versus request goal | Exact ID and statement, independent of property order |
| Intake, dataset, revision and retained review | Existing exact identity and recomputed serialized-key checks remain |
| Retained and current user turns | Same ID cannot carry different text; identical repeated turns are harmless |
| Outer edit basis and nested quantity basis | Exact source tuple; outer explanation retained |
| Scenario role slice and each quantity scope | Exact scope match required for calculation; mismatch remains an incomplete review |
| Start, duration, hour denominators and counts | Existing date, period and range guards remain; absent values are not inferred |
| Model argument shape and runtime checks | Explicit user/non-user basis alternatives; only current-user edits are accepted |

No stored review, prior fixture, result or key is migrated. An old valid review is still read using its original bytes. Proposed values cannot borrow user provenance, and a conflicting turn ID cannot replace the text behind an earlier quote. Changes to time units, objective, dataset, role scope or omitted assumptions are not silently repaired.

The new `swp-managed-services-provenance-contract-continuation-v4` fixture preserves the historical v3 fixture. It permits an honest final `needs-inputs` review after the requested capacity edits. It returns the precise missing requirements and requires clarification, with `calculatedAcceptance` and `fullAcceptance` still false. A completed three-turn script is not a completed planning journey. Narrative usefulness and the focused clarification require separate semantic review. The driver adds no automatic user turn, retry, budget reservation, provider client, save or acceptance.

Synthetic regressions separately supply an explicit new user date and scope clarification to establish a calculable scenario. That is an offline arithmetic/contract check, not a model acceptance result. Historical failed runs keep their original status. No provider execution, live source changes, release binding changes or model validation is part of this patch.

Run `node --test tests/swp-*.test.mjs`, then the project TypeScript check and ESLint on the changed files. Exact operational reproduction receipts are deliberately kept outside the repository.
