import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const read = file => fs.readFileSync(new URL(file, import.meta.url), 'utf8');
function load(file, modules = {}) {
  const exports = {};
  const source = ts.transpileModule(read(file), {compilerOptions: {jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(source, {exports, structuredClone, require: name => Object.hasOwn(modules, name) ? modules[name] : require(name)});
  return exports;
}
const staffing = load('../lib/required-staffing.ts');
const study = load('../lib/workforce-case-study.ts', {'./required-staffing': staffing});
const plain = value => JSON.parse(JSON.stringify(value));

test('case uses shared calculator and separates sourced facts from invented inputs', () => {
  const result = study.compareWorkforceCase(study.defaultWorkforceCaseControls);
  assert.deepEqual(plain(result.options.map(o => [o.id, o.listedCash, o.readyAfterMonths, o.totalTrainingHours])), [['hire', 600000, 3, 160], ['redeploy', 456000, 3, 112], ['develop', 276000, 4, 368]]);
  assert.equal(result.shortlist.id, 'redeploy');
  assert.equal(result.provenance, 'synthetic-assumptions');
  assert.equal(result.operationalFeasibilityVerified, false);
  assert.ok(result.options.every(o => o.completeCash === null));
  assert.equal(study.workforceCaseAssumptions.costsComplete, false);
  assert.ok(study.workforceCaseSources.every(s => s.date && s.url.startsWith('https://') && s.fact));
});

test('deadline equality allows development but tighter deadlines never rank late routes', () => {
  assert.equal(study.compareWorkforceCase({...study.defaultWorkforceCaseControls, deadline: 4}).shortlist.id, 'develop');
  assert.equal(study.compareWorkforceCase({...study.defaultWorkforceCaseControls, deadline: 2}).shortlist, null);
});

test('withdrawn internal release and insufficient budgets produce honest empty states', () => {
  assert.equal(study.compareWorkforceCase({...study.defaultWorkforceCaseControls, release: false}).shortlist, null);
  assert.equal(study.compareWorkforceCase({...study.defaultWorkforceCaseControls, release: false, budget: 650000}).shortlist.id, 'hire');
  assert.ok(study.compareWorkforceCase({...study.defaultWorkforceCaseControls, budget: 650000}).options.every(o => !Object.hasOwn(o, 'budgetStatus') && !Object.hasOwn(o, 'coverage')));
  assert.equal(study.compareWorkforceCase({...study.defaultWorkforceCaseControls, budget: 250000, deadline: 4}).shortlist, null);
});

test('all 18 control combinations preserve counts, costs and conditional shortlist boundaries', () => {
  for (const deadline of [2, 3, 4]) for (const budget of [250000, 500000, 650000]) for (const release of [true, false]) {
    const result = study.compareWorkforceCase({deadline, budget, release});
    assert.ok(result.options.every(o => o.train + o.redeploy + o.hire === 10 && o.completeCash === null));
    if (result.shortlist) {
      assert.ok(result.shortlist.listedCash <= budget);
      assert.ok(result.shortlist.readyAfterMonths <= deadline);
      assert.ok(release || result.shortlist.hire === 10);
      assert.equal(result.shortlist.listedCash, Math.min(...result.options.filter(o => !o.blockers.length).map(o => o.listedCash)));
    }
  }
});

test('invalid controls fail closed and calculation never mutates the baseline', () => {
  const before = JSON.stringify(study.workforceCaseAssumptions);
  for (const patch of [{deadline: 0}, {deadline: NaN}, {budget: -1}, {budget: 500001}, {release: null}]) assert.throws(() => study.compareWorkforceCase({...study.defaultWorkforceCaseControls, ...patch}));
  study.compareWorkforceCase({deadline: 4, budget: 650000, release: false});
  assert.equal(JSON.stringify(study.workforceCaseAssumptions), before);
});

test('case shows provenance and limits beside a local-only accessible comparison', () => {
  const page = read('../app/case-study/page.tsx'), component = read('../components/workforce-case-comparison.tsx');
  for (const phrase of ['Published fact', 'Synthetic assumptions', 'not findings from the workforce snapshot', 'no individual is identified', 'not automatically imported or saved', 'no ROI is claimed', 'Whole-period quotes are not prorated']) assert.ok(page.includes(phrase), phrase);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /Reset case assumptions/);
  assert.match(component, /Complete cost.*Unverified/s);
  assert.match(component, /No option covers all 10 roles from day one/);
  assert.doesNotMatch(component + read('../lib/workforce-case-study.ts'), /fetch\(|localStorage|\/api\//);
});

test('rendered controls handle repeated changes, withdrawal, reset and a fresh visit', () => {
  let state;
  const ui = load('../components/workforce-case-comparison.tsx', {
    react: {useState: initial => { state ??= initial; return [state, next => {state = next;}]; }},
    '@/lib/workforce-case-study': study,
  });
  function nodes(tree) { return !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)]; }
  function text(tree) { return tree == null || typeof tree === 'boolean' ? '' : typeof tree !== 'object' ? String(tree) : Array.isArray(tree) ? tree.map(text).join(' ') : text(tree.props?.children); }
  const render = () => ui.WorkforceCaseComparison();
  const status = () => text(nodes(render()).find(n => n.props?.role === 'status'));
  const change = (index, value) => nodes(render()).filter(n => n.type === 'select')[index].props.onChange({target: {value}});
  assert.match(status(), /redeploy 3, hire 7/);
  change(0, '4'); assert.match(status(), /develop 4, redeploy 3, hire 3/);
  change(0, '4'); assert.match(status(), /develop 4, redeploy 3, hire 3/);
  change(2, 'false'); assert.match(status(), /No displayed strategy/);
  change(1, '650000'); assert.match(status(), /hire all 10/);
  change(0, '2'); assert.match(status(), /No displayed strategy/);
  nodes(render()).find(n => n.type === 'button').props.onClick(); assert.match(status(), /redeploy 3, hire 7/);
  change(1, '250000'); assert.match(status(), /No displayed strategy/);
  state = undefined; assert.match(status(), /redeploy 3, hire 7/);
  assert.equal(nodes(render()).filter(n => n.type === 'select').length, 3);
  assert.equal(nodes(render()).filter(n => n.type === 'label').length, 3);
});
