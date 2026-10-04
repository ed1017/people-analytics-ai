# Workforce options integration candidate

Acceptance criterion: “Can someone understand their options without us explaining the screen?”

This integration combines only these approved sources, plus this validation note:

- PR101 Home copy and responsive composer sizing: `31240dfa1ea798fc4ffece42344faf51d450b4c0`.
- PR102 concise options, navigation and direct actions: `3eb67788258552121a3a8cd8d291b91809243f12`.
- Local explicit-Send option composer bridge: `223fade1901654abec7f9c1ccc1444456892588e`.

Base main was verified as `514651a97ba8e431d13d43fa8f0399202a0250af`. The integration branch starts from the composer commit and merges PR101's exact head, retaining all three source commits as ancestors. Source branches remain unchanged. The only conflict was Home's textarea: resolution retains PR101's accessible label, exact gray placeholder and mobile-only extra height, together with the bridge's change handler, local acknowledgment and Send gate. No feature or backend changes were added during integration.

## Combined validation

502 unit tests and 358 browser assertions passed: 52 composer bridge, 44 Home copy/contextual prompts, 120 option cards, 62 journey, 64 bounded search and 16 option navigation. Full ESLint, TypeScript, optimized production build and whitespace checks passed. Requests in browser fixtures are intercepted; no live model/service call was made.

Desktop and 390px mobile screenshots were visually inspected for the combined option panel and Home composer, as well as Home copy/placeholder rendering. Browser assertions confirm desktop textarea height remains 82px and mobile height is 138px, with no page overflow.

Logs: `/tmp/options-integrated-*.log`.

Visual evidence: `/tmp/workforce-option-composer-viHrdb/composer-1366.png`, `/tmp/workforce-option-composer-viHrdb/composer-390.png`, `/tmp/contextual-prompts-vAdbrL/home-copy-1366.png`, `/tmp/contextual-prompts-vAdbrL/home-copy-390.png`.

## Acceptance observations, not additional scope

The option card exposes the quantities needed to compare result, cost, timing and staffing without opening Details. Actual option numbering and direct Compare/Adjust controls are clear in the inspected fixtures. This is a visual assessment, not evidence that an unassisted user has completed the workflow.

Remaining friction for final hosted acceptance:

- Direct actions and composer suggestions repeat the same destinations, while the prominent “Develop a full action plan” control remains visible after calculated options exist.
- The mobile page is long, and the comparison table needs horizontal scrolling to reveal other columns; discovery of that scrolling is not explicit.
- “Save” bookmarks the base calculation but opens review for an alternative. The behavior is tested and preserved, but the identical short label may not explain the distinction to a new user.
- Edited or stale staged suggestions require clearing and reselecting. The draft is preserved, but the extra step is intentional and should be assessed for usability.

No additional screen explanations or product changes were introduced to address these observations. Existing PRs remain open; production merge waits for exact-candidate checks and hosted acceptance.
