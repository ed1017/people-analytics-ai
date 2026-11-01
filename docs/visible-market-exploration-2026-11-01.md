# Visible market exploration

Status: live on November 1, 2026.

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

## Verified release

- PR518 head/runtime `ca9805c6368fc5901e898bbaef52ce5188a4aaf7`; merge `1412ef6c3df10b3a0a5a12161613bee4f5754bbe`.
- Exact CI `41257169689` passed all contract, historical, generated-artifact and TypeScript checks. Focused type graph had zero diagnostics. Independent review passed 11 tests. The wider local run passed 69/70 before an obsolete third-shortcut expectation was corrected; the 18-test affected prompt/routing rerun passed, retaining recruiting calculation coverage.
- Verified archive SHA256 `4d4d05e1b84c72890308735872f15ef304bf0e932f95ede4d822b9f64b30b4d5`: 1,219 runtime inputs, 1,074 manifest entries, unchanged private inputs and dependencies.
- Deployment `dpl_Ey48ER46ikCLFDDZkqm8P2GbRuis`, host `people-analytics-4j4ozk7pp-ed-56dc.vercel.app`, built with production runtime guard and no public domain. Full build and TypeScript passed, then exact stage was promoted; `www.ed-ai.app` deployment identity verified.
- Staged 1440/390 runs each passed seven groups with HTTP 200, no page errors or blocked requests. Existing authenticated exact-asset transport timed out at cleanup after assertions, with seven/eight late dashboard route-handled errors. This is not a clean transport shutdown claim.
- Initial sandbox asset preflight hit CLI AppData EPERM; authorized escalation succeeded without changing permissions. Initial browser runs restored an active saved goal and timed out waiting for first-visit starters before any feature assertion. The corrected harness selected General exploration through the real Action Plan control and asserted every prior goal workspace unchanged. All failed artifacts remain retained.
- Direct public 1440/390 runs each passed seven groups: actual saved-work restore, risk-first ordering, keyboard/blank scope, US software, BI exact occupation distinctions, UK HR published percentages, and reset/close/reopen with draft/storage preservation. Both HTTP 200, zero page/bridge errors or blocked requests, clean/drained. No stage asset replay. Screenshots inspected; mobile fits without horizontal overflow. A sticky header overlaps the top of a tall desktop element capture, not the tested content flow.
- Readiness was mocked and provider/chat requests blocked. These checks establish deterministic reader behavior, not fresh model-answer quality.

Machine-readable local evidence: `integration-evidence/VISIBLE-MARKET-PROMPT-RELEASE.json`; browser reports `visible-market-prompt-stage-ca9805c-exploration-{1440,390}.json` and `visible-market-prompt-public-ca9805c-{1440,390}.json`.

## Remaining boundaries

The four modeled duty templates do not establish new external occupation matches. India public PLFS data identified so far is broad occupation division context, not professional-role evidence; registered/paid microdata is outside scope. Other country-source rights, suppression and mapping gaps remain in the existing source records. No available-applicant count or measured role-specific hiring duration is inferred. Further source coverage needs verified compatible evidence; Lab and chart-overlay approval remain separate.
