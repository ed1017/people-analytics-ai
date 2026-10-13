import test from 'node:test';
import assert from 'node:assert/strict';
import {solutionRequest,activity,final,evaluate,fixtureRuntime,quantity} from './fixtures/home-solution-conversation.mjs';
import {failedTurnoverPilot,reviewedTurnoverPilot} from './fixtures/turnover-pilot-target-failures.mjs';
import {proposedPilot} from './fixtures/model-proposed-pilot.mjs';
import {readSolutionState,evaluateSolutionCandidate,evaluateSolutionParameterEdit} from '../lib/home-solution-conversation.ts';
import {solutionSharedQuantityScopes,solutionQuantityTargetGuidance,solutionLaborScopeGuidance,solutionConversationInstructions,solutionQuantitySchema,solutionCandidateSchema,assertSolutionShape} from '../lib/home-solution-conversation-schema.ts';
import {proposedPlanningEstimate} from '../lib/home-proposed-planning.ts';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
const domains=['manager_workload','learning','mobility','compensation','hiring','execution'];
const run=c=>evaluateSolutionCandidate(solutionRequest(),c,[]);
const blocked=item=>{assert.ok(item.blocking.length);assert.equal(item.draft,null);assert.equal(item.result,null);return item.blocking.join(' ');};

test('three synthetic invalid quantity shapes report every invalid shared field without changing the payload',async()=>{
 for(const revision of [1,2,3]){
  const c=failedTurnoverPilot(revision),before=structuredClone(c);assertSolutionShape(c,solutionCandidateSchema);
  const item=await run(c),feedback=blocked(item);
  for(const field of ['hours_per_participant','coordination_hours',...(revision===1?[]:['horizon_months']),...(revision===2?['population','success_baseline','success_target']:[])])assert.match(feedback,new RegExp(field+' uses .*?set target to null'));
  assert.doesNotMatch(feedback,/has no activity target/);assert.deepEqual(c,before);assert.deepEqual(item.interpretations,[]);
 }
});

test('assumption-led plans work across every domain without claiming headcount, labor cost or actual team scope',async()=>{
 for(const domain of domains){
  const c=reviewedTurnoverPilot();c.activities[0].domain=domain;
  const item=await run(c);assert.deepEqual(item.blocking,[]);const p=proposedPlanningEstimate(item.draft);
  assert.equal(p.months,2);assert.deepEqual(p.participants,{min:10,max:10});assert.deepEqual(p.hours,{min:40,max:40});assert.equal(p.cash,0);assert.equal(p.laborCost,null);
  assert.equal(item.result.uniqueParticipants,null);assert.equal(item.result.calculationStatus,'awaiting-scope');assert.equal(item.draft.inputs.scope.population.value,null);assert.equal(item.draft.inputs.scope.startMonth.value,null);
  assert.equal(item.draft.inputs.deliveryEstimate.coordinationHours.kind,'model-proposed');assert.equal(item.draft.inputs.deliveryEstimate.hourlyRate.value,null);
 }
});

test('all shared fields reject activity/all targets in every domain, including unknown and literal values',async()=>{
 for(const domain of domains)for(const field of Object.keys(solutionSharedQuantityScopes))for(const target of ['c1','all'])for(const kind of ['unknown','literal','model-proposed']){
  const c=proposedPilot();c.activities[0].domain=domain;c.quantities=[{...quantity(field,2,'months',target),kind}];
  assert.match(blocked(await run(c)),new RegExp(field+' uses .*?set target to null'),`${domain}/${field}/${target}/${kind}`);
 }
});

test('activity quantities reject missing, invented or inappropriate scope across all domains',async()=>{
 for(const domain of domains)for(const [field,targets] of [['participants',[null,'missing','new-c1']],['cash',[null,'all','missing']],['activity_start',[null,'all','missing']],['activity_finish',[null,'all','missing']]])for(const target of targets){
  const c=proposedPilot();c.activities[0].domain=domain;c.quantities=[{...quantity(field,null,'text',target),kind:'unknown'}];assert.match(blocked(await run(c)),new RegExp(field+'\\.target must'));
 }
 const c=proposedPilot();c.quantities.find(q=>q.field==='cash').target='new-c1';assert.deepEqual((await run(c)).blocking,[]);
});

test('mixed-domain cohorts retain a range; shared coordination is counted once and cash remains separate',async()=>{
 const c=reviewedTurnoverPilot();c.activities.push({...activity('c2'),domain:'mobility'});c.quantities.find(q=>q.field==='participants').target='all';
 const item=await run(c);assert.deepEqual(item.blocking,[]);const p=proposedPlanningEstimate(item.draft);
 assert.deepEqual(p.participants,{min:10,max:20});assert.deepEqual(p.hours,{min:40,max:60});assert.equal(p.cash,null);assert.equal(p.laborCost,null);assert.equal(item.draft.inputs.groupsDisjoint.value,null);
});

test('different activity workloads and duplicate shared values are never summed or silently overwritten',async()=>{
 const c=proposedPilot();c.activities.push(activity('c2'));c.quantities=c.quantities.filter(q=>q.field!=='hours_per_participant');
 c.quantities.push(...['c1','c2'].map((target,i)=>({...proposedPilot().quantities.find(q=>q.field==='hours_per_participant'),target,number:2+i})));
 assert.match(blocked(await run(c)),/Do not convert activity-specific values/);
 c.quantities=c.quantities.map(q=>q.field==='hours_per_participant'?{...q,target:null}:q);
 assert.match(blocked(await run(c)),/hours_per_participant: supply one normalized value/);
});

test('unrepresentable activity workloads can remain unknown without losing the conditional plan',async()=>{
 const c=reviewedTurnoverPilot();c.activities.push({...activity('c2'),domain:'hiring'});
 c.quantities.find(q=>q.field==='participants').target='all';
 c.quantities=c.quantities.map(q=>['hours_per_participant','coordination_hours'].includes(q.field)?{...q,kind:'unknown',number:null,interpretation:'Different activity workloads need a separate reviewed estimate.'}:q);
 const item=await run(c);assert.deepEqual(item.blocking,[]);const p=proposedPlanningEstimate(item.draft);
 assert.deepEqual(p.participants,{min:10,max:20});assert.equal(p.hours,null);assert.equal(p.laborCost,null);
});

test('reference and scale paths cannot smuggle activity-specific labor into shared delivery estimates',async()=>{
 const item=await run(proposedPilot()),request=solutionRequest('Change the estimate.',false,{...solutionRequest().state,working:[item]},2);
 for(const kind of ['reference','scale'])for(const sourceTarget of [null,'c1']){
  const q={...quantity('hours_per_participant',null,'hours/person/total',sourceTarget===null?'c1':null,'user-2'),kind,source:{kind:'working',id:item.id,revision:item.revision,field:'hours_per_participant',target:sourceTarget},factor:kind==='scale'?0.5:null};
  const result=await evaluateSolutionParameterEdit(request,{id:item.id,source:{kind:'working',id:item.id,revision:item.revision},quantities:[q]},[]);
  assert.match(blocked(result),sourceTarget===null?/hours_per_participant uses/:/source.field hours_per_participant is shared/);
 }
});

test('generation schema and instructions expose the same target and labor scope contract',()=>{
 assert.equal(solutionQuantitySchema.properties.target.description,solutionQuantityTargetGuidance);
 assert.equal(solutionCandidateSchema.properties.quantities.description,solutionLaborScopeGuidance);
 assert.ok(solutionConversationInstructions.includes(solutionQuantityTargetGuidance));assert.ok(solutionConversationInstructions.includes(solutionLaborScopeGuidance));
 assert.doesNotMatch(solutionConversationInstructions,/Give each a short activity-specific rationale/);
});

const unsupported=()=>final({findings:'The supplied records do not rank teams.',decisionRationale:'The resource estimate did not validate.',caveats:['Actual team, baseline and capacity remain unknown.'],unsupportedPlan:{decision:'A resourced team retention pilot remains unsupported.',nextStep:'Obtain comparable team records and review the assumptions.',calculationRefs:[]}});
const withFinal=c=>{
 const call={id:'call',name:'evaluate_candidate',arguments:JSON.stringify(evaluate(c).args)};
 return {items:[{type:'function_call',call_id:call.id,name:call.name,arguments:call.arguments}],calls:[call],completed:true,text:JSON.stringify(final('Review the conditional pilot.',[c.id]))};
};

test('valid assumption-led co-produced final can finish in one round in every domain',async()=>{
 for(const domain of domains){
  const c=reviewedTurnoverPilot();c.activities[0].domain=domain;let calls=0;
  const runtime={complete:async()=>{assert.equal(++calls,1);return withFinal(c);},loadProjection:async()=>{throw Error('No projection read expected');}};
  const reply=await converseSolutions(solutionRequest(),runtime,new AbortController().signal);
  assert.deepEqual(reply.usage,{modelRounds:1,toolCalls:1});assert.deepEqual(reply.candidateIds,[c.id]);assert.deepEqual(reply.state.working[0].blocking,[]);
 }
});

test('synthetic three-failure sequence stays bounded at four rounds and never presents a failed candidate',async()=>{
 const runtime=fixtureRuntime([...[1,2,3].map(n=>evaluate(failedTurnoverPilot(n))),(input,finalOnly)=>{assert.equal(finalOnly,true);return unsupported();}]);
 const reply=await converseSolutions(solutionRequest(),runtime,new AbortController().signal);
 assert.deepEqual(reply.usage,{modelRounds:4,toolCalls:3});assert.deepEqual(reply.candidateIds,[]);assert.equal(reply.state.working.length,3);reply.state.working.forEach(blocked);
});

test('explicit corrected payload succeeds after precise feedback without changing the existing continuation rule',async()=>{
 const c=reviewedTurnoverPilot(),runtime=fixtureRuntime([evaluate(failedTurnoverPilot(1)),(input)=>{
  const output=JSON.parse(input.find(x=>x.type==='function_call_output').output);
  assert.match(JSON.stringify(output),/hours_per_participant uses/);assert.match(JSON.stringify(output),/coordination_hours uses/);return evaluate(c);
 },final('Review the corrected whole-plan estimate.',[c.id])]);
 const reply=await converseSolutions(solutionRequest(),runtime,new AbortController().signal);
 assert.deepEqual(reply.usage,{modelRounds:3,toolCalls:2});assert.deepEqual(reply.candidateIds,[c.id]);assert.equal(reply.state.working[1].revision,2);assert.deepEqual(reply.state.working[1].blocking,[]);
});

// Extend the synthetic second revision without exceeding the 24-quantity schema.
function extendedFailure(count){
 const c=failedTurnoverPilot(2),template=c.quantities.filter(q=>q.target==='c1');
 for(let i=4;i<=count;i++){
  const id='c'+i;c.activities.push(activity(id,'Additional pilot activity '+i));
  c.quantities.push(...template.map(q=>({...q,target:id})));
 }
 // Six activities allow only two cash entries alongside all twelve effort errors.
 if(count===6)c.quantities=c.quantities.filter(q=>q.field!=='cash'||['c1','c2'].includes(q.target));
 return c;
}
const roundtrip=state=>assert.deepEqual(readSolutionState(JSON.parse(JSON.stringify(state))),state);

test('four to six activities return every scope error through conversation and state roundtrips',async()=>{
 for(const count of [4,5,6]){
  const c=extendedFailure(count);assert.equal(c.activities.length,count);assert.equal(c.quantities.length,count===4?20:24);assertSolutionShape(c,solutionCandidateSchema);
  const runtime=fixtureRuntime([evaluate(c),unsupported()]);
  const reply=await converseSolutions(solutionRequest(),runtime,new AbortController().signal),item=reply.state.working[0];
  assert.deepEqual(reply.usage,{modelRounds:2,toolCalls:1});assert.deepEqual(reply.candidateIds,[]);blocked(item);
  assert.equal(item.blocking.length,2*count+4);assert.ok(item.blocking.join(' ').length>2000);assert.ok(item.blocking.every(s=>s.length<=2000));
  for(const a of c.activities)for(const field of ['hours_per_participant','coordination_hours'])assert.ok(item.blocking.some(s=>s.startsWith(field+' uses ')&&s.includes(JSON.stringify(a.id))));
  for(const field of ['horizon_months','population','success_baseline','success_target'])assert.ok(item.blocking.some(s=>s.startsWith(field+' uses ')));
  const feedback=JSON.parse(runtime.contexts[1].find(x=>x.type==='function_call_output').output);assert.deepEqual(feedback.blocking,item.blocking);
  assert.deepEqual(item.interpretations,[]);roundtrip(reply.state);
  const next=fixtureRuntime([unsupported()]);roundtrip((await converseSolutions(solutionRequest('Explain the remaining limitations.',false,reply.state,2),next,new AbortController().signal)).state);
 }
});

test('maximum quantity count and escaped target length remain bounded for candidate and parameter feedback',async()=>{
 const seed=await run(reviewedTurnoverPilot());
 for(const parameterOnly of [false,true]){
  const request=solutionRequest('Review these inputs.',false,{...solutionRequest().state,working:[seed]},2),c=extendedFailure(6);c.goal.turnId='user-2';
  c.quantities=Array.from({length:24},(_,i)=>({...quantity('hours_per_participant',null,'hours/person/total',String(i).padStart(2,'0')+'\u0000'.repeat(78),'user-2'),kind:'reference',source:{kind:'working',id:seed.id,revision:seed.revision,field:'hours_per_participant',target:'c1'}}));
  assertSolutionShape(c,solutionCandidateSchema);
  const step=parameterOnly?{name:'revise_parameters',args:{edit:{id:seed.id,source:{kind:'working',id:seed.id,revision:seed.revision},quantities:c.quantities},constraintUpdates:[]}}:evaluate(c);
  const runtime=fixtureRuntime([step,unsupported()]);const reply=await converseSolutions(request,runtime,new AbortController().signal),item=reply.state.working.at(-1);
  blocked(item);assert.equal(item.blocking.length,25);assert.ok(item.blocking.every(s=>s.length<=2000));assert.ok(item.blocking.join(' ').length>16000);assert.deepEqual(item.interpretations,[]);roundtrip(reply.state);
  const invalid=structuredClone(reply.state);invalid.working.at(-1).blocking=['x'.repeat(2001)];assert.throws(()=>readSolutionState(invalid),/unsupported metadata/);
  invalid.working.at(-1).blocking=Array(81).fill('Scope error');assert.throws(()=>readSolutionState(invalid),/unsupported metadata/);
  c.quantities.push(c.quantities[0]);assert.throws(()=>assertSolutionShape(c,solutionCandidateSchema),/count/);
 }
 const longTarget=extendedFailure(6);longTarget.quantities[0].target='x'.repeat(81);assert.throws(()=>assertSolutionShape(longTarget,solutionCandidateSchema),/Invalid/);
 const oversized=extendedFailure(6);oversized.activities.push(activity('c7'));assert.throws(()=>assertSolutionShape(oversized,solutionCandidateSchema),/count/);
});
