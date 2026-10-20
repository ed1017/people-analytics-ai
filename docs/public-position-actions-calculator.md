# Reproducible public position-actions calculator

This standalone package contains the reviewed public-input module only. No route/proxy/layout or application-wiring edits.

## Worker interface

Import `createPositionActionsCalculator` from `lib/public-fixture/position-actions.mjs`.

`createPositionActionsCalculator(manifestUtf8Text, trustedManifestSha256)` verifies a closed manifest, document digest, exact GET data schema, cutoff, stock reconciliation and engine defaults/bounds. Returns immutable `{contract, read(), calculate(body)}`.

- `read()` returns exactly public GET DATA fields: as_of, defaults, current, bounds.
- `calculate(body)` returns exactly public POST DATA fields: as_of, defaults, assumptions, current, modeled, methodology, accounting. It uses the existing position-action-engine.ts without modification and the public adapter's unrounded accounting correction.
- No data_meta/token/header assumptions are embedded. Worker must attach its own local-fixture identity and HTTP error/status behavior. Invalid inputs throw. Body parsing/method/query/body-size limits remain the HTTP worker's responsibility.
- Fixture files: tests/fixtures/public-position-actions/manifest.json + manifest.sha256. Recorded parity examples have their own parity.json + parity.sha256. .gitattributes pins fixture LF bytes.

Manifest pin: `b0a4b730d69dd37b52bf7bd5737b1e295d474f15f91b9c4e6758260e7988b391`.

## Evidence

Authorized public HTTPS capture read GET `/api/position-actions`, retaining only the four DATA fields above. It excluded all data_meta/private receipt fields. Three bounded, read-only POST calculations used invented explicit inputs: `{}`, add17/close3/freeze2/fill33.333, and add0/close5000/freeze5000/fill100. All seven POST DATA fields matched local outputs exactly. This was deterministic public calculation, not a database mutation or paid provider call.

Two further public invalid requests (negative add_positions and unknown field) returned400; errors.json/errors.sha256 store only invented inputs/status, not response bodies. Local validation rejects both.

`node --test tests/public-position-actions.test.mjs`: 6/6 pass, covering exact GET and three POST examples, two remote invalid-status comparisons, immutable outputs, hash/schema tampering, invalid inputs, 81 arithmetic combinations and key-order invariance. Tests run offline with no node_modules and replace fetch with a throwing sentinel during parity replay. Changed-file ESLint passes. Existing Node TS module-type warning is unchanged.

The public adapter intentionally displays assumption fill_pct rounded to one decimal while retaining original bounded fill_pct in unrounded accounting. This module preserves both; silently using the rounded display assumption would break fractional parity. Close/freeze requested values up to5000 are validated then clamped by the actual engine; no filled position closures or employee exits are introduced.

## Scope limits

This establishes position-actions DATA reproducibility for the captured public inventory and representative calculations, not all 12 calculators, live freshness, browser/HTTP behavior, private-source parity or workforce feasibility. No labor-cost calculation is present. No private artifacts were read, no credentials retrieved, no dependencies installed, no deploy/push performed. Captures are public approved calculator data, not a synthetic recreation of hidden records.

Manual recapture script: tests/manual/capture-position-actions.mjs. It performs exactly one GET and three POST calculations, rejects redirects, bounds response bytes and uses15-second timeouts. It is never imported by tests or the application. A changed capture/pin needs review before integration.

Package note: capture commands above describe historical verification. Capture scripts are intentionally excluded from this offline distribution; do not run those commands from this package. See [package setup and capability matrix](public-reproducibility-package.md).
