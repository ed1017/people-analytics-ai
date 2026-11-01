# Market insights in conversation messages

## Requested behavior

The reader requested removal of the market card Close and Reset controls, plain-language interface labels, and real conversation messages instead of a separately mounted panel.

## Scope and contracts

- Local market interactions use the existing conversation message model. Each message owns its country, role and source result snapshot; later cards do not overwrite earlier ones.
- Opening and showing market insights do not call a model or modify saved planning records. Country changes clear an incompatible role and results.
- A scoped follow-up identifies the chosen message's country and role through the existing market lookup path. It does not attach sources to a position scenario or imply Finance approval.
- Source attribution, reference dates, synthetic distinctions, occupation/geography limits and required consent remain intact. Visible navigation, risk and planning labels use data, sources, assumptions and review details where those terms are accurate.
- Existing country and occupation coverage is unchanged. No source values, calculations, budgets, credentials or access settings change.

## Validation status

Implementation passed independent review: 23 unique focused checks. The complete focused set passed 33 tests; a separate risk/editorial regression set passed 32. The final Overview TypeScript graph has zero diagnostics. CI and staged/public browser acceptance remain release gates; this document does not yet claim publication. No paid model-answer acceptance is claimed.

Follow-up is limited to general chat without a saved plan, demand/task model, position planner or active scenario context. An explicitly selected card is checked before routing and after readiness. If its scope changes, submission is blocked and the draft is preserved; it cannot fall through to a planning command. Selecting a card does not itself send a question.

The supplied screenshot was resolved through Library metadata/text. Its supported image download failed; no claim of inspecting those pixels is made. Browser screenshots of the implemented interface provide visual acceptance separately.
