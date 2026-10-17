import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
import * as swpDemo from '../lib/swp-demo.ts';
import * as dashboardScope from '../lib/dashboard-scope.ts';
import {appPageFromSearch, appPageHref} from '../lib/app-page-url.ts';

const require = createRequire(import.meta.url);
const filename = path.resolve('components/home-chat-welcome.tsx');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {fileName: filename, compilerOptions: {jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}});
const mod = new Module(filename);
mod.filename = filename;
mod.require = id => id.endsWith('.module.css') ? {default: {}} : id === '@/lib/dashboard-scope' ? dashboardScope : id === '@/lib/swp-demo' ? swpDemo : require(id);
mod._compile(compiled.outputText, filename);
const {HomeChatWelcome, planningQuestions, welcomeHistory} = mod.exports;
const filters = {country: 'all', org: 'all', level: 'all'};
const base = {overview: {snapshot_date: '2026-09-30', headcount: 120, fte: 118, voluntary_turnover_ytd_pct: 8.2}, receipt: {version: 1, status: 'verified_rpc', requested: filters, effective: filters}, requested: filters, scopeLabel: 'All workforce', loading: false, error: null, onQuestion: () => {}};
const render = props => renderToStaticMarkup(React.createElement(HomeChatWelcome, {...base, ...props})).replaceAll('<!-- -->', '');

test('welcome shows verified snapshot KPIs without annualization or invented sentiment', () => {
  const html = render({});
  assert.match(html, />120</);
  assert.match(html, /2026-09-30/);
  assert.equal((html.match(/Not available/g) ?? []).length, 2);
  assert.match(html, /Projection not configured/);
  assert.match(html, /Watch: Not assessed/);
  assert.match(html, /8\.2%/);
  assert.match(html, /Voluntary turnover YTD/);
  assert.match(html, /not annualized/);
  assert.match(html, /Cost period unspecified/);
  assert.doesNotMatch(html, /18%|10,000|Supply vs demand/);
  assert.equal((html.match(/<button/g) ?? []).length, 5);
});

test('welcome withholds stale or unverified numbers and preserves verified zero', () => {
  for (const patch of [{receipt: null}, {loading: true}, {error: 'Unavailable'}, {requested: {...filters, country: 'UK'}}, {overview: {...base.overview, snapshot_date: '2026-02-31'}}, {overview: {...base.overview, headcount: null}}]) {
    assert.doesNotMatch(render(patch), />120</);
  }
  assert.match(render({overview: {...base.overview, headcount: 0}}), />0</);
});

test('question tiles use the supplied callback and composer slot without owning requests', () => {
  const sent = [];
  const tree = HomeChatWelcome({...base, onQuestion: question => sent.push(question), composer: React.createElement('textarea', {'aria-label': 'Existing composer'})});
  const buttons = [];
  function visit(node) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) {node.forEach(visit); return;} if(node.type === 'button') buttons.push(node); visit(node.props?.children); }
  visit(tree);
  buttons.forEach(button => button.props.onClick());
  assert.deepEqual(sent, [swpDemo.swpDemoPrompt,...planningQuestions]);
  assert.match(render({composer: React.createElement('textarea', {'aria-label': 'Existing composer'})}), /Existing composer/);
  assert.equal((render({disabled: true}).match(/disabled=""/g) ?? []).length, 5);
});

test('new support destinations round-trip without dropping scope or goal URL state', () => {
  for (const page of ['future-of-work', 'action-plans', 'plan-track']) {
    const href = appPageHref({pathname: '/', search: '?country=UK&goal=existing', hash: ''}, page);
    assert.equal(appPageFromSearch(href.slice(1)), page);
    assert.match(href, /country=UK&goal=existing/);
  }
});

test('compact tiles retain complete long labels and allow text to wrap without clipping', () => {
  const html = render({});
  for (const question of planningQuestions) assert.ok(html.includes(question));
  const css = fs.readFileSync('components/home-chat-shell.module.css', 'utf8');
  const tileRules = [...css.matchAll(/\.questions button(?:\s*>\s*span)?\s*\{([^}]+)\}/g)].map(match => match[1]);
  assert.ok(tileRules.length >= 3, 'desktop, label, and narrow-screen sizing are covered');
  for (const rule of tileRules) {
    assert.doesNotMatch(rule, /(?:^|;)\s*(?:height|max-height)\s*:|overflow\s*:\s*hidden|white-space\s*:\s*nowrap|text-overflow\s*:\s*ellipsis/);
  }
  assert.match(css, /\.questions button > span\s*\{[^}]*min-width:\s*0;[^}]*overflow-wrap:\s*anywhere/);
  assert.match(css, /\.questions button\s*\{[^}]*justify-content:\s*center;[^}]*text-align:\s*left;/);
  assert.match(css, /\.questions\s*\{[^}]*grid-template-columns:\s*repeat\(2,/);
});

const history = [{snapshot_date:'2026-07-31',headcount:110,fte:108},{snapshot_date:'2026-08-31',headcount:115,fte:113},{snapshot_date:'2026-09-30',headcount:120,fte:118}];
const chartMarkup = html => html.match(/<figure[^>]*>([\s\S]*?)<\/figure>/)?.[1] ?? '';
test('headcount KPI selector remains unique when the chart axis repeats the current value', () => {
  for (const value of [120, 1240, 100]) {
    const html=render({overview:{...base.overview,headcount:value},trend:[{...history[2],headcount:value}]});
    const formatted=value.toLocaleString();
    assert.equal(html.split('>'+formatted+'<').length-1,2,'only header and chart axis repeat the value; duplicate KPI is replaced by period change');
    const snapshot=html.match(/<section aria-label="Workforce snapshot"[^>]*>([\s\S]*?)<\/section>/)?.[1];
    assert.ok(snapshot);
    assert.deepEqual([...snapshot.matchAll(/<strong[^>]*>([^<]*)<\/strong>/g)].map(match=>match[1]),[formatted]);
  }
  for (const [script,value] of [['home-overview-entry','1,240'],['workforce-intelligence-overview','100']]) {
    const source=fs.readFileSync(`tests/browser/${script}.mjs`,'utf8');
    assert.ok(source.includes(`welcome.getByRole('region',{name:'Workforce snapshot',exact:true}).locator('strong').filter({hasText:/^${value}$/}).waitFor()`));
    assert.ok(!source.includes(`welcome.getByText('${value}',{exact:true})`),'all numeric KPI checks use the scoped selector');
  }
});
test('history is dated recorded evidence with an accessible series, never a forecast or inferred flow', () => {
  const html = render({trend:history});
  assert.match(html, /role="img" aria-label="Recorded synthetic headcount history in people\. All workforce\./);
  assert.ok(html.indexOf('<figure')<html.indexOf('aria-label="Recorded workforce indicators"'),'trend precedes KPI cards in the snapshot');
  for (const row of history) assert.ok(html.includes(`${row.snapshot_date}: ${row.headcount}`));
  assert.equal((chartMarkup(html).match(/<circle/g)??[]).length,3);
  assert.equal((chartMarkup(html).match(/<line /g)??[]).length,3, 'axis and two adjacent-month segments');
  assert.match(html,/No projection\./);
  assert.doesNotMatch(html,/2026-10|5 hires|5 departures/);
  assert.deepEqual(welcomeHistory([...history].reverse(), '2026-09-30', 120),history);
});
test('history rejects malformed, conflicting, future or stale snapshots rather than drawing partial truth', () => {
  for (const trend of [null,[],[...history,history[0]],history.slice(0,2),[...history.slice(0,2),{...history[2],headcount:119}],[...history,{snapshot_date:'2026-10-31',headcount:130}],history.map((row,index)=>index===0?{...row,snapshot_date:'2026-02-31'}:row),history.map((row,index)=>index===0?{...row,headcount:null}:row)]) {
    const html=render({trend});
    assert.doesNotMatch(html,/role="img"/);
    assert.match(html,/Verified headcount history unavailable/);
    assert.match(html,/>120</, 'valid current snapshot remains useful');
  }
  for(const patch of [{receipt:null},{requested:{...filters,org:'other'}},{loading:true},{error:'Failed'}]) assert.doesNotMatch(render({trend:history,...patch}),/role="img"|2026-07-31: 110/);
  assert.match(render({loading:true,trend:history}),/Updating workforce history/);
});
test('missing months stay disconnected; a single zero observation never becomes a trend', () => {
  const gap=render({trend:[history[0],history[2]]});
  assert.equal((chartMarkup(gap).match(/<line /g)??[]).length,1,'axis only across the missing month');
  assert.equal((chartMarkup(gap).match(/<circle/g)??[]).length,2);
  const zero=render({overview:{...base.overview,headcount:0},trend:[{...history[2],headcount:0}]});
  assert.match(zero,/2026-09-30: 0/);
  assert.match(zero,/One recorded snapshot/);
  assert.equal((chartMarkup(zero).match(/<line /g)??[]).length,1);
  assert.doesNotMatch(zero,/NaN|Infinity/);
});

test('recorded KPIs retain scope and units separately from projected flows',()=>{
 const props={overview:{...base.overview,labor_cost_usd:45200},recruitingKpi:{hires:7,month:'2026-09',asOf:'2026-09-30'}};
 const html=render(props);
 assert.match(html,/7<\/b>/);assert.match(html,/company-wide recruiting events/);assert.match(html,/including internal fills/);
 assert.match(html,/USD 45,200\.00/);assert.match(html,/Cost period unspecified/);
 assert.match(html,/Projected hires/);assert.match(html,/Projected departures/);
 assert.match(html,/eligible survey result and suppression metadata/);
 for(const patch of [{loading:true},{error:'failed'},{receipt:null},{requested:{...filters,country:'UK'}}]){
  const stale=render({...props,...patch});assert.doesNotMatch(stale,/7<\/b>|8\.2%|USD 45,200\.00/);
 }
 assert.doesNotMatch(render({...props,recruitingKpi:{...props.recruitingKpi,asOf:'2026-08-31'}}),/7<\/b>/);
 const zero=render({overview:{...base.overview,voluntary_turnover_ytd_pct:0,labor_cost_usd:0}});
 assert.match(zero,/0%/);assert.match(zero,/USD 0\.00/);
});

test('unavailable headcount selector is unique among four withheld indicators',()=>{
 const html=render({receipt:null,trend:history,overview:{...base.overview,labor_cost_usd:45200},recruitingKpi:{hires:7,month:'2026-09',asOf:'2026-09-30'}});
 assert.equal(html.split('>Unavailable<').length-1,4,'invalid receipt reproduces all four unavailable indicators');
 const snapshot=html.match(/<section aria-label="Workforce snapshot"[^>]*>([\s\S]*?)<\/section>/)?.[1];
 assert.ok(snapshot);
 assert.deepEqual([...snapshot.matchAll(/<strong[^>]*>([^<]*)<\/strong>/g)].map(match=>match[1]),['Unavailable']);
 assert.doesNotMatch(html,/role="img"/,'invalid receipt must still withhold the chart');
 const source=fs.readFileSync('tests/browser/home-overview-entry.mjs','utf8');
 assert.ok(source.includes("welcome.getByRole('region',{name:'Workforce snapshot',exact:true}).locator('strong').filter({hasText:/^Unavailable$/}).waitFor();assert.equal(await welcome.getByRole('img').count(),0)"));
 assert.ok(!source.includes("welcome.getByText('Unavailable',{exact:true})"));
});


test('undated cost stays out of headline KPIs while exact source amount and period limits remain available', () => {
  const html = render({overview:{...base.overview,labor_cost_usd:2047306374.48}});
  assert.doesNotMatch(html, /USD 2\.05B/);
  assert.doesNotMatch(html.match(/<ul aria-label="Recorded workforce indicators">([\s\S]*?)<\/ul>/)[1],/Labor cost|2,047/);
  assert.match(html, /<details[^>]*><summary>Labor cost: period unspecified<\/summary><p>USD 2,047,306,374\.48\. Cost period unspecified; no monthly or annual basis is inferred\.<\/p><\/details>/);
  assert.match(html, /<details[^>]*><summary>Sources and exact cost/);
  assert.match(html, /Cost period unspecified; no monthly or annual basis is inferred/);
  assert.match(html, /survey respondents are a separate population/);
  assert.doesNotMatch(render({}), /<summary>Labor cost: period unspecified<\/summary>/);
});


test('initial intro keeps trend, indicators and a single question composer in reading order', () => {
  const html=render({composer:React.createElement('form',null,React.createElement('textarea',{'aria-label':'Existing composer'}))});
  assert.equal((html.match(/<form/g)??[]).length,1);
  assert.ok(html.indexOf('aria-label="Workforce snapshot"')<html.indexOf('Existing composer'));
  assert.match(html,/Recorded synthetic workforce history/);
  assert.match(html,/Cost period unspecified/);
});


// Both entry surfaces must keep undated cost out of headline metrics.
import * as displayFormat from '../lib/display-format.ts';
const baselineFilename=path.resolve('components/pages/overview-page.tsx');
const baselineCompiled=ts.transpileModule(fs.readFileSync(baselineFilename,'utf8'),{fileName:baselineFilename,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
const baselineModule=new Module(baselineFilename);baselineModule.filename=baselineFilename;
baselineModule.require=id=>id==='@/lib/display-format'?displayFormat:require(id);
baselineModule._compile(baselineCompiled.outputText,baselineFilename);
const baselineProps={overviewData:{...base.overview,labor_cost_usd:2047306374.48,open_positions:12},headcountTrend:[],selectedCountryLabel:'Global workforce',selectedOrgLabel:'All business units',selectedLevelLabel:'All levels',dashboardLoading:false,dashboardError:null,headcountGrowthPct:null};
const renderBaseline=patch=>renderToStaticMarkup(React.createElement(baselineModule.exports.OverviewPage,{...baselineProps,...patch})).replaceAll('<!-- -->','');
test('Baseline demotes undated cost consistently with Overview and retains exact amount, scope and period warning',()=>{
 const html=renderBaseline({});
 const headlines=html.slice(html.indexOf('aria-label="Baseline headline metrics"'),html.indexOf('<details'));
 assert.doesNotMatch(headlines,/Labor Cost|2\.05B|2,047,306/);
 assert.match(headlines,/Headcount/);assert.match(headlines,/Attrition/);assert.match(headlines,/Open Positions/);
 const detail=html.match(/<details[^>]*>([\s\S]*?)<\/details>/)[1];
 assert.match(detail,/<summary[^>]*>Labor cost: period unspecified<\/summary>/);
 assert.match(detail,/USD 2,047,306,374\.48/);
 assert.match(detail,/Cost period unspecified; no monthly or annual basis is inferred/);
 assert.match(detail,/September 30, 2026/);assert.match(detail,/Global workforce \/ All business units \/ All levels/);
 assert.match(detail,/snapshot date does not establish the cost period/);
 const overview=render({overview:{...base.overview,labor_cost_usd:2047306374.48}});
 assert.doesNotMatch(overview,/>USD 2\.05B</);assert.match(overview,/Labor cost: period unspecified/);
});
test('Baseline cost details withhold stale, missing and invalid values while preserving verified zero',()=>{
 for(const patch of [{dashboardLoading:true},{dashboardError:'failed'},{overviewData:null},{overviewData:{...baselineProps.overviewData,labor_cost_usd:null}},{overviewData:{...baselineProps.overviewData,labor_cost_usd:NaN}}]){
  const html=renderBaseline(patch);assert.doesNotMatch(html,/USD 2,047,306|USD 0\.00/);assert.match(html,/Verified scoped cost unavailable/);
 }
 assert.match(renderBaseline({overviewData:{...baselineProps.overviewData,labor_cost_usd:0}}),/USD 0\.00/);
});

test('period change uses verified historical endpoints, with readable intermediate dates and no inferred rate',()=>{
 const html=render({trend:history});
 assert.match(html,/Recorded period change/);assert.match(html,/\+10 people/);
 for(const date of ['Jul 2026','Aug 2026','Sep 2026'])assert.ok(chartMarkup(html).includes(date));
 assert.match(render({trend:[{...history[0],headcount:130},history[2]]}),/-10 people/);
 assert.match(render({trend:[{...history[0],headcount:120},history[2]]}),/>0 people</);
 for(const patch of [{trend:[history[2]]},{trend:history,loading:true},{trend:history,receipt:null},{trend:[history[0],{...history[2],headcount:119}]}])assert.doesNotMatch(render(patch),/[+-]10 people/);
});

 test('recruiting distinguishes pending from unavailable and withholds stale counts', () => {
  const kpi={hires:75,month:'2026-09',asOf:'2026-09-30'};
  assert.match(render({recruitingPending:true,recruitingKpi:kpi}), /Recruiting hires<\/span><b>Loading…<\/b>/);
  assert.doesNotMatch(render({recruitingPending:true,recruitingKpi:kpi}), />75</);
  assert.match(render({recruitingPending:false,recruitingKpi:null}), /Recruiting hires<\/span><b>Unavailable<\/b>/);
  assert.match(render({recruitingPending:false,recruitingKpi:kpi}), /Recruiting hires<\/span><b>75<\/b>/);
 });
