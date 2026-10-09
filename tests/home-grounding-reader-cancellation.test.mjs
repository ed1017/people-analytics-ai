/** Actual handler functions with in-memory query/fetch ports; no network or database. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {withDatasetRequest} from '../lib/dataset-runtime.ts';
function handler(route,sandbox){
 const source=ts.createSourceFile('route.ts',readFileSync(new URL('../app/api/'+route+'/route.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
 const code=source.statements.filter(node=>!ts.isImportDeclaration(node)).map(node=>node.getText(source)).join('\n');
 sandbox.exports={};vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
 return sandbox.exports.GET;
}
test('existing attrition handler propagates caller cancellation to all six aggregate queries',async()=>{
 const signals=[],relations=[],controller=new AbortController();
 const GET=handler('attrition',{NextResponse:Response,withDatasetRequest,console,supabaseServer:{from(name){relations.push(name);const query={select(){return this;},single(){return this;},order(){return this;},abortSignal(signal){signals.push(signal);return this;},then(resolve){return Promise.resolve({data:name==='attrition_current_summary'?{as_of:'2026-09-30',total_exits:4}:[],error:null}).then(resolve);}};return query;}}});
 const request=new Request('http://offline.invalid/api/attrition',{signal:controller.signal}),response=await GET(request);
 assert.equal(response.status,200);assert.equal(signals.length,6);assert.ok(signals.every(signal=>signal===request.signal));
 assert.ok(relations.every(name=>name.startsWith('attrition_')));controller.abort();assert.ok(signals.every(signal=>signal.aborted));
});
test('existing BLS fetch receives caller cancellation and returns unavailable when the fetch aborts',async()=>{
 const controller=new AbortController(),seen=[];
 const GET=handler('bls',{NextResponse:Response,console:{error(){}},fetch:async(url,options)=>{seen.push({url,signal:options.signal});return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('Synthetic cancellation')),{once:true}));}});
 const request=new Request('http://offline.invalid/api/bls',{signal:controller.signal}),pending=GET(request);
 assert.equal(seen.length,1);assert.equal(seen[0].signal,request.signal);assert.equal(seen[0].url,'https://api.bls.gov/publicAPI/v1/timeseries/data/');
 controller.abort();const response=await pending;assert.equal(response.status,500);assert.equal(seen[0].signal.aborted,true);
});
