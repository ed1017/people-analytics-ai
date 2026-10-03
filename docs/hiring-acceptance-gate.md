# Synthetic candidate-versus-baseline acceptance gate

This isolated Node module implements the acceptance portion of the existing
[held hiring experiment contract](workforce-overnight-review.md#scoring-acceptance-and-reproducible-outputs).
It builds on the [existing evaluator](hiring-evaluation-foundation.md); it does not
replace its splits, labels, medians, metrics or provenance checks. The branch starts
at release integration `134c04def4b60036955c78b57559782e94b7f9d9`, independently of
the journey UI review branch. No product, route, storage, database or model uses it.

`modelTrained` and `deploymentValidated` are always **false**. Predictions in the
fixtures are constructed errors around known invented labels. They exercise pass/fail
mechanics and are deliberately not a fitted model or evidence of predictive accuracy.

## Entry points

- `freezeHiringAcceptanceContract(manifest)` freezes the existing temporal protocol
  before seeing outcomes, the specified candidate settings and acceptance thresholds,
  and a SHA-256 fingerprint. There is no caller-supplied threshold override.
- `evaluateHiringCandidateAcceptance(manifest, observations, artifact)` recomputes
  the existing evaluator's two baselines and local memberships. It validates the
  candidate artifact, uses `scoreAlignedPredictions` for all candidate metrics, selects
  the fixed penalty using mean development-fold MAE, and applies acceptance rules.
  No files, services, fitting, feature extraction or external models are used.

Malformed or unsupported artifacts throw fixed errors. Insufficient baseline evidence
returns `blocked`; unmet performance gates return `rejected`. Both retain baselines.
A pass is named `passed-synthetic-method-validation`, with decision
`continue-method-review` and `syntheticAcceptanceGatesPassed: true`. This is not a
training authorization, deployment gate, forecast or evidence of assignable capacity.

## Artifact contract

The artifact is a strict object with these fields; unknown fields are rejected:

| Fields | Required meaning |
| --- | --- |
| `contractFingerprint`, `datasetFingerprint` | Exact frozen contract and normalized observation content returned by the existing evaluator |
| `sourceDefinitionSha256`, `evaluatorGitSha`, `candidateCodeSha256` | Declared source/code identifiers, lowercase 64/40/64 hexadecimal characters |
| `provenance`, `purpose` | `synthetic`, `method-validation-only` |
| `family`, `predictors` | `ridge-log1p-elapsed-days`; exactly `opening-month-sine`, `opening-month-cosine` |
| `featureAvailability`, `preprocessing` | `opening-known-calendar-only`, `training-fold-only` |
| `transform` | `max(0,expm1(prediction))` |
| `selectionScope`, `holdoutUse` | `development-only`, `once-after-settings-locked` |
| `trials` | Exactly three `{penalty, folds}` records, for penalties 0.1, 1, 10 |
| `holdout` | `{penalty, fold}` for the unique development-selected penalty |

Every fold is exactly `{name, trainBefore, trainingIds, preprocessingIds, predictions}`.
The name/cutoff must match the frozen evaluator. Training and preprocessing IDs must
each equal its complete eligible pre-cutoff training set, with no duplication, omissions,
scored IDs or historically unavailable labels. Predictions are exactly `{id, days}`
rows, with finite nonnegative day values and exactly the evaluator's scored ID set.
Targets are reconstructed only for the evaluator-approved score IDs, using its already
validated opening/start dates. Candidate-supplied actuals, metrics, arbitrary features,
post-opening predictors, employee fields and extra model families are not accepted.

Each penalty must include all three development folds. Only their mean MAE chooses
the penalty; holdout errors cannot influence selection. Equal means fail closed because
the existing specification has no reviewed tie policy. The holdout penalty must match
the unique selection. This validates submitted artifacts; it cannot prove when an
external submitter first inspected holdout data or what an unobserved fitting process
actually did. Declarations of feature availability, preprocessing, transformation and
one-time holdout use are necessary but not independently established source truth.
Code hashes are reported under `declaredProvenance`, not as verified attestations.

## Unchanged acceptance thresholds

The following come directly from the held specification:

- All existing population, provenance, coverage, observation and calendar-feature
  eligibility gates pass, including both available baselines.
- MAE improves by at least **10% and 2 days against each baseline** on the holdout and
  on at least **two of the same three development folds**.
- No development fold MAE worsens by more than **5% against either baseline**.
- Holdout p90 absolute error worsens by no more than **5% against either baseline**.

Comparisons use unrounded shared metrics and inclusive limits. Zero baseline error
cannot support a claimed two-day improvement; a 5% non-regression bound around zero
requires zero error. No MAPE, confidence interval or synthetic forecast claim is added.

The frozen output contains the baseline report, candidate selection scores, all four
fold metrics and both-baseline checks, failed gate names, declared provenance and a
canonical artifact fingerprint. Raw IDs stay only in the separate existing `localAudit`.
Input row/property order and prediction/trial/fold order do not change results. The
module neither modifies input records nor creates a persisted acceptance record.

## Validation and real-data prerequisites

Run `node --test tests/hiring-acceptance.test.mjs tests/hiring-evaluation.test.mjs`.
The synthetic acceptance suite covers pass/reject/blocked behavior, inclusive thresholds,
zero-error baselines, mismatched datasets, exact row membership, unavailable labels,
leaky preprocessing, unsupported features/models, missing/extra/duplicate predictions,
nonfinite errors, development selection, ties, immutability and deterministic ordering.

Before any real-data experiment, a separately reviewed input path and authorization
are needed: the present evaluator intentionally rejects real provenance. That review
must establish complete approved opening cohorts including open/cancelled cases,
historical role/scope membership, dated status and label-availability history, verified
opening-known features, source-definition hashes and sufficient counts/coverage in
every frozen fold. Retain the local exclusion and membership audits within the approved
execution boundary. Do not request private rows as part of this infrastructure slice.

The separate [synthetic development-fold fitter](hiring-ridge-method.md) implements
train-only standardization and ridge coefficients for numerical-method tests. It does
not construct a complete acceptance artifact or fit a final holdout model.
Company-history fitting and preprocessing, reproducible authorized fitted artifacts,
independent provenance verification, and an auditable settings lock before a genuinely
untouched holdout remain unimplemented. Subsequent out-of-time/deployment validation,
monitoring and any product forecast integration need separate review. Passing these
synthetic mechanics closes none of those evidence gaps. The acceptance module itself
performs no fitting; authentication work, employee-level decisions and eNPS changes
remain outside these offline methods.

Validation for this slice: all 463 repository unit tests pass (including 15 new gate
tests), full ESLint and standalone TypeScript pass, and the genuine optimized Next
production build passes. No browser behavior changed, so no browser coverage is
claimed for this Node-only addition. The four new files leave the existing evaluator,
journey/release branches, routes, schemas and held eNPS files unchanged.

## Independent local review

Reviewed exact `e0b61a8b497164a653c914d999631056f0aa982d` against
`134c04def4b60036955c78b57559782e94b7f9d9` on the separate local branch
`review/hiring-acceptance-independent`. No correctness defect requiring a production
code change was found. The acceptance module and existing evaluator remain unchanged.

Five additional adversarial tests establish that:

- Improving against each baseline on two different sets of development folds is
  insufficient: two of the same folds must improve against both. A constructed
  crossing-baseline fixture fails only the paired development-improvement gate.
- Either penalty 0.1 or 10 can win when uniquely selected by development MAE;
  penalty 1 is not implicitly preferred.
- Changing holdout labels changes holdout metrics but cannot change development
  selection, development metrics, frozen windows or training baselines.
- Missing rolling-baseline evidence blocks acceptance while retaining the available
  expanding baseline; no fallback makes the missing comparison pass.
- Malformed nested artifacts and cross-fold scoring/training IDs fail closed.

These complement the original threshold, zero-error, nonfinite, leakage, provenance,
immutability and exact-cohort tests. Source inspection confirms that thresholds match
the held specification and no product module imports this gate. The acceptance result
still cannot verify source declarations, actual fitting/preprocessing, a prior settings
lock or an untouched holdout. It keeps `modelTrained` and `deploymentValidated` false.

Independent validation: 48 focused evaluation/acceptance tests and all 468 repository
unit tests pass; full ESLint, standalone TypeScript, genuine optimized Next build and
whitespace checks pass. Logs are `/tmp/hiring-independent-focused.log`,
`/tmp/hiring-independent-unit.log`, `/tmp/hiring-independent-lint.log`,
`/tmp/hiring-independent-ts.log` and `/tmp/hiring-independent-build.log` in the review
workspace. This Node-only review has no browser/device or live-service validation.

Acceptance: run the focused command above, then inspect a passing fixture's synthetic
status and false training/deployment flags; change the selected holdout penalty or
inject a scored ID into training and confirm rejection; remove rolling-window evidence
and confirm a blocked retained-baseline report. These are mechanics checks, not model
performance evidence. No fitting, data acquisition, live API/auth/model/database calls,
push, PR update, merge or deployment occurred. PR99, the release branch, the verified
journey candidate and held eNPS work are preserved.
