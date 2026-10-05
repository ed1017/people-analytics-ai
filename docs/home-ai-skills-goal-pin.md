# Explicit user goal after rejected discovery

## Reproduced failure

The hosted rehearsal on PR142 head `87c506cb39e002810f1fbb87579a1acc6f29efb8` reported no Pin action after this exact 208-character prompt:

> Help me build AI skills without adding headcount over the next 90 days. Use the available synthetic workforce evidence and a planning budget of USD 20,000. Call this goal AI Skills October Rehearsal 20261005.

The reported diagnostic was `Stage: server; Reason: invalid_problem; Field: problem; Candidate count: 2; Missing fields: 0`. The raw model problem was not supplied, so this work does not establish why that field was invalid. Its rejection is preserved.

The client already allows an independent user-authored goal when investigation candidates are rejected. However, both `explicitHomeGoal` and the declarative guard in `homeUserGoalForPin` excluded the explicit request prefix “Help me build”. The exact prompt therefore resolved to `null`; with no valid candidate proposal there was nothing to show in the Pin card. The prior turnover fix covered imperative and I/we declarations, including long turnover prompts handled by the turnover intent resolver. It did not cover this prefix. Prompt length was not the cause in this rehearsal.

A synthetic discovery envelope using a quantified problem and two candidates reproduces the exact bounded diagnostic through the existing production decoder. Against the unchanged PR142 local production build, the exact prompt then reproduces the missing Pin (two expected-failure reproduction checks). This is a local intercepted reproduction, not a reconstruction of the unobserved live model JSON.

## Bounded change

The two user-goal recognizers now support “Help me/us [outcome]”, optional “please”, and optional “to”, followed by the existing explicit outcome verbs. The 240-character limit and question exclusions remain. Generic requests for help, choices between goals, and requests merely to build a plan or strategy do not acquire an independent user goal.

All 208 characters of this prompt remain the user-authored goal and are also retained in the existing context notes. The requested name is not substituted for the substantive outcome or assigned to a new field. “90 days” remains literal user context; no conversion to three calendar months, new date, or calculated horizon is introduced. The existing budget parser recognizes the USD20,000 cap; this patch does not turn it into spending. Headcount constraints remain user-authored context, with no inferred capacity or staffing values.

The Pin click remains explicit and starts the existing single preparation request. Rejected AI problems/options are not saved or admitted to the goal. Existing clarification, source/goal freshness, storage and draft protections remain. There are no UI text additions, discovery schema/validation changes, model request boundary changes, calculator changes, or CSS changes relative to PR142. Database/auth/security and held eNPS files remain untouched.

## Verification

- 1,280 unit tests pass, including the exact prompt/diagnostic, accepted prefix variants and excluded questions, ambiguity, generic requests and oversized statements.
- 270 browser checks pass on the production build: 36 exact-prompt checks; 72 prior empty/malformed discovery flows; 45 clarification/invalid-envelope/source-change/goal-change/late-response boundaries; 117 unified attachment checks.
- The exact-prompt flow covers desktop1366px, mobile390px and 200%-equivalent683px reflow: Pin, three synthetic plan cards, chat edit, explicit Apply, explicit calculation/review/attachment, reload, another goal and return. The complete goal and notes survive; rejected investigation records remain absent; unrelated work remains intact. Exactly two intercepted chat requests occur. No live model/data requests, runtime errors or horizontal overflow occur.
- Existing unified attachment tests cover missing inputs, stale edits/calculations, version preservation, failed preparation and explicit retry.
- Production build with ML evidence prebuild verification, standalone TypeScript, lint and whitespace checks pass.

Local logs: `/tmp/ai-skills-old-repro.log`, `/tmp/ai-skills-unit.log`, `/tmp/ai-skills-flow.log`, `/tmp/ai-skills-existing-pin.log`, `/tmp/ai-skills-boundaries.log`, `/tmp/ai-skills-unified.log`, `/tmp/ai-skills-build.log`, `/tmp/ai-skills-tsc.log`, `/tmp/ai-skills-lint.log`.

Hosted exact-head acceptance remains separate. Synthetic plan fixtures prove flow and persistence, not live model availability, output quality, effectiveness, or compliance with the requested goal. No live retry or credential investigation was made.
