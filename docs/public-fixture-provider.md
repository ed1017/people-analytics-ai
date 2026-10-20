# Public fixture read-provider scaffold

This module is an isolated, unwired scaffold. It does not reproduce the public 9,037 release, calculate scenarios, or replace any existing application provider. Its only fixture is newly invented: a 10-to-12-person trend. It contains no values copied from the private bundle. The production/public binding and its host guards are unchanged.

## Manifest schema (version 1)

The executable closed schema is `lib/public-fixture/read-provider.mjs`. Every object rejects unknown keys; all required keys must be present.

| Field | Required value / schema |
| --- | --- |
| `schemaVersion` | `1` |
| `contract` | `invented-public-read-fixture-v1` |
| `dataClass` | `invented-test-only` |
| `parity` | `none` |
| `documents` | Exactly two documents, one per allowed target |
| document `target` | `/api/headcount` or `/api/headcount-trend`, unique |
| document `sha256` | Lowercase SHA-256 of canonical JSON body (sorted object keys, retained array order) |
| document `body` for headcount | Exactly `{headcount: nonnegative safe integer}` |
| document `body` for trend | Zero to 120 rows, exactly `{snapshot_date, headcount, fte}` per row |

Dates must be actual ISO calendar dates and strictly increase. Headcounts are nonnegative safe integers; FTE is finite, nonnegative, and at most headcount. Empty trend arrays are explicitly supported. The text input is limited to 1 MiB. A separately supplied SHA-256 pin covers the exact UTF-8 manifest text, including whitespace; the provider never trusts an internal self-reported manifest digest. A hash detects changes relative to its trusted pin; it does not establish publication approval. The checked-in test pin is reviewed alongside its fixture, not a production trust mechanism.

## Read contract

`createPublicFixtureProvider(manifestText, trustedDigest).read(target, {method: 'GET'})` returns an immutable `{status, headers, body}` value. It does not perform IO or return a network response. A caller must explicitly read and supply text; this scaffold has no automatic data selection or environment mode.

Only the two exact absolute paths above are accepted. No query key or value is supported in v1. Empty queries, repeated parameters, unknown parameters, encoded path aliases, dot segments, fragments, trailing slashes, full URLs and other noncanonical targets return 400. Canonical but unsupported routes return 404; methods other than exact `GET` return 405. No failure falls back to a company-wide scope or synthesizes zero counts. Successful reads use `no-store` and identify their invented fixture contract. These status rules are scaffold behavior, not verified production parity.

## Dependency boundary

The new module imports only `node:crypto`; tests additionally use Node's built-in test/assert/fs modules. It imports none of the existing dataset bindings, calculators, public approval receipt, environment guards, or private files. There is no Next.js rendering or routing change and no dependency installation is needed.

The existing integration still needs `.private-9037/{integrity-manifest.json,component-contracts.json,components.json,joint-dashboard.json,captured-62-queries.json}` through the preview/public binding. Its public projection and allowlist already exist. This scaffold neither supplies nor exports those files. Its two response shapes follow the existing public allowlist for headcount and headcount-trend, but its scalar constraints are a new narrow fixture contract, not a proof that all existing release responses satisfy them.

## Verification and remaining work

Run `node --test tests/public-fixture-provider.test.mjs`. Tests exercise successful reads, immutable data, known empty results, strict route/query rejection, independent manifest/content tampering, closed schemas, metadata/prototype key rejection, scalar/date/order validation, duplicate/unknown/missing routes, size bounds, and malformed JSON. All fixtures are committed and tests run without private data, network, credentials, or application dependencies.

Before a real public-only reproduction release:

1. Audit and integrate the current public-safe application source independently of private ignored inputs.
2. Review an approved public-only response manifest and establish its own publication identity and trusted digest. Do not relabel this invented fixture as the 9,037 release.
3. Expand executable schemas and explicit route/query scope coverage with reviewed public payloads and golden response comparisons, including known empty filter intersections. The current two-target scaffold makes no coverage claim for the other routes.
4. Inventory and define public calculation inputs separately; compare calculator outputs and branch behavior independently. Cached GET documents cannot establish POST/calculator parity.
5. Add a deliberately selected local provider mode and adapter only after contract review; preserve production host guards. Verify a clean clone/build and browser interactions with private inputs absent.

No deployment, publication, private-input export, calculator parity, full Next.js build, or UI parity is included in this change. Existing Record a result and case-study functionality are untouched.
