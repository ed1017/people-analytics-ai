# Pinned-result selection during goal restoration

Local candidate based on PR100 head `99b653d2e9de3142f24387437cc6a7307d0abae7`, isolated on `local-pin-selection-race`. No PR metadata, remote branch, production or ML-review change is part of this slice.

## Observed boundary and fix

The hosted report describes goal A with historical v2 selected and v3 current, switching A → empty B → A, then an enabled Open pinned version 3 click that leaves v2 selected. Local ordinary automated clicks succeeded on the faster fixture. A controlled real-UI regression demonstrated the concrete readiness gap: the original component enabled pin opening while the restored source's local verification was still pending. The base commit fails the assertion that the restoring pin control must be disabled (`/tmp/pin-repro-controlled.log`). This is not a claim that the exact 20-second hosted symptom was independently reproduced locally.

`components/workforce-solution-cards.tsx` now tracks the initial verification lifecycle for each existing keyed card instance. Open-pinned controls remain visibly disabled until that verification settles, and the status explains that pinned versions are waiting on verification. Both success and failure settle the readiness state; failure retains the existing error notice and navigation to saved calculations. Aborted/unmounted verification cannot enable a replacement instance's controls.

The pin-opening handler checks the same readiness guard, cancels any superseded local operation and accepts a worker reply only while that controller still owns the operation. Goal/source/selection identity guards remain in place. No selected-result fallback, delayed retry, automatic write, storage format or workflow rewrite was introduced.

## Regression evidence

`tests/browser/workforce-pin-selection-race.mjs` runs the actual built app with synthetic encoded records, its real goal selector and browser worker. All API responses are intercepted locally; nonlocal requests are aborted. Controlled worker-reply delays expose restoration and stale-resolution windows without changing application code for testing.

The 22 assertions at desktop and Pixel 7 mobile-emulation widths cover:

- A disabled pin control and visible verification status during reload/restoration.
- Normal v2/v3 pins, rapid A → empty B → A, the first accepted post-restoration click and durable reload selection.
- An old goal-owned pin reply arriving after a newer pin selection, and a newer explicit saved-result selection superseding a pending pin.
- Cancelled calculation followed by a new request: the old response cannot clear the new pending request; cancellation recovers the controls.
- Retained versions, results, evidence, approvals, prior run history, pins and owner notes. Explicit test calculations append their normal run tickets; cancellation does not erase them.
- No external traffic/runtime errors and no horizontal overflow.

Validation: **495 unit tests and 665 browser assertions pass**, plus full lint, standalone TypeScript and genuine production build. The existing built pending-cleanup test now waits for pin verification readiness instead of assuming that an enabled comparison-priority control means pins are ready; its recovery/history/approval assertions remain intact. That updated script passed on rerun after the first full run exposed the obsolete timing assumption. Logs are `/tmp/pin-{unit,lint,ts,build}.log` and `/tmp/pin-full-*.log`. Browser coverage is Linux Chromium desktop and mobile emulation, not physical Windows/Android Chrome. The hosted preview has not been retested with this unpushed local change.

## Acceptance

With v2 historical and v3 current/pinned, switch A → empty B → A quickly. While verification is pending, Open pinned version 3 must be disabled with a visible explanation. Once enabled, its first click must select v3 and remain v3 after reload. Repeat with normal pin opening, goal-switch cancellation and a newer explicit saved-result choice. Confirm the previous versions, pins and approvals remain available.

## Independent review follow-up

Reviewed remote candidate `c5a2fbb765de069e7580c54daf05ff279eb2b51a` against exact PR100 head `99b653d2e9de3142f24387437cc6a7307d0abae7`, on separate local branch `review/workforce-pin-independent`.

**P2 fixed: cancelling an in-flight pin through comparison priority left controls permanently busy.** Priority remains editable while pin resolution runs. Its change handler aborted the controller and cleared operation ownership, but only updated `working` when a what-if draft existed. With no draft, the aborted operation's `finally` could not clear `working`, so every pin control remained disabled. A real built-app regression failed against the author candidate at the new assertion (`/tmp/pin-independent-repro.log`). The handler now sets working state to whether a draft needs recalculation. The subsequent accepted pin click succeeds without reload; a delayed cancelled reply cannot change selection.

The expanded built-app test has 32 assertions (ten additional assertions across desktop and Pixel emulation). Besides the priority-cancellation regression, it injects a verification failure and confirms readiness settles without deleting records, then verifies normal pin navigation recovers. It removes the owning goal through the real UI while a pin reply is pending and confirms that late reply cannot resurrect the goal/workspace, including after reload; the other goal remains saved. Earlier assertions retain goal-switch, newer-selection, cancellation, saved-version, approval and owner-note coverage.

Source review confirms each keyed card instance owns its restoration state and abort controller; aborted verification cannot enable a replacement instance. Pin resolution checks both cancellation and current operation ownership before committing selection, then rechecks saved source, goal, history and selected-result context. Verification failure settles pin readiness but does not assert successful card verification; a later pin resolve still verifies its own exact saved reference. Existing lineage/approval protections and local storage format remain unchanged.

This review reproduced the priority-cancellation defect and controlled restoration window, not the exact reported hosted delay. Hosted acceptance remains a separate gate. Linux Chromium desktop and Pixel emulation do not establish physical Windows/Android behavior. The ML checkpoint `9efd7eff9593c3c2447674b7fa098651ecee931c` and PR100 head remain preserved; no ML changes, live service calls, PR metadata updates, push, merge or production change are included.

Independent final checks pass: **495 unit tests, 675 browser assertions**, full lint, standalone TypeScript, genuine optimized production build and whitespace checks. Browser counts include the 32-assertion pin regression, all 13 other browser suites (633 assertions), and the separately run ten-check portable fixture. Logs: `/tmp/pin-independent-{unit,lint,ts,build,targeted}.log`, `/tmp/pin-independent-browser-*.log`; built workspace evidence: `/tmp/pin-independent-workspace/results.json`. Repeat acceptance above, additionally changing comparison priority during a delayed pin resolution: controls must recover, the cancelled reply must leave selection unchanged, and the next explicit pin click must succeed. Repeat verification failure/retry and owning-goal deletion during resolution; no saved history should be lost except through the explicit goal deletion.
