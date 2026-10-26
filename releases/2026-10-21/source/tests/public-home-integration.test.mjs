import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as scope from '../lib/dashboard-scope.ts';
import {PUBLIC_9037} from '../lib/public-9037-contract.mjs';
import {loadPublic9037Binding} from '../lib/public-9037.server.mjs';
const require=createRequire(import.meta.url),cache=new Map();
function loadModule(url){
 const key=url.href;if(cache.has(key))return cache.get(key);
 const exports={};cache.set(key,exports);
 const js=ts.transpileModule(fs.readFileSync(url,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(js,{exports,require:name=>{
  if(name==='./home-answer-visuals')return {HomeConversationSplit:({children,visuals})=>React.createElement('div',null,children,visuals),HomeSplitProvider:({children})=>children};
  if(name==='@/lib/dashboard-scope')return scope;
  if(name==='@/lib/swp-demo')return {swpDemoPrompt:'Start the workforce demo'};
  if(name.endsWith('.css'))return {default:{}};
  if(name.startsWith('./')||name.startsWith('@/')){const base=new URL(name.startsWith('@/')?'../'+name.slice(2):name,name.startsWith('@/')?import.meta.url:url);for(const suffix of ['','.ts','.tsx','.mjs']){const resolved=new URL(base.href+suffix);if(fs.existsSync(resolved)&&fs.statSync(resolved).isFile())return suffix==='.mjs'?require(resolved.pathname):loadModule(resolved);}throw Error('Missing test dependency '+name);}
  return require(name);
 }});return exports;
}
const exports=loadModule(new URL('../components/home-chat-welcome.tsx',import.meta.url));
const binding=await loadPublic9037Binding({hostname:'people-analytics-gkl61lnek-ed-56dc.vercel.app',production:true});
async function read(filters={country:'all',org:'all',level:'all'}){const r=await binding.handle(new Request('https://www.ed-ai.app/api/dashboard?'+new URLSearchParams(filters)));assert.equal(r.status,200);return r.json();}
function render(data,requested,loading=false,error=null){return renderToStaticMarkup(React.createElement(exports.HomeHeadcountSummary,{overview:data.overview,receipt:scope.readDashboardScopeReceipt(data.workforce_filter_scope),requested,scopeLabel:'Reviewed test scope',loading,error,trend:data.trend}));}
test('public Home consumes 9037 snapshot and nine current-year history points after settlement; pending hides settled values',async()=>{
 const filters={country:'all',org:'all',level:'all'},d=await read(filters),html=render(d,filters);
 assert.match(html,/9,037/);assert.match(html,/9 recorded monthly snapshots/);assert.equal((html.match(/<circle/g)??[]).length,18);assert.doesNotMatch(html,/Verified headcount history unavailable|Verified snapshot needed/);
 assert.doesNotMatch(render(d,filters,true),/9,037/);assert.equal(Object.hasOwn(d.workforce_filter_scope,'artifactDigest'),false);
});
test('compact landing shows workforce evidence without a duplicate scenario opener or inline example',async()=>{
 const requested={country:'all',org:'all',level:'all'},d=await read(requested);
 const html=renderToStaticMarkup(React.createElement(exports.HomeChatWelcome,{overview:d.overview,receipt:scope.readDashboardScopeReceipt(d.workforce_filter_scope),requested,scopeLabel:'Global workforce',loading:false,error:null,trend:d.trend,onQuestion:()=>{}}));
 assert.doesNotMatch(html,/Plan the workforce your business needs|Try the worked example|Explore the full app|Worked example: adjust staffing/);assert.match(html,/What decision are you facing/);assert.match(html,/9,037/);assert.match(html,/9 recorded monthly snapshots/);
 assert.doesNotMatch(html,/Try a planning scenario/);assert.doesNotMatch(html.replace(/<[^>]*>/g,''),/\bdemo\b/i);assert.doesNotMatch(html,/A 5 FTE capacity gap|\$325,000|Choose a staffing option|Develop and move your team/);
});
test('public filtered Home keeps exact requested/effective scope; malformed and stale receipts stay unavailable',async()=>{
 const filters={country:'US',org:'all',level:'L1'},d=await read(filters);assert.ok(scope.readDashboardScopeReceipt(d.workforce_filter_scope));assert.match(render(d,filters),/9 recorded monthly snapshots/);
 assert.match(render(d,{...filters,country:'all'}),/Verified headcount history unavailable/);
 for(const patch of [{datasetToken:'legacy-v1:0'},{contract:'other'},{cutoff:'2026-08-31'},{artifactDigest:'a'.repeat(64)},{version:2},{status:'verified_aggregate'},{effective:{...filters,country:'all'}},{requested:{...filters,extra:'x'}},{metricContract:'other'},{stockStatus:'other'}]){
  const invalid={...d,workforce_filter_scope:{...d.workforce_filter_scope,...patch}};assert.equal(scope.readDashboardScopeReceipt(invalid.workforce_filter_scope),null);assert.match(render(invalid,filters),/Verified headcount history unavailable/);
 }
 assert.equal(d.workforce_filter_scope.datasetToken,PUBLIC_9037.token);
 // The former private contract still requires a real digest; public v3 is not a relaxation of v2.
 const privateReceipt={...d.workforce_filter_scope,version:2,status:'verified_aggregate',artifactDigest:'a'.repeat(64)};for(const key of ['datasetToken','contract','cutoff'])delete privateReceipt[key];assert.ok(scope.readDashboardScopeReceipt(privateReceipt));delete privateReceipt.artifactDigest;assert.equal(scope.readDashboardScopeReceipt(privateReceipt),null);
});

test('Home questions retain their normal handler after the scenario action moves to the header',()=>{
 const navigation=[],questions=[];
 const tree=exports.HomeChatWelcome({requested:{country:'all',org:'all',level:'all'},scopeLabel:'Global workforce',loading:true,onNavigate:page=>navigation.push(page),onQuestion:question=>questions.push(question)});
 const buttons=[],categories=[];
 function visit(node){if(!node||typeof node!=='object')return;if(Array.isArray(node)){node.forEach(visit);return;}if(node.type==='button')buttons.push(node);if(node.type?.name==='HomePromptCategories')categories.push(node);visit(node.props?.children);}
 visit(tree);
 assert.equal(buttons.length,0);assert.equal(categories.length,1);categories[0].props.onQuestion('A normal category question');
 buttons.forEach(button=>button.props.onClick());
 assert.deepEqual(questions,['A normal category question']);
 assert.deepEqual(navigation,[]);
});


test('turnover and recorded change distinguish fresh/pending, success, zero, and failure',async()=>{
 const filters={country:'all',org:'all',level:'all'},data=await read(filters);
 const card=(html,label)=>html.match(new RegExp('<li><span>'+label+'</span><b>(.*?)</b>'))?.[1];
 for(const pending of [{},data]){
  const html=render(pending,filters,true);
  assert.equal(card(html,'Voluntary turnover YTD'),'Loading.');

  assert.doesNotMatch(html,/Two verified snapshots needed/);
 }
 const ready=render(data,filters);
 assert.match(card(ready,'Voluntary turnover YTD'),/%$/);
 assert.ok(ready.includes('Net change: +'+(data.overview.headcount-data.trend.find(p=>p.snapshot_date==='2026-01-31').headcount)+' people'));
 const zero={...data,overview:{...data.overview,voluntary_turnover_ytd_pct:0},trend:data.trend.map(p=>({...p,headcount:data.overview.headcount}))};
 assert.equal(card(render(zero,filters),'Voluntary turnover YTD'),'0%');
 assert.match(render(zero,filters),/Net change: 0 people/);
 for(const html of [render({},filters),render(data,filters,false,'Request failed'),render({...data,workforce_filter_scope:null},filters)]){
  assert.equal(card(html,'Voluntary turnover YTD'),'Unavailable');

 }
});


test('Home scale pads full, filtered, constant, small and projected series without clipping',()=>{
 assert.equal(exports.welcomeScale([]),null);
 assert.equal(exports.welcomeScale([NaN,Infinity,-1]),null);
 for(const values of [[10,17],[450],[8400,7990,9037],[83,79,91],[9037],[3,3,3],[0],[0,1],[9037,12000,0]]){
  const scale=exports.welcomeScale(values);
  assert.ok(scale.max>scale.min);assert.ok(scale.min>=0);
  assert.ok(scale.min<=Math.min(...values));assert.ok(scale.max>=Math.max(...values));
  assert.ok(scale.ticks.length>=2&&scale.ticks.length<=7);
  assert.equal(scale.ticks[0],scale.min);assert.equal(scale.ticks.at(-1),scale.max);
  assert.ok(scale.ticks.every(Number.isInteger));
 }
 assert.ok(exports.welcomeScale([8400,7990,9037]).min>0);
});

test('Home chart labels its nonzero axis and exact period values; monthly gaps remain unconnected',async()=>{
 const filters={country:'all',org:'all',level:'all'},data=await read(filters),html=render(data,filters);
 assert.match(html,/does not start at zero/);const jan=data.trend.find(p=>p.snapshot_date==='2026-01-31');assert.ok(html.includes('Start: '+jan.headcount.toLocaleString()+' (Jan 2026)'));assert.doesNotMatch(html,/Jan 2024/);
 assert.match(html,/Latest: 9,037 \(Sep 2026\)/);assert.ok(html.includes('Net change: +'+(data.overview.headcount-jan.headcount)+' people'));
 assert.match(html,/aria-label="Recorded synthetic headcount history in people\. Y axis:/);
 for(const match of html.matchAll(/<circle[^>]*cy="([^"]+)"/g))assert.ok(Number(match[1])>=20&&Number(match[1])<=96);
 assert.doesNotMatch(html,/<path|<polygon/);
 const gap={...data,trend:data.trend.filter(p=>p.snapshot_date!=='2026-05-31')};
 const fullLines=(html.match(/<line/g)||[]).length,gapLines=(render(gap,filters).match(/<line/g)||[]).length;
 assert.equal(fullLines-gapLines,2);
 assert.doesNotMatch(render({...data,trend:[]},filters),/<svg/);
});
test('second metric row uses only the same verified dashboard scope and exact dates',async()=>{
 const card=(html,label)=>html.match(new RegExp('<li><span>'+label+'</span><b>(.*?)</b>.*?<small>(.*?)</small>'))?.slice(1);
 for(const filters of [{country:'all',org:'all',level:'all'},{country:'US',org:'all',level:'L1'}]){
  const data=await read(filters),html=render(data,filters),first=data.trend.slice().sort((a,b)=>a.snapshot_date.localeCompare(b.snapshot_date))[0];
  const format=n=>n.toLocaleString(undefined,{maximumFractionDigits:2});
  assert.equal(card(html,'FTE capacity')[0],format(data.overview.fte)+' FTE');
  assert.match(card(html,'FTE capacity')[1],new RegExp(data.overview.snapshot_date));
  assert.equal(card(html,'Open positions')[0],format(data.overview.open_positions)+' positions');
  assert.match(html,/Start:/);
  for(const label of ['FTE capacity','Open positions']){
   assert.equal(card(render(data,filters,true),label)[0],'Loading.');
   assert.equal(card(render(data,filters,false,'Failed'),label)[0],'Unavailable');
   assert.equal(card(render({...data,workforce_filter_scope:null},filters),label)[0],'Unavailable');
   assert.equal(card(render(data,{...filters,country:filters.country==='all'?'US':'all'}),label)[0],'Unavailable');
   assert.equal(card(render({...data,workforce_filter_scope:{...data.workforce_filter_scope,cutoff:'2026-08-31'}},filters),label)[0],'Unavailable');
  }
 }
});
test('second metric row distinguishes zero from invalid values and missing history',async()=>{
 const filters={country:'all',org:'all',level:'all'},data=await read(filters);
 const html=render({...data,overview:{...data.overview,fte:0,open_positions:0},trend:[]},filters);
 assert.match(html,/FTE capacity<\/span><b>0 FTE/);assert.match(html,/Open positions<\/span><b>0 positions/);assert.doesNotMatch(html,/Period-start headcount/);
 for(const value of [undefined,null,-1,NaN,Infinity]){const invalid=render({...data,overview:{...data.overview,fte:value,open_positions:value}},filters);assert.match(invalid,/FTE capacity<\/span><b>Unavailable/);assert.match(invalid,/Open positions<\/span><b>Unavailable/);}
 assert.match(render({...data,overview:{...data.overview,open_positions:1.5}},filters),/Open positions<\/span><b>Unavailable/);
});

import {homeRecruitingKpi} from '../lib/home-kpi-source.ts';
test('Home hiring metrics use actual released source and reject stale/suppressed/invalid fields',async()=>{
 const filters={country:'all',org:'all',level:'all'},d=await read(filters);
 const response=await binding.handle(new Request('https://www.ed-ai.app/api/talent-acquisition'));
 const data=await response.json(),result={status:'loaded',data},date=d.overview.snapshot_date;
 const kpi=homeRecruitingKpi(result,true,PUBLIC_9037.token,date);
 assert.equal(kpi.timeToFillDays,33);assert.equal(kpi.openReqAgeDays,13.9);assert.equal(kpi.offers,85);
 const renderKpi=(k,recruitingPending=false)=>renderToStaticMarkup(React.createElement(exports.HomeHeadcountSummary,{overview:d.overview,receipt:scope.readDashboardScopeReceipt(d.workforce_filter_scope),requested:filters,scopeLabel:'Global workforce',loading:false,error:null,trend:d.trend,recruitingKpi:k,recruitingPending}));
 const html=renderKpi(kpi);assert.equal((html.match(/<em[^>]*>Company-wide<\/em>/g)||[]).length,4);assert.match(html,/aria-label="Average time to fill scope and definition"/);assert.match(html,/33 days/);assert.match(html,/13.9 days/);assert.match(html,/Recruiting offers<\/span><b>85/);assert.match(html,/Company-wide/);
 assert.doesNotMatch(renderKpi({...kpi,asOf:'2026-08-31'}),/33 days|13.9 days/);
 assert.doesNotMatch(renderKpi(kpi,true),/33 days|13.9 days/);
 assert.equal(homeRecruitingKpi(result,false,PUBLIC_9037.token,date),null);
 assert.equal(homeRecruitingKpi({...result,data:{...data,as_of:'2026-08-31'}},true,PUBLIC_9037.token,date),null);
 for(const value of [undefined,null,-1,NaN,Infinity,'33']){
  const bad={...result,data:{...data,summary:{...data.summary,avg_time_to_fill_days:value,avg_open_req_age_days:value}}};
  const k=homeRecruitingKpi(bad,true,PUBLIC_9037.token,date);assert.equal(k.timeToFillDays,null);assert.equal(k.openReqAgeDays,null);
 }
 const suppressed=homeRecruitingKpi({...result,data:{...data,summary:{...data.summary,suppressed:true}}},true,PUBLIC_9037.token,date);assert.equal(suppressed.timeToFillDays,null);assert.equal(suppressed.openReqAgeDays,null);
 const zero=homeRecruitingKpi({...result,data:{...data,summary:{...data.summary,avg_time_to_fill_days:0,avg_open_req_age_days:0}}},true,PUBLIC_9037.token,date);assert.equal(zero.timeToFillDays,0);assert.equal(zero.openReqAgeDays,0);
});
