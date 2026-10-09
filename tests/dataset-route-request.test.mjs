/** Actual route wrappers, real request binding, synthetic handler bodies only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {withDatasetRequest,datasetRouter} from '../lib/dataset-runtime.ts';
import {DATASET_HEADER,LEGACY_DATASET_TOKEN} from '../lib/dataset-identity.mjs';
import {AgentFailure,validateAgentInput} from '../lib/capability-agent.ts';
import {developmentCatalog} from '../lib/development-costs.ts';

const routes=['attrition','business-unit-scenario','career-growth-mobility','career-mobility','compensation','compensation-ranges','finance','headcount','headcount-trend','learning-development','overview','position-actions','position-modeling','position-structure','scenario-modeler','skills','succession-coverage','survey-sentiment','talent-acquisition','workforce','workforce-planning'];
for(const route of routes)test(`${route}: exported request wrapper retains dataset binding and rejects stale requests before its handler`,async()=>{
 const method=['career-growth-mobility','succession-coverage'].includes(route)?'POST':'GET';
 const source=ts.createSourceFile('route.ts',readFileSync(new URL(`../app/api/${route}/route.ts`,import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
 const declaration=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===method);
 assert.ok(declaration);const exports={},seen=[];
 const handler=async()=>{const before=datasetRouter.current();await Promise.resolve();assert.equal(datasetRouter.current(),before);seen.push(before.token);return Response.json({synthetic:true});};
 const code=ts.transpileModule(declaration.getText(source),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,withDatasetRequest,handleGET:handler,handlePOST:handler});
 for(const header of [LEGACY_DATASET_TOKEN,null]){
  const request=new Request('http://synthetic.invalid/api/'+route,{method,headers:header?{[DATASET_HEADER]:header}:{}}),response=await exports[method](request);
  assert.equal(response.status,200);assert.equal(response.headers.get(DATASET_HEADER),LEGACY_DATASET_TOKEN);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json()).synthetic,true);
 }
 const count=seen.length,stale=await exports[method](new Request('http://synthetic.invalid/api/'+route,{method,headers:{[DATASET_HEADER]:'legacy-v1:1'}}));
 assert.equal(stale.status,409);assert.equal(stale.headers.get(DATASET_HEADER),LEGACY_DATASET_TOKEN);assert.equal(seen.length,count);assert.match((await stale.json()).error,/Dataset changed/);
 // Historical direct JavaScript fixtures may omit a request; the type-only repair retains that runtime behavior.
 assert.equal((await exports[method]()).status,200);
 const responses=await Promise.all([exports[method](new Request('http://synthetic.invalid/a',{method})),exports[method](new Request('http://synthetic.invalid/b',{method}))]);
 assert.ok(responses.every(response=>response.headers.get(DATASET_HEADER)===LEGACY_DATASET_TOKEN));assert.throws(()=>datasetRouter.current(),/context required/);
});

test('capability source handoff forwards the original request and retains validation without invoking a provider',async()=>{
 const source=ts.createSourceFile('route.ts',readFileSync(new URL('../app/api/capability-agent/route.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
 const declarations=source.statements.filter(node=>ts.isFunctionDeclaration(node)&&['limitedBody','abortable','handlePOST','POST'].includes(node.name?.text)).map(node=>node.getText(source)).join('\n');
 const exports={},requests=[];let providerCalls=0;
 const code=ts.transpileModule(declarations,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,withDatasetRequest,NextResponse:Response,validateAgentInput,AgentFailure,AbortController,AbortSignal,TextDecoder,Uint8Array,setTimeout,clearTimeout,client:{},existingScenarioSource:request=>{requests.push(request);return withDatasetRequest(request,async()=>{assert.equal(datasetRouter.current().token,LEGACY_DATASET_TOKEN);return Response.json({error:'Synthetic source unavailable'},{status:503});});},runCapabilityAgent:()=>{providerCalls++;throw Error('Provider boundary forbidden');}});
 const input={version:1,goal:'Review synthetic capability',options:[{quote:developmentCatalog[0],goal:'Review synthetic capability',inputs:{participants:'10',sessions:'3',hours:'2',fee:'120',additionalFees:'0',hourlyCost:'50'}}],limits:{budget:'4000',employeeHours:'100',minimumParticipants:'4',allowRevision:false},settings:{allowRevision:false,minFillRate:'',maxFillRate:''}};
 const request=new Request('http://synthetic.invalid/api/capability-agent',{method:'POST',headers:{[DATASET_HEADER]:LEGACY_DATASET_TOKEN},body:JSON.stringify(input)}),response=await exports.POST(request);
 assert.equal(response.status,503);assert.equal(requests.length,1);assert.equal(requests[0],request);assert.equal(response.headers.get(DATASET_HEADER),LEGACY_DATASET_TOKEN);assert.equal(providerCalls,0);
 const invalid=await exports.POST(new Request('http://synthetic.invalid/api/capability-agent',{method:'POST',body:'{}'}));assert.equal(invalid.status,400);assert.equal(requests.length,1);
 const stale=await exports.POST(new Request('http://synthetic.invalid/api/capability-agent',{method:'POST',headers:{[DATASET_HEADER]:'legacy-v1:1'},body:JSON.stringify(input)}));assert.equal(stale.status,409);assert.equal(requests.length,1);assert.equal(providerCalls,0);assert.throws(()=>datasetRouter.current(),/context required/);
});
