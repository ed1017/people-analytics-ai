import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {generateWorkforceCase,replaySynthetic} from '../../lib/ml/synthetic-workforce/pipeline.mjs';
import {canonical,digest,monthAdd,monthEnd} from '../../lib/ml/synthetic-workforce/common.mjs';
import {forecastTurnover,scoreTurnover} from '../../lib/ml/synthetic-domain-predictions/turnover.mjs';
import {forecastHiring,scoreHiring} from '../../lib/ml/synthetic-domain-predictions/hiring.mjs';
import {forecastSatisfaction,scoreSatisfaction} from '../../lib/ml/synthetic-domain-predictions/satisfaction.mjs';
const root=new URL('../../',import.meta.url),dir=new URL('docs/evidence/synthetic-domain-predictions-v1/',root);
const protocol=JSON.parse(await readFile(new URL('lib/ml/synthetic-domain-predictions/protocol.json',root)));
const base=JSON.parse(await readFile(new URL('lib/ml/synthetic-workforce/protocol.json',root)));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const domains={turnover:[forecastTurnover,scoreTurnover],hiring:[forecastHiring,scoreHiring],satisfaction:[forecastSatisfaction,scoreSatisfaction]};
const implementationPaths=['lib/ml/synthetic-workforce/protocol.json',...['common','pipeline','hiring','turnover','satisfaction'].map(n=>`lib/ml/synthetic-workforce/${n}.mjs`),
  'lib/ml/hiring-cohort-model.mjs','lib/ml/hiring-domain-adapter.mjs','lib/ml/predictive-readiness.ts',...['boundary','turnover','hiring','satisfaction'].map(n=>`lib/ml/synthetic-domain-predictions/${n}.mjs`),
  'lib/ml/synthetic-domain-predictions/protocol.json','tests/manual/generate-synthetic-domain-predictions.mjs'];
function evaluate(result,origin,months) {
  return Object.entries(domains).map(([domain,[forecast,score]])=>{
    const releases=result.domains[domain].releases;
    const snapshot=replaySynthetic(domain,releases,origin);
    const targets=domain==='satisfaction'?[months.at(-1)]:months;
    const prediction=forecast(snapshot,targets);
    // Target periods/cohorts in the reserve quarter are excluded. A Q3 hiring cohort's
    // required 90-day follow-up can overlap Q4 calendar dates; see protocol clarifications.
    const labelSnapshot=replaySynthetic(domain,releases.filter(row=>row.effectiveAt<=monthEnd(months.at(-1))),protocol.scoringCutoff);
    const scoring=prediction.status==='predicted'?score(labelSnapshot,prediction.predictions):{status:'blocked',reasons:['forecast-abstained'],methods:{}};
    return {domain,origin,months:targets,inputSha256:digest(snapshot),prediction,scoring};
  });
}
function summaries(rows) {
  return ['training','test'].flatMap(stage=>protocol.families.flatMap(family=>Object.keys(domains).map(domain=>{
    const subset=rows.filter(row=>row.stage===stage&&row.family===family&&row.domain===domain),scored=subset.filter(row=>row.scoring.status==='scored');
    const metricMaps=scored.map(row=>row.scoring.methods??row.scoring.metrics);
    const methods=Object.fromEntries((protocol[domain].methods).map(method=>{
      const values=metricMaps.map(map=>map[method]);
      const keys=Object.keys(values[0]??{}).filter(key=>typeof values[0][key]==='number');
      return [method,values.length?Object.fromEntries(keys.map(key=>[key,values.reduce((sum,value)=>sum+value[key],0)/values.length])):null];
    }));
    return {stage,family,domain,cases:subset.length,predicted:subset.filter(row=>row.prediction.status==='predicted').length,scored:scored.length,
      blocked:subset.filter(row=>row.scoring.status!=='scored').map(row=>({seed:row.seed,origin:row.origin,reasons:[...row.prediction.reasons,...row.scoring.reasons]})),
      aggregation:'Equal-case arithmetic mean of each metric; mean RMSE is not pooled RMSE. Hiring metrics are opening-weighted within each case.',methods};
  })));
}
export async function runDomainPredictions(mode,{onProgress=()=>{}}={}) {
  assert(['--write','--check'].includes(mode));
  assert(!protocol.trainingSeeds.some(seed=>protocol.testSeeds.includes(seed)));
  const rows=[],fingerprints=[];let demo=null;
  for(const stage of ['training','test'])for(const family of protocol.families)for(const seed of protocol[stage==='training'?'trainingSeeds':'testSeeds']){
    const config={...base,seeds:protocol[stage==='training'?'trainingSeeds':'testSeeds']};
    const result=generateWorkforceCase(config,{seed,family});
    const origins=stage==='training'?protocol.trainingOrigins:[protocol.testOrigin];
    for(const origin of origins){
      const months=Array.from({length:3},(_,i)=>monthAdd(origin.slice(0,7),i+1));
      rows.push(...evaluate(result,origin,months).map(row=>({stage,family,seed,...row})));
    }
    fingerprints.push({stage,family,seed,releasedAssessmentInputs:Object.fromEntries(Object.keys(domains).map(domain=>[domain,digest(replaySynthetic(domain,result.domains[domain].releases,protocol.testOrigin))]))});
    if(stage==='test'&&seed===protocol.demoSeed&&family===protocol.demoFamily)demo={seed,family,origin:protocol.demoOrigin,
      domains:Object.fromEntries(Object.entries(domains).map(([domain,[forecast]])=>[domain,forecast(replaySynthetic(domain,result.domains[domain].releases,protocol.demoOrigin),domain==='satisfaction'?[protocol.demoMonths.at(-1)]:protocol.demoMonths)])),
      label:'Constructed synthetic demonstration; candidates are unselected, intervals unavailable.',reserveQuarterScore:null,operationallyQualified:false};
    onProgress({stage,family,seed});
  }
  const evidence=gzipSync(Buffer.from(canonical({rows,fingerprints})+'\n'),{level:9});
  const implementationFiles=Object.fromEntries(await Promise.all(implementationPaths.map(async path=>[path,sha(await readFile(new URL(path,root)))])));
  const report={version:protocol.version,protocol,protocolFrozenCommit:'113971aef92d391ab25ce1ead7af373c234e02fc',implementationFiles,
    protocolClarifications:[
      'The frozen reserve wording refers to target periods/cohorts: no October–December turnover counts, opening cohorts or survey waves are scored. July–September hiring cohorts require 90-day follow-up that overlaps October–December calendar dates. Reserve calendar events are therefore not wholly untouched.',
      'Stationary denotes a stable generating mechanism, not stationary turnover counts: changing stock and seasonality create count signal. Stationary hiring fractions and survey scores have no expected trend. Earlier paired-prefix turnover controls separately test a shock with no pre-origin signal.',
      'An existing hiring optimizer failed during training before test evaluation. Commit 279c9e4d4125550bc6656336cea269dde76037f9 converts only its known numerical failures to case abstention; optimizer settings and candidates were not changed.'
    ],
    dataClass:'constructed-synthetic',observationBasis:'simulated',operationallyQualified:false,realWorldPerformanceValidated:false,
    custody:'Protocol committed before generation; no independent blinding. Fixed methods are fitted only to each origin history; no fitting or method selection across assessment outcomes.',
    historyCases:fingerprints.length,evaluationRows:rows.length,summaries:summaries(rows),demo,
    artifacts:{'scores.json.gz':{sha256:sha(evidence),bytes:evidence.length}},interval:null,causalEffect:null,rateForecast:null,reserveQuarterScore:null};
  const files=new Map([['scores.json.gz',evidence],['report.json',Buffer.from(JSON.stringify(report,null,2)+'\n')]]);
  if(mode==='--write')await mkdir(dir,{recursive:true});
  for(const [path,bytes]of files){if(mode==='--check')assert.deepEqual(await readFile(new URL(path,dir)),bytes,`Stale ${path}`);else await writeFile(new URL(path,dir),bytes);}
  return {status:mode==='--check'?'verified':'written',historyCases:fingerprints.length,evaluationRows:rows.length,reportSha256:sha(files.get('report.json'))};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){assert.equal(process.argv.length,3);console.log(JSON.stringify(await runDomainPredictions(process.argv[2],{onProgress:p=>{if(p.seed%10===0)console.error(JSON.stringify(p));}})));}
