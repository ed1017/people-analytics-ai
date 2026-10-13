import test from 'node:test';
import assert from 'node:assert/strict';
import {solutionDiscussionPresentations} from '../lib/home-plan-presentation.ts';
import {offlineBusinessRoute} from './helpers/offline-business-route.mjs';
import {solutionRequest,final,candidate,quantity} from './fixtures/home-solution-conversation.mjs';
import {responseForStep} from './fixtures/natural-business-planning.mjs';
import {staffingDeliveryPrompt,syntheticDeliveryChanges} from './fixtures/staffing-delivery-prompt.mjs';
import {canCompleteRequiredStaffingAlone,requiredStaffingView,resolveStaffingDeliveryTarget} from '../lib/home-required-staffing.ts';
import {evaluateSolutionCandidate} from '../lib/home-solution-conversation.ts';

test('bounded live wording needs one checked tool response, with a smaller prompt and unchanged provenance',async()=>{
 const route=await offlineBusinessRoute();route.sandbox.console={info(){},error(){}};
 const body=solutionRequest(staffingDeliveryPrompt),before=structuredClone(body);
 route.sandbox.__replies.push(responseForStep({name:'compare_required_staffing',args:{changes:syntheticDeliveryChanges(body)}},0));
 const response=await route.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',body:JSON.stringify(body)})),reply=await response.json();
 assert.equal(response.status,200,JSON.stringify(reply));assert.deepEqual(reply.usage,{modelRounds:1,toolCalls:1});assert.equal(route.sandbox.__requests.length,1);
 const sent=route.sandbox.__requests[0];assert.deepEqual(JSON.parse(JSON.stringify(sent.tools.map(t=>t.name))),['compare_required_staffing']);assert.equal(sent.tool_choice.name,'compare_required_staffing');assert.ok(Buffer.byteLength(sent.instructions)<6000);assert.ok(Buffer.byteLength(JSON.stringify(sent.tools))<15000);
 assert.match(sent.instructions,/model-proposed/);assert.match(sent.instructions,/Unknown funding, release, readiness, overlap, backfill and complete costs stay unknown/);assert.equal(route.sandbox.__requestOptions[0].maxRetries,0);
 const review=reply.state.requiredStaffing,result=requiredStaffingView(review),option=result.options.find(o=>o.train===3&&o.redeploy===4&&o.hire===3);
 assert.equal(option.listedCash,495000);assert.equal(option.plannedTrainingHours,240);assert.equal(option.completeCash,null);assert.equal(option.readyAfterMonths,null);
 assert.equal(review.inputs.months,12);assert.equal(resolveStaffingDeliveryTarget(reply.state).months,3);assert.equal(review.origins.redeploymentCostPerPerson.kind,'model-proposed');assert.equal(review.inputs.poolsDistinct,null);assert.equal(review.inputs.budget,null);assert.equal(review.inputs.backfillCostPerInternalPerson,null);
 assert.match(reply.answer,/Recommendation:/);assert.match(reply.answer,/Next step:/);assert.deepEqual(body,before);
});
test('unrecognized or additional work retains the full conversation path',async()=>{
 for(const suffix of [' Also explain FTE.',' Compare this with my saved plan.',' Save it now.',' Then project headcount.'])assert.equal(canCompleteRequiredStaffingAlone(solutionRequest(staffingDeliveryPrompt+suffix)),false);
 const route=await offlineBusinessRoute();route.sandbox.console={info(){},error(){}};
 const body=solutionRequest(staffingDeliveryPrompt+' Also explain FTE.');
 route.sandbox.__replies.push(responseForStep({name:'compare_required_staffing',args:{changes:syntheticDeliveryChanges(body)}},0),responseForStep(final('FTE means full-time equivalent capacity.')));
 const response=await route.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',body:JSON.stringify(body)})),reply=await response.json();
 assert.equal(response.status,200,JSON.stringify(reply));assert.equal(reply.usage.modelRounds,2);assert.match(reply.answer,/full-time equivalent/);assert.ok(route.sandbox.__requests[0].tools.length>1);assert.equal(route.sandbox.__requests[0].tool_choice,'auto');
 const assistant={role:'assistant',content:reply.answer},presentations=solutionDiscussionPresentations([{role:'user',content:body.message.text},assistant],reply.state);
 assert.match(presentations.get(assistant).discussion,/full-time equivalent/);assert.doesNotMatch(presentations.get(assistant).discussion,/Train 3, redeploy 4, hire 3/);assert.match(presentations.get(assistant).reference,/Train 3, redeploy 4, hire 3/);
});
test('missing cash allowances mention a budget ceiling only when one is supplied',async()=>{
 for(const budget of [null,0,10000]){
  const body=solutionRequest(),proposal=candidate();if(budget!==null)proposal.quantities.push(quantity('budget_usd',budget,'USD'));
  const evaluation=await evaluateSolutionCandidate(body,proposal,[]);
  assert.equal(evaluation.result.cashEstimate.cash,null);
  const issue=evaluation.issues.find(x=>x.startsWith('Cash total is unknown;'));assert.ok(issue);
  if(budget===null)assert.doesNotMatch(issue,/budget|ceiling|cap/);else assert.match(issue,/budget ceiling/);
 }
});

test('Discovery starters stay evidence questions and require no planning inputs or saved plan',async()=>{
 const {homeStarterGroups}=await import('../lib/contextual-prompts.ts');
 const route=await offlineBusinessRoute();route.sandbox.console={info(){},error(){}};
 for(const item of homeStarterGroups[0].prompts){
  const body=solutionRequest(item.prompt),before=structuredClone(body);
  route.sandbox.__replies.push(responseForStep(final('The supplied packet does not contain a comparable team-level ranking. Review the source scope before comparing groups.')));
  const response=await route.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',body:JSON.stringify(body)})),reply=await response.json();
  assert.equal(response.status,200);assert.deepEqual(reply.candidateIds,[]);assert.deepEqual(reply.state.working,[]);assert.deepEqual(reply.state.questions,[]);assert.deepEqual(body,before);
  assert.match(route.sandbox.__requests.at(-1).instructions,/Do not automatically create an Action Plan/);
 }
});
test('Forecasting starter uses the existing explicit six-month hypothetical flow contract',async()=>{
 const {homeStarterGroups}=await import('../lib/contextual-prompts.ts');
 const {fixtureRuntime,project,projectionSpec,projectionInputs}=await import('./fixtures/home-solution-conversation.mjs');
 const {converseSolutions}=await import('../lib/home-solution-conversation-service.ts');
 const body=solutionRequest(homeStarterGroups[2].prompts[0].prompt),inputs=projectionInputs();
 const runtime=fixtureRuntime([project({...projectionSpec(),method:'monthly_flow',months:6,changes:[{field:'monthly_hires',kind:'literal',value:5,basis:'user',turnId:body.message.id,interpretation:'Explicit hypothetical five hires per month.'},{field:'monthly_exits',kind:'literal',value:3,basis:'user',turnId:body.message.id,interpretation:'Explicit hypothetical three exits per month.'}]}),final('This is a scenario under the supplied hypothetical flows, not a prediction of actual headcount.',[],['headcount'])],inputs);
 const reply=await converseSolutions(body,runtime,new AbortController().signal);
 assert.deepEqual(reply.analysisIds,['headcount']);assert.equal(reply.state.analyses[0].spec.months,6);assert.equal(reply.state.analyses[0].spec.method,'monthly_flow');assert.deepEqual(reply.candidateIds,[]);assert.match(reply.answer,/not a prediction/);assert.equal(runtime.reads,1);
});
