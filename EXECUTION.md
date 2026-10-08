# Supervised Preview transport probe

This supersedes the earlier reusable-runner proposal. The parent controls one manual Preview deployment and reserves its full allowance before launch. Future deployments are separate actions. This is an operationally bounded test, not a claim of globally atomic or exactly-once execution.

No provider call or deployment has been made by this change. Production, PR177, server transport, package scripts and hosted configuration remain unchanged. The separate local checkout is based on `256a4a9569c0a8ae52c2331ba5a71b4ccfb0225e` (tree `bf40c71febd5624d0633a131a9c40f45e93746b2`).

## The one invocation

`tests/manual/solution-preview-one-shot.mjs` runs only through its explicit CLI flag. It is not referenced by normal package builds, application imports, routes or automatic configuration. Its helper uses the actual `converseSolutions`, instructions, schema, tools and model. The CLI uses the unchanged `openAIProxyTransport()` and existing server `OPENAI_API_KEY`; it never exports or changes credentials.

The fixed new fixture asks for the total of two blue blocks and one red block. Evidence is an empty normalized fictional packet, saved plans are null, goal context is null, and history starts empty. A literal-only projection loader has no live fallback. `tool_choice: none` prevents tool selection; any returned function call is rejected before the service sees it. There is no second model round. A success proves that this Preview build's existing API transport generated and the service accepted one structured response. It does not prove conversational quality, deployed-function behavior, browser acceptance or resolution of React #185.

Maximum: one token-count request and one generation, sequential, SDK retries zero, 30-second per-call and 70-second service timeout. Generation input must count at most 100,000 tokens, output is capped at 5,000. Oversized counts, API denial, timeout, incomplete responses, unexpected service tier, invalid structured output or unexpected tools stop the run. Source files, dependencies (OpenAI 7.23.0, Undici 7.30.0), Node 24, model and default API endpoint are checked.

The parent must retain **$0.081** before deployment: $0.05 counting allowance plus $0.031 generation reservation, using the already-approved $0.25/$1.20 per-million envelope. This is conservative test accounting, not a confirmed invoice or new price verification. Retain the whole amount on success, failure or ambiguity; do not refund based only on missing usage. With the current $0.17496 retained, the next reserved ceiling would be $0.25596, leaving $4.24404 initial / $49.74404 cumulative. Reconcile any other testing before arming. These limits concern OpenAI API testing; ordinary existing-plan hosting usage is separate. No plan upgrade, purchase or new paid service is authorized.

## Exact proposed manual action (not executed)

1. Use an isolated local upload copy of this reviewed source and the existing authenticated CLI session for `ed-56dc/people-analytics-ai`. Verify the existing project ID, Node 24 setting, Preview-scoped key availability and existing protection through metadata only. Do not pull environment values, copy a production secret, change protection, create a project, or use a bypass token. Stop if the existing Preview setup is unavailable.
2. Run the offline command below and save its output as `.preview-one-shot/reservation.json` in that upload copy. The generated file is deliberately unarmed. After durably reserving 81,000 micro-USD in the parent-owned ledger, set `parentReserved: true`, assign fresh UUID `runId` and `reservationId`, fill the verified `projectId`, reconcile both prior totals, and set `createdAt`/`expiresAt` with at most a one-hour window. Keep its source hash map unchanged. Compute SHA-256 of the exact final JSON bytes. Neither preparation nor the harness writes the parent's ledger.

   `node --experimental-strip-types tests/manual/solution-preview-one-shot.mjs --prepare`

3. Only in the disposable upload copy, prepare a temporary local configuration file (never commit it or alter project settings):

   ```json
   {
     "framework": null,
     "buildCommand": "node --experimental-strip-types tests/manual/solution-preview-one-shot.mjs --execute-reserved-once .preview-one-shot/reservation.json",
     "outputDirectory": ".preview-probe-empty"
   }
   ```

   Use the existing install configuration and lockfile. Ensure the reservation file and reviewed harness are included in the upload. This replaces the application build for this one manual Preview only. On success the harness produces a blank static page with no application functions, API endpoint, response text or diagnostic receipt. Failure leaves a failed build and private logs.

4. After the parent approves the concrete reviewed invocation, run exactly one existing CLI deployment, with verified existing project linkage, the temporary local configuration, and two non-secret build variables:

   ```text
   vercel deploy --target preview --local-config <temporary-config-path> --build-env SOLUTION_PREVIEW_RUN_ID=<reserved-run-uuid> --build-env SOLUTION_PREVIEW_MANIFEST_SHA256=<reservation-file-sha256>
   ```

   Resolve placeholders and check the installed CLI help before execution. Do not add `--prod`, `--force`, `--public`, `--prebuilt`, `--yes`, a deploy hook, Git push, queue, workflow or cron. The command does not set an application feature flag. Record its returned deployment ID/URL against the reservation immediately. The harness also emits the platform deployment ID before any provider request.
5. Inspect only that same deployment's build status and authenticated build logs. `SOLUTION_PREVIEW_RECEIPT` records carry run/deployment/source/fixture hashes, reservation, counts, sanitized errors, provider request IDs and token usage. `countCalls`/`generationCalls` conservatively count attempted stages: a persistence failure can prevent transmission, so these are not confirmed transmitted-call counts. They exclude raw bodies, model text, headers, cookies and keys. The existing project protection remains in effect; browser API access is unnecessary. Do not place receipts in static output or share logs publicly.
6. If launch, status or final receipt is ambiguous, stop and inspect the same deployment. Do not redeploy, resume or retry the harness. A local exclusive marker also prevents repeat execution in the same filesystem, but does not claim global coordination. Another test requires the parent's separate decision and reservation after this receipt is reconciled.

The [ordinary Vercel CLI](https://vercel.com/docs/cli/deploy) supports Preview target, per-deployment build variables and local configuration. [Build command configuration](https://vercel.com/docs/project-configuration/vercel-json#buildcommand) supports the isolated command. The inspected [build](https://vercel.com/docs/builds) and [troubleshooting](https://vercel.com/docs/deployments/troubleshoot-a-build) documentation did not specifically document automatic replay of this selected ordinary build command after its paid side effect. That is not an exactly-once guarantee; parent supervision and the stop-on-ambiguity rule bound this one intended action. No Workflows or Queues are used.

## Offline verification

`node --experimental-strip-types --test --test-isolation=none --test-reporter=spec tests/solution-preview-one-shot.test.mjs`

Tests use an injected fake SDK and the actual service. They cover the call limit, token/output limits, failed reservations, Preview identity, authentication failure, no continuation/tools/live source, receipt persistence failure, redaction, fixture provenance and unarmed manifest. The paid CLI entry has not been executed.
