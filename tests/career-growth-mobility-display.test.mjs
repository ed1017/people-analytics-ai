import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as scope from '../lib/talent-evidence-scope.ts';
import * as performance from '../lib/workforce-performance.ts';
import * as format from '../lib/display-format.ts';
import * as onboarding from '../lib/home-onboarding.ts';
import {buildCareerGrowthMobilityAggregate} from '../lib/career-growth-mobility.ts';

const require = createRequire(import.meta.url);
function loadComponent(path, aliases = {}) {
  const source = fs.readFileSync(new URL(path, import.meta.url), 'utf8');
  const js = ts.transpileModule(source, {compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  }}).outputText;
  const exports = {};
  vm.runInNewContext(js, {exports, require: name => aliases[name] ?? require(name)});
  return exports;
}
const {CareerGrowthMobilityPage} = loadComponent('../components/pages/career-growth-mobility-page.tsx', {
  '@/components/evidence-scope-notice': loadComponent('../components/evidence-scope-notice.tsx', {'@/lib/talent-evidence-scope': scope}),
  '@/components/workforce-performance': loadComponent('../components/workforce-performance.tsx', {'@/lib/workforce-performance': performance}),
  '@/lib/talent-evidence-scope': scope,
  '@/lib/display-format': format,
});
const selectedContext = {country: 'Canada', businessUnit: 'Example unit', level: 'IC2'};
const empty = buildCareerGrowthMobilityAggregate([], [], []);
const loaded = buildCareerGrowthMobilityAggregate([{
  movement_id: 'synthetic-movement', employee_id: 'synthetic-employee', movement_date: '2026-07-05',
  movement_type: 'promotion', from_position_id: null, to_position_id: null,
  from_job_level_id: 'synthetic-l1', to_job_level_id: 'synthetic-l2',
}], [{employee_id: 'synthetic-employee', employment_status: 'active', source_system: 'synthetic'}], [
  {job_level_id: 'synthetic-l1', level_code: 'IC1', level_rank: 1},
  {job_level_id: 'synthetic-l2', level_code: 'IC2', level_rank: 2},
]);
const render = props => renderToStaticMarkup(React.createElement(CareerGrowthMobilityPage, {
  data: null, loading: false, error: null, selectedContext, ...props,
}));

test('recorded movement content is always exposed in loaded, loading, error and empty states', () => {
  for (const [props, message] of [
    [{data: loaded}, /Recorded Movement Events/],
    [{loading: true}, /Loading recorded movement…/],
    [{error: 'Movement source unavailable.'}, /Movement source unavailable\./],
    [{data: empty}, /No recorded movement events were returned\./],
    [{}, /No recorded movement events were returned\./],
  ]) {
    const html = render(props);
    assert.match(html, /<h2[^>]*>Recorded movement history · company-wide context<\/h2>/);
    assert.match(html, message);
    assert.doesNotMatch(html, /<details\b|<summary\b|\shidden(?:[\s=>])|aria-hidden="true"/);
  }
  assert.doesNotMatch(render({loading: true}), /No recorded movement events were returned/);
  assert.doesNotMatch(render({error: 'Movement source unavailable.'}), /No recorded movement events were returned/);
});

test('company-wide scope, source limitations and level transitions remain rendered', () => {
  const html = render({data: loaded});
  assert.match(html, /Evidence scope: Company recorded movement events/);
  assert.match(html, /Canada · Example unit · IC2/);
  assert.match(html, /These dashboard selections do not narrow these recorded movement events/);
  assert.match(html, /Dashboard country, business-unit, and level selections do not filter these movement events/);
  assert.match(html, /Source coverage &amp; limitations/);
  assert.match(html, /IC1 → IC2/);
  assert.match(html, /not workforce promotion, transfer, or mobility rates/);
});

test('Home instructions are a closed accessible dialog in server markup and the Planning guide retains disclosures', () => {
  const {HomeGettingStarted} = loadComponent('../components/home-getting-started.tsx', {'@/lib/home-onboarding': onboarding});
  const intro = renderToStaticMarkup(React.createElement(HomeGettingStarted, {busy: false, active: true, ready: false, autoOpen: false, dismissKey: 'initial', onNavigate() {}, onStartDemo() {}}));
  assert.match(intro, /aria-haspopup="dialog"/);
  assert.match(intro, />Show instructions<\/button>/);
  assert.match(intro, /<dialog\b[^>]*aria-labelledby=/);
  assert.doesNotMatch(intro, /<dialog\b[^>]*\sopen(?:=|[\s>])/);
  assert.match(intro, /Close instructions/);
  assert.match(intro, /From question to action/);
  const guide = fs.readFileSync(new URL('../components/planning-guide.tsx', import.meta.url), 'utf8');
  assert.match(guide, /<details><summary[^>]*>See the full Planning sequence<\/summary>/);
  assert.match(guide, /<details[^>]*><summary[^>]*>Limits to keep in mind<\/summary>/);
});
