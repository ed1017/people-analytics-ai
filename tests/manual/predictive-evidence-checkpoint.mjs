// Offline checkpoint beside the existing preview generator. No credentials or external calls.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { validatePredictiveReadiness } from '../../lib/ml/predictive-readiness.ts';
import { evaluateAggregateExitDemo } from '../../lib/ml/aggregate-exit-forecast.ts';
import { evaluateTurnoverReadinessSnapshots } from '../../lib/ml/turnover-vintage-evaluation.mjs';
import { generateTurnoverVintages } from '../fixtures/turnover-vintage-generator.mjs';
import { exitDemoPresentation } from './generate-exit-demo-presentation.mjs';
const root = new URL('../../', import.meta.url);
const paths = ['tests/fixtures/aggregate-exit-history.json', 'lib/ml/aggregate-exit-forecast.ts', 'lib/ml/predictive-readiness.ts', 'lib/ml/turnover-vintage-evaluation.mjs', 'tests/fixtures/turnover-vintage-generator.mjs', 'tests/manual/predictive-evidence-checkpoint.mjs', 'tests/manual/generate-exit-demo-presentation.mjs', 'docs/predictive-readiness-proposal.md'];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function unavailableContract(domain, cutoff) {
  return { schemaVersion: 1, cutoff, manifest: { dataClass: 'company-extract', observationBasis: 'unknown', generatorVersion: null, generatedAt: null, sourceEvidence: 'prior-local-audit-only', sourceDefinitionVersion: 'unverified', populationVersion: 'unverified', metricVersion: 'unverified', completion: null },
    target: { domain, measure: { turnover: 'voluntary-count', satisfaction: 'mean-respondent-favorable-answer-share', hiring: 'opening-to-actual-start' }[domain], cadence: { turnover: 'monthly', satisfaction: 'observed-waves', hiring: 'opening-cohorts' }[domain] }, records: [], study: null, groups: [] };
}
export async function evidenceCheckpoint() {
  const contents = await Promise.all(paths.map(path => readFile(new URL(path, root))));
  const dataset = JSON.parse(contents[0].toString('utf8'));
  // Existing strict evaluator validates the captured source contract first.
  const retrospective = evaluateAggregateExitDemo(dataset), preview = await exitDemoPresentation();
  const sourceContract = unavailableContract('turnover', '2026-07-01T00:00:00.000Z');
  sourceContract.manifest.sourceDefinitionVersion = dataset.manifest.sourceDefinitionVersion;
  sourceContract.manifest.populationVersion = 'all-recorded-voluntary-separations';
  sourceContract.manifest.metricVersion = 'monthly-voluntary-count';
  sourceContract.records = dataset.months.map(row => ({ recordKey: `aggregate-${row.month}`, revision: 1, supersedes: null,
    effectiveAt: row.snapshotDate + 'T00:00:00.000Z', observedAt: null,
    populationVersion: sourceContract.manifest.populationVersion, metricVersion: sourceContract.manifest.metricVersion,
    value: { period: row.month, voluntaryExits: row.totalExits === 0 ? null : row.voluntaryExits, countStatus: row.totalExits === 0 ? 'unknown' : 'recorded', exposure: null } }));
  const summarize = contract => {
    const result = validatePredictiveReadiness(contract);
    return { inputStatus: result.inputStatus, forecast: result.forecastEligibility, causalEffect: result.causalEffectEligibility,
      availableHistoryRows: result.history.length, sourceTruthVerified: result.sourceTruthVerified };
  };
  const snapshots = generateTurnoverVintages();
  return {
    schemaVersion: 1, status: 'offline-evidence-checkpoint', operationallyValidated: false,
    files: Object.fromEntries(paths.map((path, i) => [path, digest(contents[i])])),
    sourceEvidence: {
      basis: 'Existing local audits and captured aggregates only; no fresh database access.',
      turnover: { originalDataClass: dataset.manifest.provenance, readinessAdapterClass: 'company-extract means an existing source extract, not verified real-world data', manifest: dataset.manifest,
        checks: summarize(sourceContract), minimumMissingInputs: ['Versioned population and monthly count definitions; reconcile every month, including event-empty months, against scoped source completion evidence.', 'Actual first-observed timestamps, revision predecessors and recorded corrections for every monthly label; event and bulk insertion dates are not substitutes.', 'Completion declarations with population, covered period, actual observation time and evidence reference at every forecast origin and scoring cutoff.', 'Generator/version lineage if asserting synthetic completeness. Person-time at risk plus explicit future exposure assumptions before rates.'] },
      satisfaction: { checks: summarize(unavailableContract('satisfaction', sourceContract.cutoff)),
        minimumMissingInputs: ['Comparable observed waves with versioned population, eligibility, instrument/items and scoring rules; no interpolated monthly targets.', 'Mean respondent favorable-answer share with valid respondent denominator, eligible population for participation, and missing/nonresponse counts.', 'Wave closure, actual observation/revision times, scoped completion, and reviewed cell/complementary/query-set suppression status.'] },
      hiring: { checks: summarize(unavailableContract('hiring', sourceContract.cutoff)),
        minimumMissingInputs: ['One role/population with every opening retained, including open, cancelled and no-show dispositions; maturity/censoring at the scoring cutoff.', 'Separate opening, accepted-offer, actual-start and capacity-ready definitions; no hire or planned-start substitution.', 'Actual first-observed stage/status/revision times, opening-known features only, scoped cohort completion and a common fixed follow-up horizon or censoring-aware estimator.'] },
      effects: { status: 'unavailable', minimumMissingInputs: ['Dated intervention assignment and intended comparison design, eligible/assigned/exposed units, and aligned outcome observations in both arms.', 'Pre-outcome design/adjustment history, adherence, missing follow-up and contamination, with identification and independent-unit uncertainty analysis. Ordinary forecasts supply none of these.'] },
    },
    existingPreviewBenchmark: {
      status: retrospective.status, dataClass: dataset.manifest.provenance, qualification: retrospective.qualification,
      protocol: retrospective.protocol, datasetFingerprint: retrospective.datasetFingerprint, protocolFingerprint: retrospective.protocolFingerprint,
      development: retrospective.development, assessment: retrospective.holdout, selection: retrospective.selection,
      previewAgreement: { selectedMethod: preview.selectedMethod === retrospective.selection.method,
        protocolFingerprint: preview.identities.protocolFingerprint === retrospective.protocolFingerprint },
      limitations: ['Final-data retrospective benchmark only; historical label availability and completeness are unverified.', 'The assessment was visible during qualification and previous iterations; it is not untouched or confirmatory.', 'Overlapping development folds have nine errors but only five distinct target months.', 'No real-world predictive validation, rates, causal effects or calibrated intervals.'],
    },
    constructedVintageEvaluation: { generatorVersion: snapshots[0].manifest.generatorVersion, generatedAt: snapshots[0].manifest.generatedAt,
      inputFingerprint: digest(JSON.stringify(snapshots)), ...evaluateTurnoverReadinessSnapshots(snapshots) },
  };
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const mode = process.argv[2] ?? '--stdout';
  if (process.argv.length > 3 || !['--stdout', '--write', '--check'].includes(mode)) throw Error('Use --stdout, --write or --check only; no source overrides.');
  const content = JSON.stringify(await evidenceCheckpoint(), null, 2) + '\n';
  const destination = new URL('docs/evidence/predictive-evidence-checkpoint.json', root);
  if (mode === '--stdout') process.stdout.write(content);
  else if (mode === '--write') await writeFile(destination, content);
  else if (await readFile(destination, 'utf8') !== content) throw Error('Checkpoint differs from tracked reproducible evidence.');
}
