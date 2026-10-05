import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {hiringScenarios} from '../fixtures/hiring-cohort-generator.mjs';
import {hiringSelectionFixture,selectionGeneratorVersion} from '../fixtures/hiring-selection-generator.mjs';
import {hiringBenchmarkFold} from './benchmark-hiring-cohorts.mjs';
import {hiringTrainingCohorts} from '../../lib/ml/hiring-cohort-model.mjs';
import {hiringSelectionProtocol as protocol,prepareSelectedHiringForecast,scoreSelectedHiringForecast} from '../../lib/ml/hiring-model-selection.mjs';
export const validationFolds=(scenario,seed)=>protocol.validationOrigins.map(origin=>hiringBenchmarkFold(scenario,seed,origin));
export function selectionCase(scenario,seed){
 const folds=validationFolds(scenario,seed),snapshot=hiringSelectionFixture(scenario,seed,protocol.origin);
 const prepared=prepareSelectedHiringForecast(snapshot,folds);
 if(prepared.status!=='experimental-synthetic-only')throw Error(prepared.reason);
 // This is the first read of test outcomes. Selection and fit are already frozen.
 const test=hiringSelectionFixture(scenario,seed,protocol.scoreThrough);
 const actual=hiringTrainingCohorts(test.input,test.coverage).filter(r=>protocol.testMonths.includes(r.month));
 return {scenario,seed,prepared,actual,assessment:scoreSelectedHiringForecast(prepared,actual)};
}
export function supportStressCases(){
 const folds=validationFolds('gradual-improvement',17);
 const changes={
  'short-history':s=>s.input.records=s.input.records.filter(r=>r.effectiveAt>='2024-01'),
  'sparse-calendar':s=>s.input.records=s.input.records.filter(r=>!r.effectiveAt.startsWith('2023-06')),
  'small-cohort':s=>s.input.records.filter(r=>r.effectiveAt.startsWith('2023-06')).forEach(r=>r.value.count=1),
  'censored-followup':s=>s.coverage.statusCoverageThrough='2025-06-01T00:00:00.000Z',
  'partial-cohort-release':s=>s.input.records[0].observedAt='2025-07-02T00:00:00.000Z',
  'stale-history':s=>s.input.records=s.input.records.filter(r=>!r.effectiveAt.startsWith('2025-03')),
  'rare-outcome':s=>s.input.records.forEach(r=>Object.assign(r.value,{status:'open',actualStartAt:null,startObservedAt:null})),
 };
 return Object.entries(changes).map(([name,change])=>{
  const snapshot=hiringSelectionFixture('gradual-improvement',17,protocol.origin);change(snapshot);
  return {name,result:prepareSelectedHiringForecast(snapshot,folds)};
 });
}
export async function benchmarkHiringSelection(){
 const paths=['docs/hiring-selection-protocol.md','lib/ml/hiring-model-selection.mjs','lib/ml/hiring-cohort-model.mjs',
  'lib/ml/hiring-domain-adapter.mjs','lib/ml/predictive-readiness.ts','tests/fixtures/hiring-selection-generator.mjs',
  'tests/fixtures/hiring-cohort-generator.mjs','tests/fixtures/predictive-readiness.mjs',
  'tests/manual/benchmark-hiring-selection.mjs','tests/manual/benchmark-hiring-cohorts.mjs'];
 const hashes=await Promise.all(paths.map(async path=>[path,createHash('sha256').update(await readFile(new URL('../../'+path,import.meta.url))).digest('hex')]));
 const cases=hiringScenarios.flatMap(scenario=>[17,29,43].map(seed=>selectionCase(scenario,seed)));
 const summary=hiringScenarios.map(scenario=>{
  const rows=cases.filter(c=>c.scenario===scenario);
  const metrics=Object.fromEntries(['recent','logistic','selected'].map(method=>[method,Object.fromEntries(
   ['brier','logLoss','weightedMaePercentagePoints','biasPercentagePoints'].map(metric=>[metric,rows.reduce((sum,r)=>sum+r.assessment.metrics[method][metric],0)/rows.length]))]));
  return {scenario,metrics,selectedLogisticSeeds:rows.filter(r=>r.prepared.selection.method==='logistic-trend').map(r=>r.seed),
   losesToRecentSeeds:rows.filter(r=>r.assessment.selectedMinusRecentBrier>0).map(r=>r.seed),
   losesToLogisticSeeds:rows.filter(r=>r.assessment.selectedMinusLogisticBrier>0).map(r=>r.seed)};
 });
 return {status:'constructed-synthetic-selection-benchmark',protocol,protocolFrozenCommit:'a62e6b1',generatorVersion:selectionGeneratorVersion,
  operationallyQualified:false,interval:null,causalEffect:null,files:Object.fromEntries(hashes),cases,summary,supportStress:supportStressCases(),
  limitations:['Rule informed by inspected prior benchmark; later synthetic test values were not used to tune it.',
   'Three seeds share one planted generator; no real-world calibration, significance, source qualification or causal inference.',
   'Support thresholds are experiment abstention rules, not statistical sufficiency or privacy certification. No subgroup prediction release.']};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const mode=process.argv[2]??'--check';if(process.argv.length>3||!['--check','--write'].includes(mode))throw Error('Use --check or --write.');
 const text=JSON.stringify(await benchmarkHiringSelection(),null,2)+'\n',file=new URL('../../docs/evidence/hiring-selection-benchmark-v1.json',import.meta.url);
 if(mode==='--write')await writeFile(file,text);else if(await readFile(file,'utf8')!==text)throw Error('Selection benchmark differs.');
 console.log('Synthetic hiring selection benchmark '+(mode==='--write'?'written.':'verified.'));
}
