# Coordinated solution bundles: local foundation checkpoint

This branch starts from production `9d4e1f0dac522dd4dc3a044601bbef9a38f817bb`. The foundation is not connected to the Home UI, preparation endpoint or model transport yet. No live model calls, full-suite run or deployment form part of this checkpoint.

## Proposal contract

`home-solution-bundles.ts` defines one to three coordinated bundles, with up to six relevant components each. A bundle has an objective and a coordination statement. Components have stable local IDs, a relevant domain, a complete first step, existing Home source references, a proposed owner role, limitations and prerequisite IDs. The validator checks bounds, exact goal, source availability, unique IDs and an acyclic dependency graph. It does not prove relevance, factual accuracy or causal effectiveness. Fewer bundles, including an honest unavailable result, are valid.

There are no numeric model fields. The existing Home input envelope, its source catalogue and private-data boundary are unchanged. This foundation does not invoke the governed portfolio service. UI integration must separately review the bounded output-token allowance needed for the richer response; the existing action response allowance is not assumed sufficient for three six-component bundles.

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

## Integration acceptance still to implement

Show the actual option count and compact A/B/C comparison at the top. Every option is a coordinated bundle, with roughly six summary bullets and Details for components, assumptions, shared costs and dependencies. A pro/con may cite a verified comparable calculation; otherwise show its intended objective without declaring a winner.

Close each bundle with: “Want to change anything, including the assumptions? Tell me what you’d like to adjust.” Edit assumptions must route to that exact bundle/revision. Discussion routing must preserve typed text and bind the local selection safely; existing simple action-chip auto-send behavior must remain. No numeric local assumptions are automatically added to the model envelope. Do not render a promise of conversational editing before its handler is supported.

Attach solution to goal is a separate explicit action on the reviewed version. Subsequent changes stay drafts until an explicit replacement. Attached proposals never mean operational approval.

Remaining gaps: UI and transport integration; actual-count comparative summaries and edit routing; guided reconciliation when changing the component set; output-budget review; realistic bundle-prose QA. Multi-role optimization, source-team availability, automatic efficacy, and person-level assignments are outside this bounded implementation.

Focused validation: `node --test tests/home-bundle-foundation.test.mjs`, TypeScript, and ESLint on the new files. Broader tests, browser validation and publishing follow foundation review.
