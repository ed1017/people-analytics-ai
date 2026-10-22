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

