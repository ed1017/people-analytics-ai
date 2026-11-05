import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {hiringCohortFixture} from '../fixtures/hiring-cohort-generator.mjs';
import {hiringTrainingCohorts,fitHiringCohorts,predictHiringCohorts} from '../../lib/ml/hiring-cohort-model.mjs';
import {classifyHiringCohorts,summarizeClassifications} from '../../lib/ml/hiring-classifier-evaluation.mjs';
const root=new URL('../../',import.meta.url);
const hash=s=>createHash('sha256').update(s).digest('hex');
export function blendPredictions(predictions){
 return predictions.map(p=>{
  for(const key of ['logistic-trend','recent-3-fraction'])
   if(!Number.isFinite(p[key])||p[key]<=0||p[key]>=1)throw Error('Interior probabilities required.');
  return {...p,'equal-blend':(p['logistic-trend']+p['recent-3-fraction'])/2};
 });
}
export function passesGate(families,candidate='equal-blend',baseline='recent-3-fraction'){
 return families.length>0&&families.every(f=>{
  const c=f.methods[candidate],b=f.methods[baseline];
  return c.balancedAccuracy!==null&&b.balancedAccuracy!==null&&c.brier<b.brier&&c.logLoss<b.logLoss&&c.balancedAccuracy>=b.balancedAccuracy;
 });
}
export async function evaluateBlend(makeFixture=hiringCohortFixture){
 const protocol=JSON.parse(await readFile(new URL('docs/hiring-blend-protocol.json',root),'utf8'));
 const paths=['docs/hiring-blend-protocol.json','tests/manual/evaluate-hiring-blend.mjs','tests/fixtures/hiring-cohort-generator.mjs','tests/fixtures/predictive-readiness.mjs','lib/ml/hiring-cohort-model.mjs','lib/ml/hiring-classifier-evaluation.mjs','lib/ml/hiring-domain-adapter.mjs','lib/ml/predictive-readiness.ts'];
 const files=Object.fromEntries(await Promise.all(paths.map(async p=>[p,hash((await readFile(new URL(p,root),'utf8')).replace(/\r\n/g,'\n'))])));
 // Construct ALL predictions before requesting ANY assessment snapshot.
 const pending=protocol.families.flatMap(family=>Array.from({length:protocol.seedCount},(_,i)=>{
  const seed=protocol.seedStart+i,training=makeFixture(family,seed,protocol.origin);
  const model=fitHiringCohorts(hiringTrainingCohorts(training.input,training.coverage));
  const predictions=blendPredictions(predictHiringCohorts(model,protocol.testMonths));
  return {family,seed,model,predictions};
 }));
 const cases=pending.map(c=>{
  const scoring=makeFixture(c.family,c.seed,protocol.scoreThrough);
  const actual=hiringTrainingCohorts(scoring.input,scoring.coverage).filter(r=>protocol.testMonths.includes(r.month));
  return {...c,actual,counts:Object.fromEntries(protocol.methods.map(m=>[m,classifyHiringCohorts(actual,c.predictions,m,protocol.threshold)]))};
 });
 const families=protocol.families.map(family=>{
  const selected=cases.filter(c=>c.family===family);
  return {family,methods:Object.fromEntries(protocol.methods.map(m=>[m,summarizeClassifications(selected.map(c=>c.counts[m]))]))};
 });
 return {version:protocol.version,protocol,files,gatePassed:passesGate(families),operationallyQualified:false,families,cases};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const mode=process.argv[2];if(!['--check','--write'].includes(mode))throw Error('Use --check or --write');
 const report=await evaluateBlend(),text=JSON.stringify(report,null,2)+'\n';
 const path=new URL('docs/evidence/hiring-blend-holdout-v1.json',root);
 if(mode==='--write')await writeFile(path,text);
 else if((await readFile(path,'utf8')).replace(/\r\n/g,'\n')!==text)throw Error('Blend evidence differs.');
 console.log(JSON.stringify({gatePassed:report.gatePassed,families:report.families},null,2));
}
