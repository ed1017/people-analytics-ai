import test from 'node:test';
import assert from 'node:assert/strict';
import {buildHomePack} from '../lib/home-pack.mjs';
import {emptySolutionState,evaluateSolutionCandidate,editSolutionPlanningInputs,evaluateSolutionParameterEdit} from '../lib/home-solution-conversation.ts';
import {proposedPlanningEstimate} from '../lib/home-proposed-planning.ts';
async function fixture(){
 const request={version:1,requestId:'pilot-test',goal:{id:'',statement:''},scope:'All workforce',filters:{country:'all',org:'all',level:'all'},timeZone:'UTC',evidence:buildHomePack({},'All workforce'),goalContext:null,selectedId:null,catalog:null,state:emptySolutionState(),message:{id:'pilot-user',text:'How can we address the financial analysis skills gap?'}};
 const quantities=[['horizon_months',2,'months',null],['participants',10,'people','c1'],['hours_per_participant',6,'hours/person/total',null],['coordination_hours',12,'hours/total',null],['cash',500,'USD','c1']].map(([field,number,unit,target])=>({field,target,unit,kind:'model-proposed',number,text:null,source:null,factor:null,turnId:null,interpretation:'Explicitly hypothetical pilot design, not measured effectiveness.'}));
 const candidate={goal:{statement:'Address the financial analysis skills gap',turnId:request.message.id},id:'skills-pilot',base:null,name:'Assess and practise financial analysis',objective:'Assess and practise a role-relevant task',approach:'Assessment, practice and reassessment',rationale:'Pilot before extending training',tradeoffs:['No guaranteed proficiency gain'],nextStep:'Confirm the participants',successMeasure:'Review assessment results',activities:[{id:'c1',mode:'new',source:null,name:'Practice and feedback',domain:'learning',step:'Assess, practise and reassess',ownerRole:'Finance lead',evidenceIds:[],dependsOn:[],audienceOf:null,limitation:'Training outcomes remain unverified'}],quantities};
 const item=await evaluateSolutionCandidate(request,candidate,[]);assert.deepEqual(item.blocking,[]);assert.ok(item.draft);request.state.working=[item];request.message={id:'edit-user',text:'What if we double participants and allow three months?'};return {request,item};
}
test('shared action evaluator changes effort while retaining cash, strategy and original',async()=>{
 const {request,item}=await fixture(),original=structuredClone(item);
 assert.deepEqual(proposedPlanningEstimate(item.draft).hours,{min:72,max:72});
 const changed=await editSolutionPlanningInputs(request,item,[{field:'participants',target:'c1',value:20},{field:'horizon_months',target:null,value:3}]);
 assert.deepEqual(changed.blocking,[]);const e=proposedPlanningEstimate(changed.draft);assert.deepEqual(e.hours,{min:132,max:132});assert.equal(e.cash,500);assert.equal(e.months,3);assert.equal(e.laborCost,null);assert.deepEqual(item,original);assert.equal(changed.revision,item.revision+1);
});
test('unknown effort differs from zero and fractional month edits are rejected',async()=>{
 const {request,item}=await fixture();
 const unknown=await editSolutionPlanningInputs(request,item,[{field:'hours_per_participant',target:null,value:null}]);assert.equal(proposedPlanningEstimate(unknown.draft).hours,null);
 const zero=await editSolutionPlanningInputs(request,item,[{field:'hours_per_participant',target:null,value:0}]);assert.deepEqual(proposedPlanningEstimate(zero.draft).hours,{min:12,max:12});
 const invalid=await editSolutionPlanningInputs(request,item,[{field:'horizon_months',target:null,value:2.5}]);assert.ok(invalid.blocking.length);
});
test('ordinary what-if parameter contract shares the exact editor calculation',async()=>{
 const {request,item}=await fixture();
 for(const text of ['What if we use 15 participants?','Keep everything else; change the group to 15 people.','Could this work with fifteen people instead?']){
 request.message={id:'follow-up',text};
 const local=await editSolutionPlanningInputs(request,item,[{field:'participants',target:'c1',value:15}]);
 const interpreted=await evaluateSolutionParameterEdit(request,{id:item.id,source:{kind:'working',id:item.id,revision:item.revision},quantities:[{field:'participants',target:'c1',unit:'people',kind:'literal',number:15,text:null,source:null,factor:null,turnId:request.message.id,interpretation:'User asks for fifteen participants.'}]},[]);
 assert.deepEqual(proposedPlanningEstimate(interpreted.draft).hours,proposedPlanningEstimate(local.draft).hours);assert.equal(proposedPlanningEstimate(interpreted.draft).cash,500);
 }
 // This verifies interpreted-parameter replay, not fresh model interpretation of prose.
});

test('clearing the last proposed input still has an unknown-safe editable estimate',async()=>{
 const {item}=await fixture(),draft=structuredClone(item.draft);
 for(const row of [draft.inputs.scope.months,...draft.inputs.groups.map(g=>g.count),draft.inputs.deliveryEstimate.hoursPerParticipant,draft.inputs.deliveryEstimate.coordinationHours,...draft.inputs.expenses.flatMap(e=>[e.amount,e.months])]){row.value=null;row.kind='unknown';row.basis='';}
 assert.equal(proposedPlanningEstimate(draft),null);const estimate=proposedPlanningEstimate(draft,true);assert.equal(estimate.hours,null);assert.equal(estimate.cash,null);assert.equal(estimate.months,null);
});
