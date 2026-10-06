# Synthetic aggregate domain predictions

This isolated checkpoint makes the existing 72-month synthetic histories usable
for fixed, offline domain predictions. It creates no replacement database records
and changes no Home/navigation, SQL, security, eNPS or original evidence files.
The [report](evidence/synthetic-domain-predictions-v1/report.json) contains all
comparisons, failures and a prespecified September 30 demo projecting through
December. Every operational qualification flag remains false.

## Qualification and recovered provenance

The source fixture still has 33 monthly snapshot periods but only 32 event-bearing
months; January's joined zero remains unverified. Bulk September 28 insertion is
not historical first availability, and month-end stock is not person-time exposure.
The [custody assessment](aggregate-custody-readiness-assessment-v1.md) remains
unchanged and blocked. New simulated timestamps cannot repair those unknowns.

Local commit `c9ace41df024c4fb186e32ebf4da05b88597a799` was directly inspected.
It documents attributed deterministic cohort/date and classification rules,
planted engagement shifts and the original 4,480 external/600 internal hiring
construction. The external sample selected current active survivors, so it does
not establish complete opening cohorts. Full executed SQL and actual historical
release logs remain unrecovered. The current generator already cites that commit
in its provenance; this work preserves the distinction between recovered rules,
reported evidence and newly declared assumptions.

The existing separate generator supplies the missing mechanics: reconciled daily
workforce exposure and monthly counts; complete simulated opening universes with
offers, starts, cancellation, no-show, unresolved cases and reporting delays; and
quarterly survey eligibility, scoring identity, publication and revisions. No new
generator was needed. See [generator documentation](synthetic-workforce-generator-v1.md).

## Frozen experiment and methods

Protocol `113971aef92d391ab25ce1ead7af373c234e02fc` preceded generation and
evaluation. Implementation `b01b083` preceded evaluation. Ten development seeds
6001–6010 × five families × three rolling origins produce 450 domain rows.
Twenty separate test seeds 7001–7020 × five families at June 30, 2026 produce
300 rows. All 150 histories have 72 months. No winner selection or parameter
search is performed. Models fit only each history's releases available at its
origin; there is no fit across test labels. This is constructed holdout evidence,
not independently blinded or real-world validation.

| Domain | Target and support | Fixed candidates |
|---|---|---|
| Turnover | Monthly voluntary count; latest 24 consecutive complete released months; calendar reporting gap retained | Recent mean of 3 months; same month last year; nonnegative linear trend fitted to 12 months |
| Hiring | Fraction of all future openings actually starting within 90 days; 36 calendar cohorts, at least 24 positive-exposure cohorts; both horizon and reporting completeness required | Existing fixed-penalty logistic trend; pooled fraction; recent 3 positive-cohort fraction |
| Satisfaction | Next requested quarterly wave's mean respondent favorable-answer share; 8 consecutive complete comparable waves | Last wave; equal-wave recent mean of 3; linear trend fitted to 8, bounded to 0–100 |

Known zero-opening months stay in the calendar audit and contribute zero
binomial likelihood. They are not invented failures or omitted calendar periods.
Cancellation/no-show/unresolved outcomes remain in all-opening denominators.
Hiring probabilities do not use future opening counts to produce start-count
forecasts. Survey response coverage is audited; it is not representativeness.
There is no respondent pooling, monthly interpolation or percent-satisfied claim.

An existing optimizer failed during the development run, before test scoring.
Commit `279c9e4d4125550bc6656336cea269dde76037f9` maps only its two known numerical
failure errors to abstention, without retries, new parameters or altered model.
One development case abstains for this reason. Ten development turnover cases
abstain because recent releases are incomplete. Every such row is retained.

## Held-out results and limits

The table shows mean per-history MAE across 20 histories per family. Count units
are exits; satisfaction and hiring errors are percentage points. Hiring MAE is
opening-weighted within a case. All methods and Brier/log-loss/RMSE metrics are in
the report. Histories within a family share a generating mechanism; these are not
100 independent real populations. Mean case RMSE is explicitly not pooled RMSE.

| Scenario / domain | First baseline | Second baseline | Trend |
|---|---:|---:|---:|
| Stable turnover | 12.55 | 10.05 | 13.62 |
| Improving turnover | 10.07 | 8.48 | 9.66 |
| Reversal turnover | 87.48 | 95.15 | 87.38 |
| Stable hiring | 2.52 | 2.87 | 2.84 |
| Reversal hiring | 65.99 | 66.04 | 65.90 |
| Stable satisfaction | 0.30 | 0.22 | 0.30 |
| Improving satisfaction | 2.42 | 3.59 | 0.23 |
| Reversal satisfaction | 31.97 | 31.61 | 32.77 |

All 100 turnover and 100 hiring test cases are scored. Satisfaction produces
100 conditional forecasts, with 80 scored and 20 withheld because the future
wave changed instruments. That future change is discovered only by the scorer;
it is not leaked into the June forecast. Reporting-stress cases are retained
even when their selected support happens to be complete at the fixed test origin.
More complicated candidates do not establish general superiority.

The original frozen protocol has two imprecise sentences, clarified in the report
without rewriting the protocol or changing methods:

- “Stationary” means stable generating mechanism. Turnover counts still have
  seasonality and changing workforce stock. Hiring fractions and survey scores
  in this family have no expected trend. The earlier
  [paired-prefix control](synthetic-paired-prefix-turnover-v1.md) separately tests
  a turnover shock with no pre-origin signal. Reversal, reporting stress and
  instrument breaks here are simplified shift controls, not validated shift rates.
- The unscored reserve is October–December **target periods/cohorts**. July–September
  hiring cohorts require 90-day follow-up overlapping October–December calendar
  events. Thus calendar events in that quarter are not wholly untouched.
  No October–December turnover counts, opening-cohort outcomes or survey scores
  are evaluated, and no reserve score is published.

All intervals are null; none was calibrated here. Future rate denominators remain
unknown. Historical person-days do not supply them. There are no individual
employment scores, causal claims or real-world accuracy claims.

## Integration and reproduction

The models accept only `replaySynthetic` snapshots through a strict local bridge:
no family, seed, full truth object or future row is accepted. Prediction results
include status/reason codes, dated support, separate candidates and null intervals.
Full release-chain validation happens at replay; selected-vintage arithmetic and
clock checks happen again at the bridge. This is an offline internal contract,
not an endpoint accepting arbitrary files or a replacement for source readiness.

The next UI integration should read a verified static projection of the report's
prespecified `demo` case (stationary seed 7001, September 30 cutoff). Label it
“Constructed synthetic demonstration,” show all candidates with units and dates,
and preserve unavailable intervals and operational status. Do not choose a default
winner from these assessment results. Keep source readiness alongside the demo
as a separate evidence channel. Main UI/release worker owns that integration;
this branch edits no shared UI files.

```sh
node --test tests/synthetic-domain-*.test.mjs
node tests/manual/generate-synthetic-domain-predictions.mjs --check
# Explicit regeneration, no database access:
node tests/manual/generate-synthetic-domain-predictions.mjs --write
```

The report pins generator/model/runner bytes and the compressed row evidence.
Regeneration must match byte-for-byte. The existing group consumer retains
identity `6f76782c3da5b1c326f4a6b55e04792c1f5258e2f8712aa26205439a098265e8`.
Independent code review found no modeling/leakage blocker and identified the
two reporting clarifications above. Focused guards cover future revisions,
missing support, known zeros, maturity/reporting clocks and instrument changes.

Validation on Node 24.19.0: 1,336 repository tests passed, targeted ESLint and
TypeScript checks passed, and the prior group consumer verification passed.
The report SHA-256 is
`5e4a2f441b9577d51deb7a6605b96503e8a5e5706f1c025d888ae7f58c0bc6e5`.
