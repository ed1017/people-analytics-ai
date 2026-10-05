# Incomplete Action Plan preparation

## Observed failure and limits of diagnosis

The hosted PR144 head `c26528ba2ae5f215c730dcec0831a11367156f66` accepted the original AI-skills prompt and Pin, then showed `Stage: incomplete_output` without producing tabs. The parent reported the event at approximately 22:55:24–22:56:34 UTC on 2026-10-05, with the exact saved goal preserved, no app-origin console errors and no retry. No provider response metadata or raw response was available to this worker. No live model call or credential investigation was made.

The source had two paths to the same category: an API response whose status was not `completed`, or schema-valid completed output rejected by the local unfinished-text guard. The route discarded status, incomplete reason and usage on both failures. The hosted category therefore cannot establish token exhaustion, filtering or a clipped prose field.

The existing request allowed one response with up to three bundles and six components each, capped at 5,000 output tokens, with SDK retries disabled. The installed OpenAI SDK's Responses type documents that `max_output_tokens` includes visible output and reasoning tokens. The schema and existing 32,768-byte validation limit remain unchanged.

## Bounded changes

- Increase the one-call allowance to 10,000 output tokens to provide more headroom for structured output plus reasoning. This is a mitigation, not proof that 5,000 caused the hosted failure or a guarantee that every response will complete. It can permit more generated tokens and longer latency; the model, schema, prompt, evidence and context boundary are unchanged.
- Preserve a fixed failure diagnostic containing a reason enum, normalized response status, bounded incomplete-reason enum, configured token limit, output byte count, output/reasoning token counters and an optional field-name enum. No output text, exception message, provider ID, credentials or raw payload is exposed or stored.
- Distinguish a reported token limit, filtering, other incomplete responses, noncompleted status, refusal, empty output, invalid output and completed output rejected by the existing unfinished-text check. The check still rejects clipped text; it does not silently rewrite it or accept partial JSON.
- Carry validated details through the coordinator to a collapsed **Preparation details** disclosure. Relabel the existing action **Retry Action Plans** after a failure; no competing button or automatic retry is added. Reload still requires a new explicit preparation action.
- Preserve the exact goal, user notes, previous proposal, drafts, calculations and immutable attachments on failure. Existing cache, request cancellation, duplicate-click and stale-context guards remain. One explicit attempt makes one request with `maxRetries: 0`.

## Verification

The actual POST route is exercised offline with the installed route dependencies and an isolated SDK: token-limit, filtering, unknown incomplete reason, failed status, empty output, refusal, completed clipped text, malformed JSON and successful explicit recovery. Tests verify the unchanged strict schema and model-input envelope, 10,000-token cap, disabled SDK retries, one call per attempt and no raw sentinel leakage. JSON fixture cloning stays inside the test VM so its strict plain-object checks have the same realm semantics as production.

All 1,306 unit tests pass. Production build with the existing evidence guard, standalone TypeScript, lint and whitespace checks pass. The new synthetic browser flow passes 57 checks at desktop1366px, mobile390px and 200%-equivalent683px reflow. It covers the exact prompt, initial failure, safe details, duplicate retry click, three recovered plans, chat edit/Apply, explicit calculation review/attachment, reload/goal restore, failed re-preparation with old records, and explicit later recovery. The total is 570 browser checks: new recovery57, unified attachment117, preparation resilience45, numbered edits45, context staleness51, linked-context staleness21 and goal-intent matrix234. All run against the production build.

Local evidence logs: `/tmp/incomplete-{full-unit,focused-unit,build,lint,final-tsc}.log` and `/tmp/incomplete-home-*.log`. Every browser endpoint is intercepted with synthetic data. These checks do not establish live completion or model quality.

The release remains held. An authorized exact-preview hosted retest must either demonstrate completion or capture the new bounded details before attributing a cause. PR142/143/144 heads, main and the held eNPS files are preserved.
