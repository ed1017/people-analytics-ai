# Fixture-only hiring provenance preflight

Base checkpoint: `1f068eda8d6d1733860d2f709e7bcc19f1bb8664`.
The report documents reproducible constructed evidence, not training readiness or
predictive performance. It reads only fixed repository sources, executes the existing
synthetic generator and baseline evaluator, and freezes the existing acceptance
contract. It does not fit a model, execute the acceptance prediction fixture, query a
service, read company/employee rows or integrate with the product.

## Generate the audit artifact

With the repository's Node 24 runtime:

```sh
node tests/manual/report-hiring-fixture-preflight.mjs > /tmp/hiring-fixture-preflight.json
node --test tests/hiring-fixture-preflight.test.mjs
```

The CLI accepts no arguments or dataset/prediction overrides. It writes JSON to stdout;
redirection above is the only artifact write. The library entry point is
`buildHiringFixturePreflight()` in `lib/ml/hiring-fixture-preflight.ts`. Its optional
root supports isolated byte-identical copies for tests, not arbitrary training data.
Caller-supplied identities must match the pinned reference; they cannot bless a
changed source by supplying a freshly computed hash.

## Identity and evidence contract

Before importing fixture/evaluator code, compare SHA-256 hashes of the actual bytes
of these four files with their reviewed checkpoint identities:

- `tests/fixtures/hiring-evaluation.mjs`: deterministic invented-row generator.
- `lib/ml/hiring-evaluation.ts`: existing temporal cohorts, baselines and metrics.
- `lib/ml/hiring-acceptance.ts`: existing fixed candidate/acceptance contract.
- `tests/fixtures/hiring-acceptance.mjs`: label-derived prediction fixture, read for
  identity only and never executed by this report.

Missing, malformed, extra, unreviewed or mismatched identities fail with an error and
produce no readiness report. Sources are checked again after evaluation. Updating a
reference requires a separately reviewed code change, not an automatic re-pin. The
report also hashes its own executing module's on-disk source; this identifies the
reporter bytes, not a signed execution attestation or repository-wide clean-tree claim.

The computed dataset, protocol and acceptance-contract fingerprints must also match
the reviewed outputs of those exact checkpoint bytes. This detects altered cached
fixture declarations or stale Node imports even when the files on disk have been
restored. These output identities are fixed in the reporter, cannot be overridden by
callers, and require review alongside source references if the fixture changes. They
are reproducibility checks, not a sandbox or proof of execution in a trusted process.

The artifact separates:

| Section | Meaning |
| --- | --- |
| `identities` | Actual source hashes, reviewed source checkpoint, reporter hash, evaluator dataset fingerprint, protocol hash and acceptance contract fingerprint |
| `constructedFacts` | The exact existing evaluator report and frozen acceptance contract, with fixture row/status counts, coverage and constructed observation lag |
| `unverifiedDeclarations` | Fixture source/version, cohort/scope/status flags; explicitly no established company-history provenance |
| `performanceEvidence` | Rejected label-derived test predictions; placeholder artifact hashes are not upgraded by this report |
| `companyHistoryReadiness` | Blocked, with explicit missing authorization/scope, source lineage, opening/status coverage, label-observation history, opening-known features, per-fold evidence, untouched-holdout and deployment prerequisites |

The current pinned recipe creates 684 filled-status records across 57 months and
sets label observation to start plus two days. These are known construction rules;
they are not imputed company-history facts. Existing evaluator tests/gates can pass
on this constructed universe. The returned status nevertheless stays
`fixture-method-validation-only`, and `trainingReady`, `modelTrained`,
`performanceValidated` and `deploymentValidated` remain false. No raw requisition IDs
or local membership audit are exported in this report.

The acceptance fixture constructs predictions as actual labels plus chosen errors.
Its hashes are placeholders. Neither passing its tests nor replacing those placeholders
with real source hashes makes its predictions independent performance evidence. This
report deliberately does not run candidate acceptance or offer a training override.

## Boundaries and next review

Hash equality establishes reproducible source identity, not independent historical
provenance, authentic data availability, actual fitting or a previously untouched
holdout. Manifest verification flags remain declarations in a constructed fixture.
The missing company-history prerequisites are the repository-only findings at the
pinned checkpoint; no current service state is inferred. Aggregate medians cannot
substitute for row-level training evidence, and the fixture's two-day observation lag
must never be transferred to company rows.

Future work requires reviewed source/provenance evidence and a compatible authorized
input contract before any fitting or forecast integration. This report introduces no
new evaluator, fitter, thresholds, schemas, data adapter, model request or UI claim.
The old foundation documentation is corrected to distinguish the implemented acceptance
mechanics from still-unimplemented fitting and independently verified execution.

Local validation: 488 full repository unit tests pass, including eight new preflight
checks; full ESLint, standalone TypeScript and genuine optimized Next build pass.
The CLI JSON was generated and its reporter/source identities and false readiness
flags checked. No browser behavior changed or browser validation is claimed for this
Node-only slice. Publication remains gated on independent review; no push occurred.

## Independent review

Reviewed exact `4180689db12d0bb72ace737f0568a86b700046b6` against checkpoint
`1f068eda8d6d1733860d2f709e7bcc19f1bb8664` on the separate local branch
`review/hiring-preflight-independent`.

Fixed one P2 identity defect: source-byte verification alone allowed a different
protocol or dataset to be reported after cached fixture code/declarations changed.
Two regressions reproduced it: mutating the imported manifest's as-of date, and
importing an altered generator before restoring its original file bytes. Both
previously returned a report under the unchanged source hashes; both now reject
with a constructed-identity mismatch. No evaluator, fixture recipe, thresholds,
performance policy or report readiness flag was changed.

The four pinned source hashes were independently compared with both current file
bytes and Git blobs at the checkpoint. The final CLI report's reporter hash also
matches its source bytes. Constructed declarations remain explicitly unverified as
historical provenance; label-derived predictions remain rejected and unexecuted.
Training, trained-model, performance-validation and deployment flags remain false.

Passed: all 490 repository unit tests, including ten preflight tests; full ESLint;
standalone TypeScript; genuine optimized Next build; whitespace checks; CLI JSON
identity and false-flag checks. Before-fix failures are recorded in
`/tmp/preflight-independent-repro.log`; final evidence is
`/tmp/preflight-independent-{focused,unit,lint,ts,build}.log` and
`/tmp/preflight-independent-report.json` in the execution workspace.

Acceptance: run the two commands above, confirm the four false flags and blocked
company-history readiness, then run the cached-input regressions and confirm they
reject. No browser behavior changed; no browser/device validation is claimed. No
fitting, live query/API/auth/model call, push, merge or deployment occurred. The
checkpoint, PR99/release branch, earlier review branches and held eNPS work remain
unchanged. This completes the bounded fixture-readiness infrastructure review;
actual historical evidence and execution validation remain separate prerequisites.
