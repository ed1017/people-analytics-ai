# Unarmed Action Plan first-response acceptance

Exact app source: `8bd365ea3173eda32fe5aa1f8f52557f6b202f93`.
Reuse source: natural Home harness `41939a75ff842932cf86aae9b639cf905fd67490`.
This is a separate diagnostic branch, never an application release. All 1,242
tracked base files, including historical manifests and fixtures, remain exact.
The new app-source-manifest.json pins them without rewriting historical evidence.
The source reviewer reported no must-fix defect in the app source; this adapted
unarmed harness still requires its own independent review.

## Scope and provenance

Two independent first user turns, in order:
1. `I want to reduce turnover`
2. `A client wants a new digital product in six months. Should we recruit more engineers if our managers are already stretched?`

Both use the existing source-extracted `ordinaryClientRequest` constructor with
fresh empty state. No response carries into the next question. No SWP header,
scenario wrapper, saved goal, selected plan, input form or prefilled candidate is
injected. Existing synthetic aggregate Home evidence has 18 entries; empty
conversation is not absence of evidence. It contains no exported employee records.
The source-extracted hook is unchanged from the reuse source. Browser provenance
compares requests typed into two fresh actual Home contexts with this constructor,
normalizing only generated IDs and timezone. The paid build runs the actual POST
and constructor, not a hosted browser. Feature config: Home conversation on,
progress and structured-plans opt-ins off, no persistent environment changes.

For each reply, require three distinct current candidate references, no blockers,
non-null drafts/results, exact request/user-turn/evidence/constraint binding and
valid participation provenance. Existing validators recalculate every result.
Compare the actual provider final object with the route reply and check metric
references against current revisions. An exact duplicate activity check provides
only structural diversity. Human review separately judges the required order: short summary and
recommendation, three useful Action Plans, then optional further reading,
investigations and focus. Reading uses verified available evidence/links only;
otherwise suggest investigation topics or checks without invented sources. Also
review useful alternative actions/owners/sequencing, actionable details and
honest unknowns. Brief definitions remain brief without three forced plans. Six months is a requirement, not a delivery
forecast. Structural success leaves semanticReview pending and fullAcceptance false.

## Enforced bounds and reservation proposal

The app owns `gpt-6.1-sol`, medium reasoning, default (Standard) tier and
`max_output_tokens: 5000`, including reasoning. Payloads are checked and forwarded
unchanged. The full app tool catalog remains visible. This diagnostic permits only
clock/evidence reads and candidate/batch/parameter evaluation; database/projection
and unrelated tools stop before execution. No Save or Apply occurs in the paid run.

Four generation attempts GLOBAL across both questions; zero token-count calls;
zero SDK or harness retries; concurrency one. An attempt is consumed before receipt
IO or SDK/wire access. One outgoing request per attempt, exact endpoint and payload,
expiry checks before generation, after receipt IO and at outgoing dispatch.
30-second SDK / 90-second route / 180-second run bounds and 160,000 full-payload
bytes remain. The app also has a 120,000-byte conversation-input guard. Neither
byte limit is a tokenizer proof. The conservative cost ceiling uses the provider's
entire 1,050,000-token context window, not a new local input-token counter.

Current official pricing was rechecked on 2026-10-09 in pricing.json. Reserve all
input at the maximum Standard long-context category, $5/M cache writes; output
$15/M, plus the inherited 10% regional contingency:
`4 * (1,050,000 * $5/M + 5,000 * $15/M) * 1.10 = $23.43`.
Coordinator ledger: $24.091396 retained and $25.908604 remaining of $50; no current
reservation. Proposed exposure becomes $47.521396 with $2.478604 unreserved.
This work reserves nothing. Reconcile current ledger/rates before arming.

Two calls per question (batch then final) is a possible successful path, not a
forced sequence or completion promise. Extra rounds consume the same global cap;
call five is refused. Failure stops the run; no replacement question, continuation,
repair retry or automatic budget increase. Keep the full reservation on ambiguity
until external closure with complete receipts. No additional followups are included.

## Exact receipt retention and offline replay

The existing durable, fsynced, exclusive private files and protected-log chunk
codec remain. `route-reply-N` records exact response text. After checks, `replay-N`
retains original request, raw response text, actual provider final object, hashes
and structural checks. Redacted/truncated replay receipts are refused; secret
sanitization cannot silently change the payload used for replay. Raw credentials,
headers and reasoning internals are not logged.

Run offline validation with existing locked dependencies:

```sh
node --test .home-action-acceptance/offline.test.mjs
node .home-action-acceptance/browser-provenance.mjs
```

The browser check uses synthetic provider responses only. It tests both fresh
Home requests, the actual route and exact constructor parity, then invokes the
same offline replay path for both scenarios on desktop and mobile viewports.
After an eventual authorized run, recover complete protected receipts and use:

```sh
node .home-action-acceptance/replay.mjs /private/replay-1.json /private/replay-2.json
```

The replay script cannot dispatch a model request. It validates exact receipt
identity and results, seeds only checked conversation state through the existing
local DecisionStore, renders the actual Home client, focuses Review, explicitly
Chooses a proposal, checks goal/attachment linkage and retained draft/inputs,
then verifies reload and existing-goal preservation. Every non-GET browser request
is refused. This is an offline client bundle, not hosted-production UI acceptance.
Receipt semantics must still be reviewed by a human; fixture prose is not model
acceptance. The build does not import offline replies or browser drivers.

## Arming and repeat-dispatch limits

No run-authorization.json, reservation ID or executable approval is present.
After independent review and separate execution authorization, the coordinator
may create one direct child changing only `.home-action-acceptance/run-authorization.json`,
binding the reviewed unarmed SHA, source/inventory digests, exact existing project,
repository/branch, Node 24.21.0, unique run/reservation UUIDs and UTC expiry <= one
hour. Configuration is not approval. Source/parent/diff/approval/reservation remain
externally verified. No old authorization or ambient environment arming is reused.

Automatic Git deployment is disabled for `codex/home-action-acceptance-20261009`.
There is one build invocation, no repeat loop, no deployment command in the harness,
and repeated turn/wire dispatch or same-filesystem run-directory claim is refused.
There is no cross-host distributed lock: infrastructure reexecution remains a
residual limitation. Do not claim exactly-once execution across builds or retry an
ambiguous Preview creation. The coordinator supervises at most one pinned manual
Preview create. Existing project/credentials only, no new service/grants/storage.
Successful diagnostics emit blank static HTML; they do not deploy the application.
