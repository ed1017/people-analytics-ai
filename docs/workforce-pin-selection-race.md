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
