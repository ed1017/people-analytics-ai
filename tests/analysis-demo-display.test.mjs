import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolveAnalysisDisplay} from '../lib/analysis-demo-display.ts';
import {projectAnalysisDisplay} from './helpers/analysis-display-projection.mjs';
import {actionPlanAnalysisDemo, analysisDemoDraft} from './manual/action-plan-analysis-demo.mjs';
const read = async p => JSON.parse(await readFile(new URL(p, import.meta.url), 'utf8'));
const expected = await read('../lib/data/analysis-demo-display-v1.json');
const report = await read('../lib/data/aggregate-exit-demo-v1.json');

test('app projection consumes the reproduced public analysis result without changing its outputs', async () => {
  const full = await read('../docs/evidence/action-plan-analysis-demo-v1.json');
  const fresh = await actionPlanAnalysisDemo(await analysisDemoDraft());
  assert.deepEqual(full, fresh);
  assert.deepEqual(expected, projectAnalysisDisplay(fresh));
  assert.equal(resolveAnalysisDisplay(expected, expected, report).status, 'ready');
  assert.equal(expected.hiring.cases.length, 9);
  assert.equal(expected.hiring.abstentions.length, 7);
  assert.equal(expected.hiring.cases.filter(c => c.selectedBrier > c.logisticBrier).length, 4);
  assert.equal(expected.satisfaction.baselineComparison.status, 'not-applicable');
  assert.deepEqual(expected.satisfaction.waves.map(w => [w.respondents, w.eligible]), [[80,100],[60,100],[90,120]]);
  assert.doesNotMatch(JSON.stringify(expected), /inputKey|successMeasure|forecastBaseline|employee_id|base_salary|"target"/);
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
