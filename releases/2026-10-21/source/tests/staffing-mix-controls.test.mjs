import {PUBLIC_9037} from '../lib/public-9037-contract.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {createSwpDemo} from '../lib/swp-demo.ts';
import {guidedBusinessPlanning} from '../lib/guided-business-planning.ts';
import {selectBusinessPlanningMix,readBusinessPlanning,businessPlanningView} from '../lib/home-business-planning.ts';
import {prepareBusinessPlanningSelection} from '../lib/home-business-planning-save.ts';
const initial=async()=>guidedBusinessPlanning(await createSwpDemo('guided-mixed-control-test','2026-10-22T15:00:00Z'),PUBLIC_9037.token);
test('explicit mix recalculates through the shared calculator, persists and saves even outside original six',async()=>{
 const base=await initial(),mix={build:2,move:1,buy:2},next=selectBusinessPlanningMix(base,mix);
 assert.equal(base.staffing.result.options.some(o=>o.mix.build===mix.build&&o.mix.move===mix.move&&o.mix.buy===mix.buy),false);assert.equal(next.staffing.result.options.length,1);assert.deepEqual(next.staffing.result.options[0].mix,mix);
 assert.deepEqual(readBusinessPlanning(JSON.parse(JSON.stringify(next))),next);
 assert.deepEqual(next.staffing.inputs,base.staffing.inputs);
 assert.match(businessPlanningView(next,'r',1).staffing.decisionTradeoffs,/not an optimized recommendation/);
 const saved=await prepareBusinessPlanningSelection(next,next.staffing.result.options[0].id);
 assert.equal(saved.result.cashEstimate.cash,next.staffing.result.options[0].cash);
 assert.equal(saved.draft.inputs.capacity.input.build,'2');assert.equal(saved.draft.inputs.capacity.input.move,'1');assert.equal(saved.draft.inputs.capacity.input.buy,'2');
 assert.deepEqual(selectBusinessPlanningMix(next,null),base);
 assert.notEqual(JSON.stringify(next),JSON.stringify(base));
});
test('invalid allocations and missing internal premises cannot become selected plans',async()=>{
 const base=await initial();for(const mix of [{build:4,move:0,buy:1},{build:1,move:1,buy:1},{build:.5,move:.5,buy:4},{build:-1,move:1,buy:5}])assert.throws(()=>selectBusinessPlanningMix(base,mix));
 const tampered=selectBusinessPlanningMix(base,{build:1,move:1,buy:3});tampered.staffing.result.options[0].cash=0;assert.throws(()=>readBusinessPlanning(tampered));
 const missing=structuredClone(base);missing.staffing.inputs.values.internalRelease={value:null,basis:{kind:'unknown',turnId:null,quote:null,explanation:'Not supplied.'}};
 // First reconstruct the unselected comparison using its current premises.
 const {calculateServiceStaffing}=await import('../lib/home-service-staffing.ts');missing.staffing.result=calculateServiceStaffing(missing.review,missing.staffing.inputs);
 assert.throws(()=>selectBusinessPlanningMix(missing,{build:1,move:1,buy:3}));
});

test('malformed selection metadata cannot be persisted',async()=>{const base=await initial();for(const selectedMix of [null,{build:1,move:1,buy:3,extra:1},{build:'1',move:1,buy:3}])assert.throws(()=>readBusinessPlanning({...base,staffing:{...base.staffing,selectedMix}}));});

test('ordinary staffing revision clears a prior mix selection',async()=>{
 const {runBusinessPlanningTool}=await import('../lib/home-business-planning.ts');const {demandReferenceId}=await import('../lib/swp-demand-reference.ts');
 const base=selectBusinessPlanningMix(await initial(),{build:2,move:1,buy:2});const request={requestId:'revision-test',state:{turns:[]},message:{id:'change-fee',text:'Set recruitment fee to 2000.'}};
 const next=await runBusinessPlanningTool(request,PUBLIC_9037.token,base,'compare_service_staffing',{reviewRef:demandReferenceId(request.requestId,0),changes:[{field:'hireFee',value:2000,basis:{kind:'user-supplied',turnId:request.message.id,quote:request.message.text,explanation:'Explicit test correction.'}}]},0);
 assert.equal(next.staffing.selectedMix,undefined);assert.equal(next.staffing.inputs.values.hireFee.value,2000);assert.ok(next.staffing.result.options.length>1);
});

test('an adjusted mix does not invent an unknown affordability ceiling',async()=>{
 const draft=await createSwpDemo('guided-unknown-budget','2026-10-22T15:00:00Z');draft.inputs.budget.amount={value:null,kind:'unknown',basis:null};
 const base=guidedBusinessPlanning(draft,PUBLIC_9037.token),next=selectBusinessPlanningMix(base,{build:2,move:1,buy:2});assert.equal(next.review.spec.budgetUsd.value,null);assert.equal(next.staffing.result.options[0].status,'unknown');assert.ok(next.staffing.result.options[0].cash>0);
});
