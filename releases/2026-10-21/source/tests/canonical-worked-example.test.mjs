import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {guidedExample,guidedExampleCapacityDraft,guidedWorkloadResult} from '../lib/guided-workload.ts';
import {createSwpDemo} from '../lib/swp-demo.ts';
import {syntheticCapacityDraft,syntheticCapacityCalculation} from '../lib/synthetic-capacity-risk.ts';
import {capacitySpec} from '../lib/swp-capacity-draft.ts';
import {calculateMonthlyWorkload} from '../lib/swp-monthly-workload.ts';

test('new guided, Scenarios and Overview examples share scope, units and five-FTE starting gap',async()=>{
 const draft=await createSwpDemo('guided-canonical-example','2026-10-27T12:00:00.000Z'),workload=guidedWorkloadResult(draft.inputs),monthly=guidedExampleCapacityDraft();
 assert.equal(draft.inputs.scope.population.value,guidedExample.scope);assert.equal(draft.inputs.scope.businessUnit.value,guidedExample.businessUnit);assert.equal(draft.inputs.scope.jobProfile.value,guidedExample.role);
 assert.equal(draft.inputs.budget.amount.value,325000);assert.equal(draft.inputs.scope.months.value,12);
 assert.equal(workload.availableFte,3);assert.equal(workload.additionalRoles,5);
 assert.deepEqual(syntheticCapacityDraft(),monthly);assert.equal(monthly.months,'3');assert.equal(monthly.costRate,'');assert.equal(monthly.allocation,'30');
 assert.match(monthly.sourceNote,/50% allocation x 60% proficiency/);assert.ok(monthly.sourceNote.length<=300);
 for(const p of syntheticCapacityCalculation(monthly).points){assert.equal(p.allocatedFte,3);assert.equal(p.requiredFte,8);assert.equal(p.gapFte,5);}
 const landing=fs.readFileSync(new URL('../components/workforce-planning/planning-landing.tsx',import.meta.url),'utf8');assert.match(landing,/guidedExampleCapacityDraft\(\)/);assert.doesNotMatch(landing,/people:'40'|volume:'8000'/);
});

test('legacy four-FTE service-desk input remains an unchanged valid calculation',()=>{
 const legacy={scope:'Service desk - tickets',openingDate:'2026-09-30',months:'6',people:'40',fte:'40',volume:'8000',effort:'1',hours:'160',hires:'2',exits:'1',hireFte:'1',exitFte:'1',allocation:'100',productivity:'0',costRate:'',fullTimeMovements:true,confirmed:true};
 const before=JSON.stringify(legacy),result=calculateMonthlyWorkload(capacitySpec(legacy));guidedExampleCapacityDraft();
 assert.equal(result.points.at(-1).gapFte,4);assert.equal(JSON.stringify(legacy),before);assert.deepEqual(JSON.parse(JSON.stringify(legacy)),legacy);
});

import {DecisionStore,encodeDecisions} from '../lib/local-decisions.ts';
import {capacityBinding,saveCapacityScenario,openCapacityScenario} from '../lib/swp-capacity-store.ts';
import {calculateCapacityCost,capacityCostAssumptions,capacityCalculationKey} from '../lib/swp-capacity-cost.ts';
test('saved legacy four-FTE and Client Operations scenarios retain exact inputs and prior revisions',()=>{
 const context={datasetToken:'legacy-v1:0',goalId:'legacy',goal:'Existing saved work'},at='2026-10-27T12:00:00.000Z';
 let raw=encodeDecisions({version:1,revision:1,goals:{version:1,activeId:'legacy',goals:[{id:'legacy',statement:context.goal}]},workspaces:{legacy:{savedAt:at,fields:{priorPlan:{id:'keep'}}}}});
 const store=new DecisionStore();store.initialize({getItem:()=>raw,setItem:(k,v)=>{raw=v;},removeItem:()=>{}});
 const inputs=[{...guidedExampleCapacityDraft(),scope:'Service desk - tickets',months:'6',people:'40',fte:'40',volume:'8000',hires:'2',exits:'1',allocation:'100',sourceNote:undefined,confirmed:true},{...guidedExampleCapacityDraft(),scope:'Fictional Client Operations / Client Operations Specialist - service units',sourceNote:'Synthetic ClientOps workload v1; original saved assumptions.',confirmed:true}];
 delete inputs[0].sourceNote;
 for(const [i,draft] of inputs.entries()){
  const scope={id:'legacy-'+i,label:draft.scope,workUnit:draft.scope},result=calculateMonthlyWorkload(capacitySpec(draft)),cost=calculateCapacityCost(result,capacityCostAssumptions(draft.costRate));
  saveCapacityScenario({store,context,scope,capture:{inputKey:capacityCalculationKey(result,cost),binding:capacityBinding(context,scope)},session:{draft,result,cost,error:''},name:'Original '+i,id:'original-'+i,at,revision:store.getSnapshot().data.revision,assertActive:()=>{}});
 }
 const before=JSON.stringify(store.getSnapshot().data);guidedExampleCapacityDraft();
 delete inputs[0].sourceNote;
 for(const [i,draft] of inputs.entries()){
  const opened=openCapacityScenario(store,context,'original-'+i,store.getSnapshot().data.revision,()=>{});
  assert.equal(JSON.stringify(opened.entry.draft),JSON.stringify(draft));assert.equal(opened.entry.record.result.points.at(-1).gapFte,i===0?4:5);
 }
 assert.equal(JSON.stringify(store.getSnapshot().data),before);assert.deepEqual(store.getSnapshot().data.workspaces.legacy.fields.priorPlan,{id:'keep'});
});
