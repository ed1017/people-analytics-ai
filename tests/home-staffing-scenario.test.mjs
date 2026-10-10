import test from 'node:test';
import assert from 'node:assert/strict';
import {readStaffingScenario,staffingScenarioLabel} from '../lib/home-staffing-scenario.ts';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {solutionRequest,fixtureRuntime} from './fixtures/home-solution-conversation.mjs';
import {fixedMessages,liveStaffingMessage,fixedChanges,fixedValues} from './fixtures/required-staffing.mjs';
import {offlineBusinessRoute} from './helpers/offline-business-route.mjs';
import {responseForStep} from './fixtures/natural-business-planning.mjs';
import {buildHomePack} from '../lib/home-pack.mjs';
const fresh=(...args)=>structuredClone(solutionRequest(...args));
const token='legacy-v1:0',context={natural:true,datasetToken:token},secret='PRIVATE_COMPANY_EVIDENCE_SENTINEL';
const submit=(route,body,extra={})=>route.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',headers:{'x-workforce-dataset':token,...extra.headers},body:JSON.stringify(body),...(extra.signal?{signal:extra.signal}:{})}));
const response=body=>responseForStep({name:'compare_required_staffing',args:{changes:fixedChanges(body)}},0);
const sources={attrition:{status:'loaded',data:{as_of:'2026-09-30',summary:{total_exits:4,voluntary_exits:3},reasons:[{separation_reason:secret,exits:1}]}}};
function poisonedBody(text=liveStaffingMessage){const body=fresh(text);body.evidence=buildHomePack(sources,body.scope);return body;}

test('only complete explicit illustrative premises in fresh default exploration enter the contract',()=>{
 for(const text of [liveStaffingMessage,fixedMessages.start]){
  const parsed=readStaffingScenario(fresh(text),context);assert.ok(parsed);for(const [field,value] of Object.entries(fixedValues))assert.equal(parsed.inputs[field],value);
  for(const field of ['internalRelease','costsComplete','hireTrainingHoursPerPerson','backfillCostPerInternalPerson','hireReadyAfterMonths','trainingReadyAfterMonths','redeployReadyAfterMonths'])assert.equal(parsed.inputs[field],null);
 }
 for(const text of [
  liveStaffingMessage.replace('These are illustrative assumptions: ',''),
  liveStaffingMessage.replace('These are illustrative assumptions: ','These are not illustrative assumptions: '),
  liveStaffingMessage.replace('These are illustrative assumptions: ','These are actual company figures: '),
  liveStaffingMessage.replace('These are illustrative assumptions: ','Someone said "These are illustrative assumptions:" '),
  liveStaffingMessage.replace('USD 160,000 cash per hire for the entire period','USD 160,000 annual salary per hire'),
  liveStaffingMessage.replace('USD 5,000 and 80 planned training hours per trainee','USD 5,000 and 80 total training hours'),
  liveStaffingMessage.replace('USD 5,000','EUR 5,000'),liveStaffingMessage.replace('USD 5,000','USD 5,00'),
  liveStaffingMessage.replace('10 engineering roles','21 engineering roles'),liveStaffingMessage.replace('12 months','25 months'),
  liveStaffingMessage.replace('10 engineering roles','0 engineering roles'),
  liveStaffingMessage.replace('USD 160,000 cash per hire for the entire period; ',''),
  liveStaffingMessage.replace('zero incremental redeployment cash per person','unknown redeployment cash per person'),
  liveStaffingMessage.replace('in separate pools','in overlapping pools'),
  liveStaffingMessage+' Also explain FTE.',liveStaffingMessage+' Verify those people against our workforce.',
  liveStaffingMessage+' Use the latest company salary data.',liveStaffingMessage+' Save this plan.',
  liveStaffingMessage+' USD 2,000,000 budget.',liveStaffingMessage+' Fill 5 developer roles over 6 months.',
  fixedMessages.start.replace('whole 12-month period','whole 6-month period'),
  fixedMessages.followup,
 ])assert.equal(readStaffingScenario(fresh(text),context),null,text);
 for(const mutate of [
  b=>{b.goal={id:'g',statement:'Company goal'};},b=>{b.goalContext={private:secret};},b=>{b.catalog={private:secret};},b=>{b.selectedId='p';},
  b=>{b.filters.country='US';},b=>{b.scope='US scope';},b=>{b.goalProgress={private:secret};},b=>{b.progressEntry={private:secret};},b=>{b.planningCalculatorAvailable=true;},
  ...['turns','constraints','working','analyses','verifiedMetrics','rejected','questions','datasetEvidenceContexts'].map(key=>b=>{b.state[key]=[{private:secret}];}),
  ...['requiredStaffing','hiringBudget','businessPlanning','focusCandidateId'].map(key=>b=>{b.state[key]={private:secret};}),
  b=>{b.state.unrecognizedContext={private:secret};},b=>{b.evidence.datasetContext={private:secret};},
 ]){const b=fresh(liveStaffingMessage);mutate(b);assert.equal(readStaffingScenario(b,context),null);}
 assert.equal(readStaffingScenario(fresh(liveStaffingMessage),{...context,natural:false}),null);
 assert.equal(readStaffingScenario(fresh(liveStaffingMessage),{...context,datasetToken:'legacy-v1:1'}),null);
 const ui=fresh(liveStaffingMessage);ui.scope='Selected workforce snapshot: Global workforce; All business units; All levels';assert.ok(readStaffingScenario(ui,context));
 ui.goalProgress={version:1,goalId:'',datasetToken:token,origin:'authored',ledger:null,unavailableReason:null};ui.progressEntry=null;assert.ok(readStaffingScenario(ui,context));
 for(const change of [{goalId:'saved'},{datasetToken:'legacy-v1:1'},{origin:'demo'},{ledger:{}},{unavailableReason:'storage_unavailable'},{private:secret}]){const retained=structuredClone(ui);Object.assign(retained.goalProgress,change);assert.equal(readStaffingScenario(retained,context),null);}
 assert.equal(readStaffingScenario(fresh(liveStaffingMessage,true),context),null);
});

test('actual POST projects poisoned browser evidence out and calculates the exact fixture with no aggregate reads',async()=>{
 const route=await offlineBusinessRoute(),logs=[];route.sandbox.console={info:(...args)=>logs.push(args),error:(...args)=>logs.push(args)};
 route.sandbox.__aggregateSources=sources;route.sandbox.__aggregateReads=[];route.sandbox.__aggregateRead=()=>{throw Error('Any aggregate read is forbidden for this scenario');};
 const body=poisonedBody(),before=JSON.stringify(body);assert.ok(before.includes(secret),'the browser packet must actually contain the poisoned company evidence');
 const extraction=response(body),args=JSON.parse(extraction.output[0].arguments);args.changes.forEach(change=>{change.basis.explanation=secret;});extraction.output[0].arguments=JSON.stringify(args);route.sandbox.__replies.push(extraction);
 const result=await submit(route,body),reply=await result.json();assert.equal(result.status,200,JSON.stringify(reply));assert.equal(JSON.stringify(body),before);
 assert.equal(route.sandbox.__aggregateReads.length,0);assert.equal(route.sandbox.__requests.length,1);
 const sent=JSON.parse(JSON.stringify(route.sandbox.__requests[0])),payload=JSON.parse(sent.input[0].content);
 assert.deepEqual(Object.keys(payload).sort(),['contract','currentMessage']);assert.deepEqual(payload.currentMessage,body.message);
 assert.deepEqual(sent.tools.map(t=>t.name),['compare_required_staffing']);assert.deepEqual(sent.tool_choice,{type:'function',name:'compare_required_staffing'});
 assert.equal(sent.model,'gpt-6.1-sol');assert.deepEqual(sent.reasoning,{effort:'medium'});assert.equal(sent.service_tier,'default');assert.equal(sent.parallel_tool_calls,false);assert.equal(sent.max_output_tokens,5000);assert.equal(route.sandbox.__requestOptions[0].maxRetries,0);
 assert.ok(reply.answer.startsWith(staffingScenarioLabel));for(const value of ['1600000 USD','30000 USD','495000 USD','480 planned training hours','240 planned training hours','Recommendation:','Next step:','Nothing was saved or applied.'])assert.ok(reply.answer.includes(value),value);
 assert.deepEqual(reply.usage,{modelRounds:1,toolCalls:1});assert.deepEqual(reply.charts,[]);assert.deepEqual(reply.candidateIds,[]);assert.deepEqual(reply.analysisIds,[]);assert.deepEqual(reply.state.verifiedMetrics,[]);assert.deepEqual(reply.state.working,[]);
 for(const field of ['internalRelease','costsComplete','hireTrainingHoursPerPerson','backfillCostPerInternalPerson','hireReadyAfterMonths','trainingReadyAfterMonths','redeployReadyAfterMonths'])assert.equal(reply.state.requiredStaffing.inputs[field],null);
 assert.doesNotMatch(JSON.stringify([sent,reply,logs]),new RegExp(secret));assert.equal(JSON.parse(logs[0][1]).groundingReads,undefined);
 assert.equal(payload.evidenceGrounding,undefined);assert.equal(payload.currentEvidence,undefined);assert.equal(payload.citationCatalog,undefined);
 // A normal numeric follow-up leaves the scenario-only contract and revalidates live evidence.
 const follow=fresh(fixedMessages.followup,false,reply.state,2);follow.evidence=body.evidence;
 const failed=await submit(route,follow);assert.equal(failed.status,503);assert.equal(route.sandbox.__aggregateReads.length,1);assert.equal(route.sandbox.__requests.length,1);
});

test('scenario-only extraction rejects unsupported tools, invented quantities and model prose without fallback',async()=>{
 const route=await offlineBusinessRoute();route.sandbox.console={info(){},error(){}};route.sandbox.__aggregateSources=sources;route.sandbox.__aggregateReads=[];
 const cases=[
  r=>{r.output[0].name='read_evidence';r.output[0].arguments='{"sourceIds":[]}';},
  r=>{r.output[0].name='project_headcount';},r=>{r.output.push({...r.output[0],call_id:'extra'});},
  r=>{r.status='incomplete';},r=>{r.output=[];},r=>{r.output_text='Company staffing is verified.';},
  r=>{r.output.push({type:'message',role:'assistant',content:[{type:'output_text',text:secret,annotations:[]}]});},
  r=>{r.output[0].arguments='invalid';},
  ...['invent','missing','proposed','wrong-quote','wrong-turn','unknown-zero','duplicate','extra-field'].map(kind=>r=>{
   const args=JSON.parse(r.output[0].arguments);
   if(kind==='invent')args.changes.find(e=>e.field==='trainingCostPerPerson').value=1;
   if(kind==='missing')args.changes.pop();
   if(kind==='proposed')args.changes[0].basis={kind:'model-proposed',turnId:null,quote:null,explanation:'Proposed'};
   if(kind==='wrong-quote')args.changes[0].basis.quote='Do not save anything.';
   if(kind==='wrong-turn')args.changes[0].basis.turnId='prior';
   if(kind==='unknown-zero')args.changes.push({...args.changes[0],field:'hireTrainingHoursPerPerson',value:0});
   if(kind==='duplicate')args.changes.push(args.changes[0]);
   if(kind==='extra-field')args.private=secret;
   r.output[0].arguments=JSON.stringify(args);
  }),
 ];
 for(const mutate of cases){const body=poisonedBody(),r=response(body),before=JSON.stringify(body),start=route.sandbox.__requests.length;mutate(r);route.sandbox.__replies.push(r);const result=await submit(route,body),reply=await result.json();assert.equal(result.status,422);assert.equal(route.sandbox.__requests.length,start+1);assert.equal(route.sandbox.__aggregateReads.length,0);assert.equal(reply.state,undefined);assert.equal(reply.answer,undefined);assert.equal(JSON.stringify(body),before);assert.doesNotMatch(JSON.stringify(reply),new RegExp(secret));}
});

test('ineligible actual, mixed, scoped or retained requests keep fresh grounding and fail before dispatch if evidence cannot verify',async()=>{
 const route=await offlineBusinessRoute();route.sandbox.console={info(){},error(){}};route.sandbox.__aggregateSources=sources;route.sandbox.__aggregateRead=()=>{throw Error('Synthetic source unavailable');};route.sandbox.__aggregateReads=[];
 const requests=[poisonedBody(liveStaffingMessage.replace('These are illustrative assumptions: ','')),poisonedBody(liveStaffingMessage+' Also explain FTE.'),poisonedBody(liveStaffingMessage.replace('illustrative','actual company')),poisonedBody()];requests[3].filters.country='US';requests[3].scope='United States';
 const history=poisonedBody();history.state.turns=[{id:'prior',role:'assistant',text:secret}];requests.push(history);
 const goal=poisonedBody();goal.goalContext={source:secret};requests.push(goal);
 const saved=fresh(liveStaffingMessage,true);saved.evidence=poisonedBody().evidence;requests.push(saved);
 requests.push(poisonedBody(liveStaffingMessage.replace('10 engineering roles','0 engineering roles')));
 for(const body of requests){const start=route.sandbox.__aggregateReads.length;body.staffingScenarioOnly=true;const result=await submit(route,body);assert.equal(result.status,503);assert.equal(route.sandbox.__aggregateReads.length,start+1);assert.equal(route.sandbox.__requests.length,0);}
});

test('request, dataset, mode and cancellation gates still precede scenario provider dispatch',async()=>{
 const route=await offlineBusinessRoute();route.sandbox.console={info(){},error(){}};const body=poisonedBody();
 assert.equal((await submit(route,body,{headers:{'x-workforce-dataset':'legacy-v1:1'}})).status,409);
 assert.equal((await submit(route,body,{headers:{'x-workforce-conversation':'unrecognized'}})).status,422);
 assert.equal((await submit(route,{...body,state:{version:9}})).status,422);
 const aborted=new AbortController();aborted.abort();assert.equal((await submit(route,body,{signal:aborted.signal})).status,422);
 delete route.sandbox.process.env.OPENAI_API_KEY;assert.equal((await submit(route,body)).status,422);
 assert.equal(route.sandbox.__requests.length,0);
 const controller=new AbortController(),runtime=fixtureRuntime([{name:'compare_required_staffing',args:{changes:fixedChanges(body)}}]);runtime.staffingScenarioOnly=true;runtime.natural={datasetToken:token};const complete=runtime.complete;runtime.complete=async(...args)=>{const result=await complete(...args);controller.abort();return result;};
 await assert.rejects(converseSolutions(body,runtime,controller.signal));assert.equal(body.state.requiredStaffing,undefined);
 const ineligible=fresh(liveStaffingMessage+' Check company availability.');await assert.rejects(converseSolutions(ineligible,runtime,new AbortController().signal),/not eligible/);assert.equal(runtime.rounds,1);
});
