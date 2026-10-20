# Public company-only scenario arithmetic

This standalone package contains the reviewed public-input module only. No route/proxy/layout/UI edits. This is a separate company-only calculation contract, NOT full scenario-modeler or business-unit endpoint parity.

## Interface

`createCompanyScenarioCalculator(manifestText, trustedDigest)` from lib/public-fixture/company-scenario.mjs returns immutable `{contract, read(), calculate(body)}`.

- read() returns published company scenario settings: as_of, defaults, bounds.
- calculate({assumptions:{...}}) validates only the five known bounded numeric assumptions, merges omissions with published defaults, and returns as_of, source_scenario, defaults, assumptions, summary, points, methodology, accounting.
- No segment_breakdown, BU/family allocation, data_meta, private digest or public token is synthesized. Caller owns local receipt identity, HTTP body/method/query guards and UI labeling.
- Reuses unmodified scenario-engine.ts runScenarioModel and source adapter company accounting. Published methodology typography is retained (en dashes in October–December and January–September); the first parity mismatch was typography only, not numbers.

## Captured public inputs

Pinned manifest e8dcee2c112b2a6fce0a393e0a0294e3a39c29939d376fe4df9a72b6b44b6a9d, tests/fixtures/public-company-scenario/manifest.json + manifest.sha256:

1. GET /api/headcount: headcount only.
2. GET /api/scenario-modeler: as_of/defaults/bounds only.
3. GET /api/workforce-planning: the sole Baseline draft scenario's name/type, opening stock, cutoff/horizon/gap/validation flag and twelve company plan point fields. This is an explicitly selected public input subset, not an exact full GET replay.

Manual capture checked that each source/POST response carried matching public token/digest/cutoff and publicationApproved constructed-synthetic metadata, but saved NONE of that metadata. Worker owns final receipt integration. Stored defaults retain the published company annualized attrition assumption; this module does not claim to independently recompute its historical denominator. Flat draft hires/exits stay zero; engine-implied gross flows are a distinct conditional calculation.

Three public POST comparisons covered baseline, positive growth/inflation with reduced fill/productivity demand, and negative growth with high attrition/zero fills. All eight selected company fields match exactly. Segments and metadata were excluded from comparison and storage. Two initial capture attempts stopped at the first baseline comparison while diagnosing methodology typography; no partial fixture was persisted. Final run captured three GETs and three successful calculation examples. No private files, DB or paid provider calls were used.

## Tests and limits

`node --test tests/public-company-scenario.test.mjs`: six tests, covering immutable closed schemas, manifest/document pins, mixed stock/horizon/flow failures, invalid request coercion/scope, three captured company-field comparisons,243 bounded combinations with unrounded stock conservation, and explicit separation of zero stored flows from gross modeled flows. No network or node_modules required; fetch is a throwing sentinel during replay.

Full endpoint parity still needs approved BU/family baseline rows and original segment reconciliation. This module cannot restore business-unit scenarios, structural/response/scheduling calculators, prove model validity or future staffing capacity. Missing input is not estimated. It preserves the unmodeled October–December2026 gap and fictional conditional meaning.

Manual script tests/manual/capture-company-scenario.mjs performs bounded public requests only and is never imported by runtime/tests. New captures/pins require review. No deployment/push/credential/security changes occurred.

Package note: capture commands above describe historical verification. Capture scripts are intentionally excluded from this offline distribution; do not run those commands from this package. See [package setup and capability matrix](public-reproducibility-package.md).
