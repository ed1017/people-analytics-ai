import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {progressFixture,day} from './fixtures/goal-progress-summary.mjs';
import {assessGoalProgress,readGoalProgressLedger,recordGoalProgressAssessment,appendGoalProgressEvent} from '../lib/goal-progress.ts';
import {readProgressSnapshot} from '../lib/goal-progress-summary.ts';

for(const latest of [90,100,110])test(`maintain 100 with ${latest} people uses distance on either side, not a ceiling`,()=>{
 const ledger=progressFixture('maintain','maintain');
 ledger.events.find(e=>e.kind==='measurement').data.target.value=100;
 const observation=ledger.events.find(e=>e.id==='latest').data;observation.value=latest;
 const before=structuredClone(ledger),source={...observation.source,scope:observation.scope,available:true};
 const a=assessGoalProgress(ledger,day,source);
 assert.equal(a.version,3);assert.equal(a.gap,Math.abs(latest-100));assert.equal(a.intendedChangePercent,null);
 assert.equal(Math.sign(a.requiredPace.value),Math.sign(100-latest));assert.equal(a.reference.value,100);
 assert.equal(a.currentStatus,latest===100?'meets_point_target':'unavailable');
 assert.equal(a.completion,'not_assessed');assert.equal(a.forecast.status,'unavailable');
 assert.equal(readProgressSnapshot(ledger,'maintain',day).context.assessment.gap,Math.abs(latest-100));
 assert.deepEqual(ledger,before);
 const saved=recordGoalProgressAssessment(ledger,'new-assessment',day+'T13:00:00.000Z',source);
 assert.deepEqual(readGoalProgressLedger(saved,'maintain'),saved);
});

test('ceiling still treats below-target as within the limit',()=>{
 const ledger=progressFixture('ceiling','ceiling');ledger.events.find(e=>e.kind==='measurement').data.target.value=100;
 const observation=ledger.events.find(e=>e.id==='latest').data;
 const a=assessGoalProgress(ledger,day,{...observation.source,scope:observation.scope,available:true});
 assert.equal(a.gap,0);assert.equal(a.currentStatus,'within_limit');assert.equal(a.requiredPace.value,0);
});

test('frozen v2 maintain history replays unchanged while current assessment uses corrected v3',()=>{
 const ledger=JSON.parse(fs.readFileSync(new URL('./fixtures/goal-progress-maintain-v2.json',import.meta.url),'utf8'));
 const old=structuredClone(ledger),last=ledger.events.at(-1);
 assert.equal(last.data.result.version,2);assert.equal(last.data.result.gap,0);
 assert.deepEqual(readGoalProgressLedger(ledger,'legacy-maintain'),old);
 const current=readProgressSnapshot(ledger,'legacy-maintain',day);
 assert.equal(current.context.assessment.version,3);assert.equal(current.context.assessment.gap,10);
 assert.equal(current.context.history.at(-1).assessmentVersion,2);assert.equal(current.context.history.at(-1).gap,0);
 const fresh={...ledger,events:ledger.events.slice(0,-1)};
 assert.throws(()=>appendGoalProgressEvent(fresh,last),/Assessment must equal/,'new records cannot use replay-only calculations');
 const tampered=structuredClone(ledger);tampered.events.at(-1).data.result.gap=10;
 assert.throws(()=>readGoalProgressLedger(tampered,'legacy-maintain'),/Assessment must equal/);
 assert.deepEqual(ledger,old);
});
