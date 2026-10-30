# Position scenario results - October 30, 2026

PR472 is live at runtime `ea458ff6ecf28d3fa82b9f98f0b4d31abedd6fc7`, merge `9622a7b074b70a770bf5764620b4b3b353cbaaa7`, deployment `dpl_9DZmU9f4xStw8uZTZGdA2YnRYDCo`. Independent review, focused regression, isolated production build/TypeScript and exact-head CI `41102562384` passed. Both staged and public desktop (1440px) and mobile (390px) passed seven acceptance checks each.

Preview: https://people-analytics-ejle8wc5o-ed-56dc.vercel.app. The canonical public hostname resolves to the same READY deployment. Source archive SHA-256: `92abeca082a59b1d48bd58ce00a0b496e85609d8d32eb1143b84bd95b0341728`; 1,166 packaged entries and 1,021 source manifest files. No domain was promoted before isolated runtime acceptance.

## Delivered contract

Select a saved position allocation and optional funding revision in Action plans, explicitly choose a target date, review, then save the target and open Track. The immutable binding retains allocation/funding signatures and goal/dataset identity. Targets use calculated ready FTE in existing vacancies; proposed additional positions are retained separately and do not become ready capacity. Decimal FTE measurements and append-only corrections reuse the existing store. Comparisons require matching date, units and scope. Existing whole-person/role targets retain integer validation.

## Verification

Independent core/UI review and focused tests covered valid targets, explicit dates, fractional values, legacy counts, unknown/interim values, cross-goal rejection, stale tickets, storage failure, orphan/corrupt backups and exact funding bindings. Full isolated build and required CI passed.

Each staged and public viewport passed: native inventory handoff and cancellation; exact revision/date target creation; 0.75 FTE report corrected to 1 FTE with original preserved; Review comparison and plan switching/reload; Track/Review Back/Forward; actual backup download preserving target/result/allocation/funding records; no runtime errors, horizontal overflow or provider requests. Local reports are `position-results-stage-final-{1440,390}.json` and `position-results-public-{1440,390}.json`; actual rendered screenshots were inspected.

The initial desktop stage run stopped on an ambiguous test locator matching retained history and current target. The locator was narrowed and complete reruns passed without application changes. No product failure was suppressed. CI initially queued, then completed successfully before merge/promotion.

## Limits and remaining work

Tracking requires an explicitly selected saved goal and date. It records manually supplied aggregate results, not causal impact or completed staffing actions. General exploration is not silently copied into a saved goal. Data remains browser-local. Current-goal backup includes these new relationships, but standalone risk/trend and separate workforce-planning stores, preferences, unsaved work and other datasets remain outside that backup. Fresh paid-model interpretation, authenticated Finance source integration, stronger permitted external applicant evidence and Lab retest remain separate. Target-line overlay remains preview-only. No paid AI calls, pricing, cap, credential or permission changes occurred.
