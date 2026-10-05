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
const sandbox={exports:{},require,Response,Request,URL,URLSearchParams,TextEncoder,TextDecoder,AbortController,console,process:{env:{OPENAI_API_KEY:'synthetic-harness-only'}},__requests:[],__replies:[],fetch:()=>{throw Error('Network is forbidden in the route harness')}};
sandbox.module={exports:sandbox.exports};vm.runInNewContext(await fs.readFile(path.join(out,'route.cjs'),'utf8'),sandbox);
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
