# Bounded public headcount data parity

Captured from the already published `https://www.ed-ai.app` endpoints at **2026-10-20T04:09:04.620Z**. This is a two-route, unfiltered **data-field** milestone, not a complete reproduction of the live release. No private binding or private input was read. No production code or host guard changed.

## Exact inventory and provenance

| GET target | Stored allowlisted fields | Canonical data SHA-256 |
| --- | --- | --- |
| `/api/headcount` | `headcount` (9,037) | `235824ac01ce223ab39bec82b714f3fff606e1e2ebac12b511369f938e58f942` |
| `/api/headcount-trend` | Each row: `snapshot_date`, `headcount`, `fte` | `9e91e37a101bc1e7390f10ff6c061b51b818b1f316beb627fe2399a693418498` |

Manifest SHA-256: `57b204aea4068960b777411451948eea59b62444f09a72fcd29e4c6b3b409ed4`.

The capture selects these fields explicitly from public HTTP 200 responses and validates them before saving. It never persists raw endpoint bodies, headers, `data_meta`, tokens, receipts, or source lineage. The manifest's endpoint/time provenance is authored by the capture process; it is not copied endpoint metadata. The deployed source commit was not established by these API reads; content hashes and capture time identify the evidence here. New captures require review and may change the pin.

`tests/fixtures/public-headcount/` contains the manifest/pin and two separate projected golden JSON documents. These golden documents are produced during the same capture, so offline equality alone is not independent verification. A second network read, after implementation, independently compared the two projected public responses with the provider output and passed. No endpoint metadata was saved in that verification either.

## Executable schema and provider

`lib/public-fixture/published-read-provider.mjs` accepts exactly schemaVersion 1, contract `public-headcount-data-snapshot-v1`, provenance `{origin, capturedAt, parity}` and two unique documents `{target, sha256, body}`. Origin is exactly `https://www.ed-ai.app`; parity is exactly `two-unfiltered-get-data-fields-only`; capture time must be a valid canonical UTC timestamp. Unknown keys are rejected at every object boundary.

The shared data schema enforces nonnegative safe integer headcount, finite FTE between zero and headcount, actual ISO calendar dates, and ascending dates. This snapshot additionally requires every month-end from January 2024 through September 2026 (33 rows) and equality of final trend headcount with the headcount document. Tests pin the observed start 8,400, ending 9,037, and change +637. The schema does not claim these are measured employee outcomes.

The provider performs no IO and imports only Node crypto through the shared helper. The input text is bounded to 1 MiB, externally pinned by exact UTF-8 SHA-256, and each body has a canonical JSON digest. Fixture LF line endings are pinned in `.gitattributes`. Replies are deeply immutable. Only exact GET targets are supported; queries, encodings, aliases and fragments are rejected. Unsupported routes and methods have explicit scaffold errors with no fallback. Error responses and headers are not claimed to match the live service.

## Verification

- `node --test tests/public-fixture-provider.test.mjs tests/published-read-provider.test.mjs`: 10 passing tests.
- Independent second live read: exact equality of every stored data field on both routes passed.
- Closed-schema tests reject response metadata, provenance additions, arbitrary fields, wrong identities, invalid timestamps, hash tampering, coverage gaps and cross-document disagreement.
- Existing invented fixtures remain separate and retain their `parity: none` contract.

The optional `node capture-public-headcount.mjs` command performs network reads and overwrites candidate public-data fixtures; it is a review-time capture tool, not part of offline tests or runtime. Run only when intentionally refreshing the candidate, and review the resulting field inventory and digests before accepting changes.

## Exclusions and next step

No parity is claimed for metadata, headers, error responses, query variants, other GET endpoints, dashboard intersections, role branches, POST calculations, UI behavior, or a clean full Next.js build. No current runtime is wired to this provider. Existing Record a result and case study are untouched. No private artifacts, private history exports, deployments or remote writes were included.

Independent artifact review is required before publication. Next: review these four fixture files and schema; expand one approved route family at a time; define public receipt compatibility separately if later authorized; prove calculator input completeness separately; only then design local integration and full clean-room application tests. Do not publish the inherited repository history as a shortcut to source distribution.

An initial proposed capture that included public response metadata was rejected by automatic approval review as outside the authorized scope. No such capture executed. The successful capture explicitly omitted all response metadata, and this narrower limitation is part of the parity contract.

Package note: capture commands above describe historical verification. Capture scripts are intentionally excluded from this offline distribution; do not run those commands from this package. See [package setup and capability matrix](public-reproducibility-package.md).
