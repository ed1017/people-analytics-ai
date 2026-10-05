# Exact prompt acceptance checkpoint

This local follow-up preserves numeric/delivery-routing checkpoint `2b5a61db8fa94d4c30e21489ba84af2ec3b3f441` and Assumed-label checkpoint `d433f86b80e2d6af28e14b3f3af221eae6e2d723`. The supplied 941-character prompt is retained verbatim in `tests/fixtures/home-exact-acceptance.mjs`.

## Reproduced failure and bounded mapping fix

Before this change, the exact prompt returned no pinned reduction goal and routed preparation as diagnostic. The reduction matcher did not accept “annualized” between “company-wide” and “voluntary turnover”; the task matcher also missed singular “Action Plan alternatives.” The parser retained baseline 8.2%, the annualized period, 12 months, the $500,000 cap, existing HR and manager capacity, and company-wide scope. It did **not** independently retain the suffix “6.56% target.” Relative arithmetic happened to yield 6.56%, masking that missing explicit target. The failed reduction-goal match also prevented initialization of the existing-capacity flag, despite parsing the constraint correctly.

Earlier browser fixtures used shorter arrow/from-to prompts without that annualized adjective in the reduction clause. They neither replayed the supplied phrasing nor exercised its 800-character note boundary. The old note kept only the first 800 characters and cut the intervention-method instructions mid-sentence.

The pinned goal now preserves “Reduce annualized voluntary turnover by 20% relative within 12 months.” The explicit target is retained independently and checked against relative arithmetic; a contradictory target stays Unknown. Fresh assumptions retain the 8.2%/6.56% pair as user-entered, 12 months, existing capacity without added staffing, company-wide population and the cap as a constraint rather than spending. The average-workforce denominator remains Unknown.

Home pinning carries the complete prompt in the existing note fields as 694- and 246-character parts. Neither the 800-character per-note cap, the six-note requirement budget, nor the request envelope expands. The existing truncation flag remains for oversized content beyond the bounded parts. Tests assert exact reassembly after normalizing/classifying notes, including accepted-assumptions-not-company-facts and the final no-forced-methods constraint. Existing saved working drafts and attachment snapshots are not rewritten.

## Delivery response contract

The existing single preparation request now uses its resolved task stage in both schema selection and response validation. Fresh wire components declare `activity: delivery | diagnostic`. Delivery instructions require a concrete proposed practice/process/programme change and intended participants in `firstStep`; reviews, analysis and deciding whether to propose a later pilot are diagnostic. For an outcome request, every returned plan must contain a declared delivery component. One diagnostic-only plan rejects the response with `delivery_required`, explains the mismatch and preserves the goal and previous work without retrying or inventing a replacement. Diagnostic requests may still return diagnostic plans. Fewer/no plans remains valid.

Activity metadata is checked only on fresh responses and removed during normalization into the existing component representation. The stored bundle, assumption and attachment contracts are unchanged. Three explicit fixture proposals exercise manager conversations, career development/mentoring, and workload practices, each with supporting feedback review; the actual first-step text and dependencies survive normalization.

The activity declaration is model-authored, **not semantic proof** that prose describes real delivery. These checks distinguish declared diagnostic-only output from declared delivery, and verify mapping with meaningful fixtures; they cannot establish that a live model classifies honestly, proposes relevant actions, or meets the user's comparative effectiveness request. Fixed-head live generation and human review of the intervention content remain acceptance work. No keyword-based effectiveness test, extra model call or automatic relabeling is introduced.

## Validation

- 1,101 unit tests pass, including exact extraction, bounded note retention, independent target/conflict handling, request schema, production response normalization, diagnostic-only and mixed-plan rejection, and preserved legacy readers.
- 33 exact-prompt browser checks pass at desktop, mobile and 200%-equivalent reflow: pin → single intercepted preparation → all three cards → compare → reviewed attachment → reload; diagnostic rejection and reload also pass.
- All 495 baseline browser checks pass: preparation resilience 45, source-outage fallback 75, plan panel 36, accepted planning context 21, conditional what-if 48, unified attachment 117, goal clarification 18, composer 36, compact layout 57 and explicit rate pairs 42. Combined browser total: **528**.
- Lint, standalone TypeScript, production build and whitespace checks pass; browser tests run against the production build on port 3173. All data/model responses are intercepted synthetic fixtures. No live API/model calls, credential diagnostics, hosted mutations or merge.

## Separate queued work

The queued introductory-copy change is limited to inserting this exact sentence after the AI-purpose paragraph: “Use the left-hand menu to explore standard dashboards, or work with AI to build and tailor an Action Plan.” Leave the same existing intro and instructions language unchanged.

Guided Example alignment is separate and remains queued after core acceptance. Consolidate the example entry point and use the real workflow; do not manufacture proposals or equate three AI alternatives with executed optimization scenarios. No such follow-on code is changed here.
