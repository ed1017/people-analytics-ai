# Synthetic ridge method

The original numerical implementation was an isolated local slice after PR100 head
`be582c66b183c3d590d0b515e4d5a110d282139e`. It does not change PR100, the production
workforce calculator, AI clarification, source adapters or any acceptance thresholds.
No company-history model has been fitted. Synthetic tests exercise the actual solver;
their numerical results are not evidence of predictive performance.

## Frozen estimator

For each existing development fold, take exactly the evaluator's eligible `trainIds`:
opening before cutoff, with valid labels actually observable by that cutoff. Let
`y_i = log1p(actual-start-date − opening-date)` in calendar days. The only predictors
are `sin(2πm/12)` and `cos(2πm/12)`, where m is UTC opening month, January = 0.
A twelve-month table preserves exact quadrantal zeros and halves rather than treating
trigonometric roundoff as meaningful feature variation. Year, employee attributes and
post-opening recruiting outcomes are not predictors.

Fit each column's mean and population standard deviation using training rows only:

`μ_j = Σ x_ij / n`, `s_j = sqrt(Σ (x_ij − μ_j)² / n)`, `z_ij = (x_ij − μ_j) / s_j`.

An exactly constant training column maps to zero for training and scoring, with scale
stored as 1. If neither column varies, fitting is refused. Nothing is imputed from
validation data. The objective is:

`min_(a,β) Σ_i (y_i − a − z_iᵀβ)² + λ Σ_j β_j²`, for λ in `{0.1, 1, 10}`.

The intercept a is unpenalized. The loss is a **sum**, not a mean. Consequently the
same λ has less relative regularization with more training rows; this is an explicit
method convention, not a result-driven penalty adjustment. Training scales give the
two calendar columns comparable units. No target scaling is applied. Existing penalty
candidates, calendar windows, sample gates and acceptance thresholds remain unchanged.

## Numerical implementation and boundaries

`fitHiringDevelopmentRidge(manifest, observations, foldName, penalty)` in
`lib/ml/hiring-ridge.ts` now validates through the development-only evaluator described
in [the holdout boundary](hiring-holdout-boundary.md), requiring all development eligibility gates. It sorts training IDs for reproducible
accumulation, uses compensated sums for centering/scaling, centers standardized columns
and log targets, then appends two `sqrt(λ)` penalty rows. A two-column Givens QR solve
with `Math.hypot` avoids matrix inversion and forming normal equations. Positive ridge
penalties regularize collinear/constant columns. The intercept is recovered from the
training means. Nonfinite intermediate arithmetic fails rather than producing a fit.

Scoring uses only each evaluator-approved development row's opening month, with the
saved training means/scales and coefficients. Convert the log prediction with the
already specified `max(0, expm1(prediction))`. Negative extrapolated values receive the
fixed zero floor; there is no outcome-dependent clipping or bias correction. Nonfinite
or above-`Number.MAX_SAFE_INTEGER` day outputs reject, matching the shared scorer's
range. Invalid/missing evidence follows the existing evaluator's exclusions and gates;
missing labels never become zero targets. Unsupported penalties, malformed evidence,
real provenance and unknown/holdout fold names reject.

The return contains the frozen method, model coefficients/scales and a local candidate
fold with the existing gate's exact training/preprocessing/prediction shape. Its IDs
are local alignment data, not a public report. `syntheticFitPerformed` is true;
`companyModelTrained`, `trainingReady`, `performanceValidated` and
`deploymentValidated` are false. Calling this function performs a synthetic numerical
fit, so describing it as “no fitting whatsoever” would be inaccurate.

The next [holdout-boundary slice](hiring-holdout-boundary.md) adds development-only
selection, an immutable in-process settings lock, and an explicit final-evaluation
entry. Development operations never read held-out outcomes or calculate holdout
baselines. Final evaluation retains all original eligibility and acceptance gates.
This does not establish real provenance, durable experiment custody or a globally
untouched holdout. No company-history fitting or deployment readiness is claimed.

## Tests and concise method explanation

Run `node --test tests/hiring-ridge.test.mjs`. Tests check constant and zero-target
analytic solutions, an independent closed-form two-variable ridge solution, penalty
shrinkage, exact evaluator membership, unchanged fits under nontraining-label changes,
constant-column handling, zero-floor extrapolation, ordering/immutability and rejection
of unsupported or malformed inputs. These are algorithm tests, not accuracy results.
An additional collinearity test verifies stable finite fits when both standardized
calendar columns carry the same information.

For an interview: production uses transparent deterministic Build/Move/hiring scenario
arithmetic under reviewed demand, timing, cost, training, budget and headcount inputs;
AI clarification only proposes structured inputs for explicit review. Separately, the
offline code now fits a synthetic log-duration ridge regression using opening-month
sine/cosine with train-only standardization. Evaluation infrastructure compares paired
cohorts against rolling and expanding historical medians across three temporal
development folds and a reserved final holdout, using MAE and p90-error gates. No
company-trained regression, validated hiring forecast or production ML is claimed.

Original numerical-slice validation: 504 repository unit tests pass, including 14 ridge-method tests;
full ESLint, standalone TypeScript, genuine optimized Next build and whitespace checks
pass. Logs are `/tmp/hiring-ridge-{unit,lint,ts,build}.log` in the execution workspace.
No browser behavior changed, so browser/device validation is not claimed for this
Node-only slice. Existing evaluator, acceptance and preflight source bytes are unchanged,
as are PR100's branch, product code, model-input boundaries and held eNPS work.
No push, merge, live query or external fitting service was used for that slice. Current boundary validation is recorded in [the follow-up review](hiring-holdout-boundary.md).
