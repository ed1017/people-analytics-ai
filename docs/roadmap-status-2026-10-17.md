## Current decision queue — October 23 follow-through

Current delivery: PR363 live. Earlier dated status sections below are history, not the active queue.

1. **In this increment:** compact Career Growth unavailable-measure panels; collapse retained rating/source/interpretation explanations while keeping missing-data, incomplete-history and scope visible. No arithmetic changes.
2. **Navigation reconciliation and next proposal:** the phone already has a native “Browse pages” drawer; do not rebuild it. For desktop evidence pages with chat open, recommend starting the existing sidebar in its compact icon-rail state, with its current expand control and labels/tooltips preserved. Benefit: more evidence width without removing destinations or moving chat right. Tradeoff: less immediate discoverability for first-time users. This default change awaits product direction; explicit user resizing/collapse choices must continue to win.
3. **Next proposed planning-flow change (awaiting product direction):** when a valid existing comparison is available, open on its compact recommendation and options, with the original intro accessible through “How this comparison works.” With missing inputs, keep clarification first. Benefit: returning users reach options sooner; tradeoff: first-time users may miss context unless the disclosure is clear. No automatic selection or hidden assumptions.
4. **Independent remaining constraint:** full BU names require a verified mapping. No guessed expansions. Broader unpaid reliability regressions can proceed under the existing roadmap when a concrete failure or acceptance gap is identified; do not repeat paid model tests or invent new scope.
5. **Deferred:** onboarding/video/credits, dark-mode work, pinning/action integration, wholesale redesign and dataset regeneration.

## October 22, compact planner verification

- Hiring controls are live in PR354, runtime `cb225d691ee63e32b404ccc53d7d8a2b3159402b`, deployment `dpl_9jMiHDgGXca59iawVAMUqh8yaauc`. CI and protected desktop/mobile plus production browser replay passed; edited calculations and visuals survive reload.
- Mixed staffing controls are implemented and independently reviewed in the next source increment: two actual development/redeployment allocation sliders, hiring explicitly calculated as the remainder, bounded by the supplied pools and current gap. Cost, shortfall, coverage chart and saving use the same validated calculation. Selection is not labeled optimal; changing assumptions clears it. Reset returns to current comparison assumptions. Five focused regressions and existing shared parity tests passed; local mobile browser replay passed, including stale-review invalidation and saved-plan reload. Hosted checks/promotion pending at this checkpoint.
- These controls support the existing whole-role, 1-FTE-per-role comparison contract; they do not invent fractional-role support or source availability. No paid calls, accounting or access changes. Fresh-model acceptance remains distinct from replay.

## October 22, 21:40 UTC implementation checkpoint

- PR353 is live: complete 50-role recruiting comparisons correctly report the 33-day tie, generic categorical tables/bars occupy the right pane, and the latest scoped visual survives reload. Runtime `1861c2d65349e86fdb50ef6ee03c10fd72394be4`; deployment `dpl_7J8bfcisP5A52uw7nVMu1RqZfUCK`. Protected desktop/mobile and production browser replay passed. No fresh model calls were made for that increment.
- PR354: three compact hiring controls (hires, optional period budget, planning horizon) use the existing calculator. Edited cost and monthly presence visual survive reload; reset restores original provenance. Local desktop/mobile replay, independent review, TS/lint/build passed. Protected verification and promotion are pending at this checkpoint.
- Mixed develop/move/hire allocation controls remain unfinished. Existing pool maxima are availability assumptions, not allocations; they must not be relabeled as mix sliders. The next increment must validate an explicit selected mix, reuse the shared calculation and save adapter, and invalidate stale recommendation claims when the mix changes.
- No paid calls, cap/ledger changes, uncertain-hold releases or new access in these increments. The existing approximately $3 test batch has about $0.137144 left, not $0.99.

# Workforce app roadmap — updated October 22, 2026

This existing roadmap now tracks the latest owner requests. The October 17 reconciliation below remains historical. Prioritize answer/visual reliability, then prompt assistance and compact recommendation controls. Do not interpret shipped samples as unrestricted model acceptance.

## Current requested sequence

| Priority | Work | Status and acceptance |
|---|---|---|
| 1 | Systematic metric coverage | In progress: inventory of 23 aggregate collections plus packet metrics. Check source availability before absence claims, allowed group/time/filter breakdowns, complete-partition ranking, units/denominators, retrieval, and scalar/table/chart rendering. Role-level recruiting timing exists in role-buy-feasibility but general Home ranking omits it; preserve external-fill cohort, sample thresholds and timing definition, distinct from dashboard closure duration. Use catalogue-driven unpaid tests, not one paid call per metric. |
| 1 | Shared right-pane evidence visuals | PR349 shipped turnover bars and scalar KPI support, but the owner's 20:26 time-to-fill response still had no visual. PR350 repairs the demonstrated (R1) versus [R1] citation mismatch with common scope/visual parsing. Actual bound-route replay and hosted mobile replacement passed; fresh model result for this correction remains unverified. Broader scalar coverage, structured comparisons and survey table remain open. |
| 1 | Survey business-unit comparison | Requested, not yet implemented: put validated eight-BU engagement favorability/score/respondent table and suitable comparison bars on right; short takeaway and metric clarification left. Derive from verified records, not model prose. Preserve survey date, scope and counts; distinguish engagement from text sentiment/eNPS. Include ordinary lists/rankings/paraphrases, topic replacement, save/reload and mobile. |
| 2 | Editable prompt helpers | PR350 implemented/reviewed: task-oriented capacity-gap helper alongside full suggested questions. Inserts multiline Description, FTE needed, Budget (optional), Role, Department/team, Level, Location, Needed by. Unknown fields remain allowed; no autosubmit; append without overwriting draft. Real role/level catalogue and free-text department/team. Desktop/mobile keyboard/touch checks passed. |
| 3 | Compact recommendation sliders | Requested, design inspected, implementation pending: 2–4 compact inline controls beside the recommendation, initialized from user inputs first or explicit recommendation assumptions. Relevant budget 0–1M, timing and staffing controls only; unknown is distinct from zero. Mixed-FTE plans need 2–3 labeled component controls matching actual supported roles/categories/channels. Precise editing, baseline/reset and accessible keyboard/touch/mobile. Do not invent a generic mix taxonomy or silently approve an estimated funding need. |
| 3 | Synchronized what-if calculation and visual | Pending with sliders: use the existing shared plan calculator/editor. Each change recalculates actual cost, capacity, gap and timing; update recommendation claims and an appropriate visual from the same state. No paid AI call on drag. Preserve input provenance, missing-cost limits and saved/reopened plan identity. Do not relabel hire arrival as a required deadline or people as FTE. |

## Latest checked release

PR350 runtime `889c2cc38331e3968d6b4f57c3a802f46c70777c`, deployment `dpl_AxtZfBxXssd2NkLjEtqzdoD535ST`; public alias verified after promotion. Public merge `465e5fbadf151a9cd304d0e857bc8835b8b222ec`. Hosted build, CI, focused independent reviews and desktop/mobile helper checks passed. Citation visual acceptance is actual-route/model-output replay, not a new paid model pass. The remaining survey and role-ranking gaps above are not completed by this release.

## Guardrails and deferred scope

- Cumulative app API cap is $50, including prior spend, reservations and uncertain liabilities; no resets. Coding credits are separate. Last read-only accounting showed $29.488116 available; this is a timestamped observation, not a new allowance. Current approximately $3 paid batch has only $0.137144 remaining based on reconciled receipts; no new call was made for PR350.
- Welcome popup/video remains explicitly deferred. No real-company ingestion, tenancy, new credentials/access or unsupported employee-level inference is implied.
- Keep the public portfolio MVP distinct from enterprise extensions and predictive validity. A role or metric omitted by Home is not proof that its underlying data does not exist.

---
# Workforce app roadmap status - 17 October 2026

Reconciled against main `20d9db40ef142a5ff031345b1426f3b9348e9f8a` and a fresh, independent first-time-user review of production at 1440 and 390 px. Older local-slice and unpublished-readiness documents describe historical checkpoints, not an outstanding implementation list.

## Shipped

- PR 297: portfolio sharing metadata and social preview image.
- PR 298: monthly capacity-shortfall summary, preserving early shortages even when later months have surplus.
- PR 299: manually reported results on saved Action plans and Track, bound to exact plan versions and supported count definitions; browser-local history and corrections.
- PR 300: manual results shown before the separate, collapsed legacy goal-measurement ledger.
- Prior first-use and HR rechecks passed navigation hierarchy, concise plan review, readable chart dates/change, pre-selection cost breakdown, consistent saved targets, and accumulated uncovered-work calculations. Do not reimplement these completed slices.

## Fresh review and bounded follow-up

The fresh reviewer inspected the landing/demo/compare/review/save journey, Action plans, Track/result form, and Baseline, Attrition, Skills and Pay/cost charts on desktop and phone. No new blocking defect was found in those reviewed paths. This was read-only production evidence plus fictional browser-local demo saves, with non-GET, external-origin and BLS requests blocked; no AI-quality or company-outcome validation is implied.

The concrete small defect: an option with zero development, two moves and three hires was titled "Mix hiring and development". The follow-up derives the display title from positive action counts, covering all eight action-presence combinations. Calculations, selection, saved identities and measurement definitions remain unchanged.

Lower-priority usability observation: on phone evidence pages after selecting a goal, repeated expanded goal context pushes the first KPI/chart below the initial viewport. A future change should keep current goal/scope visible while reducing repeated context; it should be separately reviewed rather than added to this label fix.

The reviewer also noted Action plans still references "Home" while navigation says "Overview"; this is a minor terminology follow-up, outside the selected label correction. Result entry was inspected, not submitted in this fresh review; the earlier release verification covered submission.

## Remaining decisions and separate work

- Decide the acceptable uncovered-work threshold for a specific service and planning period before labeling a staffing plan operationally sufficient. The default illustration exposes 1,280 versus 320 uncovered hours, but no universal acceptance threshold is defined.
- Broader outcome reporting requires typed metric/population/unit/period contracts. Current manual counts do not authorize rate, percentage, interval-total, causal-impact or automatic-success semantics.
- Company predictive validation requires source availability histories, defined labels/exposure, and a temporal holdout; synthetic retrospective examples do not satisfy those gates.
- The 9,037 dataset's protected-preview delivery is a separate active stream. This task does not modify its bindings, payload, activation or access configuration. Its hosted result must be reported by that stream, independently of this production UX review.

No new feature program or new data source is proposed by this reconciliation.



## Owner review batch — October 23, 2026 (local work, not yet released)

- Templates beside suggested questions, outside composer; hide after submission and restore on a new conversation. Preserve drafts, explicit Send and optional inputs; improve plain-text field spacing.
- Complete verified role catalogue (50 loaded roles), searchable multi-selection/removal; preserve all roles and other fields. No implicit FTE allocation. Rename template Department/team to Business unit, with real BU suggestions; historical department text remains distinct.
- Remove centered active-chat width limit; preserve responsive adjustable split.
- Condense recommendation cards, lead with a short conditional action derived from current calculation. Sliders, numeric summary, saved plan and supported scenario visual must stay synchronized. Historical actuals remain unchanged.
- Put monthly hires/separations directly below headcount, default January 2026 through latest September data. Retain December baseline for derived January starts; tooltip/table expose signed net change, with keyboard/touch access.

### Informational Key findings (implementation and verification in progress)

Inventory and verify 2–3 scoped, dated observations for Workforce/Overview, Attrition, Finance, Compensation, Talent Acquisition, Employee Listening, Skills, Learning/Development, Career Mobility/Growth, Succession, Workforce Planning and Intelligence. Inspect each existing page's source and current summaries before adding duplicates. Home already has scoped snapshot metrics; add only useful nonredundant findings. Planning pages use the selected calculation; unsupported/empty/incomplete sources get truthful states. Catalogues/settings/navigation or pages without analytical evidence require an explicit applicability decision, not fabricated findings.

Reuse shared deterministic summaries, no paid calls on page load/filter changes and no implication these are live model output. Preserve live AI. Pinning findings and connecting them to action planning are a later phase, outside this informational-summary increment. Welcome/video and live-company tenancy remain deferred.


## Key findings coverage — October 23 increment

This increment adds deterministic observations, not model-generated conclusions or new pin/action integrations. Source publication and production verification are reported separately in the release PR.

| Destination | Coverage / applicability |
| --- | --- |
| Home Overview | Receipt-validated selected snapshot; headcount/FTE, open positions, voluntary YTD rate. Hidden for stale or unverified scope. |
| Workforce (including legacy Overview route) | Company composition/tenure/manager observations. The legacy selected-snapshot component also has scoped findings. |
| Attrition | Company YTD exits and total versus voluntary turnover, dated explicitly. |
| Talent Acquisition | Recorded median time to fill, current open requisitions, aging requisitions. No future-hire promise. |
| Employee Listening | Engagement favorability/respondents/participation. Not comment sentiment or causal analysis. |
| Finance | Company recorded labor cost, vacancies and FTE. Unknown cost period is explicit; no annualization. |
| Compensation | Company cost context only, separate from job-range filters. Selected range and benchmark insights are not newly inferred. |
| Skills | Company demand, weighted requirement coverage and missing-profile limitation. |
| Learning & Development | Company catalogue/pathway coverage; not readiness/completion. |
| Career Growth & Mobility | Recorded events versus distinct employees; partial latest month flagged. |
| Career Interests (legacy component) | Preference coverage/missing records, not readiness. Current navigation redirects this legacy route to Workforce. |
| Succession | Recorded coverage/flags with suppression honored; illustrative flags labeled. Correct the UI adapter that rejected the approved public release identity despite valid aggregate source data. |
| Labor Market | Available dated US national BLS observations only. Selected occupation comparisons retain their existing scoped result; no company inference. |
| Occupational References; Training & Coaching | Reference/catalogue workspaces, not company observations. No generic company findings added. Selected reference/quote-specific takeaway coverage remains a follow-on, not an asserted pass. |
| Future of Work | Existing explicitly illustrative task calculation; no actual-company findings are available. Keep the calculated example summary rather than imply measured workforce impact. |
| Planning Overview; Scenario Modeling; Position/Workforce Design; Workforce Response; Execution Feasibility; Development Planning | Scenario-dependent results already expose assumptions/calculations. A consistent compact findings treatment across these tools remains pending; no global dataset summary is substituted for a selected plan. |
| Decision brief; Action plans; Track | Existing selected-goal proposals/manual measurements remain authoritative. New pinning/action integration is deferred by owner instruction; no inferred outcomes added. |
| Assess & Evaluate | Coming-soon placeholder; no analytical source or scorecard to summarize. |

Recommendation/visual acceptance: hiring count, cost and monthly presence derive from one calculated result; mixed staffing uses the same selected option for its concrete conditional sentence, costs and stepped monthly role-coverage chart. Monthly role readiness is not projected company headcount. Historical actuals are unchanged. Missing timing does not create a fabricated trajectory. Targeted browser replay covers mix/quantity changes and saved/reopened state; no fresh provider call is part of this increment.

Outstanding: selected reference/quote takeaways and consistent compact summaries in the existing planning tools. This is an explicit bounded follow-on to the all-applicable-pages request, not a claim that every page is finished. Pinning findings, welcome/video and live-company tenancy remain deferred.


## Key findings coverage closure - October 23 follow-on

This supersedes the pending reference/planning coverage in the previous increment. Release identity and hosted acceptance are recorded in the associated PR; these are deterministic summaries, not fresh AI answers.

| Pages | Final treatment |
| --- | --- |
| Home; Workforce/legacy Overview | Existing scoped snapshot/company findings; presentation-only legacy Demo prefixes removed from findings scope labels. Record/filter IDs remain unchanged. |
| Attrition; Talent Acquisition; Employee Listening; Finance; Compensation; Skills; Learning & Development; Career Growth; Succession | PR357 findings retained with scope, dates, missing-value and suppression rules. Legacy Career Interests redirects to Workforce; its existing component retains preference-specific findings. |
| Occupational References | Selected occupation/release/source mode and mapping status; explicitly not employee proficiency or available capacity. |
| Labor Market | Selected occupation/location OEWS median annual wage and recorded employment, with May 2025 period, plus existing separate dated national indicators. Employment is not candidates; wage is not loaded employer cost. |
| Training & Coaching | Selected simulated/unverified quote, currency and per-person/per-cohort per-session fee basis; blank fee remains unknown. No outcome inference. |
| Development Planning | Each selected quote's current calculator cash cost, employee hours and total including time value; invalid inputs suppress numeric findings. No currency conversion or automatic ranking. Empty workspace asks for a quote rather than fabricating findings. |
| Planning Overview; Scenario Modeling; legacy Workforce Planning | Main workload worksheet shows current final-month required FTE and signed gap, labeled preview versus entered assumptions. Stored-plan summaries remain explicitly separate in their existing disclosure. Existing custom/BU scenario result cards remain authoritative for their own scope. |
| Position & Workforce Design | Calculated authorized positions/vacancies, source date, no availability claims. Retained results hidden during structural rerun/error. |
| Workforce Response | Calculated build/move/buy role-capacity allocation; no confirmation of people, readiness, cost or arrivals. Empty/incomplete state explicit. |
| Execution & Feasibility | Conditional schedule period and final uncovered role capacity; does not erase earlier shortages or imply all constraints pass. No result means no schedule claim. |
| Future of Work | Existing labeled illustrative task calculation is the summary; no company analytical findings exist. |
| Decision brief; Action plans; Track | Existing goal-specific proposal and manually entered outcome summaries retained. Adding a generic dataset summary would misstate scope; new pinning/action integration remains deferred. |
| Assess & Evaluate | Placeholder without analytical data; findings inapplicable until implemented. |

The requested informational coverage is implemented with the applicability boundaries above. No new forecasting, candidate availability, causal conclusions, pinning or action integration. Welcome/video and live-company tenancy remain deferred. No paid provider calls, ledger mutations or permission changes in this follow-on.


## Focused presentation polish — October 23

Implemented in the associated release: compact Key findings hierarchy and shared typography; persistent synthetic-data indicator; source/methodology and AI-configuration detail disclosures; narrow-filter mismatch stays visible; explicit new-page navigation starts at top while Back/Forward remains browser-managed; whole-number automatic headcount ticks; evidence-based headcount change, full-time share, aged-requisition share and voluntary share of exits. Chat-left/visuals-right and controls remain unchanged.

Verified metric semantics against the versioned analytics schema: regrettable exits count true flags, not completeness of classification; manager count uses manager flags and span averages those managers; hybrid uses the work-arrangement field. Existing disclosure explains the constructed hierarchy and fixed hybrid field. No data regenerated. Empty headcount now displays hybrid share as unavailable rather than dividing by zero.

Remaining naming limitation: the supplied public catalogue stores constructed BU codes rather than full names. No invented name mapping was introduced. Expanded actual BU names require a verified code/name source. Decision-critical unknown costs, dates, scope and feasibility limitations remain visible; this pass does not remove every legacy explanation. Credits/onboarding/video, dark mode, new features and pinning/action integration remain out of scope. No paid AI calls or accounting/access changes.

## Methodology disclosure polish - October 23 follow-on

Learning, Succession and Attrition now use compact, keyboard-accessible methodology disclosures instead of repeated expanded caveat panels. Learning retains visible course-coverage versus readiness distinction; illustrative succession flags remain labeled and suppression notices remain visible. Repeated Demo wording removed from succession labels without changing values, calculations or identities. Source definitions remain available on demand. Desktop/mobile and publication evidence belong to the release PR.

No further manager/span/hybrid/regrettable-exit calculation defect was demonstrated by the reviewed schema and existing tests, so no data changed. Full BU names remain blocked by the constructed catalogue's lack of a verified code/name mapping; codes are retained instead of invented expansions. Chat layout, sliders, synthetic indicator, dates, pricing and accounting remain unchanged. Paid AI tests, onboarding/video, pinning, broad redesign and dataset regeneration are excluded.

## Critique closure checklist - October 23 evidence hierarchy

This reconciles the forwarded review findings and agreed scope; the complete original review attachments were not retrievable for a fresh exhaustive attribution. Release checks and deployment identity are recorded in the associated PR.

| Item | Status |
| --- | --- |
| Repeated caveats | Shared disclosures in PR359 and page disclosures in PR361 implemented. Legacy explanations remain where decision-critical; not a claim that all copy is finished. |
| Evidence spacing and hierarchy | Pane-responsive KPI grids replace cramped four-column viewport grids in Learning, Succession and legacy Career. Shared flat KPI strips, heading hierarchy, wrapping headers and mobile padding implemented in this increment. |
| Recommendation-first, recalculating sliders/visuals, save/reopen | Previously implemented and replay-verified; preserved. No new model-quality claim. |
| Chat left / visuals right / resizing | Preserved; targeted responsive verification applies to this increment. |
| Chart ticks, fresh-navigation scroll, scoped Key findings | PR359 implemented. Existing scoped findings coverage from PR357/358 retained. |
| Full BU names | Blocked on a verified code/name mapping; constructed codes retained rather than invented expansions. |
| Manager/span | September 30 source: 5,192 manager flags among 9,037 people, average span 1.7. Views count manager flags and average their spans; generated reporting lines are independent of career level. No demonstrated calculation defect; no source values changed. |
| Hybrid | 9,037 / 9,037 = 100%, zero remote/onsite, matching the fixed source work-arrangement field. Not observed work behavior. Zero-headcount guard already shipped. |
| Regrettable exits | Jan-Sep 1,069 exits, 786 voluntary, zero true regrettable flags. Label now says Exits flagged regrettable. Zero does not establish assessment completeness; missing remains unavailable. |
| Credits/onboarding popup/video, pinning/action integration, dark-mode work, wholesale redesign, source regeneration | Explicitly deferred or outside this pass. |

No paid AI calls, financial changes, permission changes or dataset regeneration. The exact remaining naming and critique-provenance gaps above do not block the independent visual repairs.


## Original critique reconciliation — October 23 follow-through

The parent re-read both original text critiques and supplied their findings. This supersedes the earlier missing-text attribution gap. Local Library materialization failed because its helper requires os.setxattr on Windows; the consuming executor did not inspect the original image. The image is directional, not an implementation specification.

| Critique | Disposition |
| --- | --- |
| Repeated caveats, operational chatter, nested borders, typography/spacing | PR359/361/362 implemented shared disclosures, flatter pane-responsive KPI cards, compact headers and consistent padding. Some decision-critical scope/unknown-cost/readiness explanations remain intentionally visible; legacy copy is partially condensed. |
| KPIs too low, narrow evidence, empty chat, mobile helpers/composer | Earlier Home placement and PR356 helper/layout changes shipped; PR362 verified seven evidence pages at 1440/390 and maximum chat width. Automatic collapse of a resumed conversation or removing navigation is not silently added. |
| Static browser tab title | This increment follows the actual page label, including ordinary navigation and history changes. |
| Raw BU codes | Still blocked on verified full-name mapping; no invented expansions. |
| Regrettable zero, manager count/span, hybrid | Verified source construction as recorded above. Explicit flag label shipped; null remains unavailable. No data regeneration. |
| Odd percentage/number ticks and Scenarios scroll | PR359 corrected whole-headcount ticks and fresh-navigation top reset while preserving intentional history restoration. No global integer rule applied to legitimate percentage values. |
| Dense comparison, long conditional recommendation, delayed planning comparison | Prior compact recommendation-first/sliders work retained. Further removal or reordering of planning stages requires a focused design decision; no new calculator or omitted assumptions. |
| Findings repeating values | PR359 added supported dated change and composition comparisons; unavailable comparisons are not invented. |
| Competing navigation and broad layout proposals | Future design decision. Existing navigation/features and chat-left/evidence-right remain. |
| Authorship/credits intro, popup/video/demo, dark mode, pinning/action integration, wholesale redesign, regeneration | Deferred under the user's agreed scope. |

No claim of complete subjective visual polish or unrestricted AI reliability. This closes the specific static-title defect and records the remaining design/data dependencies. No paid provider calls or financial/access changes.
