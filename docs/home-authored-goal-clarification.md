# Keep an explicit goal pinnable during source degradation

This follow-up is stacked on PR151 `9a6cd2b8e5318ce1f0d14b4f694f37202b96d6da`. PR151 and production `df0afcb5029258eb6edb1cabbe92a4728d9187a5` are unchanged.

## Confirmed UI cause

The hosted AI-skills request was a recognized explicit user goal, but the model returned a population/skill clarification. `OverallOverviewPage` captured the Pin candidate only when `!reply.clarification`. That condition blocked even a separately recognized user-authored goal. The same file is identical between production and PR151, so this gate is not introduced by the duplicate-plan fix.

Home now offers the existing Pin action for the explicit authored goal while retaining the model question as optional plan refinement. Questions, alternatives, withdrawals and unrecognized requests do not acquire a goal from assistant prose. A clarification-bearing model proposal is not adopted as validated investigation options. The existing clarification text explains that unresolved details still require review; the competing generic goal chooser is suppressed when the user has already stated a goal.

A user-authored goal survives an evidence-only refresh in the same goal/persona/workforce scope. Source-backed proposals still require their exact evidence context and are withheld after refresh. The old Pin handler is rejected by the existing live-context and epoch guards; a fresh explicit Pin uses the current evidence. Goal changes, late responses and ambiguous intent retain their guards. Prior assistant text, including the reported non-Latin character, is preserved rather than filtered or rewritten. That character is not present in application source; its exact upstream origin is not established.

Pin still makes its disclosed single plan-preparation request; neither a clarification nor refresh pins, calculates or sends a model request automatically. The exact user wording and constraints remain user notes, not verified company facts or confirmed decisions. Missing skills/learning evidence stays missing. No new local AI-skills template, capacity mapping, numerical assumption or forecast is invented.

## Source-availability diagnosis and limits

The parent observed 3/18 summaries (P2, I2, I3), then **17/18 after one ordinary evidence refresh**, with D1 unavailable. That establishes observed recovery, not an infrastructure root cause or service guarantee. No source-loader change is included.

- `lib/home-pack.mjs::readHomeSource` has a 12,000ms deadline covering fetch and JSON parsing, aborts timed-out reads and returns no stale data. Non-OK/transport failure is unavailable. These client statuses alone cannot identify server, database, network or scheduling causes.
- `OverallOverviewPage` attempts the existing unique remote source keys in parallel and settles the pack after those bounded reads. Explicit Refresh reloads the same endpoints and invalidates the survey cache; it does not resubmit the chat prompt.
- Eighteen summaries are not eighteen independent endpoints. S1/S2 share survey data; T1/I1 share skills. I3 is a local fictional/unverified quote catalogue; D1 depends on explicit session Development selections. Their availability does not establish company skills coverage.
- T5's `invalid` status reflects failure to validate its complete suppression contract; it is not a bypassable request to expose more data. I1 may become unavailable when its required mapping counts are absent. No suppression, source validation or query was broadened.

No live model request, credential diagnostic, database read, prohibited production proxy retry or alternative access route was used by this worker. The parent's single hosted refresh and subsequent unchanged-prompt test are separate from the local intercepted tests below.

## Verification

- **1,362 unit tests passed**, including exact AI-skills goal recognition alongside a valid clarification, preserved Unicode response text, source timeouts and survey-cache boundaries.
- **270 browser checks passed** at desktop, mobile and zoom-equivalent reflow: degraded goal Pin 30, optional clarification 18, Pin/stale/ambiguity boundaries 51, duplicate alternatives 39, incomplete-plan recovery 63 and Guided Example 69.
- The degraded fixture uses actual client timeouts with only P2/I2/I3 available, preserves the exact goal beside the question, refreshes without prompt resubmission, rejects the captured stale handler, and confirms one explicit Pin using refreshed evidence with no invented plans. Model-derived candidates still become unavailable after refresh.
- Lint, standalone TypeScript, production build, both unchanged generated artifact checks and whitespace checks pass. A lint finding in the first attempt removed a redundant render-time ref read; the authoritative click-time guards remain.

Local logs use `/tmp/degraded-*`; final build/lint/TypeScript logs use `/tmp/degraded-final-*`. Browser APIs are intercepted synthetic fixtures. Hosted acceptance of the exact follow-up preview remains required; production runtime testing remains blocked by the earlier proxy denial. Both held eNPS files and all schema, security, permissions and model input boundaries remain unchanged.
