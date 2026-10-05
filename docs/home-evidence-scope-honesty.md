# Home evidence scope and roadmap checkpoint

Base: production main `ab86adc87023d2216a35e96d64001f1597cdb7bb` (PR131). This slice changes presentation and existing prompt guidance; source queries, model-input envelope, normalization limits, calculator inputs and persisted contracts remain unchanged.

## Finding and correction

Home already appends Country/Business Unit/Level query parameters only to `/api/dashboard`. The W1 packet uses selected snapshot scope. Other sources retain server-owned company-wide, survey-specific or reference scopes. The existing prompt already forbids treating company-wide sources as country-filtered facts. However, that distinction was hidden inside Data details, and Action Plan references listed IDs without their actual scopes. A geographically scoped goal could therefore sit beside enterprise evidence without an obvious qualification.

Home now exposes a compact scope explanation beside the conversation. It identifies the selected W1 snapshot and distinguishes other source populations, goal intent and plan assumptions. It explicitly says Department scope is unknown: no Department filter or department-scoped evidence is supplied to Home. During source refresh it does not present the previous scope as current. The existing prompt now explicitly forbids silently mapping a named department to a BU or turning enterprise figures into department facts.

Action Plans visibly label their planning population and business-unit assumptions separately from shared filters. Why these plans resolves each existing evidence ID through the existing validated catalogue and shows that source's scope, date and limitation. A stale plan withholds current-scope labels instead of relabeling its original references under newly selected filters. Saved drafts and attachment snapshots remain unchanged.

## Exact capability limits

- W1: country + exact business-unit + level workforce snapshot. The prior read-only RPC audit found exact org-unit matching, not recursive department traversal. Snapshot turnover and event attribution are not proof of a matching annualized planning denominator.
- W2, A1, R1, T1–T5, P1, P2 and F1: retain their own enterprise-wide populations, history/model statuses and limitations. S1 uses separate survey respondent populations; S2 uses exit respondents. W2 composition rows do not provide country turnover.
- I1 is internal occupational mapping; I2 US-national BLS; I3 fictional/unverified quotes; D1 user-assumption costs. A carried M1 retains its own geography and period. None inherit workforce filters.
- The verified catalogue includes US and Data & AI (`BU-DATAAI`). It exposes Country, Business Unit and Level, not Department. The prior catalogue audit found business units and functions, not department-type entries; no department-to-BU mapping is inferred here.
- A goal preserves user intent, including an unverified department name. It does not filter sources, select employees, establish a denominator or automatically adopt an enterprise baseline.
- What-if values remain explicit user/illustrative assumptions. A source baseline is optional contextual evidence requiring population/period review. This slice does not establish forecasting or causal retention effects.

## Validation

Two new unit regressions use a synthetic fixture based on verified catalogue names: US + Data & AI + Analyst / Specialist. W1 has headcount600 and YTD turnover3.7%; A1 deliberately has company-wide turnover8.2%, with different survey/skills populations. These fixture numbers are not a new live query or production acceptance claim. Tests verify parameter isolation, canonical scope normalization against client relabeling, reference provenance, separate measure provenance, unknown department behavior, goal/filter binding changes, and what-if assumptions remaining independent of source rates/headcount. Changing an explicit plan population requires renewed what-if scope review.

The new browser suite passes **42 checks** across desktop, mobile and 200%-equivalent reflow: selected filters → request packet → exact Pin → scoped plan references → reviewed what-if target → explicit attachment → unknown department goal → goal return → stale BU change. It verifies immutable saved snapshots, no implicit model requests on switches, no current labels on stale references, and no runtime/network escapes. Responses are intercepted synthetic fixtures; model prose is not independently validated by this test.

Full unit suite: **1,192 passed**, zero failures/skips. Full lint, standalone TypeScript, optimized production build, whitespace and public analysis-artifact verification pass. Both checked-in analysis artifacts are unchanged. Build uses inert API placeholders; no live model request or credential diagnostics.

Fresh existing browser regression sweep: **537 passed** (Guided Example69, repaired recruiter90, plan panel36, unified attachment117, discovery-to-Pin72, stale Pin45, goal context51, compact layout57). Including the new scope suite, **579 browser checks passed** on this source.

Evidence: `/tmp/home-scope-{unit,lint,tsc,build,browser,artifact}.log`, `/tmp/home-scope-regression-browser-summary.json`, per-suite `/tmp/home-scope-regression-*.log`; screenshots `/tmp/home-scope-{desktop,mobile,zoom}.png`.

## Original roadmap reconciled

| Item | Current state / specific next requirement |
| --- | --- |
| Home response typography | Completed Home-only 14px/readable spacing work; long answers remain scrollable. No one-screen guarantee. |
| Conversation to supported capacity options | Existing explicit goal/scope review, missing-input guidance, Save/Calculate and returned options are implemented and regression-covered. Mixed/replacement goals remain outside the added-capacity calculator. |
| Action Plan controls and exact user intent | Released through PR129: explicit Pin independent of optional discovery candidates, exact accepted assumptions, staged chat edits/Apply, comparison and reviewed attachment; prior versions retained. |
| Goal-context editing | Released PR130: source-bound user text prefill, editable draft, separate confirmed decisions, explicit Save/Pin and stale-editor guards. |
| Synthetic analysis disclosures | Released PR130: turnover, hiring and satisfaction demonstrations with reproducible artifacts. Hiring/satisfaction remain separate from the exit estimate. Operational forecasts are unavailable, not pending a more complex algorithm. |
| Navigation/copy and Guided Example | Released PR130/131. One guide follows current controls; repaired recruiter and guide suites cover supported behavior without fake search-volume claims. |
| Scope honesty | This checkpoint exposes existing source limitations and adds the concrete US/Data & AI/unknown-department journey. No new filtering/access is required. Hosted wording/interaction acceptance remains a release step. |
| Why these plans reported cut-off prose | Independent next UI audit: reproduce the reported incomplete tradeoff, distinguish model text from display shortening, and preserve complete existing text where available. No palette reference is needed. |
| Blue palette | Specifically blocked on approved reference bytes. Initial attempt plus one authorized fresh-transfer/helper retry both returned `library file transfer failed: download failed`. No additional retry or alternate download; visual-dependent palette matching remains stopped. |
| Operational prediction / retention effectiveness | Requires qualified complete and historically available source data, valid denominators/targets and an untouched future evaluation protocol. Current synthetic demonstrations and conditional arithmetic do not supply that evidence. See predictive-analytics-roadmap.md and forecast-consumer-readiness.md. No person-level model or invented intervention effects. |
| Department-level filtering | Not supplied by the existing Home source contract. Would require separately scoped source work and reviewed catalogue/mapping; not implemented or implied by a typed goal. This does not block current scoped W1 use or enterprise-context planning. |
| eNPS | Explicitly disabled/held. Proposed SQL and local contract remain untouched; not a prerequisite for current Home work. |
| Separate cloud OpenAI401 | Outside this task; no diagnostics, retries or credential investigation. Intercepted local checks and owner-hosted acceptance remain distinct. |

No DB/schema, auth/security, billing, permissions, domain or model-input boundary changes. Palette blockage does not stop source-bound clarity, regression maintenance or the queued prose-completeness audit.
