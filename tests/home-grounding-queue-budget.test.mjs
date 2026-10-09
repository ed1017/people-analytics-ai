/** Synthetic latency policy regressions; no production timing measurements or live calls. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildHomePack,homeDefinitions} from '../lib/home-pack.mjs';
import {scopedDashboardResponse} from '../lib/dashboard-scope.ts';
import {solutionGroundingLimits} from '../lib/home-solution-grounding.mjs';
import {solutionRequest,final} from './fixtures/home-solution-conversation.mjs';
import {responseForStep} from './fixtures/natural-business-planning.mjs';
import {offlineBusinessRoute} from './helpers/offline-business-route.mjs';

const token='legacy-v1:0',drain=()=>new Promise(resolve=>setImmediate(resolve));
function fullEvidence(){
 const body=solutionRequest('How should we investigate turnover?'),results={};
 for(const [,key,,,,, ,numeric] of homeDefinitions){
  if(['catalogue','development'].includes(key))continue;
  const data=results[key]??={status:'loaded',data:{as_of:'2026-09-30',summary:{}}};
  Object.assign(data.data.summary,Object.fromEntries(numeric.split(' ').filter(Boolean).map(field=>[field,0])));
 }
 results.dashboard.data=scopedDashboardResponse({overview:{snapshot_date:'2026-09-30',headcount:20,fte:20},trend:[{snapshot_date:'2026-09-30',headcount:20,fte:20}],filter_options:{}},body.filters);
 results['career-growth-mobility'].data.source={total_recorded_events:0,distinct_recorded_employees:0,recorded_months:0,last_recorded_date:'2026-09-30'};
 results['succession-coverage'].data={as_of_date:null,small_cell_threshold:10,critical_job_profiles:0,filled_critical_positions:0,positions_with_recorded_plan:0,positions_without_recorded_plan:0,recorded_plan_coverage_pct:null,plan_coverage_suppressed:false,positions_with_ready_now:0,positions_without_ready_now:0,ready_now_plan_pct:null,ready_now_suppressed:false,suppression_reason:null};
 results['workforce-planning'].data.scenarios=[{scenario_name:'Synthetic timing fixture',scenario_type:'fixture',assumptions:[],points:[{planning_month:'2026-09-01',planned_headcount:20},{planning_month:'2026-10-01',planned_headcount:20}]}];
 for(const key of ['finance','position-modeling'])results[key].data.current=results[key].data.summary;
 results.bls.data={latest_date:'2026-09-01',metrics:[{series_id:'LNS14000000',raw_value:4,observation_date:'2026-09-01'}]};
 body.evidence=buildHomePack(results,body.scope);
 const definitions=new Map(homeDefinitions.map(def=>[def[0],def[1]]));
 const keys=[...new Set(body.evidence.sources.filter(s=>s.status==='loaded'&&!['I3','D1'].includes(s.id)).map(s=>definitions.get(s.id)))];
 assert.equal(keys.length,14,JSON.stringify(body.evidence.sources.map(({id,status})=>({id,status}))));assert.deepEqual(keys.sort(),Object.keys(results).sort());
 return {body,results};
}

test('actual POST keeps all evidence checks within the revised two-reader queue budget',async t=>{
 const isolated=await offlineBusinessRoute();isolated.sandbox.console={error(){}};
 assert.deepEqual(solutionGroundingLimits,{readers:2,timeoutMs:30000});
 for(const kind of ['slow_success','hung_bls','changed_facts','caller_cancellation'])await t.test(kind,async sub=>{
  sub.mock.timers.enable({apis:['setTimeout']});
  const {body,results}=fullEvidence(),controller=new AbortController(),starts=[],signals=[],late=Promise.withResolvers();
  let active=0,maximum=0,completed=0,settled=false;
  isolated.sandbox.__aggregateSources=results;isolated.sandbox.__requests.length=0;isolated.sandbox.__replies.length=0;
  isolated.sandbox.__aggregateRead=async(key,signal)=>{
   starts.push(key);signals.push(signal);active++;maximum=Math.max(maximum,active);
   try{if(kind==='hung_bls'&&key==='bls')return await late.promise;
    await new Promise(resolve=>setTimeout(resolve,4000));completed++;return results[key];
   }finally{active--;}
  };
  if(kind==='changed_facts')body.evidence.sources.find(s=>s.id==='A1').facts.total_exits=999;
  isolated.sandbox.__replies.push(responseForStep(final('Review the company-wide evidence before proposing changes.')));
  const request=new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',headers:{'x-workforce-dataset':token},body:JSON.stringify(body),signal:controller.signal});
  const task=isolated.post(request).then(response=>{settled=true;return response;});await drain();
  assert.equal(starts.length,2);assert.equal(isolated.sandbox.__requests.length,0);
  // The old 8s deadline would fail here despite continued successful reads.
  for(let wave=0;wave<2;wave++){sub.mock.timers.tick(4000);await drain();}
  assert.equal(settled,false);assert.equal(completed,4);assert.equal(starts.length,6);assert.equal(maximum,2);assert.equal(isolated.sandbox.__requests.length,0);
  if(kind==='caller_cancellation'){
   controller.abort();const response=await task;assert.equal(response.status,503);assert.equal((await response.json()).code,'evidence_cancelled');
   sub.mock.timers.tick(4000);await drain();assert.equal(starts.length,6);assert.equal(isolated.sandbox.__requests.length,0);assert.ok(signals.every(s=>s.aborted));return;
  }
  for(let wave=2;wave<7;wave++){assert.equal(isolated.sandbox.__requests.length,0);sub.mock.timers.tick(4000);await drain();}
  assert.equal(starts.length,14);assert.equal(maximum,2);
  if(kind==='hung_bls'){
   assert.equal(completed,13);sub.mock.timers.tick(1999);await drain();assert.equal(settled,false);assert.equal(isolated.sandbox.__requests.length,0);
   sub.mock.timers.tick(1);const response=await task;assert.equal(response.status,503);assert.equal((await response.json()).code,'evidence_deadline');assert.ok(signals.every(s=>s.aborted));
   late.resolve(results.bls);await drain();assert.equal(isolated.sandbox.__requests.length,0);assert.equal(starts.length,14);
  }else{
   const response=await task;assert.equal(completed,14);assert.equal(active,0);
   if(kind==='changed_facts'){assert.equal(response.status,503);assert.equal((await response.json()).code,'evidence_facts_changed');assert.equal(isolated.sandbox.__requests.length,0);}
   else{assert.equal(response.status,200);assert.equal(isolated.sandbox.__requests.length,1);assert.ok(signals.every(s=>!s.aborted));}
  }
 });
});
