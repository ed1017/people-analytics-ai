# Captured aggregate readiness assessment

**Result:** local custody verification succeeds; source-based forecasting remains blocked for turnover, hiring and satisfaction. The required helper and inventory are complete. Further modeling cannot resolve the missing source evidence, and no operational qualification or uncertainty gate changes.

The completed inventory commit `5ae7251188a607f3debc129fcbced950590a399f` and helper commit `f7b134cb2b40f772cb1c6c4b1b69d158490f8ca2` were audited, pushed to their isolated branches and verified against the remote before this assessment. The helper's 11 tests passed again; prior full validation passed 1,307 tests, lint and TypeScript. Only the assessment documentation and JSON evidence are added here. Main, UI, database, security, held eNPS files, prior evidence and consumers remain unchanged.

## End-to-end result

The existing [aggregate fixture](../tests/fixtures/aggregate-exit-history.json) was read by the CLI, captured into a new local directory and verified from the written payload and sidecar. Capture time was `2026-10-06T00:04:56.093Z`; the earlier extraction date remains `2026-10-05`. Neither timestamp was substituted for historical source availability.

Exact payload SHA-256 remains `64acf5cbb0cddbaa0614e20ee3895cd026ebe3ec9c91fed622820b53b44d63cd`. The sidecar retains all 33 periods, January 2024 as an unknown count, 32 event-bearing count rows, declared-synthetic provenance and unknown observation basis. All source observation, revision-history and completion fields remain null. There are zero rows eligible for historical replay.

The [saved assessment](evidence/aggregate-custody-readiness-assessment-v1.json) contains the actual verified sidecar, input/code hashes, exact validator outputs and the two empty domain contracts. Hiring and satisfaction use the same unavailable-contract convention as the prior checkpoint: no qualified records were supplied, so none were invented. The turnover-rate check changes only the target of the same count contract; it does not fit a rate model.

| Target | Supplied records / historically available | Validator result | Precise minimum missing evidence |
| --- | ---: | --- | --- |
| **Turnover count** | 33 / 0 | Blocked: `availability-unknown`, `availability-unverified`, `completeness-unknown`, `no-available-history` | Actual first-known dates and preserved count/classification revisions at each origin; defined population and voluntary classification; independently supported monthly completion, including whether January is truly zero. Real-world claims additionally require established real source provenance. |
| **Turnover rate** | 33 / 0 | Same upstream blockers | All count requirements, plus matched measured risk population/person-time or justified average exposure, and a supported future-exposure basis. Month-end stock is insufficient. The identical reason list is not evidence that denominator checks passed: unavailable rows are excluded before domain-value assessment. |
| **Hiring: opening to actual start** | 0 / 0 | Blocked: `availability-unverified`, `completeness-unknown`, `no-available-history` | A populated approved aggregate opening cohort for one defined role/population, retaining unresolved, accepted, started, cancelled and no-show dispositions; actual versus planned stage definitions; first availability, revisions and cohort completion; a fixed maturity horizon or justified censoring treatment, with earlier training and later scoring cohorts. Completed starts alone are selected. Aggregate buckets require a reviewed adapter; no raw-person export is needed. Capacity-ready time would require its own observed target. |
| **Satisfaction: mean respondent favorable-answer share** | 0 / 0 | Blocked: `availability-unverified`, `completeness-unknown`, `no-available-history` | Comparable company-wide waves with population, instrument, scoring and eligibility versions; actual release/correction history and completion; favorable-share numerator and valid respondent denominator, separate eligible count for participation, missing/invalid/nonresponse accounting and reviewed suppression; enough completed comparable waves to set a chronological evaluation. Do not interpolate artificial monthly labels or use held exit eNPS. |

All four contracts are structurally `valid`; this is not data qualification. Forecast and causal eligibility are blocked, source truth remains unverified, and predictive/effect intervals and goal probabilities are null. A causal retention claim would additionally require an identification design and aligned intervention/comparison outcomes; ordinary forecast history cannot supply it.

## Remaining authorized work

No additional source queries, grants, credentials, raw exports, schema changes, historical records, model fits or synthetic experiments were used. The existing source declarations remain synthetic/unknown; the constructed simulations have not been substituted for company evidence.

The useful implementation supported by the present captured count data is now in place: preserve an authorized payload, validate its bounded aggregate shape, record capture custody and report readiness gaps. Additional generic storage or model complexity would not improve evidential readiness. A hiring/satisfaction aggregate importer is technically possible, but its target semantics and tested input mapping need a reviewed populated export first; implementing speculative adapters now would not remove the blockers.

The smallest meaningful next step is **source-evidence reconciliation**, beginning with one monthly count series or one approved company-wide survey wave: supply genuine first-availability/revision evidence and an independently supported completeness/definition record, or explicitly confirm that historical evidence cannot be recovered. Existing authorization must govern that work. If recovery is impossible, future authorized captures can establish a prospective series from the time actually captured; repeated packaging of the same static synthetic fixture creates no new observations. This report does not schedule capture or expand access.

## Verify the saved assessment

The helper [usage guide](aggregate-export-custody-v1.md) reproduces capture and verification. The saved capture can be checked against the unchanged tracked fixture without generating anything:

```sh
node --input-type=module - <<'JS'
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {verifyAggregateExport} from './lib/ml/aggregate-export-custody.mjs';
import {validatePredictiveReadiness} from './lib/ml/predictive-readiness.ts';
const report=JSON.parse(await readFile('docs/evidence/aggregate-custody-readiness-assessment-v1.json'));
const bytes=await readFile(report.inputFile);
assert.deepEqual(verifyAggregateExport(bytes,report.custody),report.verification);
for(const contract of Object.values(report.emptyDomainContracts)) {
  assert.equal(contract.records.length,0);
  assert.equal(validatePredictiveReadiness(contract).forecastEligibility.status,'blocked');
}
console.log('Saved custody verified; missing domain histories remain blocked.');
JS
```

Verification checks internal consistency and source-file identity; hashes do not authenticate original source truth. The assessment is a bounded qualification result, not a forecast benchmark.
