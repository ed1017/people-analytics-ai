// Offline public producer. No source, model or qualification overrides.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {readBundleDraft,createBundleDraft} from '../../lib/home-bundle-reconciliation.ts';
import {actionBinding} from '../../lib/home-action-drafts.ts';
import {bundleProposalFixture} from '../fixtures/home-bundles.mjs';
import {exitForecastForConsumer} from './forecast-consumer.mjs';
import {hiringExperimentalForConsumer} from './hiring-experimental-consumer.mjs';
import {satisfactionWaveChangeReport} from './report-satisfaction-wave-change.mjs';
import {composeActionPlanAnalysisDemo,unavailableAnalysisDemo,projectSatisfactionDemo,unavailableSatisfactionDemo,resolveAnalysisDemoCache} from '../../lib/ml/analysis-demo-consumer.ts';
import {analysisReviewPacket} from '../../lib/ml/analysis-review-packet.ts';

export async function satisfactionDemoForConsumer(){
 let cached;try{cached=JSON.parse(await readFile(new URL('../../docs/evidence/satisfaction-wave-change-v1.json',import.meta.url),'utf8'));}
 catch{return unavailableSatisfactionDemo('satisfaction-artifact-missing-or-invalid');}
 try{return projectSatisfactionDemo(cached,await satisfactionWaveChangeReport());}
 catch{return unavailableSatisfactionDemo('satisfaction-regeneration-or-projection-failed');}
}
export async function actionPlanAnalysisDemo(raw){
 const draft=readBundleDraft(raw);if(!draft)throw Error('Valid exact Action Plan draft required.');
 const code=await Promise.all(['../../lib/ml/analysis-demo-consumer.ts','../../lib/ml/analysis-demo-types.ts','../../lib/ml/analysis-review-packet.ts','./action-plan-analysis-demo.mjs',
  '../../lib/ml/plan-forecast-context.mjs','../../lib/home-bundle-reconciliation.ts'].map(file=>readFile(new URL(file,import.meta.url))));
 const implementationIdentity=createHash('sha256').update(Buffer.concat(code)).digest('hex');
 try{
  const [source,hiring,satisfaction]=await Promise.all([exitForecastForConsumer(),hiringExperimentalForConsumer(),satisfactionDemoForConsumer()]);
  return composeActionPlanAnalysisDemo(draft,source,hiring,satisfaction,implementationIdentity);
 }catch{return unavailableAnalysisDemo(draft,implementationIdentity,'analysis-producer-failed');}
}
export async function readCachedActionPlanAnalysisDemo(cached,draft){return resolveAnalysisDemoCache(cached,await actionPlanAnalysisDemo(draft));}
export async function analysisDemoDraft(){
 const goal='Review voluntary exits',binding=await actionBinding('scenario',goal,{sources:[]},{}),d=createBundleDraft(bundleProposalFixture(goal).bundles[0],binding);
 // This frozen public analysis release retains its original input identity.
 d.inputs.costPolicy='cash-hours-v1';
 const assumed=value=>({value,kind:'illustrative',basis:'Constructed offline demonstration input; not verified plan evidence.'});
 d.inputs.scope.population=assumed('all-recorded-voluntary-separations');d.inputs.scope.startMonth=assumed('2026-10');d.inputs.scope.months=assumed(3);
 d.inputs.successMeasure={goal,scopeKey:JSON.stringify(['all-recorded-voluntary-separations','2026-10',3]),name:'Voluntary exits (count)',baseline:{value:null,kind:'unknown',basis:null},target:assumed('150')};
 return d;
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 if(process.argv[2]==='--draft'&&process.argv.length===5&&process.argv[4]==='--review'){
  const draft=JSON.parse(await readFile(process.argv[3],'utf8'));
  process.stdout.write(JSON.stringify(analysisReviewPacket(await actionPlanAnalysisDemo(draft)),null,2)+'\n');
 }else{
 const mode=process.argv[2]??'--check';if(process.argv.length>3||!['--check','--write'].includes(mode))throw Error('Use --check, --write, or --draft <path> --review.');
 const text=JSON.stringify(await actionPlanAnalysisDemo(await analysisDemoDraft()),null,2)+'\n',file=new URL('../../docs/evidence/action-plan-analysis-demo-v1.json',import.meta.url);
 if(mode==='--write')await writeFile(file,text);else if(await readFile(file,'utf8')!==text)throw Error('Unified analysis demo differs.');
 console.log('Offline Action Plan analysis demo '+(mode==='--write'?'written.':'verified.'));
 }
}
