// Offline synthetic experiment only. No database, model service, person data or UI caller.
import assert from 'node:assert/strict';
import protocol from './protocol.json' with {type:'json'};
import {digest,monthAdd,monthEnd} from '../synthetic-workforce/common.mjs';
import {replaySynthetic} from '../synthetic-workforce/pipeline.mjs';
import {vintageProtocol} from '../turnover-vintage-evaluation.mjs';

export {protocol as groupTurnoverProtocol};
assert.deepEqual(protocol.methods,vintageProtocol.methods,'Keep the existing baseline definitions');
const sum=values=>values.reduce((a,b)=>a+b,0);
const monthIndex=month=>Number(month.slice(0,4))*12+Number(month.slice(5,7))-1;
const timestamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
const count=x=>Number.isSafeInteger(x)&&x>=0;
const exact=(value,keys)=>assert(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(','),'Unexpected synthetic aggregate fields');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const metrics=errors=>errors.length?{n:errors.length,mae:sum(errors.map(Math.abs))/errors.length,rmse:Math.sqrt(sum(errors.map(e=>e*e))/errors.length),bias:sum(errors)/errors.length}:null;
const targetMonths=origin=>[1,2,3].map(n=>monthAdd(origin.slice(0,7),n));

/** Replayed aggregate contract only; source-clock and arbitrary-feature claims fail closed. */
function validateSnapshot(snapshot,{requireMonthEnd=true}={}){
 exact(snapshot,['domain','cutoff','dataClass','observationBasis','operationallyQualified','records']);
 assert.equal(snapshot.domain,'turnover');assert.equal(snapshot.dataClass,'constructed-synthetic');assert.equal(snapshot.observationBasis,'simulated');assert.equal(snapshot.operationallyQualified,false);
 assert(timestamp(snapshot.cutoff));if(requireMonthEnd)assert.equal(snapshot.cutoff,monthEnd(snapshot.cutoff.slice(0,7)),'Quarter forecast origin must be month end');
 assert(Array.isArray(snapshot.records));const keys=new Set();
 for(const row of snapshot.records){
  exact(row,['recordKey','revision','supersedes','effectiveAt','simulatedAvailableAt','sourceObservedAt','status','value']);
  exact(row.value,['month','groupId','startHeadcount','starts','voluntaryExits','otherExits','endHeadcount','countStatus','exposure']);
  const v=row.value;
  assert(protocol.groups.some(g=>g.id===v.groupId));assert.equal(row.recordKey,`turnover:${v.groupId}:${v.month}`);assert(!keys.has(row.recordKey));keys.add(row.recordKey);
  assert(/^\d{4}-(0[1-9]|1[0-2])$/.test(v.month));assert.equal(row.effectiveAt,monthEnd(v.month));
  assert(timestamp(row.simulatedAvailableAt)&&row.simulatedAvailableAt>=row.effectiveAt&&row.simulatedAvailableAt<=snapshot.cutoff&&row.effectiveAt<=snapshot.cutoff);
  assert.equal(row.sourceObservedAt,null);assert(Number.isSafeInteger(row.revision)&&row.revision>0);assert.equal(row.supersedes,row.revision===1?null:row.revision-1);
  assert(['complete','partial','missing','suppressed'].includes(row.status));
  exact(v.exposure,['status','personDays','days','meanHeadcount','unit','definitionVersion']);
  assert.equal(v.exposure.unit,'person-days');assert.equal(v.exposure.definitionVersion,'start-of-UTC-day-events-v1');
  const fields=['startHeadcount','starts','voluntaryExits','otherExits','endHeadcount'];
  if(row.status==='complete'){
   assert(fields.every(k=>count(v[k])));assert.equal(v.countStatus,'recorded');assert.equal(v.endHeadcount,v.startHeadcount+v.starts-v.voluntaryExits-v.otherExits);
   assert.equal(v.exposure.status,'complete');assert(count(v.exposure.days)&&v.exposure.days>0);assert(count(v.exposure.personDays));assert.equal(v.exposure.meanHeadcount,v.exposure.personDays/v.exposure.days);
   assert(Math.min(v.startHeadcount,v.endHeadcount)>=protocol.privacy.minimumHeadcount,'Small-group stock must be withheld');
   assert(v.voluntaryExits===0||v.voluntaryExits>=protocol.privacy.minimumPositiveCount,'Small positive count must be withheld');
  }else{
   assert(fields.every(k=>v[k]===null));assert.equal(v.exposure.personDays,null);assert.equal(v.exposure.meanHeadcount,null);assert.equal(v.exposure.days,null);
  }
 }
}

export function forecastGroup(snapshot,{groupId,targets=targetMonths(snapshot.cutoff)}){
 validateSnapshot(snapshot);assert(protocol.groups.some(g=>g.id===groupId));assert.deepEqual(targets,targetMonths(snapshot.cutoff),'Keep calendar targets fixed despite reporting gaps');
 const rows=snapshot.records.filter(r=>r.value.groupId===groupId).sort((a,b)=>a.value.month.localeCompare(b.value.month));
 const reasons=[];
 if(rows.length<protocol.minimumTrainingMonths)reasons.push('insufficient-released-history');
 if(rows[0]?.value.month!==protocol.trainingStart||rows.some((r,i)=>r.value.month!==monthAdd(protocol.trainingStart,i)))reasons.push('history-not-dense-from-frozen-start');
 if(rows.some(r=>r.status!=='complete'))reasons.push('history-has-withheld-or-incomplete-month');
 const last=rows.at(-1)?.value.month??null;
 const output={groupId,cutoff:snapshot.cutoff,targets:[...targets],trainingStart:rows[0]?.value.month??null,trainingEnd:last,trainingMonths:rows.length,
  reportingGapMonths:last===null?null:monthIndex(snapshot.cutoff.slice(0,7))-monthIndex(last),trainingFingerprint:digest(rows),
  status:reasons.length?'blocked':'forecasted-synthetic-count',reasons,methods:[],rate:null,individualRisk:null,operationallyQualified:false};
 if(reasons.length)return freeze(output);
 const mean=sum(rows.slice(-3).map(r=>r.value.voluntaryExits))/3;
 const seasonal=targets.map(month=>rows.find(r=>r.value.month===monthAdd(month,-12)));
 if(seasonal.some(r=>!r)){output.status='blocked';output.reasons.push('seasonal-calendar-lag-unavailable');return freeze(output);}
 output.methods=protocol.methods.map(method=>{
  const points=targets.map((month,i)=>({month,horizon:i+1,leadFromLastReleasedMonth:monthIndex(month)-monthIndex(last),expectedExits:method==='recent-mean-3'?mean:seasonal[i].value.voluntaryExits}));
  return {method,points,expectedTotal:sum(points.map(p=>p.expectedExits))};
 });
 return freeze(output);
}

function actualQuarter(snapshot,groupId,targets){
 const records=targets.map(month=>snapshot.records.find(r=>r.value.groupId===groupId&&r.value.month===month));
 if(records.some(r=>!r||r.status!=='complete'))return {status:'unavailable',total:null,values:null,reason:'scoring-target-withheld-or-incomplete'};
 return {status:'available',total:sum(records.map(r=>r.value.voluntaryExits)),values:records.map(r=>r.value.voluntaryExits),reason:null};
}

/** Every calibration prediction has its own earlier vintage; labels are visible by the forecast cutoff. */
export function calibrateGroup(releases,{groupId,cutoff=protocol.assessmentOrigin}){
 assert.equal(cutoff,protocol.assessmentOrigin,'Frozen calibration cutoff required');
 const labels=replaySynthetic('turnover',releases,cutoff),folds=[];
 for(const origin of protocol.calibrationOrigins){
  const prediction=forecastGroup(replaySynthetic('turnover',releases,monthEnd(origin)),{groupId});
  const actual=actualQuarter(labels,groupId,prediction.targets),selected=prediction.methods.find(m=>m.method===protocol.primaryMethod);
  const score=selected&&actual.status==='available'?Math.abs(selected.expectedTotal-actual.total)/Math.sqrt(Math.max(1,selected.expectedTotal)):null;
  folds.push({origin,cutoff:prediction.cutoff,targets:prediction.targets,trainingEnd:prediction.trainingEnd,trainingFingerprint:prediction.trainingFingerprint,
   status:score===null?'unavailable':'scored',predictionReasons:prediction.reasons,scoringReason:actual.reason,predictedTotal:selected?.expectedTotal??null,actualTotal:actual.total,score});
 }
 const scores=folds.filter(f=>f.score!==null).map(f=>f.score).sort((a,b)=>a-b),rank=Math.ceil((scores.length+1)*protocol.interval.nominalCoverage);
 const complete=scores.length===protocol.interval.minimumCompleteCalibrationQuarters&&rank<=scores.length;
 return freeze({groupId,cutoff,method:protocol.primaryMethod,status:complete?'calibrated-candidate':'unavailable',completeQuarters:scores.length,requiredQuarters:protocol.interval.minimumCompleteCalibrationQuarters,
  quantileRank:rank,q:complete?scores[rank-1]:null,folds,coverageGuarantee:false});
}

export function candidateRange(predictedTotal,calibration){
 assert(Number.isFinite(predictedTotal)&&predictedTotal>=0);
 if(calibration.status!=='calibrated-candidate'||!Number.isFinite(calibration.q)||calibration.q<0)return null;
 const radius=calibration.q*Math.sqrt(Math.max(1,predictedTotal));
 return {lower:Math.floor(Math.max(0,predictedTotal-radius)),upper:Math.ceil(predictedTotal+radius),target:'three-month-total-only',nominalCoverage:protocol.interval.nominalCoverage,coverageGuarantee:false};
}

export function wilson95(covered,n){
 assert(count(covered)&&count(n)&&covered<=n);if(!n)return {lower:null,upper:null};
 const z=1.959963984540054,p=covered/n,denom=1+z*z/n,center=(p+z*z/(2*n))/denom,half=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/denom;
 return {lower:Math.max(0,center-half),upper:Math.min(1,center+half)};
}

/** One row per frozen seed; absent/blocked rows count as gate failure rather than vanish. */
export function validateIntervalGate(rows,{family,groupId}){
 assert(protocol.families.includes(family)&&protocol.groups.some(g=>g.id===groupId));
 const seeds=Array.from({length:protocol.gate.requiredSeeds},(_,i)=>protocol.validationSeeds.first+i);
 assert(rows.every(r=>r.family===family&&r.groupId===groupId&&r.method===protocol.primaryMethod));
 assert(new Set(rows.map(r=>r.seed)).size===rows.length&&rows.every(r=>seeds.includes(r.seed)),'Unexpected validation seed');
 const available=rows.filter(r=>r.range!==null&&r.actual!==null),covered=available.filter(r=>r.actual>=r.range.lower&&r.actual<=r.range.upper).length;
 const empiricalCoverage=available.length?covered/available.length:null,wilson=wilson95(covered,available.length),reasons=[];
 if(rows.length!==seeds.length||available.length!==seeds.length)reasons.push('not-all-frozen-seeds-forecastable-and-scored');
 if(empiricalCoverage===null||empiricalCoverage<protocol.gate.minimumEmpiricalCoverage)reasons.push('empirical-coverage-below-frozen-minimum');
 if(wilson.lower===null||wilson.lower<protocol.gate.minimumWilson95LowerBound)reasons.push('coverage-lower-bound-below-frozen-minimum');
 return freeze({family,groupId,method:protocol.primaryMethod,target:'three-month-total-only',targets:protocol.assessmentTargets,
  intendedSeeds:seeds.length,receivedSeeds:rows.length,available:available.length,unavailable:seeds.length-available.length,covered,empiricalCoverage,wilson95:wilson,
  status:reasons.length?'unavailable':'qualified-conditional-simulation',reasons,qualificationAvailableAt:protocol.interval.qualificationAvailableAt,
  timing:protocol.interval.qualificationTiming,operationallyQualified:false});
}

export function evaluateGroupCase(releases,{family,seed,includeYearEnd=false}){
 assert(protocol.families.includes(family));
 const forecastSnapshot=replaySynthetic('turnover',releases,protocol.assessmentOrigin),scoreSnapshot=replaySynthetic('turnover',releases,protocol.scoringCutoff);
 validateSnapshot(scoreSnapshot,{requireMonthEnd:false});
 return protocol.groups.map(({id:groupId})=>{
  const forecast=forecastGroup(forecastSnapshot,{groupId}),calibration=calibrateGroup(releases,{groupId});
  const actual=actualQuarter(scoreSnapshot,groupId,protocol.assessmentTargets),primary=forecast.methods.find(m=>m.method===protocol.primaryMethod);
  const range=primary?candidateRange(primary.expectedTotal,calibration):null;
  const comparisons=forecast.methods.map(method=>({method:method.method,monthly:actual.values?metrics(method.points.map((p,i)=>p.expectedExits-actual.values[i])):null,
   quarterError:actual.total===null?null:method.expectedTotal-actual.total}));
  return {family,seed,groupId,method:protocol.primaryMethod,forecast,calibration,range,actual:actual.total,scoringStatus:actual.status,comparisons,
   yearEnd:includeYearEnd?{forecast:forecastGroup(replaySynthetic('turnover',releases,protocol.yearEndOrigin),{groupId}),actual:null,scoringStatus:'reserved-unscored',predictionInterval:null,intervalReason:'reserved-quarter-not-validated'}:null};
 });
}

/** This function never emits candidate ranges when validation failed or for the reserved quarter. */
export function publishGroupCase(result,gate){
 assert.equal(result.family,gate.family);assert.equal(result.groupId,gate.groupId);assert.equal(gate.method,protocol.primaryMethod);
 assert.deepEqual(gate.targets,protocol.assessmentTargets);assert.equal(gate.target,'three-month-total-only');
 assert.equal(gate.qualificationAvailableAt,protocol.interval.qualificationAvailableAt);assert.equal(gate.timing,protocol.interval.qualificationTiming);
 assert.equal(gate.intendedSeeds,protocol.gate.requiredSeeds);assert(count(gate.receivedSeeds)&&gate.receivedSeeds<=gate.intendedSeeds);
 assert(count(gate.available)&&gate.available<=gate.receivedSeeds);assert.equal(gate.unavailable,gate.intendedSeeds-gate.available);
 assert(count(gate.covered)&&gate.covered<=gate.available);assert.equal(gate.empiricalCoverage,gate.available?gate.covered/gate.available:null);
 assert.deepEqual(gate.wilson95,wilson95(gate.covered,gate.available));
 const qualified=gate.receivedSeeds===protocol.gate.requiredSeeds&&gate.available===protocol.gate.requiredSeeds&&
  gate.empiricalCoverage>=protocol.gate.minimumEmpiricalCoverage&&gate.wilson95.lower>=protocol.gate.minimumWilson95LowerBound;
 assert.equal(gate.status,qualified?'qualified-conditional-simulation':'unavailable','Gate status conflicts with frozen validation evidence');
 if(qualified)assert.deepEqual(gate.reasons,[]);
 assert.deepEqual(result.forecast.targets,protocol.assessmentTargets);assert.equal(result.forecast.cutoff,protocol.assessmentOrigin);
 const primary=result.forecast.methods.find(m=>m.method===protocol.primaryMethod);
 assert.deepEqual(result.range,primary?candidateRange(primary.expectedTotal,result.calibration):null,'Range must match the case calibration');
 return {family:result.family,seed:result.seed,groupId:result.groupId,forecast:result.forecast,actual:result.actual,comparisons:result.comparisons,
  calibration:{status:result.calibration.status,completeQuarters:result.calibration.completeQuarters,requiredQuarters:result.calibration.requiredQuarters},
  predictionInterval:gate.status==='qualified-conditional-simulation'?result.range:null,
  intervalStatus:gate.status==='qualified-conditional-simulation'&&result.range?'qualified-retrospective-conditional-simulation':'unavailable',
  intervalReasons:[...gate.reasons,...(result.range?[]:['case-calibration-or-forecast-unavailable'])],qualificationAvailableAt:gate.qualificationAvailableAt,
  yearEnd:result.yearEnd,rate:null,individualRisk:null,operationallyQualified:false};
}
