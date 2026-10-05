# Reproducible synthetic workforce dataset and replay checkpoint

This is a new, local synthetic experiment created under explicit authorization to
supply missing histories. It does not reconstruct, overwrite or certify the
existing workforce database. No application, Home, model, SQL, schema, access or
prior report file changes. All operational qualification flags remain false.

The scenario/seed/window [protocol](synthetic-workforce-protocol-v1.md) was committed
before generation. Five families × three seeds produce **15 cases**, each with
72 monthly workforce observations, 72 all-opening hiring cohorts and 24 quarterly
survey waves. Families are stationary, gradual improvement, July 2026 reversal,
reporting stress and survey instrument break. Seeds are 17, 29 and 43. No case is
selected or discarded because of forecast performance. This checkpoint executes
no predictive model evaluation and reports no efficacy, causal effect or calibrated
interval. Invariant inspection is not independent holdout custody.

## Reproduction and staged outputs

```sh
node tests/manual/generate-synthetic-workforce.mjs --check
node --test tests/synthetic-workforce/*.test.mjs
# Explicit regeneration of only the new experiment directory:
node tests/manual/generate-synthetic-workforce.mjs --write
```

The [run manifest](evidence/synthetic-workforce-v1/manifest.json) pins the complete
config, seeds, source-module hashes, runtime and compressed/uncompressed output
hashes. Node 24.19.0 and UTC were used. The fixed timestamp is a reproducibility
label, not a real run-clock measurement or historical observation. The PRNG is a
32-bit LCG initialized by SHA-256 of the seed and a domain/family stream label;
changing a survey algorithm cannot consume the hiring random stream.

There are 30 reproducible gzip files, approximately 1.2 MB in total, plus the JSON
manifest. `releases/<family>-<seed>.json.gz` holds dated aggregate releases;
`truth/<family>-<seed>.json.gz` is explicitly marked ground truth that must not be
used as future training information. Outputs contain no person identifiers or
employment scores. Files can be inspected with Node `gunzipSync` and JSON.parse.
The manifest records every fixed development/assessment/final replay fingerprint,
visible/withheld record counts, complete hiring-horizon counts and survey versions.
These are pipeline checks, not forecast performance metrics.

Use the sole as-of replay boundary after decompressing a release file:

```js
import {replaySynthetic} from '../lib/ml/synthetic-workforce/pipeline.mjs';
const snapshot = replaySynthetic(
  'turnover', artifact.domains.turnover.releases,
  '2026-06-30T23:59:59.999Z'
);
```

Replay selects the highest revision available by the cutoff, rejects broken
revision chains and source-observed relabeling, and emits neither truth nor future
metadata, scenario family or seed. `simulatedAvailableAt` is always a simulation;
`sourceObservedAt` is null. Revision history never overwrites a prior vintage.
A missing or suppressed value remains null; a confirmed zero requires a complete
release. A not-yet-released period is absent, not silently completed with zero.

## Domain semantics and explicit assumptions

**Workforce/turnover.** The initial stock is 8,400. All actual external hiring
starts within the frozen 72-month workforce window feed daily entries; acceptance, planned starts, cancellation and
no-show do not. Every day and month balances beginning stock + starts − voluntary
exits − other exits = ending stock. Events occur at the start of a UTC day, so
person-days are the sum of post-event daily stocks. Starts after December 2026
remain hiring follow-up only; each case explicitly reconciles all actual starts
as in-window plus post-window counts without extending the frozen stock horizon. This new simulated exposure
is not the source dataset's month-end denominator or a forecast of future exposure.
Monthly exit probabilities, seasonality, improvement/reversal parameters, report
lags and classification corrections are explicit in the module and definitions.
August 2021 is a fixed true-zero mechanics case. Delayed releases preserve the
initial classification and later correction. At the June 30 assessment origin,
ordinary June counts have not arrived; the latest available count is May. Any
subsequent forecast must account for that information gap, not borrow final June.

**Hiring.** All generated opening cohorts are included, with seven aggregate
outcome buckets: quick/standard/late start, cancelled, no-show, open and accepted
but unresolved. Plans and actual dates are distinct. Opening dispositions always
sum to the complete generated opening universe. Calendar age 90 does not mean
90-day labels are completely reported: `horizonLabelsComplete` waits for the
prespecified maximum report delay (3 ordinary days; 39 stress days). The bounded
report-delay assumption is explicit and simulated, not established for source data.
Unresolved cases remain right censored for full time-to-start; a fixed 90-day label
can be complete after its observation window closes. Cancellation/no-show are
competing outcomes, not successful starts. Fixed zero-opening months test support
guards. The reversal adds 65 days to standard/late starts, so standard starts cross
the 90-day target boundary. This is a declared stress mechanism, not a tuned model.

**Satisfaction.** Quarter-end generated headcount supplies eligibility. Five
newly declared equal-weight items use 1–5 answers, with 4/5 favorable. The score is
the mean of each valid respondent's favorable share over valid answered items;
it is not the percent of employees satisfied or a pooled-item average. At least
two valid answers are required; missing/invalid answers and invalid respondents
are explicit. Response coverage uses valid respondents / eligible stock.
Nonresponse is independent of outcome within a wave by construction; the generator
does not validate representativeness or informative-nonresponse corrections.
No respondent linkage or within-person change is inferred. Missing/suppressed
waves remain withheld even though separate generated truth exists. July 2026's
instrument break in the survey-break family prohibits unbridged cross-instrument
comparison; no monthly interpolation is performed. Synthetic suppression states
are not a privacy or complementary-suppression certification.

**Provenance.** [Attribution and new assumptions](../lib/ml/synthetic-workforce/provenance.json)
identify preserved recovered-construction commit `c9ace41df024c4fb186e32ebf4da05b88597a799`
and its constraints-file checksum. The 8,400 anchor, hire/departure boundary and
partial scoring conventions are reused as attributed conventions. Complete
original ordering, allocation, instrument, event-universe and observation history
remain unknown. All longer histories, random streams, daily timing, independent
response probabilities, report delays and revision processes are new assumptions.
The generator does not target the existing final 10,000 employees, 5,080 hiring
rows or source counts, and does not relabel created data as recovered history.

## Exact next integration boundary

Keep this package offline and outside the app/data-source boundary. Add one local
adapter that consumes only `replaySynthetic` output:

1. Turnover: map complete released monthly counts and simulated availability to
   the existing aggregate vintage contract. Preserve missing calendar periods and
   count zero. Treat the latest-month report gap explicitly in the target horizon;
   do not treat June's final count as known on June 30. The existing vintage
   evaluator hardcodes different historical windows; an explicit protocol bridge
   must retain this experiment's frozen 2026 targets. Generated person-time is
   historical exposure only; future rate denominators remain separate assumptions.
2. Hiring: map only complete opening cohorts with `horizonLabelsComplete` into
   `{month, openings, started}` where `started` counts actual events within 90 days.
   Preserve cancellation/no-show in all-opening denominators. Existing hiring
   qualification assumes a single cutoff with outcome coverage current through it;
   this simulation separates as-of availability from outcome-through time. Do not
   backdate releases or claim current complete coverage to force that adapter to
   pass. A reviewed two-clock adapter is needed before evaluation; otherwise keep
   its blocked result. The existing model
   requires positive, sufficiently large, contiguous cohorts; known zero-opening
   months deliberately exercise that abstention boundary. Do not drop or impute
   them merely to obtain a fit. Any revised support rule needs its own frozen
   aggregate-only protocol and tests before comparing all 15 cases.
3. Satisfaction: adapt released comparable waves and the explicit scoring contract
   into predefined two/three-wave windows accepted by the existing descriptive
   wave-change calculator (it does not accept all 24 at once). The full-history
   qualification audit should remain blocked when it includes missing/suppressed
   releases or an instrument break. Retain coverage and
   missing/suppressed waves; block the instrument break. Do not call it a monthly
   forecast or turn sensitivity bounds into confidence intervals.

Then freeze the estimator/selection/metrics and gap/support policy before scoring
the assessment window, publish every fixed case including abstentions/losses, and
keep October–December reserve separately identified. No new data access is needed
for this next offline integration. Data generation is no longer the blocker to
that work; source qualification and real-world validation remain separate.

Independent Astra/high review found no release-leakage blocker and identified
the post-window hiring reconciliation now included in code, artifacts and tests.
It confirmed the recovered-evidence checksum. The next bridge should first audit
expected pass/blocked cases against existing contracts; this is bounded integration
work, not a reason to stop ML or to declare the new data operational evidence.
