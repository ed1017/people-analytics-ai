import test from 'node:test';
import assert from 'node:assert/strict';
import {rehearse,scoreReview,scoringRubric} from './manual/solution-conversation-evaluation.mjs';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
test('fixture rehearsal freezes 18 exact turns, reserves before simulated calls and refuses overwrites',async()=>{
 const directory=join(mkdtempSync(join(tmpdir(),'solution-eval-contract-')),'run'),summary=await rehearse(directory),report=JSON.parse(readFileSync(join(directory,'report.json'),'utf8'));
 assert.equal(summary.turns,18);assert.equal(summary.simulatedRequests,35);assert.equal(summary.simulatedReservedUsd,1.96);assert.equal(report.providerCalls,0);assert.equal(report.providerTokenCountCalls,0);assert.equal(report.networkAttempts,0);assert.equal(report.qualityScores,null);assert.equal(report.checks.length,91);assert.equal(summary.reportSha256,createHash('sha256').update(readFileSync(join(directory,'report.json'))).digest('hex'));
 await assert.rejects(()=>rehearse(directory),/EEXIST/);assert.equal(JSON.parse(readFileSync(join(directory,'report.json'),'utf8')).turns.length,18);
});
test('quality scoring requires actual-model mode and anchored rationales; fixtures cannot pass acceptance',()=>{
 assert.throws(()=>scoreReview({}, {mode:'fixtures'}),/cannot establish/);const report={mode:'real-model',turns:[{sha256:'captured-turn'}]},review={hardFailure:false,...Object.fromEntries(Object.keys(scoringRubric).map(key=>[key,{score:3,rationale:'Explicit human review reasoning for this test.',evidence:['captured-turn']}]))};assert.deepEqual(scoreReview(review,report),{score:15,possible:20,accepted:true});review.numericalHonesty.score=0;assert.equal(scoreReview(review,report).accepted,false);review.numericalHonesty.evidence=['unrecorded'];assert.throws(()=>scoreReview(review,report),/exact captured-turn/);
});
