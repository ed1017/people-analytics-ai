# Offline Action Plan analysis consumer

This milestone completes the three-domain consumer and a saved-draft review CLI.
It is based on the verified remote head `ac3c6d49977dbce18cca0cc78aaa953cb7b6c198`
from `feat/offline-workforce-ml-demonstrations`, on separate branch
`feat/analysis-demo-consumer`. All original models, source heads, adapters, reports
and Home files remain unchanged. Astra/high performed architecture, explicit type
design and independent evaluation.

## Runnable handoff

```sh
# Check the canned count-plan artifact against freshly executed producers.
node tests/manual/action-plan-analysis-demo.mjs --check

# Read a saved BundleDraft and emit a compact review packet to stdout only.
node tests/manual/action-plan-analysis-demo.mjs --draft /tmp/plan-draft.json --review
```

The CLI validates the draft before running producers and never changes the input
file, stored plan or entered assumptions. It emits bounded source/demo distinctions,
all hiring cases and abstentions, and explicit unavailable states. It accepts no
source/model/qualification override. `--write` regenerates only the new canned
demo artifact, `docs/evidence/action-plan-analysis-demo-v1.json`.

Programmatic local use:

```js
import {actionPlanAnalysisDemo, readCachedActionPlanAnalysisDemo}
  from './tests/manual/action-plan-analysis-demo.mjs';
const result = await actionPlanAnalysisDemo(draft);
const checked = await readCachedActionPlanAnalysisDemo(result, currentDraft);
```

This is a Node/offline entry point, not a client-component import, HTTP endpoint,
Home UI or persistence change. Do not put the full report into existing plan
storage. The compact packet is for read-only review; it has no adoption operation.

## Result interpretation

| Domain kind | Available content | Plan/source meaning |
|---|---|---|
| `conditional-count-reference` | Existing turnover method, assumptions, chronological baseline comparisons and conditional counts | Only the existing exact count/population/horizon match permits a numeric reference. Actual source remains unqualified; counts are not rates. |
| `experimental-hiring-benchmark` | All nine scenario/seed cases, model identities, dates, sample sizes, comparisons and seven abstentions | Separate synthetic fixture population; historical test performance is not operational accuracy or this plan's hiring capacity. |
| `descriptive-satisfaction-wave-change` | Three irregular fixture waves, two adjacent changes, response/eligibility counts, decomposition and nonresponse sensitivity | Descriptive arithmetic, not a forecast. Predictive baseline comparison is explicitly not applicable; real source evidence remains blocked. |

Every domain includes a compact source status and exact plan binding separately
from demo availability. A demonstration may be available while source status is
unqualified. Hiring and satisfaction remain explicitly separate from the plan
population. Satisfaction identification bounds never become confidence intervals.

Top-level `status: current` means freshly evaluated and bound to this exact draft,
not qualified for operational use. Each domain independently reports available or
unavailable. `forecastBaseline`, `causalEffect`, and calibrated `interval` stay null;
operational qualification stays false. What-if and success-measure assumptions are
copied without relabeling. Changing a target changes the binding, not model output
or observed-wave arithmetic. No savings, avoided exits or target probabilities are
inferred.

The canned example deliberately uses the existing exact count contract: companywide
recorded voluntary separations, October–December 2026, and `Voluntary exits (count)`.
It retains an Unknown baseline and an illustrative target. The conditional count
reference is 201; that number is not adopted. Realistic turnover-rate and capacity
drafts are also tested through the saved-draft CLI: the count reference stays
unavailable while separately labeled benchmark/descriptive context remains visible.

## Freshness, types and failures

The public producer executes the existing fresh source consumer and hiring
experimental producer once. Satisfaction's saved artifact is compared in full
against its regenerated existing report before projection. Methods, source hashes,
assumptions, labels, bounds and fixtures therefore cannot be replaced by a cached
qualification flag. Content hashes bind versions; they do not authenticate source
truth.

`analysis-demo-types.ts` supplies explicit numerical projection types for turnover
and satisfaction, avoiding inferred `any` from older JavaScript helpers. The
exported `ActionPlanAnalysisDemo` is a discriminated union with typed domain
payloads. The type-contract fixture checks important numeric and null/false fields.
Astra/high's TypeScript traversal found no `any` in the exported result type.
Internal composition still requires fresh outputs from the controlled local
producers; it is not a new external model-ingestion API.

Missing, invalid, stale or unsupported satisfaction artifacts clear that domain's
numeric payload and preserve its reason code. Other fresh domains may remain
available. A shared producer failure clears all domains. Any cached whole-result
mismatch returns `stale` with `domains: null`; no old numeric payload survives.
Invalid drafts fail before expensive evaluation.

Public error tests copy only repository `lib`, `tests`, and `docs` into a temporary
directory and exercise actual missing/invalid/tampered report files and deliberately
failing producer functions there. The real checkout and prior reports are never
altered. Temporary test directories are removed afterward.

## Read-only contract inspection and integration boundary

The inspected main was `e50b31555a187a9b730827dfda470975f5085501`; inspected Home
release/surface branches were `8b24ccdd08fbcb302cc12e883ec1c2a2663010ea` and
`4dca2ed0c560eb4769a1a50e564012fbe7817422`. Their older draft shapes differ from the
base's PR129 what-if extensions. This implementation targets verified base
`ac3c6d4`, reuses its `readBundleDraft` and `bundleInputKey`, and supports drafts
without optional fields. It does not claim to have compiled against every Home
branch. Home owns final contract/merge sequencing; no Home file was edited.

Code-ready now: the complete three-domain artifact pipeline, typed result, compact
saved-draft review packet, and failure/staleness tests. Evidence-blocked: operational
forecasts, real accuracy, calibrated intervals and causal effects. Those blocks do
not prevent the offline consumer from being used and evaluated independently.

## Next independently executable step

Add a batch review runner over an explicit local directory of already validated
saved drafts, with one read-only packet per input, a manifest of exact draft and
evidence identities, and per-file failure isolation. Test mixed valid/invalid,
rate/count/capacity, scope-changed and stale drafts using fixtures. Reuse the same
consumer and cached-result guards; do not add models, data access, persistence or
Home changes. This extends the now-working saved-draft path without waiting for UI
integration or source qualification. Any directory input must be supplied explicitly;
do not discover or ingest unrelated user files.

Actual source progress remains separate: complete monthly event/availability data
and risk exposure for turnover rates; all-opening actual-start/status follow-up
for hiring; comparable scored aggregate waves, eligible/response denominators,
observation/completion and release evidence for satisfaction. No additional history
or missing labels can be invented by the consumer.

## Verified milestone

All 1,130 repository tests passed, including ten new runtime tests spanning the
unified consumer, actual public failure paths and saved-draft CLI. Full TypeScript,
focused ESLint, compile-only numeric contract assertions, the new demo artifact
check and all five previous report/forecast checks passed. Astra/high independently
approved the final semantics and verified that the exported result type contains
no nested `any`. The original tracked files, Home files and prior artifacts are
unchanged; this milestone adds only new offline consumer, tests, types and docs.
