# Recruiting launch versus planning start: isolated intake proposal

Based on verified intake-only checkpoint `f770cbdb70ebc9bacd574642c3ed02a7c4cbabdf`. Local branch: `local-intake-recruiting-contract`. The published cards/outcomes checkpoint `5212603cbca619dc80d375dfc084c016c9b6bbe5` and all existing branches are preserved. No new live request or retest budget was consumed.

## Proven facts

The parent reported one hosted retest failure with `invalid-model-proposal-4-recruitingStart-value-not-supported`. In the unchanged route, index 4 maps to “Proposed input is not grounded in the supplied planning statement.” The reported statement supplies a January 2027 planning start, a 12-month horizon and a December 2027 coverage deadline; it does not supply an explicit recruiting launch date. No returned value, model payload or provider log was available.

The existing request instructed the model to extract explicit values but did not explicitly distinguish `recruitingStart` from `planningMonth`. Its strict schema constrained date formats but supplied no field-specific timing descriptions. Deterministic mock proposals trying to derive a recruiting date from “starting January 2027” are already rejected by the validator, with the same field/reason classification. The mock dates and blank value used in tests are fabricated test inputs, not a reconstruction of the deployed response.

## Hypothesis and minimal proposal

The model may have confused the planning horizon start with recruiting launch, or otherwise proposed unsupported recruiting timing. The visible code alone cannot establish that inference or identify the returned value.

The proposed fix changes only prompt/schema descriptions: distinguish planning month, recruiting launch, employee arrival and required coverage; explicitly say that “starting January 2027 over 12 months” supplies only planning month/horizon; require explicit recruiting-launch intent and a complete quoted ISO date; omit the field and ask a clarification question when either is missing. Include one valid explicit-launch example without inferring hire arrival. Unknown timing is a valid partial proposal and must not be filled to satisfy a later calculator.

No output repair, inferred first-of-month date, response filtering, extra model turn or retry is introduced. Input, catalog, result and grounding validators are byte-identical to `f770cb`. Schema value patterns/enums and required fields are unchanged; only descriptions are added. Request projection, tools, retention, model settings and data authority are unchanged. Unsupported model proposals still fail the whole response closed, saving nothing.

## Local validation and retest boundary

15 clarification tests pass, including generic-month rejection, accepted omission plus a recruiting-date question, explicit ISO recruiting launch, unchanged unknown arrival/mode and preservation of saved timing. The full 414-test unit suite, lint, standalone TypeScript, production build and diff whitespace checks pass. There is no new UI change or live model result claimed by these tests.

Parent review comes before any separately authorized bounded hosted retest. Expected behavior is a tentative partial proposal with `recruitingStart` omitted/blank and a recruiting-launch clarification question. If the model again proposes unsupported timing, the existing fixed diagnostic must remain visible and nothing may be saved. Prompt compliance remains unvalidated until that authorized test; no success is guaranteed from the mocked tests.
