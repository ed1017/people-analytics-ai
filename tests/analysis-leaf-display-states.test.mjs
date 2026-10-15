/** Offline rendering and controlled effect promises; no browser or network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as listening from '../lib/employee-listening.ts';
import * as rangeContext from '../lib/compensation-range-context.ts';
import * as releaseContext from '../lib/compensation-release-context.ts';
import {compensationRelease as manifest} from '../lib/compensation-release.ts';
import {AssumptionsDisclosure} from './fixtures/assumptions-disclosure.mjs';

const require=createRequire(import.meta.url);
function load(file,aliases={}){
 const code=ts.transpileModule(fs.readFileSync(new URL('../components/'+file,import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};vm.runInNewContext(code,{exports,AbortController,require:name=>aliases[name]??require(name)});return exports;
}
const table=load('evidence-table-region.tsx');
const {ExitSurveyFeedback}=load('exit-survey-feedback.tsx',{'@/lib/employee-listening':listening,'@/components/evidence-table-region':table});
const renderExit=props=>renderToStaticMarkup(React.createElement(ExitSurveyFeedback,{data:null,loading:false,error:null,...props}));
const survey={as_of:'2026-09-30',summary:{exit_respondents:0},exit_reasons:[{primary_reason:'Recorded zero',exits:0,pct_of_exit_responses:0}],exit_dimensions:[]};
test('exit survey pending and failed states hide stale dates and quantities; empty is not failure',()=>{
 for(const data of [null,survey]){
  const pending=renderExit({data,loading:true});assert.match(pending,/Loading exit-survey/);assert.doesNotMatch(pending,/As of|Date not supplied|No exit-survey|Could not load|2026-09-30|Recorded zero/);
  const failed=renderExit({data,error:'Source failure'});assert.match(failed,/role="alert"[^>]*>Could not load/);assert.doesNotMatch(failed,/As of|Date not supplied|No exit-survey|Loading exit-survey|2026-09-30|Recorded zero/);
 }
 assert.match(renderExit({}),/No exit-survey feedback was returned/);
});
test('exit survey loaded zero, missing metadata and suppression remain distinct',()=>{
 const zero=renderExit({data:survey});assert.match(zero,/As of 2026-09-30/);assert.match(zero,/0 exit-survey respondents/);assert.match(zero,/0\.0/);
 const missing=renderExit({data:{...survey,as_of:null,summary:{}}});assert.match(missing,/Date not supplied/);assert.match(missing,/Unavailable exit-survey respondents/);assert.doesNotMatch(missing,/As of unavailable/);
 const suppressed=renderExit({data:{...survey,exit_reasons:[{...survey.exit_reasons[0],exits:123,pct_of_exit_responses:99,suppressed:true}]}});assert.doesNotMatch(suppressed,/>123<|99\.0/);
 for(const html of [zero,missing,suppressed])assert.match(html,/workforce filters do not narrow this evidence/);
});

const catalog={jobs:[{job_profile_code:manifest.jobCodes[0],job_profile_name:'Synthetic job'}],levels:[{level_code:'L1',level_rank:1}],combinations:[]};
const release=(withheld=false)=>({release_id:manifest.releaseId,snapshot_date:manifest.snapshotDate,scope:{country:null,org:null,level:null},rows:manifest.jobCodes.map(code=>({release_id:manifest.releaseId,snapshot_date:manifest.snapshotDate,job_profile_code:code,job_profile_name:code,status:withheld?'withheld':'published',mean_compa_pct:withheld?null:105,coverage:withheld?'withheld':'complete',base_pay_provenance:manifest.basePayProvenance,range_provenance:manifest.rangeProvenance,range_policy_version:manifest.rangePolicyVersion}))});
function compensation(){
 const slots=[],effects=[],requests=[];let cursor=0,dirty=false,scope=rangeContext.defaultRangeScope,tree;
 const hooks={...React,useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;dirty=true;}];},useEffect(fn,deps){const i=cursor++,prior=slots[i];if(!prior||deps.some((d,n)=>!Object.is(d,prior.deps[n]))){slots[i]={deps,cleanup:prior?.cleanup};effects.push(()=>{slots[i].cleanup?.();slots[i].cleanup=fn();});}}};
 const datasetFetch=(url,options)=>{const task=Promise.withResolvers();requests.push({url,options,...task});return task.promise;};
 const {CompensationJobRanges}=load('compensation-job-ranges.tsx',{'react':hooks,'@/components/assumptions-disclosure':{AssumptionsDisclosure},'@/lib/dataset-client.mjs':{datasetFetch,datasetSession:{current:()=> 'legacy-v1:0'}},'@/lib/compensation-range-context':rangeContext,'@/lib/compensation-release-context':releaseContext});
 const render=()=>{let tries=0;do{assert.ok(tries++<5);cursor=0;dirty=false;tree=CompensationJobRanges({scope});}while(dirty);return renderToStaticMarkup(tree);};
 return {requests,render,changeScope(next){scope=next;return render();},flush(){while(effects.length)effects.shift()();},async reply(url,data,ok=true){const request=requests.find(r=>r.url===url&&!r.settled);assert.ok(request,url);request.settled=true;request.resolve({ok,json:async()=>data});await new Promise(resolve=>setImmediate(resolve));},retry(){const visit=node=>{if(!node||typeof node!=='object')return null;if(node.type==='button'&&node.props.children==='Try again')return node;return React.Children.toArray(node.props?.children).map(visit).find(Boolean);};visit(tree).props.onClick();}};
}
const releaseUrl='/api/compensation-job-release',catalogUrl='/api/compensation-ranges';
test('compensation pending release is loading in both summary and job rows, then publishes validated results',async()=>{
 const h=compensation();assert.match(h.render(),/Loading company compa-ratios/);h.flush();await h.reply(catalogUrl,catalog);
 const pending=h.render();assert.match(pending,/Loading compa-ratio\./);assert.doesNotMatch(pending,/Current: Unavailable|Could not load|<circle/);
 await h.reply(releaseUrl,release());const ready=h.render();assert.match(ready,/105\.0%/);assert.match(ready,/<circle/);assert.doesNotMatch(ready,/Loading compa/);
});
test('compensation failure and invalid or empty release never publish; empty catalog is distinct',async()=>{
 for(const data of [null,{}, {...release(),rows:[]}]){
  const h=compensation();h.render();h.flush();await h.reply(catalogUrl,catalog);await h.reply(releaseUrl,data,data!==null);
  const html=h.render();assert.match(html,/Could not load compa-ratios/);assert.doesNotMatch(html,/Loading compa|<circle|105\.0%/);
 }
 const h=compensation();h.render();h.flush();await h.reply(catalogUrl,{jobs:[],levels:[],combinations:[]});await h.reply(releaseUrl,release());assert.match(h.render(),/No catalog job\/level combinations match/);assert.doesNotMatch(h.render(),/Job range catalog unavailable/);
});
test('compensation withholding, policy mismatch and filtered scope retain their publication boundaries',async()=>{
 const constructedCatalog={...catalog,constructedPolicy:{version:'constructed-demo-9847-ranges-v2',bands:[{job:manifest.jobCodes[0],level:'L1',minimum:40000,midpoint:50000,maximum:60000,effectiveFrom:'2010-01-01'}]}};
 for(const [data,range,expected] of [[release(true),catalog,/Current: Withheld/],[release(),constructedCatalog,/Current: Unavailable/]]){
  const h=compensation();h.render();h.flush();await h.reply(catalogUrl,range);await h.reply(releaseUrl,data);const html=h.render();assert.match(html,expected);assert.doesNotMatch(html,/<circle|105\.0%/);
 }
 const h=compensation();h.render();h.flush();await h.reply(catalogUrl,catalog);await h.reply(releaseUrl,release());assert.match(h.render(),/105\.0%/);
 assert.match(h.changeScope({...rangeContext.defaultRangeScope,country:'US'}),/not released for these filters/);h.flush();
 const back=h.changeScope(rangeContext.defaultRangeScope);assert.match(back,/Loading company compa-ratios/);assert.doesNotMatch(back,/105\.0%|<circle/);h.flush();await h.reply(releaseUrl,release(true));assert.match(h.render(),/Current: Withheld/);
});
test('catalog retry hides a previously loaded release until the new request settles',async()=>{
 const h=compensation();h.render();h.flush();await h.reply(releaseUrl,release());await h.reply(catalogUrl,null,false);assert.match(h.render(),/Job range catalog unavailable/);
 h.retry();assert.match(h.render(),/Loading company compa-ratios/);h.flush();await h.reply(catalogUrl,catalog);assert.doesNotMatch(h.render(),/105\.0%|Current: Unavailable/);await h.reply(releaseUrl,release(true));assert.match(h.render(),/Current: Withheld/);
});
test('late compensation release is ignored after leaving company scope',async()=>{
 const h=compensation();h.render();h.flush();const request=h.requests.find(r=>r.url===releaseUrl);h.changeScope({...rangeContext.defaultRangeScope,country:'US'});h.flush();assert.equal(request.options.signal.aborted,true);
 await h.reply(releaseUrl,release());const html=h.render();assert.match(html,/not released for these filters/);assert.doesNotMatch(html,/105\.0%/);
});
