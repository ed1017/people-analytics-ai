# Finite fictional Preview conversation batch

This is a manually supervised Preview BUILD harness for the original Home
conversation service at `256a4a9569c0a8ae52c2331ba5a71b4ccfb0225e`
(tree `bf40c71febd5624d0633a131a9c40f45e93746b2`). It uses the existing
`gpt-5.6-luna` setup, Responses schema, conversation service, bounded tools,
projection calculator and plan-selection helpers. Application source, normal
build scripts and production configuration are unchanged.

It does **not** cover the later combined source `6813544`: progress context,
`read_goal_progress`, measurement/observation proposals, section response
envelopes, explicit confirmation, dataset binding or PR179 direct-send behavior.
Those require their own exact-source acceptance run.

## Fixed scope and ceiling

All inputs come from `tests/fixtures/fictional-solution-evaluation.mjs`:
new fictional Kestrel population, evidence, plans, clock and projections.
No browser state, real workforce loader, private documents or live fallback is
read. Each sequence starts fresh. Follow-ups use the actual preceding service
state. There are exactly three user turns per selected sequence.

| Batch | Ordered sequences | Turns | Maximum count calls | Maximum generation calls | Retained ceiling |
| --- | --- | ---: | ---: | ---: | ---: |
| `core-four` | `clock-deadline`, `goal-select-refine`, `blend-replace`, `headcount-followup` | 12 | 48 | 48 | $3.888 |
| `corrections-two` | `same-people-correction`, `constraint-recovery` | 6 | 24 | 24 | $1.944 |
| Both | All original six | 18 | 72 | 72 | $5.832 |

The core batch covers ordinary questions and deadlines, creative proposals,
selection and refinement, combined-plan revisions, projection assumptions,
follow-ups and scoped unknowns. The pending correction batch covers shared
participants (10 → 5 → 8), fee/cap contradiction recovery and unknown effects.

Per pair, retain $0.05 for counting plus $0.031 for generation:
`100000 × $0.25 / 1000000 + 5000 × $1.20 / 1000000`.
These are the parent-approved conservative envelope and rate basis, not a
fresh pricing verification or a claim about invoiced cost. Count allowance
retains the earlier 200000-token-equivalent input envelope. JSON payloads are
bounded to 160000 UTF-8 bytes; the actual service separately bounds its input
to 120000 bytes. The broader payload cap accommodates schema/instructions
and actual blended-plan tool results. Before **every** generation, the exact
provider count must be at most 100000. Generation is limited to 5000 output
tokens and default service tier. Returned usage must remain inside the envelope.

There are at most four model rounds and six tool calls per user turn, with
one count and one generation in each round. No SDK retries, fallback model,
parallel requests or continuation after a failed turn. Both endpoints share
a six-request-starts-per-rolling-minute limit, with 30-second SDK calls,
six-minute turns and a 30-minute batch deadline.

The parent ledger already retains $0.25596 from earlier testing. A core-four
allocation would retain **$4.14396 cumulative**, leaving **$0.35604 initial**
and **$45.85604 total**. The full $3.888 remains allocated on success,
early failure, missing receipts or ambiguous completion. Do not reclaim unused
rounds from this conservative ledger. The later $1.944 batch does not fit the
remaining initial tranche after that allocation and remains pending a separate
parent budget decision. No new allocation is made by preparing these files.

## Preparation and supervised launch

Offline preparation, which imports no provider SDK and makes no requests:

```sh
node --experimental-strip-types tests/manual/solution-preview-acceptance.mjs --prepare core-four
```

The generated manifest is deliberately unarmed: null run/reservation IDs,
project and launch window, with `parentReserved: false`. It includes hashes
of the fixture, both runner files, package manifests and all `lib` sources.
Before a later launch, the parent must record the **entire** batch allocation
and bind one new run UUID, reservation UUID, exact ordered plan/source hashes,
current ledger totals and resolved existing project ID. Set a launch window
of no more than one hour. Hash the exact final manifest bytes. The run checks
all of these before importing the SDK or making a request.

Only the desktop operator with the existing authenticated Vercel project
should invoke one supervised Preview deployment. Use Node 24, locked OpenAI
7.23.0 and Undici 7.30.0, and the existing Preview API configuration. Do not
copy, reveal, replace or export credential values. The only added build
variables are nonsecret `SOLUTION_ACCEPTANCE_RUN_ID` and
`SOLUTION_ACCEPTANCE_MANIFEST_SHA256`.

A temporary deployment-local configuration may select:

```json
{
  "framework": null,
  "buildCommand": "node --experimental-strip-types tests/manual/solution-preview-acceptance.mjs --execute-reserved-batch .preview-acceptance/reservation.json",
  "outputDirectory": ".preview-acceptance-empty"
}
```

Keep that override, armed manifest and project link local to the supervised
deployment. Do not add a package hook, route, workflow, cron, queue or automatic
paid execution on Git events. Do not change production. On success the output
directory contains only a blank static HTML page; receipt files stay in the
private build filesystem/logs. Keep the established Preview protection.

The process claims an exclusive private run directory before any request and
fsyncs a receipt before each count/generation stage. This protects one process
and filesystem; it does not establish global exactly-once execution. The
parent/operator must permit one deployment invocation for that reservation.
If deployment completion is ambiguous, inspect that same deployment and stop;
do not redeploy, retry a denied call, choose another route or spend again.

## Receipts and acceptance boundaries

Each receipt binds the run, deployment, source/fixture digests and full retained
reservation. Count and generation receipts include sanitized request IDs,
status and usage. Final results retain stage attempt counts, completed and
pending turn IDs and a sanitized failure category. Pre-call stage counters
are conservative attempts; they may increment before a persistence failure
prevents dispatch. Counts exclude SDK retries because retries are disabled.

Turn receipts include bounded fictional questions/answers, candidate rationale,
tradeoffs, objective, next step, success measure, effective scope/timing, activities, interpreted quantities, computed values, constraints,
questions and projection assumptions/points. Text is sanitized for controls
and token-like strings, and includes truncation/redaction flags plus a hash
of the complete value. Tool receipts preserve names, output hashes and bounded
failure boundaries. Raw exceptions, provider headers and credentials are never
printed. On service failure, a bounded sanitized summary of the last fictional model output remains available for diagnosis. Review any truncation as a limitation; a hash alone does not expose
the omitted content.

Mechanical checks cover preserved inputs/saved plans, carried history,
correction arithmetic and scoped projection refusal. Configured-engine flow
checks permit up to 0.2 people from four independently rounded one-decimal
terms; monthly-flow arithmetic uses a 1e-8 tolerance. The projection receipt
labels that tolerance. This is not exact unrounded-flow verification.

Chosen-plan pinning uses the actual save, association and DecisionStore helpers
with in-memory storage. It proves that helper contract for the returned
candidate only. **Browser persistence, clicks, reloads and end-to-end UI
acceptance remain untested by this build.** Unknown assumptions are explicitly
acknowledged in this fictional selection simulation.

`executionComplete: true` means only that all selected turns passed service
and mechanical checks. `semanticReview` stays `pending`, and `fullAcceptance`
stays false. Review actual answers and typed results for usefulness, creativity,
continuity, numerical honesty, unsupported effects, unknowns and projection
lineage before claiming conversational acceptance. Scripted offline responses
cannot receive model-quality scores. The live React 185 issue and recruiter
readiness remain outside this evidence.

## Offline verification

```sh
node --experimental-strip-types --test --test-isolation=none tests/solution-preview-acceptance.test.mjs
./node_modules/.bin/eslint tests/helpers/solution-preview-acceptance.mjs tests/manual/solution-preview-acceptance.mjs tests/fixtures/preview-acceptance-scripted.mjs tests/solution-preview-acceptance.test.mjs
```

The scripted SDK exercises all 18 actual service turns and the 96-request
maximum for core-four without network. Tests cover state reset/carry,
selection, projection boundaries, count/create failures, cancellation,
persistence failures, usage/schema/tier errors, fixed budgets and manifest
guards. The test doubles are not imported by the paid runner. In this cloud
sandbox the test runner uses in-process isolation because child spawning is
restricted; this changes no test assertions and grants no network access.
