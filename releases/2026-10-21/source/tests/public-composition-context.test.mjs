import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PUBLIC_9037} from '../lib/public-9037-contract.mjs';
import {loadPublic9037Binding} from '../lib/public-9037.server.mjs';
import {readHomeSource} from '../lib/home-pack.mjs';

import {componentModule} from './fixtures/component-module.mjs';
import * as findings from '../lib/key-findings.ts';
import * as catalog from '../lib/catalog-display.ts';
import * as period from '../lib/evidence-period-label.ts';
const keyFindings=componentModule('key-findings.tsx');
const require=createRequire(import.meta.url),exports={};
const js=ts.transpileModule(fs.readFileSync(new URL('../components/pages/workforce-page.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(js,{exports,require:name=>name==='@/components/key-findings'?keyFindings:name==='@/lib/key-findings'?findings:name==='@/lib/catalog-display'?catalog:name==='@/lib/evidence-period-label'?period:name==='@/lib/public-9037-contract.mjs'?{PUBLIC_9037}:name==='@/components/evidence-table-region'?{EvidenceTableRegion:({children})=>React.createElement('div',null,children)}:name==='@/lib/legacy-source-contracts'?{movementWindowLabel:()=>''}:name==='@/lib/display-format'?{formatWholeCount:String}:name==='recharts'?new Proxy({},{get:()=>()=>null}):require(name)});
const render=(data,loading=false,error=null)=>renderToStaticMarkup(React.createElement(exports.WorkforcePage,{data,loading,error}));

test('composition context identifies construction without changing pinned metrics and starts collapsed',async()=>{
 const binding=await loadPublic9037Binding({hostname:'people-analytics-gkl61lnek-ed-56dc.vercel.app',production:true});
 const response=await binding.handle(new Request('https://www.ed-ai.app/api/workforce'));
 assert.equal(response.status,200);const data=await response.json(),before=JSON.stringify(data),html=render(data);
 assert.equal(data.summary.headcount,9037);assert.equal(data.summary.people_managers,1515);assert.equal(data.summary.hybrid_headcount,5357);
 assert.ok(html.includes(data.summary.headcount.toLocaleString('en-US')));assert.ok(html.includes(data.summary.people_managers.toLocaleString('en-US')));assert.ok(html.includes(data.summary.avg_span_of_control.toFixed(1)+' avg span'));assert.ok(html.includes(((data.summary.hybrid_headcount/data.summary.headcount)*100).toFixed(1)+'%'));
 assert.match(html,/varied team sizes and grade-compatible reporting lines/);
 assert.match(html,/country mix varies by entry business unit/);assert.match(html,/hybrid, remote and onsite assignments/);
 assert.doesNotMatch(html,/fixed to hybrid|near-uniform synthetic assignments|next populated higher level/);
 assert.match(html,/<details[^>]*><summary[^>]*>How these figures were constructed/);
 assert.doesNotMatch(html,/<details[^>]*\bopen/);assert.equal(JSON.stringify(data),before);
 for(const absent of [render(data,true),render(data,false,'Failed'),render({...data,data_meta:undefined}),render({...data,data_meta:{...data.data_meta,datasetToken:'legacy-v1:0'}})])assert.doesNotMatch(absent,/Synthetic construction context/);
});

test('public Home BLS is unavailable without a request; other datasets and sources still load',async()=>{
 const calls=[],fetcher=async url=>{calls.push(url);return {ok:true,json:async()=>({value:1})};};
 assert.deepEqual(await readHomeSource('/api/bls',undefined,100,fetcher,PUBLIC_9037.token),{status:'unavailable',data:null});
 assert.deepEqual(calls,[]);
 for(const token of ['legacy-v1:0','pending:'+PUBLIC_9037.token,'other:1'])assert.equal((await readHomeSource('/api/bls',undefined,100,fetcher,token)).status,'loaded');
 assert.equal((await readHomeSource('/api/dashboard',undefined,100,fetcher,PUBLIC_9037.token)).status,'loaded');
 assert.equal(calls.length,4);
 assert.deepEqual(await readHomeSource('/api/dashboard',undefined,100,async()=>({ok:false}),PUBLIC_9037.token),{status:'unavailable',data:null});
});
