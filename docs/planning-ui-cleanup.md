# Planning UI cleanup

This local UI-only review builds on cost amendment `34921f6ec932bf8f434afc7c79e0e8b5c157689e`. The cost artifact remains separate: Library `libfile_50e27dc654cc8191a54aaa81ae8ebc0d`, version 1 (previous reviewed cost head `26f01c643c3bd74e4e5d33b0a9139080a84a430b`). This change is not published.

## User-visible change

Planning now has a compact shared heading/context and section navigation. Overview leads with the current plan and a scenario CTA; synthetic examples are secondary. Scenario Modeling starts with company assumptions and Run/Reset, followed by the calculated result and saved comparisons. Business-unit what-if remains a separate calculation with independent inputs. A single stored-scenario selector, source summary/chart and reference comparison share an accessible source-details disclosure. Training timing and the separate synthetic headcount demo remain available.

Design, Response and Execution retain their existing controls and prerequisites. Repeated position inventory and inherited design details are secondary disclosures. Response keeps role allocation, calculated coverage, remaining gap and warnings visible; detailed talent/recruiting evidence and the optional comparison form are secondary. Qualifications that coverage is conditional and staffing availability is unverified remain visible. Modeled allocations are no longer called organizational approvals; unsupported annualized cost wording is replaced with source-period qualifications. No amounts, formulas, payload identifiers or validation rules change.

Planning starts with the AI panel collapsed only when the user has not made an explicit session choice. An explicit toggle or Explain action takes precedence across navigation. This adds no model calls or persistence mechanism.

Native details/summary elements retain their children. No conditional remounting of existing draft/result components, automatic run/save, goal-key changes or new data requests were introduced. Company, BU, role and synthetic-demo calculations remain separate. The existing demo return focus and Back/Forward behavior are unchanged. Users can still expand every former detail, table and chart.

## Verification

- 69 contract/calculation/accessibility/source tests pass, including all cost regressions.
- Targeted ESLint and Next webpack build/TypeScript pass.
- Local built-shell fixtures at 1366, 1180, 390 and 320px: default/explicit AI panel choices, keyboard disclosures, independent company/BU drafts, saved-comparison selection, filtered unassigned draft round trips, chart restoration, demo Back/Forward/reset/populated-cost reload, and no page overflow.
- Goal-linked populated result fixtures at 1366/390px: stored company/structural/role results, role allocations, named draft, saved comparisons and selections retained across Design/Response/Execution; optional evidence draft survives disclosure toggles.
- Existing goal workspace lifecycle browser fixture: 24 checks pass.
- Source-label browser fixture: 84 checks pass across legacy/constructed/unknown sources at desktop/mobile sizes, including expanded position tables and keyboard access.
- All API traffic in browser checks is intercepted with synthetic fixtures. No paid AI or live DB calls; no deployment, access/environment changes, or budget-ledger operations.

At 1180x757 the local fixture puts the Custom Scenario heading at approximately 494px, with the initial page around 1325px tall; 1366px places it at 448px with a 1279px page. These are fixture measurements, not an identical-data before/after production benchmark. Mobile inputs stack without horizontal overflow.

The source-contract SSR test harness needed one repair: resolve its pre-existing EvidenceTableRegion alias to the actual component. No fake rendering replacement or assertion removal was used. The position source-label browser check now opens the new native inventory disclosure before asserting its content.

## Review limits

This is a bounded layout/presentation change, not a new planning engine or workflow redesign. Existing advanced execution allocation/schedule nesting remains. Fixtures cover Execution prerequisites and retained inherited results; they do not establish operational staffing feasibility or exhaustively exercise every populated execution schedule. No live deployment or provider behavior has been tested. Full-page screenshots include synthetic fixtures only.


## Returned-window amendment

Independent review of `93bfca906e90a4e0cfd6074c57204d03fc59098e` identified an unconditional January–December 2027 horizon and a September-to-January carry statement in the new company scope note. Neither is guaranteed by the model route. The note now says “returned Baseline window” and explicitly makes dates/gaps source-dependent. Arithmetic and source-qualified disclosures are unchanged.

A new SSR regression runs the real engine with an October 2026–March 2027 baseline, verifies all six returned dates, and renders the actual panel to reject the unsupported January/gap wording. The built-shell regression checks that same non-January window and note at 1366/1180/390/320px while retaining the full cleanup navigation, draft, comparison, chart and demo-return checks. This amendment adds one test (68 → 69). Earlier goal-linked, source-label and lifecycle evidence remains evidence for the unchanged portions of the reviewed cleanup.
