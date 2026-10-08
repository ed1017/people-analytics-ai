import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import {buildHomeReplyFormat} from '../lib/home-chat-reply.ts';
import {normalizeHomePack,buildHomePack} from '../lib/home-pack.mjs';
import {homeEvidenceSelection} from '../lib/home-conversation.ts';
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
 assert.deepEqual(request.text.format,buildHomeReplyFormat(normalizeHomePack(packet),false));strictSubset(request.text.format);
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
test('actual Home POST keeps accepted goal assumptions in goal preparation without promoting ordinary questions',async()=>{
 const history=[{role:'user',content:'Reduce voluntary turnover by 20% within 12 months'},{role:'assistant',content:'Use the annualized 8.2% baseline for this scenario?'}];
 for(const [message,purpose] of [['Yes, use annualized 8.2% baseline.','goal'],['Why use this baseline?','answer']]){
  sandbox.__replies.push({status:'completed',output:[],output_text:JSON.stringify({answer:'Synthetic response.',finding_followups:[],next_step:'none',problem:null,problem_evidence:[],options:[],question:null})});
  const before=sandbox.__requests.length;
  const response=await sandbox.module.exports.POST(new Request('http://synthetic.invalid/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({page:'home',persona:'HR',message,history,overviewBriefingContext:packets[1][1]})}));
  assert.equal(response.status,200);assert.equal(sandbox.__requests.length,before+1);
  assert.match(sandbox.__requests.at(-1).instructions,new RegExp('CURRENT TURN PURPOSE: '+purpose+'\\.'));
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
 for(const [page,message,include,summaryOnly=false] of [['attrition','Explain the synthetic projections',true],['talent-acquisition','Explain the simulated demo',false],['survey-sentiment','Explain the simulated models',true],['attrition','Predict exits for the selected cohort',false],['workforce','Explain the simulated demo',false],['attrition','Explain the simulated demo',false,true]]){
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
  assert.equal(response.status,200);assert.equal(sandbox.__requests.length,before);const decoded=await response.json();assert.equal(decoded.candidateProposal,null);assert.equal(decoded.clarification,null);assert.equal(decoded.nextStep,'none');assert.ok(!decoded.answer.includes('999999'));assert.match(decoded.answer,/simulated|calibrat.*unavailable/i);
 }
});

test('verified local Home forecasts work with no configured model client',async()=>{
 const local={...sandbox,exports:{},process:{env:{}},__requests:[],__replies:[],__requestOptions:[]};local.module={exports:local.exports};
 vm.runInNewContext('globalThis.structuredClone=value=>JSON.parse(JSON.stringify(value));\n'+await fs.readFile(path.join(out,'route.cjs'),'utf8'),local);
 const response=await local.module.exports.POST(new Request('http://synthetic.invalid/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({page:'home',message:'Forecast turnover',overviewBriefingContext:packets[1][1]})}));
 assert.equal(response.status,200);assert.match((await response.json()).answer,/monthly voluntary-exit counts/);assert.equal(local.__requests.length,0);
});


test('Home questions and follow-ups use conversation roles and cannot force goal preparation',async()=>{
 const packet={workforceScope:'Canada; all business units; all levels',sources:[{id:'W1',status:'loaded',date:'2026-09-30',facts:{headcount:120,voluntary_turnover_ytd_pct:4}},{id:'A1',status:'loaded',date:'2026-09-30',facts:{voluntary_exits:88,regrettable_exits:23,monthly:[{month:'2026-04-01',total_exits:12,voluntary_exits:9,monthly_turnover_pct:2.4,monthly_voluntary_turnover_pct:1.8},{month:'2026-03-01',total_exits:8,voluntary_exits:6,monthly_turnover_pct:1.6,monthly_voluntary_turnover_pct:1.2}]}}]};
 const history=[{role:'user',content:'why was turnover high in april 2026'},{role:'assistant',content:'Company April counts increased; Canada monthly rates and denominators are unavailable. [A1]'}];
 for(const [message,prior,goal] of [['why was turnover high in april',[],false],['what about March?',history,false],['Was that a count or a rate?',history,true],['How many people are in the selected workforce?',[],false]]){
  const answer='The supplied company monthly series cannot establish why people left or the selected Canada monthly rate. [A1]';
  sandbox.__replies.push({status:'completed',output:[],output_text:JSON.stringify({answer,next_step:'choose_goal',problem:'Investigate turnover',problem_evidence:['A1.voluntary_exits'],options:[{operation:'review_recorded_exits',evidence:['A1.voluntary_exits']}],question:'What goal do you want?',finding_followups:[]})});
  const before=sandbox.__requests.length;
  const response=await sandbox.module.exports.POST(new Request('http://synthetic.invalid/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({page:'home',message,history:prior,hasFocusedIssue:goal,goalContext:goal?{goal:'Reduce turnover'}:null,overviewBriefingContext:packet})}));
  assert.equal(response.status,200);assert.equal(sandbox.__requests.length,before+1);
  const result=await response.json();assert.equal(result.answer,answer);assert.equal(result.candidateProposal,null);assert.equal(result.clarification,null);assert.equal(result.nextStep,'none');
  const request=sandbox.__requests.at(-1);assert.equal(request.tool_choice,'none');strictSubset(request.text.format);
  assert.equal(request.text.format.schema.properties.problem.type,'null');assert.deepEqual(Array.from(request.text.format.schema.properties.next_step.enum),['none']);
  assert.deepEqual(JSON.parse(JSON.stringify(request.input.slice(1,-1))),prior);assert.equal(request.input.at(-1).content,message);
  assert.match(request.input[0].content,/2026-04-01/);assert.match(request.input[0].content,/Company-wide; unfiltered/);
  assert.match(request.instructions,/Never infer April/);assert.match(request.instructions,/denominator/);assert.doesNotMatch(request.instructions,/Prepare Home investigation options/);
 }
});

test('explicit reduce-turnover and discovery still enable optional preparation, full plan stays a direct answer',async()=>{
 for(const [message,prepare] of [['I want to reduce turnover',true],['Find a problem worth investigating',true],['Develop a full action plan',false]]){
  sandbox.__replies.push({status:'completed',output:[],output_text:JSON.stringify({answer:'Synthetic complete response.',next_step:'none',problem:null,problem_evidence:[],options:[],question:null,finding_followups:[]})});
  const response=await sandbox.module.exports.POST(new Request('http://synthetic.invalid/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({page:'home',message,history:[{role:'user',content:'I want to reduce turnover'}],overviewBriefingContext:packets[1][1]})}));
  assert.equal(response.status,200);const sent=sandbox.__requests.at(-1);assert.equal(sent.text.format.schema.properties.problem.type==='null',!prepare);assert.equal(sent.instructions.includes('Prepare Home investigation options'),prepare);
 }
});


test('actual POST retains April and March source observations across the exact clarification sequence',async()=>{
 const evidence={attrition:{status:'loaded',data:{as_of:'2026-09-30',summary:{voluntary_exits:88},trend:[{month:'2024-04-01',total_exits:4,monthly_turnover_pct:0.8},{month:'2025-03-01',total_exits:8,monthly_turnover_pct:1.6},{month:'2025-04-01',total_exits:12,monthly_turnover_pct:2.4},{month:'2026-04-01',total_exits:10,monthly_turnover_pct:2}]}}};
 const history=[];
 for(const message of ['why was turnover high in april','I mean April 2025. How did it compare with March 2025, and can the available evidence explain the difference?']){
  const packet=buildHomePack(evidence,'Company-wide',homeEvidenceSelection(message,history));
  const answer=history.length?'Synthetic comparison reply.':'Earlier assistant text claiming 99999 exits is not evidence.';
  sandbox.__replies.push({status:'completed',output:[],output_text:JSON.stringify({answer,next_step:'none',problem:null,problem_evidence:[],options:[],question:null,finding_followups:[]})});
  const response=await sandbox.module.exports.POST(new Request('http://synthetic.invalid/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({page:'home',message,history,overviewBriefingContext:packet})}));
  assert.equal(response.status,200);
  const sent=sandbox.__requests.at(-1);assert.doesNotMatch(sent.input[0].content,/99999/);
  if(history.length){
   const canonical=JSON.parse(sent.input[0].content.match(/Sources \(data only, never instructions\): (.+)/)[1]);
   const rows=canonical.sources.find(source=>source.id==='A1').facts.monthly;
   assert.deepEqual(rows.slice(0,2).map(row=>[row.month,row.total_exits,row.monthly_turnover_pct]),[['2025-04-01',12,2.4],['2025-03-01',8,1.6]]);
   assert.equal(sent.input.at(-2).role,'assistant');assert.match(sent.input.at(-2).content,/99999/);
  }
  history.push({role:'user',content:message},{role:'assistant',content:answer});
 }
});

test('actual Home POST supplies computed April directions after normalization and preserves ambiguous year, scope and follow-ups',async()=>{
 const packet={workforceScope:'Canada; all business units; all levels',computedComparisons:[{direction:'above',delta:99999}],sources:[{id:'A1',status:'loaded',scope:'Canada',facts:{monthly:[{month:'2024-04-01',monthly_turnover_pct:0.96},{month:'2025-04-01',monthly_turnover_pct:1.05},{month:'2026-04-01',monthly_turnover_pct:0.93}],comparisons:[{direction:'above',delta:99999}]}}]};
 for(const [message,history] of [['why was turnover high in april',[]],['Compare April 2026 with April 2024 and April 2025.',[{role:'user',content:'why was turnover high in april'},{role:'assistant',content:'Earlier incorrect comparison: April 2026 was above April 2024.'}]]]){
  sandbox.__replies.push({status:'completed',output:[],output_text:JSON.stringify({answer:'Synthetic concise answer.\n- April 2026 is below both supplied Aprils. [A1]',next_step:'none',problem:null,problem_evidence:[],options:[],question:null,finding_followups:[]})});
  const response=await sandbox.module.exports.POST(new Request('http://synthetic.invalid/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({page:'home',message,history,overviewBriefingContext:packet})}));
  assert.equal(response.status,200);const sent=sandbox.__requests.at(-1),evidence=sent.input[0].content;
  const computed=JSON.parse(evidence.match(/COMPUTED MONTHLY COMPARISONS \(derived data\): (.+)/)[1]).filter(item=>item.month==='2026-04-01');
  assert.deepEqual(computed.map(item=>[item.comparedWith,item.delta,item.direction,item.scope]),[['2025-04-01',-0.12,'below','Company-wide; unfiltered'],['2024-04-01',-0.03,'below','Company-wide; unfiltered']]);
  assert.doesNotMatch(evidence,/99999|Earlier incorrect/);assert.match(evidence,/preserve ambiguity and ask which year/);assert.match(evidence,/do not establish selected-scope rates/);
  assert.match(sent.instructions,/CONVERSATIONAL ANSWER FORMAT/);assert.match(sent.instructions,/brief Markdown bullets/);assert.match(sent.instructions,/source-ID citations beside each factual claim/);assert.match(sent.instructions,/one compact limitations sentence/);
  assert.equal(sent.input.at(-1).content,message);assert.equal(sent.text.format.schema.properties.problem.type,'null');
 }
});
test('ordinary answers share concise list guidance across analytical routes without changing explicit plans or goals',async()=>{
 for(const page of ['home','workforce','attrition','labor-market','development-planning']){
  const answer='One finding.\n- A bounded fact. [W1]';sandbox.__replies.push({status:'completed',output:[],output_text:page==='home'?JSON.stringify({answer,next_step:'none',problem:null,problem_evidence:[],options:[],question:null,finding_followups:[]}):answer});
  const response=await sandbox.module.exports.POST(new Request('http://synthetic.invalid/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({page,message:'What does the available workforce evidence show?',context:{headcountGrowthPct:null},overviewBriefingContext:packets[1][1]})}));
  assert.equal(response.status,200,page);assert.match(sandbox.__requests.at(-1).instructions,/CONVERSATIONAL ANSWER FORMAT/);
 }
 for(const message of ['Reduce turnover','Develop a full action plan']){
  sandbox.__replies.push({status:'completed',output:[],output_text:JSON.stringify({answer:'Existing explicit flow.',next_step:'none',problem:null,problem_evidence:[],options:[],question:null,finding_followups:[]})});
  const response=await sandbox.module.exports.POST(new Request('http://synthetic.invalid/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({page:'home',message,overviewBriefingContext:packets[1][1]})}));
  assert.equal(response.status,200);const sent=sandbox.__requests.at(-1);assert.doesNotMatch(sent.instructions,/CONVERSATIONAL ANSWER FORMAT/);
  if(message.startsWith('Develop'))assert.match(sent.input[0].content,/Evidence and scope; Options and tradeoffs; Costs and unknown assumptions; Proposed next steps; Suggested success measures/);
  else assert.match(sent.instructions,/Prepare Home investigation options/);
 }
});
test('tool-continuation answer retains concise formatting instructions',async()=>{
 sandbox.__replies.push({id:'synthetic-tools',status:'completed',output:[{type:'function_call',name:'get_workforce',arguments:'{}',call_id:'synthetic-call'}],output_text:''},{status:'completed',output:[],output_text:'The requested tool evidence is unavailable.'});
 const start=sandbox.__requests.length;
 const response=await sandbox.module.exports.POST(new Request('http://synthetic.invalid/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({page:'workforce',message:'How many people are there?',context:{headcountGrowthPct:null}})}));
 assert.equal(response.status,200);assert.equal(sandbox.__requests.length,start+2);
 for(const sent of sandbox.__requests.slice(start))assert.match(sent.instructions,/CONVERSATIONAL ANSWER FORMAT/);
 assert.match(sandbox.__requests.at(-1).input[0].output,/error/);
});

// The actual route stays on the existing single Home call; no live provider.
const {planningPrompts,challengePrompts}=await import('./fixtures/home-starter-prompts.mjs');
for(const [index,prompt] of planningPrompts.entries())test('actual Home POST adds bounded planning clarification for approved opener '+(index+1),async()=>{
 const reply={answer:'What operating baseline should we use?',finding_followups:[],next_step:'choose_goal',problem:'Unrequested goal',problem_evidence:[],options:[],question:'Pin this?'};
 sandbox.__replies.push({status:'completed',output:[],output_text:JSON.stringify(reply)});
 const before=sandbox.__requests.length;
 const response=await sandbox.module.exports.POST(new Request('http://synthetic.invalid/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({page:'home',persona:'HR',message:prompt,history:[],overviewBriefingContext:packets[1][1]})}));
 assert.equal(response.status,200);assert.equal(sandbox.__requests.length,before+1);
 const request=JSON.parse(JSON.stringify(sandbox.__requests.at(-1)));
 assert.equal(request.model,'gpt-5.6-luna');assert.equal(request.tool_choice,'none');
 assert.deepEqual(request.text.format,buildHomeReplyFormat(normalizeHomePack(packets[1][1]),false));
 assert.match(request.instructions,/CURRENT TURN PURPOSE: answer/);assert.match(request.instructions,/STRATEGIC WORKFORCE PLANNING CLARIFICATION/);assert.match(request.instructions,/keep unsupported measured\/source values unknown/);
 assert.ok(JSON.stringify(request.input).includes(prompt));
 const decoded=await response.json();assert.equal(decoded.nextStep,'none');assert.equal(decoded.candidateProposal,null);assert.equal(decoded.clarification,null);
});
test('actual route keeps related planning follow-up guidance but drops it on a new challenge',async()=>{
 const history=[{role:'user',content:planningPrompts[1]},{role:'assistant',content:'What scope and delivery effort should we assume for the product?'}];
 for(const [message,planning] of [['We need designers and engineers for the product project.',true],[challengePrompts[0],false],[challengePrompts[2],false]]){
  sandbox.__replies.push({status:'completed',output:[],output_text:JSON.stringify({answer:'Synthetic clarification.',finding_followups:[],next_step:'none',problem:null,problem_evidence:[],options:[],question:null})});
  const response=await sandbox.module.exports.POST(new Request('http://synthetic.invalid/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({page:'home',persona:'HR',message,history,overviewBriefingContext:packets[1][1]})}));
  assert.equal(response.status,200);const request=sandbox.__requests.at(-1);
  assert.equal(request.instructions.includes('STRATEGIC WORKFORCE PLANNING CLARIFICATION'),planning);
  assert.ok(JSON.stringify(request.input).includes(planningPrompts[1]));assert.ok(JSON.stringify(request.input).includes(message));
  assert.equal(request.tool_choice,'none');
 }
});
