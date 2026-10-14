# Inactive artifact reader and server loader

This code adds a concrete reader for a pinned constructed-data artifact, a bounded
Node/server file loader, and validation for an unpublished successor proposal.
It is not imported or registered by `dataset-runtime.ts`. The application keeps
`legacy-v1:0` as its default; no selector, database, environment or deployment
configuration changes here. This draft builds on the request boundary in PR #233.

The artifact reader validates the byte digest, original dataset seal, eight
component contracts and fixed aggregate-query definitions. The loader reads two
fixed filenames from an explicitly configured canonical directory, rejects
symlinks/non-regular or oversized files, checks the file before and after reading,
and captures immutable values. Concurrent calls share one promise. Failures stay
cached until an explicitly constructed replacement loader is used; there is no
fallback to another dataset or automatic retry.

Semantic bounds apply before a provider is returned, even when changed aggregate
bytes have a matching new outer digest. Regrettable exits cannot exceed voluntary
exits, which cannot exceed all exits. Current, group and monthly voluntary and
regrettable counts reconcile over January–September 2026 only. Monthly turnover
uses the corresponding month-end stock; current rates use the nine-month average,
and regrettable share uses voluntary exits. The constructed survey instrument is
`likert_1_5`: wave, dimension and business-unit average scores stay within 1–5,
and favorable shares within 0–100%.
These bounds are specific to those metrics; stock-based turnover can exceed 100%.

The proposal validator binds artifact, code, original dataset and per-component
release pins. Proposed identities remain distinct from source identities. Its
result deliberately combines `manifestValidated: true` with
`publicationApproved: false`, `activationEnabled: false` and
`fullApplicationReady: false`. It rejects published/approved state; it does not
promote or relabel the original local-only provider. References to existing frozen
release digests are requirements to preserve them, not fresh verification of their
hosted contents. The implementation digest must also be checked against the actual
deployment build during a later release review.

Input limits are 128 KiB for the proposal and 16 MiB for the artifact. These bound
file reads, not total process memory, database recovery space or hosted capacity.
These modules are intended for trusted Node/server code only. No client component,
API activation route or production composition imports them in this change.

## Review tests

Portable manifest-contract tests use invented metadata and no workforce records:

```sh
node --test tests/dataset-publication-proposal.test.mjs
```

The complete manual review also needs two explicitly supplied local test inputs:

- `DATASET_REVIEW_CONFIG`: a private reviewed loader configuration with its exact
  directory and manifest/artifact/dataset/implementation/base-commit pins.
- `DATASET_REVIEW_CASES`: private retained synthetic operation cases used by the
  existing presenters.

Neither file nor its actual location belongs in source control. With those local
test variables supplied, run the suites together with network APIs blocked:

```sh
node --import ./tests/fixtures/dataset-review-offline.mjs --test \
  tests/dataset-publication-proposal.test.mjs \
  tests/manual/dataset-aggregate-artifact.test.mjs \
  tests/manual/dataset-artifact-loader.test.mjs \
  tests/dataset-request-boundary.test.mjs \
  tests/dataset-route-request.test.mjs \
  tests/finance-home-evidence.test.mjs \
  tests/finance-vacancy-basis.test.mjs
```

Manual fixtures and retained-source handlers are explicitly test data. These tests
cover content/scope rejection, immutable loading, retained selection and request
isolation; they do not certify live preservation, actual hosted switch-back,
independent forecast accuracy, deployed browser behavior or model answer quality.
The manual file-loader suite retains its temporary evidence without deleting it.

## Minimum separate public aggregate format

The current private artifact is **not suitable for source publication**: its sealed
predecessor contains physical inventory, validation metadata and private operational
paths. No data payload, private manifest, recovery archive or operational evidence
is included in this change. Sanitizing that predecessor in place would invalidate
its identity. A later public projection needs a distinct format, version and audit.

The smallest proposed public format would contain:

| Field group | Minimum content |
|---|---|
| Identity and lineage | New dataset/release IDs, opaque predecessor content digest and adapter/code revision; no embedded predecessor manifest |
| Data semantics | Constructed-synthetic classification, explicit cutoff, no observed-source timestamp, and independent forecast validation remaining false |
| Scope | Exact named filter tuple for each slice, including whether a supported slice is empty; unsupported slices remain unavailable |
| Components | Explicit per-component cutoff, eligibility/cohort/denominator convention, release identity and content digest |
| Values | Allowlisted aggregate fields needed by the presenters; no person-level IDs, names, pay records, credentials, SQL, grants, physical inventory, schema fingerprints, paths or recovery material |
| Integrity | A specified canonical encoding and stable row order, per-component digests and one publication-content root supplied separately by trusted configuration |

An illustrative identity-only descriptor might use `format:
constructed-aggregate-publication-v1`, `datasetId: example-demo-v1`, and
`state: proposed`. It is not a payload or an accepted format in this reader.
Publication approval and runtime activation must remain separate decisions.
Private provenance/reconciliation evidence should map this new projection to the
unchanged original generation; it must not be embedded in the public projection.

## Filtered-data gap

The retained dashboard artifact covers company-wide scope only. A country,
business-unit or level dashboard request fails closed rather than receiving the
company total. This is **not full application readiness**. Other supported
role/business-unit operations keep their own contracts and do not establish general
dashboard filter coverage.

Closing the gap requires deterministic aggregates for the supported joint filter
tuples, their time-series history and each component's correct denominator. Marginal
country/org/level totals cannot reconstruct intersections or cohort rates. Valid
empty slices must be distinguished from missing or unsupported slices, and filtered
totals/history must reconcile with the same unchanged population and cutoff. Do not
add employees or alter population/country identities to fill this coverage gap.

## Remaining release work

Independent code review can proceed without loading or publishing data. A later
release still needs an audited sanitized projection or approved private delivery,
a reviewed production-successor identity contract, measured loader startup/memory,
durable read selection, verified retained-source/writer controls and deployed
client/saved-work/switch-back tests. Archive preservation and physical recovery
remain separate requirements. This draft authorizes none of those operations.
