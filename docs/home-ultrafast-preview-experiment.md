# Single-call Home Ultrafast Preview screen

Prepared on reviewed base `0a847dade9d5a34ad72050b465ce000c1f3a7ccc`. This patch enables a later one-submission serving-tier screen; it does not deploy, set environment flags or make paid requests. It does not establish comparison-workflow support or a latency result.

Activation requires all three server values: `VERCEL_ENV=preview`, `VERCEL_GIT_COMMIT_REF=codex/home-reviewed-plan-fast-path-20261010`, and `HOME_ULTRAFAST_EXPERIMENT=single-call-v1`. Production, local runs and other branches retain the current default tier and four-round service limit. Automatic Vercel deployment for this review branch remains disabled.

## One generation attempt

The experiment permits one Responses generation attempt per application POST, using `gpt-6.1-sol`, medium reasoning, Ultrafast, 5,000 maximum output tokens and zero SDK retries. There is no token-counting endpoint or other added provider endpoint. Hosted provider tools and hidden server context are rejected. Existing tools are local functions.

The request retains all instructions, source evidence, history, tools and structured-output schema. Truncation is explicitly disabled. The documented 1,050,000-token model context ceiling supplies the conservative input bound; there is no new application token cap or context trimming. Existing request-size guards, fresh-reader concurrency of two, tool limits, 60-second provider timeout and shared 90-second deadline remain intact.

The original checked fast path is unchanged: a valid first-round result can finish normally. If the normal service requires another model round, the guard throws before a second dispatch and returns HTTP 422 with `preview_single_call_incomplete`. Blocked calculations, missing scope and invalid citations cannot become fabricated final answers. Provider/incomplete-output failures also retain their ordinary failure behavior. First-round model, served tier and token usage remain in sanitized failure logs for reservation reconciliation; absent usage is unknown, not zero.

## Generation ceiling

Official model documentation checked on 2026-10-10 gives a 1,050,000-token context window. Long-context rates multiply standard input/cache rates by two and output by 1.5; Ultrafast multiplies by six. Using the most expensive input category gives $30/M cache-write input and $90/M output, plus the conservative 10% regional premium:

```
(1,050,000 × $30/M + 5,000 × $90/M) × 1.10 = $35.145
```

This deliberately allows a full context of input plus the output allowance. It is a generation-token bound under the provider's model/output contracts, not an invoice or infrastructure bound. Each additional submission requires its own reservation; this guard is per POST, not a project spending control. No counting-endpoint fee or latency is introduced.

## Offline verification and later measurement

Tests cover real-SDK mock transport with one endpoint, zero retries on rate-limit/timeout failures, payload parity, unsupported hosted context, checked 27-hour A completion, incomplete continuations, unchanged production multi-round behavior, and bounded usage receipts. All provider results are synthetic; tests do not prove account compatibility, served tier or speed.

Later parent coordination must bind the reviewed SHA, branch-only Preview activation and one 27-hour A submission with a $35.145 reservation and no automatic retry. Measure the complete usable result and inspect the actual served model/tier and usage. A default-tier response or required continuation fails the Ultrafast screen. Preserve the working default-tier Preview as the comparison/rollback anchor. Production promotion and wider workflow acceptance are outside this experiment.

Sources: [model limits and pricing](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [Ultrafast HTTP configuration](https://developers.openai.com/api/docs/guides/ultrafast-mode).
