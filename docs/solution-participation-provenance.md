# Conversation participation provenance

Model quantity, constraint, projection-basis, audience and turn-reference fields are interpretations. A turn ID identifies text; it does not confirm the model's reading of it. New numeric/text/boolean applications are illustrative. Reference quantities carry a checked value but their application to a new target remains proposed.

Participant count and participation mapping are independent. `audienceOf` proposes sharing. `participants: all` creates separate proposed memberships, never a shared cohort. Unknown count cannot hide confirmed overlap. Exact retained activities may preserve the applicable checked source mapping. Adapting an activity invalidates its membership and disjointness. A parameter edit may change a whole existing shared cohort's count without changing its checked topology; the new count remains illustrative.

Before calculation and save, code verifies membership against exact source activities; checks source cohort merge/split and mixed-source disjointness; and matches user-entered assumptions by field/target to checked inputs. Selecting a proposal or acknowledging unknowns does not confirm assumptions. The existing direct input editor is the authoritative explicit input path. Model-supplied final rejection is displayed as an unconfirmed interpretation; the explicit review control owns operative rejection state. Projection `spec.basis` remains a record of the model's claimed basis, with explicit unconfirmed interpretation and limitations, never a confirmation flag. Current constraints are proposed calculation limits, not authorization.

New evaluations and saved conversation operations receive provenance contract version 1 only after the boundary check. The marker is not user confirmation or a cryptographic trust token. Legacy conversation-derived sources remain readable but cannot supply inputs until reevaluated. The check follows saved ancestry, including non-conversation descendants. Stale/rejected working sources cannot be newly consumed; saving a same-ID refinement verifies the exact predecessor it consumed.

The shared Preview harness runs the participation assertion after each completed turn and before selection or another provider request. This checks structured ownership, not every natural-language claim. The proposed A/B run must also pause after every turn for semantic review before proceeding.

## Offline evidence

`tests/solution-participation-provenance.test.mjs` covers unknown/known count with unknown overlap, checked manual sharing, count-only edits, adaptation, different sources, rejected/canceled/stale sources, legacy ancestry, forged save state, interpreted rejection and same-ID refinement/save. `tests/fixtures/preserved-overlap-failure.json` preserves the complete fictional first-turn input and second tool result from the canceled run; the test replays the exact candidate arguments and rejects its former inferred sharing.

The older context-growth fixture is unchanged. Its helper now explicitly carries freshly reevaluated state/catalog between the preserved provider responses; it does not claim old confirmation flags or exact old calculations are accepted. The unchanged 120000-character guard remains in force.

No model call, deployment, endpoint, credential or production model change is part of this fix.
