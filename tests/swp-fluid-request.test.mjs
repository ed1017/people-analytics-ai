import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import {solutionRequest,final} from './fixtures/home-solution-conversation.mjs';
import {readSolutionRequest} from '../lib/home-solution-conversation.ts';
import {SWP_DEMAND_MODE,illustrativeServiceReview} from '../lib/swp-demand.ts';
import {solutionPlanningInstructions} from '../lib/home-solution-planning.ts';
import {demandReferenceModelContract} from '../lib/swp-demand-reference.ts';

const context={conversationMode:SWP_DEMAND_MODE,classification:'unverified-business-inputs',intakeId:'swp-demand-fluid-fixture',datasetToken:'legacy-v1:0',boundGoal:{id:'',statement:''},revision:1};
const reviewed={...context,demandProposal:illustrativeServiceReview(context,'2026-10-09T00:00:00Z')};
const make=(value,review=reviewed)=>readSolutionRequest({...solutionRequest('Make that nine months'),...(value===undefined?{}:{planningCalculatorAvailable:value}),goalContext:{scenarioReview:review}});
test('availability is a strict optional hint, not a copied review owner',()=>{
 for(const v of [undefined,false,'true',1,{},null])assert.equal(make(v).planningCalculatorAvailable,undefined);
 assert.equal(make(true).planningCalculatorAvailable,true);
});
test('a validated current review is required before offering the popup',()=>{
 assert.match(solutionPlanningInstructions(make(true),reviewed),/UI supplies the optional popup control/);
 assert.match(solutionPlanningInstructions(make(true,context),context),/No Planning Calculator popup control/);
 assert.match(solutionPlanningInstructions(make(false),reviewed),/No Planning Calculator popup control/);
 const bad={...reviewed,demandProposal:{...reviewed.demandProposal,key:'stale'}};
 assert.throws(()=>solutionPlanningInstructions(make(true,bad),bad));
});
test('guidance preserves unknowns, provenance and deliberate review/save boundaries',()=>{
 const text=solutionPlanningInstructions(make(true),reviewed);
 for(const pattern of [/Lead with a useful grounded or clearly conditional recommendation/,/assistant proposals remain labelled assumptions/,/never all proposed inputs, source verification or a saved plan/,/Opening it changes no assumption acceptance or review\/save state/])assert.match(text,pattern);
 assert.equal(solutionPlanningInstructions(solutionRequest('What is the weather?'),null),'');
});

const out=await fs.mkdtemp(path.join(os.tmpdir(),'swp-fluid-route-')),isolation=path.resolve('tests/fixtures/solution-planning-route-isolation.ts');
const compiler=webpackPackage.webpack({mode:'development',devtool:false,target:'node',entry:path.resolve('app/api/home-solution-conversation/route.ts'),output:{path:out,filename:'route.cjs',library:{type:'commonjs2'}},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'openai$':isolation,'@/lib/openai-proxy-transport$':isolation,'@/lib/dataset-runtime$':isolation,'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const sandbox={exports:{},require:createRequire(import.meta.url),Response,Request,URL,URLSearchParams,TextEncoder,TextDecoder,AbortController,AbortSignal,console,Intl,process:{env:{OPENAI_API_KEY:'synthetic-harness-only',NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION:'true'}},__requests:[],__replies:[],__requestOptions:[],fetch:()=>{throw Error('Network forbidden')}};
sandbox.module={exports:sandbox.exports};
vm.runInNewContext('globalThis.structuredClone=value=>JSON.parse(JSON.stringify(value));\n'+await fs.readFile(path.join(out,'route.cjs'),'utf8'),sandbox);
test('actual full-app POST adds scoped recommendation guidance and preserves checked reference tools',async()=>{
 for(const [available,c] of [[true,reviewed],[false,reviewed],[true,context],['true',reviewed]]){
  const body=make(available,c),before=JSON.stringify(body),n=sandbox.__requests.length;
  sandbox.__replies.push({status:'completed',output:[],output_text:JSON.stringify(final('Synthetic conditional recommendation.'))});
  const result=await sandbox.module.exports.POST(new Request('http://synthetic.invalid/api/home-solution-conversation',{method:'POST',headers:{'content-type':'application/json','x-workforce-conversation':SWP_DEMAND_MODE},body:JSON.stringify(body)}));
  assert.equal(result.status,200);assert.equal(sandbox.__requests.length,n+1);
  const sent=JSON.parse(JSON.stringify(sandbox.__requests.at(-1)));
  assert.match(sent.instructions,/Lead with a useful grounded or clearly conditional recommendation/);
  assert.match(sent.instructions,available===true&&c.demandProposal?/UI supplies the optional popup control/:/No Planning Calculator popup control/);
  assert.deepEqual(sent.tools,demandReferenceModelContract.tools);assert.deepEqual(sent.text.format,demandReferenceModelContract.responseFormat);
  assert.equal(sent.model,'gpt-5.6-luna');assert.equal(sent.parallel_tool_calls,false);assert.equal(sent.max_output_tokens,5000);
  const reply=await result.json();assert.equal(reply.demandReview,undefined);assert.deepEqual(reply.candidateIds,[]);assert.equal(JSON.stringify(body),before);
 }
});
