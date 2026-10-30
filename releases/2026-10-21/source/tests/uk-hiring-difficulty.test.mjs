import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import * as model from '../lib/uk-hiring-difficulty.ts';
const require=createRequire(import.meta.url);
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/uk-ess-2024-professional-occupations.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(fixture[0]);

test('five exact official CSV rows retain published vacancy shares and weighted counts',()=>{
  assert.equal(fixture.length,5);
  assert.deepEqual(fixture.map(model.readHiringDifficulty),model.UK_HIRING_DIFFICULTY);
  assert.deepEqual(model.UK_HIRING_DIFFICULTY.map(v=>v.sample),[1416,604,356,253,203]);
  assert.equal(model.UK_HIRING_DIFFICULTY[0].hardToFillPercent,36.8264386739777);
  assert.notEqual(model.UK_HIRING_DIFFICULTY[0].hardToFillPercent,64800/176000*100);
  assert.equal(model.UK_HIRING_SOURCE.downloadSha256,'557dbafc39bdcfd96ec6637d8dcaef42c6babbb467359efe7cbed67d1ca65156');
});
test('selection is exact national code, never a software role or city match',()=>{
  for(const row of model.UK_HIRING_DIFFICULTY) assert.equal(model.findHiringDifficulty(row.code),row);
  for(const code of ['2134','uk-2134','London','E09000001','z','','US']) assert.equal(model.findHiringDifficulty(code),null);
  assert.ok(Object.isFrozen(model.UK_HIRING_DIFFICULTY));
  assert.ok(model.UK_HIRING_DIFFICULTY.every(Object.isFrozen));
});
test('wrong occupation, sector, year, geography or extra fields reject the source row',()=>{
  for(const patch of [{time_period:'2022'},{sector:'Information & Communication'},{soc2020_4_labelled:'2134 - Programmers and software development professionals'},{soc2020_1_labelled:'Total'},{country_code:'z'},{country_name:'London'},{geographic_level:'Regional'},{time_identifier:'Financial year'},{availableCandidates:100}]) assert.equal(model.readHiringDifficulty({...copy(),...patch}),null);
});
test('source c/u markers stay unavailable and valid zero stays zero',()=>{
  for(const marker of ['c','u']) {
    const result=model.readHiringDifficulty({...copy(),htfv_den:marker,ssv_den:marker,vac_sum:marker,htfv_sum:marker,ssv_sum:marker});
    assert.equal(result.hardToFillPercent,null);assert.equal(result.skillShortagePercent,null);assert.equal(result.vacancies,null);
    assert.equal(model.hiringPercent(result.hardToFillPercent),'Unavailable');
  }
  const zero=model.readHiringDifficulty({...copy(),htfv_den:'0',ssv_den:'0',htfv_sum:'0',ssv_sum:'0'});
  assert.equal(zero.hardToFillPercent,0);assert.equal(model.hiringPercent(zero.hardToFillPercent),'0.0%');
});
test('invalid numbers and impossible percentage subsets do not become displayed facts',()=>{
  for(const patch of [{htfv_den:'101'},{htfv_den:'-1'},{htfv_den:'NaN'},{htfv_den:''},{htfv_den:null},{htfv_den:36},{ssv_den:'40'},{vac_sum:'10.5'},{sample_occupations_site_has_vacancy:'u'},{sample_occupations_site_has_vacancy:'0'},{htfv_sum:'176100'},{ssv_sum:'64900'},{htfv_sum:'u',ssv_sum:'176100'},{vac_sum:'0',htfv_sum:'0',ssv_sum:'0'}]) assert.equal(model.readHiringDifficulty({...copy(),...patch}),null);
});

const ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const component=fs.readFileSync(new URL('../components/uk-hiring-difficulty.tsx',import.meta.url),'utf8');
const compiled=ts.transpileModule(component,{fileName:'uk-hiring-difficulty.tsx',compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},reportDiagnostics:true});
assert.equal(compiled.diagnostics.length,0);
function render(overrides={}) {
  const module={exports:{}};
  vm.runInNewContext(compiled.outputText,{module,exports:module.exports,require:name=>name==='@/lib/uk-hiring-difficulty'?{...model,...overrides}:require(name)});
  return renderToStaticMarkup(React.createElement(module.exports.UkHiringDifficulty));
}
test('compact rendered reference labels the broad occupation, year, percentages and accessible nation control',()=>{
  const html=render();
  assert.match(html,/Hiring difficulty nation/);assert.match(html,/Professional occupations/);assert.match(html,/2024/);assert.match(html,/36\.8%/);assert.match(html,/29\.4%/);
  assert.equal((html.match(/<option /g)||[]).length,5);assert.match(html,/0–100%/);assert.match(html,/width:36\.8264386739777%/);
  assert.match(html,/1,416/);assert.match(html,/Occupation\/site sample/);assert.match(html,/both percentages|Both percentages/);
  assert.match(html,/<details/);assert.match(html,/Open Government Licence/);assert.doesNotMatch(html,/Use in plan|availableCandidates|timeToFillDays/);
});
test('unavailable rendered rate is an honest state rather than a zero bar or broken sentence',()=>{
  const html=render({findHiringDifficulty:()=>({...model.UK_HIRING_DIFFICULTY[0],hardToFillPercent:null,skillShortagePercent:null})});
  assert.match(html,/Hiring difficulty is unavailable for United Kingdom/);assert.doesNotMatch(html,/Unavailable.*of professional vacancies|width:0%|36\.8%/);
});
test('unknown selection has an actionable neutral state',()=>{
  const html=render({findHiringDifficulty:()=>null});assert.match(html,/Choose a supported nation/);assert.doesNotMatch(html,/36\.8%/);
});
test('existing pay/carry state is unchanged and the broad hiring reference is separate',()=>{
  const panel=fs.readFileSync(new URL('../components/external-workforce-evidence-panel.tsx',import.meta.url),'utf8');
  assert.match(panel,/ukOnly && <UkHiringDifficulty/);assert.match(panel,/value="uk-2134"/);
  assert.match(panel,/referenceId:ukOnly\?ukPay\.id:toronto\.id/);assert.match(panel,/United Kingdom.*pay and hiring difficulty/);
  assert.ok(panel.indexOf('<UkHiringDifficulty')>panel.indexOf('Use in plan'));
});
