# SWP recommendation-first conversation

This bounded behavior revision starts from main `48d1b006afd24e0ccf93386c2507ed103b2f392d`. It is separate from PR186's starter-copy changes and leaves all five current-main starter strings and per-topic assumptions unchanged. The frozen v5 branch/real-AI fixture is untouched.

## Behavior

Within an established SWP conversation, `lib/home-strategic-planning.ts` now directs the model to lead with a useful grounded or clearly conditional recommendation, a brief reason and a concrete next move. Deeper exploration follows only when useful. Missing evidence can support a recommended next check or a clearly labeled premise, not invented numeric outcomes. Alternatives and a hybrid are considered when work, timing and constraints justify them; there is no fixed hire/train recommendation, mandatory mix or response template. Chat stays primary; no automatic assumption editor or form.

The recommendation adapts to follow-ups about both options, cost, timing, another team, partial agreement or corrections. Partial agreement applies only to the stated conversational premise and does not accept every input, verify a source or save a plan. Assistant-proposed assumptions stay labeled. Existing review, calculation, goal and save workflows retain their explicit intent and provenance checks.

Previously, a reply such as "Or how about both?" cleared the bounded planning context because it had no topic keyword. Continuation now requires an established user-authored SWP opener and a preceding assistant answer. It recognizes referential response forms, bounded whole-response comparisons, elliptical alternatives, numeric corrections, and named partial selections that refer to the preceding answer. Matching a pronoun anywhere in a question is insufficient; unrelated clauses such as “for my wedding” do not retain context. Deliberate “we/I need to…” objectives keep their original workflow classification. The answer supplies an antecedent, not evidence. These forms never start planning from an isolated keyword or assistant-only history. New subjects such as "this movie", "both recipes" or “both teams at the football match”, unrelated questions and explicit topic changes terminate the guidance; later comparisons cannot revive it. No new persisted state or semantic classifier/provider call is added.

The existing Home transport still supplies only the latest eight actual user/assistant history turns. A single optional `planningObjective` scalar on the existing in-memory scoped history ref retains the exact recognized, user-authored starter objective (at most 240 characters) after an answer. This carries the objective across longer conversations without replaying the visible transcript, reading saved/archive messages, enlarging model history, carrying source values or accepting plan inputs. An internal interpretation marker supplies the antecedent omitted before the truncated window; it never enters model history. The source packet carries the still-active objective with an explicit conversation-only label, never as verified evidence or an accepted plan.

The scalar follows the existing evidence/persona/context key and history lifecycle. New problem, goal edit, goal activation, reset, storage recovery and reload clear the existing scoped ref; no archive or saved-goal context restores the objective. Topic changes and unrelated questions clear it, and later comparisons cannot revive it after the topic-change turn leaves the eight-turn window. Local-only accepted plan edits and export/download replies clear it explicitly. Deliberate new goals retain their existing workflow classification and terminate objective carry.

Home requests preserve `planningObjective` property presence: a recognized exact starter enables bounded interpretation, explicit null/invalid input authoritatively clears it even if the eight-turn model window still contains an older opener, and an omitted field preserves compatibility with earlier callers. Saved `goalContext` never seeds this field. The calling UI always sends the current scalar or null. No new persistence or provider call is introduced. Older budget, availability and timing values outside the window are not carried; ask again rather than manufacture or verify missing inputs.

## Optional Planning Calculator handoff (lane `01a11d44`)

The calculator/modal implementation is owned by the separate routine lane, not this change. The chat-side contract is a strict boolean `planningCalculatorAvailable` on the normal Home request. Omitted, false or string values do not enable the invitation. The Home normalization preserves only `=== true`; the hint changes optional wording, not tool permissions, data scope, assumption provenance, acceptance, calculation or save state.

Set true only when the calling UI supplies an actual optional popup control suitable for the current discussion. When false (current main has no attached Home popup), the model may invite rough people/budget/timeline inputs in chat and must not offer a calculator link or promise an update. When true and refining assumptions would help, the guidance permits the exact invitation:

> Have a rough idea of your available people, budget or timeline? Tell me in chat, or open the Planning Calculator.

Placement is after the recommendation, rationale, concrete next move and stated assumptions. It is contextual and optional, not appended after every message. The model must never invent a link, new tab, supported field, calculation, or form-opening action. The typed CTA does not execute anything. Opening the UI control must be an explicit click handled by the owner lane's local popup callback, preserving conversation, current draft/review inputs and their provenance. Closing/canceling must return to the conversation without navigation; opening cannot accept assumptions or save a plan. The owner lane implements and tests that popup behavior, including current-context binding and field/calculation support. This PR supplies no modal, navigation, field, popup event or automatic opening.

The owner lane can import `planningCalculatorInvitation` for matching UI wording and send the availability hint when its control is mounted. It must retain the normal chat-first send path and all explicit review/save guards. No instructions or fixture on the frozen `6adf0a9` acceptance source are changed by this contract.

## Local verification

106 tests passed across:

```sh
node --test tests/home-planning-continuation.test.mjs tests/home-strategic-planning.test.mjs tests/contextual-prompts.test.mjs tests/home-starter-goals.test.mjs tests/home-conversation.test.mjs tests/home-route-schema.test.mjs tests/home-planning-intent.test.mjs tests/home-user-goal-intent.test.mjs tests/home-plan-integration.test.mjs tests/home-plan-revisions.test.mjs tests/home-plan-what-if.test.mjs tests/home-forecast.test.mjs tests/chat-context-history.test.mjs
```

The new multi-turn cases cover all five SWP objectives and: both (including both hiring and training), cheaper, sooner, a different team, partial acceptance, numeric/budget correction and missing figures. Negative cases cover missing objective, assistant-only antecedents, nonplanning chat, genuine topic changes and later attempted revival. Existing deliberate goal/plan/review/calculation/save routing and plan/forecast regressions pass.

The actual POST harness adds 52 requests with empty, explicitly unavailable and sparse source packets plus nonplanning/topic-switch cases. It confirms unchanged model, `tool_choice: none`, answer-only envelope, normal history, recommendation-first scoped guidance and retained proposed-assumption labeling. A deliberately unavailable source's numeric sentinel is excluded from the model input. Deliberately unsolicited goal/question fields are suppressed. The harness forbids network and uses synthetic replies: it validates the request/transport contracts, not generated recommendation quality.

The continuity extension adds permanent all-five-objective cases across 16 exchanges, including both, budget, timing and corrections; actual POST tests run a rolling bounded window through twelve continuations and a topic clear that later leaves that window. Key/reset/recovery, explicit goal, local authoritative null, invalid input and stale saved-goal cases cannot rebuild the objective. All model histories remain at eight actual turns and internal markers are excluded.

Final source passed ESLint for all four changed TypeScript files, `git diff --check` and `npm run build -- --webpack`, including all six reproducible prebuild artifacts and TypeScript. The actual Home browser run passed 350 assertions and 124 mocked chats across 1844/1366/390/320px, including twelve continuing exchanges, a topic clear that leaves the eight-turn window, reset, navigation and reload. Auto-send passed 42 assertions across desktop/mobile/200% reflow, including draft preservation, errors, goal switches and stale responses. The fixture CSS reader supports both webpack and Turbopack output. Independent review approved the continuity extension and independently passed 46 focused tests. The calculator/modal implementation remains owned by the calculator lane. Integration must retain this objective field alongside its existing strict `planningCalculatorAvailable` boolean; `ask` now receives the optional objective as its last argument and successful current responses use `completeHomePlanningTurn`. Do not replace the ref with archive-derived state. No provider, database, merge or production deployment actions were performed.

## Required real-model acceptance

No paid/provider evaluation was run. Local tests do not establish that the fluid conversation package is complete. The unchanged frozen v5 evaluation remains distinct from these proposed semantic checks:

- For conditional support demand, lead with a useful recommendation (for example, a conditional training pilot for repeatable work with sufficient lead time, versus specialist coverage for urgent work), its reason and a next action. Do not claim observed tickets, spare people or a calculated hire count.
- On "How about both?", stay with the objective and explain when complementary responsibilities justify a mix and when onboarding/training burden defeats it. Do not invent a ratio or pad options.
- For recruiting under manager constraints, recommend an appropriate conditional sequence and next check rather than treating headcount as onboarding capacity. Explain the tradeoff and avoid unsupported recruiting/manager calculations.
- When the user changes cost, deadline or release/team constraints, adapt the recommendation and explain the change. Keep corrections and partial agreement scoped; sources do not become verified and plans do not become saved.
- With unavailable sources, recommend the next concrete step conditionally and identify the evidence boundary once. Never imply an unsupported tool ran. Useful optional exploration may follow the recommendation; an answer that only explores missing inputs fails.
- Run longer than eight-turn comparisons, budget/timing corrections and topic changes; confirm carry and clear match this contract without recalling expired inputs.
- Preserve ordinary factual chat, explicit topic changes and intentional review/save behavior. Evaluate these together with qualitative advice, not only calculation/schema/persistence success.

Logs: `/tmp/pr187-continuity-regression.log`, `/tmp/pr187-continuity-lint.log`, `/tmp/pr187-continuity-build.log`, `/tmp/pr187-continuity-pointer.log`, `/tmp/pr187-continuity-auto-send-final.log`. Browser artifacts: `/tmp/pr187-continuity-pointer`. The preserved pre-validation salvage patch is `/tmp/pr187-continuity-salvage.patch`.

The unavailable screenshot is not used as evidence. This revision follows the exact typed instructions and inspected code.
