# Inactive pinned loading for joint dashboard artifacts

`createPreparedJointCandidateLoader` loads the company aggregate and joint
dashboard sidecar together from an explicitly configured canonical server
directory. Previously the joint reader required callers to supply raw bytes;
the existing filesystem loader handled only the company artifact and its old
company-only publication proposal.

The new loader requires six trusted configuration fields: `directory`,
`expectedArtifactBytes`, `expectedArtifactDigest`, `expectedDatasetDigest`,
`expectedJointBytes` and `expectedJointDigest`. It reads only the fixed filenames
`candidate-aggregate-artifact.json` and `joint-dashboard-artifact.json`. Actual
paths, pins, artifacts and private validation evidence remain outside source
control. Nothing reads request parameters or environment variables as selection
instructions.

Both exact byte lengths and SHA-256 pins must match. The existing file reader
rejects aliases, symlinks, non-regular files, oversized files and files that change
during reading. Existing company and joint validators then check the original
seal, parent binding, complete calendar, monthly stock/flow identity and component
denominators. Failure of either file fails the whole load; there is no company-only
or legacy fallback. Concurrent calls share one promise. Success retains an
immutable snapshot; failure stays cached until a caller explicitly creates a new
loader. The 16 MiB company and 2 MiB sidecar limits bound individual file reads,
not total process memory or hosted capacity.

This returns the unchanged local-review candidate and explicit false readiness
flags. It does **not** accept or extend the old company-only publication proposal,
create a production identity, certify hosted preservation, register a provider,
change a cache/session epoch or enable selection. The production runtime remains
`legacy-v1:0` with selection writes disabled. The current overview and all UI
files are unchanged. No database client, model transport or network is involved.

Portable configuration checks:

```sh
node --import ./tests/fixtures/dataset-review-offline.mjs --test \
  tests/dataset-joint-artifact-loader.test.mjs
```

Private filesystem/integration checks use the existing explicitly supplied review
directory and its unchanged `inputs.private.json`. Test copies are retained in
temporary directories outside Git; no cleanup is performed:

```sh
DATASET_JOINT_REVIEW_ROOT=/private/review-directory \
node --import ./tests/fixtures/dataset-review-offline.mjs --test \
  tests/manual/dataset-joint-artifact-loader.test.mjs \
  tests/manual/dataset-joint-dashboard.test.mjs
```

The filesystem tests cover scoped API/Home identity, concurrent loading, pinned
byte counts, mutation, cached failure, mismatched parents, invalid accounting,
missing inputs, symlinks, directories, FIFOs and oversized files. They do not
certify deployed browser behavior, model answers or complete application parity.

Production successor publication/delivery, startup without the legacy database
client, deliberate session/cache/saved-work epochs, hosted switch-back and full
recovery readback remain separate work. Ratings retain company/eight-BU scope;
job pay means retain company scope and suppression; listening retains engagement
coverage. Missing assessed readiness, external reference bindings and independent
forecast validation remain missing. Loading this pair does not expand them.

## Portable real-entrypoint integration regression

`node --test tests/dashboard-candidate-integration.test.mjs` bundles the actual
`GET` and `readDashboardOverview` entrypoints using the same locked webpack and
TypeScript test tooling as `home-dashboard-grounding.test.mjs`. A test-only runtime
alias supplies the real `DatasetRouter` and `createDatasetRequestBoundary`, which
dispatch to the existing `createLocalApiPresenter`. The production runtime is not
modified. This suite is included by the existing `tests/*.test.mjs` CI glob.

Analytics and release ports contain explicitly invented in-memory fixtures,
including an invented aggregate receipt. The company count satisfies the current
presenter's fixed contract; it is not evidence of a private artifact's contents.
The suite does not load, validate, or certify private seals or replace the manual
filesystem loader tests above.

Coverage includes scoped dashboard/Home identity and no-store headers, the full
33-month known-empty history, null zero-denominator turnover in API and Home
facts, unknown codes/parameters, stale or missing tokens rejected before readers,
sanitized reader failures without legacy fallback, and concurrent requests across
an in-memory rollback that advances the generation. Network is denied; legacy
RPC and environment reads throw, and the bundled VM permits only the crypto
builtin as an external dependency. Production remains `legacy-v1:0` with disabled
selector writes. No model, database, credential, or private artifact is needed.
