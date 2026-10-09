# Unarmed fictional-pilot continuation diagnostic

Application: 64b5124b329c26bf35cdf6eed2fb02b98d06bad1. Capture predecessor: 5074b4a4e969f670ce26cd83a233fa513414e1b8. This new source branch transplants the reviewed private harness onto the approved normalization candidate; old branches and authorizations are preserved. No application source differs from the candidate. Git autodeployment is disabled for this branch, and no authorization file is supplied.

## One request and one narrow acceptance

I want to reduce turnover. For a fictional mentoring pilot only, use 12 participants, 2 total hours per participant, 3 coordination hours and 240 USD total cash, starting October 2026 for three months. These are illustrative assumptions, not workforce facts. Show one checked proposal; do not save it.

The actual blank-state Home request constructor supplies this text. Initial goal, catalog, selection and conversation are empty. The model retains the app's gpt-6.1-sol / medium / default policy, unchanged instructions/tools, automatic tool choice, 5,000-output-token limit, 30-second per-request timeout and zero retries. This controlled A1-only context is narrower than a fully loaded Home page.

The harness requires exactly one first-response evaluate_candidate call, verifies the normalized history and its actual matching string result in the second request, and requires the second response to finish with no more tools. The actual POST must return HTTP 200 with exactly one current checked, unblocked selectable candidate and valid final metric references. Any other path stops as inconclusive; no third dispatch, replacement question or retry. Neither semantic quality, three-plan behavior, React/browser acceptance nor the original hosted failure's cause is certified.

## Grounding and private replay

Only GET https://ed-workforce-ai.vercel.app/api/attrition is permitted, company-wide/unfiltered, legacy-v1:0, as-of 2026-09-30. The existing strict numeric projection excludes individual/name/pay/group-label data. Two aggregate reads must agree: initial request evidence and actual current app grounding. Other readers, projection/database access, redirects and concurrent/third aggregate reads are refused. The unchanged app grounding verifier runs; no raw source is exported and no data is written.

Visible provider output, exact request/reply state and the forwarded calculation result remain encrypted to the reviewed recipient. Public-safe receipts retain bounded status/usage/hash metadata. After coordinator-local decryption, replay.mjs verifies the candidate source binding and continuation proof, then runs actual saveSolutionCandidate, associatePlanProposal and DecisionStore save/reload over in-memory local storage. It deliberately acknowledges unknown quantities and does not operationally Apply. No hosted browser is coupled to the test.

## Offline verification

On a complete checkout with installed pinned dependencies:

    node --test .home-action-acceptance/offline.test.mjs .home-action-acceptance/diagnostics.test.mjs .home-action-acceptance/private-review.test.mjs

All provider/aggregate responses in these tests are synthetic, real network is denied, and route compilation stays in memory. build.mjs is not executed. offline-source.mjs optionally adapts source checks to a sparse local checkout via DIAGNOSTIC_OFFLINE_BASE; it is never imported by the build. The physical complete-checkout source guard must still pass before any future hosted run.

## Zero-provider preflight procedure — not executed here

1. Review/pin the complete source, inventory and harness commit. Verify source membership/hashes and pinned Node/SDK versions on a complete checkout. Confirm no runtime endpoint is emitted and branch Git deployment remains disabled.
2. Coordinator prepares a fresh private recipient and one exact aggregate-verification authorization child. Bind project, branch, app/harness/source digests, short expiry, new run ID and recipient. Set phase=aggregate-verification; reservation ID, budgetLedger, approved aggregate hash and prior verification/retrieval fields are null. Do not copy an old authorization.
3. Only after explicit preview/preflight authorization, make one pinned Preview BUILD. It may perform the two real A1 aggregate GETs. It must stop after actual app grounding and before any provider construction/dispatch: generationAttempts=wireAttempts=0; zeroProviderCheckpoint=true; aggregateVerificationPassed=true; two completed reads. The internal POST's expected 422 represents this intentional stop, not a provider failure. Recover/decrypt the sealed canary and record its nonce proof privately.
4. Stop for review. A paid child requires the same source root, fresh matching aggregate verification (at most one hour old), proven private retrieval, a new reservation, and a coordinator exposure ledger checked within 15 minutes. Two-dispatch reservation is conditionally $11.715 under the retained pricing snapshot and unchanged $50 total ceiling. Reverify rates/model and liabilities before arming; no budget availability is asserted here. No missing/expired authorization or ambiguous dispatch may be retried automatically.
5. After a separately authorized model assessment, capture privately, decrypt locally, and run `node .home-action-acceptance/replay.mjs artifact.json`. Replay makes no provider/database calls and saves no live goal. Preserve all receipts even on an inconclusive result.

No preview, live aggregate read, provider call or budget reservation is authorized by this README.
