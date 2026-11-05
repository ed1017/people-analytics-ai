import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {hiringCohortFixture} from '../fixtures/hiring-cohort-generator.mjs';
import {hiringTrainingCohorts,fitHiringCohorts,predictHiringCohorts} from '../../lib/ml/hiring-cohort-model.mjs';
import {classifyHiringCohorts,summarizeClassifications} from '../../lib/ml/hiring-classifier-evaluation.mjs';
const root=new URL('../../',import.meta.url),sha=x=>createHash('sha256').update(x).digest('hex');
export async function buildHiringClassifier(){
 const protocol=JSON.parse(await readFile(new URL('docs/explore-hiring-classifier-protocol.json',root),'utf8'));
 const paths=['docs/explore-hiring-classifier-protocol.json','lib/ml/hiring-classifier-evaluation.mjs','lib/ml/hiring-cohort-model.mjs','lib/ml/hiring-domain-adapter.mjs','lib/ml/predictive-readiness.ts','tests/fixtures/hiring-cohort-generator.mjs','tests/fixtures/predictive-readiness.mjs','tests/manual/generate-explore-hiring-classifier.mjs'];
 const files=Object.fromEntries(await Promise.all(paths.map(async path=>[path,sha((await readFile(new URL(path,root),'utf8')).replace(/\r\n/g,'\n'))])));
 const families=protocol.families.map(family=>{
  const cases=protocol.seeds.map(seed=>{
   const training=hiringCohortFixture(family,seed,protocol.origin);
   const model=fitHiringCohorts(hiringTrainingCohorts(training.input,training.coverage));
   const predictions=predictHiringCohorts(model,protocol.testMonths);
   // No test labels are retrieved until both the fitted model and predictions exist.
   const scoring=hiringCohortFixture(family,seed,protocol.scoreThrough);
   const actual=hiringTrainingCohorts(scoring.input,scoring.coverage).filter(r=>protocol.testMonths.includes(r.month));
   return {seed,model,predictions,actual,counts:Object.fromEntries(protocol.methods.map(method=>[method,classifyHiringCohorts(actual,predictions,method,protocol.threshold)]))};
  });
  return {family,histories:cases.length,testCohorts:cases.length*protocol.testMonths.length,methods:Object.fromEntries(protocol.methods.map(method=>[method,summarizeClassifications(cases.map(c=>c.counts[method]))])),cases};
 });
 return {version:protocol.version,protocolCommit:'37c308d7',protocol,files,operationallyQualified:false,realWorldPerformanceValidated:false,interval:null,families};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const mode=process.argv[2];if(!['--check','--write'].includes(mode))throw Error('Use --check or --write');
 const report=await buildHiringClassifier();
 const full=JSON.stringify(report,null,2)+'\n';
 const compact=JSON.stringify({...report,reportSha256:sha(full),families:report.families.map(({cases,...rest})=>({...rest,example:{seed:cases[0].seed,predictions:cases[0].predictions,actual:cases[0].actual}}))},null,2)+'\n';
 for(const [path,text] of [['docs/evidence/explore-hiring-classifier-v1.json',full],['releases/2026-10-21/source/lib/data/explore-hiring-classifier-v1.json',compact]]){
  if(mode==='--write')await writeFile(new URL(path,root),text);else if((await readFile(new URL(path,root),'utf8')).replace(/\r\n/g,'\n')!==text)throw Error('Classifier evidence differs: '+path);
 }
 console.log('Synthetic hiring classifier '+mode);
}
