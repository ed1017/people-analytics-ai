/** Existing fixture transports and real calculators/store; no provider or database requests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {solutionRequest,candidate,quantity,fixtureRuntime,final,evaluate,projectionSpec,project} from './fixtures/home-solution-conversation.mjs';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {saveSolutionCandidate,resolveSolutionMetric,readSolutionRequest,emptySolutionState} from '../lib/home-solution-conversation.ts';
import {solutionTools,assertSolutionShape} from '../lib/home-solution-conversation-schema.ts';
import {reviewReadySolutionTools,readReviewReadyArguments} from '../lib/home-solution-review-completion.ts';
import {associatePlanProposal,packPlanAlternatives,readPlanAlternatives,planAlternativesField} from '../lib/home-plan-alternatives.ts';
import {DecisionStore,DECISIONS_STORAGE_KEY,encodeDecisions} from '../lib/local-decisions.ts';
import {responseForStep,naturalSteps,messages} from './fixtures/natural-business-planning.mjs';
import {offlineBusinessRoute} from './helpers/offline-business-route.mjs';
const signal=()=>new AbortController().signal;
const A='Create a fictional mentoring pilot for three people, five total hours each and 12 total coordination hours. Start October 2026 for three months. Cash, capacity and impact are unknown. Do not save.';
const B='Keep the saved mentoring plan, dates and three participants. Change total hours each to four and coordination hours to nine. Keep cash, capacity and impact unknown. Do not save.';
function scoped(){const c=candidate('mentoring');c.quantities=[quantity('participants',3,'people','c1'),quantity('hours_per_participant',5,'hours/person/total'),quantity('coordination_hours',12,'hours/total'),{...quantity('population',null,'text'),text:'Fictional mentoring cohort'},{...quantity('start_month',null,'YYYY-MM'),text:'2026-10'},quantity('horizon_months',3,'months')];return c;}
const ready=c=>({name:'evaluate_candidate',args:{candidate:c,constraintUpdates:[],readyForReview:true}});
const runtime=steps=>({...fixtureRuntime(steps),reviewReady:true});
const check=(reply,hours)=>{const item=reply.state.working.at(-1);assert.deepEqual(item.blocking,[]);assert.notEqual(item.result.calculationStatus,'awaiting-scope');assert.equal(item.result.deliveryEstimate.hours,hours);assert.equal(item.result.cashEstimate.cash,null);assert.equal(item.draft.inputs.capacity,null);assert.equal(item.draft.inputs.whatIf,undefined);assert.equal(item.draft.inputs.successMeasure.target.value,null);assert.equal(reply.usage.modelRounds,1);assert.equal(resolveSolutionMetric(reply.state,reply.state.verifiedMetrics.find(ref=>ref.metric==='staff_hours')).value,hours);return item;};

test('presentation metadata preserves every original tool and calculator argument contract',()=>{
 assert.deepEqual(reviewReadySolutionTools.map(t=>t.name),solutionTools.map(t=>t.name));
 for(const [i,tool] of reviewReadySolutionTools.entries()){
  const original=solutionTools[i];
  if(!tool.parameters.properties.readyForReview){assert.deepEqual(tool,original);continue;}
  const {readyForReview,...properties}=tool.parameters.properties;
  assert.equal(readyForReview.type,'boolean');assert.deepEqual({...tool,parameters:{...tool.parameters,properties,required:tool.parameters.required.filter(k=>k!=='readyForReview')}},original);
 }
 const args=ready(scoped()).args,copy=JSON.stringify(args),read=readReviewReadyArguments('evaluate_candidate',args,true);
 assert.equal(read.ready,true);assertSolutionShape(read.args,solutionTools.find(t=>t.name==='evaluate_candidate').parameters,'original');assert.equal(JSON.stringify(args),copy);
 assert.throws(()=>readReviewReadyArguments('evaluate_candidate',{...args,readyForReview:'yes'},true));
 assert.throws(()=>readReviewReadyArguments('evaluate_candidate',{...args,unexpected:true},true));
});

test('one-round checked A and B preserve unknowns, original, dates, lineage and explicit save/reload',async()=>{
 const body=solutionRequest(A),before=JSON.stringify(body),reply=await converseSolutions(body,runtime([ready(scoped())]),signal()),item=check(reply,27);
 assert.equal(JSON.stringify(body),before);assert.equal(body.catalog,null);assert.equal(reply.answer,'Action Plan ready for review; not saved or applied.');
 const goal={id:'review-test',statement:item.candidate.goal.statement};
 await assert.rejects(saveSolutionCandidate({...body,state:reply.state},null,item,goal,body.evidence,false),/Acknowledge/);
 const saved=await saveSolutionCandidate({...body,state:reply.state},null,item,goal,body.evidence,true);assert.equal(saved.status,'ready');
 const at='2026-10-10T00:00:00.000Z',selected=associatePlanProposal(saved.catalog,saved.catalog,saved.plan.id,{inputKey:saved.plan.result.inputKey,attachmentId:saved.plan.requestId,at,acknowledgeUnknowns:true});
 const seed={version:1,revision:0,goals:{version:1,activeId:'',goals:[{id:'unrelated',statement:'Keep'}]},workspaces:{unrelated:{savedAt:at,fields:{sentinel:'unchanged'}}}},map=new Map([[DECISIONS_STORAGE_KEY,encodeDecisions(seed)]]),port={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)},store=new DecisionStore();store.initialize(port);
 store.commitGoalSelection(goal.id,goal.statement,0,at,()=>({[planAlternativesField]:packPlanAlternatives(selected)}));
 const raw=map.get(DECISIONS_STORAGE_KEY),original=structuredClone(selected.plans[0]);
 const b=readSolutionRequest({...body,goal,catalog:selected,selectedId:saved.plan.id,state:emptySolutionState(),requestId:'request-2',message:{id:'user-2',text:B}});
 const edit={id:'revised',source:{kind:'saved',id:saved.plan.id,revision:saved.plan.draft.revision},quantities:[quantity('hours_per_participant',4,'hours/person/total',null,'user-2'),quantity('coordination_hours',9,'hours/total',null,'user-2')]};
 const revised=await converseSolutions(b,runtime([{name:'revise_parameters',args:{edit,constraintUpdates:[],readyForReview:true}}]),signal()),next=check(revised,21);
 assert.equal(map.get(DECISIONS_STORAGE_KEY),raw);assert.deepEqual(next.draft.inputs.scope,item.draft.inputs.scope);assert.deepEqual(next.draft.inputs.groups,item.draft.inputs.groups);assert.deepEqual(next.draft.inputs.timing,item.draft.inputs.timing);assert.deepEqual(next.sourceRefs,[{id:saved.plan.id,revision:saved.plan.draft.revision}]);
 const outcome=await saveSolutionCandidate({...b,state:revised.state},selected,next,goal,b.evidence,true);assert.equal(outcome.status,'ready');
 const chosen=associatePlanProposal(outcome.catalog,outcome.catalog,outcome.plan.id,{inputKey:outcome.plan.result.inputKey,attachmentId:outcome.plan.requestId,at,acknowledgeUnknowns:true});store.commitGoalSelection(goal.id,goal.statement,1,at,()=>({[planAlternativesField]:packPlanAlternatives(chosen)}));
 const reload=new DecisionStore();reload.initialize(port);assert.equal(reload.getSnapshot().saved,true);const data=reload.getSnapshot().data,catalog=readPlanAlternatives(data.workspaces[goal.id].fields[planAlternativesField],{goalId:goal.id,goal:goal.statement});
 assert.deepEqual(catalog.plans[0],original);assert.equal(catalog.plans[1].result.deliveryEstimate.hours,21);assert.equal(catalog.plans[1].draft.revision,catalog.plans[0].draft.revision+1);assert.equal(catalog.attachments.length,2);assert.equal(catalog.plans[1].applied,false);assert.deepEqual(data.workspaces.unrelated,seed.workspaces.unrelated);
});

test('false or absent presentation intent retains the normal final generation',async()=>{
 for(const flag of [false,undefined]){const step=evaluate(scoped());if(flag!==undefined)step.args.readyForReview=flag;const reply=await converseSolutions(solutionRequest(A),runtime([step,final('Review the proposed tradeoffs.',['mentoring'])]),signal());assert.equal(reply.usage.modelRounds,2);assert.equal(reply.answer,'Review the proposed tradeoffs.');}
});

test('blocked, awaiting-scope, invalid citations and invalid source revisions never auto-complete',async()=>{
 const blocked=ready(scoped());blocked.args.constraintUpdates=[{action:'set',field:'max_hours',number:20,text:null,unit:'hours/total',turnId:'user-1'}];
 const badCitation=ready(scoped());badCitation.args.candidate.activities[0].evidenceIds=['made-up'];
 const badSource={name:'revise_parameters',args:{edit:{id:'edit',source:{kind:'saved',id:'missing',revision:99},quantities:[quantity('coordination_hours',9,'hours/total')]},constraintUpdates:[],readyForReview:true}};
 for(const step of [blocked,ready(candidate()),badCitation,badSource]){const reply=await converseSolutions(solutionRequest(A),runtime([step,final('More review is needed.')]),signal());assert.equal(reply.usage.modelRounds,2);assert.equal(reply.answer,'More review is needed.');}
});

test('multiple calls in one response and a preceding projection retain the full final response',async()=>{
 const c=scoped(),steps=runtime([ready(c),final('Review both requested results.',['mentoring'])]);const first=steps.complete;let called=false;
 steps.complete=async(...args)=>{const result=await first(...args);if(!called){called=true;const call={id:'extra-read',name:'read_evidence',arguments:JSON.stringify({sourceIds:[]})};result.calls.push(call);result.items.push({type:'function_call',call_id:call.id,name:call.name,arguments:call.arguments});}return result;};
 assert.equal((await converseSolutions(solutionRequest(A),steps,signal())).usage.modelRounds,2);
 const projected=await converseSolutions(solutionRequest(A),runtime([project(projectionSpec()),ready(c),final('Review the proposal and scenario.',['mentoring'],['headcount'])]),signal());assert.equal(projected.usage.modelRounds,3);assert.equal(projected.analysisIds.length,1);
});

function checkedAlternatives(){
 return [['mentoring','Mentoring trial','Learning lead','Pair volunteers with mentors.',5,12],['peer-practice','Peer feedback practice','Team facilitator','Practice feedback in peer pairs.',4,9],['manager-check-in','Manager check-in','People partner','Review workload with managers.',3,6]].map(([id,name,ownerRole,step,hours,coordination])=>{
  const c=scoped();c.id=id;c.name=name;Object.assign(c.activities[0],{name,ownerRole,step});c.quantities.find(q=>q.field==='hours_per_participant').number=hours;c.quantities.find(q=>q.field==='coordination_hours').number=coordination;return c;
 });
}
const finalWithAllMetrics=(candidates,answer)=>input=>({...final(answer,candidates.map(c=>c.id)),verifiedMetrics:input.filter(row=>row.type==='function_call_output').flatMap(row=>JSON.parse(row.output).verifiedMetricReferences??[])});
const assertAllAlternatives=(reply,candidates)=>{
 assert.deepEqual(reply.candidateIds,candidates.map(c=>c.id));
 assert.deepEqual([...new Set(reply.state.verifiedMetrics.map(ref=>ref.id))],reply.candidateIds);
 for(const [i,c] of candidates.entries()){
  const item=reply.state.working.find(row=>row.id===c.id);assert.deepEqual(item.blocking,[]);assert.equal(item.result.cashEstimate.cash,null);
  assert.equal(resolveSolutionMetric(reply.state,reply.state.verifiedMetrics.find(ref=>ref.id===c.id&&ref.metric==='staff_hours')).value,[27,21,15][i]);
 }
};

test('an earlier checked A prevents terminal B from bypassing the final review of both options',async()=>{
 const candidates=checkedAlternatives().slice(0,2),first=ready(candidates[0]);first.args.readyForReview=false;
 const answer='Review both alternatives and their tradeoffs.',reply=await converseSolutions(solutionRequest('Compare two fictional alternatives with the supplied dates and hours; keep both for review.'),runtime([first,ready(candidates[1]),finalWithAllMetrics(candidates,answer)]),signal());
 assert.equal(reply.usage.modelRounds,3);assert.equal(reply.answer,answer);assertAllAlternatives(reply,candidates);
});

test('a multi-plan request retains earlier parallel options and terminal C through the normal final turn',async()=>{
 const candidates=checkedAlternatives(),answer='Review all three alternatives.',rt=runtime([ready(candidates[0]),ready(candidates[2]),finalWithAllMetrics(candidates,answer)]),complete=rt.complete;let first=true;
 rt.complete=async(...args)=>{const output=await complete(...args);if(first){first=false;const step=ready(candidates[1]),call={id:'parallel-option',name:step.name,arguments:JSON.stringify(step.args)};output.calls.push(call);output.items.push({type:'function_call',call_id:call.id,name:call.name,arguments:call.arguments});}return output;};
 const reply=await converseSolutions(solutionRequest('Compare three fictional plans, preserving all options and checked effort for review.'),rt,signal());
 assert.equal(reply.usage.modelRounds,3);assert.equal(reply.usage.toolCalls,3);assert.equal(reply.answer,answer);assertAllAlternatives(reply,candidates);
});

test('cancellation still rejects before any model round',async()=>{
 const control=new AbortController();control.abort();const rt=runtime([ready(scoped())]);await assert.rejects(converseSolutions(solutionRequest(A),rt,control.signal),/cancelled/);
});

test('actual POST returns the one-round review plus numeric receipt when console logging is unavailable',async()=>{
 const isolated=await offlineBusinessRoute();isolated.sandbox.console={info(){throw Error('logging unavailable');},error(){}};
 isolated.sandbox.__replies.push({...responseForStep(ready(scoped()),0),model:'gpt-6.1-sol',service_tier:'default',usage:{input_tokens:100,output_tokens:20,total_tokens:120,input_tokens_details:{cached_tokens:40},output_tokens_details:{reasoning_tokens:5}}});
 const body=solutionRequest(A),response=await isolated.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',body:JSON.stringify(body)}));assert.equal(response.status,200);const reply=await response.json();check(reply,27);
 assert.equal(isolated.sandbox.__requests.length,1);assert.equal(response.headers.get('x-correlation-id'),reply.diagnostics.correlationId);assert.match(response.headers.get('server-timing'),/grounding;dur=\d+/);assert.match(response.headers.get('server-timing'),/provider;dur=\d+/);
 const round=reply.diagnostics.providerRounds[0];assert.equal(round.inputTokens,100);assert.equal(round.cachedInputTokens,40);assert.equal(round.outputTokens,20);assert.equal(round.reasoningTokens,5);assert.equal(round.model,'gpt-6.1-sol');assert.equal(round.serviceTier,'default');assert.ok(!JSON.stringify(reply.diagnostics).includes(A));
 assert.equal(isolated.sandbox.__requests[0].reasoning.effort,'medium');assert.equal(isolated.sandbox.__requests[0].service_tier,'default');
 const names=index=>isolated.sandbox.__requests[index].tools.map(tool=>tool.name);
 assert.equal(names(0).includes('revise_parameters'),false);assert.equal(names(0).includes('read_plans'),false);assert.equal(names(0).includes('compare_service_staffing'),false);
 // A new checked working proposal enables source-bound edits in the very next round.
 isolated.sandbox.__requests.length=0;const nonterminal=ready(scoped());nonterminal.args.readyForReview=false;
 isolated.sandbox.__replies.push(responseForStep(nonterminal,0),responseForStep(final('Review the assumptions.',['mentoring']),1));
 assert.equal((await isolated.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',body:JSON.stringify(body)}))).status,200);
 assert.equal(names(0).includes('revise_parameters'),false);assert.equal(names(1).includes('revise_parameters'),true);assert.equal(names(1).includes('read_plans'),false,'Working proposals are not saved plans');
 // The business review creates the reference needed by correction and comparison tools.
 isolated.sandbox.__requests.length=0;const business=solutionRequest(messages.opener);isolated.sandbox.__replies.push(...naturalSteps(business).map(responseForStep));
 assert.equal((await isolated.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',body:JSON.stringify(business)}))).status,200);
 for(const name of ['revise_scoped_service_demand','compare_service_staffing']){assert.equal(names(0).includes(name),false);assert.equal(names(1).includes(name),true);}
});
