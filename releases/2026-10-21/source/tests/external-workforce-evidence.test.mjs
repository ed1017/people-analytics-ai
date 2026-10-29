import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);

const exports = {};
const source = fs.readFileSync(new URL('../lib/external-workforce-evidence.ts', import.meta.url), 'utf8');
vm.runInNewContext(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText, {exports,require:name=>name==='./oews-reference.mjs'?require('../lib/oews-reference.mjs'):require(name)});
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
  assert.equal(records[0].status,'verified');
  assert.equal(records[0].employmentJobs,121000);
  assert.equal(records[0].annualMedianWageUsd,166830);
  assert.equal(records[0].geography.code,'35620');
  for (const r of records.filter(r=>r.status==='unavailable')) {
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
    const index = cursor++; if (!(index in state)) state[index] = typeof initial==='function'?initial():initial;
    return [state[index], value => { state[index] = value; }];
  }};
  const panel = {};
  const code = fs.readFileSync(new URL('../components/external-workforce-evidence-panel.tsx', import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(code, {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022}}).outputText, {
    exports: panel, require: name => name === 'react' ? react : name === '@/lib/external-workforce-evidence' ? exports : name === '@/components/market-reference' ? {MarketComparison:'market-comparison'} : name === '@/lib/oews-reference.mjs' ? require('../lib/oews-reference.mjs') : require(name),
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
test('panel consolidates reviewed US explorer and preserves selection across market switches', () => {
  const render=panelHarness();
  const select=tree=>nodes(tree).find(n=>n.type==='select');
  let tree=render();
  assert.equal(select(tree).props['aria-label'],'Market');
  const explorer=()=>nodes(render()).find(n=>n.type==='market-comparison');
  assert.equal(explorer().props.selection.area,'35620');
  explorer().props.onChange({soc:'29-1141',area:'36'});
  select(tree).props.onChange({target:{value:'ca-21231'}});
  assert.match(text(render()),/1,065/);
  select(render()).props.onChange({target:{value:'15-1252'}});
  assert.equal(explorer().props.selection.soc,'29-1141');
  assert.equal(explorer().props.selection.area,'36');
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
test('UK selection retains native pay and exact national scope', () => {
 const render=panelHarness();
 nodes(render()).find(n=>n.type==='select').props.onChange({target:{value:'uk-2134'}});
 const tree=render(),copy=text(tree);
 assert.match(copy,/£59,862.50/);assert.match(copy,/£69,120.60/);
 assert.match(copy,/6 April 2025-5 April 2026/);assert.match(copy,/provisional survey estimates/);
 assert.match(copy,/Regional workforce size and vacancy trends are unavailable/);
 assert.match(text(nodes(tree).find(n=>n.type==='details')),/not a hiring offer or total employer cost/);
 assert.doesNotMatch(copy,/Boston|New York|\$59|362,000/);
});

const torontoFixture = JSON.parse(fs.readFileSync(new URL('./fixtures/external-workforce-evidence/statcan-toronto-source-extract.json', import.meta.url), 'utf8'));
test('Toronto reference matches raw published CSV vectors, units, quality and geography', () => {
  const r=exports.TORONTO_SOFTWARE_VACANCY_REFERENCE;
  assert.equal(r.source.archiveSha256,torontoFixture.archiveSha256);
  assert.equal(r.source.table,torontoFixture.table);
  assert.equal(r.source.downloadUrl,torontoFixture.downloadUrl);
  assert.equal(r.releasedAt,torontoFixture.releaseDate);
  for(const row of torontoFixture.rows) {
    const parsed=exports.parseTorontoVacancyRow(row);
    const expected=row.Statistics==='Job vacancies'?r.vacancies:r.averageOfferedHourlyWage;
    assert.equal(parsed.value,expected.value); assert.equal(parsed.quality,expected.quality); assert.equal(parsed.vector,expected.vector);
  }
  assert.equal(r.geography.code,'3530'); assert.equal(r.geography.type,'economic region');
  assert.equal(r.occupation.code,'21231'); assert.equal(r.seasonallyAdjusted,false);
  assert.equal(r.vacancies.value,1065); assert.equal(r.vacancies.quality,'C');
  assert.equal(r.averageOfferedHourlyWage.value,60.95); assert.equal(r.averageOfferedHourlyWage.quality,'A');
  assert.equal(r.availableCandidates,null); assert.equal(r.timeToFillDays,null); assert.equal(r.employmentJobs,null);
  assert.ok(Object.isFrozen(r)); assert.ok(Object.isFrozen(r.vacancies));
});
test('Toronto importer rejects unit, vector, role, geography and vintage substitutions', () => {
  const row=torontoFixture.rows[0];
  for(const [key,value] of Object.entries({REF_DATE:'2026-07',GEO:'Ontario',DGUID:'2021A000235','National Occupational Classification':'Software developers and programmers [21232]',Statistics:'Payroll employees',UOM:'Dollars',UOM_ID:'81',SCALAR_FACTOR:'thousands',SCALAR_ID:'3',VECTOR:'v1569866985',COORDINATE:'50.399.1',DECIMALS:'2',TERMINATED:'t',SYMBOL:'r',STATUS:'unknown'})) {
    assert.throws(()=>exports.parseTorontoVacancyRow({...row,[key]:value}));
  }
  for(const value of [' ','-1','NaN','Infinity','1,065','1e3','1065.5']) assert.throws(()=>exports.parseTorontoVacancyRow({...row,VALUE:value}));
});
test('Toronto suppression and missing values stay unavailable, retaining quality', () => {
  const row=torontoFixture.rows[0];
  for(const status of ['F','x','..']) {
    const parsed=exports.parseTorontoVacancyRow({...row,VALUE:'1065',STATUS:status});
    assert.equal(parsed.value,null); assert.equal(parsed.quality,status);
  }
  assert.equal(exports.parseTorontoVacancyRow({...row,VALUE:''}).value,null);
  assert.equal(exports.parseTorontoVacancyRow({...row,VALUE:'0'}).value,0);
  assert.equal(exports.parseTorontoVacancyRow({...row,STATUS:'E'}).qualityLabel,'Use with caution');
});
test('Toronto display preserves quality and marks trend and workforce evidence gaps', () => {
 const render=panelHarness();
 nodes(render()).find(n=>n.type==='select').props.onChange({target:{value:'ca-21231'}});
 const tree=render(),copy=text(tree);
 assert.match(copy,/1,065/);assert.match(copy,/CAD 60.95\/hour/);
 assert.match(copy,/Quality\s+C\s*:\s*Good/);assert.match(copy,/Quality\s+A\s*:\s*Excellent/);
 assert.match(copy,/Vacancy trend unavailable: one reviewed quarter/);
 assert.match(copy,/Toronto economic region · Q2 2026 · not seasonally adjusted/);
 assert.match(text(nodes(tree).find(n=>n.type==='details')),/not Toronto city or its census metropolitan area/);
 assert.doesNotMatch(copy,/Boston|£59|US national/);
});
test('existing Labor market route mounts real local reference ahead of unchanged market controls', () => {
  const output={},Reference=()=>null,Findings=()=>null;
  const code=fs.readFileSync(new URL('../components/pages/intelligence-page.tsx',import.meta.url),'utf8');
  vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports:output,require:name=>name==='@/components/external-workforce-evidence-panel'?{ExternalWorkforceEvidencePanel:Reference}:name==='@/components/key-findings'?{KeyFindings:Findings}:require(name)});
  const props={page:'labor-market',bls:null,blsLoading:false,blsError:null,market:'EXISTING MARKET CONTROLS',catalog:'CATALOG',occupational:'OCCUPATIONAL'};
  const tree=output.IntelligencePage(props),all=nodes(tree);
  const panel=all.find(n=>n.type===Reference);
  assert.ok(panel); assert.equal(panel.props.usMarket,'EXISTING MARKET CONTROLS'); assert.equal(all.filter(n=>n.type===Reference).length,1);
  assert.equal(nodes(output.IntelligencePage({...props,page:'training-coaching'})).some(n=>n.type===Reference),false);
  assert.equal(nodes(output.IntelligencePage({...props,page:'occupational-references'})).some(n=>n.type===Reference),false);
});
