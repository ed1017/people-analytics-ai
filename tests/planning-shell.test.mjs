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
const {HomeChatWelcome, planningQuestions} = mod.exports;
const filters = {country: 'all', org: 'all', level: 'all'};
const base = {overview: {snapshot_date: '2026-09-30', headcount: 120, fte: 118, voluntary_turnover_ytd_pct: 8.2}, receipt: {version: 1, status: 'verified_rpc', requested: filters, effective: filters}, requested: filters, scopeLabel: 'All workforce', loading: false, error: null, onQuestion: () => {}};
const render = props => renderToStaticMarkup(React.createElement(HomeChatWelcome, {...base, ...props})).replaceAll('<!-- -->', '');

test('welcome shows only verified headcount, never turns YTD into annual attrition or invents AI exposure', () => {
  const html = render({});
  assert.match(html, />120</);
  assert.match(html, /2026-09-30/);
  assert.equal((html.match(/Not configured/g) ?? []).length, 2);
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
