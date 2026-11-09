import test from 'node:test';
import assert from 'node:assert/strict';
import {normalStaffingIntake,staffingInputQuestion} from '../lib/normal-staffing-intake.ts';
import {emptySolutionState} from '../lib/home-solution-conversation.ts';
import {emptyRequiredStaffing} from '../lib/required-staffing.ts';
const request=text=>({goal:{id:'',statement:''},selectedId:null,catalog:null,goalContext:null,state:emptySolutionState(),message:{id:'request',text}});
test('realistic initial role requests retain only explicit facts and open unknown inputs',()=>{
 for(const text of ['We need 4 nurses within 6 months. Should we hire, upskill, or transfer internally?','I need four registered nurses in six months. Compare hiring, training and internal transfers','Help us fill 4 nurses within 6 months by hiring/training/redeploying']){
  const before=request(text),result=normalStaffingIntake(before);assert.ok(result,text);assert.equal(result.inputs.requiredRoles,4);assert.match(result.inputs.role,/nurses/);assert.equal(result.deliveryMonths,6);assert.equal(result.inputs.months,null);assert.equal(result.inputs.hireCostPerPerson,null);assert.equal(result.inputs.budget,null);assert.equal(result.inputs.trainablePeople,null);assert.match(result.answer,/cost horizon/);assert.doesNotMatch(result.answer,/Service Analyst|325,000|12-month|calculated.*cost/);assert.deepEqual(before,request(text));
 }
});
test('cost horizon, budget and currency stay separate from delivery',()=>{
 const result=normalStaffingIntake(request('Fill 3 data analysts over 12 months with a EUR 240k budget by hiring/training/redeploying'));assert.ok(result);assert.equal(result.inputs.months,12);assert.equal(result.deliveryMonths,null);assert.equal(result.inputs.currency,'EUR');assert.equal(result.inputs.budget,240000);assert.equal(result.inputs.hireCostPerPerson,null);
 const generic=normalStaffingIntake(request('We need five people. Should we hire or train?'));assert.equal(generic.inputs.role,null);assert.match(generic.questions[0],/Which role/);
});
test('extra clauses and unsupported interpretations stay in the full conversation',()=>{
 for(const text of ['We need 4 nurses by May 2027. Should we hire or train?','We need 4 nurses within 6 months. Should we hire or train? Do not use assumptions.','We need 4 nurses and 3 analysts. Should we hire or train?','We need 2.5 FTE nurses. Should we hire or train?','We need 21 nurses. Should we hire or train?','We need 4 nurses with a $240k budget. Should we hire or train?','We do not need 4 nurses. Should we hire or train?','How many nurses do we need?','We need 4 nurses within 6 months? Should we hire or train?','We need 4 nurses over 30 months. Should we hire or train?','We need 4 nurses for Canada. Should we hire or train?','We need 4 nurses. Should we hire or train and rank employees?'])assert.equal(normalStaffingIntake(request(text)),null,text);
});
test('retained conversations, saved goals, planning contexts and local drafts are never reseeded',()=>{
 const text='We need 4 nurses. Should we hire or train?';
 for(const patch of [r=>r.goal.id='existing',r=>r.goal.statement='Existing goal',r=>r.catalog={},r=>r.goalContext={},r=>r.selectedId='plan',r=>r.state.turns.push({id:'prior',role:'user',text:'Earlier'}),r=>r.state.questions=['Earlier'],r=>r.state.requiredStaffing={},r=>r.state.hiringBudget={},r=>r.state.businessPlanning={},r=>r.progressEntry={},r=>r.goalProgress={goalId:'saved',ledger:{}}]){const r=request(text);patch(r);assert.equal(normalStaffingIntake(r),null);}
});
test('one useful missing-input question is asked without filling remaining values',()=>{
 const input=emptyRequiredStaffing();assert.match(staffingInputQuestion(input),/Which role/);input.role='Nurses';assert.match(staffingInputQuestion(input),/How many/);input.requiredRoles=4;assert.match(staffingInputQuestion(input),/cost horizon/);input.months=6;assert.match(staffingInputQuestion(input),/currency/);input.currency='GBP';assert.match(staffingInputQuestion(input),/hire cost/);assert.equal(input.hireCostPerPerson,null);
});

import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {buildHomePack} from '../lib/home-pack.mjs';
import {readSolutionState} from '../lib/home-solution-conversation.ts';
import {calculateRequiredStaffing,defaultRequiredStaffingCostBasis} from '../lib/required-staffing.ts';
import {editRequiredStaffingLocally} from '../lib/home-required-staffing.ts';
const fullRequest=text=>({...request(text),state:readSolutionState(emptySolutionState()),version:1,requestId:'normal-intake',scope:'Company-wide',filters:{country:'all',org:'all',level:'all'},timeZone:'UTC',evidence:buildHomePack({},'Company-wide',text)});
const noProvider={natural:{datasetToken:'test-normal'},complete:()=>assert.fail('No provider calls permitted'),loadProjection:()=>assert.fail('No projection call permitted')};
test('actual conversation returns editable sparse review, roundtrips state and preserves delivery separately',async()=>{
 const q=fullRequest('We need 4 registered nurses within 6 months. Should we hire, upskill, or transfer internally?'),before=JSON.stringify(q);
 const reply=await converseSolutions(q,noProvider,new AbortController().signal);
 assert.deepEqual(reply.usage,{modelRounds:0,toolCalls:0});assert.equal(reply.state.requiredStaffing.inputs.months,null);assert.equal(reply.state.staffingDeliveryTarget.months,6);assert.deepEqual(reply.state.currentCalculationKinds,['required-staffing']);assert.equal(reply.state.requiredStaffing.origins.role.quote,q.message.text);assert.deepEqual(readSolutionState(reply.state),reply.state);assert.equal(JSON.stringify(q),before);
 const checked=calculateRequiredStaffing(reply.state.requiredStaffing.inputs);assert.equal(checked.recommendation,null);assert.equal(checked.options[0].completeCash,null);assert.equal(reply.state.working.length,0);
});
test('unknown role and currency can be completed locally with provenance and no rates invented',async()=>{
 const q=fullRequest('We need five people. Should we hire or train?');
 const reply=await converseSolutions(q,noProvider,new AbortController().signal),review=reply.state.requiredStaffing;
 const editorRequest={...q,state:reply.state,message:{id:'editor',text:'Edited assumptions'}};
 const input={...review.inputs,role:'Clinical nurses',currency:'GBP',months:12};
 const updated=editRequiredStaffingLocally(editorRequest,'test-normal',JSON.stringify(review),input,defaultRequiredStaffingCostBasis(input));
 assert.equal(updated.inputs.role,'Clinical nurses');assert.equal(updated.inputs.currency,'GBP');assert.equal(updated.inputs.hireCostPerPerson,null);assert.equal(updated.origins.role.kind,'user-supplied');assert.equal(review.inputs.role,null);
 assert.throws(()=>editRequiredStaffingLocally(editorRequest,'test-normal','stale',input),/changed/);
});
test('an aborted request never captures partial intake',async()=>{
 const q=fullRequest('We need 4 nurses. Should we hire or train?'),before=JSON.stringify(q),c=new AbortController();c.abort();await assert.rejects(converseSolutions(q,noProvider,c.signal));assert.equal(JSON.stringify(q),before);
});

test('alternate phrasing uses the full typed model path and still cannot return invented calculator totals',async()=>{
 const q=fullRequest('We need 4 nurses in Canada within 6 months. Compare hiring and upskilling, without assuming costs.');assert.equal(normalStaffingIntake(q),null);
 const final={answer:{discussionOnly:'Which cost period should we compare? The entered need is not verified availability.'},candidateIds:[],analysisIds:[],verifiedMetrics:[],constraintUpdates:[],rejected:[],questions:['Which cost period should we compare?'],focusCandidateId:null};
 let rounds=0;
 const runtime={...noProvider,complete:async()=>{rounds++;if(rounds===1){const call={id:'typed',name:'compare_required_staffing',arguments:JSON.stringify({changes:[['role','Nurses in Canada'],['requiredRoles',4]].map(([field,value])=>({field,value,basis:{kind:'user-supplied',turnId:q.message.id,quote:q.message.text,explanation:'Interpreted from the explicit request; no availability or rate inferred.'}}))})};return {items:[{type:'function_call',call_id:call.id,name:call.name,arguments:call.arguments}],calls:[call],text:'',completed:true};}return {items:[],calls:[],text:JSON.stringify(final),completed:true};}};
 const reply=await converseSolutions(q,runtime,new AbortController().signal);assert.equal(rounds,2);assert.equal(reply.state.requiredStaffing.inputs.role,'Nurses in Canada');assert.equal(reply.state.requiredStaffing.inputs.hireCostPerPerson,null);assert.equal(reply.state.staffingDeliveryTarget.months,6);assert.match(reply.answer,/Unknown|unknown/);
 await assert.rejects(converseSolutions(q,{...noProvider,complete:async()=>({items:[],calls:[],text:JSON.stringify(final),completed:true})},new AbortController().signal),/not calculated/);
});
test('inline staffing choices and questioned requirements agree with the retained deadline',async()=>{
 for(const [text,months,costMonths] of [['Fill 4 nurses within 6 months by hiring or training',6,null],['Fill 4 nurses over 12 months by upskilling or recruiting',null,12]]){
  const result=await converseSolutions(fullRequest(text),noProvider,new AbortController().signal);assert.equal(result.state.staffingDeliveryTarget?.months??null,months);assert.equal(result.state.staffingDeliveryTarget?.issue??null,null);assert.equal(result.state.requiredStaffing.inputs.months,costMonths);
 }
 assert.equal(normalStaffingIntake(request('We need 4 nurses within 6 months? Should we hire or train?')),null);
});
