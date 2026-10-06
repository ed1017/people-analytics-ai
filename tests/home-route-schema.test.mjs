import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import {buildHomeReplyFormat} from '../lib/home-chat-reply.ts';
import {normalizeHomePack} from '../lib/home-pack.mjs';
import {deliveryAcceptanceWire} from './fixtures/home-exact-acceptance.mjs';
import {completeComponentLimitation} from './fixtures/home-complete-limitation.mjs';
import {aiSkillsGoalPrompt} from './fixtures/home-ai-skills-goal.mjs';
import {HOME_BUNDLE_REQUEST,homeBundleOutputTokens} from '../lib/home-bundle-preparation.ts';
import {buildHomeBundleFormat} from '../lib/home-solution-bundles.ts';
import {investigationMetrics} from '../lib/home-investigation-contract.ts';
const require=createRequire(import.meta.url),Ajv=require('ajv'),ajv=new Ajv();
// Features checked against https://developers.openai.com/api/docs/guides/structured-outputs
// This checks the documented subset, not remote provider acceptance.
function strictSubset(format){
 assert.equal(format.type,'json_schema');assert.equal(format.strict,true);assert.equal(format.schema.type,'object');assert.equal(format.schema.anyOf,undefined);
 let properties=0,enums=0;
 function visit(schema,depth=0){
  assert.ok(depth<=10);for(const key of Object.keys(schema))assert.ok(['type','properties','required','additionalProperties','enum','items','minItems','maxItems','anyOf','minLength','maxLength','description'].includes(key),key);
  if(schema.type==='object'){assert.equal(schema.additionalProperties,false);assert.deepEqual([...schema.required].sort(),Object.keys(schema.properties).sort());properties+=schema.required.length;Object.values(schema.properties).forEach(s=>visit(s,depth+1));}
  if(schema.enum){assert.ok(schema.enum.length>0);enums+=schema.enum.length;}
  if(schema.items)visit(schema.items,depth+1);
  if(schema.anyOf){assert.ok(schema.anyOf.length>0);schema.anyOf.forEach(s=>visit(s,depth+1));}
 }
 visit(format.schema);assert.ok(properties<=5000);assert.ok(enums<=1000);assert.ok(JSON.stringify(format.schema).length<120000);
}
const out=await fs.mkdtemp(path.join(os.tmpdir(),'home-route-schema-')),isolation=path.resolve('tests/fixtures/home-route-isolation.ts');
const compiler=webpackPackage.webpack({mode:'development',devtool:false,target:'node',entry:path.resolve('app/api/chat/route.ts'),output:{path:out,filename:'route.cjs',library:{type:'commonjs2'}},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'openai$':isolation,'next/server$':isolation,'@/lib/openai-proxy-transport$':isolation,'../../../lib/people-analytics-tools$':isolation,'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const sandbox={exports:{},require,Response,Request,URL,URLSearchParams,TextEncoder,TextDecoder,AbortController,console,process:{env:{OPENAI_API_KEY:'synthetic-harness-only'}},__requests:[],__replies:[],__requestOptions:[],fetch:()=>{throw Error('Network is forbidden in the route harness')}};
sandbox.module={exports:sandbox.exports};// Bundle fixtures are JSON-only; clone within the VM realm for strict plain-object checks.
vm.runInNewContext('globalThis.structuredClone=value=>JSON.parse(JSON.stringify(value));\n'+await fs.readFile(path.join(out,'route.cjs'),'utf8'),sandbox);
const all={};for(const metric of Object.values(investigationMetrics)){all[metric.source]??={id:metric.source,status:'loaded',facts:{}};all[metric.source].facts[metric.field]=24;}
const packets=[['empty',{sources:[]}],['sparse',{sources:[{id:'W1',status:'loaded',facts:{headcount:12}}]}],['full',{sources:Object.values(all)}]];
for(const [name,packet] of packets)test('actual POST constructs strict Responses format for '+name,async()=>{
 const empty={answer:'Synthetic answer.',finding_followups:[],next_step:'none',problem:null,problem_evidence:[],options:[],question:null};
 sandbox.__replies.push({id:'synthetic',status:'completed',output:[],output_text:JSON.stringify(empty)});
 const before=sandbox.__requests.length;
 const response=await sandbox.module.exports.POST(new Request('http://synthetic.invalid/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({page:'home',persona:'HR',message:'Review supplied evidence',history:[],overviewBriefingContext:packet})}));
 assert.equal(response.status,200);assert.equal(sandbox.__requests.length,before+1);
 const request=JSON.parse(JSON.stringify(sandbox.__requests.at(-1)));
 assert.deepEqual(request.text.format,buildHomeReplyFormat(normalizeHomePack(packet)));strictSubset(request.text.format);
 assert.equal(request.tool_choice,'none');assert.equal(request.model,'gpt-5.6-luna');assert.equal(ajv.compile(request.text.format.schema)(empty),true);
 const decoded=await response.json();assert.equal(decoded.candidateDiagnostic.reason,'empty');assert.equal(decoded.candidateProposal,null);
});
test('actual POST returns validated finding pairs in the existing single Home call',async()=>{
 const finding={id:'f1',text:'The selected snapshot contains twelve employees; it is not company-wide. [W1]',evidence:['W1:summary'],prompt:'What scope limitations affect this recorded snapshot?'};
 const reply={answer:'Review the current snapshot.\n- '+finding.text,finding_followups:[finding],next_step:'none',problem:null,problem_evidence:[],options:[],question:null};
 for(const valid of [true,false]){
  const output=structuredClone(reply);if(!valid)output.finding_followups[0].text='A mismatched statement. [W1]';
  sandbox.__replies.push({id:'synthetic',status:'completed',output:[],output_text:JSON.stringify(output)});
  const before=sandbox.__requests.length;
  const response=await sandbox.module.exports.POST(new Request('http://synthetic.invalid/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({page:'home',persona:'HR',message:'Review supplied evidence',history:[],overviewBriefingContext:packets[1][1]})}));
  assert.equal(response.status,200);assert.equal(sandbox.__requests.length,before+1);
  const decoded=await response.json();assert.equal(decoded.answer,reply.answer);assert.deepEqual(decoded.findingFollowups,valid?[finding]:[]);
  assert.match(sandbox.__requests.at(-1).instructions,/finding_followups/);
 }
});
test('actual Home POST distinguishes token-limited, incomplete and malformed output without retry or payload logging',async()=>{
 const priorConsole=sandbox.console,logs=[];sandbox.console={...console,error:(...items)=>logs.push(items)};
 try{for(const [status,reason,text,expected] of [
  ['incomplete','max_output_tokens','{"answer":"SECRET_SENTINEL','token_limit'],
  ['incomplete','content_filter','SECRET_SENTINEL','incomplete_output'],
  ['completed',null,'SECRET_SENTINEL','invalid_json'],
  ['failed',null,'SECRET_SENTINEL','response_not_completed'],
 ]){
  sandbox.__replies.push({status,incomplete_details:reason?{reason}:null,output:[],output_text:text,usage:{input_tokens:999,output_tokens:4000,total_tokens:4999,output_tokens_details:{reasoning_tokens:2000}}});
  const before=sandbox.__requests.length;
  const response=await sandbox.module.exports.POST(new Request('http://synthetic.invalid/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({page:'home',persona:'HR',message:'Review supplied evidence',history:[],overviewBriefingContext:packets[1][1]})}));
  assert.equal(response.status,502);assert.equal(sandbox.__requests.length,before+1);assert.equal(sandbox.__requests.at(-1).max_output_tokens,4000);
  const data=await response.json();assert.equal(data.homeReplyDiagnostic.reason,expected);assert.equal(data.homeReplyDiagnostic.usage.reasoning_tokens,2000);assert.ok(!JSON.stringify(data).includes('SECRET_SENTINEL'));assert.equal(data.answer,undefined);assert.equal(data.findingFollowups,undefined);
 }
 assert.deepEqual(logs,[]);
 }finally{sandbox.console=priorConsole;}
});

test('actual bundle POST distinguishes incomplete causes and preserves one bounded request',async()=>{
 const goal=aiSkillsGoalPrompt,packet=packets[1][1],wire=deliveryAcceptanceWire(goal);
 wire.bundles[0].components.c1.limitation=completeComponentLimitation;
 const clipped=structuredClone(wire);clipped.bundles[1].limitation='Review cost against the USD 20,000 planning budget; feasibility is not';
 const cases=[
  [{status:'incomplete',incomplete_details:{reason:'max_output_tokens'},output_text:'SECRET_SENTINEL'},'output_token_limit'],
  [{status:'incomplete',incomplete_details:{reason:'content_filter'},output_text:'SECRET_SENTINEL'},'content_filter'],
  [{status:'incomplete',incomplete_details:{reason:'SECRET_SENTINEL'},output_text:'SECRET_SENTINEL'},'incomplete_response'],
  [{status:'failed',error:{message:'SECRET_SENTINEL'}},'response_not_completed'],
  [{status:'completed',output_text:''},'empty_output'],
  [{status:'completed',output:[{content:[{type:'refusal',refusal:'SECRET_SENTINEL'}]}]},'refusal'],
  [{status:'completed',output_text:JSON.stringify(clipped)},'incomplete_text'],
  [{status:'completed',output_text:'SECRET_SENTINEL'},'invalid_output'],
 ];
 for(const [reply,reason] of cases){
  sandbox.__replies.push({...reply,usage:{output_tokens:5000,output_tokens_details:{reasoning_tokens:4000}},secret:'SECRET_SENTINEL'});const before=sandbox.__requests.length;
  const response=await sandbox.module.exports.POST(new Request('http://synthetic.invalid/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({page:'home',persona:'HR',message:HOME_BUNDLE_REQUEST,hasFocusedIssue:true,goalContext:{goal},overviewBriefingContext:packet})}));
  assert.equal(response.status,502);assert.equal(sandbox.__requests.length,before+1);const sent=sandbox.__requests.at(-1);assert.equal(sent.max_output_tokens,homeBundleOutputTokens);assert.equal(sent.max_output_tokens,10000);assert.equal(sent.tool_choice,'none');assert.equal(sandbox.__requestOptions.at(-1).maxRetries,0);assert.ok(sandbox.__requestOptions.at(-1).signal);
  assert.deepEqual(JSON.parse(JSON.stringify(sent.text.format)),buildHomeBundleFormat(goal,normalizeHomePack(packet),'delivery'));
  const body=await response.json();assert.equal(body.responseDiagnostic.reason,reason);assert.equal(body.responseDiagnostic.outputTokenLimit,10000);assert.equal(body.responseDiagnostic.outputTokens,5000);assert.equal(body.responseDiagnostic.reasoningTokens,4000);assert.ok(!JSON.stringify(body).includes('SECRET_SENTINEL'));assert.equal(body.proposal,undefined);
  if(reason==='incomplete_text'){assert.equal(body.responseDiagnostic.status,'completed');assert.equal(body.responseDiagnostic.textField,'limitation');}
 }
 sandbox.__replies.push({status:'completed',output_text:JSON.stringify(wire)});const before=sandbox.__requests.length;
 const response=await sandbox.module.exports.POST(new Request('http://synthetic.invalid/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({page:'home',persona:'HR',message:HOME_BUNDLE_REQUEST,hasFocusedIssue:true,goalContext:{goal},overviewBriefingContext:packet})}));
 assert.equal(response.status,200);assert.equal(sandbox.__requests.length,before+1);const body=await response.json();assert.equal(body.proposal.goal,goal);assert.equal(body.proposal.bundles.length,3);assert.equal(body.proposal.bundles[0].components[0].limitation,completeComponentLimitation);assert.equal(body.responseDiagnostic,undefined);
});

test('domain demo reaches the actual route only after an explicit matching-page request',async()=>{
 const context={snapshotDate:'2026-09-30',country:'France',businessUnit:'Technology',level:'L2',headcount:12,fte:11,voluntaryTurnoverYtdPct:3,laborCostUsd:500000,openPositions:2,headcountGrowthPct:null,trendStart:null,trendEnd:null};
 for(const [page,message,include,summaryOnly=false] of [['attrition','Explain the synthetic projections',true],['talent-acquisition','Explain the simulated demo',true],['survey-sentiment','Explain the simulated models',true],['attrition','Predict exits for the selected cohort',false],['workforce','Explain the simulated demo',false],['attrition','Explain the simulated demo',false,true]]){
  sandbox.__replies.push({status:'completed',output:[],output_text:'Synthetic harness response.'});
  const response=await sandbox.module.exports.POST(new Request('http://synthetic.invalid/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({page,context,message,summaryOnly,goalContext:{goal:'Review the synthetic demonstration'},history:[],syntheticDemo:{values:[999999999]}})}));assert.equal(response.status,200);const input=sandbox.__requests.at(-1).input;assert.equal(input.includes('SEPARATE CONSTRUCTED SYNTHETIC DEMONSTRATION'),include);assert.ok(!input.includes('999999999'));if(include){assert.match(input,/independent of the selected country/);assert.match(input,/No real-world accuracy/);assert.match(input,/Country: France/);}
 }
});

test('actual bundle POST rejects renamed duplicate activities with one request and unchanged model schema',async()=>{
 const goal=aiSkillsGoalPrompt,packet=packets[1][1],wire=deliveryAcceptanceWire(goal);
 wire.bundles[1]={...structuredClone(wire.bundles[0]),id:'B',name:'Different title only'};
 sandbox.__replies.push({status:'completed',output_text:JSON.stringify(wire)});const before=sandbox.__requests.length;
 const response=await sandbox.module.exports.POST(new Request('http://synthetic.invalid/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({page:'home',persona:'HR',message:HOME_BUNDLE_REQUEST,hasFocusedIssue:true,goalContext:{goal},overviewBriefingContext:packet})}));
 assert.equal(response.status,502);assert.equal(sandbox.__requests.length,before+1);const sent=sandbox.__requests.at(-1);
 assert.deepEqual(JSON.parse(JSON.stringify(sent.text.format)),buildHomeBundleFormat(goal,normalizeHomePack(packet),'delivery'));
 assert.equal(sent.tool_choice,'none');assert.equal(sandbox.__requestOptions.at(-1).maxRetries,0);
 const body=await response.json();assert.equal(body.diagnostic,'duplicate_plans');assert.equal(body.proposal,undefined);assert.ok(!JSON.stringify(body).includes('Different title only'));
});

test('Home explicit forecasts use only server-owned verified evidence without a model request',async()=>{
 for(const message of ['Forecast turnover','Predict talent acquisition','Forecast employee listening','Compare prediction methods','Compare forecasts across all three domains','Forecast turnover rate in Canada']){
  const before=sandbox.__requests.length;
  const response=await sandbox.module.exports.POST(new Request('http://synthetic.invalid/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({page:'home',message,overviewBriefingContext:packets[1][1],projection:{value:999999},hasFocusedIssue:true})}));
  assert.equal(response.status,200);assert.equal(sandbox.__requests.length,before);const decoded=await response.json();assert.equal(decoded.candidateProposal,null);assert.equal(decoded.clarification,null);assert.equal(decoded.nextStep,'none');assert.ok(!decoded.answer.includes('999999'));assert.match(decoded.answer,/simulated/i);
 }
});

test('verified local Home forecasts work with no configured model client',async()=>{
 const local={...sandbox,exports:{},process:{env:{}},__requests:[],__replies:[],__requestOptions:[]};local.module={exports:local.exports};
 vm.runInNewContext('globalThis.structuredClone=value=>JSON.parse(JSON.stringify(value));\n'+await fs.readFile(path.join(out,'route.cjs'),'utf8'),local);
 const response=await local.module.exports.POST(new Request('http://synthetic.invalid/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({page:'home',message:'Forecast turnover',overviewBriefingContext:packets[1][1]})}));
 assert.equal(response.status,200);assert.match((await response.json()).answer,/monthly voluntary-exit counts/);assert.equal(local.__requests.length,0);
});
