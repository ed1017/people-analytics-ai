import test from 'node:test';import assert from 'node:assert/strict';
import {createSwpDemo} from '../lib/swp-demo.ts';
import {guidedBusinessPlanning} from '../lib/guided-business-planning.ts';
import {businessPlanningView} from '../lib/home-business-planning.ts';
test('compact model projection preserves every provenance basis and monthly value without changing saved state',async()=>{
 const state=guidedBusinessPlanning(await createSwpDemo('guided-model-view','2026-10-22T15:00:00Z'),'test-token'),before=structuredClone(state),view=businessPlanningView(state,'request',1);
 const expand=v=>v&&typeof v==='object'?Object.keys(v).join()==='basisRef'?view.bases[v.basisRef]:Array.isArray(v)?v.map(expand):Object.fromEntries(Object.entries(v).map(([k,value])=>[k,expand(value)])):v;
 assert.deepEqual(expand(view.demandProposal.spec),state.review.spec);
 assert.deepEqual(expand(view.staffing.inputs),state.staffing.inputs.values);
 for(const option of view.staffing.result.options){const original=state.staffing.result.options.find(o=>o.id===option.id);assert.equal('input' in option,false);assert.deepEqual(option.monthly.map(row=>Object.fromEntries(view.staffing.result.monthlyColumns.map((key,i)=>[key,row[i]]))),original.monthly);assert.equal(option.cash,original.cash);assert.equal(option.shortfallHours,original.shortfallHours);}
 assert.deepEqual(state,before);assert.equal(view.accepted,false);assert.equal(view.saved,false);
});
