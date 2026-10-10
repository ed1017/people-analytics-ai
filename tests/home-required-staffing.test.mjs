import test from 'node:test';
import assert from 'node:assert/strict';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {currentRequiredStaffing,editRequiredStaffing,readRequiredStaffingReview,requiredStaffingView,requiresRequiredStaffing,canCompleteRequiredStaffingAlone} from '../lib/home-required-staffing.ts';
import {solutionRequest,fixtureRuntime,final,constraint} from './fixtures/home-solution-conversation.mjs';
import {fixedMessages,fixedValues,fixedChanges,fixedBasis,fixedSteps} from './fixtures/required-staffing.mjs';
import {offlineBusinessRoute} from './helpers/offline-business-route.mjs';
import {responseForStep} from './fixtures/natural-business-planning.mjs';
import {initialSpec} from './fixtures/natural-business-planning.mjs';
import {runBusinessPlanningTool} from '../lib/home-business-planning.ts';
const token='legacy-v1:0';
test('fixed-role calculations fail closed when the provider skips the tool or its typed edit fails',async()=>{
 const request=solutionRequest(fixedMessages.start),unsafe=final('Hire ten: 1600000 USD and 0 training hours. New-hire training remains unknown.');
 for(const steps of [[unsafe],[{name:'compare_required_staffing',args:{changes:[{field:'requiredRoles',value:10,basis:{...fixedBasis(request),quote:'fabricated'}}]}},unsafe]]){
  const runtime=fixtureRuntime(steps);runtime.natural={datasetToken:token};
  await assert.rejects(converseSolutions(request,runtime,new AbortController().signal),/not calculated/);assert.equal(request.state.requiredStaffing,undefined);
 }
 const initial=(await ask(fixedMessages.start)).reply,follow=solutionRequest(fixedMessages.followup,false,initial.state,2),runtime=fixtureRuntime([unsafe]);runtime.natural={datasetToken:token};
 await assert.rejects(converseSolutions(follow,runtime,new AbortController().signal),/not calculated/,'Retained prior state is not a current-turn calculation');
 const implicit=solutionRequest('Review this approach.'),failed=fixtureRuntime([{name:'compare_required_staffing',args:{changes:[{field:'requiredRoles',value:10,basis:{...fixedBasis(implicit),quote:'fabricated'}}]}},unsafe]);failed.natural={datasetToken:token};
 await assert.rejects(converseSolutions(implicit,failed,new AbortController().signal),/not calculated/,'A model-selected staffing operation must also complete successfully');
});
test('checked calculator output owns final prose and preserves unspecified new-hire training',async()=>{
 const body=solutionRequest(fixedMessages.start),runtime=fixtureRuntime([{name:'compare_required_staffing',args:{changes:fixedChanges(body)}}]);runtime.natural={datasetToken:token};
 const reply=await converseSolutions(body,runtime,new AbortController().signal);assert.match(reply.answer,/1600000 USD/);assert.match(reply.answer,/30000 USD/);assert.match(reply.answer,/495000 USD/);assert.match(reply.answer,/480 planned training hours/);assert.match(reply.answer,/new-hire training not specified/);assert.match(reply.answer,/Readiness: Unknown/);assert.doesNotMatch(reply.answer,/zero training|0 training hours|1 USD|available immediately/);assert.equal(reply.state.turns.at(-1).text,reply.answer);assert.equal(reply.state.requiredStaffing.inputs.hireTrainingHoursPerPerson,null);
 assert.deepEqual(reply.usage,{modelRounds:1,toolCalls:1});assert.equal(runtime.rounds,1);assert.match(reply.answer,/Recommendation:.*conditional/);assert.match(reply.answer,/Nothing was saved or applied/);
});
test('missing inputs remain unknown and failed or oversized calculations cannot use deterministic completion',async()=>{
 const request=solutionRequest(fixedMessages.start),runtime=fixtureRuntime([{name:'compare_required_staffing',args:{changes:fixedChanges(request,{role:'Engineering roles',requiredRoles:10,months:12,currency:'USD'})}}]);runtime.natural={datasetToken:token};
 const reply=await converseSolutions(request,runtime,new AbortController().signal);assert.equal(runtime.rounds,1);assert.equal(reply.state.requiredStaffing.inputs.hireCostPerPerson,null);assert.equal(reply.state.requiredStaffing.inputs.hireTrainingHoursPerPerson,null);assert.equal(requiredStaffingView(reply.state.requiredStaffing).options[0].listedCash,null);assert.match(reply.answer,/unknown|missing|Unknown/);assert.doesNotMatch(reply.answer,/1600000|30000|495000/);
 const long=solutionRequest(fixedMessages.start+' '+ 'x'.repeat(3300));
 const prior=editRequiredStaffing(long,token,fixedChanges(long,{...fixedValues,hireTrainingHoursPerPerson:0,backfillCostPerInternalPerson:0,internalRelease:false,costsComplete:false,hireReadyAfterMonths:0,trainingReadyAfterMonths:0,redeployReadyAfterMonths:0}));
 assert.ok(JSON.stringify(requiredStaffingView(prior)).length>65000);
 const next=solutionRequest(fixedMessages.followup,false,{...request.state,requiredStaffing:prior},2),before=JSON.stringify(next),failed=fixtureRuntime([{name:'compare_required_staffing',args:{changes:[]}},final('A calculation succeeded.')]);failed.natural={datasetToken:token};
 await assert.rejects(converseSolutions(next,failed,new AbortController().signal),/not calculated/);assert.equal(JSON.stringify(next),before);
 const incomplete=fixtureRuntime([fixedSteps(request)[0]]);incomplete.natural={datasetToken:token};const complete=incomplete.complete;incomplete.complete=async(...args)=>({...await complete(...args),completed:false});
 await assert.rejects(converseSolutions(request,incomplete,new AbortController().signal),/incomplete/);assert.equal(request.state.requiredStaffing,undefined);
});
test('saved plans, existing constraints and opportunistic staffing retain normal continuation',async()=>{
 const constrained=solutionRequest(fixedMessages.start);constrained.state.turns=[{id:'earlier',role:'user',text:'Use a USD 1000000 budget.'}];constrained.state.constraints=[constraint(1000000,'earlier')];
 const opportunistic=solutionRequest(fixedMessages.start.replace('fill 10','consider 10'));assert.equal(requiresRequiredStaffing(opportunistic),false);
 for(const body of [solutionRequest(fixedMessages.start,true),constrained,opportunistic]){
  const before=JSON.stringify(body),runtime=fixtureRuntime([{name:'compare_required_staffing',args:{changes:fixedChanges(body)}},final('Untrusted intermediate prose.')]);runtime.natural={datasetToken:token};
  const reply=await converseSolutions(body,runtime,new AbortController().signal);assert.equal(runtime.rounds,2);assert.equal(reply.usage.toolCalls,1);assert.match(reply.answer,/495000 USD/);assert.equal(JSON.stringify(body),before);assert.deepEqual(reply.state.constraints,body.state.constraints);
 }
});
const simpleStaffing='Fill 10 engineering roles by hiring/training/redeploying.';
const compoundStaffing=simpleStaffing+' Also review an annual hiring budget for five designers.';
test('only completely recognized standalone wording can restrict tools or finish early',()=>{
 for(const text of [simpleStaffing,fixedMessages.start,'Compare ways to fill ten engineering roles by hiring, training and redeploying.'])assert.equal(canCompleteRequiredStaffingAlone(solutionRequest(text)),true,text);
 for(const text of [compoundStaffing,simpleStaffing+' Also explain FTE.',simpleStaffing+' Then project headcount.',simpleStaffing+' Review turnover too.',simpleStaffing.replace('.',' and review an annual hiring budget for five designers.'),simpleStaffing+' Something else may matter.',simpleStaffing+' Fill 5 designer roles by hiring/training/redeploying.']){
  assert.equal(requiresRequiredStaffing(solutionRequest(text)),true);assert.equal(canCompleteRequiredStaffingAlone(solutionRequest(text)),false,text);
 }
 const first=solutionRequest(fixedMessages.start),state={...first.state,requiredStaffing:editRequiredStaffing(first,token,fixedChanges(first))};
 for(const text of [fixedMessages.followup,fixedMessages.correction]){
  assert.equal(canCompleteRequiredStaffingAlone(solutionRequest(text,false,state,2)),true);
  assert.equal(canCompleteRequiredStaffingAlone(solutionRequest(text+' Also review an annual hiring budget for five designers.',false,state,2)),false);
 }
});
test('actual POST keeps compound requests on legal sequential tools and retains the additional answer',async()=>{
 const route=await offlineBusinessRoute();route.sandbox.console={info(){},error(){}};
 const simple=solutionRequest(simpleStaffing);
 route.sandbox.__replies.push(responseForStep({name:'compare_required_staffing',args:{changes:fixedChanges(simple,{role:'Engineering roles',requiredRoles:10})}},0));
 const simpleResponse=await route.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',body:JSON.stringify(simple)})),simpleReply=await simpleResponse.json();
 assert.equal(simpleResponse.status,200);assert.deepEqual(simpleReply.usage,{modelRounds:1,toolCalls:1});assert.equal(route.sandbox.__requests.length,1);
 assert.deepEqual(JSON.parse(JSON.stringify(route.sandbox.__requests[0].tools.map(tool=>tool.name))),['compare_required_staffing']);assert.deepEqual(JSON.parse(JSON.stringify(route.sandbox.__requests[0].tool_choice)),{type:'function',name:'compare_required_staffing'});
 let combinedState;
 for(const [i,text] of [compoundStaffing,fixedMessages.start+' Also review an annual hiring budget for five designers.',simpleStaffing+' Also explain FTE.',simpleStaffing+' Something else may matter.',fixedMessages.followup].entries()){
  const continuation=text===fixedMessages.followup,body=solutionRequest(text,false,continuation?combinedState:undefined,i+2),before=JSON.stringify(body),budget=text.includes('five designers')||continuation,start=route.sandbox.__requests.length;
  const additional=budget?'The annual hiring budget for five designers still needs currency, annual pay and arrival timing.':text.includes('FTE')?'FTE describes equivalent full-time capacity.':'Please clarify the additional consideration.';
  const answer={...final(additional),questions:budget?['What currency and annual pay should the designer budget use?']:[]};
  const steps=[{name:'compare_required_staffing',args:{changes:continuation?[]:fixedChanges(body,text.startsWith(fixedMessages.start)?fixedValues:{role:'Engineering roles',requiredRoles:10})}},...(budget?[{name:'review_hiring_budget',args:{changes:continuation?[]:fixedChanges(body,{role:'Designers',hires:5,months:12})}}]:[]),answer];
  let step=0;
  route.sandbox.__replies.shift=()=>{
   const sent=route.sandbox.__requests.at(-1),next=steps[step++];assert.ok(next,'No extra provider round');assert.equal(sent.tool_choice,'auto');assert.equal(sent.parallel_tool_calls,false);assert.ok(sent.tools.length>1);
   for(const name of ['compare_required_staffing','review_hiring_budget','read_clock'])assert.ok(sent.tools.some(tool=>tool.name===name),name+' remains available');
   if(next.name)assert.ok(sent.tools.some(tool=>tool.name===next.name),'Synthetic call must be offered by the actual request');
   return responseForStep(next,step);
  };
  const response=await route.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',body:JSON.stringify(body)})),reply=await response.json();
  assert.equal(response.status,200,JSON.stringify(reply));assert.equal(step,steps.length);assert.equal(route.sandbox.__requests.length-start,steps.length);assert.equal(JSON.stringify(body),before);
  assert.ok(reply.answer.startsWith(additional));assert.match(reply.answer,/Checked fixed-role comparison:/);assert.deepEqual(reply.state.questions,answer.questions);assert.equal(reply.state.requiredStaffing.inputs.requiredRoles,10);assert.equal(reply.state.working.length,0);
  if(budget){assert.equal(reply.state.hiringBudget.inputs.hires,5);assert.equal(reply.state.hiringBudget.inputs.months,12);assert.equal(reply.state.hiringBudget.inputs.annualBasePay,null);assert.equal(reply.state.hiringBudget.inputs.currency,null);assert.deepEqual(reply.usage,{modelRounds:3,toolCalls:2});combinedState=reply.state;}
  else assert.deepEqual(reply.usage,{modelRounds:2,toolCalls:1});
 }
});
test('compound POSTs still fail closed on missing or invalid staffing and oversized combined answers',async()=>{
 const route=await offlineBusinessRoute();route.sandbox.console={info(){},error(){}};
 for(const mode of ['skipped','invalid','oversized']){
  const body=solutionRequest(compoundStaffing),before=JSON.stringify(body),start=route.sandbox.__requests.length;
  const changes=fixedChanges(body,{role:'Engineering roles',requiredRoles:10});if(mode==='invalid')changes[0].basis.quote='fabricated';
  const tool=mode==='skipped'?{name:'review_hiring_budget',args:{changes:fixedChanges(body,{role:'Designers',hires:5,months:12})}}:{name:'compare_required_staffing',args:{changes}};
  const steps=[tool,final(mode==='oversized'?'x'.repeat(9990):'The additional request was considered.')];let step=0;
  route.sandbox.__replies.shift=()=>{
   const sent=route.sandbox.__requests.at(-1),next=steps[step++];assert.ok(next);assert.equal(sent.tool_choice,'auto');if(next.name)assert.ok(sent.tools.some(t=>t.name===next.name));
   if(step===2&&mode==='invalid')assert.equal(JSON.parse(sent.input.filter(item=>item.type==='function_call_output').at(-1).output).ok,false);
   return responseForStep(next,step);
  };
  const response=await route.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',body:JSON.stringify(body)})),reply=await response.json();
  assert.equal(response.status,422,mode);assert.equal(step,2);assert.equal(route.sandbox.__requests.length-start,2);assert.equal(reply.state,undefined);assert.equal(reply.answer,undefined);assert.equal(JSON.stringify(body),before);
 }
});
test('calculation routing covers count comparisons and numeric continuations, keeping unrelated discussion free',()=>{
 for(const text of [fixedMessages.start,'Compare ways to fill ten engineering roles by hiring, training and redeploying.'])assert.equal(requiresRequiredStaffing(solutionRequest(text)),true);
 for(const text of ['What does FTE mean?','Explain hiring versus training.','How many engineers are needed for 100 tickets?'])assert.equal(requiresRequiredStaffing(solutionRequest(text)),false);
 const body=solutionRequest(fixedMessages.start),review=editRequiredStaffing(body,token,fixedChanges(body));
 for(const text of [fixedMessages.followup,fixedMessages.correction])assert.equal(requiresRequiredStaffing(solutionRequest(text,false,{...body.state,requiredStaffing:review},2)),true);
 assert.equal(requiresRequiredStaffing(solutionRequest('What does FTE mean?',false,{...body.state,requiredStaffing:review},2)),false);
});
async function ask(text,state,sequence=1){const request=solutionRequest(text,false,state,sequence),runtime=fixtureRuntime([fixedSteps(request)[0]]);runtime.natural={datasetToken:token};const reply=await converseSolutions(request,runtime,new AbortController().signal);assert.equal(runtime.rounds,1);return {reply,runtime};}
test('actual conversation calculates the fixed requirement and returns numbers on follow-up without population or workload lookup',async()=>{
 const {reply,runtime}=await ask(fixedMessages.start);assert.equal(runtime.reads,0);assert.equal(reply.state.businessPlanning,undefined);assert.equal(reply.state.hiringBudget,undefined);assert.equal(requiredStaffingView(reply.state.requiredStaffing).enumerated,35);assert.match(reply.answer,/1600000 USD/);assert.match(reply.answer,/30000 USD/);assert.match(reply.answer,/495000 USD/);assert.match(reply.answer,/new-hire training not specified/);
 assert.deepEqual(reply.candidateIds,[]);assert.deepEqual(reply.analysisIds,[]);assert.deepEqual(reply.state.verifiedMetrics,[]);assert.equal(reply.state.working.length,0);
 const next=await ask(fixedMessages.followup,reply.state,2);assert.match(next.reply.answer,/495000 USD/);assert.equal(next.runtime.reads,0);assert.deepEqual(next.reply.state.requiredStaffing.origins,reply.state.requiredStaffing.origins);assert.deepEqual(next.reply.state.requiredStaffing.inputs,reply.state.requiredStaffing.inputs);
});
test('current-user correction recalculates all comparisons while preserving other inputs and explicit unknowns',async()=>{
 const initial=(await ask(fixedMessages.start)).reply,next=(await ask(fixedMessages.correction,initial.state,2)).reply;
 assert.match(next.answer,/42000 USD/);assert.match(next.answer,/501000 USD/);assert.match(next.answer,/240 planned training hours/);
 const before=initial.state.requiredStaffing,after=next.state.requiredStaffing;
 for(const field of Object.keys(fixedValues))if(field!=='trainingCostPerPerson'){assert.equal(after.inputs[field],before.inputs[field]);assert.deepEqual(after.origins[field],before.origins[field]);}
 assert.equal(after.origins.trainingCostPerPerson.turnId,'user-2');assert.equal(after.inputs.internalRelease,null);assert.equal(after.inputs.hireTrainingHoursPerPerson,null);
});
test('a prior incomplete workload review cannot force the fixed requirement back through workload inputs',async()=>{
 const body=solutionRequest(fixedMessages.start),spec={...initialSpec(body),objective:'Fill ten required engineering roles.'};
 const businessPlanning=await runBusinessPlanningTool(body,token,null,'review_scoped_service_demand',{spec},0);
 assert.equal(businessPlanning.review.result.status,'needs-inputs');
 const {reply}=await ask(fixedMessages.start,{...body.state,businessPlanning},2);
 assert.equal(requiredStaffingView(reply.state.requiredStaffing).enumerated,35);assert.deepEqual(reply.state.businessPlanning,businessPlanning);assert.match(reply.answer,/495000 USD/);
});
test('forged source rates, stale scopes, unsupported inputs and silent premise changes are refused',()=>{
 const request=solutionRequest(fixedMessages.start),s=editRequiredStaffing(request,token,fixedChanges(request));
 assert.throws(()=>readRequiredStaffingReview({...s,result:{listedCash:1}}));assert.throws(()=>readRequiredStaffingReview({...s,origins:{...s.origins,hireCostPerPerson:{...s.origins.hireCostPerPerson,kind:'company-source'}}}));
 const next=solutionRequest('Change a premise.',false,{...request.state,requiredStaffing:s},2);
 assert.throws(()=>currentRequiredStaffing(next,'other:0'),/another goal/);assert.throws(()=>currentRequiredStaffing({...next,scope:'Changed'},token),/another goal/);
 const change={field:'trainingCostPerPerson',value:1,basis:{kind:'model-proposed',turnId:null,quote:null,explanation:'Unapproved rewrite.'}};assert.throws(()=>editRequiredStaffing(next,token,[change]),/user correction/);
 assert.throws(()=>editRequiredStaffing(next,token,[{...change,basis:{...fixedBasis(next),quote:'fabricated'}}]),/exact user quote/);
 assert.throws(()=>editRequiredStaffing(next,token,fixedChanges(next,{currency:'EUR'})),/restating or clearing/);assert.throws(()=>editRequiredStaffing(next,token,fixedChanges(next,{months:6})),/restating or clearing/);assert.throws(()=>editRequiredStaffing(next,token,fixedChanges(next,{role:'Another role'})),/restating or clearing/);
 const withdrawn=editRequiredStaffing(next,token,fixedChanges(next,{hireCostPerPerson:null}));assert.equal(requiredStaffingView(withdrawn).options[0].listedCash,null);
});
test('a horizon correction must restate or clear the period redeployment quote even when other period costs are restated',()=>{
 const initial=solutionRequest(fixedMessages.start.replace('Redeployment adds zero cash per person.','Redeployment adds USD 1200 cash per person for the 12-month period.'));
 const prior=editRequiredStaffing(initial,token,fixedChanges(initial,{...fixedValues,redeploymentCostPerPerson:1200}));
 const text='Use 6 months, USD 80000 per hire for that period and a USD 500000 budget. Backfill remains unknown.';
 const next=solutionRequest(text,false,{...initial.state,requiredStaffing:prior},2);
 const periodChanges={months:6,hireCostPerPerson:80000,backfillCostPerInternalPerson:null,budget:500000};
 assert.throws(()=>editRequiredStaffing(next,token,fixedChanges(next,periodChanges)),/restating or clearing/);
 assert.equal(prior.inputs.months,12);assert.equal(prior.inputs.redeploymentCostPerPerson,1200);
 const clear=solutionRequest(text+' Clear the redeployment quote; its cost for 6 months is unknown.',false,next.state,2);
 const cleared=editRequiredStaffing(clear,token,fixedChanges(clear,{...periodChanges,redeploymentCostPerPerson:null}));
 assert.equal(cleared.inputs.months,6);assert.equal(cleared.inputs.redeploymentCostPerPerson,null);
 const restate=solutionRequest(text+' Redeployment costs USD 600 per person for the 6-month period.',false,next.state,2);
 const restated=editRequiredStaffing(restate,token,fixedChanges(restate,{...periodChanges,redeploymentCostPerPerson:600}));
 assert.equal(restated.inputs.redeploymentCostPerPerson,600);assert.equal(restated.origins.redeploymentCostPerPerson.turnId,'user-2');
 assert.equal(requiredStaffingView(restated).options.find(o=>o.train===6&&o.redeploy===4).listedCash,32400);
});
test('actual POST offers the direct tool and preserves numerical initial/follow-up/correction replies through offline transport',async()=>{
 const route=await offlineBusinessRoute();route.sandbox.console={info(){},error(){}};let state;
 for(const [i,message] of Object.values(fixedMessages).entries()){
  const body=solutionRequest(message,false,state,i+1),steps=fixedSteps(body);
  route.sandbox.__replies.push(responseForStep(steps[0],0));
  const response=await route.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',body:JSON.stringify(body)}));
  assert.equal(response.status,200);const reply=await response.json();state=reply.state;
  assert.match(reply.answer,i===2?/501000 USD/:/495000 USD/);assert.equal(state.requiredStaffing.inputs.requiredRoles,10);assert.equal(state.businessPlanning,undefined);
  assert.deepEqual(reply.usage,{modelRounds:1,toolCalls:1});
 }
 assert.equal(route.sandbox.__requests.length,3);assert.match(route.sandbox.__requests[0].instructions,/does not require ticket volume/);
 for(const sent of route.sandbox.__requests){assert.deepEqual(JSON.parse(JSON.stringify(sent.tools.map(t=>t.name))),['compare_required_staffing']);assert.deepEqual(JSON.parse(JSON.stringify(sent.tool_choice)),{type:'function',name:'compare_required_staffing'});assert.equal(sent.parallel_tool_calls,false);assert.equal(sent.model,'gpt-6.1-sol');assert.equal(sent.reasoning.effort,'medium');assert.equal(sent.service_tier,'default');assert.equal(sent.max_output_tokens,5000);assert.match(JSON.stringify(sent.input),/evidenceGrounding/);}
 assert.ok(route.sandbox.__requestOptions.every(o=>o.maxRetries===0&&o.timeout===60000));
 route.sandbox.__replies.push(responseForStep(final('FTE describes equivalent full-time capacity.')));
 const ordinary=await route.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',body:JSON.stringify(solutionRequest('What does FTE mean?'))}));assert.equal(ordinary.status,200);
 const sent=route.sandbox.__requests.at(-1);assert.equal(sent.tool_choice,'auto');assert.ok(sent.tools.length>1);assert.ok(sent.tools.some(t=>t.name==='read_clock'));assert.ok(sent.tools.some(t=>t.name==='review_hiring_budget'));
});
test('actual POST refuses an otherwise valid prose-only reply for a fixed-role request',async()=>{
 const route=await offlineBusinessRoute();route.sandbox.console={info(){},error(){}};route.sandbox.__replies.push(responseForStep(final('Hire ten for 1600000 USD with 0 training hours.')));
 const response=await route.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',body:JSON.stringify(solutionRequest(fixedMessages.start))})),reply=await response.json();assert.equal(response.status,422);assert.equal(reply.code,'response_validation_failed');assert.equal(reply.state,undefined);assert.equal(reply.answer,undefined);assert.equal(route.sandbox.__requests.length,1);
});
