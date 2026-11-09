import test from 'node:test';
import assert from 'node:assert/strict';
import {hasExplicitStaffingRequirement,requiresRequiredStaffing,canCompleteRequiredStaffingAlone,requiredStaffingInstructions,canFillStaffingIdentity,editRequiredStaffing,editRequiredStaffingLocally} from '../lib/home-required-staffing.ts';
import {captureStaffingDelivery,readStaffingDeliveryCapture} from '../lib/home-staffing-delivery.ts';
import {emptyRequiredStaffing,defaultRequiredStaffingCostBasis} from '../lib/required-staffing.ts';
import {solutionConversationInstructions} from '../lib/home-solution-conversation-schema.ts';
const request=(text,state={})=>({message:{id:'u2',text},state});
test('normal fixed-role requests recognize roles and strategy synonyms without enabling the demo fast path',()=>{
 for(const text of ['We need 8 customer support agents within 3 months. Compare hiring and upskilling.','Help us fill six registered nurses by hiring or internal transfers.','We require 4 senior data scientists. Compare recruiting, training and redeployment.','We need 5 account managers. What are my options for hiring or upskilling?','We need 3 cybersecurity specialists over 6 months. Compare hiring and transferring internally.']){
  assert.equal(hasExplicitStaffingRequirement(text),true,text);
  assert.equal(requiresRequiredStaffing(request(text)),true,text);
  assert.equal(canCompleteRequiredStaffingAlone(request(text)),false,text);
 }
});
test('non-people quantities, factual requests, negation and no-plan boundaries do not force a comparison',()=>{
 for(const text of ['We need 8 months to compare hiring and training.','We need 10 tickets per hour. Compare hiring and training.','We need 8 training hours for agents. Compare hiring and training.','We need 8 months for agents. Compare hiring and training.','We need 8 tickets handled by agents. Compare hiring and training.','We do not need 8 agents. Compare hiring and training.','We don\u2019t need 8 agents. Compare hiring and training.','We no longer require 8 agents. Compare hiring and training.','Explain only: we need 8 agents by hiring or training.','Do not compare hiring and training for the 8 agents we need.','What is upskilling? We need 8 agents and are hiring.','If we need 8 agents, compare hiring and training.'])assert.equal(requiresRequiredStaffing(request(text)),false,text);
 assert.equal(hasExplicitStaffingRequirement('Need 8 agents and do not save anything.'),true);
});
test('named current edits remain bound; ambiguous stale references do not force the retained calculator',()=>{
 const state={requiredStaffing:{},currentCalculationKinds:['required-staffing']};
 for(const text of ['Recalculate the totals.','Change training cost to USD 2000.','Update the internal transfer cost.'])assert.equal(requiresRequiredStaffing(request(text,state)),true,text);
 for(const text of ['Explain the staffing comparison.','Do not change training costs.','Change that budget.','Set that to 4 months.'])assert.equal(requiresRequiredStaffing(request(text,state)),false,text);
 assert.equal(requiresRequiredStaffing(request('Compare options.',{...state,hiringBudget:{}})),false);
 assert.equal(requiresRequiredStaffing(request('Compare options.',{...state,currentCalculationKinds:['hiring-budget']})),false);
 assert.equal(requiresRequiredStaffing(request('Recalculate the staffing comparison.',{...state,hiringBudget:{}})),true);
});
test('new roles share deadline detection while cost periods, dates and readiness retain their semantics',()=>{
 for(const role of ['customer support agents','registered nurses','senior data scientists']){
  assert.equal(captureStaffingDelivery({id:'u1',text:`We need 8 ${role} within 3 months.`})?.months,3);
  assert.equal(captureStaffingDelivery({id:'u1',text:`We need 8 ${role} over 12 months.`}),null);
 }
 assert.equal(captureStaffingDelivery({id:'u1',text:'Training is ready in 3 months.'}),null);
 const ambiguous=captureStaffingDelivery({id:'u1',text:'We need 8 nurses within 3 or 6 months.'});assert.ok(ambiguous.issue);assert.equal(ambiguous.months,null);
});
function localRequest(values={}){
 const req={goal:{id:'g',statement:'Staff support'},scope:'All',filters:{org:'all'},state:{turns:[]},message:{id:'u1',text:'Explicit test staffing inputs'}};
 const basis={kind:'user-supplied',turnId:'u1',quote:req.message.text,explanation:'Test supplied inputs.'};
 req.state.requiredStaffing=editRequiredStaffing(req,'test',Object.entries({...emptyRequiredStaffing(),requiredRoles:8,...values}).filter(([,v])=>v!==null).map(([field,value])=>({field,value,basis})));
 req.message={id:'u2',text:'UI edit'};return req;
}
const edit=(req,patch,basis)=>editRequiredStaffingLocally(req,'test',JSON.stringify(req.state.requiredStaffing),{...req.state.requiredStaffing.inputs,...patch},basis);
test('initial unknown role and currency can be explicitly filled without supplying sample premises',()=>{
 const req=localRequest(),before=structuredClone(req.state.requiredStaffing),next=edit(req,{role:'Support agent',currency:'GBP'});
 assert.equal(next.inputs.role,'Support agent');assert.equal(next.inputs.currency,'GBP');assert.equal(next.inputs.requiredRoles,8);
 for(const field of ['budget','hireCostPerPerson','trainablePeople','redeployablePeople','months'])assert.equal(next.inputs[field],null);
 assert.equal(next.origins.role.turnId,'u2');assert.deepEqual(req.state.requiredStaffing,before);
 assert.throws(()=>editRequiredStaffingLocally(req,'test','stale',next.inputs),/changed/);
});
test('identity edits cannot silently rebase prior costs, internal pools or saved cost bases',()=>{
 for(const values of [{role:'Analyst'},{currency:'USD'},{budget:0},{hireCostPerPerson:0},{trainablePeople:0},{redeployablePeople:1},{trainingHoursPerPerson:0},{hireReadyAfterMonths:1}])assert.throws(()=>edit(localRequest(values),{role:'Nurse',currency:'GBP'}),/scope/);
 const req=localRequest(),basis=defaultRequiredStaffingCostBasis(req.state.requiredStaffing.inputs);basis.rates.hireCostPerPerson={kind:'annual',amount:100000,quotedMonths:12,fullPeriod:false};
 req.state.requiredStaffing=edit(req,{},basis);req.message.id='u3';
 assert.equal(req.state.requiredStaffing.inputs.hireCostPerPerson,null);assert.throws(()=>edit(req,{currency:'GBP'}),/scope/);
});
test('normal model guidance preserves unknowns and sends staffing to the editable native review',()=>{
 assert.match(requiredStaffingInstructions,/never import sample figures/);assert.match(requiredStaffingInstructions,/editable planner/);assert.match(requiredStaffingInstructions,/delivery deadline from cost horizon/);
 assert.match(solutionConversationInstructions,/never substitute example roles/);assert.match(solutionConversationInstructions,/not FTE/);
});


test('fully recognized trailing strategy choices do not become conflicting deadlines',()=>{
 for(const suffix of ['by hiring or training','by upskilling or recruiting','by internal transfers or hiring','via recruiting, training and redeployment','using hiring/training/redeployment']){
  const text=`Fill 4 nurses within 6 months ${suffix}`;
  const captured=captureStaffingDelivery({id:'u1',text});
  assert.equal(captured?.months,6,text);assert.equal(captured.issue,null,text);assert.equal(captured.quote,text);assert.deepEqual(readStaffingDeliveryCapture(captured),captured);
  assert.equal(captureStaffingDelivery({id:'u1',text:`Fill 4 nurses over 12 months ${suffix}`}),null,suffix);
 }
});
test('strategy suffix handling retains timing ambiguity, unsupported fragments and calendar semantics',()=>{
 for(const text of ['Fill 4 nurses within 3 or 6 months by hiring or training','Fill 4 nurses within 3 months and 6 months by upskilling or recruiting','Fill 4 nurses within 6 months by hiring or outsourcing','Fill 4 nurses within 6 months by hiring or training if funding is approved','Fill 4 nurses within 6 months by hiring or training or magic','Can we fill 4 nurses within 6 months by hiring or training?']){
  const captured=captureStaffingDelivery({id:'u1',text});assert.ok(captured?.issue,text);assert.equal(captured.months,null,text);assert.equal(captured.quote,text);
 }
 const text='Fill 4 nurses by June 2027 by upskilling or recruiting';
 assert.deepEqual(captureStaffingDelivery({id:'u1',text}),{months:null,turnId:'u1',quote:text,issue:null});
});

test('identity availability helper matches local missing-identity controls',()=>{
 assert.equal(canFillStaffingIdentity(localRequest().state.requiredStaffing),true);
 for(const values of [{budget:0},{trainingHoursPerPerson:0},{internalRelease:false},{trainablePeople:0}])assert.equal(canFillStaffingIdentity(localRequest(values).state.requiredStaffing),false);
});
