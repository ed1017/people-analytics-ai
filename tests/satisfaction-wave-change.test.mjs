import test from 'node:test';
import assert from 'node:assert/strict';
import {satisfactionWaveChange,satisfactionSensitivityAssumptions as defaults} from '../lib/ml/satisfaction-wave-change.mjs';
import {satisfactionWaveFixture,satisfactionFixtureDefinition} from './fixtures/satisfaction-wave-change.mjs';
import {satisfactionWaveChangeReport} from './manual/report-satisfaction-wave-change.mjs';
const run=(input=satisfactionWaveFixture(),assumptions=defaults)=>satisfactionWaveChange(input,satisfactionFixtureDefinition(),assumptions);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('three irregular waves remain three observations, with scores and response coverage separate',()=>{
 const input=satisfactionWaveFixture(),before=structuredClone(input),r=run(input);
 assert.equal(r.status,'descriptive-observed-wave-change');assert.equal(r.source.contractStatus,'passed');
 assert.equal(r.source.status,'unqualified');assert.equal(r.evidenceKind,'synthetic-mechanics-only');
 assert.equal(r.waves.length,3);assert.equal(r.changes.length,2);assert.deepEqual(r.changes.map(c=>c.elapsedDays),[365,242]);
 assert.deepEqual(r.waves.map(w=>[w.scorePct,w.respondents,w.eligible,w.participationPct]),[[75,80,100,80],[80,60,100,60],[78,90,120,75]]);
 assert.deepEqual(input,before);assert.ok(Object.isFrozen(r.changes));
});
test('symmetric decomposition reconciles exactly and is not a composition or causal estimate',()=>{
 const r=run(),[a,b]=r.changes;
 near(a.respondentScoreChangePp,5);near(a.responseRateChangePp,-20);
 near(a.decomposition.scoreTermPp,3.5);near(a.decomposition.responseRateTermPp,-15.5);
 near(a.respondentContributionChangePp,-12);near(b.decomposition.scoreTermPp,-1.35);near(b.decomposition.responseRateTermPp,11.85);
 for(const c of r.changes){near(c.decomposition.reconciledChangePp,c.respondentContributionChangePp);
  for(const s of c.fixedMeanScenarios)near(s.scoreTermPp+s.responseRateTermPp,s.eligibleMeanChangePp);}
 assert.equal(b.eligibleCountChange,20);assert.equal(r.compositionEffect,null);assert.equal(r.withinPersonChange,null);assert.equal(r.causalEffect,null);
});
test('worst-case bounds and fixed nonrespondent scenarios have distinct interpretations',()=>{
 const r=run();for(const [i,[low,high]] of [[60,80],[48,88],[58.5,83.5]].entries()){
  near(r.waves[i].nonresponseBounds.lowerPct,low);near(r.waves[i].nonresponseBounds.upperPct,high);}
 near(r.changes[0].nonresponseChangeBounds.lowerPp,-32);near(r.changes[0].nonresponseChangeBounds.upperPp,28);
 near(r.changes[1].nonresponseChangeBounds.lowerPp,-29.5);near(r.changes[1].nonresponseChangeBounds.upperPp,35.5);
 near(r.changes[0].fixedMeanScenarios.find(s=>s.nonrespondentMean===.5).eligibleMeanChangePp,-2);
 near(r.changes[1].fixedMeanScenarios.find(s=>s.nonrespondentMean===.5).eligibleMeanChangePp,3);
 assert.equal(r.forecast,null);assert.equal(r.confidenceInterval,null);assert.equal(r.operationallyQualified,false);
});
test('narrower assumed range narrows bounds explicitly without changing observed scores',()=>{
 const a=run(),b=run(satisfactionWaveFixture(),{...defaults,nonrespondentMeanRange:[0,.5],constantNonrespondentMeans:[0,.5]});
 assert.deepEqual(a.waves.map(w=>w.scorePct),b.waves.map(w=>w.scorePct));
 near(b.waves[0].nonresponseBounds.upperPct,70);near(b.waves[1].nonresponseBounds.upperPct,68);
 assert.deepEqual(b.assumptions.nonrespondentMeanRange,[0,.5]);
});
test('complete response collapses bounds to observed score; true zero survives and unknown does not',()=>{
 const input=satisfactionWaveFixture();input.records.forEach(row=>row.value.eligible=row.value.respondents);
 const r=run(input);r.waves.forEach(w=>{near(w.nonresponseBounds.lowerPct,w.scorePct);near(w.nonresponseBounds.upperPct,w.scorePct);assert.equal(w.nonrespondents,0);});
 r.changes.forEach(c=>{near(c.nonresponseChangeBounds.lowerPp,c.respondentScoreChangePp);near(c.nonresponseChangeBounds.upperPp,c.respondentScoreChangePp);});
 input.records[0].value.metric=input.records[0].value.shareSum=0;assert.equal(run(input).waves[0].scorePct,0);
 input.records[0].value.metric=null;assert.equal(run(input).status,'unavailable');
});
test('different instrument, item set, eligibility and population prevent comparison, not silent pooling',()=>{
 for(const field of ['instrumentVersion','itemSetVersion','eligibilityVersion','scoringVersion']){
  const input=satisfactionWaveFixture();input.records[1].value[field]='different';const r=run(input);
  assert.equal(r.status,'unavailable');assert.deepEqual(r.changes,[]);assert.deepEqual(r.waves,[]);}
 const input=satisfactionWaveFixture();input.records[1].populationVersion='other';assert.equal(run(input).status,'unavailable');
});
test('suppressed, small, reconstructible and missing-completion data release no sensitivity results',()=>{
 const changes=[i=>i.records[1].value.release.status='suppressed',i=>i.records[1].value.release.reconstructible=true,
  i=>Object.assign(i.records[1].value,{respondents:5,shareSum:4}),i=>i.manifest.completion=null];
 for(const change of changes){const input=satisfactionWaveFixture();change(input);const r=run(input);assert.equal(r.status,'unavailable');assert.deepEqual(r.waves,[]);assert.deepEqual(r.changes,[]);}
});
test('late revisions cannot change as-of comparisons and visible corrections retain wave count',()=>{
 const input=satisfactionWaveFixture(),original=run(input),correction=structuredClone(input.records[0]);
 Object.assign(correction,{revision:2,supersedes:1,observedAt:'2026-07-03T00:00:00.000Z'});
 Object.assign(correction.value,{metric:50,shareSum:40});input.records.push(correction);
 assert.deepEqual(run(input).changes,original.changes);input.cutoff='2026-07-04T00:00:00.000Z';
 assert.equal(run(input).waves.length,3);assert.equal(run(input).waves[0].revision,2);near(run(input).changes[0].respondentScoreChangePp,30);
});
test('unsupported assumptions and insufficient waves cannot produce a numeric comparison',()=>{
 for(const assumptions of [null,{...defaults,nonrespondentMeanRange:[.8,.2]},{...defaults,constantNonrespondentMeans:[2]},
  {...defaults,nonrespondentMeanRange:[0,NaN]},{...defaults,populationInterpretation:'matched-people'}]){
  assert.equal(run(satisfactionWaveFixture(),assumptions).status,'unavailable');}
 const input=satisfactionWaveFixture();input.records=input.records.slice(0,1);assert.equal(run(input).status,'unavailable');
 assert.equal(satisfactionWaveChange(satisfactionWaveFixture(),null).status,'unavailable');
 let invoked=false;const hostile={...defaults};Object.defineProperty(hostile,'nonrespondentMeanRange',{get(){invoked=true;throw Error('Unexpected accessor');},enumerable:true});
 assert.equal(run(satisfactionWaveFixture(),hostile).status,'unavailable');assert.equal(invoked,false);
 assert.equal(run(satisfactionWaveFixture(),{...defaults,constantNonrespondentMeans:Array(2)}).status,'unavailable');
});
test('report retains actual source blockers and labels all numerical results as constructed mechanics',async()=>{
 const r=await satisfactionWaveChangeReport();assert.equal(r.sourceEvidence.domainEvaluation.contractStatus,'blocked');
 assert.equal(r.example.evidenceKind,'synthetic-mechanics-only');assert.equal(r.example.sourceTruthVerified,false);
 assert.equal(r.blockedExamples.incompatibleInstrument.status,'unavailable');assert.equal(r.blockedExamples.suppressedWave.status,'unavailable');
});
