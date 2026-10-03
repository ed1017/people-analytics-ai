# Accumulated unpublished source review

## Scope and disposition

Reviewed locally against last pushed checkpoint `674a57cb62baeccf61a028171139d7a1b073743d`: synthetic ML evaluation (`80967c7`), deterministic search (`8a9c7ad`), selection adapter (`e2e5326`), and the explicit draft handoff in the commit containing this review. Preserved checkpoints remain separate branches. No push, PR, deployment, service request, credentials, database or settings changes are included in this review slice.

**Disposition: ready for source review with internal capabilities gated; not approval to enable public search, train a model, or make staffing recommendations.** The existing alternatives panel gains explicit temporary-draft cancellation, a clearer Calculate label, and stricter current-saved-source checks. The new search handoff has no production caller: `WorkforceSolutionPanel` supplies no selection or verifier. The standalone development harness is the only injected host, and its transport is entirely mocked. No new flag system or product test endpoint was added.

## Contract findings

| Finding | Result and evidence | Release consequence |
| --- | --- | --- |
| New selection could reset existing draft edits before acceptance | Fixed in this slice: the source/goal identity resets the panel; offer identity resets only the handoff. Desktop/mobile regression edits a draft before loading an offer and verifies it survives review/cancel. | No silent draft replacement. |
| Late replacement reply could consume a newer identical stage | Fixed in this slice: session requests return their own acceptance result; the handoff requires it. Unit and browser tests resolve newer selection before older replacement and verify no application. | Superseded/cancelled replies cannot apply drafts. |
| Same-ID evidence or selected result metadata could change without changing the old search binding | Fixed at `e2e5326`: method v2 includes full selected result and referenced evidence fingerprints. Unit checks mutate both metadata and evidence content. | v1 reports require explicit regeneration; no migration silently blesses them. |
| Browser source/verifier is not production-wired | Open by design. Search/selection remain Node-only. A trusted development injection calls the real adapter through Playwright interception. Product code cannot treat an arbitrary imported proposal or a client-reported hash as verified. | Block public search entry until a reviewed local verification path binds the actual active saved context and preserves bounded work and cancellation. No external service is required by this contract. |
| Saved alternative review does not retain search origin | The existing review stores exact edited inputs, source/version binding and recomputed comparisons. It does not store search bounds, selected candidate IDs or method fingerprint. UI does not claim those persist after edits. | Acceptable for an ordinary alternative review. If a future public release promises search audit lineage, define and test that retention contract first; never infer it from matching counts. |
| Operational staffing capacity is absent | All comparisons are conditional arithmetic with fixed reviewed path totals/timing; pool counts are not assignable employees. Backfills are not repaired, missing metrics do not pass selection, and nondominance is not a best-plan claim. | Block operational feasibility, automatic allocation and approval claims. |
| ML validation is only synthetic method validation | Manifest-only window freezing, observed-at-cutoff training eligibility, aligned scored IDs, independent baseline construction, missing/cancelled cohort accounting and failed gates were reviewed with tests. No learned candidate, authorized history, feature provenance, model selection or deployment exists. | Keep ML internal. Passing fixture gates cannot establish predictive accuracy or data authorization. |
| Local state is unsigned | Checksums/hashes bind content, not external authenticity. Complete malicious rewriting of source and report cannot be authenticated locally. Existing review recalculation and source checks reject inconsistent edits. | Do not describe content hashes or approval notes as proof of real-world authorization. |

No additional failing contract was found in the exercised scope. This is a code/test review of local behavior, not proof of production data quality or operational safety.

## Reviewed boundaries

- Search changes only Build/Move/Buy strings. Enumeration remains exhaustive within explicit bounds; calculator budget includes the reference; result filtering/capping cannot alter the Pareto comparison domain. Unknown costs, timing and feasibility stay unknown. Selection accepts only emitted, non-core, fully comparable constraint matches, at most two.
- Every selection is recomputed against current saved goal text/ID, input/version, selected result and referenced evidence. Replacement recomputes again. Source changes, edits, cancellation, destination changes and reload cannot carry stale asynchronous work into the next draft.
- Handoff updates React draft state only. Calculation, saving an alternative review and recording a version-specific approval remain separate existing actions. The original solution, owner fields, historical reviews and old approvals are preserved.
- Unrelated shared-state updates do not clear drafts. Saved alternative history is shared across destinations; temporary drafts are not silently persisted. Unreadable or full history still follows the existing refusal-to-overwrite behavior.
- No runtime import of `node:crypto` or Node-only search/evaluation was introduced into the client handoff: its relevant imports are type-only. Verification injection is a trusted code boundary, not a claim that arbitrary browser callbacks are authoritative.
- The cumulative diff contains source, synthetic fixtures, tests and documentation only. No API routes, database/schema files, credentials, dependency manifests/lockfiles, eNPS implementation/exclusions or deployment settings changed relative to `674a57c`. The named browser loader export fixes the earlier documented lint warning; it adds no dependency.

## Verification

- 372 full repository unit tests pass, including 27 focused selection/session checks.
- 50 real-component handoff checks pass at 1366px and 390px, using the actual local verifier with every request intercepted. They cover existing edits, stage/replace/cancel, edit/recalculate/save separation, two-alternative rejection, shared saved history, delayed replies, changed saved evidence/version, reload and unchanged approvals.
- 92 existing workforce workspace browser checks pass at desktop/mobile widths, including versioned approvals, historical evidence and corruption guards. All API responses are synthetic/intercepted; no external requests occurred.
- 24 existing planning lifecycle browser checks pass.
- Repository lint has zero errors/warnings; standalone TypeScript and genuine production build pass. Node's existing module-type warning and npm's update notice are not lint findings.
- Actual built CSS was used for the handoff responsive checks; mobile staged layout was visually inspected. No horizontal overflow or browser runtime errors occurred. The local test server was stopped afterward.

Logs: `/tmp/people-handoff-{focused,tests,browser,workspace,lifecycle,lint,typescript,build}.log`. Handoff screenshots from the final check are under `/tmp/workforce-handoff-eXK22h/`; existing workspace results/screenshots are under `/tmp/people-handoff-workspace/`.

## Next action

Stop feature expansion and review this cumulative source-only release against the boundaries above. The concrete unresolved implementation contract is the production-local source/verifier handoff; search provenance retention needs a decision only if the public history promises that lineage. Neither requires authentication work. Keep those entries gated until that release scope is explicitly chosen. ML/data/operational-capacity gaps remain separate and do not justify inventing data or expanding an AI envelope.

## Release disposition after `24363b9`

The user authorized one normal, non-force source push to a new `cloud-search-selection-review` branch in the same `ed1017/people-analytics-ai` repository. This supersedes earlier publication-pending wording for that branch only. It does not authorize PR creation, merging, manual deployment, authentication checks, model/data requests or changing the existing evidence-review/main branches. Repository preview automation may run independently.

The production-local verification gap is concrete: `searchWorkforceMixes` and `stageWorkforceMixSelection` use Node-only hashing and are not reachable from the production runtime graph. `WorkforceSolutionPanel` supplies no `selection` property. The handoff's `verify` function is a trusted host injection; only the development fixture supplies it, through a fully intercepted request to the actual local adapter. Before enabling public entry, choose and review a local execution mechanism that reads the active saved goal/input/evidence independently, replays the bounded calculation, handles cancellation/source changes, and cannot accept a proposal merely because a browser supplied a matching hash. No such production transport or execution mechanism has been specified, so adding one now would exceed release disposition. No endpoint or flag was added.

The lineage gap is also concrete: `WorkforceAlternativeReview` stores `binding`, `reviewedRevisions` and `comparisons`, with an ID/time/schema/kind. It does not retain search specification/bounds, selected candidate IDs, search fingerprint or method version. Once a user edits the staged draft, its recalculated review is an ordinary alternative; it is not necessarily still inside the original search bounds or constraint-match set. Existing UI makes no persistent search-lineage claim. If that claim is later required, define an immutable source-selection record, edited-versus-original distinction and stale-source/history rules before changing storage. No lineage schema change is justified for this source-only release.

Recommended split:

1. **Existing tested foundation — checkpoint `674a57c`, existing evidence-review branch retained.** Existing explicit review/calculation/retention UI, lifecycle fixes, bounded agent protocol, request/response contract and injected SDK adapter remain independently reviewable. Local fixture validation is not actual-model validation. Agent product invocation is still unwired: separate per-run revision permission, exact reviewed transmission scope, cancellation/current-version handling, explicit save and separately authorized actual-model semantic validation remain activation gates. This release does not change the established clarification API or expand its envelope.
2. **New internal source — commits after `674a57c`, new search-selection branch.** Synthetic ML evaluation, deterministic bounded search, recomputing selection adapter and the optional harness-tested draft handoff can safely be carried as gated code pending source review. Production search entry and verifier are absent; ML has no product caller, training or predictive accuracy claim. Capacity remains unverified. The only existing public-panel changes are temporary-draft cancellation, the clearer Calculate label and stronger source/currency checks.
3. **Do not activate with this publication.** Public search delivery, persistent search-lineage promises, live agent invocation, non-fixture ML experiments, new data acquisition and operational staffing automation remain separate reviewed scopes. Publishing code neither meets those gates nor authorizes those actions.

The 21-file cumulative implementation diff was reviewed for runtime reachability, UI exposure, ML claims, state mutation, synthetic-only fixtures and scope. No unrelated route, database, package/lockfile, eNPS/exclusion, settings or deployment change was found. The safe technical test gap was closed with three release-boundary regressions: production runtime graph isolation, an explicit non-injected production alternatives caller, and no transport/Node-verifier import in the client handoff. This is a guard against accidental exposure, not production wiring.

Final disposition checks: 375 full unit tests, repository lint and standalone TypeScript pass. No runtime implementation changed after `24363b9`, so its genuine production build and 166 desktop/mobile/lifecycle browser checks remain applicable; they were not relabeled as live-model evidence. Final test logs are `/tmp/people-release-{boundaries,tests,lint,typescript}.log`. Publication requires a final outgoing-commit source/held-path audit; scan output must report categories/counts only, never credential-like matches.

## Concrete local wiring and lineage proposal

See [local search and lineage contract](workforce-local-search-contract.md) for exact callsites, authoritative inputs, a no-service browser/Node verification approach, and the proposed v2 review extension within the existing `workforceAlternativeReviews` field. Existing saved evidence is sufficient: the missing product decision is explicit confirmation of search ranges, not authentication or additional data. Persistent lineage is not implemented because the current strict v1 codec rejects extra fields; the proposal preserves v1 history and the existing history/size boundaries rather than silently inventing storage.
