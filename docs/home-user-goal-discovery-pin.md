# User goal pinning without discovery candidates

This core-only checkpoint follows `7d2d2d9b723a822720b70645ad9f003575670e05`. It does not include the separate navigation/intro UI checkpoint `66cf8df` or implement Guided Example changes.

## Bounded failure evidence

The reported live attempt used the unchanged 941-character prompt once, without retry. Its visible answer reportedly described three intervention mixes and the accepted constraints, but the UI showed `Stage: server; Reason: empty; Field: none; Candidate count: 0; Missing fields: 0` and no Pin. The raw live response was not observed in this local task, so this does not establish the model's internal reason for returning empty discovery fields.

The source contract deliberately separates ordinary answer prose from qualitative investigation metadata. `buildHomeReplyFormat` permits `problem: null`, `problem_evidence: []`, `options: []`, `question: null`. `homeCandidateInstructions` explicitly allows that form when there is no supported investigation. `inspectHomeCandidateProposal` classifies exactly that structured form as `empty`; malformed or omitted fields have different diagnostics. No parser extracts investigation facts or Action Plans from prose.

A synthetic completed response with useful prose and those four empty fields passed the production Home response decoder and reproduced the exact bounded diagnostic. Independently, `homeGoalForPin` correctly resolved the supplied annualized turnover goal. The UI, however, captured the goal inside `if (reply.proposal && !reply.clarification)`, so a null investigation proposal suppressed Pin. `EXPECT_PIN_BLOCKED=1` in `tests/browser/home-user-goal-discovery-pin.mjs` reproduced that missing Pin on the previous production build; the one expected-failure reproduction passed. This identifies the UI coupling, not a live JSON parse failure.

## Change

A current completed discovery reply may now carry a user-goal pin candidate with no investigation proposal. The goal comes only from bounded user-authored statements, using the existing explicit goal/numeric intent resolver. Imperative goals, natural I/we need/want declarations, and a small set of goal/outcome labels are supported. Open questions, ambiguous choices between outcome goals and generic requests for help do not acquire a goal from model prose. Malformed candidate fields remain rejected and cannot supply the proposed goal.

The existing explicit Pin action remains the only trigger for the single Action Plan preparation request. A valid essential clarification still blocks Pin. The goal-only card does not create or persist a fake investigation, and the answer prose remains visible in the conversation. Its diagnostic distinguishes unavailable investigation options from the user's independently pinnable goal. Successful pinning clears the consumed discovery warning.

Source/context/epoch, active-goal, storage and readiness checks protect Pin. The complete user prompt still occupies the existing bounded goal-note slots. Other workspaces, unsent drafts and stored Action Plan snapshots are preserved. A current ready user-goal Pin takes precedence over the assumptions-only Pin, avoiding competing controls. The explicit local route remains available before a reply where appropriate, and after pinned empty/failed preparation; choosing it does not run another model request. Discovery schema/decoder and fresh structured Action Plan validation are unchanged.

## Validation

- 1,121 unit tests pass, including schema-valid empty discovery, unchanged candidate rejection, exact user-goal resolution, natural declarations, bounded labels and ambiguous/no-goal exclusions.
- 648 browser checks pass on the production build at port 3175: 72 new exact-prompt flows, 45 negative/stale/draft checks, and 531 existing regression checks (preparation resilience 45; outage fallback 78; plan panel 36; accepted context 21; conditional calculations 48; unified attachment 117; clarification 18; composer 36; compact layout 57; explicit rate pairs 42; prior exact acceptance 33).
- The separate one-case old-head reproduction verifies the reported missing-Pin state and is not counted as a passing fixed-build check.
- Lint, standalone TypeScript, production build and whitespace checks pass. Browser tests cover desktop, mobile and 200%-equivalent reflow, with no external requests or runtime errors.

Tests use intercepted synthetic responses only; no live model/API requests or credential diagnostics. Live acceptance remains separate and no publication is authorized by this checkpoint.

## Queued separately

- Preserve the independent UI checkpoint `66cf8df`: Talent Acquisition immediately follows Attrition; only the lower Costs/staffing/timing paragraph is replaced with “You can also use this as a traditional dashboard—explore workforce data through the left-hand menu.” Best practice reads “Best practice: Include your desired outcome, timeline, budget, stakeholders and relevant sources to help shape a more precise goal.” The original purpose paragraphs and other instructions are unchanged. This supersedes the prior queued sentence insertion. That independent checkpoint has its own 16 unit/27 browser checks, lint/TypeScript and 10.48:1 helper-contrast evidence reported by the coordinating agent; none of those UI changes is included here. No palette source change was made, and separate color materialization/verification remains outside this checkpoint.
- Guided Example alignment remains separate, using the real goal → Pin → Action Plans → compare/chat edits → Apply changes → Attach Action Plan workflow without manufactured proposals or conflating proposals with executed optimization scenarios.
- After the critical Pin fix, the existing Focused issue/New Goal context should rename “Constraints and assumptions” to “Constraints, assumptions and context”; prefill only explicit relevant user statements while preserving their source/page/scope. AI suggestions must never become confirmed decisions. New Goal should open context expanded, prefill relevant explicit source-bound user context when present, and remain blank when no such context exists, with no cross-goal copying. Confirmed decisions remain a separate editable field, and Action Plan edits remain in chat. That follow-on requires source-bound prefilling, explicit-decisions-only and stale/other-goal isolation tests. It is not implemented here.
