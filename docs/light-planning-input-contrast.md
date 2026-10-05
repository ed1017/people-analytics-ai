# Light planning input contrast correction

Production QA on main `574fb0cef8b07d5f376996a59365e6f9eb061a7d` found the retained Home Planning statement textarea with background `#0B1426` and foreground `#182B43`. The cause is concrete: the old `.home-workspace textarea` rule hardcoded a dark background and overrode the input's `bg-background` utility, while its text inherited the new Light foreground. The composer had a separate Light override, so the prior composer-only check missed this retained planning control.

The one-line fix pairs `background: var(--background)` with `color: var(--foreground)` for every Home textarea. Dark keeps its existing colors. The Light composer keeps its more specific pale input rule. Existing native controls, drafts, model inputs and stored decisions are unchanged.

Audit: the other hardcoded form families are `.development-control` and `.evidence-workspace` fields; both already have explicit Light background/foreground pairs. Header/navigation selectors use their retained dark token scope. Tests inspect every visible input/select/textarea in the retained capacity planner, goal editor with Goal context expanded, and Data details disclosure in both themes at 1366, 390, 320 and 683px widths. Text contrast must be at least 4.5:1. Tests use synthetic local retained goals only; they cancel editor changes and verify the saved goal/solution and conversation/planning drafts remain intact, with no model requests.

Validation: 56 new production-shell browser checks plus 117 existing palette and 43 Dark rollback checks pass (216 browser checks total), all 1,258 unit tests pass, production build including evidence guard, TypeScript and ESLint pass. No horizontal overflow or runtime errors. Viewport reflow is tested; physical devices/browser-native zoom are not certified. Screenshot examples: `/tmp/planning-contrast-1366-light.png`, `/tmp/planning-contrast-390-light.png`.

Timeout investigation is separate and saved locally on `fix/partial-source-reliability` at `bf14765`; it is not included or published here. This contrast checkpoint requires hosted QA before release.
