# Visible market exploration

Status: implementation and verification in progress; not published.

The user requested an external-intelligence prompt or KPI so readers can discover the evidence. This slice replaces only the third Overview Explore shortcut with **What does the hiring market look like for a role?** Capacity risk remains first and turnover second. The older internal vacancy/time-to-fill question remains supported through ordinary chat; only its shortcut changes.

## Reader contract

- The card opens compact country/role controls with blank initial scope. Available catalogue coverage is explicitly US/UK national references; company filters or a currently selected position never supply an implicit country.
- Showing evidence calls the existing synchronous `readMarketContext` with exact country/role, `occupationCode: null` and `kind: all`. The shared position-market fact renderer displays canonical source values without new calculation logic.
- Changing country or role clears displayed evidence; changing country also clears role. Reset and Close are explicit, keyboard focus is managed, and switching prompt tabs closes the explorer.
- Source occupation, geography and period appear beside the results; population, mapping duties/limitations, attribution and licence remain in Details. Software flags, projected openings and survey difficulty retain their different definitions.
- No model request, chat submission, saved-plan attachment, cost update or adopted assumption occurs. An optional AI follow-up was deliberately omitted because a generic Overview callback can carry a different selected-position context. Existing scoped chat and exact saved-scenario explanations remain available separately.
- No arbitrary market-tightness or red/green KPI is introduced. These references do not establish company targets, available applicants or measured role-specific hiring time. Missing scope/evidence is neutral; readers are not shown missing data as green.

## Preservation and verification

No external figures, crosswalks, reference IDs/versions, duties, allocations, goal records or source permissions change. Conditional coverage remains 49/197 non-pay and 59/197 pay.

Required checks: original prompt ordering and unchanged first-two callbacks; no chat callback on the market card; explicit blank/missing scope; canonical exact-role/country lookup; unavailable/error handling; stale clearing, reset/close, source links and shared renderer parity. Browser acceptance uses actual prior saved-work backups and an unsent composer draft, verifies no POST/model calls, tests US software/BI and UK HR evidence, and inspects keyboard focus and desktop/mobile layout. Provider answer acceptance is outside this no-paid-call task.

Release identifiers, exact tests and staged/public results will be recorded after verification.
