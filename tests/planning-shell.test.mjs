import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
import * as dashboardScope from '../lib/dashboard-scope.ts';
import {appPageFromSearch, appPageHref} from '../lib/app-page-url.ts';

const require = createRequire(import.meta.url);
const filename = path.resolve('components/home-chat-welcome.tsx');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {fileName: filename, compilerOptions: {jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}});
const mod = new Module(filename);
mod.filename = filename;
mod.require = id => id.endsWith('.module.css') ? {default: {}} : id === '@/lib/dashboard-scope' ? dashboardScope : require(id);
mod._compile(compiled.outputText, filename);
const {HomeChatWelcome, planningQuestions, welcomeHistory} = mod.exports;
const filters = {country: 'all', org: 'all', level: 'all'};
const base = {overview: {snapshot_date: '2026-09-30', headcount: 120, fte: 118, voluntary_turnover_ytd_pct: 8.2}, receipt: {version: 1, status: 'verified_rpc', requested: filters, effective: filters}, requested: filters, scopeLabel: 'All workforce', loading: false, error: null, onQuestion: () => {}};
const render = props => renderToStaticMarkup(React.createElement(HomeChatWelcome, {...base, ...props})).replaceAll('<!-- -->', '');

test('welcome shows only verified headcount, never turns YTD into annual attrition or invents AI exposure', () => {
  const html = render({});
  assert.match(html, />120</);
  assert.match(html, /2026-09-30/);
  assert.equal((html.match(/Not available/g) ?? []).length, 2);
  assert.match(html, /Projection not configured/);
  assert.match(html, /Watch: Not assessed/);
  assert.doesNotMatch(html, /8\.2|18%|10,000|Supply vs demand/);
  assert.equal((html.match(/<button/g) ?? []).length, 4);
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
  assert.deepEqual(sent, [...planningQuestions]);
  assert.match(render({composer: React.createElement('textarea', {'aria-label': 'Existing composer'})}), /Existing composer/);
  assert.equal((render({disabled: true}).match(/disabled=""/g) ?? []).length, 4);
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
test('history is dated recorded evidence with an accessible series, never a forecast or inferred flow', () => {
  const html = render({trend:history});
  assert.match(html, /role="img" aria-label="Recorded synthetic headcount history in people\. All workforce\./);
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
