# Local forecast consumer readiness

The new offline entry point `exitForecastForConsumer()` in `tests/manual/forecast-consumer.mjs` runs the existing evidence checkpoint and preview generator afresh, then composes one reusable result. It imports no database/service client, accepts no source override, and changes no UI or original artifact. The checkpoint already runs the readiness validator on available source metadata and the existing benchmark/vintage evaluators. This integration consumes those executed results; it does not promote their assertions into source truth.

```sh
node tests/manual/forecast-consumer.mjs > /tmp/forecast-consumer.json
node --test tests/forecast-consumer.test.mjs
```

Consumers receive:

- `status: unqualified`, `operationalForecast: null`.
- `domains.turnover/satisfaction/hiring`: concise label, contract status, exact reason codes and the existing audit's missing-input descriptions. All actual-source domains currently block on unknown completeness/availability. Effects remain unavailable.
- `conditionalDemo`: the complete **unchanged** preview, its conditional label and assumptions. The existing synthetic count example remains usable under its existing limits, independently of operational eligibility.
- `evaluation`: distinguishes the retrospective, already-inspected benchmark from the separately constructed vintage exercise. Neither validates operational forecasting.
- `identity`: bound to the complete composed output, current checkpoint and consumer implementation bytes. This is a reproducibility/cache identity, not a signature or source-authentication proof.

For raw proposed metadata, `forecastReadiness(contract)` reruns the strict validator, preserves selected revisions and zero/null values, and reports `contractStatus: passed` or `blocked`. Even fully supported metadata yields **Contract checks passed; forecast validation unavailable**. Operational qualification cannot be established by this validator or a boolean supplied by a caller.

The composition helper is an internal interface for freshly executed local checkpoint/preview results, not a general untrusted report-ingestion API. It rejects missing or contradictory qualification fields, mismatched dataset/protocol/fixture/evaluator identities, and an unexpected promotion of the current unavailable-source adapter. New source qualification requires a reviewed adapter/evaluation implementation, not changing cached JSON flags.

When using persisted output, call `readCachedExitForecast(cached)` rather than trusting a saved status. It regenerates current evidence and compares the entire result. An altered count, status, identity, implementation or source-evidence fingerprint returns `status: stale`, with **both operational forecast and conditional demo withheld**. The fresh identity and regeneration instruction are returned. Even harmless serialization/key-order differences may conservatively invalidate a cache. “Current” here means current checked-in source artifacts; no live refresh or elapsed-time guarantee is implied. The underlying extract remains dated Oct 5, 2026.

Validation covers supported/missing/contradictory metadata, confirmed zero versus null, revision availability, actual-source blockers, preview preservation, changed evidence with identical predictions, and tampered/stale cache rejection. No browser behavior changed. Existing report reproduction is checked independently.

Concrete next integration step: the owner of an existing offline forecast consumer can call this entry point and display its short status/missing-input list beside the existing conditional demo, with no new page or Action Planning coupling. Closing the source gaps still requires the original generator/run manifest or genuinely recorded completeness/availability history described in `source-provenance-investigation.md`. No fabrication, source augmentation, release or publishing is implemented here.

Branch `feat/forecast-consumer-readiness` starts at preserved evidence head `218c9718c32afad09427897a8d0b4c4ce7272ee0`. PR126, the source/evidence branches and their generated reports remain unchanged.
