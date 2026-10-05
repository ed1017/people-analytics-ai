import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {actionPlanAnalysisDemo,analysisDemoDraft,readCachedActionPlanAnalysisDemo,satisfactionDemoForConsumer} from './manual/action-plan-analysis-demo.mjs';
import {composeActionPlanAnalysisDemo,projectSatisfactionDemo,unavailableSatisfactionDemo,unavailableAnalysisDemo} from '../lib/ml/analysis-demo-consumer.ts';
import {exitForecastForConsumer} from './manual/forecast-consumer.mjs';
import {hiringExperimentalForConsumer} from './manual/hiring-experimental-consumer.mjs';
import {satisfactionWaveChangeReport} from './manual/report-satisfaction-wave-change.mjs';
const [source,hiring,report]=await Promise.all([exitForecastForConsumer(),hiringExperimentalForConsumer(),satisfactionWaveChangeReport()]);
const artifact=JSON.parse(await readFile(new URL('../docs/evidence/satisfaction-wave-change-v1.json',import.meta.url),'utf8'));
const satisfaction=projectSatisfactionDemo(artifact,report),implementation='b'.repeat(64);
const compose=d=>composeActionPlanAnalysisDemo(d,source,hiring,satisfaction,implementation);
test('public producer exposes three semantically distinct domains with qualified demo scope and blocked source status',async()=>{
 const d=await analysisDemoDraft(),before=structuredClone(d),r=await actionPlanAnalysisDemo(d);
 assert.equal(r.status,'current');assert.deepEqual(Object.keys(r.domains),['turnover','hiring','satisfaction']);
 assert.equal(r.domains.turnover.kind,'conditional-count-reference');assert.equal(r.domains.turnover.payload.total,201);
 assert.ok(r.domains.turnover.payload.baselineComparisons.length>=2);assert.ok(r.domains.turnover.payload.assumptions.length>0);
 assert.equal(r.domains.hiring.kind,'experimental-hiring-benchmark');assert.equal(r.domains.hiring.payload.cases.length,9);assert.equal(r.domains.hiring.payload.abstentions.length,7);
 const sat=r.domains.satisfaction;assert.equal(sat.kind,'descriptive-satisfaction-wave-change');
 assert.equal(sat.payload.analysis.waves.length,3);assert.equal(sat.payload.analysis.changes.length,2);
 assert.deepEqual(sat.payload.analysis.changes.map(x=>x.elapsedDays),[365,242]);assert.equal(sat.payload.baselineComparison.status,'not-applicable');
 for(const domain of Object.values(r.domains)){assert.equal(domain.planContext.source.status,'unqualified');assert.equal(domain.forecastBaseline,null);assert.equal(domain.causalEffect,null);assert.equal(domain.interval,null);}
 assert.deepEqual(d,before);assert.deepEqual(r.planAssumptions.successMeasure,d.inputs.successMeasure);assert.ok(Object.isFrozen(r.domains.satisfaction.payload));
});
test('current legacy draft without optional fields is supported without inventing plan scope',async()=>{
 const d=await analysisDemoDraft();delete d.inputs.successMeasure;
 const r=compose(d);assert.equal(r.status,'current');assert.equal(r.domains.turnover.status,'unavailable');
 assert.equal(r.domains.turnover.payload,null);assert.equal(r.planAssumptions.whatIf,null);assert.equal(r.planAssumptions.successMeasure,null);
 assert.equal(r.domains.hiring.status,'available');assert.equal(r.domains.satisfaction.status,'available');
});
test('turnover metric, population, BU, job and horizon mismatches never acquire a numeric count reference',async()=>{
 const edits=[d=>d.inputs.successMeasure.name='Voluntary turnover (YTD %)',d=>d.inputs.scope.population.value='Other population',
  d=>d.inputs.scope.businessUnit={value:'BU',kind:'user-entered',basis:'User assumption'},d=>d.inputs.scope.jobProfile={value:'Role',kind:'user-entered',basis:'User assumption'},
  d=>d.inputs.scope.months.value=12,d=>d.inputs.scope.startMonth.value='2026-11'];
 for(const edit of edits){const d=await analysisDemoDraft();edit(d);assert.equal(compose(d).domains.turnover.payload,null);}
});
test('satisfaction current artifact check preserves assumptions and distinguishes bounds from intervals',async()=>{
 const s=await satisfactionDemoForConsumer();assert.equal(s.status,'available');assert.equal(s.payload.analysis.confidenceInterval,null);
 assert.equal(s.payload.analysis.forecast,null);assert.equal(s.payload.analysis.operationallyQualified,false);
 assert.equal(s.payload.analysis.waves[0].nonresponseBounds.kind,'assumption-dependent-identification-bounds');
 assert.deepEqual(s.payload.analysis.assumptions.nonrespondentMeanRange,[0,1]);
 assert.deepEqual(s.payload.restrictedAssumptionAnalysis.assumptions.nonrespondentMeanRange,[0,.5]);
 assert.equal(s.payload.blockedExamples.incompatibleInstrument.status,'unavailable');
 assert.equal(s.payload.blockedExamples.suppressedWave.status,'unavailable');
});
test('missing, malformed or stale satisfaction artifacts fail only that domain closed',async()=>{
 const edited=structuredClone(artifact);edited.example.waves[0].scorePct=1;
 for(const cached of [null,'not-json',{},edited]){
  const s=projectSatisfactionDemo(cached,report),r=composeActionPlanAnalysisDemo(await analysisDemoDraft(),source,hiring,s,implementation);
  assert.equal(r.domains.satisfaction.status,'unavailable');assert.equal(r.domains.satisfaction.payload,null);
  assert.equal(r.domains.turnover.status,'available');assert.equal(r.domains.hiring.status,'available');
 }
 for(const reason of ['satisfaction-artifact-missing-or-invalid','satisfaction-regeneration-or-projection-failed']){
  const r=composeActionPlanAnalysisDemo(await analysisDemoDraft(),source,hiring,unavailableSatisfactionDemo(reason),implementation);
  assert.deepEqual(r.domains.satisfaction.reasonCodes,[reason]);assert.equal(r.domains.satisfaction.payload,null);
 }
});
test('unsupported fresh qualification and no operational fallback',async()=>{
 const bad=structuredClone(report);bad.example.operationallyQualified=true;
 assert.equal(projectSatisfactionDemo(bad,bad).status,'unavailable');
 const unavailable=unavailableAnalysisDemo(await analysisDemoDraft(),implementation,'analysis-producer-failed');
 assert.equal(unavailable.status,'unavailable');assert.equal(unavailable.domains,null);assert.equal(unavailable.forecastBaseline,null);
 await assert.rejects(()=>actionPlanAnalysisDemo({}),/Valid exact/);
});
test('changing assumed targets changes binding only, never descriptive analysis or model output',async()=>{
 const d=await analysisDemoDraft(),a=compose(d);d.inputs.successMeasure.target.value='0';const b=compose(d);
 assert.notEqual(a.inputKey,b.inputKey);assert.notEqual(a.identity,b.identity);
 for(const name of ['turnover','hiring','satisfaction'])assert.deepEqual(a.domains[name].payload,b.domains[name].payload);
 assert.equal(b.planAssumptions.successMeasure.target.kind,'illustrative');assert.equal(b.causalEffect,null);
});
test('whole-result stale handling clears every numeric payload for edited model, bounds, qualification or plan',async()=>{
 const d=await analysisDemoDraft(),fresh=await actionPlanAnalysisDemo(d);
 assert.deepEqual(await readCachedActionPlanAnalysisDemo(structuredClone(fresh),d),fresh);
 for(const change of [r=>r.operationallyQualified=true,r=>r.domains.hiring.payload.cases[0].model.identity='old',
  r=>r.domains.satisfaction.payload.analysis.waves[0].nonresponseBounds.lowerPct=99,r=>r.interval=[0,1]]){
  const cached=structuredClone(fresh);change(cached);const stale=await readCachedActionPlanAnalysisDemo(cached,d);
  assert.equal(stale.status,'stale');assert.equal(stale.domains,null);assert.equal(stale.forecastBaseline,null);
 }
 d.revision++;assert.equal((await readCachedActionPlanAnalysisDemo(fresh,d)).domains,null);
});
