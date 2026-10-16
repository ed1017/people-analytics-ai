# Tracking Preview QA reservation

Temporary server-only opt-in: `VERCEL_ENV=preview`, exact branch
`VERCEL_GIT_COMMIT_REF=codex/progress-target-context`, and
`HOME_TRACKING_QA_BUDGET=v1`. All three are required. Production ignores the flag.
Do not start paid QA until the exact deployment and branch-scoped flag are verified.
A GET to `/api/home-solution-conversation` with no query returns the existing 400
validation response before dataset/projection reads. When the guard is active, it
also returns `X-Tracking-Preview-Budget: v1; rounds=2; input=40000; output=2000`.
Require this header on the exact Preview before any Send; absence means stop.

The normal Home model, reasoning, instructions, tools, schemas, progress validation
and confirmation flow remain intact. Preview caps each HTTP Send at two inference
attempts (one continuation), 2,000 total output/reasoning tokens each, and 40,000
input tokens each. Round two is final-only. Failure never retries or falls back.

Before **every** inference the official Responses input-token count endpoint receives
the same snapshot of model, instructions, complete accumulated input, tools and
structured response format. Only generation-only output-limit/service-tier fields
are omitted. The official count includes message framing. An unavailable, invalid
or excessive count stops that round before inference. No truncation is performed.
Count and generation both use zero SDK retries and the shared request abort signal.

The shared instructions/tools/response schema alone serialize to 99,647 UTF-8 bytes
before optional strategic instructions and conversation input. This is why an
English characters-per-token heuristic or input-only byte cap cannot establish
the reservation. Offline tests do not establish hosted counts. The authenticated count-only request
on head 6671706 at 2026-10-16 08:41:39 UTC returned **36,813 input tokens**.
The count gate must reject if the genuine QA request does not fit; do not silently
trim tools/history, lower reasoning, or relabel an offline fixture as hosted QA.

Pricing checked 2026-10-16 against:
- https://developers.openai.com/api/docs/models/gpt-6.1-sol
- https://developers.openai.com/api/docs/guides/token-counting

Standard input is $2/M tokens; reserve the higher $2.50/M cache-write rate for all
input, $10/M for output and a further 10% regional uplift. At 40K input the 272K
long-context threshold is not approached. Only local function tools are allowed.

`2 * (40000 * 2.50 + 2000 * 10) / 1000000 * 1.10 = $0.264 per Send`

Two prior failed Sends retain their full $0.363 reservation. Exactly **two additional
inference Sends** reserve $0.528, bringing the total held to **$0.891**, leaving
$0.109 unallocated under the original $1. Browser QA is the sole spending worker;
the two-Send limit is operator-enforced, not a distributed global quota. A failed,
cancelled or timed-out Send consumes its full reservation. No retries, extra
clarification Sends, parallel tabs or other model-backed routes in this allocation.
Stop on any count/limit/provider failure before further spending. The count gate
also checks continuation context; the first count does not guarantee round two fits.

Use the existing synthetic goal edited through the UI: maintain exactly 100 active
employees across all countries, business units and levels through 2026-12-31.
Recommended two Sends, conditional on a successful first proposal:
1. Request measurement plus a complete 90-person baseline dated 2026-08-01,
   freshness 30 days, explicitly use as baseline. Confirm locally, then reload:
   verify target/deadline, baseline, stale evidence and distance below target of 10.
2. Request a complete 110-person observation dated 2026-10-15, preserving measurement
   and baseline, without correction. Confirm locally, then reload: verify distance
   above target of 10 and retained baseline/history. Inspect at narrow size as well.

These cover the maintain arithmetic regression on both sides and persistence through
real proposal/confirmation. They do **not** establish at-target or cancellation
coverage. If the first Send fails or asks for clarification, stop and report; do
not silently replace the allocated tests or spend on another clarification.
A capped incomplete response is a failed QA step, never a functional pass.

Offline tests exercise the actual route, SDK serialization, real progress proposal
validation, production exclusion and refusal paths with synthetic transports.
They incur no provider calls and do not establish hosted token counts or success.

## Count-only investigation

After an over-limit/invalid-count failure, use the same branch-scoped Preview with
`HOME_TRACKING_QA_COUNT_ONLY=true`. Require the activation header to end with
`; mode=count-only`. This server mode counts the genuine full request but always
stops before inference, even if the count fits. It does not trim or mock context.
The 422 response includes `budgetDiagnostic`: fixed reason (`count_invalid`,
`input_limit`, or `count_only`), validated input token count (null for invalid),
serialized provider-request bytes and input/instruction/tool/response-schema byte
counts. Only numbers/codes are exposed, never request content or provider errors.

The earlier combined error did not preserve the count; it cannot retroactively
prove an exact token number. Its hosted log confirms zero inference attempts.
The count-only request above confirms an excessive valid count, not a count failure.
Runtime correlation 3e155ee3-d65f-4417-849e-7c0af27c0849 confirms zero model attempts.
The UI showed the exact token count; byte totals were returned in the 422 packet
but not retained in runtime logs, so exact hosted byte totals are not claimed.

Source inspection found 29,212 serialized base/progress instruction bytes (before
additional planning instructions), 7,401 response-schema
bytes and broad planning tools already using shared schema definitions. Removing
planning tools/instructions based on this test wording would alter real behavior;
no payload is removed or truncated. The scoped 40K limit accommodates the observed
initial count with 3,187 tokens of headroom, subject to recount before each call.
Count-only mode remains enabled during deployment verification. The sole browser
QA worker must verify the new exact Preview header, then arrange its branch-scoped
count-only flag to be disabled and verify the inference-mode header (without
mode=count-only) on the resulting exact deployment before the two allocated Sends.
Count-only mode is ignored in production. Production tracking remains held.
