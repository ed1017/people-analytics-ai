# Home conversational answers

Home answers workforce questions directly. A goal is optional: explicit outcome/discovery requests can still prepare a goal for review, and Pin still prepares plan drafts through the existing separate request.

## Cause and change

Previously every Home request received goal/investigation instructions. A returned candidate caused the UI to remove the ordinary answer from the transcript and put it inside the candidate card's closed Evidence & limitations section. A short why-question could therefore appear to return only a Suggested goal. The compact evidence pack also discarded the monthly Attrition series, and packet selection preferred the pinned goal over the current question.

A shared turn-purpose classifier now defaults to a conversational answer. The route uses an answer-only structured schema and strips unsolicited goal metadata for ordinary questions. Current questions and bounded user/assistant history are passed as conversation turns, and recent user questions inform evidence selection for short follow-ups. Answers remain in the active transcript, with optional goal cards after the answer. Existing scope/reset boundaries still hide earlier context. Explicit goal, investigation refinement, full-plan and bundle/action requests retain their existing review and execution boundaries.

## Historical turnover grounding

The application reuses the monthly rows already returned by the Attrition endpoint; there are no new queries, endpoints, database changes or tools. Home retains at most three company-wide monthly observations: the requested calendar month, preceding month and matching month in the prior year when available. A month without an unambiguous year preserves matching years for clarification. Missing requested periods stay missing. Numeric allowlisting, suppression, source budgets and scope metadata survive server normalization.

Only W1 follows the dashboard filters. A1 monthly exit counts and rates remain company-wide. The existing endpoint does not supply the monthly rate denominator or filtered monthly exits/rates. W1 snapshot headcount is not substituted for that denominator. The conversation instructions require separating counts, monthly rates, YTD rates and percentage-point changes; neither administrative totals nor aggregate reasons establish why a particular month changed. Missing comparisons, scope, year and causal evidence must be stated explicitly. Existing packets without monthly evidence retain their previous fingerprint.

## Validation

- `node --test tests/*.test.mjs`: full application unit/contract suite, including the actual POST handler with an isolated model adapter.
- `npm run lint` and `npm run build` (including generated synthetic-data verification and TypeScript).
- `tests/browser/home-conversational-answers.mjs`: desktop/mobile April why-question, March follow-up, general workforce question, unsolicited candidate suppression, explicit reduce-turnover goal, Pin-to-plans, full plan and questions with a pinned goal.
- `tests/browser/home-conversation-tools.mjs`: existing discovery, plan editing, reset, late-response cancellation and navigation checks.

The new browser test uses intercepted synthetic evidence/model responses. A separate synthetic live-model attempt received HTTP 401 from the configured upstream; it does not establish live model answer quality. No source data or live response payloads are committed.

## Integration

Based on main including Compensation PR #160 (`6c7e991508a51a5898cb1e83127708bcf8ac7dc6`); no Compensation files or `app/page.tsx` changes.

The separate Reset task may overlap in `components/pages/overall-overview-page.tsx`. Preserve its reset function, reset epochs, cancellation gates, scope identity and conversation view key. Preserve this change's turn-purpose routing, question/history evidence selection, visible answers and removal of latest-only answer filtering. Keep `hideHistory` for existing context boundaries. No changes here to `components/problem-conversation.tsx`, shared conversation rendering, or reset persistence. After integrating Reset, rerun both browser suites plus its dedicated persistence/reset checks before coordinating any deployment.
