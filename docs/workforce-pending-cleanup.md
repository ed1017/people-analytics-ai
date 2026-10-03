# Interrupted workforce calculation cleanup

Base: verified journey head `a7d0f7276c29e805ade1665aa5ef16fdea4c1f97`.
Work is isolated on `local-workforce-pending-cleanup`; ML acceptance and release/PR99
branches are unchanged.

## Reproduction and cause

The new browser regression failed on the unmodified base: goal A has saved v3 while
its exact pinned v2 is inspected; start Calculate, select goal B, allow cancellation
to settle, then select A. The response is rejected, but the persisted pending ticket
remains. Continue reports a running request, priority/pins stay blocked, and Calculate
appears available even though the lifecycle rejects another pending run.

The store subscription aborted the request, but the asynchronous `finally` cleared
its ticket only when `isHere()` was true. Settling while B was selected skipped cleanup.
Unmount/return gave A a fresh local controller with the old stored pending ticket.

## Fix and boundaries

- Keep the calculation's originating ticket alongside its controller. A goal change,
  unmount, explicit cancellation or calculation timeout releases that ownership and
  cancels only its matching live ticket, regardless of which goal is now selected.
- `cancelOwnedWorkforceRequest` checks goal, solution, request ID and version against
  the latest readable record. It returns no update for a missing/deleted/unreadable
  record, already-cleared ticket or newer request. There is no saved-record fallback
  and no reconstruction of deleted workspaces.
- Clear references before abort/store notifications can reenter cleanup. Both result
  handling and local busy/controller cleanup check request identity. An older `finally`
  cannot clear a newer request's pending ticket or local busy state. The same controller
  guard protects the existing clarification/catalog paths sharing this controller.
- Calculate is disabled while the solution has a persisted pending ticket, even when
  there is no local controller. An inherited orphan from an earlier session still
  offers explicit Cancel; ownership is not guessed from a reloaded record.

Cancellation changes only the matching pending marker. Versions, results, retained
run history, evidence, exact selection, pins and approval notes remain intact. No
calculation, save of assumptions, result selection or approval is automatically retried.
No route, schema, source boundary, model, database or authentication behavior changes.

## Regression evidence

`tests/browser/workforce-pending-cleanup.mjs` exercises actual component/store
transitions at 1366px and Pixel 7 emulation at 390px. Native aborted fetch reproduces
the historical v2/current v3 A–B–A case. A second synthetic fetch intentionally ignores
abort so an old response settles after a newer request: only the newer request may
complete. It also covers batched transitions, deletion, an accelerated calculation
timeout, and explicit recovery of a retained ticket without a local controller.

`tests/browser/workforce-pending-cleanup-built.mjs` repeats the historical-pin case
against the genuine production build, using the app's **Selected goal** control and
emitted local worker. Every API request is intercepted; unrelated source/summary
requests receive a synthetic unavailable response. No model or database service is
called. Unit tests verify ownership, no mutation, no-op cleanup and missing-record safety.

Actual engine coverage is Linux Chromium with desktop and Pixel viewport/touch
emulation. Physical Windows/Android Chrome and hosted acceptance remain unverified.

## Hosted acceptance after review

1. On a disposable synthetic goal with current v3, open an exact historical v2 pin.
2. Calculate, immediately select goal B, then return to A.
3. Confirm the pending marker/Cancel control clears, Continue resumes historical
   review, and priority/pins recover without clicking Cancel. Retained versions,
   evidence, selection and approvals must be unchanged.
4. Start a new explicit calculation. A delayed older response must neither add a result
   nor clear the new request. Only the current request may complete and select its result.

Local verification: 460 full unit tests; 605 combined browser assertions (including
30 new lifecycle-fixture and 12 new built-app assertions); full ESLint, standalone
TypeScript and genuine optimized production build passed. No push or deployment.

## Independent review

Reviewed exact `8ee488e4f19ebb88ab678982580c3410a3f90c0d` against
`a7d0f7276c29e805ade1665aa5ef16fdea4c1f97` on the separate local branch
`review/workforce-pending-independent`. No additional production-code defect was
found. The originating-ticket cleanup and request-identity guards are unchanged.

Independent browser execution confirms the historical v2/current v3 A–B–A recovery
through the production app's actual goal selector, plus the fixture's batched switch,
old response after a newer request, deletion, timeout and retained-orphan cancellation.
Four additional assertions at each viewport cover explicit Cancel followed immediately
by retry: the old signal is aborted, its late response cannot clear the new ticket or
append a result, and only the retry completes. Changing goal wording also cancels the
owned ticket, rejects its late response and keeps Calculate disabled until goal/input
alignment is reviewed.

Validation: 460 unit tests and 613 combined browser assertions pass (38 pending
fixture, 12 pending built app, 62 journey, 100 cards, 98 built workspace, 54 intake,
48 readiness, 44 goal copy, 62 local search, 50 handoff, 11 selection, 24 lifecycle,
10 portable fixture). Full ESLint, standalone TypeScript, the genuine production build
and whitespace checks pass. The initial browser setup started while the build was
recreating `.next/static/chunks` and failed before assertions with ENOENT; rerunning
after the completed build passed. No product change was made for this setup ordering.

Execution evidence: `/tmp/pending-independent-{unit,lint,ts,build}.log`,
`/tmp/pending-independent-browser-*.log`, and
`/tmp/pending-independent-workspace/results.json`. The built app's background API
requests, including chat, received intercepted synthetic unavailable responses;
no live API, model, authentication or database service was contacted.

Coverage remains Linux Chromium desktop and Pixel viewport/touch emulation, not
physical Windows/Android or hosted validation. Hosted retesting is independent of
this review. The ML review remains at `6c054e90874e3c2f187a1a68c39b4d1178955522`,
the verified journey source at `a7d0f7276c29e805ade1665aa5ef16fdea4c1f97`, and the
release branch at `134c04def4b60036955c78b57559782e94b7f9d9`. PR99 and held eNPS
work are unchanged. No push, PR update, merge or deployment was performed.
