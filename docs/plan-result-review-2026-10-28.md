# Review plan results - October 28, 2026

Assess & Evaluate now selects an attached saved plan and shows its target, latest manual result, dates and a compact zero-based comparison chart. Open Track carries the same plan selection for recording or correction. Definitions and source notes remain in Details.

## Measurement contract

This reuses resultTarget, readManualResults, activeResults and resultDifference. Results are joined only to the exact saved plan revision, input key, evidence digest, dataset, population, unit and target definition. Latest means latest measurement date, not last append time. Corrections retain originals; backfilled older observations cannot displace newer measurements. Differences require the target date. Unknown is not zero; interim and late reports have no end-date difference. A stale explicit selection requires choosing another plan.

Supported existing targets are guided additional-role coverage and explicitly linked point-in-time headcount. Other saved plans remain reviewable in Action plans but need an eligible measurement before comparison. Reporting remains browser-local and manual. No new backend, storage schema, ROI, causal impact or verified outcome calculation was added.

## Acceptance

- PR456; runtime 72f7fcac693efacff644f7d7364d83f132ef889b.
- Source head 29a7861e3733296ba5e904b81222eda02f953c3d; merge 03fcdb35209dcebd0ebc082d62b1f95bb48b90e5.
- Deployment dpl_GvFVFdkHgFhFoG2Qfo7rGnbk4i2A; https://people-analytics-n6q9vsv6p-ed-56dc.vercel.app; canonical www.ed-ai.app resolves to it.
- Independent code review cleared; 1,016 runtime regression tests and TypeScript passed. Final staged production build passed. CI40779164102 passed.
- Final hosted and public desktop1440/mobile390 each passed 10 checks: empty state, other-plan absence, exact comparison, Track selection, correction, plan switching, Back/Forward, reload, source Details, and unknown latest result without stale subtraction or zero bar.
- Public checks used isolated browser storage seeded through the existing synthetic fixture and exercised real client correction/persistence. No real visitor records were modified. No page errors or overflow; no provider calls.

Local evidence: plan-results-final-stage-{1440,390}.json, plan-results-public-{1440,390}.json and corresponding screenshots. The first CI attempt failed because the exported test fixture was missing; the exact synthetic fixture was added and final CI passed. Local default build was blocked by an existing dependency symlink; the webpack fallback compiled but the existing deployment identity guard prevented local prerender. The final staged build passed without weakening that guard.

This closes the agreed bounded placeholder scope. Broader scorecards, enterprise persistence, automated outcomes and fresh paid-model acceptance are not implied.
