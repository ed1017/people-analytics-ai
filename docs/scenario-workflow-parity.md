# Guided scenario and conversational calculation parity

The guided popup holds a complete fictional Service Operations / Service Analyst draft. Previously, closing it removed that context. A bare 5-FTE question supplied neither its budget nor timing and used general discussion instead of the guided option search.

The popup now asks a prominent dynamic business question and offers **Continue this scenario in chat**. This explicitly carries the complete reviewed fictional draft into the main left-chat/right-calculation workspace. Both paths call `compareSwpDemo` / `evaluateHomeMix`, use the same option summaries, and retain the same selection/save transaction. Calculations are deterministic, not live AI. No assumptions are silently imported from a bare capacity question.

Changing assumptions requires review; changing a quantity in the question cannot silently reuse old inputs. A saved scenario remains intact when the user asks an unrelated question in general exploration. Queued transitions cancel on workspace, reset, input, dataset or navigation changes.

## Acceptance evidence

- 17 focused calculation, input, presentation and save/reopen tests, also published against the versioned source.
- 24 actual application-route regressions in the approved runtime checkout, including exact calculator parity, changed-quantity refusal and tampered draft rejection with zero provider admission. These use the approved runtime binding and are not represented as public-fixture tests.
- Production build and TypeScript passed with the deployed Home feature configuration; focused component lint passed.
- Independent review found and verified fixes for quantity mismatch, portal lifecycle, conversation isolation and stale queued transitions.
- Local compiled browser checks at 1440px and 390px: explicit continuation, exact option parity, reviewed budget change, conflicting question, save, unrelated headcount topic, reload and saved assumption reopening. Keyboard and overflow checks passed. Readiness was a local fixture; headcount used the actual deterministic route with the provider forbidden.

## Boundaries

Free-form prose is not automatically a complete structured scenario. Use the explicit continuation and reviewed input controls to obtain calculated parity. Missing pool availability, release, costs or timing remain assumptions; end-date staffing is not proof of whole-period capacity. No new credentials, permissions, database changes or paid calls are part of this repair. Historical cross-filter and multipart grounding gaps remain separate work.
