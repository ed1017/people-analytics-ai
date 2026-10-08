# Home starter pointer verification

The pointer failure reported during PR #182's production smoke was an onboarding-state mistake in the smoke setup, not a sticky-header defect. The script cleared browser storage, then attempted to activate a Home starter without dismissing the first-visit **Home instructions** modal.

On a fresh 1844×1100 production viewport, the Satisfaction starter occupied y=390–434 while the app header ended at y=110. `document.elementFromPoint` at the starter's center returned the instructions' “Demo only…” paragraph. Its ancestor was `dialog#home-starting-instructions`, with both `open === true` and `matches(':modal') === true`; the apparent header in Playwright's error was the modal's enclosing Home header subtree. Fresh 1366×900 and 390×844 probes reproduced the same modal obstruction. Screenshots show the modal and its visible Close button. This is expected native modal behavior: background controls must not receive input.

The earlier keyboard smoke does not establish pointer reachability or a supported way around a modal. Its retained/reloaded state was not sufficient evidence of that interaction. The new regression explicitly verifies that attempting background focus followed by Enter leaves focus inside the open modal and sends no chat request. It then uses the visible **Close instructions** control before interacting with any starter, and waits for the native close event's persisted dismissal state.

`tests/browser/home-starter-pointer.mjs` is the durable corrected smoke. It runs the built application in separate fresh browser contexts at 1844×1100, 1366×900, 390×844 and 320×740. It covers:

- Native modal ownership of hit testing and keyboard focus, with no background submission.
- Real mouse click or touch tap on Close, followed by actual `elementFromPoint` checks on controls. Normal Playwright actionability/scrolling is used; there is no forced click, DOM click, DOM event dispatch or hidden-control activation.
- All five starters, checking their exact prompt and exactly one intercepted submission each.
- Keyboard activation after dismissal, ordinary navigation through Workforce and back to Home (including the phone drawer), wheel/touch gestures with recorded scroll changes, and reload with retained dismissal. Pre/post-reload scroll positions are recorded without asserting that the browser must restore a particular position.
- No runtime errors or horizontal overflow. The application, forecast values, sources, styles and models are unchanged.

Run against a built local app:

```sh
npm run start -- -p 3399
PLAYWRIGHT_MODULE=/tmp/projection-browser/node_modules/playwright/index.mjs \
  node tests/browser/home-starter-pointer.mjs
```

For the production-asset check, set `HOME_BASE_URL=https://www.ed-ai.app`, `HOME_POINTER_OUTPUT=/tmp/home-starter-pointer-live`, and, only where the execution environment's browser proxy requires it, `HOME_IGNORE_HTTPS_ERRORS=1`. API responses and chat responses are synthetic fixtures and intercepted before reaching the backend; all external hosts are blocked. It performs no database, provider or saved production-user-state operations. Per-control geometry and modal ownership are saved to `geometry.json`, with modal/answered screenshots for every viewport. Browser state is isolated and discarded after each case.

Touch coverage uses Chromium device/input emulation, not a physical phone. A gesture starts only after its coordinates hit-test to unobscured chat content, and browser-level touch start/move/end input must produce a measured scroll delta where content can scroll. The high-level Chromium scroll-gesture command initially produced no mobile movement, so merely invoking that command was rejected as insufficient evidence. The final native-input sequence moved the 390px page from y=86 to y=328 and back to y=208, and the 320px page from y=254 to y=495 and back to y=373 in the local run; subsequent taps submitted exactly once. Desktop wheel input likewise changed the available scroll position. The 1844px case had no scrollable range.

Validation on the application from main `ac85d66214291b99e2dd11a7b6ea2baceebbf418`: the final local and production-asset runs each passed **142 assertions**, with **32 intercepted chat responses and zero provider calls** per run. All eight `tests/home-onboarding.test.mjs` tests and targeted ESLint passed. Independent GPT-6 Astra Extra High review approved the methodology, cause attribution and two-file change. The full forecasting/model suite was not rerun because no application or model files changed.

This follow-up changes only the test and this evidence document. It corrects the earlier sticky-header attribution and preserves the intended onboarding behavior.
