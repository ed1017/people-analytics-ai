import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {historicalSource} from './helpers/historical-source.mjs';
import {bundleInputKey} from '../lib/home-bundle-reconciliation.ts';
import {resolveAnalysisDemoCache} from '../lib/ml/analysis-demo-consumer.ts';
import {resolveAnalysisDisplay} from '../lib/analysis-demo-display.ts';
import {projectAnalysisDisplay} from './helpers/analysis-display-projection.mjs';
import {actionPlanAnalysisDemo, analysisDemoDraft} from './manual/action-plan-analysis-demo.mjs';
const read = async p => JSON.parse(await readFile(new URL(p, import.meta.url), 'utf8'));
const expected = await read('../lib/data/analysis-demo-display-v1.json');
const report = await read('../lib/data/aggregate-exit-demo-v1.json');

test('fixed release reproduces with its exact historical producer, dependencies and inputs', async () => {
  const full = await read('../docs/evidence/action-plan-analysis-demo-v1.json');
  const historical=historicalSource('5cc1eae473a6d6ba60f0bfb72b60b19cb6392854', `
    const {readFile}=await import('node:fs/promises');
    const {analysisDemoDraft,actionPlanAnalysisDemo}=await import('./tests/manual/action-plan-analysis-demo.mjs');
    const {projectAnalysisDisplay}=await import('./tests/helpers/analysis-display-projection.mjs');
    const draft=await analysisDemoDraft(),release=await actionPlanAnalysisDemo(draft);
    console.log(JSON.stringify({draft,release,display:projectAnalysisDisplay(release),storedDisplay:JSON.parse(await readFile('./lib/data/analysis-demo-display-v1.json','utf8'))}));
  `);
  assert.equal(bundleInputKey(historical.draft),full.inputKey);
  assert.deepEqual(full, historical.release);
  assert.deepEqual(historical.storedDisplay,historical.display);
  assert.deepEqual(historical.storedDisplay,projectAnalysisDisplay(historical.release));
});
test('display release reproduces from its own later exported producer and exact inputs',()=>{
  const exported=historicalSource('e3eae65cc641513041c379dcf2bed6845f323c4d', `
    const {analysisDemoDraft,actionPlanAnalysisDemo}=await import('./tests/manual/action-plan-analysis-demo.mjs');
    const {projectAnalysisDisplay}=await import('./tests/helpers/analysis-display-projection.mjs');
    const draft=await analysisDemoDraft(),release=await actionPlanAnalysisDemo(draft);
    console.log(JSON.stringify({draft,release,display:projectAnalysisDisplay(release)}));
  `);
  assert.equal(bundleInputKey(exported.draft),exported.release.inputKey);
  assert.deepEqual(expected,exported.display);
  assert.deepEqual(expected,projectAnalysisDisplay(exported.release));
  assert.equal(resolveAnalysisDisplay(expected, expected, report).status, 'ready');
  assert.equal(expected.hiring.cases.length, 9);
  assert.equal(expected.hiring.abstentions.length, 7);
  assert.equal(expected.hiring.cases.filter(c => c.selectedBrier > c.logisticBrier).length, 4);
  assert.equal(expected.satisfaction.baselineComparison.status, 'not-applicable');
  assert.deepEqual(expected.satisfaction.waves.map(w => [w.respondents, w.eligible]), [[80,100],[60,100],[90,120]]);
  assert.doesNotMatch(JSON.stringify(expected), /inputKey|successMeasure|forecastBaseline|employee_id|base_salary|"target"/);
});
test('current producer binds current inputs and implementation, preserving values but refusing the old cache', async () => {
  const full=await read('../docs/evidence/action-plan-analysis-demo-v1.json'),before=JSON.stringify(full);
  const draft=await analysisDemoDraft(),fresh=await actionPlanAnalysisDemo(draft);
  const files=['../lib/ml/analysis-demo-consumer.ts','../lib/ml/analysis-demo-types.ts','../lib/ml/analysis-review-packet.ts',
    './manual/action-plan-analysis-demo.mjs','../lib/ml/plan-forecast-context.mjs','../lib/home-bundle-reconciliation.ts'];
  const implementationIdentity=createHash('sha256').update(Buffer.concat(await Promise.all(files.map(file=>readFile(new URL(file,import.meta.url)))))).digest('hex');
  const current=structuredClone(full);delete current.identity;
  current.inputKey=bundleInputKey(draft);current.implementationIdentity=implementationIdentity;
  for(const domain of Object.values(current.domains))domain.planContext.inputKey=current.inputKey;
  // Every other field (including all domain payloads and source identities) must remain exact.
  assert.deepEqual(fresh,{...current,identity:createHash('sha256').update(JSON.stringify(current)).digest('hex')});
  assert.notEqual(fresh.inputKey,full.inputKey);assert.notEqual(fresh.implementationIdentity,full.implementationIdentity);
  assert.equal(resolveAnalysisDemoCache(fresh,fresh).status,'current');
  const stale=resolveAnalysisDemoCache(full,fresh);
  assert.equal(stale.status,'stale');assert.equal(stale.domains,null);
  assert.deepEqual(stale.reasonCodes,['plan-or-evidence-or-implementation-changed']);
  const projected=projectAnalysisDisplay(fresh);
  assert.deepEqual(projected,{...expected,analysisIdentity:fresh.identity});
  assert.equal(resolveAnalysisDisplay(projected,expected,report).status,'stale');
  assert.equal(JSON.stringify(full),before);
});
test('each evidence identity and comparison change invalidates the whole display', () => {
  for (const change of [
    a => {a.evidenceIdentities.hiring = '0'.repeat(64);},
    a => {a.evidenceIdentities.satisfaction = '0'.repeat(64);},
    a => {a.evidenceIdentities.source = '0'.repeat(64);},
    a => {a.analysisIdentity = '0'.repeat(64);},
    a => {a.hiring.cases[0].selectedBrier = 0;},
    a => {a.hiring.abstentions.pop();},
    a => {a.satisfaction.changes[0].respondentScoreChangePp = 99;},
    a => {a.operationallyQualified = true;},
    a => {delete a.satisfaction;},
  ]) {
    const altered = structuredClone(expected); change(altered);
    const view = resolveAnalysisDisplay(altered, expected, report);
    assert.equal(view.status, 'stale'); assert.equal(view.data, undefined);
  }
});
test('turnover report drift, missing, malformed and circular evidence have no numeric fallback', () => {
  for (const change of [r => {r.identities.datasetFingerprint = 'different';}, r => {r.identities.protocolFingerprint = 'different';}, r => {r.selectedMethod = 'different';}, r => {r.methodVersion = 'different';}]) {
    const changed = structuredClone(report); change(changed);
    assert.equal(resolveAnalysisDisplay(expected, expected, changed).status, 'stale');
  }
  const circular = {}; circular.self = circular;
  for (const value of [null, undefined, {}, [], 0, '', circular]) {
    const view = resolveAnalysisDisplay(value, expected, report);
    assert.notEqual(view.status, 'ready'); assert.equal(view.data, undefined);
  }
});
test('offline projection refuses a failed or promoted producer', async () => {
  const full = await read('../docs/evidence/action-plan-analysis-demo-v1.json');
  for (const change of [r => {r.status = 'stale';}, r => {r.operationallyQualified = true;}, r => {r.domains.hiring.status = 'unavailable';}, r => {r.domains.satisfaction.planContext.source.status = 'qualified';}]) {
    const altered = structuredClone(full); change(altered); assert.throws(() => projectAnalysisDisplay(altered));
  }
});
test('app display introduces no source access, model execution, adoption or persistence', async () => {
  const files = ['../components/analysis-demo-comparison.tsx', '../lib/analysis-demo-display.ts'];
  const source = (await Promise.all(files.map(p => readFile(new URL(p, import.meta.url), 'utf8')))).join('\n');
  assert.doesNotMatch(source, /fetch\(|supabase|node:|lib\/ml|tests\/fixtures|localStorage|sessionStorage|setItem|useEffect/);
});
