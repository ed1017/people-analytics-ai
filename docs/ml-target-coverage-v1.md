# Complete RF and gradient boosting coverage

**Coverage is complete for the implemented targets and the requested new
performance/promotion targets.** Reject the new trees for performance,
promotion, group counts, conditional hiring duration, hiring-start fractions
and survey scores. Company-count RF passes only the new study's declared
synthetic-demo gate; prior failures and untested transport conditions remain
explicit. No added performance/promotion field passes its robust-value criterion.

This inventory distinguishes fitted targets, derived forecast quantities and
descriptive/scenario outputs. It was checked against app commit
`a73a645394f7322a731b4e7f9b20de528f66133c`, research commit
`bc0a6fa82044e2fdc606104365895116fa15afa8`, historical hiring-duration reference
`9efd7eff9593c3c2447674b7fa098651ecee931c`, and Career Mobility demo
`633caa3cde2923400ff0b3a0a2547d7c058a6d7a`.

No production model is replaced. All new numerical evidence uses separate
constructed aggregate histories, not new company data access. Source-history
qualification, real-world performance and operational readiness remain absent.

## Scope and existing evidence

| Target/path | Horizon and baseline | RF / boosting evidence | Decision |
|---|---|---|---|
| Company voluntary-exit count | Next three monthly counts; recent mean, seasonal naive, OLS, matching-feature Ridge | [Original tree benchmark](synthetic-tree-benchmarks-v1.md), lag-only/enriched and full/small training arms; [fresh review](synthetic-tree-review-v1.md); [new fixed-fit study](performance-promotion-trees-v1.md) | Earlier candidates reject; new RF fits pass only the new limited synthetic-demo scope; new GB rejects |
| Company count with fitted exponential smoothing | Same target/horizon; original alpha grid 0.2/0.5/0.8, training-only SSE | Added equal-24-month-history SES comparator in the performance/promotion study, with native implementation parity | New RF conditional demo pass; GB rejects |
| Company quarter/year-end total | Sum next three counts; observed year-to-date plus forecast sum for year-end | Derived quantity, not a separate estimator; new study explicitly scores quarter-total absolute errors | RF conditional demo pass for assessed quarter totals; no year-end accuracy claim; October–December 2026 target periods stay reserved |
| Group monthly count and quarter total | Groups A/B; recent mean, seasonal naive; signal experiment adds residual cell means | [Group tree comparison](group-turnover-trees-v1.md): monthly horizons1–3 and direct quarter total, lag-only/signal RF/GB, equal-feature Ridge and original comparators | Reject all supported RF/GB replacements |
| Suppressed groups C/D | Same horizons; native guards block forecasts | Same group comparison preserves all withheld rows | Unsupported; no reconstructed suppressed counts |
| All-opening hiring-start fraction | Each of next three monthly opening cohorts, fully followed90-days; pooled/recent fractions, fitted logistic trend | Original and fresh three-domain tree evidence; new auxiliary-field ablations | Reject original RF/GB replacements; no duration/count interpretation |
| Completed-fill opening-to-actual-start duration | At opening, next held-out quarterly opening block; rolling/expanding median and calendar-only log-duration Ridge | [Duration tree comparison](hiring-duration-trees-v1.md): exact same opening-month sine/cosine features and native eligibility gates | Reject both; conditional on completed fills, not a survival model for unresolved openings |
| Survey favorable-answer score | Next quarterly wave, consistent instrument; last/recent/OLS/Ridge | Original RF/GB benchmark and fresh stability-gated RF review | Reject both; observable gate fails to repair drift |
| Performance rating 4/5 share | New quarterly aggregate ordinal target, among valid completed ratings | [New longitudinal study](performance-promotion-trees-v1.md); static Career Mobility data insufficient | Reject RF and GB in all four feature tiers |
| Eligible-cohort promotion fraction | New next-three-month opening cohorts, promotion within 90-days | Same new study with frozen opening denominator | Reject RF and GB in all four feature tiers |

History-window selection, turnover adaptation and uncertainty experiments wrap
these same count/probability/score targets. They do not create extra fitted target
types. Point-forecast RF/GB results do not validate replacing an existing
uncertainty, support or abstention policy.

Implementation anchors are the [company count evaluator](../lib/ml/aggregate-exit-forecast.ts),
[group count evaluator](../lib/ml/group-turnover/evaluation.mjs),
[observable-signal model](../lib/ml/observable-turnover-signals/model.mjs),
[hiring cohort model](../lib/ml/hiring-cohort-model.mjs),
[preserved duration reference](../experiments/hiring_duration_trees_v1/reference/hiring-ridge.ts),
and [quarterly survey forecaster](../lib/ml/synthetic-domain-predictions/satisfaction.mjs).

## Explicitly unsupported or outside ML scope

- Turnover rates remain `null`: known historical exposure does not provide future
  population-aligned exposure. Company/source completion and vintage gaps are not
  repaired by these simulations.
- Expected hiring counts, time-to-fill for all unresolved openings, survival
  curves and productive capacity have no qualified predictive implementation.
  The duration reference predicts actual start, not the recorded closure field.
- Career Mobility's three annual observations per cohort are descriptive ordinal
  rating distributions and observed promotion summaries. Their lack of release
  clocks and temporal depth prevents using them as forecast training evidence.
- Compensation comparisons, performance/promotion chart arithmetic, survey wave
  change/nonresponse sensitivity, Build/Move/Buy planning, headcount/cost scenarios
  and LLM-generated narrative are not fitted workforce prediction models.
- No individual performance score, promotion recommendation, employee-risk
  ranking, sensitive-trait selection, eNPS model or causal intervention effect is
  implemented by this work.

## New-field comparison design

Performance remains ordinal: the target is the share of ratings 4/5, never an
arithmetic mean of ordinal categories. Promotion keeps every member of the
opening eligible cohort in the denominator, including exits and non-promotions;
incomplete90-day follow-up stays unavailable. Small cells and changed instruments
remain explicit exclusions. See the [data contract](performance-promotion-data-contract-v1.md).

Fixed RF, boosting and Ridge settings use the same training rows, historical
target weights and features within each tier. The four tiers are base,
base+performance, base+promotion and base+both. Existing domain base inputs retain
the original enriched feature set. New target base inputs use lagged outcomes,
calendar and released historical denominator summaries.

Auxiliary and original panels use separate random streams with no direct
cross-domain coefficients. They still share scenario/calendar drift, reversal
and reporting patterns. Consequently these ablations test constructed
associations and redundant/noisy information; they cannot establish either
usefulness or uselessness of actual performance/promotion data in another domain.
They do not add those fields to the production model-input boundary.
Within performance, its own added performance field mostly repeats the existing
latest outcome lag, with availability metadata; the same is true for promotion's
own added promotion field. Those arms test redundant representations as well as
information from another target, not wholly new economic information.

Protocol `cd958ee` was declared before generation. Pre-generation corrections
clarify shared scenario dependence, equal-case proper-score averaging and
explicit empty-cell handling; they do not follow held-out result inspection.
Training seeds 19101–19130 use origins through December 2024 and labels released
by June 30, 2025. Test seeds 19301–19340 use June/September/December 2025 and
March/June 2026 origins. All model audits are separately committed before fresh
test generation. The fixed seeds represent40 independent simulated history
clusters, not independent months or scenarios. No post-test tuning is allowed.
The reserved October–December period refers to target months/cohorts. September
hiring and promotion opening cohorts require follow-up into Q4 and later label
publication; those follow-up outcomes are necessary for complete90-day labels.

## Reproduction

The three new experiment directories contain frozen protocols, implementation,
tests and separately retained evidence. Use the pinned Python 3.12/NumPy 2.3.5/
SciPy 1.17/scikit-learn 1.8 runtime and Node 24.19. Source hashes bind each report.

```sh
python -m experiments.group_turnover_trees_v1.run check
python -m experiments.hiring_duration_trees_v1.run check
python -m experiments.performance_promotion_trees_v1.run check
```

The original three-domain benchmark and fresh-review files remain unchanged.
No DB/schema/security, held eNPS, shared UI or release-integration files change.

The new work adds 32 rejected supported group decisions (plus32 suppressed-group
unsupported decisions), two rejected duration candidates, and 40 five-domain
feature-tier decisions (four limited count-RF passes and 36 rejects). All45
performance/promotion input ablations fail their fixed robust-value gate. These
are distinct model/scope comparisons, not independent statistical replications.

Validation passes 121 Python and 1,367 Node tests, TypeScript and the prior
app-facing evidence identity check. Independent audits confirm the group,
duration and new five-domain summaries, underlying case metrics where retained,
training equality, release boundaries and all decisions. Exact reproduction
status and evidence hashes are recorded in each experiment report. The parent
can review these isolated evidence commits; no model rollout is part of this
branch, and the forbidden PR route was not retried.
