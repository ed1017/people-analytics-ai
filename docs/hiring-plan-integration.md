# Hiring benchmark → domain adapter → plan context

This local integration builds on `d7d2fe5b7978b11aa31c9ac0d744b9beefca486a`.
It adds no model, source data, UI, persisted plan field or operational prediction.
The original `397c6d5` hiring benchmark and robust-selection report remain unchanged.

## Exact minimal Home handoff

The offline entry point is unchanged:

```js
import {planForecastContext, readCachedPlanForecastContext}
  from './tests/manual/plan-forecast-context.mjs';

const context = await planForecastContext(draft, 'hiring');
const experiment = context.experimentalSynthetic;
// If retaining a local result, regenerate against the exact current draft:
const checked = await readCachedPlanForecastContext(context, draft, 'hiring');
```

The Node runner is an offline handoff, **not a client-component import** or a new
production endpoint. A future UI integration needs its own reviewed artifact or
server boundary. This commit only supplies the local contract and tests.

`experimentalSynthetic` uses the explicit discriminated union
`ExperimentalHiringResult` in `lib/ml/hiring-experimental-result.ts`:

- `kind: experimental-synthetic-result`, `domain: hiring`, `dataClass:
  constructed-synthetic` in both branches.
- `status: benchmarked` supplies the comparison; `status: unavailable` supplies
  reason codes with `benchmark: null`. Neither status permits an operational
  baseline, interval or causal estimate.
- `benchmark.cases` retains **all nine** scenario/seed cases. Each includes model
  identity/version/selected method, selection reason, past-validation comparison,
  training/test dates, cohort/opening sample sizes, fixed recent/logistic/selected
  test metrics, selection losses, and the selected synthetic fractions.
- `benchmark.abstentions` retains **all seven constructed stress cases**, with
  reason, `predictions: null` and `interval: null`. These are fixture stress tests,
  not seven real-world prediction failures.
- `artifactIdentity`, `implementationIdentity` and result `identity` bind the
  comparison to the complete fresh report and projection implementation. Individual
  model identities also bind case, fitted model and selection result.

The minimal future presentation should label this **Historical experimental
synthetic benchmark**, show the source/method, July–September 2025 test dates and
sample sizes, retain the baseline comparisons/losses and abstention reasons, and
state that intervals are unavailable. Its population is the constructed fixture,
not the plan population. There is no matching-scope or baseline adoption action.
Do not interpret the selected fractions as capacity, time-to-fill, expected hires
for this plan, or probabilities of attaining its target.

The existing plan fields remain authoritative: `context.status` stays unavailable
for operational hiring, `source` remains unqualified with its original missing
inputs, `forecastBaseline` and `reference` stay null, and `planAssumptions` copies
the entered what-if/success-measure assumptions unchanged. The intervention effect
remains not-estimated. Experimental benchmark visibility never approves an action
or replaces an assumption; any future baseline adoption needs a separately reviewed
source/metric/scope contract and explicit review.

## Verification and failure path

`hiringExperimentalForConsumer` reads the existing JSON report, independently
re-runs `benchmarkHiringSelection`, and passes both to
`projectExperimentalHiringArtifact`. That domain adapter requires exact full-report
equality, including protocol, outcomes, fits, errors and source-file hashes. It
projects the result only after checking experimental qualification flags. Existing
model/readiness/domain evaluators are reused through the benchmark; no source
contract is replaced or upgraded.

Missing/invalid JSON, regeneration failure, stale/tampered content or contradictory
qualification produce an unavailable experimental result without cached numbers.
Abstention reasons survive projection. Missing intervals stay null, never zero or
an inferred confidence range. Full plan-context cache comparison also rejects any
changed draft, goal, revision, artifact, implementation, case or model identity;
stale context clears `experimentalSynthetic`.

Both composition helpers are internal. Their fresh-result arguments must come
from the local producers, not external claimed model output. Content hashes detect
changes; they do not authenticate source completeness or real-world accuracy.

Run the focused integration and existing context suites:

```sh
node --test tests/hiring-plan-integration.test.mjs tests/plan-forecast-context.test.mjs
```

Seven new integration tests and all 1,110 repository tests passed. TypeScript,
focused ESLint, both hiring benchmark checks, both original forecast artifact
checks, and whitespace checks passed. Independent read-only review found no
blocking issue. The TypeScript union defines the consumer contract; current
`checkJs: false` means the JavaScript projection body is supported by runtime
checks/tests rather than fully checked against that union by TypeScript.

## Next meaningful satisfaction capability

The available history has three comparable engagement waves (October 2024,
October 2025, June 2026), with irregular intervals. The additional pulse instrument
does not supply another comparable wave. Three observations cannot support credible
seasonal modeling, fitted trend selection with independent temporal evaluation,
or calibrated future-wave intervals. Do not interpolate monthly labels or treat
BU slices of the same wave as additional time observations.

The useful next capability is **observed-wave change and nonresponse sensitivity**,
after the existing satisfaction adapter accepts comparable scoring, eligibility,
availability and release metadata. It should report respondent score changes and
participation separately, preserve unknown/suppressed values, and avoid pooling
repeat respondents or asserting matched-person change.

With a bounded respondent favorable-answer share, a supported score sum `S`,
respondent count `n` and eligible population `N`, the all-eligible mean is bounded
by `S/N` and `(S + N - n)/N` if nonrespondent shares may range from 0 to 1. These are
worst-case nonresponse identification bounds, **not confidence intervals, forecasts
or causal effects**. Changes require comparable population/scoring definitions;
otherwise report incomparability. A local synthetic mechanics fixture can exercise
these calculations without inventing historical waves. No such new satisfaction
calculation is implemented in this integration commit.
