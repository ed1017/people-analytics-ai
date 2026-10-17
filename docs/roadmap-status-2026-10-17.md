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
