# Local aggregate export custody

The helper packages an already authorized aggregate count export without querying a source, fitting a model or changing readiness. It preserves the exact input bytes and SHA-256, reporting periods, source definition version and declared provenance, and records the local capture time. Historical first availability, source revisions and scoped completeness remain explicitly unknown.

## Supported input and meaning

The first version accepts only the strict `aggregate-exit-history-json` version 1 shape used by [the existing count fixture](../tests/fixtures/aggregate-exit-history.json). Source and population are fixed to `public.attrition_monthly_trend` and `all-recorded-voluntary-separations`. Provenance may be `user-declared-synthetic` or `unknown`; neither becomes verified real data. Required source metadata and aggregate fields must be present. Unknown historical availability is represented in the new sidecar, not invented in the payload.

Inputs are bounded to 256 KiB and 1–120 months. Invalid UTF-8, duplicate JSON keys (including escaped aliases), unknown fields, person-level field additions, invalid counts/dates, duplicate periods and dates after extraction/capture reject before any output is created. Dates recorded only to calendar-day precision retain that precision. Source insertion time is preserved separately; it is not interpreted as first availability. Missing months are listed without interpolation. An event-empty month keeps its original bytes but becomes an unknown count in the readiness adapter; a recorded zero voluntary count with other separation events stays zero.

CSV, survey, hiring and arbitrary JSON payloads are deliberately outside this first helper's supported contract. Existing CSVs and APIs can conflate absent values with zero and lack source history; silently adapting those would lose evidence. No existing exporter, route, validator, forecast input or consumer is changed. The [inventory report](aggregate-signal-qualification-inventory-v1.md) remains preserved.

## Usage

From the repository root with the existing Node 24 environment, choose a new output directory whose parent already exists:

```sh
node tests/manual/aggregate-export-custody.mjs capture \
  tests/fixtures/aggregate-exit-history.json \
  /tmp/exit-count-capture

node tests/manual/aggregate-export-custody.mjs verify \
  /tmp/exit-count-capture/payload.json \
  /tmp/exit-count-capture/custody.json
```

`capture` reads the input, obtains the current system time, validates, and then writes `payload.json` byte for byte plus `custody.json`. It refuses an existing output directory and never overwrites an earlier capture. The CLI exposes no timestamp override and sends no data anywhere. Failures use a generic diagnostic so malformed or mismatched inputs are not printed. A failed filesystem write can leave an incomplete new directory; it is not a valid capture until verification succeeds. Retry with a new directory after resolving the failure.

`verify` checks the payload hash and recomputes every sidecar field, reporting period, readiness contract and eligibility result. It rejects changes to the payload, hash, capture timestamp, metadata, unknown-status fields or eligibility results. A capture cannot be dated in the future relative to the verification clock, and a later verification cannot make source dates after the original capture valid.

`captureId` is a deterministic hash of the derived sidecar body. The same bytes and same capture time produce the same result; a later capture has a new identity even if the payload is unchanged. Formatting changes affect the exact-byte payload hash. Unit tests inject a fixed clock; production CLI calls use the local system clock. Hashes and timestamps provide local consistency, not source authenticity or independently authenticated time. Coordinated rewriting of payload and metadata cannot be detected without an independently trusted hash or signed record.

## Readiness output

The helper calls the existing `validatePredictiveReadiness` without invoking the forecast evaluator. Its `company-extract` adapter class means an existing extract, not real-world provenance. Revision 1 is a local envelope required by that validator, explicitly separate from null source revision history. Every record keeps `observedAt: null`, and completion and measured exposure remain null.

For the preserved fixture, capture and verification report:

```json
{
  "declaredProvenance": "user-declared-synthetic",
  "observationBasis": "unknown",
  "inputStatus": "valid",
  "recordCount": 33,
  "recordedCountRows": 32,
  "unknownCountPeriods": ["2024-01"],
  "availableHistoryRows": 0,
  "forecastEligibility": {
    "status": "blocked",
    "reasons": [
      "availability-unknown",
      "availability-unverified",
      "completeness-unknown",
      "no-available-history"
    ]
  },
  "operationallyQualified": false,
  "sourceTruthVerified": false
}
```

This excerpt flattens the reporting fields for readability; CLI output nests them under `reporting`. Causal eligibility also remains blocked, and all validator uncertainty fields remain null. A successful capture or verification means custody checks passed, not forecasting approval. Original null/zero semantics, missing periods and the existing synthetic/unknown provenance constraints remain visible.

## Verification

```sh
node --test tests/aggregate-export-custody.test.mjs
npx eslint lib/ml/aggregate-export-custody.mjs tests/manual/aggregate-export-custody.mjs tests/aggregate-export-custody.test.mjs
npx tsc --noEmit
```

Tests cover payload/sidecar tampering, absent or extra fields, duplicate keys, malformed encoding, future dates, same-day precision, missing periods, zero versus unknown counts, provenance preservation, deterministic replay and refusal to overwrite. A real CLI capture of the existing fixture was verified locally; its exact payload hash remains `64acf5cbb0cddbaa0614e20ee3895cd026ebe3ec9c91fed622820b53b44d63cd`. No new source data or synthetic histories were generated.

Validation completed: all 1,307 repository tests passed, including 11 custody tests; scoped ESLint and TypeScript checking passed. Independent review confirmed strict sidecar parsing after a duplicate-key regression was fixed. The original consumer check retained identity `6f76782c3da5b1c326f4a6b55e04792c1f5258e2f8712aa26205439a098265e8`. The verified local example was captured at `2026-10-06T00:00:08.611Z`; this is the new packaging time, not the source extraction date or historical availability. No application build, deployment, UI integration or source-data change was performed.
