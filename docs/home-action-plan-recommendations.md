# Home recommendations as Action Plans

The Home solution conversation answers substantive workforce or planning questions in this order: a short summary and conditional recommendation, three distinct proposed Action Plans, then optional further reading and investigations. This includes ordinary requests such as “I want to reduce turnover.” It uses the current scope and leaves team focus optional after the proposals. Further reading uses verified available evidence or links; when none is available, the answer suggests investigation topics or checks without inventing sources. Brief factual questions such as “What does FTE mean?” and focused refinements do not require three new alternatives.

An explicit follow-up such as “develop an action plan” uses the existing user objective and creates an evaluated proposal. Detailed explanation remains part of the answer; prose headings alone are not a substitute for the reviewable plans.

Each proposal uses the existing candidate and saved-plan contracts: objective, rationale, concrete activities, suggested owner roles, next step, success measure, dependencies, and typed assumptions. Timing can be a proposed dependency sequence when calendar dates are unsupported. Intended outcomes are not forecasts. Missing costs, headcount, capacity, dates, overlap and effect sizes remain unknown; three plans never imply three numerically feasible staffing mixes.

`evaluate_action_plans` checks one to three candidates with common constraints through the existing deterministic evaluator. A three-candidate batch consumes three of the existing six operations. The four model rounds, model policy, output limit and no-retry policy are unchanged. The batch validates identities, citations, retained provenance, response size and exact duplicate activities before recording the set. This duplicate check is not a semantic diversity or effectiveness score. Saved contracts and their versions are unchanged.

The model and review cards share current proposal labels and exact IDs/revisions. Compact Review controls navigate to the actual cards without selecting, saving or accepting assumptions. Natural chat can focus, refine or combine proposals. The existing explicit selection control saves the goal and attaches the proposal; operational Apply remains separate. Old versions and attached proposals remain intact.

Home keeps its existing instructions, practical starter prompts and guided example. The redundant business-objective/five-role launch panel is absent from the default view. Restoration and explicit legacy example handling remain mounted so saved examples can still be continued. Starter clicks continue to send directly without a required mode or pin.

## Local verification

`tests/home-action-plan-recommendations.test.mjs` exercises both regression examples, explicit follow-up context, unknown calculations, batches, budgets, malformed sets, natural focus, combination, refinement and explicit saving. `tests/browser/home-action-plan-recommendations.mjs` uses the actual client and actual route with synthetic model responses on desktop and mobile. It verifies review-card navigation, guide/data navigation, direct prompt sending, proposal rendering, selection, reload and preservation of saved plans.

These fixtures verify application contracts and interaction. They are not independent evidence that a live model chooses good recommendations or consistently follows the response policy.

## Proposed bounded model acceptance — not run

After separate coordination, first attempt two independent ordinary Home questions with fresh conversation state: the turnover objective and the digital-product/stretched-manager opener. The separate acceptance harness permits four provider calls globally, preserving the app's per-turn limits and model policy. Both questions may not finish if extra tool rounds consume the cap. Reserve a reviewed conservative maximum before execution; no automatic retries, extra followups, real employee records, database writes or saves are included.

Review actual tool receipts and prose together: summary and recommendation first, three current unblocked proposals with non-null checked drafts/results, concrete owners/steps/timing/measure/outcome, then optional reading/investigations/focus without invented sources or unsupported numerical claims. Semantic distinctness and usefulness require human review. Any live followup checks need their own later scope after reviewing these results. Retain failed execution as failure; a fixture replay or rewritten expected answer is not independent model validation.
