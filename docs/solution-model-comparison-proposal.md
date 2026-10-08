# Proposed finite model comparison — unarmed

Status: proposal only. No reservation, run ID, deployment or API call has been created. The canceled four-sequence run stays closed; its full unresolved reservation remains retained. Starting conservative cumulative bound: **$6.49296**; overall cap: **$50**.

Use the independently reviewed overlap/provenance commit for both arms in one isolated build-time Preview harness. Keep `CHAT_MODEL` and production unchanged. Use only the already-authorized Preview server credential, with no endpoint or credential changes.

## Sequence and controls

1. A single Sol access/compatibility smoke, at most two count/generation pairs: one forced harmless fictional calculation tool call, then one structured final response. Max 10000 input and 1000 output tokens per generation. An incomplete smoke at this cap stops without increasing it. Tools are evaluated locally, with no external application writes. On access, unsupported parameter, incomplete output, schema or usage failure: stop; no fallback or retry.
2. If compatible, run an isolated first `blend-replace` turn on Luna and Sol independently in parallel, using the same preserved fictional input, fresh independent state and up to four pairs each. This is an isolated interaction gate, not end-to-end acceptance. Review both outputs before enabling later stages.
3. Only if both isolated turns pass, run the complete three-turn `blend-replace` sequence for each model from the original fresh fixture. These arms may run independently in parallel. Carry each arm's own outputs forward; never share mutable state. Keep source, schemas, limits and tools identical.
4. Pause after every turn and capture a durable receipt. Review semantic behavior before permitting the next turn. A failed provenance/ownership assertion or semantic failure stops that arm before another provider call. Do not silently run later scenarios, repair loops or reruns. Fix separate worst-case reservations for the smoke, Luna arm and Sol arm before launch; enforce a shared aggregate cap without sharing conversation state.

Prompts: combine manager support and learning; replace manager support with an open office hour while retaining learning; retain learning unchanged and explain how the activities work together. Shared participation must remain unconfirmed unless the exact checked source establishes it. Creativity and substantive answers remain expected.

## Request differences

Only model ID differs between the full arms: `gpt-5.6-luna` and `gpt-6.1-sol`. Set `reasoning.effort=medium` explicitly in both, matching the documented omitted-setting baseline described by the parent. The existing harness omits reasoning and has no temperature/top_p/top_logprobs; the comparison must omit those fields in both arms. Use Responses tools, strict JSON schemas, `parallel_tool_calls=false`, default service tier and zero SDK retries. The smoke uses smaller caps and a fixed synthetic tool/final prompt, so it is a compatibility gate, not a scored arm. Record effective request fields and provider-returned model/tier/usage. If either model rejects medium, stop rather than substitute an effort level.

## Finite cost envelope

| Stage | Max count calls | Max generations | Input/output cap per generation | Generation allowance | Count allowance | Ceiling |
|---|---:|---:|---|---:|---:|---:|
| Sol compatibility smoke | 2 | 2 | 10000 / 1000 | $0.030 each | $0.050 each | $0.160 |
| Luna isolated blend turn | 4 | 4 | 50000 / 5000 | $0.0185 each | $0.050 each | $0.274 |
| Sol isolated blend turn | 4 | 4 | 50000 / 5000 | $0.150 each | $0.050 each | $0.800 |
| Luna full blend, conditional | 12 | 12 | 50000 / 5000 | $0.0185 each | $0.050 each | $0.822 |
| Sol full blend, conditional | 12 | 12 | 50000 / 5000 | $0.150 each | $0.050 each | $2.400 |
| Total | 34 | 34 | finite maximum | | | **$4.456** |

Separate proposed reservation ceilings: smoke $0.160; Luna $1.096; Sol $3.200. These are unallocated proposals, not existing reservations. The immediate smoke plus isolated gate ceiling is $1.234; later stages cannot start until both isolated results pass review.

Sol generation allowance uses the parent-verified short-context rates $2 input / $10 output per million. Luna uses the prior conservative $0.25 input/$1.20 output envelope: $0.0185 per generation, exceeding the parent's documented $0.20/$1.20 rates ($0.016 at these caps). Count allowances are conservative reserves, not claims of actual billing. Count returned input must fit the per-stage cap before generation. Output usage includes reasoning within the configured output cap. No cached-input discount is assumed. Total prospective retained/reserved bound: **$10.94896**. Actual spend remains unknown until receipts; never release an uncertain allowance without terminal evidence.

Before arming, bind a reviewed cost manifest to the reviewed source/fixture hashes, stage-specific budgets, exact project, fresh single-use run/reservation IDs and expiry. Require durable reservation before the first call and durable stage receipts before every subsequent call. Maximum 68 HTTP operations, 6/minute combined across both parallel arms, count and generation; use finite timeouts and stop on uncertainty. The existing harness's old clock-only reservation authorization must not be reused.

## Score and report

For each turn, independently score 0/1/2 for provenance correctness, following user intent and retaining unaffected activities, avoiding unnecessary questions, and complete coherent responses. Any invented confirmed overlap, authority, computed result or save action is a critical failure regardless of fluency. Record latency for count and generation separately; input, output and reasoning usage when supplied; calculated generation cost separately from retained allowances. Preserve raw fictional tool arguments/results and final responses with transport hashes. Compare both scored arms without promoting the winner to production. Browser persistence and broader scenario acceptance remain separate gates.

Pricing/capability references supplied and verified by the parent: https://developers.openai.com/api/docs/models/gpt-6.1-sol and https://developers.openai.com/api/docs/guides/latest-model. Review this manifest before any reservation or provider call. Reuse the reviewed harness and existing deployment configuration with a narrow per-arm parameterization; no new testing platform. The 50000 input token cap is a stop boundary, never permission to truncate preserved semantic context.
