# Unarmed SWP manual Preview acceptance transfer

This is a separate diagnostic adaptation of the protected manual Preview BUILD mechanism at public commit `50e196836042120a4c223a7884ebf3f5fe380e1a`. It is prepared for existing executor `01a11b90-b17b-7157-bbb7-92999748e020`; no Preview, model call, database read or budget reservation has been performed here.

The application remains frozen at `cf9dbd1195ac11ceda5645ace392034e9bb03f7e`, tree `672101f92b95be52dd8b4d67d26496dcb72e4135`. Its 514 application/build files are reproduced exactly in export commit `e3eae65cc641513041c379dcf2bed6845f323c4d`, tree `aee2444b044adc1bca4ee1094cf01774d1761db7`, directly above public prerequisite `f7a8f237de280b247822c8389f39813730bf3c64`. Private ancestors and private operational SQL/evidence are excluded. Public-base SQL, documentation and tests remain inherited public files, not private overlays. The separate diagnostic commit adds five diagnostic JavaScript files and this document. Its identity and artifact hashes are in the external transfer manifest.

## Manual execution boundary

The ordinary application route is NOT a protected paid-run mechanism. It has neither operator authentication nor a global tranche ledger, and ordinary application routes include DB loaders. Do not run Next build/start or send this fixture through a hosted app route and claim a fixture-only guarantee.

This diagnostic directly calls the exact application conversation service with unavailable workforce sources (0/18), an invented clock, the actual returned conversation state and a DB/projection loader that always throws. It imports no DB/server loaders. The only provider transport is the existing OpenAI proxy transport, constrained to POST `/v1/responses` and `/v1/responses/input_tokens` on `https://api.openai.com`, with redirects rejected, no alternate endpoint, no SDK retries and no fallback model. Provider SDK import occurs only after execution gates pass. No SDK/provider import is needed for preparation or offline tests. The test doubles are only in the offline test file; the paid runner does not import them.

The existing executor must reconcile this adaptation with its successful protected Sol runner receipt. This package cannot prove that unavailable remote receipt or an existing Preview protection setting. Do not expose a route or change production settings to enable this test. A future supervised deployment-local configuration can use Node 24, locked OpenAI 7.23.0 / Undici 7.30.0, the existing protected Preview project and credential configuration, `framework: null`, the explicit manual build command, and a blank static output directory:

```json
{
  "framework": null,
  "buildCommand": "node --experimental-strip-types tests/manual/swp-preview-acceptance.mjs --execute-reserved-batch .swp-preview-acceptance/reservation.json",
  "outputDirectory": ".swp-preview-acceptance-empty"
}
```

This temporary override and armed manifest are not provided or activated by this transfer. No package script, HTTP route, workflow, cron or Git-triggered paid hook is added. The parent/operator must ensure one invocation for the reservation. The exclusive filesystem claim and fsynced pre-call receipts protect one process/build filesystem; they do not establish global exactly-once execution. Stop on ambiguous deployment completion, inspect the same deployment, and retain the whole reservation. No redeploy/retry or reclaim of unused rounds is authorized.

## Minimal actual-model scenario

There are exactly three model user turns, using actual preceding service state and review/comparison outputs:

1. “We’re taking on two new managed-services contracts. Can our current teams cover them?”
2. “Make that nine months.”
3. “We have four existing Service Analysts in this same role slice. Assume 25% of each is available for these contracts; keep the other assumptions and explain the remaining uncertainty.”

After each returned operational review the declared local fixture action is “Use your assumptions for now”: accept premises for scenario use, run the existing pure staffing/comparison helpers and pass their actual results to the next turn. This is a declared deterministic user-action simulation, not a forced model tool result or a browser click. No goal is saved. A zero gap generates no staffing plan.

The initial actual model must offer useful provisional assumptions rather than invent source facts. This narrow role calculator supports only the reviewed `Illustrative Service Analyst / client operations` slice. It is not an engineering/security/project-management staffing engine or a complete contract plan. The optional code-owned illustrative example is two contracts × 4,000 role-hours/year, 0 assumed uncommitted capacity and 1,600 productive hours/FTE/year; the actual model is not forced to emit these figures. Unsupported scope, insufficient inputs, invalid values or inconsistent linkage must stop with a receipt, not silently receive those defaults.

Turn 2 must change only months and its current-turn basis. Turn 3 must change only existingRoles and availabilityPct with the current-turn user basis; it must retain nine months and every other value/basis. Positive already-counted available capacity excludes internal Build/Move alternatives, preventing double counting. The paid runner validates the actual typed patches and deterministic calculations. Semantic review must still assess useful clarification, proposed versus supplied assumptions, uncertainty, units, period, scope and absence of unsupported feasibility/service claims. Cumulative workload effort/shortfall must remain distinct from end-date staffing and cash limits. No assumption becomes verified merely because the fixture accepts its scenario use.

There is a known frozen long-objective limitation: a long model-written objective plus the staffing helper suffix can exceed an existing assumption-text bound and stop with “Supply a reviewed value and its basis, or leave it Unknown.” The offline expected-blocked case retains the full 174-character long objective. The public starter above is shorter, but an actual model may still expand its objective and hit that limit. Stop, retain evidence and report failure; never truncate the objective, alter source or weaken the guard during this acceptance run.

## Model, ceilings and proposed budget

Parent reports the tested wire identifier `gpt-6.1-sol`, reasoning `medium`; the executor-held tested config receipt SHA is still required. The trusted SWP profile is `medium-acceptance-v1`. No temperature, top_p or top_logprobs is sent. Default legacy settings remain unchanged.

Hard runner limits: 3 turns × at most 4 model rounds = 12 count calls + 12 generation calls; at most 6 tool calls per turn. The exact provider count must be at most 100,000 input tokens before each generation; max_output_tokens is 5,000. Therefore generation inputs total at most 1,200,000 counted tokens and generation outputs at most 60,000 tokens. JSON count payloads are separately capped at 160,000 UTF-8 bytes; the application input guard is 120,000 bytes. Bytes are not a proved token count or a billing bound for counting. Both endpoints share 6 starts per rolling minute; individual calls timeout after 30 seconds, manual turns after 6 minutes, batch after 30 minutes. The manual turn deadline differs explicitly from the ordinary route's 90 seconds to accommodate existing protected-run pacing.

Parent's PROPOSED conservative reservation is $18.90:

`12 × ($1 count contingency + 0.100M × $5 input envelope + 0.005M × $15 output envelope)`.

Parent reports official pricing checked at https://developers.openai.com/api/docs/pricing: short-context standard Sol $2 input / $2.50 cache write / $10 output per million; long-context $4 / $5 / $15. This proposal deliberately uses the high $5 input/cache-write and $15 output envelope. Count-endpoint billing is undocumented. The $1/count allowance is a contingency equivalent to 200,000 tokens at $5/M, not a documented count fee or a mathematically guaranteed invoice ceiling from the byte cap. Parent must explicitly accept this contingency before execution. Old Luna rates and reservations from the reference harness are not reused.

Current retained exposure is $11.25096 of $50. If and only if the parent reserves this entire $18.90, cumulative retained exposure would be $30.15096, leaving $19.84904. No part has been reserved by this preparation. The unarmed manifest carries the proposal but null reserved/run/project/receipt fields and parentReserved=false. Full reservation remains retained after success, early failure, missing receipts or ambiguity; there is no refund/retry loop.

Before any execution, the parent/executor must bind the exact tested-config receipt digest, confirm the protected harness/transport contract, approve/reserve the count contingency and entire tranche in its external ledger, and supply one run/reservation UUID, parent authorization, existing project ID and a launch window no longer than one hour. Hash exact armed manifest bytes. Required nonsecret environment bindings are SOLUTION_ACCEPTANCE_RUN_ID, SOLUTION_ACCEPTANCE_MANIFEST_SHA256, SWP_DEMO_MODEL_PROFILE and SWP_DEMO_MODEL_ID, in addition to existing Vercel project/deployment identifiers. Never export credential values. The runner validates file hashes, runtime/dependency versions, exact model, budget, project/Preview environment and window before SDK dispatch.

## Receipts and remaining gates

Chunked private build receipts bind application/export identity, source manifest, fixture, model/config receipt, project/deployment, run/reservation and full retained budget. They contain sanitized fictional tool/result text, status/request IDs and bounded usage; provider reasoning internals and credentials are omitted. Truncation/redaction flags are explicit. A manifest byte hash and object hash are recorded. Pre-call counters count attempts conservatively, including a persistence failure before dispatch.

`executionComplete=true` only means all three turns passed mechanical service checks. `semanticReview` remains pending, `fullAcceptance=false`, `browserAcceptance=false`. Review actual model outputs for the criteria above before claiming conversational quality. This manual service harness does not prove browser click/persistence behavior, end-to-end hosted app behavior, live workforce validity or production readiness.

Local frozen browser evidence is referenced in the external handoff, not copied as private operational content. The optional user-requested demand editor is unimplemented and is a separate Medium successor after cf: reveal only on explicit request; reuse exact-key typed patches, validation, recalculation, renewed acceptance, review/save and provenance. Natural-language edits remain the supported default and this limitation does not block the three-turn natural slice.

Offline commands (no provider or DB calls):

```sh
node --experimental-strip-types tests/manual/swp-preview-acceptance.mjs --prepare
node --experimental-strip-types --test tests/swp-preview-acceptance.test.mjs
node node_modules/eslint/bin/eslint.js tests/fixtures/swp-preview-scenario.mjs tests/helpers/swp-preview-acceptance.mjs tests/helpers/swp-preview-receipt-log.mjs tests/manual/swp-preview-acceptance.mjs tests/swp-preview-acceptance.test.mjs
```
