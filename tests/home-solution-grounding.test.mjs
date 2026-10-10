/** Synthetic aggregate I/O with real packet verifier, service and POST; no live data or provider. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildHomePack,normalizeHomePack} from '../lib/home-pack.mjs';
import {verifySolutionEvidence,SolutionEvidenceError,solutionGroundingLimits} from '../lib/home-solution-grounding.mjs';
import {scopedDashboardResponse} from '../lib/dashboard-scope.ts';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {actionEvidenceCatalog} from '../lib/home-action-proposal.ts';
import {solutionRequest,fixtureRuntime,final,evaluate,candidate,quantity} from './fixtures/home-solution-conversation.mjs';
import {responseForStep} from './fixtures/natural-business-planning.mjs';
import {offlineBusinessRoute} from './helpers/offline-business-route.mjs';
const signal=()=>new AbortController().signal,token='legacy-v1:0';
const source=(data)=>({status:'loaded',data});
function inputs(){
 const body=solutionRequest('How should we investigate turnover?');body.filters=structuredClone(body.filters);const filters=body.filters;
 const results={dashboard:source(scopedDashboardResponse({overview:{snapshot_date:'2026-09-30',headcount:17,fte:16},trend:[{snapshot_date:'2026-09-30',headcount:17,fte:16}],filter_options:{}},filters)),
  attrition:source({as_of:'2026-08-31',summary:{total_exits:4,voluntary_exits:3},reasons:[{separation_reason:'Other',exits:1},{separation_reason:'Career',exits:1},{separation_reason:'Location',exits:1},{separation_reason:'Workload',exits:1}],trend:[{month:'2026-05-01',total_exits:1},{month:'2026-06-01',total_exits:1},{month:'2026-07-01',total_exits:1},{month:'2026-08-01',total_exits:1}]}),
  skills:source({as_of:'2026-09-30',summary:{current_workforce:17,skills_with_demand:2},largest_gaps:[{skill_name:'Synthetic skill',employees_below_or_missing_requirement:3}]})};
 body.evidence=buildHomePack(results,body.scope,'Workload in May 2026');return {body,results};
}
async function verify(body,results){return verifySolutionEvidence(body,{datasetToken:token,now:()=>new Date('2026-10-09T14:00:00Z'),read:async key=>results[key]??{status:'unavailable',data:null}},signal());}
test('fresh aggregate matching preserves selected older months and non-first rows, source dates, packet identity and missing granularity',async()=>{
 const {body,results}=inputs(),before=JSON.stringify(body.evidence),g=await verify(body,results);
 assert.equal(JSON.stringify(body.evidence),before);assert.equal(g.datasetToken,token);
 assert.equal(g.sources.find(s=>s.id==='A1').asOf,'2026-08-31');assert.equal(g.sources.find(s=>s.id==='W1').asOf,'2026-09-30');assert.equal(g.retrievedAt,'2026-10-09T14:00:00.000Z');
 assert.match(g.packetSha256,/^[a-f0-9]{64}$/);assert.equal(g.databaseIntegrityCertified,false);assert.equal(g.independentForecastValidation,false);
 assert.equal(body.evidence.sources.find(s=>s.id==='A1').facts.rows[0].separation_reason,'Workload');
 assert.equal(body.evidence.sources.find(s=>s.id==='A1').facts.monthly[0].month,'2026-05-01');
 assert.equal(g.sources.find(s=>s.id==='I3').basis,'fictional-or-unverified-session-input');
 assert.equal(body.evidence.sources.find(s=>s.id==='T1').facts.available_movers,undefined);
});
test('changed values, stale dates, forged rows, duplication, changed filters and mixed dataset fail before grounding',async()=>{
 for(const mutate of [
  b=>{b.evidence.sources.find(s=>s.id==='W1').facts.headcount=999;},
  b=>{b.evidence.sources.find(s=>s.id==='A1').date='2026-09-30';},
  b=>{b.evidence.sources.find(s=>s.id==='A1').facts.rows[0].exits=999;},
  b=>{const s=b.evidence.sources.find(s=>s.id==='A1');s.facts.rows[1]=structuredClone(s.facts.rows[0]);},
  b=>{b.evidence.sources.find(s=>s.id==='A1').facts.monthly[0].total_exits=999;},
  b=>{b.scope='United States; All business units; All levels';},
  b=>{b.filters.country='US';},
 ]){const {body,results}=inputs();mutate(body);await assert.rejects(verify(body,results),SolutionEvidenceError);}
 const {body,results}=inputs();let reads=0;
 await assert.rejects(verifySolutionEvidence(body,{datasetToken:'legacy-v1:1',read:async()=>{reads++;return results.dashboard;}},signal()),SolutionEvidenceError);assert.equal(reads,0);
});
test('failed current reads cannot be replaced by supplied stale facts; unavailable sources stay unknown with no invented zero',async()=>{
 const {body,results}=inputs();results.attrition={status:'unavailable',data:null};await assert.rejects(verify(body,results),SolutionEvidenceError);
 const empty=solutionRequest('What are our available engineers?');let reads=0;
 const grounding=await verifySolutionEvidence(empty,{datasetToken:token,read:async()=>{reads++;throw Error('No read expected');}},signal());
 assert.equal(reads,0);assert.equal(grounding.sources.find(s=>s.id==='T1').basis,'unavailable');
 assert.equal(empty.evidence.sources.find(s=>s.id==='T1').facts,null);assert.equal(actionEvidenceCatalog(empty.evidence).length,0);
 const c=candidate('conditional-skill-review'),runtime=fixtureRuntime([evaluate(c),final('Available engineers and role readiness are unknown. Review the role requirements first.',[c.id])]);runtime.grounding=grounding;
 const reply=await converseSolutions(empty,runtime,signal());assert.equal(reply.state.working[0].result.uniqueParticipants,null);assert.equal(reply.state.working[0].result.cashEstimate.cash,null);assert.deepEqual(reply.state.verifiedMetrics,[]);
});
test('company-wide evidence cannot be promoted to a scoped turnover claim; a scoped unknown remains acceptable',async()=>{
 const {body,results}=inputs(),grounding=await verify(body,results);
 const bad=fixtureRuntime([final('United States exits were 4 [A1:summary].')]);bad.grounding=grounding;
 await assert.rejects(converseSolutions(body,bad,signal()),/unsupported population/);
 const good=fixtureRuntime([{name:'read_evidence',args:{sourceIds:['A1']}},final('The United States breakdown is unavailable; company-wide exits were 4 [A1:summary].')]);good.grounding=grounding;
 await converseSolutions(body,good,signal());const returned=JSON.parse(good.contexts[1].find(i=>i.type==='function_call_output').output)[0];
 assert.equal(returned.datasetToken,token);assert.equal(returned.grounding.asOf,'2026-08-31');assert.equal(returned.grounding.basis,'database-backed-aggregate');assert.match(returned.scope,/Company-wide/);
});
test('framework sources cannot enter company citation or checked quantitative namespaces',async()=>{
 const {body,results}=inputs(),grounding=await verify(body,results),c=candidate('method-is-not-fact');c.activities[0].evidenceIds=['cipd'];
 const runtime=fixtureRuntime([{name:'read_workforce_planning_playbook',args:{sections:['supply']}},evaluate(c),final('The framework suggests reviewing readiness; availability remains unknown.')]);runtime.grounding=grounding;
 const reply=await converseSolutions(body,runtime,signal());assert.deepEqual(reply.state.working,[]);assert.deepEqual(reply.state.verifiedMetrics,[]);
 const outputs=runtime.contexts.at(-1).filter(i=>i.type==='function_call_output').map(i=>JSON.parse(i.output));
 assert.equal(outputs[0].ok,false);assert.equal(outputs[0].error,'Unsupported or oversized tool request.');assert.equal(outputs[1].code,'invalid_evidence_identifiers');
 const invented={...final('A framework cannot verify participant counts.'),verifiedMetrics:[{kind:'candidate',id:'cipd',revision:1,metric:'participants'}]};
 await assert.rejects(converseSolutions(body,fixtureRuntime([invented]),signal()),/not checked in this turn/);
});
test('actual POST verifies aggregates before model use and rejects stale dataset headers before source reads',async()=>{
 const isolated=await offlineBusinessRoute(),{body,results}=inputs();isolated.sandbox.__aggregateSources=results;isolated.sandbox.__aggregateReads=[];
 const request=(b,header=token)=>new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',headers:{'x-workforce-dataset':header},body:JSON.stringify(b)});
 assert.equal((await isolated.post(request(body,'legacy-v1:1'))).status,409);assert.equal(isolated.sandbox.__requests.length,0);assert.equal(isolated.sandbox.__aggregateReads.length,0);
 const forged=structuredClone(body);forged.evidence.sources.find(s=>s.id==='W1').facts.headcount=999;
 assert.equal((await isolated.post(request(forged))).status,503);assert.equal(isolated.sandbox.__requests.length,0);
 isolated.sandbox.__replies.push(responseForStep(final('The supplied company-wide August exit observation does not establish causes or current availability.')));
 const response=await isolated.post(request(body)),payload=await response.json();assert.equal(response.status,200,JSON.stringify(payload));assert.equal(isolated.sandbox.__requests.length,1);
 assert.deepEqual(payload.diagnostics.groundingReaders.map(item=>item.reader).sort(),['attrition','dashboard','skills']);
 assert.ok(payload.diagnostics.groundingReaders.every(item=>Number.isInteger(item.startedAfterMs)&&Number.isInteger(item.elapsedMs)));
 const model=isolated.sandbox.__requests[0],context=JSON.parse(model.input[0].content.split('\n').slice(1).join('\n'));
 assert.equal(context.evidenceGrounding.datasetToken,token);assert.equal(context.currentEvidence.sources.find(s=>s.id==='W1').facts.headcount,17);
 assert.equal(context.evidenceGrounding.groundingReaders,undefined);
 assert.match(model.instructions,/invent no effect sizes, savings, available resources or approvals/);
 assert.ok(!model.tools.some(tool=>['read_workforce_planning_playbook','evaluate_action_plans'].includes(tool.name)));
});
test('source projection keeps suppression and company-only scopes; invented supplied fields do not become model evidence',()=>{
 const pack=normalizeHomePack({workforceScope:'United States',sources:[{id:'S2',status:'loaded',facts:{exit_respondents:7,rows:[{primary_reason:'Suppressed',exits:2,suppressed:true}]}},{id:'T1',status:'loaded',facts:{current_workforce:17,ready_engineers:17,employees:[{name:'MUST_NOT_APPEAR'}]}}]});
 assert.equal(pack.sources.find(s=>s.id==='S2').facts.rows[0].exits,null);assert.match(pack.sources.find(s=>s.id==='S2').scope,/Company-wide/);
 assert.doesNotMatch(JSON.stringify(pack),/ready_engineers|MUST_NOT_APPEAR/);
});

test('actual POST supports a visible qualitative turnover proposal without inventing scope or verified numbers',async()=>{
 const isolated=await offlineBusinessRoute(),body=solutionRequest('How can we reduce turnover?'),c=candidate('turnover-pilot');
 isolated.sandbox.__replies.push(...[evaluate(c),final('Review this proposed mentoring trial. Population and resources are unknown; it has not been calculated.',[c.id])].map(responseForStep));
 const response=await isolated.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',headers:{'x-workforce-dataset':token},body:JSON.stringify(body)}));
 assert.equal(response.status,200);const reply=await response.json(),item=reply.state.working[0];
 assert.deepEqual(reply.candidateIds,[c.id]);assert.deepEqual(item.blocking,[]);
 assert.equal(item.result.calculationStatus,'awaiting-scope');assert.equal(item.draft.inputs.scope.population.value,null);
 assert.equal(item.result.cashEstimate.cash,null);assert.equal(item.result.uniqueParticipants,null);assert.deepEqual(reply.state.verifiedMetrics,[]);
 assert.equal(item.candidate.activities[0].ownerRole,'Learning lead');assert.equal(item.candidate.activities[0].step,c.activities[0].step);
 assert.equal(body.catalog,null);assert.equal(body.goal.id,'');assert.equal(isolated.sandbox.__requests.length,2);
 const instructions=isolated.sandbox.__requests[0].instructions;
 assert.match(instructions,/prose advice alone does not satisfy a planning request/);assert.match(instructions,/Focus is optional/);
 assert.ok(!isolated.sandbox.__requests[0].tools.some(t=>['evaluate_action_plans','read_workforce_planning_playbook'].includes(t.name)));
});

test('explicit fictional population and horizon unlock checked effort without turning unknown costs into a complete total',async()=>{
 const body=solutionRequest('Reduce turnover with a fictional mentoring pilot for the fictional client-operations cohort: 12 participants, 2 total hours each, 3 coordination hours and 240 USD total cash. Start October 2026 for three months. These are proposed test inputs, not workforce facts.'),c=candidate('scoped-pilot');
 const text=(field,value,unit)=>({...quantity(field,null,unit),text:value});
 c.quantities=[text('population','Fictional client-operations cohort','text'),text('start_month','2026-10','YYYY-MM'),quantity('horizon_months',3,'months'),quantity('participants',12,'people','c1'),quantity('hours_per_participant',2,'hours/person/total','c1'),quantity('coordination_hours',3,'hours/total'),quantity('cash',240,'USD','c1')];
 const runtime=fixtureRuntime([evaluate(c),(input)=>{const result=JSON.parse(input.at(-1).output);return {...final('Review the fictional pilot and its remaining unknowns.',[c.id]),verifiedMetrics:result.verifiedMetricReferences};}]);
 const reply=await converseSolutions(body,runtime,signal()),item=reply.state.working[0];
 assert.deepEqual(item.blocking,[]);assert.notEqual(item.result.calculationStatus,'awaiting-scope');
 assert.equal(item.draft.inputs.scope.population.value,'Fictional client-operations cohort');
 assert.equal(item.result.deliveryEstimate.hours,27);assert.ok(reply.state.verifiedMetrics.some(ref=>ref.metric==='staff_hours'));
 assert.equal(item.result.cashTotal,null);assert.equal(body.catalog,null);assert.equal(runtime.rounds,2);
});

const deferred=()=>Promise.withResolvers();
const drain=()=>new Promise(resolve=>setImmediate(resolve));
test('grounding queue runs at most two readers and verifies every loaded source before returning',async()=>{
 const {body,results}=inputs(),pending=[],started=[];let active=0,maximum=0;
 const task=verifySolutionEvidence(body,{datasetToken:token,read:async(key,_filters,readSignal)=>{
  started.push(key);active++;maximum=Math.max(maximum,active);const wait=deferred();pending.push({key,readSignal,...wait});
  try{return await wait.promise;}finally{active--;}
 }},signal());
 assert.equal(started.length,2);assert.equal(maximum,2);
 pending[0].resolve(results[pending[0].key]);await drain();assert.equal(started.length,3);assert.equal(active,2);
 pending[1].resolve(results[pending[1].key]);pending[2].resolve(results[pending[2].key]);
 const grounding=await task;assert.deepEqual([...started].sort(),Object.keys(results).sort());assert.equal(maximum,2);assert.equal(active,0);
 assert.equal(grounding.sources.find(s=>s.id==='T1').status,'loaded');
});
test('total grounding deadline wins against hung readers and late results cannot schedule more work',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const {body,results}=inputs(),pending=[],before=JSON.stringify(body);
 const task=verifySolutionEvidence(body,{datasetToken:token,read:async(key,_filters,readSignal)=>{const wait=deferred();pending.push({key,readSignal,...wait});return wait.promise;}},signal());
 let stopped=false;const rejected=assert.rejects(task,SolutionEvidenceError).then(()=>{stopped=true;});
 assert.equal(pending.length,2);t.mock.timers.tick(solutionGroundingLimits.timeoutMs-1);await Promise.resolve();assert.equal(stopped,false);
 t.mock.timers.tick(1);await rejected;assert.ok(pending.every(item=>item.readSignal.aborted));
 pending.forEach(item=>item.resolve(results[item.key]));await drain();assert.equal(pending.length,2);assert.equal(JSON.stringify(body),before);
});
test('first read failure or unavailable result stops the queue without waiting for another hung reader',async()=>{
 for(const unavailable of [false,true]){
  const {body,results}=inputs(),pending=[];
  const task=verifySolutionEvidence(body,{datasetToken:token,read:async(key,_filters,readSignal)=>{const wait=deferred();pending.push({key,readSignal,...wait});return wait.promise;}},signal());
  const rejected=assert.rejects(task,SolutionEvidenceError);
  if(unavailable)pending[0].resolve({status:'unavailable',data:null});else pending[0].reject(Error('Synthetic read failure'));
  await rejected;assert.equal(pending.length,2);assert.ok(pending.every(item=>item.readSignal.aborted));
  pending[1].resolve(results[pending[1].key]);await drain();assert.equal(pending.length,2);
 }
});
test('caller cancellation stops queued reads immediately, including an already aborted request',async()=>{
 const {body,results}=inputs(),controller=new AbortController(),pending=[];
 const read=async(key,_filters,readSignal)=>{const wait=deferred();pending.push({key,readSignal,...wait});return wait.promise;};
 const task=verifySolutionEvidence(body,{datasetToken:token,read},controller.signal),rejected=assert.rejects(task,SolutionEvidenceError);
 controller.abort();await rejected;assert.equal(pending.length,2);assert.ok(pending.every(item=>item.readSignal.aborted));
 pending.forEach(item=>item.resolve(results[item.key]));await drain();assert.equal(pending.length,2);
 await assert.rejects(verifySolutionEvidence(body,{datasetToken:token,read},controller.signal),SolutionEvidenceError);assert.equal(pending.length,2);
});
test('actual POST returns unavailable with zero model calls on timeout, reader failure and cancellation',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const isolated=await offlineBusinessRoute(),{body}=inputs();
 isolated.sandbox.__aggregateSources={};
 for(const kind of ['timeout','failure','cancellation']){
  const controller=new AbortController(),pending=[];isolated.sandbox.__aggregateReads=[];
  isolated.sandbox.__aggregateRead=(key,readSignal)=>{const wait=deferred();pending.push({key,readSignal,...wait});return wait.promise;};
  const task=isolated.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',headers:{'x-workforce-dataset':token},body:JSON.stringify(body),signal:controller.signal}));
  await drain();assert.equal(pending.length,2);
  if(kind==='timeout')t.mock.timers.tick(solutionGroundingLimits.timeoutMs);
  else if(kind==='failure')pending[0].reject(Error('Synthetic source failure'));
  else controller.abort();
  const response=await task;assert.equal(response.status,503,kind);assert.match((await response.json()).error,/evidence is unavailable or changed/);
  assert.equal(isolated.sandbox.__requests.length,0);assert.equal(isolated.sandbox.__aggregateReads.length,2);assert.ok(pending.every(item=>item.readSignal.aborted));
  pending.forEach(item=>item.resolve({status:'unavailable',data:null}));await drain();assert.equal(isolated.sandbox.__aggregateReads.length,2);
 }
});
