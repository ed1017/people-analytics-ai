# Home recommendations as Action Plans

The Home solution conversation offers three distinct proposed Action Plans for a business decision or workforce objective, including ordinary requests such as “I want to reduce turnover.” It leads with a conditional recommendation, uses the current scope, and leaves team focus and deeper exploration optional after the proposals. Factual questions and focused refinements do not require three new alternatives.

An explicit follow-up such as “develop an action plan” uses the existing user objective and creates an evaluated proposal. Detailed explanation remains part of the answer; prose headings alone are not a substitute for the reviewable plans.

Each proposal uses the existing candidate and saved-plan contracts: objective, rationale, concrete activities, suggested owner roles, next step, success measure, dependencies, and typed assumptions. Timing can be a proposed dependency sequence when calendar dates are unsupported. Intended outcomes are not forecasts. Missing costs, headcount, capacity, dates, overlap and effect sizes remain unknown; three plans never imply three numerically feasible staffing mixes.

`evaluate_action_plans` checks one to three candidates with common constraints through the existing deterministic evaluator. A three-candidate batch consumes three of the existing six operations. The four model rounds, model policy, output limit and no-retry policy are unchanged. The batch validates identities, citations, retained provenance, response size and exact duplicate activities before recording the set. This duplicate check is not a semantic diversity or effectiveness score. Saved contracts and their versions are unchanged.

The model and review cards share current proposal labels and exact IDs/revisions. Compact Review controls navigate to the actual cards without selecting, saving or accepting assumptions. Natural chat can focus, refine or combine proposals. The existing explicit selection control saves the goal and attaches the proposal; operational Apply remains separate. Old versions and attached proposals remain intact.

Home keeps its existing instructions, practical starter prompts and guided example. The redundant business-objective/five-role launch panel is absent from the default view. Restoration and explicit legacy example handling remain mounted so saved examples can still be continued. Starter clicks continue to send directly without a required mode or pin.

## Local verification

`tests/home-action-plan-recommendations.test.mjs` exercises both regression examples, explicit follow-up context, unknown calculations, batches, budgets, malformed sets, natural focus, combination, refinement and explicit saving. `tests/browser/home-action-plan-recommendations.mjs` uses the actual client and actual route with synthetic model responses on desktop and mobile. It verifies review-card navigation, guide/data navigation, direct prompt sending, proposal rendering, selection, reload and preservation of saved plans.

These fixtures verify application contracts and interaction. They are not independent evidence that a live model chooses good recommendations or consistently follows the response policy.

## Proposed bounded model acceptance — not run

After separate coordination, use the existing model and request policy for two conversations and at most six submitted user turns: the digital-product/stretched-manager opener, its “develop an action plan” follow-up, a natural combination/refinement, the turnover objective, an optional team-focus follow-up, and an unrelated factual question. Keep the four-round and six-operation limits, with no automatic retries, no real employee records, no database writes and no automatic saves. Set an explicit spend cap before executing; stop on the first failed boundary.

Review actual tool receipts and prose together: three distinct usable proposals where responsible, a justified conditional recommendation, concrete owners/steps/timing/measure/outcome, proposals before optional focus, original-goal continuity, no unsupported numerical claims, current lineage for combinations, and deliberate review/save. Retain any failed execution as a failure; a fixture replay or rewritten expected answer is not independent model validation.
