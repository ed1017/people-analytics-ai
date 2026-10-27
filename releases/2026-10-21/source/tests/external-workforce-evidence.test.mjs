import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);

const exports = {};
const source = fs.readFileSync(new URL('../lib/external-workforce-evidence.ts', import.meta.url), 'utf8');
vm.runInNewContext(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText, {exports});
const {EXTERNAL_WORKFORCE_EVIDENCE: records, findExternalWorkforceEvidence: find} = exports;

test('source selections preserve exact vintage, occupation and metro scope with attribution', () => {
  assert.equal(records.length, 2);
  assert.equal(new Set(records.map(r => r.id)).size, records.length);
  for (const r of records) {
    assert.equal(r.occupation.code, '15-1252');
    assert.equal(r.occupation.title, 'Software Developers');
    assert.equal(r.geography.type, 'metropolitan');
    assert.equal(r.referencePeriod, '2025-05');
    assert.equal(r.releasedAt, '2026-05-15');
    assert.equal(r.retrievedAt, '2026-10-26');
    for (const key of ['url', 'releaseUrl', 'licenseUrl']) assert.equal(new URL(r.source[key]).hostname, 'www.bls.gov');
    assert.match(r.source.license, /Public domain/);
  }
  assert.equal(records[0].geography.name, 'New York-Newark-Jersey City, NY-NJ');
  assert.equal(records[1].geography.name, 'Boston-Cambridge-Newton, MA-NH');
});

test('unretrieved estimates and unknown availability/hiring time never become zero or inferred counts', () => {
  for (const r of records) {
    assert.equal(r.status, 'unavailable');
    assert.equal(r.suppression, 'not-checked');
    for (const key of ['employmentJobs', 'annualMeanWageUsd', 'annualMedianWageUsd', 'availableCandidates', 'timeToFillDays']) assert.equal(r[key], null);
    assert.equal(r.geography.code, null);
    assert.equal(r.source.downloadUrl, null);
    assert.match(r.limitation, /jobs held, not available candidates/);
    assert.match(r.limitation, /exclude employer benefit costs/);
  }
});

test('reference evidence is immutable and lookup never invents internal role mappings', () => {
  assert.ok(Object.isFrozen(records));
  for (const r of records) {
    assert.ok(Object.isFrozen(r)); assert.ok(Object.isFrozen(r.occupation));
    assert.ok(Object.isFrozen(r.geography)); assert.ok(Object.isFrozen(r.source));
    assert.equal(find(r.id), r);
  }
  assert.equal(find('AI-ENG'), null);
  assert.equal(find('Software Developers'), null);
  assert.equal(find('unknown'), null);
});

test('qualitative skills link stays separate from local market estimates', () => {
  const refs = exports.EXTERNAL_ROLE_SKILL_SOURCES;
  assert.ok(Object.isFrozen(refs));
  assert.equal(refs.length, 1);
  assert.equal(refs[0].occupationCode, '15-2051.01');
  assert.equal(refs[0].kind, 'qualitative-role-reference');
  assert.equal(refs[0].geography, 'United States');
  assert.equal(new URL(refs[0].url).hostname, 'www.onetonline.org');
  assert.match(refs[0].limitation, /broader Data Scientists/);
  assert.equal('employmentJobs' in refs[0], false);
  assert.equal('skillScores' in refs[0], false);
});

function panelHarness() {
  const state = []; let cursor = 0;
  const react = {...require('react'), useId: () => 'evidence-test', useState: initial => {
    const index = cursor++; if (!(index in state)) state[index] = initial;
    return [state[index], value => { state[index] = value; }];
  }};
  const panel = {};
  const code = fs.readFileSync(new URL('../components/external-workforce-evidence-panel.tsx', import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(code, {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022}}).outputText, {
    exports: panel, require: name => name === 'react' ? react : name === '@/lib/external-workforce-evidence' ? exports : require(name),
  });
  return () => { cursor = 0; return panel.ExternalWorkforceEvidencePanel(); };
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
function text(tree) {
  if (tree == null || typeof tree === 'boolean') return '';
  if (typeof tree !== 'object') return String(tree);
  return Array.isArray(tree) ? tree.map(text).join(' ') : text(tree.props?.children);
}
test('panel uses labelled native controls and truthful empty state without numeric placeholders', () => {
  const render = panelHarness(), tree = render(), all = nodes(tree);
  const selects = all.filter(n => n.type === 'select');
  assert.equal(selects.length, 2);
  for (const select of selects) assert.ok(all.some(n => n.type === 'label' && n.props.htmlFor === select.props.id));
  assert.ok(all.some(n => n.props?.role === 'status' && n.props['aria-live'] === 'polite'));
  assert.ok(all.some(n => n.type === 'details'));
  assert.match(text(tree), /verified figures are not loaded yet/);
  assert.doesNotMatch(text(tree), /0 candidates|0 jobs|\$0|Hire now|Adopt/);
  for (const anchor of all.filter(n => n.type === 'a')) {
    assert.equal(anchor.props.rel, 'noopener noreferrer');
    assert.match(text(anchor), /opens a new tab/);
  }
});
test('role/location changes preserve selection and never transfer broader employment into skills', () => {
  const render = panelHarness();
  const select = (tree, suffix) => nodes(tree).find(n => n.type === 'select' && n.props.id.endsWith(suffix));
  select(render(), '-location').props.onChange({target: {value: records[1].id}});
  assert.match(text(render()), /Boston-Cambridge-Newton/);
  select(render(), '-role').props.onChange({target: {value: '15-2051.01'}});
  let tree = render();
  assert.match(text(tree), /Role skills reference available/);
  assert.match(text(tree), /US-wide role requirements/);
  assert.match(text(tree), /broader Data Scientists/);
  assert.equal(select(tree, '-location').props.value, records[1].id);
  assert.ok(nodes(tree).some(n => n.type === 'a' && n.props.href === exports.EXTERNAL_ROLE_SKILL_SOURCES[0].url));
  select(tree, '-role').props.onChange({target: {value: '15-1252'}});
  tree = render();
  assert.equal(select(tree, '-location').props.value, records[1].id);
  assert.match(text(tree), /Local employment and pay estimates pending/);
});

test('ONS numbers match independently extracted workbook cells and exact national scope', () => {
  const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/external-workforce-evidence/ons-ashe-2026-source-extract.json', import.meta.url), 'utf8'));
  const r = exports.UK_SOFTWARE_PAY_REFERENCE;
  const [pay, quality] = fixture.records;
  assert.equal(fixture.kind, 'retrieved-source-extract-not-synthetic');
  assert.equal(r.source.archiveSha256, fixture.archiveSha256);
  assert.equal(r.source.downloadUrl, fixture.downloadUrl);
  assert.equal(r.source.workbook, pay.workbook);
  assert.equal(r.source.qualityWorkbook, quality.workbook);
  assert.equal(r.source.sheet, pay.sheet);
  assert.equal(pay.cells.B86, "'2134");
  assert.equal(pay.cells.A86.trim(), r.occupation.title);
  assert.match(pay.cells.A1, /full-time employee jobs.*United Kingdom 2026/);
  assert.equal(pay.cells.D5, 'Median'); assert.equal(pay.cells.F5, 'Mean');
  assert.equal(r.estimates.median, Number(pay.cells.D86));
  assert.ok(Math.abs(r.estimates.mean - Number(pay.cells.F86)) < 0.000001);
  assert.equal(r.estimates.medianCvPercent, Number(quality.cells.D86));
  assert.equal(r.estimates.meanCvPercent, Number(quality.cells.F86));
  assert.equal(r.releasedAt, fixture.releaseDate);
  assert.equal(r.geography.code, 'GB'); assert.equal(r.currency, 'GBP');
  assert.equal(r.periodStart, '2025-04-06'); assert.equal(r.periodEnd, '2026-04-05');
  assert.equal(r.employmentJobs, null); assert.equal(r.availableCandidates, null); assert.equal(r.timeToFillDays, null);
  assert.match(pay.cells.A560, /indicative purposes only/);
  assert.ok(Object.isFrozen(r)); assert.ok(Object.isFrozen(r.estimates)); assert.ok(Object.isFrozen(r.source));
});

const onsInput = () => ({occupationCode:'2134', taxonomy:'UK SOC 2020', geographyCode:'GB',
  population:'full-time employee jobs; adult rates; same job more than one year', currency:'GBP', measure:'annual gross pay',
  periodStart:'2025-04-06', periodEnd:'2026-04-05', median:59862.5, mean:69120.6, medianCvPercent:2.4, meanCvPercent:2});
test('ONS ingestion rejects scope substitutions and invalid numeric coercion', () => {
  for (const [key,value] of Object.entries({occupationCode:'15-1252', taxonomy:'2018 SOC', geographyCode:'US', population:'all workers', currency:'USD', measure:'hourly pay', periodStart:'2026-04-06', periodEnd:'2027-04-05'})) {
    assert.throws(() => exports.validateOnsAnnualPaySlice({...onsInput(),[key]:value}), /scope/);
  }
  for (const value of ['59862.5', ' ', '59,862.50', 'NaN', -1, Infinity, NaN, {}, true]) {
    assert.throws(() => exports.parseOnsPayCell(value), /Invalid/);
  }
  assert.equal(exports.parseOnsPayCell(0), 0);
});
test('ONS missing, suppressed and unknown-quality estimates never become numbers', () => {
  for(const value of [null, undefined, '', '.', '..', ':', 'x']) {
    assert.equal(exports.parseOnsPayCell(value), null);
    assert.equal(exports.validateOnsAnnualPaySlice({...onsInput(),median:value}).median, null);
    assert.equal(exports.validateOnsAnnualPaySlice({...onsInput(),meanCvPercent:value}).mean, null);
  }
  assert.equal(exports.validateOnsAnnualPaySlice({...onsInput(),medianCvPercent:20.1}).median, null);
  assert.equal(exports.validateOnsAnnualPaySlice({...onsInput(),medianCvPercent:20}).median, 59862.5);
});
test('UK selection displays distinct pay and scope, and preserves US location on return', () => {
  const render = panelHarness();
  const select = (tree, suffix) => nodes(tree).find(n => n.type === 'select' && n.props.id.endsWith(suffix));
  select(render(), '-location').props.onChange({target:{value:records[1].id}});
  select(render(), '-role').props.onChange({target:{value:'uk-2134'}});
  const tree=render(), copy=text(tree);
  assert.equal(select(tree,'-location').props.value,'GB');
  assert.equal(select(tree,'-location').props.disabled,true);
  assert.match(copy,/£59,862.50/); assert.match(copy,/£69,120.60/);
  assert.match(copy,/tax year 6 April 2025–5 April 2026/); assert.match(copy,/provisional survey estimates/);
  assert.match(copy,/not a local hiring offer or total employer cost/);
  assert.match(copy,/Available candidates and time to fill are not measured/);
  assert.doesNotMatch(copy,/Boston|New York|\$59|362,000/);
  select(tree,'-role').props.onChange({target:{value:'15-1252'}});
  assert.equal(select(render(),'-location').props.value,records[1].id);
  assert.match(text(render()),/verified figures are not loaded yet/);
  assert.doesNotMatch(text(render()),/£59/);
});
