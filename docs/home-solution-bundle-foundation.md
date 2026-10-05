# Coordinated solution bundles: foundation and Home integration

This branch starts from production `9d4e1f0dac522dd4dc3a044601bbef9a38f817bb`. The Home integration uses a single explicit preparation request, compact coordinated proposals, local assumption editing, explicit calculation and reviewed immutable attachments. No live model calls were made during implementation.

## Proposal contract

`home-solution-bundles.ts` defines one to three coordinated bundles, with up to six relevant components each. A bundle has an objective and a coordination statement. Components have stable local IDs, a relevant domain, a complete first step, existing Home source references, a proposed owner role, limitations and prerequisite IDs. The validator checks bounds, exact goal, source availability, unique IDs and an acyclic dependency graph. It does not prove relevance, factual accuracy or causal effectiveness. Fewer bundles, including an honest unavailable result, are valid.

There are no numeric model fields. The existing Home input envelope, its source catalogue and private-data boundary are unchanged. This foundation does not invoke the governed portfolio service. The new bundle response has a 5,000-output-token ceiling; the legacy action response remains at 1,800. A realistic three-bundle/eighteen-component fixture is 7,759 UTF-8 bytes. This is a byte measurement, not measured model tokens. Actual usage, prose quality and truncation still require hosted QA. The existing request envelope is unchanged; no automatic retry or fan-out is added.

## Local reconciliation

`home-bundle-reconciliation.ts` keeps explicit provenance for assumptions and a shared USD scope/horizon. Its initial capacity adapter uses the existing single-role calculator with an explicitly confirmed capacity requirement and explicit arrival assumptions. Additional component costs are reviewed one-time or monthly expense records. Their source identities are shared across components, never copied into separate component totals and then counted again.

- Canonical calculator cost lines enter the ledger once. Shared percentage allocations must total exactly 100%; largest-remainder cent allocation preserves the total without negative rounding artifacts.
- Complete budget requires reviewed cost coverage for every component and explicit reconciliation of shared versus distinct expenses. Unresolved overlap suppresses aggregate subtotals too. Unknown amounts remain Unknown, with only a reconciled known subtotal available where appropriate. Employee time stays separate from cash.
- A development flow can support both learning and mobility while counting as one internal transition. One flow per active capacity path is allowed. The same internal aggregate group cannot fund both development and moves; separate source groups require reviewed disjointness before combined coverage/budget. Only hires and explicit external backfills add planned company employees.
- Component groups are reused for shared populations. Unique participation requires complete component population review and known counts, plus reviewed disjointness when multiple groups are combined. Unknown overlap produces no unique-participant total. These counts are not company headcount.
- Reviewed dependency dates gate readiness. Cycles, out-of-horizon dates and prerequisite violations are rejected. Unknown predecessor readiness keeps dependent readiness Unknown. A paid hire arrival can precede conditional deployment; the two are not silently treated as the same milestone.
- Comparisons recalculate the current drafts, require matching exact goal/evidence binding, scope, horizon, demand and reviewed requirements, and expose only conditional cash or deployment-month differences. Incomplete comparable numbers produce no claimed winner. No retention effects, avoided exits, causal combined impact, savings or ROI are aggregated.

Synthetic acceptance example: one targeted hire plus one internal development/transition, manager/workload support, shared compensation uplift and execution review yields $58,000 incremental cash, $10,000 separate employee time, two conditional roles covered and one added employee. Training and compensation appear once in the budget; Finance and execution are coordinated reviews, not assigned people or operational approvals.

## Goal attachment and preservation

`home-bundle-records.ts` writes only a new browser field, `homeSolutionBundlesV1`, bounded to 192 KiB with at most twelve drafts and twelve attachment snapshots per goal. The surrounding decision store retains its existing limits. No existing action draft, calculated option pin, goal or chat field is converted or overwritten.

Save draft does not attach a solution. Attach requires confirmation of the exact binding and input revision; unresolved assumptions require explicit acknowledgement. Attachments retain a deep snapshot of the proposal, inputs, provenance and recomputable result. Later edits create draft revisions; explicit replacement creates another immutable attachment with a predecessor link. Reload validates snapshots, rejects tampering, preserves old records on failure and labels changed context or draft versions separately. Proposal-text edits preserve entered values but reset combined cost, dependency and comparison review. Adding/removing components is blocked pending explicit reconciliation of their assumptions rather than dropping values silently.

## Integrated interaction and remaining acceptance

The UI shows the actual option count and compact A/B/C comparison at the top. Every option is a coordinated bundle, with roughly six summary bullets and Details for components, assumptions, shared costs and dependencies. A pro/con may cite a verified comparable calculation; otherwise show its intended objective without declaring a winner.

Each bundle closes with: “Want to change anything, including the assumptions? Tell me what you’d like to adjust.” Edit assumptions must route to that exact bundle/revision. Discussion routing must preserve typed text and bind the local selection safely; existing simple action-chip auto-send behavior must remain. No numeric local assumptions are automatically added to the model envelope. Do not render a promise of conversational editing before its handler is supported.

Attach solution to goal is a separate explicit action on the reviewed version. Subsequent changes stay drafts until an explicit replacement. Attached proposals never mean operational approval.

Remaining gaps: provenance-labelled starting assumptions (new numeric fields currently begin unknown); guided reconciliation when changing the component set; actual model-token and realistic bundle-prose QA. Multi-role optimization, source-team availability, automatic efficacy, and person-level assignments are outside this bounded implementation.

Validation: 779 unit tests; lint, TypeScript and production build; 48 coordinated-bundle, 84 existing capacity-flow, 57 existing retention-flow, 53 docked-layout and 42 auto-send browser assertions. Browser endpoints are synthetic/intercepted and cover desktop, mobile and 200% reflow. Calculated snapshots are saved separately from draft revisions, and stale calculations remain reference-only. Valid empty proposals do not offer a preparation button that would only reopen their cache.

## Instrumented preparation and output-contract audit

Preparation failures now expose only a fixed stage: API failure, incomplete output, JSON parse, schema/reference/dependency rejection, byte limit, invalid context, client transport/response or local storage. No exception details, model prose or credentials are returned. The original hosted generic failure cannot be classified retrospectively; these stages support a subsequent explicitly authorized normal QA request. No retries, input changes, prompt tuning or token increase were added.

Unique A/B/C IDs are stable record keys, not presentation order. The UI assigns Option 1/2/3 by array order in the cards, editor, comparisons and discussion. Unordered or single-B proposals remain valid; duplicate IDs remain invalid. Saved records retain their original IDs. Optional unavailable-reason metadata follows the schema's nullable contract, including an honest empty result with no supplied reason. Bounded first-step text is preserved rather than rejected based on trailing punctuation. Question count/length constraints are represented in the response schema as well as checked locally.

Remaining local guards intentionally go beyond structural schema: unique IDs/names, unique source references, existing dependency targets and acyclic graphs, nonblank meaningful strings and the 32-KiB byte limit. Valid reference identity establishes neither relevance nor causality. Focused fixtures exercise the production decoder and a schema-valid unordered-label reproduction; browser checks verify display order and saved identity independently.
