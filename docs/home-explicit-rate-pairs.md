# Explicit turnover rates and delivery-task routing

Local follow-up to the live acceptance failure on `4dca2ed`. The reported accepted pair was 8.2% → 6.56%; the original fully clarified prompt has been requested but was not supplied when these reproduction cases were written. These are explicit notation regressions, not a claim to have replayed the unseen prompt verbatim.

## Numeric failure

The old initializer recognized a few baseline-label patterns and an explicit relative-reduction percentage. It had no baseline/target arrow or from/to parser, and no explicit target field in the retained planning intent. For example, `Reduce voluntary turnover by 20% relative within 12 months (8.2% → 6.56%).` produced baseline null; initialization then used the illustrative 15% baseline and its 12% relative target. The same loss occurred for `from 8.2% to 6.56%`.

The local parser now retains explicit percentage pairs, decimal baseline/target labels, and an explicitly stated annualized/YTD period. The explicit target is reconciled with a stated relative reduction to six decimal places. Contradictory or out-of-range rates stay unknown instead of being replaced by demo values. “A target of 20% relative reduction” is not treated as an absolute 20% turnover rate. Arrow direction supplies baseline then target; it does not assert a percentage-point or causal effect.

Fresh draft initialization keeps accepted numbers as user-entered assumptions, leaves the average-workforce denominator unknown and keeps the cap separate from expenses. Existing saved drafts, edited assumptions and attached snapshots are not rewritten. A saved draft with older illustrative numbers requires explicit review/editing; a preparation record without a saved working draft can initialize using the retained notes on reload. Rates absent from the existing bounded notes cannot be recovered by parsing.

## Intervention request

The existing BundleComponent contract can represent actual delivery tasks through unrestricted bounded `firstStep`, `name`, `ownerRole`, `dependsOn` and `limitation` fields. `tests/home-bundle-delivery.test.mjs` validates a proposed manager-toolkit/coaching pilot and supporting feedback review against the current schema and reader. There is no schema restriction to the discovery investigation catalogue.

The generation gap is task compliance: prior general instructions asked for delivery, but nothing reliably enforced semantic delivery intent. The existing preparation request now prepends a context-specific task instruction for outcome requests, including an original outcome note carried under a diagnostic discovery title. It explicitly requires a concrete proposed practice/process/programme change and says segmentation, triangulation, signal/hypothesis and capability/mobility reviews alone are insufficient. It permits fewer/no options, requires unproven-effect qualifications and preserves user constraints. No input field, response field, data access or extra model call is added.

This is a routing/instruction correction, not verified live generation success. There is still no machine-verifiable semantic delivery discriminator in the current output contract. Keyword rejection would risk rejecting a genuine pilot with preparatory review or accepting an analysis prefixed with “run”; this patch does not pretend that such a heuristic proves delivery. The live model must still demonstrate concrete intervention proposals before acceptance.

## Validation and hold

Synthetic browser regressions carry the full notation test prompt through Pin and the single normal preparation request, then inspect all three cards, comparison, explicit reviewed attachment and reload at desktop/mobile/200%-equivalent reflow. No live model or credential request runs. The exact worker prompt and fixed-head live proposal-quality result remain required. No push or merge is performed by this checkpoint.

## Queued separate Guided Example checkpoint

After core numeric and live delivery acceptance, audit the existing adjacent “Try a guided example” and “Build AI capability without net headcount” entries and consolidate to one “Try a guided example” launch button. Use the real prompt → Pin → meaningful Action Plans → compare/chat edit → Apply changes → Attach Action Plan workflow, one next step at a time. Preserve the three panel actions. Do not build a parallel fake flow or manufacture three proposals. If actual scenario evaluation is required, choose a supported added-capacity example and show only the deterministic executed count; three AI proposals are not an optimization/scenario-run count. No Guided Example code is changed in this checkpoint.

Validation at this local checkpoint: 1,096 unit tests and 495 browser checks (42 explicit-rate cases plus the 453 combined regression checks), lint, standalone TypeScript, production build and whitespace checks passed. Browser responses are intercepted synthetic fixtures; delivery generation quality and the exact as-yet-unsupplied worker prompt remain unverified.
