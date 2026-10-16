# Tracking Preview QA reservation

Temporary server-only opt-in: `VERCEL_ENV=preview`, exact branch
`VERCEL_GIT_COMMIT_REF=codex/progress-target-context`, and
`HOME_TRACKING_QA_BUDGET=v1`. All three are required. Production ignores the flag.
Do not start paid QA until the exact deployment and branch-scoped flag are verified.

The normal Home model, reasoning, instructions, tools, schemas, progress validation
and confirmation flow remain intact. Preview caps each HTTP Send at two inference
attempts (one continuation), 2,000 total output/reasoning tokens each, and 25,000
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
the reservation. Exact hosted counts have **not** been obtained by offline tests.
The count gate must reject if the genuine QA request does not fit; do not silently
trim tools/history, lower reasoning, or relabel an offline fixture as hosted QA.

Pricing checked 2026-10-16 against:
- https://developers.openai.com/api/docs/models/gpt-6.1-sol
- https://developers.openai.com/api/docs/guides/token-counting

Standard input is $2/M tokens; reserve the higher $2.50/M cache-write rate for all
input, $10/M for output and a further 10% regional uplift. At 25K input the 272K
long-context threshold is not approached. Only local function tools are allowed.

`2 * (25000 * 2.50 + 2000 * 10) / 1000000 * 1.10 = $0.1815 per Send`

Exactly five sequential browser Sends reserve **$0.9075**, leaving **$0.0925** of
the separately approved $1 unallocated. Browser QA is the sole spending worker;
the five-Send limit is operator-enforced, not a distributed global quota. Each
failed/cancelled/timed-out Send still consumes one full reservation. No automatic
or manual retries, extra clarification Sends, parallel tabs or other model-backed
routes within this allocation. Preserve all earlier budget reservations. Stop on
any count/limit/provider failure and report it before further spending.

Use an existing saved synthetic goal, editing its goal text through the UI first.
The five Sends are: measurement plus stale baseline; below target; at target;
above target; proposed observation to cancel. Confirm/cancel locally, inspect
after reload and at narrow size without additional Sends. A capped incomplete
response is a failed QA step, never evidence the functional gate passed.

Offline tests exercise the actual route, SDK serialization, real progress proposal
validation, production exclusion and refusal paths with synthetic transports.
They incur no provider calls and do not establish hosted token counts or success.
