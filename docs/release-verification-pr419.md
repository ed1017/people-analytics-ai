# PR419 production verification and compact Overview refinements

Reconciled October 26, 2026 from retained release records. This document does not deploy application code or repeat provider acceptance.

## Current production identity

- [PR419](https://github.com/ed1017/people-analytics-ai/pull/419), merged as `f8879e511f4bccaddc50d1765fe67ae55785ac54`.
- Reviewed source head: `0b73eb60a8681bf10cf1dfc1cc1f5c37b2ba2703`.
- Runtime: `d42993cf33448fade057969f1ada113751bab79a`.
- Deployment: `dpl_C75pvjgcz3C61mtX78FU2Ap5T1Ng`, promoted and verified READY at https://www.ed-ai.app.
- Original runtime package SHA-256: `014c5be0d01cd96c49072369e7a431e6b7c4b6cf5d8d8f83611a59c0275a019e` (not the public source-subset hash).
- [Exact-head CI40263447010](https://github.com/ed1017/people-analytics-ai/actions/runs/40263447010) passed. Nineteen focused checks, independent review, source verification of 884 files and production build passed. Parent reviewed actual desktop/mobile screenshots before promotion.

## Delivered refinements

| Release | Outcome |
| --- | --- |
| [PR415](https://github.com/ed1017/people-analytics-ai/pull/415) | Compact Reset Conversation / Planning Scenario row and secondary More replace the bulky introduction. Categories are more prominent. Three draft-safe helper cards appear under Capacity Planning instead of a persistent Templates strip. Specifically identified repeated synthetic labels were removed; the global notice and provenance remain. |
| [PR416](https://github.com/ed1017/people-analytics-ai/pull/416) | Stronger red risk banner spans the full right panel below green and above the chart/KPI grid. The risk-card planning CTA was removed at the user's request; main planning controls remain. Unknown coverage is not printed in the primary card and remains unknown in calculation/details. |
| [PR417](https://github.com/ed1017/people-analytics-ai/pull/417) | Evidence and limits uses 12px normal text with an accessible 44px target and native keyboard disclosure. The initial candidate computed 16px because of shared tokens; it was corrected before promotion. |
| [PR418](https://github.com/ed1017/people-analytics-ai/pull/418) | Existing scoped findings appear once in the green banner. Current headcount remains beside its chart; scope and as-of are retained even when history is unavailable. The red risk does not repeat inside findings. |
| [PR419](https://github.com/ed1017/people-analytics-ai/pull/419) | Only risk-card excess vertical space is reduced: 6px outer vertical padding, heading margin zero and unchanged 44px disclosure target. No global spacing, chart size or calculation change. |

## Current public checks

Direct canonical-public desktop (1440px) and touch-enabled mobile (390px), plus 320px reflow, passed on PR419. Recorded card heights are 156px desktop and 182px mobile, 28px shorter than PR418. The checks verified exact scoped findings/headcount/risk values, single findings region, full-width green/red order, 12px normal disclosure and 44px target, keyboard open/close, Planning Scenario open/close, configured AI receipt, recruiting and monthly-flow availability, and no horizontal overflow or browser errors. Paid routes were blocked; zero paid attempts were recorded.

PR415 also checked category keyboard navigation, helper insertion without submitting or losing an existing draft, category changes, More/Saved plans, instructions, worked-example open/close and reset. These existing behaviors are preserved by the subsequent narrowly scoped presentation changes.

Retained local records: `OVERVIEW-COMPACT-ACCEPTANCE.md`, `RISK-BANNER-ACCEPTANCE.md`, `RISK-DISCLOSURE-ACCEPTANCE.md`, `OVERVIEW-FINDINGS-ACCEPTANCE.md`, `RISK-SPACING-ACCEPTANCE.md`, their final public-browser JSON records, and inspected screenshots in the operator's `integration-evidence` directory. Private operator evidence is not distributed in this source repository.

## Failed-check disposition and evidence limits

- PR416 staged CLI transport sometimes showed readiness/recruiting unavailable. Public and final candidate read-only sources returned identical payload hashes, matching dataset identity and configured receipts; direct public desktop/mobile loaded correctly. This establishes no demonstrated source regression in that release, not the cause of every earlier warning.
- PR417's initial typography assertion found 16px rather than the requested 12px. The corrected candidate was reviewed, checked and promoted; the first candidate was never live.
- PR418's initial immediate public check rendered the prior PR417 layout and failed the new scope-association assertion. That screenshot was retained. A fresh normal-browser context passed the new layout and data checks. The initial response's cause is not individually proven; no duplicate promotion was attempted.
- Current configured-state and controlled UI coverage are not fresh-model interpretation. The original intermittent final-answer rejection and earlier source-loading trigger remain unproven; the original rejected output is unavailable. [PR413's verification record](release-verification-pr413.md) retains the separate 29-check local harness diagnosis.
- A subsequently identified saved-demand reset-visibility defect is in progress: explicit Reset can restore the saved inputs while their previously hidden comparison stays hidden. It is not fixed or deployed by PR419. The [active roadmap](roadmap-status-2026-10-17.md) tracks the minimal correction and pending checks.

No paid provider call, pricing renewal, cap, ledger, hold, access or safeguard change accompanies these presentation releases or this reconciliation. Existing feature deferrals remain in the active roadmap.
