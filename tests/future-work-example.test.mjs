import test from 'node:test';
import assert from 'node:assert/strict';
import {futureWorkDefaults,calculateFutureWork,acceptFutureWorkReview} from '../lib/future-work-example.ts';
import {capacitySpec} from '../lib/swp-capacity-draft.ts';
import {calculateMonthlyWorkload} from '../lib/swp-monthly-workload.ts';
import {prepareCapacityRecord,readCapacityRecord,capacityRecordIsCurrent} from '../lib/swp-capacity-record.ts';
import {calculateCapacityCost,capacityCostAssumptions} from '../lib/swp-capacity-cost.ts';
import {readCapacityChatContext} from '../lib/capacity-chat-context.ts';
const example=(patch={})=>calculateFutureWork({...futureWorkDefaults,...patch});
test('task exposure, saving, adoption, realization and release are distinct stages; effort applied once',()=>{
 const r=example();assert.deepEqual([r.baseline,r.exposed,r.potential,r.adopted,r.modeled,r.reassignable],[1600,640,320,160,128,64]);assert.equal(r.netEffort,.92);
 for(const p of r.result.points){assert.equal(p.workloadHours,1472);assert.equal(p.requiredFte,9.2);assert.equal(p.headcount,10);assert.equal(p.contractedFte,10);assert.equal(p.allocatedFte,10);assert.equal(p.capacityHours,1600);}
 assert.equal(r.draft.productivity,'0');assert.equal(r.draft.confirmed,false);assert.equal(r.draft.costRate,'');
 assert.equal(example({release:'0'}).netEffort,.92);assert.equal(example({release:'100'}).reassignable,128);
 for(const field of ['exposure','saving','adoption','realization'])assert.equal(example({[field]:'0'}).netEffort,1);
 assert.equal(example({exposure:'100',saving:'100',adoption:'100',realization:'100'}).netEffort,0);
 const fractional=example({effort:'1.23',exposure:'33.33',saving:'33.33',adoption:'33.33',realization:'33.33'});assert.ok(fractional.netEffort>=1.23*(1-(.3333**4)));
});
test('unknown and invalid inputs block handoff, and stale input/context/session reviews are rejected',()=>{
 for(const patch of [{adoption:''},{exposure:'101'},{saving:'-1'},{effort:'NaN'},{months:'1.5'},{openingDate:'2026-10-15'},{scope:''}])assert.throws(()=>example(patch));
 const i={...futureWorkDefaults},key=JSON.stringify(i);assert.deepEqual(acceptFutureWorkReview(i,key,'goal-a','goal-a','original','original'),example().draft);
 for(const args of [[{...i,adoption:'0'},key,'a','a','s','s'],[i,key,'a','b','s','s'],[i,key,'a','a','s','changed']])assert.throws(()=>acceptFutureWorkReview(...args),/changed/);
});
test('existing save/read contract retains bounded origin without reapplying it after edits',()=>{
 const draft={...example().draft,confirmed:true};const result=calculateMonthlyWorkload(capacitySpec(draft)),cost=calculateCapacityCost(result,capacityCostAssumptions(''));
 const binding={datasetToken:'legacy-v1:0',goalId:'goal-a',goal:'Explore fictional service tasks',scopeId:'scope-a',scopeLabel:draft.scope,workUnit:draft.scope};
 const record=prepareCapacityRecord({draft,result,cost,error:''},binding,{id:'future-a',name:'Fictional task scenario',createdAt:'2026-10-16T12:00:00.000Z'});
 assert.deepEqual(readCapacityRecord(record,binding),record);assert.ok(capacityRecordIsCurrent(record,binding,draft));assert.match(record.inputs.months[0].hoursPerUnit.basis.note,/adoption 50%/);
 const changed={...draft,effort:'1'};assert.equal(calculateMonthlyWorkload(capacitySpec(changed)).points[0].requiredFte,10);assert.equal(capacityRecordIsCurrent(record,binding,changed),false);
 assert.doesNotThrow(()=>readCapacityChatContext({version:1,datasetToken:'legacy-v1:0',goalId:'goal-a',goal:binding.goal,draft,scenario:null},{datasetToken:'legacy-v1:0',goalId:'goal-a',goal:binding.goal}));
 for(const sourceNote of [null,3,'x'.repeat(301),''])assert.throws(()=>capacitySpec({...draft,sourceNote}));
});
