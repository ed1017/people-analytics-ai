import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {qualifySwpHistory, swpBacktestWindows} from '../../lib/swp-history-qualification.ts';
import {protocol, evaluate, select} from './baselines.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const save = (path, value) => {
  if (existsSync(path)) throw Error(`Refusing to overwrite ${path}`);
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
};
const [phase, input, frozenPath, output] = process.argv.slice(2);
if (!['develop', 'holdout'].includes(phase) || !input || !frozenPath) throw Error('Usage: node run.mjs develop development-history.json frozen.json | holdout holdout.json frozen.json results.json');
const frozenMonths = Array.from({length: 33}, (_, i) => new Date(Date.UTC(2024, i, 1)).toISOString().slice(0, 7));
const windows = swpBacktestWindows(frozenMonths, 12, 6, 6);
if (phase === 'develop') {
  // This input physically contains only the first 27 observations. No holdout file is opened.
  const history = read(input);
  if (history.scope.dimension !== 'company' || history.metric.kind !== 'headcount' || JSON.stringify(history.points.map(p => p.month)) !== JSON.stringify(frozenMonths.slice(0, 27))) throw Error('Expected qualified company headcount January 2024–March 2026 only.');
  const qualification = qualifySwpHistory(history);
  if (!qualification.conditionalRetrospectiveEligible) throw Error(`History blocked: ${qualification.reasons.join(', ')}`);
  const development = evaluate(history.points, windows.development);
  const selected = select(development);
  save(frozenPath, {protocol, protocolHash: hash(protocol), inputHash: hash(history), history,
    selected, development, windows, frozenAt: new Date().toISOString(),
    limitations: ['Synthetic source; final-data retrospective only.', 'Completion and origin vintages unknown.', 'Overlapping origins are correlated; 60 forecast errors are not 60 independent samples.', 'Only 12–21 training months at development origins; annual seasonality has limited support.', 'No cost, subgroup, interval or operational forecast.']});
  console.log(JSON.stringify({selected, development: Object.fromEntries(Object.entries(development).map(([m, r]) => [m, r.overall])), frozenPath}, null, 2));
} else {
  if (!output) throw Error('Holdout results path required.');
  const frozen = read(frozenPath);
  if (frozen.protocolHash !== hash(protocol) || hash(frozen.protocol) !== hash(protocol) || frozen.inputHash !== hash(frozen.history) || JSON.stringify(frozen.windows) !== JSON.stringify(windows)) throw Error('Frozen protocol/input/windows mismatch.');
  const reproduced = evaluate(frozen.history.points, windows.development);
  if (JSON.stringify(reproduced) !== JSON.stringify(frozen.development) || select(reproduced) !== frozen.selected) throw Error('Frozen selection not reproducible.');
  const holdout = read(input);
  if (holdout.sourceId !== frozen.history.sourceId || holdout.sourceVersion !== frozen.history.sourceVersion || JSON.stringify(holdout.points.map(p => p.month)) !== JSON.stringify(frozenMonths.slice(27))) throw Error('Holdout identity/calendar mismatch.');
  const full = {...frozen.history, points: [...frozen.history.points, ...holdout.points]};
  const qualification = qualifySwpHistory(full);
  if (!qualification.conditionalRetrospectiveEligible) throw Error('Combined history blocked.');
  const results = evaluate(full.points, [windows.holdout]);
  const chosen = frozen.development[frozen.selected], naive = frozen.development['last-value'];
  const wins = chosen.byOrigin.filter((r, i) => r.mae < naive.byOrigin[i].mae).length;
  const improvement = naive.overall.mae === 0 ? null : 1 - chosen.overall.mae / naive.overall.mae;
  const furtherWork = improvement !== null && improvement >= 0.1 && wins >= 6 && results[frozen.selected].overall.mae <= results['last-value'].overall.mae;
  save(output, {classification: protocol.classification, frozenHash: hash(frozen), holdoutHash: hash(holdout), selected: frozen.selected,
    holdout: results, developmentImprovementOverLastValue: improvement, developmentOriginWins: wins,
    exploratoryFurtherWorkCriterionMet: furtherWork, operationalForecastAvailable: false, intervalAvailable: false,
    limitations: frozen.limitations});
  console.log(JSON.stringify({selected: frozen.selected, holdout: Object.fromEntries(Object.entries(results).map(([m, r]) => [m, r.overall])), improvement, wins, furtherWork}, null, 2));
}
