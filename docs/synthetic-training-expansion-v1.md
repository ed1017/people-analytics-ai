# Does more synthetic training data improve the forecasts?

The expanded sample does **not** justify replacing the current demo or publishing
intervals. This bounded experiment adds 500 separate seeded histories from the
unchanged 72-month generator: 250 training, 100 calibration and 150 test histories.
A nested subset of 50 training histories supplies the smaller comparison.
More training slightly changes the learned bias corrections, with mixed held-out
effects. It does not solve unseen reversals, missing observations or instrument
incomparability. These are new simulations, not additional company observations.

## Why this experiment

The existing domain methods fit each history independently. Adding evaluation
seeds alone would leave their predictions unchanged. To test training quantity,
this study fits the **same one-parameter residual correction per domain** from
50 versus 250 histories, keeping the unchanged baseline as a third comparator.
The baseline is the existing recent-3 mean for turnover, pooled opening fraction
for hiring and last wave for satisfaction. These are prespecified anchors, not
winners selected from the previous report. The correction is the average of each
training history's mean actual-minus-baseline error.

The added data expands Monte Carlo/sample-size coverage of existing assumptions.
It does not add new causal mechanisms, observed drivers, populations or verified
historical availability. Stable hiring and satisfaction offer no-expected-trend
controls. Stable turnover still contains workforce-stock and seasonality signal.
The hiring improvement family mostly changes start timing without changing the
within-90-days outcome. Family and seed labels are scoring strata, never model
inputs. This is one nested comparison, not a general learning curve.

## Preregistration and custody

- Protocol: `626441760750741a3f3d1048a34b34dcf7dce344`, committed before new-seed generation.
- Implementation: `4ff838b`, committed before training/calibration.
- Training and calibration freeze: `aae522062b5964b29257a55c413ffd97ffee6680`, committed before test generation.
- Training report SHA-256: `ea16b950f6ab45c6a486261254832037b5b6b91dac0a68d87149026e973d3eb4`.
- Training data SHA-256: `e644b65576d1a3f2be89c98daa6de5d80e2c4f318aead89927c1cbce0a0328d5`.

Before the first test run, `git merge-base --is-ancestor` verified the freeze
commit was an ancestor, and `git show` bytes for both training artifacts matched
their working bytes and SHA-256 hashes. The runner additionally verifies frozen
source hashes and reproduces corrections/calibration from saved training rows.
Its commit field alone is a reference, not cryptographic attestation of Git history.
There is no independent external blinding or real-world validation.

Training seeds 8001–8010 are nested in 8001–8050, each crossed with the same five
families. Calibration uses 8501–8520; untouched test seeds are 9501–9530. Training
and calibration forecasts use June 30, 2025 releases and July–September targets.
Labels are replayed at February 28, 2026, including required hiring follow-up,
strictly before the June 30, 2026 test origin. Test targets are July–September
2026; scoring uses February 28, 2027 releases. Forecasts never consume truth
sidecars or future labels. The October–December target reserve stays unscored;
hiring's 90-day follow-up overlaps later calendar months, as previously disclosed.

No parameter, training window, seed or method changed after observing test errors.
All prior data, reports and app-facing contracts remain unchanged.

## What was fitted and withheld

| Domain | Small usable histories | Expanded usable histories | Small correction | Expanded correction |
|---|---:|---:|---:|---:|
| Turnover | 50 | 250 | −9.120 exits | −9.884 exits |
| Hiring | 50 | 248 | −0.319 percentage points | −0.428 percentage points |
| Satisfaction | 50 | 250 | +0.620 percentage points | +0.582 percentage points |

Two expanded-training hiring histories retain the existing fixed-optimizer
abstention. Every calibration variant has 100 usable histories. Test scoring
includes 150 turnover, 147 hiring and 120 satisfaction histories. Three hiring
optimizer failures and all 30 future survey-instrument changes remain withheld;
no missing outcome becomes zero. Equal eligible-history weighting can give
slightly unequal family representation when an adapter abstains.

The separate native missingness check replays reporting-stress cases at November
30, 2025. All 30 turnover and all 30 satisfaction cases abstain for December
because their latest support is still partial. The correction cannot bypass that
boundary. Hiring predicts in all 30 checks; this generator's opening gaps recover
before maturity, so this is **not** evidence of robustness to missing mature hiring
labels. Existing adapter tests cover rejection of missing mature labels.

## Held-out errors

Entries are mean per-history MAE. Turnover uses exit counts; hiring and satisfaction
are shown in percentage points. Hiring errors give equal weight to target cohorts
within each history; they are not the earlier opening-weighted Brier/log-loss
metrics. The complete report includes all families, paired differences,
wins/losses, bias, and mean history RMSE (not pooled RMSE).

| Family / domain | Unchanged baseline | Small training | Expanded training |
|---|---:|---:|---:|
| Stable turnover | 11.156 | 6.468 | 6.400 |
| Improving turnover | 10.396 | 6.922 | 6.920 |
| Reversal turnover | 86.956 | 96.076 | 96.840 |
| Delayed-reporting turnover | 11.489 | 7.306 | 7.301 |
| Stable hiring | 2.481 | 2.544 | 2.567 |
| Reversal hiring | 65.268 | 64.950 | 64.840 |
| Stable satisfaction | 0.406 | 0.546 | 0.522 |
| Improving satisfaction | 2.492 | 1.872 | 1.911 |
| Reversal satisfaction | 31.994 | 32.614 | 32.576 |

The stable turnover expanded-versus-small MAE improvement is only 0.068 exits,
with 16 wins and 14 losses across the same 30 test histories. The learned downward
correction worsens reversal turnover versus the unchanged baseline; expanded
training is worse than small training in all 30 reversal histories. Stable hiring
and stable satisfaction corrections both remain worse than their unchanged
baselines. Improving satisfaction worsens when training is expanded in all 30
histories. Small gains in some scenarios do not establish a superior general model.

## Diagnostic calibration results

Each variant uses the **same separate calibration histories**. For each history,
take the maximum absolute error across its target months/cohorts; the radius is
order statistic `ceil((n + 1) × 0.9)`, rank 91 for 100 histories. Bands are clipped
to the target's support. Test coverage means all targets in a history are covered,
not independent month-wise successes. Hiring bands target observed aggregate
cohort fractions, not individual risks or confidence intervals for a parameter.

These are empirical residual-envelope diagnostics. Temporal and scenario shifts
violate the assumptions needed for an exchangeability-based coverage guarantee.
The model reports `coverageGuarantee: false` and `publishedInterval: null`.

| Test case | Baseline joint coverage | Small joint coverage | Expanded joint coverage |
|---|---:|---:|---:|
| Stable turnover | 29/30 | 29/30 | 28/30 |
| Improving turnover | 27/30 | 29/30 | 28/30 |
| Improving satisfaction | 7/30 | 8/30 | 7/30 |
| Reversal, each domain | 0/30 | 0/30 | 0/30 |

Expanded turnover bands are slightly wider than small-training bands (42.435
versus 42.240 exits) while stable coverage declines. Survey instrument-break
coverage remains unavailable, not zero. Pooling calibration across known
mechanisms does not promise adequate coverage within a particular family.

## Recommendation and reproducibility

Keep the current app demo and its unavailable intervals. Do not add these learned
corrections to UI/AI context or use them as filtered planning baselines. No UI,
model-input, DB, security, eNPS or causal-effect contract changes are proposed.
The result shows that more samples from the same mechanism mostly refine its
average bias; they cannot supply warning signals for a new regime or recover
missing/incomparable labels. Future work should be a separately preregistered
test of relevant variation or already-authorized observable signals, rather than
another increase in seed count presented as stronger real-world evidence.

Artifacts: [training report](evidence/synthetic-training-expansion-v1/training-report.json),
[test report](evidence/synthetic-training-expansion-v1/report.json), and compressed
training/test rows in that directory. Test report SHA-256:
`234bc4703db4811f5f9a9e6ece5ebfa5e1602e10820a8bdb9e84ec01b9266e66`.

```sh
node --test tests/synthetic-training-expansion.test.mjs
node tests/manual/generate-synthetic-training-expansion.mjs --check-training
node tests/manual/generate-synthetic-training-expansion.mjs --check
```

For a fresh experiment, `--train` writes only training/calibration. Commit and
verify those artifacts, then create the explicit freeze reference before `--test`.
Never reuse this now-inspected test set to tune another model and label it untouched.

Validation: 1,343 repository tests passed; targeted lint, TypeScript and the prior
group consumer verification passed. Seven new tests cover clock separation,
training-role guards, equal-history weighting, calibration rank/joint coverage,
support bounds and native missingness. All work is isolated from the Home/UI work.
Both training and test artifacts reproduced byte-for-byte. Independent review
recomputed every evaluated row and summary and verified all 18 implementation
hashes, artifact hashes, frozen Git contents and ancestry; no blocking defect was
found. The review agrees that the results support no automatic promotion.
