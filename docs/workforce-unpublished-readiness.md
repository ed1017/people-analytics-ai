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
