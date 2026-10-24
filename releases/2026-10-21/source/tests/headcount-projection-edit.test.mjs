import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateHeadcountProjection,readHeadcountProjections} from '../lib/home-solution-projection.ts';
import {previewProjectionEdit,projectionEditFields,verifyProjectionEditSource} from '../lib/headcount-projection-edit.ts';
const inputs={asOf:'2026-09-30',opening:100,filters:{country:'all',org:'all',level:'all'},scope:'Synthetic company',relations:['fixture'],datasetVersion:null,defaults:null,baseline:[]};
const spec={id:'projection',base:null,method:'monthly_flow',months:3,changes:[['monthly_hires',4],['monthly_exits',2]].map(([field,value])=>({field,kind:'literal',value,basis:'illustrative',turnId:null,interpretation:'Synthetic test input.'}))};
const base=await calculateHeadcountProjection(spec,inputs,[],[]);
test('local flow edits reuse stock-flow math, preserve original and round-trip exact revisions',async()=>{
 const before=JSON.stringify(base),next=await previewProjectionEdit(base,{months:2,values:{monthly_hires:1.5,monthly_exits:0}},'local-turn');
 assert.deepEqual(next.points.map(p=>p.headcount),[101.5,103]);assert.equal(next.revision,2);assert.equal(JSON.stringify(base),before);
 assert.deepEqual(readHeadcountProjections([base,next]),[base,next]);assert.deepEqual(next.inputs,base.inputs);assert.equal(next.inputDigest,base.inputDigest);assert.match(next.interpretations.at(-1),/Horizon/);
});
test('unknown, invalid, infeasible and scope-inapplicable controls fail without clamping or invented demand',async()=>{
 for(const edit of [{months:0,values:{}},{months:1.5,values:{}},{months:25,values:{}},{months:3,values:{monthly_hires:NaN}},{months:3,values:{monthly_exits:100}},{months:3,values:{monthly_transfers_in:2}},{months:3,values:{annual_attrition_pct:10}}])await assert.rejects(previewProjectionEdit(base,edit,'edit'));
 assert.deepEqual(projectionEditFields(base),['monthly_hires','monthly_exits']);
 assert.equal('demand' in base,false);
});
test('scoped transfers and horizon retain actual dates and population',async()=>{
 const scoped=await calculateHeadcountProjection(spec,{...inputs,scope:'Synthetic US',filters:{...inputs.filters,country:'US'}},[],[]);
 const p=await previewProjectionEdit(scoped,{months:1,values:{monthly_transfers_in:3,monthly_transfers_out:1}},'edit');
 assert.equal(p.points[0].headcount,104);assert.equal(p.points[0].month,'2026-10-01');assert.equal(p.inputs.filters.country,'US');
});
test('configured controls keep configured model and only supported forward history',async()=>{
 const defaults={annual_growth_pct:5,salary_inflation_pct:3,annual_attrition_pct:10,fill_rate_pct:80,productivity_hiring_reduction_pct:5};
 const configured=await calculateHeadcountProjection({...spec,method:'configured_scenario',months:2,changes:[]},{...inputs,defaults,baseline:['2026-10-01','2026-11-01'].map(planning_month=>({planning_month,planned_headcount:105,planned_fte:100,planned_labor_cost_usd:100000}))},[],[]);
 const next=await previewProjectionEdit(configured,{months:1,values:{annual_growth_pct:-2,annual_attrition_pct:0}},'edit');
 assert.equal(next.spec.method,'configured_scenario');assert.equal(next.assumptions.salary_inflation_pct,3);assert.equal(next.points.length,1);
 await assert.rejects(previewProjectionEdit(configured,{months:3,values:{}},'edit'),/cover this horizon/);
});
test('save source check rejects changed digest, scope, token and receipt contract',async()=>{
 const receipt={version:1,provenance:'legacy-live-source-read',datasetToken:'legacy-v1:0',checkedAt:'2026-10-24T17:00:00.000Z',inputs:base.inputs,inputDigest:base.inputDigest};
 await verifyProjectionEditSource(base,receipt,'legacy-v1:0');
 for(const patch of [{inputDigest:'b'.repeat(64)},{inputs:{...base.inputs,opening:101}},{datasetToken:'other:1'},{provenance:'guessed'},{extra:true}])await assert.rejects(verifyProjectionEditSource(base,{...receipt,...patch},'legacy-v1:0'));
});
