# Home search orchestration handoff

Local orchestration is implemented against an injected adapter. Shared Home entry points and numerical adapter files are unchanged until the numerical interface is available. Base: `33e98bb16515905f281e9304674d9fcfe0cfd054`.

```ts
type HomeMixIdentity = {
  goalId: string;
  bindingKey: string;       // Exact goal/evidence/planning binding.
  inputKey: string;         // bundleInputKey for the proposed working revision.
  bundleId: string;
  revision: number;
  preparationId: string;    // Frozen preparation identity, not a render timestamp.
};
type HomeMixRequest<Source> = {identity: HomeMixIdentity; source: Source};
type HomeMixAdapter<Source, Report> = {
  version: string;
  search(request: Readonly<HomeMixRequest<Source>>, signal: AbortSignal): Promise<unknown>;
  read(raw: unknown, request: Readonly<HomeMixRequest<Source>>, signal: AbortSignal):
    Report | null | Promise<Report | null>;
};
```

The numerical worker can keep its own public types and function names. A small final-integration wrapper will implement this interface. The `source` must contain all resolved assumptions and provenance, scope, timings, mappings, bounds, objective, cash/hour policy and calculator version, including meaningful unknowns. The coordinator deduplicates by the complete canonical content of adapter version, source and Home identity; it does not rely on a truncated hash or on numerical values alone. This internal key is never displayed or persisted. Domain report fingerprints remain the adapter's responsibility.

`search` must honor AbortSignal where possible and must not write local storage, saved solutions, revisions or attachments. `read` must verify source/report lineage, method versions, selection and feasibility claims against that exact source. Return `null` for invalid or mismatched reports. Valid `needs-inputs`, `not-applicable` and `no-feasible-candidate` outcomes can be members of Report; they must not be rewritten as feasible candidates. The coordinator's `ready` state means that a report is verified, not that a feasible option exists. Requests are capped at 256 KiB, reports at 2 MiB and the in-memory result cache at 12 entries by default.

`createHomeMixOrchestration` exposes `run`, `invalidate`, `dispose`, `subscribe` and stable snapshots. `run({trigger, request, isCurrent})` starts only for `initial` and `constraint-change`. Initial work starts automatically on the next task; changed constraints debounce for 250 ms by default. Duplicate pending requests share the same promise without resetting debounce. Completed results and failures deduplicate by full source identity, avoiding an automatic failure retry on rerender. Changed sources cancel immediately; cancelled promises settle even if a worker ignores abort. Late search and asynchronous validation replies are rejected. `isCurrent` must check active goal, evidence/planning context and current proposed revision at completion.

`useHomeMixSearch` exposes only state. Use a stable adapter object and an immutable request. It handles React Strict Mode, changed source, disabled context and unmount cleanup. Same-source explanation, Compare, Attach and passive renders neither start searches nor cancel valid current work. No search controls, network fallback or persistence effects are introduced.

Integration must connect initial prepared drafts and changed proposed constraints, using the latest proposed revision before Apply. A search result remains a candidate proposal. Apply/Attach retain existing review, atomic save, exact-source verification and immutable-history rules. Selecting a numerical candidate must use the adapter's verified candidate data, not editable display text. Final wiring belongs in agreed seams in Home components and worker dispatch; no such seams are modified in this patch.

Files owned here: `lib/home-mix-orchestration.ts`, `components/use-home-mix-search.ts`, their unit/browser fixtures and this contract. The numerical worker retains `home-mix-context.ts`, `home-mix-search.ts`, `home-mix-records.ts` and the shared numerical kernel. The separate answer/chart correctness reconciliation owns its existing Home evidence/answer seams. No concurrent edits to those files are required for this handoff.

Verification covers initial execution, full-source identity, debounce, in-flight and settled deduplication, switch-away/back, cancellation during search and report verification, uncooperative late replies, unknown/infeasible reports, bounded cache, unchanged saved history, and actual React hook behavior under Strict Mode at desktop, 390px and zoom widths.
