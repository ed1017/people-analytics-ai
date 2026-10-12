/** Synthetic route reproduction. No actual prompt logs, provider or database calls. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {solutionRequest,candidate,evaluate,final} from './fixtures/home-solution-conversation.mjs';
import {responseForStep} from './fixtures/natural-business-planning.mjs';
import {offlineBusinessRoute} from './helpers/offline-business-route.mjs';
const question='How can we reduce turnover in the team with the highest recorded voluntary turnover?';
test('shared route separates unsupported scope, checked proposals and deadline failures offline',async t=>{
 const isolated=await offlineBusinessRoute(),logs=[];isolated.sandbox.console={info:(...args)=>logs.push(args),error:(...args)=>logs.push(args)};
 const post=body=>isolated.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',body:JSON.stringify(body)}));
 await t.test('exact wording can return a bounded unsupported decision in one round',async()=>{
  const body=solutionRequest(question),before=structuredClone(body);
  isolated.sandbox.__replies.push(responseForStep(final({findings:'The supplied evidence does not identify or rank teams by recorded voluntary turnover.',decisionRationale:'A team cannot be selected from company-wide aggregates.',caveats:['Business units are not teams.'],unsupportedPlan:{decision:'Which eligible team should join a retention pilot?',nextStep:'Confirm a team population and comparable recorded turnover period, then review a manager and workload pilot.',calculationRefs:[]}})));
  const response=await post(body),reply=await response.json();assert.equal(response.status,200);assert.equal(reply.usage.modelRounds,1);assert.equal(reply.usage.toolCalls,0);assert.match(reply.answer,/does not identify or rank teams/);assert.deepEqual(body,before);
 });
 for(const [domain,prompt] of [['manager_workload',question],['learning','How can we improve skills in the group with the largest recorded skills gap?']])await t.test(domain+' checked pilot needs two rounds, not four',async()=>{
  const body=solutionRequest(prompt),c=candidate(domain);c.activities[0].domain=domain;c.activities[0].evidenceIds=[];
  isolated.sandbox.__replies.push(responseForStep(evaluate(c)),responseForStep(final('The requested group ranking is not established; this is an unconfirmed pilot to review after agreeing the population.',[c.id])));
  const response=await post(body),reply=await response.json();assert.equal(response.status,200);assert.equal(reply.usage.modelRounds,2);assert.equal(reply.usage.toolCalls,1);assert.deepEqual(reply.candidateIds,[c.id]);assert.equal(reply.state.working.at(-1).draft.inputs.scope.population.value,null);
 });
 await t.test('three synthetic tool rounds followed by provider abort reproduce generic deadline with earlier state retained',async()=>{
  const body=solutionRequest(question),before=structuredClone(body),deadline=new AbortController();
  isolated.sandbox.AbortSignal={any:AbortSignal.any.bind(AbortSignal),timeout:()=>deadline.signal};
  const c=candidate('bounded-pilot');c.activities[0].domain='manager_workload';
  isolated.sandbox.__replies.push(responseForStep({name:'read_clock',args:{}}),responseForStep({name:'read_evidence',args:{sourceIds:[]}}),responseForStep(evaluate(c)),()=>{deadline.abort();throw Object.assign(Error('Synthetic operation abort'),{name:'APIUserAbortError'});});
  const response=await post(body),reply=await response.json(),event=JSON.parse(logs.at(-1)[1]);
  assert.equal(response.status,422);assert.equal(reply.code,'conversation_deadline');assert.match(reply.error,/could not be completed or verified/);assert.equal(event.modelAttempts,4);assert.equal(event.providerRounds.length,3);assert.equal(event.stage,'provider');assert.equal(event.providerErrorClass,'APIUserAbortError');assert.equal(event.reason,null);assert.deepEqual(body,before);assert.equal(reply.state,undefined);
  assert.ok(isolated.sandbox.__requestOptions.every(options=>options.maxRetries===0));
 });
});

test('actual route accepts optional co-produced typed final only after tool checks, with fixed diagnostics and unchanged transport gates',async()=>{
 const isolated=await offlineBusinessRoute(),logs=[];isolated.sandbox.console={info:(...args)=>logs.push(args),error:(...args)=>logs.push(args)};
 const c=candidate('checked-pilot'),answer=final('Review the unconfirmed pilot after confirming the population.',[c.id]),combined={...responseForStep(evaluate(c),1),output_text:JSON.stringify(answer)};
 isolated.sandbox.__replies.push(combined);
 const body=solutionRequest(question),response=await isolated.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',body:JSON.stringify(body)})),reply=await response.json();
 assert.equal(response.status,200);assert.deepEqual(reply.usage,{modelRounds:1,toolCalls:1});assert.deepEqual(reply.candidateIds,[c.id]);
 const event=JSON.parse(logs.at(-1)[1]);assert.equal(event.toolSequence.length,1);assert.equal(event.toolSequence[0].name,'evaluate_candidate');assert.equal(event.toolSequence[0].status,'ok');
 const sent=isolated.sandbox.__requests[0],options=isolated.sandbox.__requestOptions[0];assert.equal(options.maxRetries,0);assert.equal(options.timeout,60000);assert.equal(sent.max_output_tokens,5000);assert.equal(sent.parallel_tool_calls,false);assert.equal(sent.model,'gpt-6.1-sol');
 const context=JSON.parse(sent.input[0].content.split('\n').slice(1).join('\n'));assert.match(context.preparation.clock.basis,/request-start/);assert.match(sent.instructions,/same response as those tool calls/);
});
