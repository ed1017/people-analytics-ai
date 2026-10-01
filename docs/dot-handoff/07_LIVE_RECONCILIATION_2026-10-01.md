# Live Reconciliation — 2026-10-01

Read-only reconciliation completed against current GitHub and Supabase state. No production changes were made.

## Verified release state

- main remained at `d128b456ee8a6e2e96d79fc21af2d943c85e4936`.
- This is the merge of PR #67: `Connect five Planning destinations to shared workspace state`.
- GitHub reports a successful Vercel deployment status for this exact commit.
- Supabase project status is `ACTIVE_HEALTHY`.
- PostgreSQL runtime is 17.6.

## Live synthetic baseline

Verified directly against the live database:

- current workforce as of 2026-09-30: 10,000 headcount
- current FTE: 9,961.2
- U.S. headcount: 5,000
- employee/history rows: 12,880
- distinct employee snapshot months: 33
- skills: 98
- succession plans: 240
- successor candidates: 720
- career preferences: 5,500
- contingent workers: 0

These match the handoff baseline.

## Governed Succession boundary

The live governed succession summary view is present and exposes exactly the approved 13-field contract, with no extra identifier fields.

The live grant inventory for that view shows only the intended server-side SELECT path; no direct anonymous or signed-in-user SELECT grant appeared.

Supabase logs recorded 21 successful GET requests to the governed succession summary view in the preceding 24 hours, all HTTP 200.

## Post-PR #67 backend evidence

After PR #67 merged, the live backend recorded successful traffic against the governed planning and analytics layer, including scenario defaults, workforce scenarios, structural position inventory, position-skill requirements, Skills evidence, response-strategy signals, filtered overview, Career/Learning data, and Talent Acquisition aggregates.

Across the checked post-merge Supabase gateway window, all 594 requests returned HTTP 200. No 4xx or 5xx response was recorded.

## Advisor state

Supabase Security and Performance Advisors still contain pre-existing maintenance findings. They were not introduced or changed during this handoff. Do not bulk-fix advisor findings as part of takeover; evaluate them separately with query and access evidence.

## Supabase platform watch

Supabase is moving existing projects to explicit Data API exposure behavior for newly created public-schema objects on 2026-10-30. Future database work should explicitly manage grants/exposure rather than assume a new table or function is automatically reachable through the Data API.

## Remaining verification limit

A fresh browser end-to-end test of the Vercel URL could not be completed in this handoff session because the normal web-fetch environment cannot access the app URL and the user's Remote Desktop Commander device was offline.

Therefore this reconciliation verifies:

- the exact current release commit;
- successful Vercel deployment status;
- healthy live Supabase state;
- the documented core data baseline;
- the governed Succession contract;
- successful post-merge backend traffic with no API errors in the checked window.

It does not independently re-prove every rendered browser interaction or a fresh real OpenAI response after PR #67.

Dot's first runtime verification should still:

1. open production;
2. navigate all five Planning destinations;
3. confirm edited Planning state persists across destinations;
4. confirm Skills-to-Planning scope and freshness behavior;
5. send a real AI planning question and verify governed deterministic results;
6. check keyboard/focus and 390px mobile behavior.
