# Two-turn actual-route Plan B draft

Offline preparation only. No execution authorization or budget reservation is
created by this source. No push, PR, deployment, provider request or database
operation is part of preparation. Keep the separate CI activation draft unpublished.

## Exact application and bounded scenario

The preserved application is integration commit
`02ddda844bcd4470a9dac9c015ed56b519ae6d68`, fluid manifest SHA-256
`c4b66bf45f682c6e5fdddc621950d79b88f4756dbd5fc028e1fb49cc77c0e45f`,
runtime SHA-256
`9afb384afb65f6bbdce4e36af3648842d33335bd4a5caeef13c7533c8aa737b3`.
Every listed application/support file remains exact except the separately checked
build-only `vercel.json`. Runtime/test membership is also checked. All frozen
reference fixtures, historical failure results and source manifests remain unchanged.
This is not the later grounded-comparison successor or production main.

The first question reuses the reference fixture's managed-services opener. The
second newly authored fictional turn specifies support/client operations, the same
Service Analyst slice, nine months starting November 2026, four existing roles
at 25% availability, and labelled illustrative assumptions for remaining inputs.
It requests no save or scenario acceptance. The actual first POST reply/state and,
when present, its checked demand review become the second request. No archived,
reconstructed or fabricated assistant state is substituted during an armed run.

The build bundles and directly invokes the actual
`app/api/home-solution-conversation/route.ts` POST with Web Request/Response objects.
The dataset router, request parser, model selection, composed instructions,
service loop, reference tools, provenance validators and arithmetic are unchanged.
There is no HTTP server. Two explicit test seams exist: the OpenAI constructor
delegates to the bounded SDK adapter, and the database projection loader always
throws. The route VM has a fixed synthetic key sentinel, conversation feature
enabled, and exact `medium-acceptance-v1` / `gpt-6.1-sol` test configuration; it
receives no real provider or database credentials. The outer build uses the
existing Preview key only after arming/preflight. These flags do not describe or
change production configuration. No new Vercel AI Gateway/provider dependency,
fallback, model selection or routing change is introduced.

## Guards and billing boundary

- Exactly two user turns; four generation attempts globally, including both turns.
  The counter increments before recording/dispatch and never resets per turn.
  Error/ambiguous attempts consume their slot; no second deployment is justified.
- Exact `gpt-6.1-sol`, medium reasoning, 5,000 output tokens, function tools only,
  sequential calls, direct `https://api.openai.com/v1/responses`, SDK retries zero.
  Existing four-round/six-tool/90-second-turn guards remain unchanged. Overall
  batch deadline is 180 seconds and cannot outlive the reservation.
- The sole outbound payload adaptation is explicit `service_tier: 'default'`.
  This forces the requested Standard billing tier **for this test**. Every call
  receipt records requested and actual model/tier. There is no production-tier
  parity claim and no fallback if Standard is rejected or the returned tier differs.
- Zero input-token-count requests, paid built-in tools, retries, DB writes/reads,
  save actions, runtime endpoints, application deployment or credential exports.
  The network guard allows one wire dispatch per counted SDK attempt, with exact
  payload equality; other endpoints, redirects and duplicate dispatch are refused.
  Ambient custom headers/admin keys are rejected; unused SDK account/admin/webhook
  fields are explicitly null. Wire authentication, absent account overrides,
  client request ID and zero SDK retry count are checked without logging headers.
- Any invalid final schema, checked-tool error, route/runtime failure, missing
  usage/request identity or attempt ambiguity stops the batch. A partial result
  retains its receipts and budget; it cannot expand to finish the conversation.

The parent-reported independent budget review allows a proposed worst case of
`4 × (1,050,000 × $5/M + 5,000 × $15/M) × 1.10 = $23.43`.
Use the full input rate without cache discounts. Current retained amount is
$23.369877; this prospective allocation would total $46.799877, within $50.
This reviewed formula is **not** an execution authorization or an active reservation.
Usage-based receipt estimates are conservative estimates, not final billed charges.
The full reservation remains retained pending external closure, even on success.

## Durable private evidence

Each before-attempt receipt is exclusively created and fsynced before the SDK call.
Receipts include the full sanitized synthetic request, actual route payload plus
explicit billing override, visible provider text/tool outputs (not reasoning),
provider response/request IDs, client request IDs, actual model/tier, token usage
including cached/reasoning details, checked route reply/state, and terminal status.
Known credentials and common credential patterns are redacted. There is no raw
provider error/header dump, raw log artifact or environment export.

Local files are mode 0600 in a mode 0700 run directory. The existing receipt chunk
codec emits complete checksummed, reconstructable receipts into protected build
logs; none is put in a publicly served directory. Missing/truncated log chunks
block budget closure. The only possible published output is one blank HTML file,
created after both turns complete. Failed/partial runs exit nonzero. READY alone
is not model acceptance; semantic review remains pending even after structural success.

## Offline verification

Run from this worktree using the existing lockfile's dependencies:

```sh
node --test .plan-b-two-turn/offline.test.mjs
node node_modules/eslint/bin/eslint.js .plan-b-two-turn/*.mjs .plan-b-two-turn/*.cjs --max-warnings 0
```

The tests stub the SDK and exercise the real route bundle. They cover exact
payload/schema/model, count ordering, both first-state carryover paths, checked
tool arithmetic, turn and global bounds, failure/ambiguity stops, dataset binding,
private receipt round trips, and the unarmed build. A separate clean-environment
child uses the locked real SDK with a wholly offline fetch stub to prove actual
serialization, header identity, custom-header rejection and zero retries on 503.
Synthetic test answers are
labelled fixture inputs and are never model acceptance evidence.

## Missing preflight before any external action

1. Independent source review of the exact final commit, diff and harness digest.
   Confirm no concurrent run/reservation has changed the retained budget.
2. Explicit approval to publish only the guarded branch
   `codex/swp-plan-b-two-turn-20261009`, preserving the pinned base and other drafts.
   Review any deployment side effect before publication; its exact branch is
   disabled in `git.deploymentEnabled`. No production merge is proposed.
3. A real parent-owned $23.43 reservation and one-use execution approval for exactly
   one manual Preview deployment in project `prj_qXEE4BF4KrbTbzFvDg8dc3MJQjDF`,
   repository `ed1017/people-analytics-ai`, the reviewed commit and branch. The
   local directory lock is only a same-build guard, not distributed idempotency.
   Never redeploy/retry after an uncertain create/deploy/build attempt; retain the
   reservation and inspect existing evidence first.
4. Verify Standard availability/budget/rate allowance, Node 24.19.0 and the existing
   locked OpenAI 7.23.0 / Undici 7.30.0 / Next 16.3.6 packages, Preview protection,
   build identity variables, and availability of the existing Preview key without
   reading/exporting it. Dependency install is lockfile-only with lifecycle scripts
   disabled; no storage/billing/permissions expansion is included.
5. Determine the supported one-deployment mechanism to supply non-secret
   `SWP_PLAN_B_AUTHORIZATION` JSON without changing persistent project settings.
   `authorizationTemplate(verifySource(root))` produces an **unarmed** template.
   Only the coordinator can fill the approved run/reservation/approval IDs, exact
   source commit/harness hash, true authorization flags and an expiry within one
   hour. Model/endpoint/limits must remain exact. No key is in that object.
   Missing injection capability is a blocker, not permission to add a public route
   or persistent arming flag. Never share an armed object in public source.
6. Bind the one observed deployment ID, fetch all protected receipt chunks, verify
   completeness/hashes and actual usage/tier/IDs, then perform semantic and budget
   closure. No further provider call is authorized by a partial or failed result.

The canary's READY result proves the deployment connector/build path only. This
draft has not been run against a provider and does not change the frozen historical
failure or establish full model, browser, billing-tier or production acceptance.
