# Workforce options integration candidate

Acceptance criterion: “Can someone understand their options without us explaining the screen?”

This integration combines these approved sources and the four subsequently approved usability corrections:

- PR101 Home copy and responsive composer sizing: `31240dfa1ea798fc4ffece42344faf51d450b4c0`.
- PR102 concise options, navigation and direct actions: `3eb67788258552121a3a8cd8d291b91809243f12`.
- Local explicit-Send option composer bridge: `223fade1901654abec7f9c1ccc1444456892588e`.

Base main was verified as `514651a97ba8e431d13d43fa8f0399202a0250af`. The integration branch starts from the composer commit and merges PR101's exact head, retaining all three source commits as ancestors. Source branches remain unchanged. The only conflict was Home's textarea: resolution retains PR101's accessible label, exact gray placeholder and mobile-only extra height, together with the bridge's change handler, local acknowledgment and Send gate. The subsequent correction changes action labels and presentation only, with the existing handlers, accessibility, explicit review/save and data boundaries retained.

## Combined validation

502 unit tests and 370 browser assertions passed: 56 composer bridge, 44 Home copy/contextual prompts, 128 option cards, 62 journey, 64 bounded search and 16 option navigation. Full ESLint, TypeScript, optimized production build and whitespace checks passed. Requests in browser fixtures are intercepted; no live model/service call was made.

Desktop and 390px mobile screenshots were visually inspected for the combined option panel and Home composer, as well as Home copy/placeholder rendering. Browser assertions confirm desktop textarea height remains 82px and mobile height is 138px, with no page overflow.

Logs: `/tmp/options-clarity-*.log`.

Visual evidence: `/tmp/workforce-solution-cards-9p57PV/compare-options-1366.png`, `/tmp/workforce-solution-cards-9p57PV/compare-options-390.png`. Combined-composer screenshots: `/tmp/workforce-option-composer-tCSWRq/composer-1366.png` and `/tmp/workforce-option-composer-tCSWRq/composer-390.png`.

## Acceptance assessment

The option card exposes result, cost, timing, staffing and constraints without opening Details. The following four corrections address the reported first-time clarity blockers:

- Bookmark option, Review and save, and Save changes distinguish the existing three behaviors; handlers and approval restrictions are unchanged.
- Mobile comparison stacks every option's labeled values beneath each measure. Desktop retains its table. No horizontal scrolling is needed to discover another option on mobile.
- Direct controls stay primary. Requested draft-and-Send suggestions remain available under the initially collapsed Option action suggestions disclosure.
- When verified options exist, the general planning action is a secondary Draft a goal action plan control, including during temporary option edits. Before verified options exist, its original presentation remains.

The stacked comparison is longer vertically, and stale/edited staged suggestions still require clearing and choosing again; neither behavior silently switches targets. These are the remaining tradeoffs to assess in final hosted acceptance. The slow/pending hosted catalog is not diagnosed as a code failure by these local fixture checks.

Existing PR101/102 remain open and unchanged. Production merge waits for exact-candidate checks and hosted acceptance. Local visual inspection is not a substitute for unassisted-user acceptance.
