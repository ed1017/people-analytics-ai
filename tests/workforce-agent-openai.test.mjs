import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import OpenAI from 'openai';
import {createWorkforceAgentOpenAIModel} from '../lib/workforce-agent-openai.ts';
import {runWorkforcePlanningAgent,readWorkforceAgentReview} from '../lib/workforce-planning-agent.ts';
import {workforceReviewFixture} from './fixtures/workforce-review.mjs';
import {createWorkforceSolution,emptySolutionInputs,beginSolutionRun,completeSolutionRun} from '../lib/workforce-solution.ts';
import {calculateWorkforceIncrement} from '../lib/workforce-increment.ts';
import {CHAT_MODEL} from '../lib/chat-model.ts';
const at='2026-10-03T01:00:00.000Z';
function fixture(patch={}){
 const payload=workforceReviewFixture();Object.assign(payload.input,patch);
 payload.proposed=calculateWorkforceIncrement(payload.input,payload.timing);payload.hireOnly=calculateWorkforceIncrement({...payload.input,build:'0',move:'0',buy:payload.input.roles,backfills:'0',internalAnnualCostChange:'0',trainingCash:'0',trainingHours:'0'},payload.timing);
 let solution=createWorkforceSolution('private-solution-id','private-goal-id',{...emptySolutionInputs(),scope:{...payload.input,goalStatement:'Synthetic workforce test',ownerNotes:'excluded-owner-note'}},at);
 const started=beginSolutionRun(solution,1,'source-run',['brief'],at);solution=completeSolutionRun(started.state,started.ticket,[{id:'source-result',kind:'brief',calculator:{name:'single-role-workforce-review',version:'1'},payload}],at);
 return {solution,input:payload.input};
}
const response=(name,args)=>new Response(JSON.stringify({id:'synthetic-response',object:'response',status:'completed',output:[{type:'reasoning',summary:[{text:'excluded-reasoning'}]},{type:'function_call',status:'completed',call_id:'synthetic-call',name,arguments:JSON.stringify(args)}]}),{status:200,headers:{'Content-Type':'application/json'}});
function client(fetch){return new OpenAI({apiKey:'synthetic-test-only',baseURL:'https://api.openai.com/v1',fetch,logLevel:'off',maxRetries:2})}
function run(solution,model,extra={}){return runWorkforcePlanningAgent({solution,currentSolution:()=>solution,evidenceResultId:'source-result',reviewedRevisions:[],allowRevision:false,runId:'synthetic-run',signal:new AbortController().signal,model,...extra})}

test('real SDK serialization connects four-turn synthetic revision flow to deterministic validation without network',async()=>{
 const {solution,input}=fixture({budget:'20000'}),requests=[];
 const model=createWorkforceAgentOpenAIModel(client(async(url,options)=>{
  assert.equal(String(url),'https://api.openai.com/v1/responses');const body=JSON.parse(options.body);requests.push(body);
  assert.equal(body.model,CHAT_MODEL);assert.equal(body.store,false);assert.equal(body.parallel_tool_calls,false);assert.equal(body.tool_choice,'required');assert.equal(body.max_output_tokens,1200);
  const serialized=JSON.stringify(body);
  for(const excluded of ['excluded-owner-note','private-solution-id','private-goal-id','source-result','internal_talent_readiness','skill_bundle','excluded-reasoning'])assert.ok(!serialized.includes(excluded));
  assert.ok(options.signal instanceof AbortSignal);
  const turn=requests.length;
  if(turn<4)return response('evaluate_workforce_option',{option_id:['reviewed-mix','hiring-only','revision-1'][turn-1]});
  const data=JSON.parse(body.input[0].content);assert.deepEqual(data.evaluations.map(item=>item.cash),[22500,51000,19500]);
  assert.deepEqual(Object.keys(data.evaluations[0]),['optionId','status','cash','employeeTimeValue','addedEmployees','arrivalDate','checks']);
  return response('finish_workforce_review',{conclusion:'constraints_met_outcomes_unknown',preferred_option_id:'revision-1',reviewed_option_ids:['reviewed-mix','hiring-only','revision-1']});
 }));
 const before=JSON.stringify(solution),review=await run(solution,model,{allowRevision:true,reviewedRevisions:[{...input,trainingCash:'0'}]});
 assert.equal(requests.length,4);assert.equal(review.preferredOptionId,'revision-1');assert.ok(readWorkforceAgentReview(review,solution));assert.equal(JSON.stringify(solution),before);
});
test('SDK adapter preserves unknown constraints through the complete three-turn protocol',async()=>{
 const {solution}=fixture({annualHireCost:''});let calls=0;
 const model=createWorkforceAgentOpenAIModel(client(async()=>++calls<3?response('evaluate_workforce_option',{option_id:calls===1?'hiring-only':'reviewed-mix'}):response('finish_workforce_review',{conclusion:'constraints_incomplete',preferred_option_id:null,reviewed_option_ids:['hiring-only','reviewed-mix']})));
 const review=await run(solution,model);assert.equal(calls,3);assert.equal(review.conclusion,'constraints_incomplete');assert.equal(review.evaluations[0].plan.totalCash,null);
});
test('HTTP denial, rate-limit and server failures are sanitized and never retried by the SDK',async()=>{
 for(const status of [401,403,429,500]){
  const {solution}=fixture();let calls=0;
  const model=createWorkforceAgentOpenAIModel(client(async()=>{calls++;return new Response(JSON.stringify({error:{message:'fixture-body-must-not-leak',type:'fixture'}}),{status,headers:{'Content-Type':'application/json'}})}));
  await assert.rejects(run(solution,model),error=>error.message===`Workforce model request failed (HTTP ${status}); no retry was attempted.`&&error.cause===undefined);
  assert.equal(calls,1);assert.equal(solution.results.length,1);
 }
});
test('connection failure and invalid model output cannot expose raw payloads or create reviews',async()=>{
 const {solution}=fixture();let calls=0;
 const model=createWorkforceAgentOpenAIModel(client(async()=>{calls++;throw Error('fixture-transport-private-detail')}));
 await assert.rejects(run(solution,model),{message:'Workforce model transport failed; no retry was attempted.'});assert.equal(calls,1);
 await assert.rejects(run(solution,createWorkforceAgentOpenAIModel(client(async()=>response('fetch_employees',{private:'fixture-private-payload'})))),{message:'Invalid workforce tool invocation.'});
});
test('SDK cancellation aborts transport and rejects late responses without another turn',async()=>{
 const {solution}=fixture(),controller=new AbortController();let calls=0,sdkSignal;
 const model=createWorkforceAgentOpenAIModel(client(async(_url,options)=>{calls++;sdkSignal=options.signal;controller.abort();return response('evaluate_workforce_option',{option_id:'reviewed-mix'})}));
 await assert.rejects(run(solution,model,{signal:controller.signal}));assert.equal(calls,1);assert.equal(sdkSignal.aborted,true);assert.equal(solution.results.length,1);
});
test('manual harness requires explicit opt-in and does not create a client in default mode',()=>{
 const child=spawnSync(process.execPath,['tests/manual/workforce-agent-openai.mjs'],{cwd:process.cwd(),encoding:'utf8',env:{PATH:process.env.PATH}});
 // Some hosted runtimes suppress captured child stdout. The dedicated refusal
 // exit code still distinguishes opt-out (2) from a configured/live attempt (1).
 assert.equal(child.status,2);
});
