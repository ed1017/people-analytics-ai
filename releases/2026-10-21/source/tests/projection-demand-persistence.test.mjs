import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateHeadcountProjection,readHeadcountProjections} from '../lib/home-solution-projection.ts';
import {previewProjectionEdit,verifyProjectionEditSource} from '../lib/headcount-projection-edit.ts';
import {projectionDemand,emptyProjectionDemand} from '../lib/projection-demand.ts';
const inputs={asOf:'2026-09-30',opening:40,filters:{country:'US',org:'all',level:'all'},scope:'US support',relations:['fixture'],datasetVersion:null,defaults:null,baseline:[]};
const spec={id:'demand-save',base:null,method:'monthly_flow',months:3,changes:[['monthly_hires',2],['monthly_exits',1],['monthly_transfers_in',1],['monthly_transfers_out',0]].map(([field,value])=>({field,kind:'literal',value,basis:'illustrative',turnId:null,interpretation:'Test assumption.'}))};
const demand={ftePerPerson:'0.8',allocation:'75',volume:'8000',effort:'1',hours:'160',productivity:'0'};
const base=await calculateHeadcountProjection(spec,inputs,[],[]);
test('demand-only save JSON reload preserves exact old revision, source and editable assumptions',async()=>{
 const before=JSON.stringify(base),next=await previewProjectionEdit(base,{months:3,values:{},demand},'save-demand');
 assert.equal(next.revision,2);assert.equal(JSON.stringify(base),before);assert.equal('demand' in base,false);
 const saved=readHeadcountProjections(JSON.parse(JSON.stringify([base,next])));
 assert.deepEqual(saved,[base,next]);assert.deepEqual(next.points,base.points);assert.equal(next.inputDigest,base.inputDigest);
 assert.deepEqual(saved[1].demand.inputs,demand);assert.deepEqual(projectionDemand(saved[1],saved[1].demand.inputs),projectionDemand(next,demand));
});
test('combined edits and chat revisions inherit demand, exact source, scope and 24-month dates',async()=>{
 const first=await previewProjectionEdit(base,{months:24,values:{monthly_hires:3},demand},'save');
 const next=await calculateHeadcountProjection({...first.spec,base:{id:first.id,revision:first.revision},changes:[]},first.inputs,[base,first],[]);
 assert.deepEqual(next.demand,first.demand);assert.equal(next.revision,3);assert.equal(next.points.length,24);assert.equal(next.points.at(-1).month,'2028-09-01');
 assert.deepEqual(readHeadcountProjections([base,first,next]),[base,first,next]);assert.equal(projectionDemand(next,demand).points[0].headcount,next.points[0].headcount);
});
test('blank values remain unknown and zero remains zero across saved revisions',async()=>{
 for(const values of [{...emptyProjectionDemand},{...demand,volume:'0'}, {...demand,allocation:''}]){
  const next=await previewProjectionEdit(base,{months:3,values:{},demand:values},'save');
  const [loaded]=readHeadcountProjections(JSON.parse(JSON.stringify([next])));
  assert.deepEqual(loaded.demand.inputs,values);
  const result=projectionDemand(loaded,loaded.demand.inputs);
  if(values.volume==='0')assert.equal(result.points[0].requiredFte,0);
  else assert.equal(result.points[0].gapFte,null);
 }
});
test('fractional flow edits cannot silently discard saved demand; explicit removal creates a revision',async()=>{
 const saved=await previewProjectionEdit(base,{months:3,values:{},demand},'save');const before=JSON.stringify(saved);
 await assert.rejects(previewProjectionEdit(saved,{months:3,values:{monthly_hires:1.5}},'edit'),/whole-person/);
 const removed=await previewProjectionEdit(saved,{months:3,values:{monthly_hires:1.5},demand:null},'remove',[base,saved]);
 assert.equal('demand' in removed,false);assert.equal(removed.revision,3);assert.equal(JSON.stringify(saved),before);
 assert.deepEqual(readHeadcountProjections([saved,removed]),[saved,removed]);
});
test('unsupported contract, extra fields, malformed inputs and invalid arithmetic fail reload',async()=>{
 const saved=await previewProjectionEdit(base,{months:3,values:{},demand},'save');
 for(const patch of [{version:2},{calculatorVersion:'future'},{extra:true},{inputs:{...demand,volume:0}},{inputs:{...demand,extra:'1'}},{inputs:{...demand,ftePerPerson:'2'}}]){
  assert.throws(()=>readHeadcountProjections([{...saved,demand:{...saved.demand,...patch}}]));
 }
 assert.throws(()=>readHeadcountProjections([{...saved,demand:null}]));
});
test('demand never changes or substitutes the source receipt contract',async()=>{
 const saved=await previewProjectionEdit(base,{months:3,values:{},demand},'save');
 const receipt={version:1,provenance:'legacy-live-source-read',datasetToken:'legacy-v1:0',checkedAt:'2026-10-24T17:00:00.000Z',inputs:base.inputs,inputDigest:base.inputDigest};
 await verifyProjectionEditSource(saved,receipt,'legacy-v1:0');
 await assert.rejects(verifyProjectionEditSource(saved,{...receipt,inputs:{...inputs,opening:41}},'legacy-v1:0'));
});

import {solutionModelContext} from '../lib/home-solution-conversation-service.ts';
import {buildHomePack} from '../lib/home-pack.mjs';
test('actual chat context carries versioned demand as bounded user assumptions without workload metric claims',async()=>{
 const saved=await previewProjectionEdit(base,{months:3,values:{},demand:{...demand,volume:'0',allocation:''}},'save');
 const request={goal:{id:'synthetic',statement:'Review workload'},scope:'US support',filters:inputs.filters,timeZone:'UTC',goalContext:null,evidence:buildHomePack({},'US support'),catalog:null,selectedId:null,message:{id:'followup',text:'What assumptions did I save?'},state:{constraints:[],turns:[],working:[],analyses:[base,saved],rejected:[],questions:[],focusCandidateId:null}};
 const before=structuredClone(request),context=solutionModelContext(request);
 assert.equal('demand' in context.analyses[0],false);
 assert.deepEqual(context.analyses[1].demand,{...saved.demand,basis:'User-entered workload assumptions; not source observations.'});
 assert.equal(context.analyses[1].demand.inputs.volume,'0');assert.equal(context.analyses[1].demand.inputs.allocation,'');
 assert.match(context.projectionDemandGuidance,/local scenario controls/);assert.match(context.projectionDemandGuidance,/do not verify workload requirements, capacity gaps or risk verdicts/);
 assert.equal('verifiedMetrics' in context.analyses[1],false);assert.deepEqual(request,before);
 assert.throws(()=>solutionModelContext({...request,state:{...request.state,analyses:[{...saved,demand:{...saved.demand,inputs:{...demand,volume:'1'.repeat(81)}}}]}}));
});
