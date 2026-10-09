# Unarmed semantic-smoke guard support

This test-support branch is based on exact source `02ddda844bcd4470a9dac9c015ed56b519ae6d68`. It adds no provider runner, count call, reservation, app code change or frozen fixture edit. A separately authorized publication overlay adds only the exact support-branch deployment-disable entry to vercel.json, retaining the original integration-branch entry. Every guard/preflight result continues to say `executionAuthorized:false`, even when supplied test metadata satisfies its structural checks. The prior handoff was rejected before execution; this work does not retry it.

## Scope and pins

`tests/helpers/swp-semantic-smoke-guards.mjs` checks the original manifest digest `c4b66bf45f682c6e5fdddc621950d79b88f4756dbd5fc028e1fb49cc77c0e45f`, runtime closure `9afb384afb65f6bbdce4e36af3648842d33335bd4a5caeef13c7533c8aa737b3` and every originally pinned runtime/support file. New support files are intentionally outside that frozen manifest; regeneration is forbidden. The verifier permits only the exact two-entry deployment configuration with both reviewed branch names false; any other root setting or branch change fails. Its report labels the historical digest baseRuntime and separately reports the deployment overlay; it does not claim the support checkout equals the original runtime closure. The original verifier's test-membership check will reject this support checkout's additions. Verify the untouched original source separately; use `verifyPinnedSource` here for the original pinned closure. A coordinator must review the new support source as a separate pin.

Six distinct request IDs bind the prior proposal: ordinary Home opener, exact-reply “both”, beyond-eight-turn boundary probe; full demand without a review, full demand with a current-review popup, and full solution other mode. Their route/mode/model pins differ: `/api/chat` and ordinary solution use source default `gpt-5.6-luna` with no reasoning override. The proposed demand test profile is `medium-acceptance-v1`, exact `gpt-6.1-sol`, effort medium, with a required separately verified server configuration receipt. Applying Sol/medium to ordinary Home would contradict this source and is rejected. No profile or flag is enabled here.

The “both” request requires the byte-exact preceding completed opener reply recorded by this same accounting instance. Boundary histories require per-turn origin labels. Synthetic boundary history never proves actual continuous multi-turn UI behavior. Original user input is explicitly fictional. No acceptance, save or measured operational outcome follows from a completion receipt.

## Independent limits

Smoke only: six logical requests, nine generations total, three tool calls total, zero count calls/retries. Home requests allow one generation/zero tools each; each of three full-solution requests allows two generations/one tool. A repeated logical ID is rejected, including after completion. Final allowed generation must advertise tool_choice:none. Only explicitly synthetic read_clock/read_evidence and the demand review/revise tools are eligible; ordinary-solution mode cannot call demand tools. Advertising any other tool surface fails closed. Actual source envelopes containing broader tools, or auto tool choice at this smaller final round, are blockers until the consumer verifies a compatible bounded construction; silently stripping tools or changing composed contracts is not approved.

A **192,000 UTF-8 byte complete SDK-body ceiling** is proposed (not armed), above observed medium stress 143,568 bytes and the sampled 175,621-byte input-ceiling-plus-envelope derivation. It is not inferred token capacity. The guard compares supplied actual serialized wire bytes against the complete JSON body, not only input/messages. It includes instructions, tools, response format, model/reasoning, output cap and every extra serialized field. Per-call payload hash, measured input bytes, tokenizer receipt and independently verified composed-contract receipt are required. Input remains at most 120,000 UTF-8 bytes. Missing verified complete-input tokens or any cap overflow prevents an attempt intent. No 32-item limit is imported: 32 retained state turns are a different constraint.

Output caps: Home 4,000/generation; full solution 5,000/generation, maximum 42,000 output tokens across the smoke. Output-items serialization remains at most 70,000 JavaScript characters; tool arguments at most 32,000. Call/request/batch deadlines are 30/90/300 seconds; late replies remain ambiguous. The caller must independently implement cancellation and enforce maxRetries:0 on its actual SDK/transport. This offline state machine cannot cancel a network call and supplies no network capability.

Historical v5 is untouched and **separate**: four followups from its separately supplied anchor, at most 16 generations/24 tools, no opener regeneration. These allowances cannot be added to the smoke budget.

## Durable accounting

The fresh exclusive fsynced journal reuses `swp-preview-receipt-log.mjs`'s bounded ASCII chunk encoding/checksums. Request/attempt intent is durably written before returning. Only one attempt may be pending. Failed intent recording halts before a consumer may send; failed completion recording, timeouts, missing/excess usage and unsupported/excess tool results retain full ambiguous exposure and halt. Existing directories cannot be reused as fresh runs. On crash, a durable intent without completion remains unresolved; the reader never interprets it as zero spend, success or permission to retry. A new process must reconcile existing receipts independently, not claim a new run ID to evade retained exposure.

The recorder contract is synchronous and durable. Async callbacks are rejected. Tests use local synthetic completion values only; tags such as observed-model-reply describe what a future consumer must preserve, not actual provider origin of these test values. Guards are support for an externally approved consumer, not evidence that it has integrated them.

## Maximum exposure, no reservation

Use separately reviewed model-specific input/output rates in USD per million, and verified full-input token maxima `I_H`, `I_D`, `I_O`:

`E_microUSD = 3×ceil(I_H×P_Luna_input + 4000×P_Luna_output) + 4×ceil(I_D×P_Sol_input + 5000×P_Sol_output) + 2×ceil(I_O×P_Luna_input + 5000×P_Luna_output)`

The demand coefficients cover four Sol/medium generations; ordinary Home plus other-mode solution cover five default-Luna generations. If those future mode/model pins change, a new reviewed formula is required. Reasoning usage must fit the demand generation's output envelope; tokenizer/complete-input uncertainty is still a mandatory preflight blocker. There are no count-call allowances because count calls are prohibited. No current rates or numerical input-token maxima were verified here, so no dollar maximum is asserted. Preflight requires reviewed pricing/tokenizer receipts and rejects a computed envelope above retained unallocated headroom. Unit-test rates are fictional arithmetic inputs, not pricing evidence.

Retained exposure is exactly **18,669,877 microUSD ($18.669877)** against **50,000,000 microUSD ($50)**. Unallocated headroom is **31,330,123 microUSD**. Reservation is **zero**. Any future independently approved envelope must fit that headroom and account for every ambiguous attempt at its full envelope until durable reconciliation; this file allocates none.

## Offline checks and remaining blockers

Eleven focused offline tests cover original source integrity, preflight blockers, complete UTF-8 serializer mismatch/oversize, measured input/tokens, mode/model/schema/tool/output pins, exact preceding reply, synthetic-history labeling, nine/three/per-request limits, retries, late/deadline outcomes, fsynced bounded receipts, exclusive-run reuse, ambiguous completion-record failures and symbolic exposure arithmetic. Affected ESLint and git diff --check pass. No SDK, provider, tokenizer/count endpoint, app startup or deployment was invoked.

Still required before arming any separate consumer: independently approved source/support pins and execution authorization; actual serializer and request-dependent instruction/tools/schema verification; tested model/profile receipt; verified exact tokenization/full-input bounds and reviewed rates; budget/reservation approval; deadline/cancellation/no-retry transport verification; safe tool-surface integration; valid current review/goal/dataset binding; independently reviewed source conflict resolution and durable accounting. Private anchor/review/argument hashes and origin evidence remain required only for a separate historical continuation, not manufactured by this smoke.

```sh
node --test tests/swp-semantic-smoke-guards.test.mjs
node node_modules/eslint/bin/eslint.js tests/helpers/swp-semantic-smoke-guards.mjs tests/swp-semantic-smoke-guards.test.mjs
```

Publication suppression now includes only codex/swp-semantic-smoke-offline-guards-20261009 in addition to the existing integration branch. No other branch or production deployment behavior is changed. The support source can be published for review without a manual deployment or runtime execution request. No build hook/application import/provider entry point was added.
