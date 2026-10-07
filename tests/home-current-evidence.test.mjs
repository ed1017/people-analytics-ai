import test from 'node:test';
import assert from 'node:assert/strict';
import {buildHomePack,readHomeSource} from '../lib/home-pack.mjs';
import {homeEvidenceSelection} from '../lib/home-conversation.ts';
import {homeCurrentEvidenceInstructions} from '../lib/home-current-evidence.ts';
import {homeExitReasonChartFromPack,homeExitReasonChartMatches,homeExitReasonFactLines} from '../lib/home-exit-reason-chart.ts';
import {exitReasonFixture,exitReasonQuestion,refreshedExitReasonQuestion,exitReasonAnswer,unavailableExitReasonAnswer} from './fixtures/home-exit-reasons.mjs';
const history=[{role:'user',content:exitReasonQuestion},{role:'assistant',content:unavailableExitReasonAnswer}];
const make=(result,message=refreshedExitReasonQuestion)=>buildHomePack({'survey-sentiment':result,attrition:{status:'loaded',data:{summary:{total_exits:999},reasons:[{separation_reason:'Administrative',exits:999}]}}},'Canada',homeEvidenceSelection(message,history));
test('timeout → refreshed mixed S2 rows → follow-up replaces missing evidence with primary reason counts in the same packet as the chart',async()=>{
 const timedOut=await readHomeSource('synthetic',undefined,1,()=>new Promise(()=>{})),prior=make(timedOut),current=make({status:'loaded',data:exitReasonFixture()});
 assert.equal(timedOut.status,'timeout');assert.equal(homeExitReasonChartFromPack(prior),null);assert.match(homeCurrentEvidenceInstructions(prior),/"id":"S2","status":"timeout"/);
 const s2=current.sources.find(source=>source.id==='S2');assert.equal(s2.coverage.rowsAvailable,15);assert.equal(s2.facts.rows.length,3);assert.ok(s2.facts.rows.every(row=>row.kind==='Reported primary reason'));
 assert.deepEqual(s2.facts.rows.map(row=>row.exits),[20,15,10]);
 const chart=homeExitReasonChartFromPack(current);assert.equal(chart.respondents,50);assert.equal(chart.date,'2026-09-30');assert.deepEqual(chart.rows.map(row=>row.count),[20,15,10]);assert.doesNotMatch(JSON.stringify(chart),/999|19.9|question/);
 const instructions=homeCurrentEvidenceInstructions(current);assert.match(instructions,/CURRENT S2 REASON COUNTS ARE AVAILABLE/);assert.match(instructions,/historical context, not current evidence/);assert.match(instructions,/Never substitute A1/);assert.match(instructions,/missing fieldwork dates/);assert.doesNotMatch(instructions,/999|19.9/);
 assert.ok(homeExitReasonChartMatches(exitReasonAnswer,chart));
});
test('chart eligibility requires the selected numeric facts, rejects unavailable and stale claims, and allows metadata limitations',()=>{
 const chart=homeExitReasonChartFromPack(make({status:'loaded',data:exitReasonFixture()}));
 for(const answer of [unavailableExitReasonAnswer,'Work-Life Balance and Manager were reported. [S2]',exitReasonAnswer.replace('20 (40%)','21 (42%)'),exitReasonAnswer.replace('15 (30%). [S2]','15 (30%). [A1]'),unavailableExitReasonAnswer+'\n'+exitReasonAnswer,exitReasonAnswer+'\n  - '+homeExitReasonFactLines(chart)[0]])assert.equal(homeExitReasonChartMatches(answer,chart),false,answer);
 assert.ok(homeExitReasonChartMatches('The exit-survey data was unavailable earlier.\n'+exitReasonAnswer,chart));
 assert.ok(homeExitReasonChartMatches('No causal evidence can be established from exit-survey reasons.\n'+exitReasonAnswer,chart));
 assert.ok(homeExitReasonChartMatches(exitReasonAnswer.replace('Work-Life Balance','**Work-Life Balance**'),chart));
});
test('current-turn source requests override previous topics and shorthand follows the survey context',()=>{
 const loaded={status:'loaded',data:exitReasonFixture()};
 for(const message of ['Show the chart now','What are the counts again?','Which reason was most common?','Why?',refreshedExitReasonQuestion])assert.ok(make(loaded,message).sources.find(s=>s.id==='S2').facts.rows.every(row=>row.kind==='Reported primary reason'));
 const administrative=make(loaded,'What do administrative separation records show?').sources.find(s=>s.id==='S2');assert.ok(administrative.facts.rows.every(row=>row.kind==='Exit experience question'));
 assert.equal(homeExitReasonChartFromPack({sources:[{id:'A1',status:'loaded',date:'2026-09-30',facts:{exit_respondents:50,rows:exitReasonFixture().exit_reasons}}]}),null);
 const selected=make(loaded);selected.sources.find(s=>s.id==='S2').facts.rows.pop();assert.deepEqual(homeExitReasonChartFromPack(selected).rows.map(row=>row.count),[20,15]);
 selected.sources.find(s=>s.id==='S2').facts.rows=[];assert.equal(homeExitReasonChartFromPack(selected),null);
});
test('whole-source or summary suppression survives packet selection and cannot become chart values',()=>{
 for(const level of ['source','summary']){
  const data=exitReasonFixture();(level==='source'?data:data.summary).suppressed=true;
  const packet=make({status:'loaded',data}),facts=packet.sources.find(s=>s.id==='S2').facts;
  assert.equal(facts.exit_respondents,null);assert.ok(facts.rows.every(row=>row.suppressed===true&&row.exits===null));assert.equal(homeExitReasonChartFromPack(packet),null);
 }
});
