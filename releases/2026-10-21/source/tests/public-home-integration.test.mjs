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
 assert.match(html,/9,037/);assert.match(html,/9 monthly snapshots/);assert.equal((html.match(/<circle/g)??[]).length,18);assert.doesNotMatch(html,/Verified headcount history unavailable|Verified snapshot needed/);
 assert.doesNotMatch(render(d,filters,true),/9,037/);assert.equal(Object.hasOwn(d.workforce_filter_scope,'artifactDigest'),false);
});
test('compact landing shows workforce evidence without a duplicate scenario opener or inline example',async()=>{
 const requested={country:'all',org:'all',level:'all'},d=await read(requested);
 const html=renderToStaticMarkup(React.createElement(exports.HomeChatWelcome,{overview:d.overview,receipt:scope.readDashboardScopeReceipt(d.workforce_filter_scope),requested,scopeLabel:'Global workforce',loading:false,error:null,trend:d.trend,onQuestion:()=>{}}));
 assert.doesNotMatch(html,/Plan the workforce your business needs|Try the worked example|Explore the full app|Worked example: adjust staffing/);assert.match(html,/What decision are you facing/);assert.match(html,/9,037/);assert.match(html,/9 monthly snapshots/);
 assert.doesNotMatch(html,/Try a planning scenario/);assert.doesNotMatch(html.replace(/<[^>]*>/g,''),/\bdemo\b/i);assert.doesNotMatch(html,/A 5 FTE capacity gap|\$325,000|Choose a staffing option|Develop and move your team/);
});
test('public filtered Home keeps exact requested/effective scope; malformed and stale receipts stay unavailable',async()=>{
 const filters={country:'US',org:'all',level:'L1'},d=await read(filters);assert.ok(scope.readDashboardScopeReceipt(d.workforce_filter_scope));assert.match(render(d,filters),/9 monthly snapshots/);
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

test('Overview has one scoped findings banner before risk and retains chart headcount',async()=>{
 const f={country:'all',org:'all',level:'all'},d=await read(f),html=render(d,f);
 assert.equal((html.match(/aria-label="Key findings"/g)||[]).length,1);
 assert.ok(html.indexOf('aria-label="Key findings"')<html.indexOf('aria-label="Workforce risks"'));
 assert.match(html,/As of 2026-09-30/);assert.match(render({...d,trend:[]},f),/As of 2026-09-30/);assert.match(html,/197 open positions/);assert.match(html,/Voluntary turnover: 8.8% YTD/);
 assert.match(html,/Current headcount <strong>9,037<\/strong> people/);
 for(const h of [render(d,f,true),render(d,f,false,'failed'),render(d,{...f,org:'BU-SALES'})]){
  assert.doesNotMatch(h,/197 open positions|Voluntary turnover: 8.8% YTD|9,037/);
 }
 const scoped={country:'US',org:'all',level:'L1'},filtered=await read(scoped),filteredHtml=render(filtered,scoped);
 assert.match(filteredHtml,new RegExp(filtered.overview.headcount.toLocaleString()+' people'));
});


test('company introduction stays in left welcome slot and uses the full company profile under filters',async()=>{
 for(const requested of [{country:'all',org:'all',level:'all'},{country:'US',org:'BU-TECH',level:'L1'}]){
  const d=await read(requested),props={overview:d.overview,receipt:scope.readDashboardScopeReceipt(d.workforce_filter_scope),requested,scopeLabel:'Selected scope',loading:false,error:null,trend:d.trend,onQuestion:()=>{}};
  const tree=exports.HomeChatWelcome(props),split=tree.props.children;
  const children=React.Children.toArray(split.props.children);assert.equal(children[0].type.name,'HomeCompanyIntro');assert.equal(children[1].props.children,'What decision are you facing?');assert.equal(split.props.visuals.type.name,'HomeHeadcountSummary');
  const html=renderToStaticMarkup(React.createElement(exports.HomeChatWelcome,props));
  const intro=html.match(/<section aria-label="Company introduction"[^>]*>([\s\S]*?)<\/section>/)[1];
  assert.match(intro,/>Company<\/h2>/);assert.match(intro,/fictional global business/);assert.match(intro,/9,037 people in 10 countries and 8 business units/);assert.match(intro,/September 30, 2026/);assert.doesNotMatch(intro,/fewer FTE|Workforce risks|capacity gap/);
  const missing=renderToStaticMarkup(React.createElement(exports.HomeChatWelcome,{...props,receipt:null}));
  const fallback=missing.match(/<section aria-label="Company introduction"[^>]*>([\s\S]*?)<\/section>/)[1];assert.match(fallback,/Explore workforce evidence/);assert.doesNotMatch(fallback,/9,037|10 countries|Ed Inc/);
 }
});

test('projection presentation distinguishes unselected, checking, unavailable and checked values',async()=>{
 const filters={country:'all',org:'all',level:'all'},d=await read(filters);
 const view=(extra={})=>renderToStaticMarkup(React.createElement(exports.HomeHeadcountSummary,{overview:d.overview,receipt:scope.readDashboardScopeReceipt(d.workforce_filter_scope),requested:filters,scopeLabel:'Global workforce',loading:false,error:null,trend:d.trend,...extra}));
 const idle=view();assert.match(idle,/No projection selected/);assert.match(idle,/Set monthly hiring and departure assumptions in Scenarios/);assert.doesNotMatch(idle,/Projection not configured|AI configuration/);
 assert.match(view({projectionStatus:'checking'}),/Checking projection/);
 assert.match(view({projectionStatus:'unavailable'}),/Selected projection unavailable\. Review it and choose Show on Home again/);
 const projection={checkedAt:'2026-10-26T00:00:00Z',provenance:'approved-public-projection-read',analysis:{id:'test',revision:1,inputs:{asOf:d.overview.snapshot_date,opening:d.overview.headcount,filters},assumptions:{monthly_hires:5,monthly_exits:3},points:[{month:'2026-10-31',headcount:d.overview.headcount+2,hires:5,exits:3,transfersIn:0,transfersOut:0}],interpretations:[],limitations:[]}};
 const ready=view({projection,projectionStatus:'ready'});assert.match(ready,/Conditional projection/);assert.doesNotMatch(ready,/No projection selected|Projection unavailable/);assert.match(ready,/monthly hires/);
 assert.doesNotMatch(view({projection:{...projection,analysis:{...projection.analysis,inputs:{...projection.analysis.inputs,opening:0}}},projectionStatus:'unavailable'}),/Dashed: conditional projection/);
});

test('Data details remove selection-algorithm prose while keeping source counts and source semantics',()=>{
 const source=fs.readFileSync(new URL('../components/pages/overall-overview-page.tsx',import.meta.url),'utf8'),ast=ts.createSourceFile('overview.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='homeEvidenceDisplayLimitation');assert.ok(fn);
 const js=ts.transpileModule(fn.getText(ast),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,isolated={};vm.runInNewContext(js,{exports:isolated});
 const display=isolated.homeEvidenceDisplayLimitation;
 const cohort={id:'R1',limitation:'Successful-hire records only; unsuccessful applications are absent; do not derive funnel conversion.'},before=JSON.stringify(cohort);
 assert.equal(display(cohort),'Conversion unavailable: unsuccessful applications are missing.');assert.equal(JSON.stringify(cohort),before);
 assert.equal(display({id:'R1',limitation:'Full recruiting funnel for this period.'}),'Full recruiting funnel for this period.');
 assert.equal(display({id:'T5',limitation:'Never derive suppressed complements.'}),'Recorded succession plans; suppressed values remain unavailable.');
 assert.equal(display({id:'A1',limitation:'Voluntary exits; not all exits.'}),'Voluntary exits; not all exits.');
 const details=source.slice(source.indexOf('<div id="home-data-details"'),source.indexOf('\n      </div>',source.indexOf('<div id="home-data-details"')));
 assert.doesNotMatch(details,/pack\.coverage\.selection|source\.coverage\.selection/);assert.match(details,/pack\.coverage\.available/);assert.match(details,/source\.coverage\.rowsIncluded/);assert.match(details,/source\.coverage\.rowsAvailable/);assert.match(details,/Source unavailable\./);
 const internal=fs.readFileSync(new URL('../lib/home-pack.mjs',import.meta.url),'utf8');assert.match(internal,/Explicit goal-word matches first/);assert.match(internal,/Never derive suppressed complements/);
});
