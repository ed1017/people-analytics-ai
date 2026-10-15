import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, {createRequire} from 'node:module';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
import * as demo from '../lib/home-demo-catalog.ts';
import * as pinned from '../lib/pinned-action-plans.ts';
import {createHomeDemoGoals} from '../lib/home-demo-goals.ts';

const filename = path.resolve('components/home-entry-starters.tsx');
const require = createRequire(import.meta.url);
const mocks = {'@/lib/home-demo-catalog': demo, '@/lib/pinned-action-plans': pinned};
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {fileName: filename, compilerOptions: {jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}});
const mod = new Module(filename);
mod.filename = filename;
mod.require = id => Object.hasOwn(mocks, id) ? mocks[id] : require(id);
mod._compile(compiled.outputText, filename);
const {HomeEntryStarters} = mod.exports;
const seed = () => createHomeDemoGoals('2026-10-06T00:00:00.000Z');
const render = (data, extra = {}) => HomeEntryStarters({goals: data.goals.goals, workspaces: data.workspaces, disabled: false, onSelect: () => {}, ...extra});
const buttons = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(buttons) : [...(tree.type === 'button' ? [tree] : []), ...buttons(tree.props?.children)];

test('three labeled synthetic examples open existing records without changing their saved contents', () => {
  const data = seed(), before = JSON.stringify(data), selected = [];
  const tree = render(data, {onSelect: (goal, planId) => selected.push({goal, planId})});
  const html = renderToStaticMarkup(tree);
  for (const label of ['Reduce turnover', 'Close AI skill gaps', 'Plan headcount', 'synthetic example', 'fictional assumptions', 'does not execute it or change the workforce baseline']) assert.ok(html.includes(label));
  assert.equal(buttons(tree).length, 3);
  for (const button of buttons(tree)) {assert.equal(button.props.disabled, false); button.props.onClick();}
  assert.deepEqual(selected.map(item => item.goal.id), demo.homeDemoExamples.map(item => item.id));
  assert.equal(JSON.stringify(data), before);
});

test('deleted, renamed or invalid example records are unavailable and never recreated', () => {
  const data = seed();
  data.goals.goals = data.goals.goals.filter(goal => goal.id !== demo.homeDemoExamples[0].id);
  data.goals.goals.find(goal => goal.id === demo.homeDemoExamples[1].id).statement = 'My revised goal';
  data.workspaces[demo.homeDemoExamples[2].id].fields[demo.homeDemoField] = null;
  const before = JSON.stringify(data), tree = render(data, {onSelect: () => assert.fail('Unavailable example opened')});
  for (const button of buttons(tree)) {assert.equal(button.props.disabled, true); button.props.onClick();}
  assert.equal(JSON.stringify(data), before);
});

test('loading, unsaved work, pending operations and existing drafts can block example selection', () => {
  const tree = render(seed(), {disabled: true, onSelect: () => assert.fail('Blocked example opened')});
  for (const button of buttons(tree)) {assert.equal(button.props.disabled, true); button.props.onClick();}
});
