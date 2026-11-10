import test from 'node:test';
import assert from 'node:assert/strict';
import {emptySolutionState,readSolutionState} from '../lib/home-solution-conversation.ts';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {buildHomePack} from '../lib/home-pack.mjs';
import {editRequiredStaffing,editRequiredStaffingLocally,readRequiredStaffingReview,requiredStaffingView,requiredStaffingAnswer} from '../lib/home-required-staffing.ts';
import {defaultRequiredStaffingCostBasis,resolveRequiredStaffingCostBasis,calculateRequiredStaffing} from '../lib/required-staffing.ts';
import {requiredStaffingPlanFacts} from '../lib/home-required-staffing-plan.ts';
const runtime={natural:{datasetToken:'test-budget-period'},complete:()=>assert.fail('No provider call permitted'),loadProjection:()=>assert.fail('No source call permitted')};
function request(text='Initial staffing premises') {return {version:1,requestId:'initial',goal:{id:'',statement:''},scope:'Company-wide',filters:{country:'all',org:'all',level:'all'},timeZone:'UTC',selectedId:null,catalog:null,goalContext:null,state:emptySolutionState(),message:{id:'initial',text},evidence:buildHomePack({},'Company-wide',text)};}
const change=(q,field,value)=>({field,value,basis:{kind:'user-supplied',turnId:q.message.id,quote:q.message.text,explanation:'Explicit test scenario premise'}});
function seeded(amount=240000,role='nurses') {const q=request();q.state.requiredStaffing=editRequiredStaffing(q,'test-budget-period',[['role',role],['requiredRoles',4],['currency','GBP'],['budget',amount]].map(([f,v])=>change(q,f,v)));q.message={id:'horizon',text:'Use a 12 month cost horizon'};return q;}
const edit=(q,values)=>editRequiredStaffing(q,'test-budget-period',Object.entries(values).map(([f,v])=>change(q,f,v)));
const follow=(reply,text,id)=>({...request(text),requestId:id,message:{id,text},state:readSolutionState(reply.state)});

test('shared first horizon retains positive and zero budget quotes as pending, with original provenance',()=>{
 for(const amount of [240000,0]){
  const q=seeded(amount),before=structuredClone(q.state.requiredStaffing),review=edit(q,{months:12});
  assert.equal(review.inputs.months,12);assert.equal(review.inputs.budget,null);assert.deepEqual(review.costBasis.budget,{amount,quotedMonths:null});
  assert.deepEqual(review.origins.budget,before.origins.budget);assert.deepEqual(q.state.requiredStaffing,before);assert.deepEqual(readRequiredStaffingReview(JSON.parse(JSON.stringify(review))),review);
  assert.equal(review.inputs.hireCostPerPerson,null);assert.equal(review.inputs.trainablePeople,null);assert.equal(review.inputs.hireReadyAfterMonths,null);
  const editorBasis=defaultRequiredStaffingCostBasis(before.inputs),editor=editRequiredStaffingLocally(q,'test-budget-period',JSON.stringify(before),{...before.inputs,months:12},editorBasis);
  assert.deepEqual(editor.inputs,review.inputs);assert.deepEqual(editor.costBasis.budget,review.costBasis.budget);
 }
});

test('explicit first-horizon budget restatement, changed amount and clearing retain current provenance',()=>{
 for(const amount of [240000,0])for(const value of [amount,100000,null]){
  const q=seeded(amount);q.message.text=`Use 12 months and ${value===null?'clear the budget':`a GBP ${value} budget for those 12 months`}`;
  const review=edit(q,{months:12,budget:value});assert.equal(review.inputs.budget,value);assert.equal(review.origins.budget.turnId,'horizon');assert.equal(review.origins.budget.quote,q.message.text);
  assert.equal(requiredStaffingView(review).budgetPeriodReview,undefined);
 }
});

test('old turns and model-proposed restatements cannot confirm an existing ceiling for a new period',()=>{
 const q=seeded(),months=change(q,'months',12);
 const old={field:'budget',value:240000,basis:q.state.requiredStaffing.origins.budget};assert.throws(()=>editRequiredStaffing(q,'test-budget-period',[months,old]),/current user turn/);
 const proposed={field:'budget',value:240000,basis:{kind:'model-proposed',turnId:null,quote:null,explanation:'Assume ceiling applies'}};
 assert.throws(()=>editRequiredStaffing(q,'test-budget-period',[months,proposed]),/Confirm or clear/);
});

test('pending budget survives shared role entry and combined first role and horizon edit',()=>{
 for(const amount of [240000,0]){
  const q=seeded(amount,null),combined=edit(q,{role:'Clinical nurses',months:12});assert.equal(combined.inputs.role,'Clinical nurses');assert.equal(combined.inputs.budget,null);assert.deepEqual(combined.costBasis.budget,{amount,quotedMonths:null});
  const pending=edit(q,{months:12});q.state.requiredStaffing=pending;q.message={id:'role',text:'Clinical nurses'};
  const role=edit(q,{role:'Clinical nurses'});assert.deepEqual(role.costBasis.budget,pending.costBasis.budget);assert.deepEqual(role.origins.budget,pending.origins.budget);
 }
});

test('pending ceiling is visible in model feedback and shared prose and cannot recommend or save',()=>{
 const q=seeded(),review=edit(q,{months:12,hireCostPerPerson:100,hireReadyAfterMonths:0,hireTrainingHoursPerPerson:0,costsComplete:true});
 assert.ok(calculateRequiredStaffing(review.inputs).recommendation);
 const view=requiredStaffingView(review);assert.equal(view.recommendation,null);assert.deepEqual(view.budgetPeriodReview,{amount:240000,quotedMonths:null,currency:'GBP',costMonths:12});assert.match(view.missing.join(' '),/budget is retained.*unconfirmed/);
 const answer=requiredStaffingAnswer(review);assert.match(answer,/240,000 budget is retained/);assert.doesNotMatch(answer,/Recommendation:|lowest listed cash/);
 assert.throws(()=>requiredStaffingPlanFacts({version:1,review,optionId:view.options[0].id,deliveryTarget:null}),/Confirm the scenario budget/);
 q.state.requiredStaffing=review;q.message={id:'confirm',text:'The GBP 240000 budget covers those 12 months'};const confirmed=edit(q,{budget:240000});assert.equal(confirmed.inputs.budget,240000);assert.equal(confirmed.costBasis.budget.quotedMonths,12);assert.equal(confirmed.origins.budget.turnId,'confirm');assert.ok(requiredStaffingView(confirmed).recommendation);
});

test('editor confirmation and explicit clearing resolve pending funding without changing other premises',()=>{
 for(const amount of [240000,0]){
  const q=seeded(amount),pending=edit(q,{months:12});q.state.requiredStaffing=pending;q.message={id:'confirm-editor',text:'Edited assumptions'};
  const basis=structuredClone(pending.costBasis);basis.budget.quotedMonths=12;
  const confirmed=editRequiredStaffingLocally(q,'test-budget-period',JSON.stringify(pending),resolveRequiredStaffingCostBasis(pending.inputs,basis),basis);
  assert.equal(confirmed.inputs.budget,amount);assert.equal(confirmed.origins.budget.turnId,'confirm-editor');assert.equal(confirmed.inputs.months,12);assert.equal(confirmed.inputs.hireCostPerPerson,null);
  q.message={id:'clear',text:'Clear the budget'};const cleared=edit(q,{budget:null});assert.equal(cleared.inputs.budget,null);assert.equal(cleared.costBasis.budget.amount,null);assert.equal(requiredStaffingView(cleared).budgetPeriodReview,undefined);
 }
});

test('ordinary chat role and horizon continuation preserves deadline and visibly retains pending funding',async()=>{
 for(const amount of ['240k','0'])for(const role of ['nurses','people']){
  const first=await converseSolutions(request(`We need 4 ${role} within 6 months with a GBP ${amount} budget by hiring or training`),runtime,new AbortController().signal);
  const identity=role==='people'?await converseSolutions(follow(first,'Clinical nurses','role'),runtime,new AbortController().signal):first;
  assert.match(identity.state.questions[0],/cost horizon/);
  const q=follow(identity,'12 months','horizon'),before=structuredClone(q),reply=await converseSolutions(q,runtime,new AbortController().signal),review=reply.state.requiredStaffing;
  assert.deepEqual(q,before);assert.equal(review.inputs.budget,null);assert.equal(review.costBasis.budget.amount,amount==='0'?0:240000);assert.equal(review.costBasis.budget.quotedMonths,null);assert.equal(reply.state.staffingDeliveryTarget.months,6);
  assert.match(reply.answer,/budget is retained.*unconfirmed for 12 months/);assert.match(reply.answer,/editable staffing planner/);assert.doesNotMatch(reply.answer,/Other inputs are unchanged/);assert.deepEqual(reply.usage,{modelRounds:0,toolCalls:0});assert.deepEqual(readSolutionState(reply.state),reply.state);
 }
});

test('known-period budgets and no-budget first horizons retain prior behavior',()=>{
 const q=seeded(null),without=edit(q,{months:12});assert.equal(without.costBasis,undefined);assert.equal(without.inputs.budget,null);
 q.state.requiredStaffing=edit(q,{months:12,budget:240000});q.message={id:'count',text:'We need five nurses'};assert.equal(edit(q,{requiredRoles:5}).inputs.budget,240000);
 q.message={id:'new-period',text:'Use six months'};assert.throws(()=>edit(q,{months:6}),/explicitly restating/);
});

test('typed model-tool continuation shares the pending-budget guard and returns its review metadata',async()=>{
 const first=await converseSolutions(request('We need 4 nurses within 6 months with a GBP 240k budget by hiring or training'),runtime,new AbortController().signal);
 const q=follow(first,'Use a 12 month cost horizon','typed-horizon');let rounds=0;
 const final={answer:{discussionOnly:'The cost horizon is twelve months; funding needs review.'},candidateIds:[],analysisIds:[],verifiedMetrics:[],constraintUpdates:[],rejected:[],questions:[],focusCandidateId:null};
 const fake={...runtime,complete:async input=>{
  rounds++;
  if(rounds===1){const call={id:'period',name:'compare_required_staffing',arguments:JSON.stringify({changes:[change(q,'months',12)]})};return {items:[{type:'function_call',call_id:call.id,name:call.name,arguments:call.arguments}],calls:[call],text:'',completed:true};}
  assert.match(JSON.stringify(input),/budgetPeriodReview/);assert.match(JSON.stringify(input),/unconfirmed for 12 months/);
  return {items:[],calls:[],text:JSON.stringify(final),completed:true};
 }};
 const reply=await converseSolutions(q,fake,new AbortController().signal);assert.equal(rounds,2);assert.equal(reply.state.requiredStaffing.inputs.budget,null);assert.equal(reply.state.requiredStaffing.costBasis.budget.amount,240000);assert.equal(reply.state.staffingDeliveryTarget.months,6);assert.match(reply.answer,/budget is retained.*unconfirmed/);assert.doesNotMatch(reply.answer,/Recommendation:/);
});

test('missing and changed currency require current-user budget restatement or clearing, including pending quotes',()=>{
 for(const amount of [240000,0]){
  const q=seeded(amount);q.state.requiredStaffing.inputs.currency=null;delete q.state.requiredStaffing.origins.currency;
  assert.throws(()=>edit(q,{months:12,currency:'GBP'}),/retained budget.*new currency/);
  const confirmed=edit(q,{months:12,currency:'GBP',budget:amount});assert.equal(confirmed.inputs.budget,amount);assert.equal(confirmed.origins.budget.turnId,'horizon');
  const base=seeded(amount),pending=edit(base,{months:12});base.state.requiredStaffing=pending;base.message={id:'currency',text:'Change costs to EUR'};
  assert.throws(()=>edit(base,{currency:'EUR'}),/retained budget.*new currency/);assert.deepEqual(base.state.requiredStaffing,pending);
  const clear=edit(base,{currency:'EUR',budget:null});assert.equal(clear.inputs.budget,null);assert.equal(clear.costBasis?.budget.amount??null,null);
  const restated=edit(base,{currency:'EUR',budget:amount});assert.equal(restated.inputs.budget,amount);assert.equal(restated.origins.budget.turnId,'currency');
  const proposed={field:'budget',value:amount,basis:{kind:'model-proposed',turnId:null,quote:null,explanation:'Assume the same amount in EUR'}};
  assert.throws(()=>editRequiredStaffing(base,'test-budget-period',[change(base,'currency','EUR'),proposed]),/explicit user correction|Confirm or clear/);
 }
});
