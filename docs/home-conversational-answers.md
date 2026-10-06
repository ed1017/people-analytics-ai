# Home conversational answers

Home answers workforce questions directly. A goal is optional: explicit outcome/discovery requests can still prepare a goal for review, and Pin still prepares plan drafts through the existing separate request.

## Cause and change

Previously every Home request received goal/investigation instructions. A returned candidate caused the UI to remove the ordinary answer from the transcript and put it inside the candidate card's closed Evidence & limitations section. A short why-question could therefore appear to return only a Suggested goal. The compact evidence pack also discarded the monthly Attrition series, and packet selection preferred the pinned goal over the current question.

A shared turn-purpose classifier now defaults to a conversational answer. The route uses an answer-only structured schema and strips unsolicited goal metadata for ordinary questions. Current questions and bounded user/assistant history are passed as conversation turns, and recent user questions inform evidence selection for short follow-ups. Answers remain in the active transcript, with optional goal cards after the answer. Existing scope/reset boundaries still hide earlier context. Explicit goal, investigation refinement, full-plan and bundle/action requests retain their existing review and execution boundaries.

## Historical turnover grounding

The application reuses the monthly rows already returned by the Attrition endpoint; there are no new queries, endpoints, database changes or tools. Home retains at most three company-wide monthly observations. All explicit periods in the current user turn are selected first (including both April and March in a comparison), followed by available preceding-month or prior-year comparisons. Earlier turns supply period context only when the current turn does not specify it; assistant prose never supplies values. A month without an unambiguous year preserves matching years for clarification. Missing requested periods stay missing. Numeric allowlisting, suppression, source budgets and scope metadata survive server normalization.

Only W1 follows the dashboard filters. A1 monthly exit counts and rates remain company-wide. The existing endpoint does not supply the monthly rate denominator or filtered monthly exits/rates. W1 snapshot headcount is not substituted for that denominator. The conversation instructions require separating counts, monthly rates, YTD rates and percentage-point changes; neither administrative totals nor aggregate reasons establish why a particular month changed. Missing comparisons, scope, year and causal evidence must be stated explicitly. Existing packets without monthly evidence retain their previous fingerprint.

Ask AI also compares the already displayed goal with its focused-issue text. Identical text, including whitespace/case/full-stop differences, appears once; a distinct focused issue and the page evidence takeaway remain visible. This is presentation only and does not alter the saved goal, model request or scope.

## Validation

- Recursive tracked `*.test.*` / `*.spec.*` inventory passed explicitly to `node --test`, including nested synthetic-workforce tests and the actual POST handler with an isolated model adapter.
- `npm run lint` and `npm run build` (including generated synthetic-data verification and TypeScript).
- `tests/browser/home-conversational-answers.mjs`: desktop/mobile April why-question, March follow-up, general workforce question, unsolicited candidate suppression, explicit reduce-turnover goal, Pin-to-plans, full plan and questions with a pinned goal.
- `tests/browser/home-conversation-tools.mjs`: existing discovery, plan editing, reset, late-response cancellation and navigation checks.

The new browser test uses intercepted synthetic evidence/model responses. A separate synthetic live-model attempt received HTTP 401 from the configured upstream; it does not establish live model answer quality. No source data or live response payloads are committed.

## Integration

Based on main including Compensation PR #160 (`6c7e991508a51a5898cb1e83127708bcf8ac7dc6`). Compensation remains unchanged; `app/page.tsx` passes the displayed goal to the takeaway for display deduplication.

The combined candidate includes Reset PR #162 at `315c3ea3692a49fec6a662139b430e684670abdc`. Preserve its reset function, reset epochs, cancellation gates, scope identity and conversation view key when integrating other work. Preserve this change's turn-purpose routing, question/history evidence selection, visible answers and removal of latest-only answer filtering. Keep `hideHistory` for existing context boundaries. Do not release the separate Reset candidate in addition to the combined candidate. The combined candidate also includes PR #163 source commit `1d73727ea20d3b33728857a7fc376460f3bc7ce6` with its ancestry preserved, including the blank panel removal, Share/Track instructions and Career filters. If PR #163 is released separately, this source commit is already in the combined candidate; do not recreate or separately cherry-pick its changes. Rerun the recursive suite and relevant browser acceptance on the integrated head before coordinating any deployment.

Attrition memoizes its evidence view and monthly chart input so shared conversation draft edits do not repeatedly register unchanged data and axes in chart subscriptions. The Reset browser regression restores a saved goal under US scope, types a draft character by character, checks settled chart stability, then resets without losing saved work or the country filter. This targets the reported hosted React 185 path; local synthetic runs did not reproduce the full hosted crash, so hosted acceptance remains necessary.
