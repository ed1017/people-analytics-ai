import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateSolutionCandidate,evaluateSolutionParameterEdit} from '../lib/home-solution-conversation.ts';
import {measurementScope,reviewSuccessMeasure} from '../lib/home-success-measures.ts';
import {homePlanSummary} from '../lib/home-plan-summary.ts';
import {reviseBundleDraft,reviewBundleProposal} from '../lib/home-bundle-reconciliation.ts';
import {createPlanAlternatives} from '../lib/home-plan-alternatives.ts';
import {solutionRequest} from './fixtures/home-solution-conversation.mjs';
import {conversationCatalog} from './fixtures/home-plan-conversation.mjs';
import {accountabilityMessage,accountabilityCandidate,accountabilityQuantity} from './fixtures/plan-accountability.mjs';
const measureText=item=>homePlanSummary(item.draft,item.result).find(row=>row.heading==='How success is measured').items.join(' ');
async function initial(){const body=solutionRequest(accountabilityMessage),item=await evaluateSolutionCandidate(body,accountabilityCandidate(body),[]);assert.deepEqual(item.blocking,[]);return {body,item};}
function retained(item,quantities){const source={kind:'working',id:item.id,revision:item.revision};return {...item.candidate,base:source,activities:item.candidate.activities.map(a=>({...a,mode:'retain',source:{...source,activityId:a.id}})),quantities};}
test('new conversational measures bind to final normalized scope and render proposed baseline and target',async()=>{
 const {item}=await initial(),measure=item.draft.inputs.successMeasure;
 assert.equal(measure.scopeKey,measurementScope(item.draft.inputs));assert.equal(measure.scopeKey,JSON.stringify(['Fictional test group','2026-11',3]));
 assert.equal(measure.baseline.kind,'illustrative');assert.equal(measure.target.kind,'illustrative');assert.equal(measure.baseline.value,'8.2%');assert.equal(measure.target.value,'6.56%');
 assert.match(measureText(item),/Assumed baseline: 8\.2%/);assert.match(measureText(item),/Assumed target: 6\.56%/);assert.doesNotMatch(measureText(item),/renewed review/);
 assert.ok(!item.result.issues.some(issue=>issue.startsWith('Success measure')));assert.equal(item.draft.inputs.memberships[0].complete.value,null);
});
test('new measure binding includes current scope constraints applied after candidate quantities',async()=>{
 const body=solutionRequest(accountabilityMessage+' Use six months instead.'),constraints=[{action:'set',field:'horizon_months',number:6,text:null,unit:'months',turnId:body.message.id}];
 const item=await evaluateSolutionCandidate(body,accountabilityCandidate(body),constraints);assert.deepEqual(item.blocking,[]);
 assert.equal(item.draft.inputs.successMeasure.scopeKey,JSON.stringify(['Fictional test group','2026-11',6]));assert.doesNotMatch(measureText(item),/renewed review/);assert.equal(item.draft.inputs.successMeasure.target.kind,'illustrative');
});
test('later population, start or horizon changes preserve the original measure and invalidate both refinement paths',async()=>{
 for(const [field,value,unit] of [['population','Another fictional test group','text'],['start_month','2026-12','YYYY-MM'],['horizon_months',6,'months']]){
  const {body,item}=await initial(),before=JSON.stringify(item),next=solutionRequest('Change '+field+' to '+value+'. Keep the prior measure for reference.',false,{...body.state,working:[item]},2),q=accountabilityQuantity(next,field,value,unit);
  const source={kind:'working',id:item.id,revision:item.revision};
  for(const revised of [await evaluateSolutionParameterEdit(next,{id:item.id,source,quantities:[q]},[]),await evaluateSolutionCandidate(next,retained(item,[q]),[])]){
   assert.deepEqual(revised.blocking,[]);assert.deepEqual(revised.draft.inputs.successMeasure,item.draft.inputs.successMeasure);assert.notEqual(revised.draft.inputs.successMeasure.scopeKey,measurementScope(revised.draft.inputs));
   assert.match(measureText(revised),/needs renewed review/);assert.doesNotMatch(measureText(revised),/Assumed baseline:|Assumed target:/);assert.ok(revised.result.issues.some(issue=>issue.startsWith('Success measure')));
  }
  assert.equal(JSON.stringify(item),before);
 }
});
test('unchanged and already-stale existing measures keep their bindings without automatic repair',async()=>{
 for(const stale of [false,true]){
  const {body,item}=await initial();if(stale){item.draft.inputs.successMeasure.scopeKey=JSON.stringify([item.candidate.goal.statement,body.scope]);item.result=reviewBundleProposal(item.draft);item.issues=[...item.result.issues];}
  const next=solutionRequest('Keep the plan and its existing measure unchanged.',false,{...body.state,working:[item]},2),revised=await evaluateSolutionCandidate(next,retained(item,[]),[]);
  assert.deepEqual(revised.blocking,[]);assert.deepEqual(revised.draft.inputs.successMeasure,item.draft.inputs.successMeasure);
  assert.equal(measureText(revised).includes('needs renewed review'),stale);
 }
});
test('scope changes do not promote or discard previously user-entered measurement provenance',async()=>{
 const catalog=conversationCatalog(),old=catalog.plans[0].draft;
 const input=reviewSuccessMeasure(old,'Matched-period turnover rate','8.2%','6.56%','user-entered',{name:'Matched-period turnover rate',status:'Synthetic fixture',baseline:null},false);
 const draft=reviseBundleDraft(old,input),body=solutionRequest('Use six months and retain the prior measure for review.',true,undefined,2);
 body.catalog=createPlanAlternatives(catalog,[{id:'A',draft}]);
 const item=await evaluateSolutionParameterEdit(body,{id:'accountability',source:{kind:'saved',id:'A',revision:draft.revision},quantities:[accountabilityQuantity(body,'horizon_months',6,'months')]},[]);
 assert.deepEqual(item.blocking,[]);assert.deepEqual(item.draft.inputs.successMeasure,draft.inputs.successMeasure);assert.equal(item.draft.inputs.successMeasure.baseline.kind,'user-entered');assert.equal(item.draft.inputs.successMeasure.target.kind,'user-entered');assert.match(measureText(item),/needs renewed review/);
});
