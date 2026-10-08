# Calibrated TA extension release

Release date: 2026-10-08. PR #180 activates the bounded, reviewed extension described by the preserved proposal checkpoints `6aa262f85bbd423b67f60213b7be47ae56b8dd88` and `d0ee37be79437e7d5bfca99f388b2dd9d039046b`. Their proposal documents describe those historical checkpoints; this document records the subsequent authorized integration.

## Source and coverage

The new aggregate release is `lib/data/synthetic-ta-calibrated-v2.json`, version **synthetic-ta-calibrated-v2**, generated reproducibly from the v2 calibration proposal. SHA-256: `f62cbdc3f5a07ce1e5cd515a83d2c669ced0fd2f5d2c000a9d4958aec7a26b8e`. It contains 35 monthly aggregate snapshots from November 2023 through September 2026, with October–December 2026 stock baselines. Raw generated ledgers and source identities are absent from the client release.

The API retains existing source summary, monthly activity, hiring mix and dimensional fields. It attaches `modeled_extension` only when the cutoff and selected summary/monthly calibration targets still agree with the source response. Missing or changed evidence withholds the extension. TA, Home direct hiring forecasts, method comparisons, hiring starter forecasts and TA AI context use this version. Home retains the source identity in R1 and suppresses modeled charts during refresh or when the extension is missing/stale. Unavailable Home metadata contains no stale modeled counts.

| Measure | Release meaning and value |
| --- | --- |
| Applications | 62,104, including 677 November–December 2023 applications before the existing 33-month chart |
| Six stages | Applied 62,104 → Screening 31,052 → Interview 15,269 → Offer 5,800 → Accepted 5,080 → Hired 5,080 |
| Screening | Explicit generated 50% assumption, visible beside the funnel |
| Hire mix | 600 internal + 4,480 external = 5,080 |
| September month-end stock | 474 active, including 67 held |
| Existing current-status inventory | 475; one active requisition opened after the September cutoff |
| Generated requisition reconciliation | 5,703 opened = 474 active + 5,080 filled + 149 cancelled |
| Separate outcomes | 46,744 rejected; 7,140 withdrawn; 1,494 closed; 720 offer declined; 926 active; 5,080 hired |
| October / November / December stock baselines | Last count 474 / 474 / 474; recent mean 551 / 551 / 551; damped change 435 / 415 / 405 |

Every original January 2024–September 2026 monthly application, offer and hire target and internal/external mix remains preserved. Distinct interviewed applications (15,269) remain distinct from repeat monthly interview activity (17,922). Funnel dates, chronological joins and the residual pool are generated construction, not reconstructed source records. The chart renders the last 12 historical months; Details retains all 35. Missing observations are unavailable, distinct from zero.

## Boundaries

The three stock baselines are unvalidated, with no selected winner or confidence intervals. The generated fill ledger ends at the cutoff and affects the recent trend. Stock does not forecast hire counts, future openings, headcount, arrival dates or role capacity. Timing, aging, recruiter/source/BU/role breakdowns and planning continue to use their existing source cohorts; generated timing and age are not calibrated. Planning remains on role-filtered `ta_requisition_metrics` and paired timing evidence.

The frozen `synthetic-domain-demo-v1.json` remains byte-for-byte unchanged (SHA-256 `fcd1c62a2f654f5059ea23eb4f415041bed227757f371d92499dd1167ff398de`). Turnover and satisfaction retain their existing forecasts. The v1 preview remains development-only. This release performs no database mutation, 9847 activation, provider call or production chat-model switch.

## Verification

- Production build, including all five reproducible artifact checks: passed on Node 24.19.0 / Next.js 16.3.6.
- ESLint and `git diff --check`: passed.
- Unit suite: 1,859 passing (1,800 root tests plus 59 synthetic-workforce tests). Calibration/model tests verify cohort ordering, exact monthly targets, endpoint reconciliation, no future leakage, nonnegative integer forecasts, source drift and Home/AI isolation.
- Actual TA/Home component browser checks: 147 assertions across 1366px desktop, 390px and 320px mobile, and 683px zoom layout. Checks include six funnel shapes, visible assumption, preserved headlines, compact 214px chart, selectable forecasts, keyboard Details cycles, mobile scrolling, distinct null/zero, stale extension suppression, unique IDs and no runtime errors.
- Existing chart readability regression: 950 assertions, including compact disclosures, original turnover/satisfaction behavior, the preserved frozen chart fixture and the calibrated Home hiring surface.
- Existing Home prompt auto-send: 42 assertions; contextual prompts: 38; built-shell suggested prompt submission: 48. All browser source and model traffic was intercepted; no providers were called.
- Independent GPT-6 Astra Extra High review: **APPROVE**, no remaining code findings. Reviewer independently ran 80 focused checks, the updated 3-test extension regression, artifact reproducibility and diff checks. A stale Home metadata issue was corrected and covered by regression assertions. Two TA table grid containers now shrink correctly on mobile; chart readiness also requires completed current source loading.

Screenshots reviewed locally: `/tmp/calibrated-ta/desktop.png` and `/tmp/calibrated-ta/small-mobile.png`. Exact GitHub head/merge checks and live deployment verification are recorded in the release handoff after publication.
