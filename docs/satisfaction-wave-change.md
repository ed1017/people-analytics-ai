# Observed satisfaction-wave change and nonresponse sensitivity

This checkpoint adds descriptive aggregate capability after
`9b800f5554d7e88f0bcaefa42c43153b428fb1c2`. It changes no original model reports,
source contracts, database, UI, or production path. Disabled eNPS remains unrelated.

## Source qualification and interface

The current local evidence checkpoint contains no qualified satisfaction-wave
extract: observation/completion history and supported scoring definitions remain
missing. Its actual satisfaction domain result remains blocked. The new report
retains those blockers and uses an explicitly constructed three-wave fixture for
numerical demonstration. Dates mirror October 2024, October 2025 and June 2026;
the values below are invented fixture inputs, **not source observations**.

Use `satisfactionWaveChange(contract, scoreDefinition, assumptions?)` from
`lib/ml/satisfaction-wave-change.mjs`. It calls `satisfactionDomainEvidence` on
the existing raw aggregate contract, reusing its as-of/revision selection,
denominator/scoring checks, instrument/item/population/eligibility comparability,
overlap checks and release restrictions. It accepts two or three comparable
observed waves only. Different pulse instruments block comparison rather than
being silently pooled or counted as another engagement wave. No monthly points,
annualization, fitted trend, forecast selection or calibrated intervals are added.

The result preserves the existing domain evidence in `source`. A passed descriptive
calculation does not upgrade `source.status` from unqualified or verify source
truth. Missing, suppressed, inconsistent or incomparable waves yield `unavailable`
with reasons and no wave/change arrays. `forecast`, `causalEffect`,
`confidenceInterval`, `withinPersonChange` and `compositionEffect` remain null.

## Exact interpretation

Let `m` be mean respondent favorable-answer share, `n` respondents, `N` eligible
employees, and `r=n/N`. `m` is not the percentage of employees who are satisfied.
Eligibility is the participation denominator; respondents are the score denominator.
Different eligible counts can occur under the same declared population definition.
Without matched respondents or verified strata, those changes cannot be separated
into within-person improvement and workforce-composition effects.

Each wave reports score, respondents, eligible population, nonrespondents,
participation and respondent contribution `q=r*m`. `q` is the observed respondent
share contribution to an all-eligible total; it is **not** the all-eligible score.
Adjacent waves report actual elapsed days (365 and 242 in the fixture), counts and
score/participation changes. No pooled respondent sample size is calculated.

The exact symmetric product decomposition is:

```text
Δq = average(r) × Δm + average(m) × Δr
```

These are arithmetic score and response-rate terms, not estimated effects or
causes. They sum to the change in respondent contribution, not automatically to
the change in all-eligible satisfaction. No unobserved composition term is invented.

If every eligible person has a comparable latent share in [0,1], and the unknown
nonrespondent mean `u` lies in an explicitly assumed range `[a,b]`, the eligible
mean lies in:

```text
[r*m + (1-r)*a, r*m + (1-r)*b]
```

The default is the full feasible range [0,1]. Change bounds are `[L_after-U_before,
U_after-L_before]`, allowing different nonrespondent means in the two waves. They
are worst-case identification bounds, not confidence intervals, forecasts or a
statement that all values are equally likely. They do not assume random response.
They also cannot address incomparable item scoring or item-level missingness.

Separate fixed-mean scenarios use `u=0,0.5,1` **held constant across waves**. Their
conditional eligible-mean change decomposes as:

```text
ΔeligibleMean(u) = average(r) × Δm + (average(m)-u) × Δr
```

These are user-reviewable assumptions, never filled-in employee answers. Optional
narrower ranges or up to five fixed means must be explicit, finite and in [0,1].
The supplied report also shows `[0,0.5]` as a stronger assumption, not evidence.
Zero nonresponse collapses bounds to the observed score; unknown scores do not
become zero. A zero-width bound is still not a calibrated interval.

## Constructed example

| Fixture wave | Respondent score | Respondents / eligible | Response rate | Unrestricted eligible-mean bounds |
|---|---:|---:|---:|---:|
| Oct 2024 | 75% | 80 / 100 | 80% | 60–80% |
| Oct 2025 | 80% | 60 / 100 | 60% | 48–88% |
| Jun 2026 | 78% | 90 / 120 | 75% | 58.5–83.5% |

| Adjacent change | Score change | Response-rate change | Score term | Coverage term | Contribution change | Unrestricted change bounds |
|---|---:|---:|---:|---:|---:|---:|
| Oct 2024 → Oct 2025 | +5 pp | −20 pp | +3.5 pp | −15.5 pp | −12 pp | −32 to +28 pp |
| Oct 2025 → Jun 2026 | −2 pp | +15 pp | −1.35 pp | +11.85 pp | +10.5 pp | −29.5 to +35.5 pp |

If nonrespondents instead have an assumed constant mean of 0.5, conditional
all-eligible changes are −2 pp and +3 pp. The first respondent-score increase
therefore does not establish population improvement. Both unrestricted change
bounds cross zero. The second period has 20 more eligible employees; no matched
person or composition-adjusted interpretation follows from this arithmetic.

## Reproduction and next source requirement

Run `node --test tests/satisfaction-wave-change.test.mjs` and
`node tests/manual/report-satisfaction-wave-change.mjs --check`. The report at
`docs/evidence/satisfaction-wave-change-v1.json` includes method/source hashes,
the actual source blockers, the fixture result, stronger-assumption sensitivity,
and blocked different-instrument/suppression examples. `--write` regenerates it.

Next obtain a valid **aggregate** extract for each comparable wave with versioned
population/eligibility, instrument/items/scoring and missing-item rules; respondent
share sum, respondent and eligible counts; wave closure and first-observed/revision
times; scoped completion; and reviewed release/complementary/query-set metadata.
The declared definitions must make the latent all-eligible score meaningful.
Existing declarations do not authenticate raw scoring or response representativeness.
No person-level access is required or authorized by this calculation.

With those inputs, observed changes and sensitivity bounds can be recomputed. A
matched-person/composition analysis would require different sufficient aggregate
evidence and a separately reviewed estimand; forecasting would require genuinely
additional comparable time observations and temporal evaluation. Three irregular
waves cannot supply that missing history.

Validation: all 1,120 repository tests passed, including 10 focused satisfaction
tests. The focused suite and new report check were repeated after final assumption
input hardening. TypeScript, focused ESLint, all unchanged hiring/forecast artifact
checks and whitespace checks passed. Independent mathematical/domain review found
no blocker; sparse-array and property-access concerns were addressed. Execution
availability was confirmed after a reported transport interruption, and no work
remained blocked by that notification.
