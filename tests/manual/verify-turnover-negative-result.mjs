// Read-only arithmetic/clock audit of the frozen result; no fitting, selection or new seeds.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {generateHiring} from '../../lib/ml/synthetic-workforce/hiring.mjs';
import {generateTurnover} from '../../lib/ml/synthetic-workforce/turnover.mjs';
import {partitionTurnoverGroups} from '../../lib/ml/synthetic-workforce/groups.mjs';
const root=new URL('../../',import.meta.url),dir=new URL('docs/evidence/synthetic-turnover-adaptation-v1/',root);
const raw=await readFile(new URL('report.json',dir)),report=JSON.parse(raw),rows=JSON.parse(gunzipSync(await readFile(new URL('validation.json.gz',dir)))).rows;
assert.equal(createHash('sha256').update(raw).digest('hex'),'18876092e44d00c849536351d3c37e51b1729ff52a279b44af450832e58883d6','Expected the tested negative-result report');
for(const [path,hash]of Object.entries(report.implementationFiles))assert.equal(createHash('sha256').update(await readFile(new URL(path,root))).digest('hex'),hash,'Changed experiment implementation: '+path);
assert.equal(report.protocol.assessmentOrigin,'2026-06-30T23:59:59.999Z');assert.equal(report.protocol.scoringCutoff,'2027-07-01T00:00:00.000Z');assert.equal(report.publishedInterval,null);
const close=(a,b)=>assert(a===null||b===null?a===b:Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(b)));
const avg=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
const monthIndex=s=>Number(s.slice(0,4))*12+Number(s.slice(5,7))-1;
// Independent selection implementation; deliberately does not call the forecast/replay evaluators.
function visible(releases,cutoff,groupId){
 const latest=new Map();
 for(const r of releases)if(r.value.groupId===groupId&&r.effectiveAt<=cutoff&&r.simulatedAvailableAt<=cutoff){
  const old=latest.get(r.value.month);if(!old||old.revision<r.revision)latest.set(r.value.month,r);
 }
 return [...latest.values()].sort((a,b)=>a.value.month.localeCompare(b.value.month));
}
const actual=(records,targets)=>{const picked=targets.map(month=>records.find(r=>r.value.month===month));return picked.every(r=>r?.status==='complete')?picked.reduce((n,r)=>n+r.value.voluntaryExits,0):null;};
let auditedCases=0,auditedFolds=0;const ends=new Map();
for(const source of report.dataset.cases){
 const {family,seed}=source,cfg=report.generatorConfig;
 const hiring=generateHiring(cfg,{family,seed}),company=generateTurnover(cfg,{family,seed,startEvents:hiring.startEvents}),groups=partitionTurnoverGroups(company,{family,seed});
 for(const item of rows.filter(r=>r.family===family&&r.seed===seed)){
  assert.deepEqual(item.targets,['2026-07','2026-08','2026-09']);
  const prefix=visible(groups.releases,report.protocol.assessmentOrigin,item.groupId),labels=visible(groups.releases,report.protocol.scoringCutoff,item.groupId);
  close(item.actual,actual(labels,item.targets));assert.equal(item.trainingEnd,prefix.at(-1).value.month);
  const expected=prefix.every(r=>r.status==='complete')?prefix.slice(-3).reduce((n,r)=>n+r.value.voluntaryExits,0):null;
  for(const method of item.methods)close(method.expectedTotal,expected);
  if(expected!==null){const leads=item.targets.map(t=>monthIndex(t)-monthIndex(item.trainingEnd));assert.deepEqual(leads,family==='reporting-stress'?[3,4,5]:[2,3,4]);ends.set(family,item.trainingEnd);}
  for(const fold of item.calibration.folds){
   assert(fold.targets.every(t=>t<='2026-03'));
   const originCutoff=new Date(Date.UTC(Number(fold.origin.slice(0,4)),Number(fold.origin.slice(5,7)),1)-1).toISOString();
   const train=visible(groups.releases,originCutoff,item.groupId);
   const prediction=train.every(r=>r.status==='complete')?train.slice(-3).reduce((n,r)=>n+r.value.voluntaryExits,0):null;
   close(fold.predictedTotal,prediction);close(fold.actualTotal,actual(prefix,fold.targets));auditedFolds++;
  }
  assert.equal(item.reservedScore,null);assert.equal(item.publishedInterval,null);auditedCases++;
 }
}
let summaryChecks=0;
for(const group of report.summaries)for(const metric of group.methods){
 const selected=rows.filter(r=>r.family===group.family&&r.groupId===group.groupId).map(r=>({actual:r.actual,m:r.methods.find(m=>m.method===metric.method)}));
 const issued=selected.filter(r=>r.m.interval!==null),scored=issued.filter(r=>r.actual!==null),hits=scored.filter(r=>r.m.interval.lower<=r.actual&&r.actual<=r.m.interval.upper).length;
 assert.equal(metric.intended,100);assert.equal(metric.issued,issued.length);assert.equal(metric.issuedAndScored,scored.length);assert.equal(metric.covered,hits);
 close(metric.conditionalCoverage,scored.length?hits/scored.length:null);close(metric.issuanceAndCoverageRate,hits/100);
 const widths=scored.map(r=>r.m.interval.upper-r.m.interval.lower);close(metric.meanWidth,avg(widths));
 close(metric.meanIntervalScore,avg(scored.map((r,i)=>widths[i]+20*Math.max(r.m.interval.lower-r.actual,0,r.actual-r.m.interval.upper))));
 assert.equal(metric.missesAbove,scored.filter(r=>r.actual>r.m.interval.upper).length);assert.equal(metric.missesBelow,scored.filter(r=>r.actual<r.m.interval.lower).length);
 assert.equal(metric.detectorAbstentions,selected.filter(r=>r.m.status==='abstained').length);
 for(const r of selected){assert.equal(r.m.publishedInterval,null);if(r.m.interval){assert.equal(r.m.interval.target,'three-month-total-only');assert.equal(r.m.interval.coverageGuarantee,false);assert(Number.isInteger(r.m.interval.lower)&&r.m.interval.lower>=0&&Number.isInteger(r.m.interval.upper));}}
 summaryChecks++;
}
console.log(JSON.stringify({status:'verified',experimentCommit:'88c45787f0eec363ce7edbbe418e4bd004542acd',reportSha256:createHash('sha256').update(raw).digest('hex'),
 histories:report.dataset.cases.length,groupCases:auditedCases,calibrationFolds:auditedFolds,methodSummaries:summaryChecks,
 target:'July–September 2026 group voluntary-exit count total',origin:report.protocol.assessmentOrigin,ordinaryLastReleasedMonth:'2026-05',stressLastReleasedMonth:ends.get('reporting-stress'),
 originHorizons:[1,2,3],ordinaryLeadsFromReleasedMonth:[2,3,4],stressLeadsFromReleasedMonth:[3,4,5],unit:'exit-event-counts',
 calibrationLabelsAvailableBy:report.protocol.assessmentOrigin,retrospectiveScoringCutoff:report.protocol.scoringCutoff,reservedQuarterScored:false,
 scope:'Regenerated existing seeds only; independent count sums, vintage selection and coverage arithmetic. No new fitting or general proof of correctness.'},null,2));
