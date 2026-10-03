# Implemented browser-local scenario search

This local implementation follows the explicitly authorized bounds/search/lineage contract after `1b6f97b`. It is not pushed, merged or deployed. Published checkpoint `3a6a14dfb310193524dd24f0990ae3aac5fd15f5` and earlier branches remain unchanged. The preceding proposal and release-split documents describe earlier checkpoints; the runtime wiring and lineage gaps are implemented here.

## User behavior

The existing goal-owned alternatives panel now offers a bounded local comparison against its selected saved calculation. All six Build/Move/Buy bounds start blank. An optional Use saved mix as exact bounds action copies the current reviewed counts, labels their source and still requires explicit confirmation; it does not infer availability. Each input must be a nonnegative integer within saved demand with minimum no greater than maximum. Before Run, the panel shows the exact number of count combinations that sum to demand and the evaluation count including its reference. Impossible combinations and more than 1,000 evaluations are blocked. The fixed technical output cap is 64; UI results include all statuses with no hidden constraint filter.

The confirmation explicitly covers the bounds and unchanged non-mix cost/timing assumptions. Editing bounds clears confirmation, results and pending selection. No search starts on mount, goal change, sidebar navigation or reload. Changing source, introducing unsaved main-plan edits, or cancellation terminates in-flight local work and invalidates late replies.

Results show incremental cash, employee-time value separately, added employees and conditional coverage month. They explain saved path totals, fixed dates/backfills, missing information, nondominance and truncation. Counts are assumptions, not candidate-pool capacity. There is no universally best or automatically preferred option. Selection accepts at most two emitted non-core options that meet entered constraints with known comparison metrics.

Review selected mixes recomputes before displaying the offer. Replace alternative drafts recomputes again and replaces only temporary draft inputs after the explicit action. Incoming offers and Cancel selected mixes preserve existing edited drafts. Calculate alternatives locally and Save reviewed alternatives remain separate actions; neither approves or replaces the original saved solution. Draft edits invalidate the previous comparison. Cancelling a calculation stops its worker; cancelling draft edits removes temporary origin and preview, not saved history.

## Shared calculation and local execution

- `lib/workforce-mix-search-core.ts`: one source-validation, preflight, enumeration, calculator, trade-off and report implementation for both runtimes.
- `lib/workforce-mix-search.ts`: synchronous Node SHA-256 facade, retaining existing call signatures.
- `lib/workforce-mix-selection-core.ts`: common source/goal/request checks and complete replay comparison before staging.
- `lib/workforce-mix-selection.ts`: synchronous Node selection facade.
- `lib/workforce-local-search.ts`: asynchronous browser Web Crypto hashes over the exact same canonical JSON, plus local selection and v1/v2 review verification.
- `lib/workforce-search.worker.ts` and `lib/workforce-search-client.ts`: one bounded local operation per module worker. Completion, error and abort terminate it. Already-aborted calls create no worker; duplicate/late replies cannot settle an operation twice. No fetch, SDK, database, service fallback or storage access lives in the worker.

Standard `new Worker(new URL(..., import.meta.url), {type:'module'})` works with the existing Next build. No build configuration, dependency, security setting or endpoint was changed. If local worker/Web Crypto execution is unavailable, the app reports it and retains saved records; it does not fall back to a remote service. The worker receives only the existing saved planning context in browser memory. Returned lineage adds hashes/references, not raw evidence or private notes.

Current context is re-read from the existing decision store: active goal ID/text, saved plan/version, selected current evidence, dirty/pending state and generated search fingerprint. Synchronous store subscriptions invalidate work even across batched goal transitions. Source identity is checked again before showing a result or writing the explicitly saved review. History is re-read before retention; a concurrent history change is refused rather than overwritten.

`workforceIncrementMethodVersion = 'workforce-increment-v1'` names current arithmetic independently of result schema `version: 1`. Search reports are now method `workforce-mix-search-v3` and include the calculator descriptor; their fingerprint includes both versions. Older search reports must be regenerated explicitly. No calculator arithmetic changed during this refactor. Version increments are required for future semantic changes.

## Lineage in the existing review record

There is no new decision-storage field/key. The existing `workforceAlternativeReviews` array can contain unchanged v1 manual reviews and v2 search-derived reviews. Existing v1 data is not rewritten. A v2 entry has the same base ID/time/kind/binding/revisions/comparisons and one `selectionOrigin` object:

- Schema version 1 and source binding: goal/solution/version/result references plus input, timing, full result, referenced evidence and dependency fingerprints.
- Search method, fingerprint, exact bounded specification and calculator descriptor (`name`, algorithm `methodVersion`, result schema version).
- One or two origin entries: zero-based revision slot, original candidate ID/count mix, and a derived `editedSinceSelection` flag.
- Fixed caveats: entered-assumption basis, operational feasibility false, candidate pools not assignable capacity.

The minimal implementation omits the proposal's redundant selected-input hash: original input is deterministically reconstructed from the referenced source plus selected mix, and all fields are compared during replay. Calculator metadata sits with the search descriptor. No raw source, employee data, goal prose, unhashed dependency text or approval/owner notes are added to origin.

Origin stays temporary until explicit Save review. Editing can produce a customized alternative outside its original bounds or matching-constraint set; the edited flag is derived, and only the new comparison's checks apply. Adding a manual draft fabricates no origin entry; removing a draft removes its temporary slot mapping. Original saved plan, approvals and prior reviews remain untouched.

`readLocalWorkforceReview` delegates v1 to the existing reader and fully replays v2 through Web Crypto and the deterministic search. After reload, a saved v2 entry offers Verify saved review locally before presenting its lineage as checked. Unsupported versions, missing/changed evidence or tampering show unavailable/unverified and preserve the original record. This asynchronous verification is necessary; the old strict v1 reader never silently accepts v2 fields. Older published clients therefore retain unknown v2 records and refuse incompatible writes rather than dropping lineage.

The existing maximum ten reviews and 256 KiB combined history limit include lineage, with no automatic eviction. Explicit retention validates the new entry and all existing entries, rejects duplicate IDs, and checks current binding before returning a new array. The caller alone performs the established explicit decision-store write.

## Historical reconstruction fix

Testing a saved v2 review after a *newer completed calculation* exposed a pre-existing historical-read bug: truncating the version list while leaving future runs/results/approvals made the reconstructed graph invalid. `workforceSolutionAtVersion` now filters those future graph entries in a read-only copy. Evidence snapshots and the original stored state remain intact. Both ordinary alternative and agent-history readers use the helper; unit and browser regressions verify v1/v2 inspection after later calculations and approvals. This is a history correctness fix, not new agent activation.

## Verification and remaining gates

Validation covers full Node/Web Crypto report and proposal equality, 990 mixes/991 evaluations, invalid/impossible/over-budget bounds, source changes, calculator method pinning, v1/v2 mixed history, customized lineage, tampered fingerprints/settings/methods/slots, byte/count limits, cancellation and deliberately late worker replies. Desktop/mobile tests use real browser workers and actual built CSS. The built Next app is also tested with synthetic API responses intercepted; its real worker assets load and perform search without API requests.

Final results: 406 full unit tests pass; 58 browser-local search checks pass at 1366px and 390px; 50 staged-handoff checks pass; 98 existing workspace checks, including built-worker smoke checks, pass. Lint has zero errors/warnings; standalone TypeScript and the genuine production build pass. Logs: `/tmp/local-search-{focused,tests,browser,handoff,workspace,lint,ts,build}.log`. Responsive screenshots: `/tmp/workforce-local-search-l24zEG/`; built-workspace screenshots/results: `/tmp/local-search-workspace/`.

Remaining release gates are review of this unpublished implementation and deployment/browser compatibility review in the eventual target environment, not missing data or authentication. Offline ML remains synthetic evaluation only and is still unreachable from product code. Live agent invocation, expanded model transmission, real staffing capacity, actual personnel actions and automated approvals remain outside this change. No external APIs, authentication checks, credential inspection, database writes, new data, settings changes or push/merge/deployment were performed.
