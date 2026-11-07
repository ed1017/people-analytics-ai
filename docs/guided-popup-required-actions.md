# Guided popup with required actions

The Overview main page exposes **Open guided demo**; Introduction retains **Start guided demo**. Both open the same native modal above Overview, without navigating away or sending a provider request.

The guide requires four explicit steps:

1. Submit the displayed read-only fictional prompt (5 FTE gap, $325,000 USD, November 2026–October 2027).
2. Click **Compare staffing options**. Opening or resuming does not auto-calculate.
3. Select an option that meets the entered limits. Review remains disabled until selection.
4. Review the proposed goal, costs and checkpoints, then explicitly save the reviewed plan and goal.

The guide has no editable assumptions or continue-in-chat shortcut. Close and Escape remain available. Closing suspends the current draft; Resume retains its comparison and selection. Opening a different saved scenario restores ordinary editable planning rather than inheriting guided restrictions. Existing comparison, preparation, save, isolation and historical-plan contracts are reused. Saving remains browser-local and does not record executed work or achieved outcomes.

## Checks

- Independent code review and 26 focused tests passed.
- TypeScript passes with the existing private runtime experiment fixtures.
- New component and introduction lint pass. Journey lint reports exactly the baseline six hook/declaration-order errors and one unused-prop warning; this change adds none.
- New UI tests cover explicit comparison, no editable inputs, feasible-only selection, disabled review, pending state and final review control separation.
- Existing tests cover coupled edits, exact saved option summaries and target/cost consistency.
- No provider calls or API spend are required by the guide or these tests.

Production browser acceptance and exact release identity are recorded with the release receipt after staging.

## Home visual follow-ups

Explore, Capacity Planning and Future of Work now use compact transparent underline tabs, visually distinct from question prompt cards. The right-hand Workforce snapshot inherits the selected workspace palette, including its KPI and chart surfaces, instead of forcing light colors in dark mode. The adaptive theme class is scoped to Home; other decision surfaces are unchanged. Six category/theme regression checks pass.
