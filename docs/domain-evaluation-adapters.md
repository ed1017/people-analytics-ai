# Parallel domain qualification adapters

This branch starts at the preserved forecast-display head `91519b462f911f35ae7680033582f4e0aef1b4de`. Three independent workers own separate domain modules/tests. The adapters reuse the strict aggregate readiness validator and existing evaluators instead of introducing a generic model or expanding source access. They are offline and are not imported into Action Planning or the forecast UI.

The existing evidence checkpoint was rerun against the available local artifacts. All three actual-source domains remain blocked by `availability-unverified`, `completeness-unknown` and `no-available-history`; turnover additionally reports unknown observation times on the captured monthly records. Zero available *as-known* history rows does not mean the source has zero employees, exits, starts or responses. No fresh database query was made.

## Evidence strength and permitted output

| Domain | Available evidence | New adapter purpose | Remaining source gate |
|---|---|---|---|
| Turnover | Captured monthly voluntary counts; 32 event-bearing months after excluding Jan 2024's unverified joined zero. Existing fixed retrospective synthetic benchmark and separate constructed-vintage rolling-origin evaluator. | Check monthly scope/coverage/revisions; reuse the constructed-vintage evaluator without duplicating formulas. Keep its mechanics results separate from source qualification. | Scoped source completion and actual label observation/revision history, plus original generator lineage. Rates additionally need matched risk exposure and future denominator assumptions. |
| Hiring | Prior aggregate audit of dated openings/acceptances/recorded starts and immature cohorts. Existing hiring synthetic evaluation/reference code. | Preserve all-opening disposition counts and audit fixed follow-up maturity; summarize only explicitly conditional completed-start durations where supported. | One role's complete opening cohort, verified actual-start/status semantics, dated observation/revision history, and explicit follow-up/censoring scope. |
| Satisfaction | Prior inspected aggregate-view arithmetic and present wave/date/denominator fields. No qualified comparable source wave series. | Validate scoring-definition declarations, comparable wave versions and respondent coverage; no interpolated monthly targets. | Full instrument/item/scoring/eligibility definitions, complete comparable waves with actual availability/revisions, missingness and reviewed release protection. |

Turnover has the strongest **retrospective benchmark evidence**, not operational validation. Hiring has richer event semantics than a snapshot but unresolved-cohort and label-timing gaps prevent a defensible all-openings predictive evaluation. Satisfaction remains at metric/wave qualification. Their scores cannot be ranked on a shared accuracy scale because their outcomes, units, histories and qualification states differ.

All positive fixture results refer to separately constructed data only. A contract pass checks consistency of declarations; it cannot authenticate source truth, prove representative response/censoring, establish power or identify an intervention effect. No operational forecast, causal estimate, goal probability or calibrated interval is promoted by these adapters. The repeatedly inspected existing turnover assessment remains a retrospective final-data comparison, not an untouched holdout.

## Integration boundary

The modules accept explicit domain contracts supplied locally by an authorized caller. They do not fill missing timestamps or manufacture source completeness. Additional scoring/follow-up declarations are versioned evaluation metadata, not new employee features or a model-service input boundary. No automatic conversion of aggregate buckets into individual requisitions or respondents is permitted.

The original reports and generated display artifacts remain unchanged. Parent can review the isolated adapter branch while integrating the earlier forecast-display branch. The next source-evidence increment is still the original generator/run manifest or actual completeness/observation history described in `source-provenance-investigation.md`; a more elaborate model cannot substitute for those inputs.

## Adapter interfaces and limits

- `assessTurnoverDomain({ sourceContract, constructedSnapshots = null })` in `lib/ml/turnover-domain-adapter.mjs`: reconstructs monthly history through the existing validator, rejects duplicate/gapped months and incomplete month-end coverage, and preserves recorded zero and revision identity in an explicitly labeled audit view. `contractStatus` is passed/blocked; operational `status` is always unqualified. Optional five constructed snapshots delegate to the existing vintage evaluator in `mechanicsBenchmark`; they never replace or qualify the source contract. Coverage describes the selected date range only and cannot prove capture before/after it. Zero labels are named *recorded*, not independently confirmed.
- `evaluateHiringDomain(input, { horizonDays = 90, coverage = null })` in `lib/ml/hiring-domain-adapter.mjs`: reuses revision/as-of selection and checks an explicit all-openings declaration with `statusCoverageThrough`, `observedAt`, `populationVersion`, `sourceDefinitionVersion`, `evidenceRef` and `observationBasis`. Horizon must be fixed before outcome inspection. It separates mature/immature openings, starts by/after horizon, cancellations and unresolved cases. Completed-by-horizon mean duration and observed-start fraction are withheld if scope/availability fails; zero-day starts are distinct from unknown starts. `descriptive-contract-pass` permits only as-of description; `operationallyQualified` remains false and `forecastMetrics` null. The fraction includes cancelled/unresolved mature openings in its denominator; it is not a survival probability. No independent-censoring assumption, Kaplan–Meier estimator or all-openings predictive accuracy is asserted. The existing requisition-level hiring experiment is not called by silently expanding aggregate counts into invented cases.
- `satisfactionDomainEvidence(contract, scoreDefinition = null)` in `lib/ml/satisfaction-domain-adapter.mjs`: requires explicit `version`, `responseScale`, `favorableValues`, `respondentAggregation`, `missingItemPolicy`, `minimumAnsweredItems`, `itemWeighting`, `reverseItems`, `excludedItems` and `evidenceRef`. This bounded implementation supports mean respondent answered-item shares, answered-items-only handling, equal weighting and explicitly empty reverse/excluded-item lists. Other/missing rules block rather than being silently assumed. Rules must match the selected scoring version; duplicate/overlapping waves and inconsistent versions are blocked. Any blocker clears the released `waves` series. Scores remain distinct from participation; no pooling across waves, imputation, employee satisfaction classification, neutral/unfavorable complement or eNPS substitution is performed. `status` remains unqualified even when `contractStatus` passes. Raw-answer compliance and nonresponse representativeness cannot be proved from aggregates.

Typical source calls will omit unsupported coverage/scoring declarations rather than copy the fixture values. Complete fixture metadata is expressly simulated and only exercises the gates. For hiring, the default horizon is an explicit adapter setting, not an empirical choice validated on company outcomes; source work must predeclare the intended horizon and cohort scope.

## Local verification

Run the three domain suites alongside the unchanged validator/evidence suites:

```sh
node --test tests/turnover-domain-adapter.test.mjs tests/hiring-domain-adapter.test.mjs tests/satisfaction-domain-adapter.test.mjs
node tests/manual/predictive-evidence-checkpoint.mjs --check
node tests/manual/generate-forecast-consumer-view.mjs --check
```

Review strengthened three boundaries: renamed turnover zero coverage to avoid implying source confirmation; rejected malformed hiring input/coverage accessors before reads; required explicit survey weighting and reverse/excluded-item rules. Tests include true zeros, null preservation, exact horizon/cutoff boundaries, late revisions, missing/contradictory coverage, supported/unsupported scoring, suppression and source versus synthetic separation. No new fitted model or fresh company-data accuracy result is claimed.

Final combined verification: 33 new domain tests (turnover 8, hiring 12, satisfaction 13) and 1,053 repository tests passed. Targeted ESLint, full standalone TypeScript and both original artifact checks passed. This is an offline-only change, so no browser/build/deployment rerun was needed or claimed. No source/database/access mutations or production changes occurred.
