# Unarmed prior-policy comparison lane

App pin: `4d65d4e0dd86bd467687747827da8930cc0a25cc` (1,254 unchanged app files).
Reviewed diagnostic transport/cost logic: `41b23ba89b0e11c4189098c7e4a0db5fdf2f9e60`.
One ordinary first question: **I want to reduce turnover**. No followup, second
product scenario, saved goal, injected plan, operational Apply or UI deployment.
No authorization or aggregate-verification receipt file is present. This work
does not reserve, publish, read live data or authorize provider execution.

## Exact app path and narrow read seam

The current Home request constructor, POST, dataset wrapper, grounding reader
dispatcher, thirty-second verifier, service, tools and response checks run from
the pinned app. The build-only SDK seam retains transport and payload checks.
Only the attrition GET module is replaced with a bounded adapter to the existing
app aggregate endpoint. Every other reader is a refusal seam; projection reads
also fail closed. This is not a full hosted-app or database-handler test.

Allowed external data request: **GET https://ed-workforce-ai.vercel.app/api/attrition**,
no query, no cookies/credentials, no redirects, no retries. The URL comes from
the pinned repository README; reachability is not established by stub tests.
The request and response must have `x-workforce-dataset: legacy-v1:0`.
Required source `as_of`: `2026-09-30`; scope: company-wide, unfiltered. These are
required cutoffs, not a claim this preparation observed the live endpoint.
The legacy token remains uncertified, not a certified immutable data release.

Two HTTP reads per phase, sequential, eight seconds total for initial data and
app recheck, 65,536 response bytes/read and at most 36 unique months. A hung read
loses the timeout race even if it ignores abort. Failure latches and stops later
work. Facts must match between reads; the model phase must also match the prior
approved aggregate hash. Wrong dataset, stale/missing date, unavailable result,
suppression, future/duplicate months, bad numeric fields and oversized data stop
before provider dispatch. Fetch cancellation is not proof the remote server
stopped its underlying database queries.

Retained summary fields: `total_exits`, `voluntary_exits`, `involuntary_exits`,
`regrettable_exits`, `retirements`, `total_turnover_ytd_pct`,
`voluntary_turnover_ytd_pct`, `annualized_voluntary_turnover_pct`,
`regrettable_share_of_voluntary_pct`. Monthly fields: `month`, the first four
exit-count fields, `monthly_turnover_pct`, `monthly_voluntary_turnover_pct`.
No reason labels, group labels, names, pay or arbitrary fields are retained.
Only A1 is loaded in the normalized Home packet. Every other source has null
facts and is unavailable/invalid according to the unchanged app normalizer.
The app selects at most three monthly observations. No extra source/SQL access
or new grant is introduced. The existing remote attrition endpoint still owns
its six aggregate-table queries; the two-HTTP-read cap is not a two-SQL-query cap.

## Two separately approved phases

1. `aggregate-verification`: no provider client or reservation. Two reads and the
   exact verifier must pass. The SDK-construction seam deliberately returns the
   route's 422 checkpoint before a generation call. Successful verification is
   recorded separately; 422 alone is not success.
2. `model-assessment`: a later exact authorization must name the approved
   aggregate hash and the SHA-256 of the prior zero-provider receipt. The fixed
   receipt file must show this same source, zero model/wire calls, two reads,
   successful verification and a timestamp within one hour. Fresh reads must
   still match. No automatic phase chaining or ambiguous deployment retry.

The coordinator reviews the actual zero-provider receipt and reserves spending
externally before authorizing phase 2. Local configuration cannot prove human
permission or authenticity by itself. Future arming adds only the fixed
`run-authorization.json` and, for phase 2, `aggregate-verification-receipt.json` plus `private-review-retrieval.json`;
source/branch/Preview/runtime/expiry guards remain. Automatic deployment is off
for `codex/home-turnover-baseline-policy-20261009`.

## Model and receipt limits

Actual app policy: gpt-6.1-sol, medium reasoning, default tier, 5,000 output tokens.
Three generation attempts globally, single-flight, zero SDK/harness retries and
zero token-count calls. Full conservative ceiling **$17.5725**:
`3 × (1,050,000 × $5/M + 5,000 × $15/M) × 1.10`.
Inherited coordinator headroom is $20.051104; hypothetical remainder $2.479604.
No amount is reserved here. Recheck rates and ledger before arming. Valid usage
is separate from actual model/tier identity; uncertainty retains the full model
phase reservation and external closure requirement. Receipt failure never retries.

Public receipts contain allowlisted aggregate numbers/dates, source/runtime/transport provenance, safe diagnostics, usage, counters and hashes. Full requests, visible model outputs, tool arguments, proposal prose and route state are retained only in sealed private records as described below. No plaintext appears in public logs or deployment assets. Semantic quality remains pending human review. This lane does not establish causal validity, independent forecast validation, dataset integrity, multi-turn or hosted browser acceptance.

Offline command: `node --test .home-action-acceptance/offline.test.mjs .home-action-acceptance/diagnostics.test.mjs .home-action-acceptance/private-review.test.mjs`.
All aggregate and SDK dispatches in these tests are in-memory stubs. The normal
entry point must refuse as `unarmed` before either network path is reachable.

## Private capture successor (unarmed)

Application pin: `4d65d4e0dd86bd467687747827da8930cc0a25cc` (reviewed diagnostics plus grounding). The app files are byte-for-byte pinned; this build-only lane is not an application release. Existing limits remain three SDK/wire attempts, no retry/count call, $17.5725 ceiling (not reserved), actual gpt-6.1-sol / medium / default policy. The actual SDK request still uses 30000ms; that fetch timeout is not a whole-response timer. The 90000ms app signal remains. Aggregate transport still permits exactly two sequential allowlisted reads within its separate 8000ms budget.

`run.mjs` now requires an initialized private sink before any read or model attempt. Records retain the original normalized request/aggregate, each application-visible provider message/function-call output, exact route reply text (including plans/state), final/checks, and a completion manifest. Provider reasoning/SDK internals are omitted. Sanitization removes credential/control sequences and is marked explicitly; redacted artifacts remain readable but cannot qualify for exact save replay. No truncation fallback exists. Each record is capped at 1MB; oversize/storage/transport failures stop the run, retain the reservation, and never authorize another attempt. Partial sealed records are kept on failures.

### Proposed supported destination and transport

Destination: the coordinator's private execution workspace, `/workspace/home-turnover-private-review/<review-id>/<run-id>/`, directories 0700/files 0600, outside every Git worktree/deployment upload. The coordinator retains the per-review X25519 private key there. The recipient public key/fingerprint and review ID are pinned in the exact run authorization. No real key or authorization is included here.

Transport: X25519 + HKDF-SHA256 + AES-256-GCM sealed records, emitted through the existing bounded `SOLUTION_ACCEPTANCE_CHUNK` build-log transport. Only ciphertext, fixed binding identifiers and digests enter logs; no plaintext answer, plan, request or state is emitted to logs or public output assets. Each record authenticates the reviewed source/run/deployment binding and stage. Log provenance still depends on fetching the pinned deployment through the authenticated Vercel connector; public-key encryption alone does not authenticate the sender.

Supported retrieval tool: `vercel_list_deployment_events`, `idOrUrl=<pinned deployment>`, `builds:1`, `direction:"forward"`, `limit:-1`, `teamId:"team_UNDjIdAbXXQZ63p0YuNQQ9zp"`. Preserve returned chunk messages exactly as a JSON array of strings. Do not enable public sharing, modify auth, use deployment-file upload, or store plaintext in Vercel cache/build assets. Vercel log persistence is transport, not durable retention. Private artifacts remain until reviewed disposition; there is no automatic cleanup or paid storage request.

Reviewer access is explicit: the coordinator reads `review.md` locally and relays its complete sanitized answer, plans, checks and relevant exact state/requests via private task messages to the independent reviewer (parts plus file digests if needed). A bare private filesystem link is not delivery. The reviewer must acknowledge readable receipt before semantic acceptance. No tool in this lane sends these messages or claims that delivery occurred. If this private relay is unavailable, stop before paid arming and report the missing destination.

### Mandatory zero-provider retrieval check

1. Review this exact harness, recipient/configuration, destination and relay plan. Create the private recipient outside the repository using `node .home-action-acceptance/private-artifact.mjs key <new-private-directory>`; keep the private PEM mode 0600. Enter an approved UUID review ID in the public configuration. Key creation does not authorize a run.
2. Authorize one separate aggregate-verification build. It performs two aggregate reads and the actual app verifier, zero model calls, and seals an unpredictable canary nonce with the same recipient configuration. It emits a safe aggregate receipt binding the canary hash and sealed completion hash.
3. Fetch that deployment's chunk logs using the supported tool. Store exact expected binding JSON from the pinned authorization/deployment metadata, then run `node .home-action-acceptance/private-artifact.mjs decrypt <private.pem> <binding.json> <chunk-lines.json> <new-private-run-directory>`. Chunk completeness, binding, authenticated decryption and manifest consistency must all pass. The command writes complete private `artifact.json`, `review.md`, sealed originals and SHA256SUMS; stdout is metadata only.
4. Confirm readable private relay to the reviewer. The paid authorization must bind both the original aggregate receipt digest and the digest of `.home-action-acceptance/private-review-retrieval.json`. That acknowledgment contains version 1, reviewId, recipientKeySha256, aggregateVerificationReceiptSha256, completionSha256, recovered canaryNonce and reviewerDelivery `private-task-messages`. Hashing the recovered nonce must match the zero-provider receipt. Both files are narrowly excluded from source hashing and included in the pinned child/reservation review. A guessed/public digest is insufficient to recover the nonce.
5. Only then may the coordinator separately approve one paid build, with exact child SHA and unchanged three-call/$17.5725 ceiling. No automatic redeployment/retry on ambiguity. This repository contains none of these authorization/receipt files. The same source and recipient are required in both phases.

### Assessment after that one authorized paid run

Decrypt all sealed records immediately. Read the exact sanitized response and every returned plan against `semanticChecks`; these checks remain human review, not an automatic pass. Run `node .home-action-acceptance/replay.mjs <private artifact.json>` offline. It revalidates the exact final/request/state and evidence bindings, then exercises the application's save/association and DecisionStore reload contracts for all returned retained plans independently. It explicitly reports `browserVerified:false`, `liveGoalSaved:false`, and no Apply. It is not a hosted browser click test. No invented 100-person fixture is used. A future UI replay must use this retained evidence and is a separate remaining UI gate.

No live private destination/retrieval has been demonstrated during preparation; the zero-provider canary is a prerequisite, not a claim of success. Do not schedule a separate paid diagnostics-only run. One later authorized model assessment can yield both safe failure diagnostics and private output for semantic/save review.

This isolated baseline restores only the earlier instructions and advertised tools from `3ea509246c13233323a664336b53516599ebd2d7`, on reviewed diagnostic/grounding source `2383ca1d5f76efca95d63dcd900a507494049fa6`. App commit above changes three files only. Current UI starters and runtime handlers remain. The current variant and reviewed private capture `5074b4a4e969f670ce26cd83a233fa513414e1b8` are preserved separately.

No playbook or batch evaluation tool is advertised or accepted by this lane. With one tool per model round, three single-plan evaluations plus final require four calls and cannot fit the unchanged global three-call ceiling. A valid final with zero, one or two proposals is reported as comparison completion with its actual checked count, `threePlanAcceptance: not-met`, `comparisonOnly:true`, `fullAcceptance:false` and semantic review pending. An empty proposal list establishes no arithmetic or save-contract acceptance. Three returned checked plans would still require semantic review; this does not expand calls or force extra tool outputs. A capped run is a bounded stop, not proof of provider failure. The current variant keeps its original three-plan criterion.

Retain all same question/model/settings/aggregate/private-capture gates. No deployment or paid call is authorized by this source. First authorize a separate zero-provider canary/grounding phase, recover its sealed nonce and deliver readable private evidence to the reviewer, then obtain parent coordination for any paid phase within $17.5725. Never run a separate diagnostic paid question or retry.
