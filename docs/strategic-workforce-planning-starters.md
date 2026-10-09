# Strategic Workforce Planning starters

Home’s former “Skills & growth” suggested-prompt category is now “Strategic Workforce Planning”. Its five openers use concrete staffing decisions for the fictional technology/services company; the existing three Workforce challenges questions are unchanged.

1. If we win three AI projects next year, should we hire engineers or move people from other projects?
2. A client wants a new digital product in six months. Should we recruit more engineers if our managers are already stretched?
3. If two new managed-services contracts bring more support tickets, should we hire specialists or train people from another team?
4. We want more cloud modernization work. Should we train our engineers or hire specialists?
5. If some client projects finish next quarter, which upcoming work could those teams move to?

These are illustrative leader objectives, not claims that the application contains project scope, workloads, employee allocations or available delivery capacity. The targeted Home guidance supports useful provisional planning: missing effort, timing, skills, costs or availability may be proposed as clearly labelled assumptions for review and correction, separately from measured/source values that remain unknown. Only essential business ambiguity requires a question. Role headcounts are not available delivery capacity. No new assumptions form, calculator, source, model or persistence format is introduced.

## Routing and compatibility

`lib/home-strategic-planning.ts` defines the copy and bounded conversation guidance. Each exact opener stays on the existing Home send/transport path as an ordinary conversational answer. It has no starter-goal shortcut, automatic pin, save, calculation or forecast. The Home response schema and decoder suppress unsolicited goal preparation on these turns. Related operating-assumption replies stay conversational, including short factual answers to the immediately preceding relevant clarification. Explicit topic changes end this guidance, and a subsequent intentional goal preserves the existing goal/budget continuation behavior. Context uses the normal recent chat history; no new stored category state is needed.

Starter goal lookup now uses exact prompt keys instead of matching array indices. The three challenge starters still map to turnover, satisfaction and hiring, with unchanged forecast values/source gates. The two former skills prompts retain recognition for legacy use without appearing in the new category. Existing Skills navigation, stored goals, drafts and conversations are unchanged.

The preceding five SWP questions remain recognized in older conversation history. Stable IDs, topic matching and hidden planning assumptions remain unchanged. The support-ticket increase and project releases are conditional premises, not observed app evidence; manager capacity is also a condition. The current Home opener path is conversational with `tool_choice: none`: it does not promise a recruiting/onboarding or ticket-throughput calculator.

## Verification

Current copy revision from main `48d1b006afd24e0ccf93386c2507ed103b2f392d`: 46 focused starter/context/conversation/actual-route tests and 34 existing plan integration/revision/what-if/forecast tests passed (80 total). ESLint on the changed TypeScript source, `git diff --check` and `npm run build -- --webpack` passed, including the configured generated-data prebuild checks.

The built app passed 206 browser assertions at 1844px, 1366px, 390px and 320px widths: all eight starters send the exact displayed prompt once; planning starters remain conversational without goal/forecast shortcuts; pointer/touch, keyboard, onboarding dismissal, drafts, reset, navigation, reload and overflow/error guards passed. All 44 chat requests were mocked, with zero provider calls. Desktop and 320px screenshots were inspected at `/tmp/swp-copy-pointer/desktop-starters.png` and `/tmp/swp-copy-pointer/small-mobile-starters.png`.

The response-behavior diagnosis and proposed semantic acceptance examples are in `docs/swp-recommendation-acceptance-proposal.md`. They are a proposal, not a change to the runtime model guidance or a real-model acceptance result. This copy revision is intended for a draft PR review before merge or deployment.

### Historical verification of the original PR184 questions

The following evidence applies to the previous wording, not the current copy revision.

Bounded unit/actual-route/planning/forecast regression: 116 tests passed. The actual route is bundled into a network-forbidden harness with a fake provider, checking all five exact openers, unchanged model and `tool_choice: none`, normal history/envelope, relevant follow-ups, topic switches and forced suppression of unsolicited goal fields. Explicit later goal, plan, review, save and calculation classifications remain covered. The existing saved-plan/revision/calculation and all three forecast mappings also passed.

Independent GPT-6 Astra Extra High review approved the final implementation with no remaining findings and independently reran 38 focused tests. Production build (including existing prebuild artifact checks), targeted ESLint and `git diff --check` passed. No live provider, database mutation or broad model suite was used.

Local browser results: 206 pointer/touch/keyboard assertions (44 mocked chat requests), 42 auto-send/draft assertions, 68 retained challenge goal/forecast assertions and 48 challenge exploration assertions; all passed (364 total). The exact new desktop and 320px mobile starter screenshots were inspected for readable wrapping and unchanged navigation. Captures: `/tmp/swp-starters-pointer-final/desktop-starters.png`, `/tmp/swp-starters-pointer-final/mobile-starters.png`, `/tmp/swp-starters-pointer-final/small-mobile-starters.png`; draft/guard fixture captures: `/tmp/home-prompt-auto-send-BZliDv/`.

Commands:

```sh
node --test tests/home-strategic-planning.test.mjs tests/contextual-prompts.test.mjs tests/home-starter-goals.test.mjs tests/home-starter-exploration.test.mjs tests/home-conversation.test.mjs tests/chat-content-readability.test.mjs tests/home-route-schema.test.mjs tests/home-planning-intent.test.mjs tests/home-user-goal-intent.test.mjs tests/home-plan-integration.test.mjs tests/home-plan-revisions.test.mjs tests/home-plan-what-if.test.mjs tests/home-forecast.test.mjs tests/calibrated-ta-extension.test.mjs
npm run build
npx eslint lib/home-strategic-planning.ts lib/contextual-prompts.ts lib/home-conversation.ts lib/home-starter-goals.ts app/api/chat/route.ts
PLAYWRIGHT_MODULE=/tmp/projection-browser/node_modules/playwright/index.mjs HOME_BASE_URL=http://127.0.0.1:3397 HOME_POINTER_OUTPUT=/tmp/swp-starters-pointer-final node tests/browser/home-starter-pointer.mjs
PLAYWRIGHT_MODULE=/tmp/projection-browser/node_modules/playwright/index.mjs node tests/browser/home-prompt-auto-send.mjs
PLAYWRIGHT_MODULE=/tmp/projection-browser/node_modules/playwright/index.mjs HOME_BASE_URL=http://127.0.0.1:3397 node tests/browser/home-starter-goals.mjs
PLAYWRIGHT_MODULE=/tmp/projection-browser/node_modules/playwright/index.mjs HOME_BASE_URL=http://127.0.0.1:3397 node tests/browser/home-starter-exploration.mjs
```

Browser transport is intercepted with synthetic domain/context and chat responses. This validates the actual built controls and client state, not live model response quality or live backend integration. Mobile touch is Chromium emulation. The durable pointer regression dismisses Home instructions through its real Close control, then uses normal hit-tested click/tap, keyboard and real scrolling; it never bypasses the modal. It checks no automatic goal/forecast for the five planning openers, all eight exact sent prompts, unchanged challenge interactions, navigation/reload, draft/duplicate guards and horizontal bounds.
