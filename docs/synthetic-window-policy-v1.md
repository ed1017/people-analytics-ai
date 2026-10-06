# Prior-release selection of forecast history windows

**Retain the current settings.** Prior-validation window selection improves
aggregate synthetic turnover error but worsens the unseen reversal. Hiring and
satisfaction remain unchanged because different longer windows lack sufficient
earlier validation support. No model or interval is promoted. The previous
[history-length comparison](synthetic-history-length-v1.md) remains exploratory
and unchanged. This study does not promote an app model or interval.

## Frozen design

Protocol `73c9b467eae3405f13320223ffebd499e6623562` and implementation
`7e7cde21c11f554f85cd21e5dd0b7b67ba5eadf6` were committed before generating seeds
11501–11520. The unchanged 72-month generator produces 100 histories across five
families. Each history has three decisions, at December 31, 2025, March 31, 2026,
and June 30, 2026: 900 domain/decision rows in total. Targets are the next three
calendar months, with satisfaction using only the final quarter-end wave.

At each decision, each candidate is fitted from releases replayed at that cutoff.
Earlier forecasts are replayed at their own earlier origins. Their validation
labels are replayed at the **decision cutoff**, so eventual corrections and
unreleased hiring outcomes cannot enter window selection. Final assessment labels,
replayed as of February 28, 2027, are supplied only after all decisions for that
history have been computed. Input and label fingerprints and all fold scores are
saved in the compressed evidence.

The selector uses the latest three strictly earlier quarterly origins where the
current reference has complete scored labels. A candidate must forecast now and
score on exactly those same three folds. It minimizes mean prior-fold MAE among
current, 12-, 24-, 36- and 60-month settings. Among candidates within `1e-10` of the
global minimum, ties prefer current, then ascending window length. Fewer than
three usable folds means retaining current. If current cannot forecast, the
policy retains its abstention even if a shorter candidate could run.

Only window length is selected. The fixed current comparators are the existing
12-month turnover OLS trend (with 24 months required support), 36-calendar-cohort
hiring logistic trend, and eight-wave satisfaction OLS trend. “Current” here is a
fixed experimental reference, not a claim that trend is the best app default.
Recent-mean, seasonal, pooled-fraction and last-wave baseline results are retained
in the report. Native support, all-opening denominators, known zeros, reporting
lags, instrument identity and optimizer failure behavior are unchanged.

## Results

| Domain | Paired decisions | Current MAE | Selected MAE | Worst family/origin, current → selected |
|---|---:|---:|---:|---|
| Turnover counts | 280 | 18.890 | 14.987 | June reversal: 85.773 → 89.219 |
| Hiring, percentage points | 298 | 6.975 | 6.975 | June reversal: 66.160 → 66.160 |
| Satisfaction, score points | 280 | 2.628 | 2.628 | June reversal: 32.854 → 32.854 |

Turnover selection improves 210 decisions, ties 15 and worsens 55. Of 280
available decisions, it selects 36 months 221 times, 24 months 44 times and the
current setting 15 times. Another 20 reporting-stress decisions at December 2025
preserve the current partial-data abstention. It never selects 12 months because
that trend is identical to current, which wins ties. No 60-month candidate has
the three required shared validation folds.

| Turnover family, averaged across origins | Paired decisions | Current MAE | Selected MAE |
|---|---:|---:|---:|
| Stable hazard with seasonality | 60 | 15.312 | 9.674 |
| Gradual improvement | 60 | 9.705 | 7.581 |
| Reversal | 60 | 36.435 | 35.062 |
| Reporting stress | 40 | 16.030 | 10.525 |
| Survey-break family, turnover | 60 | 16.013 | 10.605 |

The reversal family average conceals the failure at its June decision: its two
pre-reversal quarters improve, but the shock quarter worsens by **3.446 exits**.
All other 13 scored turnover family/origin strata improve. The reporting-stress
December stratum is unavailable, not zero error. The policy therefore fails the
frozen requirement that no family/origin mean worsen, despite its 3.903-exit
aggregate gain. Mean per-decision turnover RMSE improves from 20.163 to 16.215.

On the same 280 turnover cases, seasonal-naive MAE is 15.471 and recent-three
MAE is 16.380. The policy's advantage over a simple seasonal baseline is much
smaller than its advantage over the current trend; this study does not select
between different method families.

Hiring retains current for all 300 decisions: the matching 36-month arm ties it,
12/24 months fail positive-exposure support, and 60 months never qualifies on
all prior folds. Two current optimizer failures remain abstentions (stationary
seed 11519 and reversal seed 11505, both December 2025). Pooled-fraction MAE is
6.811 on the same 298 scored decisions, compared with the trend's 6.975.

Satisfaction also retains current for all 300 decisions. Its 24-month arm is
identical; 36 months can forecast now but fails at least one shared historical
fold in every case. Twelve months is too short, and 60 months includes missing
or suppressed old waves. The 20 June survey-break decisions predict but cannot
be scored against a changed instrument. Last-wave MAE is 3.110 on the same 280
scored decisions. Unchanged policy errors here are an eligibility result, not
evidence that longer complete comparable survey histories cannot help.

The separate missingness guard preserves all 20 turnover and all 20 survey
abstentions; all 20 hiring guards remain available. There is no reduction in
forecast or scoring availability relative to current in any domain.

The preregistered rule returns `retain-current` for all three domains. This
is the stopping result: no post-result tuning, additional model complexity or
automatic app integration is proposed. A parent-reviewed evidence-only merge is
the next integration step.

## Interpretation and eligibility

The unit of aggregation is a paired history/decision, using mean per-case MAE
and, where available, mean per-case RMSE. The latter is **not pooled RMSE**.
Hiring MAE weights target cohorts by their opening counts within each case.
Repeated origins and generating families share histories/seeds; 900 rows are not
900 independent trials. There are no significance or real-world efficacy claims.

The six-year timeline can support a 60-month forecast now without supporting
three earlier complete 60-month validation folds. Old missing survey waves also
limit validation of the 36-month survey candidate. Ineligible settings have no
accuracy claim. This is an eligibility-constrained selection policy, not a
balanced contest of every possible history length.

Only the June 2026 decision crosses the generator's fixed July reversal. Earlier
origins are useful prior comparisons but cannot establish repeated shock
robustness. Stable turnover includes seasonality and changing workforce stock;
the hiring improvement family mostly changes duration within the 90-day target,
not that target's success probability.

A separate December-only guard at November 30, 2025 checks native partial-data
abstention. It uses no validation folds and makes no accuracy or window-selection
claim. Missing and incomparable outcomes are never assigned zero error.

## Reproduction and scope

```sh
node --test tests/synthetic-window-policy.test.mjs
node tests/manual/generate-synthetic-window-policy.mjs --check
# Explicit local regeneration only:
node tests/manual/generate-synthetic-window-policy.mjs --write
```

The [report](evidence/synthetic-window-policy-v1/report.json) pins implementation
sources, protocol and preceding evidence; `scores.json.gz` retains all decisions,
prior-fold scores, fingerprints, assessment scores and guards. Nine focused tests
cover temporal exclusion, old-origin replay, complete hiring follow-up, common
folds, exact ties, current abstention, survey breaks and paired recommendations.

Report SHA-256:
`92fb23eeff1af0b525126b9c33dc41613355e3d6bd8b6c9bc68baec8cf187762`.
The full isolated-branch suite passes **1,352 tests**. Targeted lint, TypeScript
and the unchanged app-facing group-consumer evidence check also pass.
Independent read-only review verifies all 21 implementation hashes and 21,229
numerical/contract checks across the 900 decisions, including common-fold choices,
hiring release clocks, baselines, eligibility and worst-stratum recommendations.
Both evidence artifacts reproduce byte-for-byte with the frozen implementation.

All predictions remain constructed synthetic aggregates. No original source
history is backfilled and no simulated timestamp becomes a historical observation.
No October–December 2026 target period/cohort is scored, though hiring follow-up
can extend into those dates. Published intervals, causal effects and rate forecasts
remain null; operational and real-world qualification remain false.

This branch adds offline modules, tests and evidence only. It changes no app UI,
AI-context boundary, compensation, database, RLS, security or held eNPS file. No
live credential or database access is needed. Any future model integration is a
separate review coordinated by the main UI/release worker.
