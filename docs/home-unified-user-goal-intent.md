# User-authored goal intent

Local checkpoint based on PR143 `5b34ed4ef4ced5da5bd8264099c769e7154d5efd`. PR142 and PR143 heads are preserved; this checkpoint is not pushed or deployed.

## Behavior

One user-only resolver now returns `explicit_outcome`, `needs_review`, or `no_goal`, along with the exact user source span and the start of its relevant conversation context. The Home response handler uses that result for valid, invalid and empty AI discovery. AI proposal validity no longer chooses a less restrictive user-goal recognizer. Suggested investigation goals remain separately validated and labelled; they are never relabelled as user-authored outcomes.

The bounded grammar recognizes direct outcomes, Help me/us requests, I/we need/want and would-like declarations, and explicit goal/outcome labels. It requires substantive outcome content. Can/could/should-we requests, unresolved alternatives, incomplete outcomes and oversized outcome statements require review. Analytical questions and generic requests for information do not acquire a user-authored goal.

Sentence/newline boundaries separate a clear outcome from a later question or context. A first goal retains preceding user context; a new/revised outcome starts its own context boundary. Explicit withdrawal suppresses both the user Pin candidate and replacement AI suggestions until the user states another goal. Repeated text is preserved in chronological chat history, so restating a goal after withdrawal can recover. These rules concern unpinned conversational intent: saved goals still require the existing explicit editor actions.

Uncertain requests offer one **Review goal** action that opens the existing goal editor. No separate dialog or explanatory text block was added. Bounded uncertain text is editable; an oversized outcome leaves the statement field blank instead of silently shortening it. Its existing user notes and original page/scope remain in context. Editing a reviewed statement preserves that context; Close creates no goal or request. Existing context/storage limits and truncation indicators remain. No assistant text or inferred values enter the user notes.

The exact 208-character AI-skills rehearsal prompt remains unchanged, including the requested name, USD20,000 budget and literal 90-day wording. No day-to-month conversion, date inference, inferred spending or staffing values were added. Existing quantified-turnover display/clarification normalization remains for accepted legacy requests; its exact source text and full bounded notes are retained.

The plan-task classifier now uses the same explicit-outcome result, so an actual request to build AI skills receives the existing delivery-oriented contract. Analytical questions remain diagnostic. Existing explicit requests for Action Plan alternatives still request delivery. Payload fields, discovery validation, evidence boundaries, calculators, database/auth/security and held eNPS files are unchanged.

## Verification

- 1,291 unit tests pass. Coverage includes the intent matrix under valid/invalid/empty AI discovery, source spans, natural request forms, questions, noun/verb alternatives, substantive content, long context, oversized outcomes, literal day units, withdrawals, revisions, mid-conversation goals and existing turnover acceptance.
- 555 browser checks pass on the local production build: new intent matrix234; exact AI-skills Pin/edit/Apply/Attach/reload/goal-return36; prior empty/malformed discovery72; clarification/source/goal/stale boundaries45; context editor51; unified attachment117.
- Matrix tests cover desktop1366px, mobile390px and 200%-equivalent683px reflow. User text and current context reach preparation unchanged; review/cancel never creates a goal or model request; rejected AI candidates are never stored as user goals. No external network escapes, runtime errors or horizontal overflow.
- Build with mandatory ML evidence verification, TypeScript, lint and whitespace checks pass. Browser API responses are synthetic/intercepted; these tests do not establish live model availability or quality.

Logs are `/tmp/unified-intent-{unit,build,tsc,lint,matrix,skills,prior-pin,boundaries,editor-browser,unified}.log`.

## Separate hosted follow-ups

The reported attachment reload staleness was audited read-only. The evidence digest normalizes source order, sorts object keys and excludes arbitrary fetch timestamps. Local probes confirmed timestamp/source-array-order changes leave the digest unchanged; source availability and detail-row ordering change it. The hosted before/after packet or digest comparison is still needed to identify the actual cause. No stale guard or fingerprint was changed.

The numbered-plan chat-edit issue is separate: the current parser rejects every numbered-plan reference, including the selected plan. A bounded selected-plan match/reviewed-switch design is queued; this checkpoint does not change plan editing.
