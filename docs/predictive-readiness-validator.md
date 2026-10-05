# Local predictive-readiness contract validator

`validatePredictiveReadiness(unknown)` in `lib/ml/predictive-readiness.ts` is pure, has no imports or I/O, and returns separate `forecastEligibility` and `causalEffectEligibility` results. It runs locally against declared aggregate inputs; no database, migration, model, UI, deployment or source-access changes are included.

Run with Node 24:

```sh
node --test tests/predictive-readiness.test.mjs
```

The suite implements the local mechanics of all 25 [acceptance IDs](../tests/contracts/predictive-readiness.proposed.json), plus robustness checks. Fixtures are generated independently of company data, labeled `constructed-synthetic`, and pinned to generator version `readiness-fixtures-v1`, seed 42 and an explicit generation timestamp. Historical observation and completion timestamps in these fixtures are simulated, never recovered source evidence.

## Meaning of results

`contract-pass` means declared input fields are internally consistent enough for further evaluation. It does **not** mean a forecast or causal estimate is ready. Even a pass returns `sourceTruthVerified`, `modelAdequacyAssessed`, `forecastingPerformanceValidated` and `causalEffectValidated` as false. All prediction/effect intervals and goal-attainment probabilities are null. A single eligible history record can pass this structural layer; sample-size adequacy, horizon support and model diagnostics belong to subsequent evaluation.

`blocked` carries sorted, deduplicated reasons. Malformed input yields `inputStatus: invalid`, blocks both eligibility paths and returns no history. Results are deeply frozen and input is not mutated. Unknown fields, arbitrary feature bags, nonfinite counts, accessors, duplicate revision identities and broken revision chains fail closed. Inputs are bounded to 500 records/groups, and count-like numeric fields to one million.

Examples exercised by the suite:

| Declared input | Forecast contract | Effect contract |
|---|---|---|
| Complete synthetic count of zero, known availability | Pass; retain zero | Block: `missing-comparison-design` |
| Missing observation time or completion evidence | Block: `availability-unknown` or `completeness-unknown` | Completion absence also blocks effects |
| Valid count with month-end stock as rate exposure | Count may pass; rate blocks: `exposure-mismatch` | Evaluated separately |
| Generated randomized comparison with complete assigned follow-up | Evaluated separately | Contract pass only; efficacy remains unvalidated |
| Assigned nonparticipants with missing follow-up | Evaluated separately | Block: `effect-followup-incomplete`; retain assigned totals and missing count |
| Generated timestamps attached to a company extract | Block: `fabricated-historical-availability` | Same provenance block |

## Input adapter contract

This is a small camelCase adapter for the proposed logical contracts, **not** a database schema implementation. Exact runnable shapes are in `tests/fixtures/predictive-readiness.mjs`.

- Root: schema version 1, inclusive UTC `cutoff`, `manifest`, `target`, revisioned `records`, nullable `study`, and aggregate `groups`.
- Manifest: data class, simulated/source-evidenced/unknown observation basis, generator metadata, source evidence reference, versioned source/population/metric definitions, and optional scoped completion declaration. Missing, unknown, mismatched or late completion is blocked. References and declarations are not authenticated.
- History envelope: aggregate key, revision, predecessor, effective and observed timestamps, population/metric versions, and domain value. Unknown availability blocks reconstruction. Only revisions known at cutoff are selected. Future revision payloads are excluded before reading their values.
- Turnover: monthly voluntary count, recorded/unknown/suppressed status, optional exposure declaration. A rate requires positive person-days for the matching population/period and an explicit positive future-exposure scenario. No rate or forecast is computed. Headcount stock never substitutes for person-time.
- Satisfaction: wave, instrument/items/scoring/eligibility versions; respondent-share mean and share sum; respondent and eligible counts; wave dates and release declarations. Participation and mean favorable-answer share use different denominators. No employee satisfaction classification, unfavorable complement or monthly interpolation is inferred. Independent exit eNPS is blocked.
- Hiring: **aggregate buckets** with a count and common stage timing/status, not person or candidate records. Accepted offer, hire, planned start, actual start and capacity are separate fields. Only observed events known at cutoff can supply durations. Unknown/open/cancelled starts remain unresolved; capacity is never inferred. The only supported opening feature is opening month.
- Effects: a declared study with assignment/design timing, contrast and diagnostic declarations; aggregate independent-unit pre/post rows with assigned, exposed and observed counts. Repeated rows do not increase independent-unit count. Nonadherents remain assigned. Missing follow-up blocks effects. Overlapping benefits cannot be summed. Observational designs always remain blocked pending identification review, regardless of favorable diagnostic declarations.

## Explicit limits and remaining work

C02 and G02 verify that changing excluded future outcomes or an external ground-truth sidecar cannot change selected development history. They cannot verify fitted predictions, model selection or untouched holdout behavior because this module performs no fitting. Extra ground-truth/prediction fields inside the declared input boundary are rejected. Future envelope metadata is still structurally checked.

G03 is a small reproducible fixture generator with zero, adverse and delayed effect mechanisms, nonadherence, missing follow-up, unresolved hiring and late revisions. Its ground truth is separate from validator inputs. It is not a validated workforce simulator or proof of realistic statistical behavior. No predictions are fabricated by adding selected errors to labels.

Survey suppression relies on explicit release/query-set review and reconstructibility declarations; this module cannot discover reconstruction attacks across actual external queries. Withheld cells redact the metric, respondents, eligible total and participation. A passing release declaration is not a privacy approval. Version checks cannot establish scoring correctness or nonresponse representativeness.

The study checks are a conservative minimal design gate. Two units per arm is only a minimum contract rule, not sufficient power or reliable uncertainty. There is no estimator, balance test, cluster adjustment, study-revision reconstruction, attrition correction or causal-identification proof. Source completion declarations do not prove that absent months, waves, openings or study units were captured. Domain-specific reconciliation and revision capture remain necessary before analysis.

The existing disabled eNPS gate and held SQL/contract artifacts are untouched. No UI integration is proposed by this local validation slice. A later integration should consume the separate eligibility results and preserve blocked reasons, while adding independently qualified source adapters and model evaluation.
