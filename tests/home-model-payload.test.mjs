/** Actual route and pinned SDK with synthetic transports; no paid/provider/data calls. */
import test from 'node:test';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import {requiredStaffingTool} from '../lib/home-required-staffing.ts';
import {hiringBudgetTool} from '../lib/home-hiring-budget.ts';
import {businessPlanningTools} from '../lib/home-business-planning.ts';
import {businessPlanningModelTools} from '../lib/home-model-tool-schemas.ts';
import {progressModelContract} from '../lib/goal-progress-entry-service.ts';
import {progressEntryInstructions} from '../lib/goal-progress-entry.ts';
import {emptyGoalProgress} from '../lib/goal-progress.ts';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {solutionResponseFormat} from '../lib/home-solution-conversation-schema.ts';
import {solutionRequest,fixtureRuntime,final} from './fixtures/home-solution-conversation.mjs';
import {responseForStep} from './fixtures/natural-business-planning.mjs';
import {offlineBusinessRoute} from './helpers/offline-business-route.mjs';

const bytes=value=>Buffer.byteLength(JSON.stringify(value));
function expandSchema(root){
 const walk=(value,ancestors=[])=>{
  if(value?.$ref){
   assert.deepEqual(Object.keys(value),['$ref']);assert.match(value.$ref,/^#\/\$defs\/[A-Za-z0-9_-]+$/);
   const name=value.$ref.split('/').at(-1);assert.ok(!ancestors.includes(name));assert.ok(Object.hasOwn(root.$defs,name));
   return walk(root.$defs[name],[...ancestors,name]);
  }
  if(Array.isArray(value))return value.map(item=>walk(item,ancestors));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>key!=='$defs').map(([key,item])=>[key,walk(item,ancestors)]));
  return value;
 };
 return walk(root);
}

test('outbound shared definitions expand to every original field, constraint and tool attribute',()=>{
 const originals=[...businessPlanningTools,hiringBudgetTool,requiredStaffingTool];
 assert.equal(businessPlanningModelTools.length,originals.length);
 for(const [index,tool] of businessPlanningModelTools.entries()){
  const original=originals[index];
  assert.deepEqual({...tool,parameters:expandSchema(tool.parameters)},original);
  assert.doesNotMatch(JSON.stringify(original.parameters),/"\$ref"|"\$defs"/,'Server validation stays expanded');
  assert.equal(tool.strict,true);
 }
 const saving=bytes(originals)-bytes(businessPlanningModelTools);
 assert.ok(saving>28000,`Expected repetition removal, got ${saving} bytes`);
 assert.equal(businessPlanningModelTools.find(t=>t.name==='clear_business_planning').parameters,businessPlanningTools.at(-1).parameters,'Unrelated clear tool is unchanged');
});

test('progress contract preserves the read path and omits only an ineligible entry tool and its instructions',()=>{
 const unavailable=progressModelContract(true,false),eligible=progressModelContract(true,true);
 assert.deepEqual(unavailable.tools.map(tool=>tool.name),['read_goal_progress']);
 assert.ok(!unavailable.instructions.includes(progressEntryInstructions));assert.match(unavailable.instructions,/Progress entry is unavailable/);
 assert.ok(eligible.instructions.includes(progressEntryInstructions));assert.deepEqual(eligible,progressModelContract(true));
 assert.deepEqual(progressModelContract(false,true),{instructions:'',tools:[]});
});

function savedProgressBody(){
 const body=solutionRequest('Discuss the saved goal progress.',true);
 body.goalProgress={version:1,goalId:body.goal.id,datasetToken:'legacy-v1:0',origin:'authored',ledger:emptyGoalProgress(body.goal.id,'authored'),unavailableReason:null};
 return body;
}
const progressCases=()=>[
 ['unsaved exploration',solutionRequest('Discuss progress.'),true,false],
 ['missing saved input',solutionRequest('Discuss progress.',true),true,false],
 ['valid saved goal',savedProgressBody(),true,true],
 ['feature disabled',savedProgressBody(),false,false],
 ['different dataset',(()=>{const body=savedProgressBody();body.goalProgress.datasetToken='legacy-v1:1';return body;})(),true,false],
 ['invalid saved ledger',(()=>{const body=savedProgressBody();body.goalProgress.ledger={invalid:true};return body;})(),true,false],
];
test('model eligibility comes from the same saved-context predicate that authorizes the server operation',async()=>{
 for(const [label,body,enabled,expected] of progressCases()){
  const runtime=fixtureRuntime([final('No progress was recorded.')]);runtime.progress={enabled,datasetToken:'legacy-v1:0'};
  const complete=runtime.complete;let offered;
  runtime.complete=(input,finalOnly,signal,capabilities)=>{offered=capabilities.progressEntryEnabled;return complete(input,finalOnly,signal);};
  const before=JSON.stringify(body),reply=await converseSolutions(body,runtime,new AbortController().signal);
  assert.equal(offered,expected,label);assert.equal(JSON.stringify(body),before,label);assert.equal(reply.progressProposal,undefined);
 }
});

test('actual POST advertises progress entry exactly when the checked saved context supports it',async()=>{
 const isolated=await offlineBusinessRoute();isolated.sandbox.console={info(){},error(){}};
 for(const [label,body,enabled,expected] of progressCases().filter(row=>row[2])){
  assert.equal(enabled,true);isolated.sandbox.__requests.length=0;isolated.sandbox.__replies.push(responseForStep(final('No progress was recorded.')));
  const response=await isolated.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',body:JSON.stringify(body)}));
  assert.equal(response.status,200,label);const request=isolated.sandbox.__requests[0];
  assert.equal(request.tools.some(tool=>tool.name==='propose_goal_progress'),expected,label);
  assert.equal(request.instructions.includes(progressEntryInstructions),expected,label);
  assert.ok(request.tools.some(tool=>tool.name==='read_goal_progress'));assert.equal((await response.json()).progressProposal,undefined);
 }
});

test('actual POST serializes shared strict schemas through the pinned SDK without changing model policy or answer contract',async()=>{
 const isolated=await offlineBusinessRoute(),wire=[],logs=[];isolated.sandbox.console={info:(...args)=>logs.push(args),error:(...args)=>logs.push(args)};
 const client=new OpenAI({apiKey:'synthetic-sdk-only',maxRetries:0,logLevel:'off',fetch:async(_url,init)=>{
  wire.push(JSON.parse(init.body));
  return new Response(JSON.stringify({id:'resp_synthetic',object:'response',status:'completed',model:'gpt-6.1-sol',service_tier:'default',usage:{input_tokens:100,output_tokens:20,total_tokens:120,input_tokens_details:{cached_tokens:40},output_tokens_details:{reasoning_tokens:5}},output:[{type:'message',id:'msg_synthetic',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(final('FTE means full-time equivalent.')),annotations:[]}]}]}),{status:200,headers:{'content-type':'application/json'}});
 }});
 isolated.sandbox.__replies.shift=()=>client.responses.create(isolated.sandbox.__requests.at(-1),isolated.sandbox.__requestOptions.at(-1));
 const body=solutionRequest('What does FTE mean?'),response=await isolated.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',body:JSON.stringify(body)}));
 assert.equal(response.status,200);assert.equal(wire.length,1);assert.equal((await response.json()).answer,'FTE means full-time equivalent.');
 const request=wire[0];assert.equal(request.model,'gpt-6.1-sol');assert.deepEqual(request.reasoning,{effort:'medium'});assert.equal(request.service_tier,'default');assert.equal(Object.hasOwn(request,'temperature'),false);
 assert.equal(request.parallel_tool_calls,false);assert.equal(request.max_output_tokens,5000);assert.deepEqual(request.text,{format:solutionResponseFormat});
 for(const original of [...businessPlanningTools,hiringBudgetTool,requiredStaffingTool]){const sent=request.tools.find(tool=>tool.name===original.name);assert.deepEqual({...sent,parameters:expandSchema(sent.parameters)},original);}
 const options=isolated.sandbox.__requestOptions[0];assert.equal(options.timeout,60000);assert.equal(options.maxRetries,0);assert.equal(isolated.sandbox.module.exports.maxDuration,120);
 assert.equal(logs.length,1);assert.equal(logs[0][0],'Home solution conversation completed');
 const round=JSON.parse(logs[0][1]).providerRounds[0];assert.equal(round.inputTokens,100);assert.equal(round.cachedInputTokens,40);assert.equal(round.outputTokens,20);assert.equal(round.reasoningTokens,5);
 assert.equal(round.inputBytes,bytes(request.input));assert.equal(round.toolSchemaBytes,bytes(request.tools));
});
