# Deferred legacy source initialization

The server registers a synchronous client factory at import time. It reads the
existing server-only Supabase credentials and creates the client on the first
client access inside a request bound to legacy. Importing this module, resolving
the bootstrap token, and rejecting stale requests do not require credentials or
create a client. Existing consumers retain their request-bound method access and
the same authentication configuration; successful initialization is shared for
the process lifetime. Client reflection/enumeration is not an exported contract.

Missing credentials and initialization failures now surface on first legacy
client use instead of module import. Failures expose a generic message and remain
failed for that process; configuration repair requires a fresh process. Neither
a different factory nor a replacement client can be registered afterward. This
does not imply that every application module can start without credentials for
other services.

Unsupported Promise/thenable results are observed only to consume a possible
rejection, then rejected synchronously with the same cached generic error. They
never become the client and do not make initialization asynchronous. Isolated
strict-rejection processes check rejected Promises, async factories, rejecting
thenables and reentrant failures without exposing their synthetic private marker.

This is source preparation only. The production registry still contains only
`legacy-v1:0`, selector writes remain disabled, and the current population and
model values are unchanged. No candidate artifact is registered, selected, or
published. No database operation, credential change, access expansion, private
artifact upload, paid AI call, or deployment is part of this change.

Activation still requires complete recovery/readback and restore evidence,
reviewed publication and serving configuration, complete domain adapters,
request/cache/session behavior across cutover and rollback, and end-to-end
acceptance against the retained build. Existing country definitions, frozen
releases, and the separate Future of Work population remain unchanged. Aligning
generated history with a forecast cutoff is not independent forecast validation.

Validation uses the actual runtime/server module bodies with a synthetic SDK,
synthetic credentials, and the real request boundary. It covers deferred import,
stale rejection, nested and concurrent request binding, single initialization,
unchanged auth options, redacted failures, and disabled selection. No production
rows or credentials are used by these tests.

The installed-SDK smoke also creates the real client with synthetic credentials,
verifies its auth options and method binding, and constructs query builders without
executing them. Its fetch implementation rejects requests; the offline suite also
blocks network APIs. This does not validate a live database response. The draft
review branch has a branch-specific `git.deploymentEnabled: false` entry in
`vercel.json`; other branches retain their existing deployment behavior.

```sh
node --import ./tests/fixtures/dataset-review-offline.mjs --test \
  tests/dataset-legacy-client.test.mjs tests/dataset-supabase-lazy.test.mjs \
  tests/dataset-request-boundary.test.mjs tests/dataset-route-request.test.mjs
```
