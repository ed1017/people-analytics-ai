import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {hiringCohortFixture,hiringGeneratorVersion,hiringScenarios} from '../fixtures/hiring-cohort-generator.mjs';
import {hiringModelProtocol,hiringTrainingCohorts,fitHiringCohorts,predictHiringCohorts,scoreHiringCohorts} from '../../lib/ml/hiring-cohort-model.mjs';
const date=(origin,offset)=>{const d=new Date(origin);d.setUTCMonth(d.getUTCMonth()+offset);return d.toISOString();};
export function hiringBenchmarkFold(scenario,seed,origin){
 const training=hiringCohortFixture(scenario,seed,date(origin,0));
 const rows=hiringTrainingCohorts(training.input,training.coverage),model=fitHiringCohorts(rows);
 const months=Array.from({length:3},(_,i)=>date(origin,i).slice(0,7));
 // Fit and predict before retrieving the scoring snapshot. No scoring labels in model inputs.
 const predictions=predictHiringCohorts(model,months);
 const scoring=hiringCohortFixture(scenario,seed,date(origin,6));
 const actual=hiringTrainingCohorts(scoring.input,scoring.coverage).filter(row=>months.includes(row.month));
 return {origin,scoreThrough:date(origin,6),model,predictions,actual,metrics:scoreHiringCohorts(actual,predictions)};
}
export async function benchmarkHiringCohorts(){
 const paths=['lib/ml/hiring-cohort-model.mjs','lib/ml/hiring-domain-adapter.mjs','lib/ml/predictive-readiness.ts',
  'tests/fixtures/hiring-cohort-generator.mjs','tests/fixtures/predictive-readiness.mjs','tests/manual/benchmark-hiring-cohorts.mjs'];
 const hashes=await Promise.all(paths.map(async path=>[path,createHash('sha256').update(await readFile(new URL('../../'+path,import.meta.url))).digest('hex')]));
 return {status:'constructed-synthetic-model-benchmark',operationallyQualified:false,causalEffect:null,
  target:'Actual start within 90 days of opening, among all openings in each mature constructed monthly cohort',
  generatorVersion:hiringGeneratorVersion,seeds:[17,29,43],protocol:hiringModelProtocol,files:Object.fromEntries(hashes),
  uncertainty:{interval:null,reason:'No independent calibration or validated stochastic source model; fitted fractions are not calibrated operational probabilities.'},
  cases:hiringScenarios.flatMap(scenario=>[17,29,43].map(seed=>{
   const development=hiringModelProtocol.developmentOrigins.map(origin=>hiringBenchmarkFold(scenario,seed,origin));
   return {scenario,seed,development,developmentMetrics:scoreHiringCohorts(development.flatMap(f=>f.actual),development.flatMap(f=>f.predictions)),
    assessment:hiringBenchmarkFold(scenario,seed,hiringModelProtocol.assessmentOrigin)};
  })),limitations:['Fully constructed and inspectable fixtures, not recovered company outcomes or an untouched real-world test.',
   'Calendar drift is a planted scenario; trend performance is not evidence of a real hiring mechanism.',
   'Cancelled and unresolved openings at day 90 remain denominator failures for this fixed endpoint, not permanent non-hires.',
   'No time-to-start distribution, capacity forecast, person score, causal effect, or operational interval.']};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const mode=process.argv[2]??'--check';if(process.argv.length>3||!['--check','--write'].includes(mode))throw Error('Use --check or --write.');
 const text=JSON.stringify(await benchmarkHiringCohorts(),null,2)+'\n',file=new URL('../../docs/evidence/hiring-cohort-benchmark-v1.json',import.meta.url);
 if(mode==='--write')await writeFile(file,text);else if(await readFile(file,'utf8')!==text)throw Error('Benchmark artifact differs.');
 console.log('Constructed hiring benchmark '+(mode==='--write'?'written.':'verified.'));
}
