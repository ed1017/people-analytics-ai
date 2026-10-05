// Offline follow-up experiment. All prior generators, predictions and gates remain unchanged.
import assert from 'node:assert/strict';
import protocol from './protocol.json' with {type:'json'};
import {groupTurnoverProtocol,evaluateGroupCase,forecastGroup,wilson95} from '../group-turnover/evaluation.mjs';
import {replaySynthetic} from '../synthetic-workforce/pipeline.mjs';
import {monthEnd} from '../synthetic-workforce/common.mjs';
export {protocol as adaptationProtocol};
assert.deepEqual(protocol.calibrationOrigins,groupTurnoverProtocol.calibrationOrigins);
assert.deepEqual(protocol.assessmentTargets,groupTurnoverProtocol.assessmentTargets);
const mean=values=>values.length?values.reduce((sum,n)=>sum+n,0)/values.length:null;
export function sampleVariance(values){assert(values.length>=2&&values.every(Number.isFinite));const center=mean(values);return values.reduce((sum,n)=>sum+(n-center)**2,0)/(values.length-1);}
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};

/** Uses only the already strict as-of group count contract; no family/scenario input. */
export function adaptationDiagnostics(snapshot,groupId){
 const forecast=forecastGroup(snapshot,{groupId});
 if(forecast.status==='blocked')return {status:'unavailable',reasons:forecast.reasons,forecast,scale:null,multiplier:null,shiftFlag:null,shift:null};
 const values=snapshot.records.filter(r=>r.value.groupId===groupId).sort((a,b)=>a.value.month.localeCompare(b.value.month)).slice(-12).map(r=>r.value.voluntaryExits);
 assert.equal(values.length,12);const variance=sampleVariance(values),average=mean(values),multiplier=Math.sqrt(Math.max(1,variance/Math.max(1,average)));
 const predicted=forecast.methods.find(m=>m.method===protocol.pointMethod).expectedTotal;
 const previous=values.slice(0,9),recent=values.slice(-3),difference=Math.abs(mean(recent)-mean(previous));
 const threshold=protocol.detector.sigma*Math.sqrt(Math.max(1,sampleVariance(previous))*(1/3+1/9));
 return {status:'available',reasons:[],forecast,scale:Math.sqrt(Math.max(1,predicted))*multiplier,multiplier,shiftFlag:difference>threshold,
  shift:{difference,threshold,recentMean:mean(recent),referenceMean:mean(previous),referenceVariance:sampleVariance(previous)}};
}
function range(prediction,scale,q){
 if(prediction===null||scale===null||q===null)return null;
 return {lower:Math.floor(Math.max(0,prediction-q*scale)),upper:Math.ceil(prediction+q*scale),target:'three-month-total-only',nominalCoverage:protocol.range.nominalCoverage,coverageGuarantee:false};
}

export function evaluateAdaptationCase(releases,{family,seed}){
 assert(protocol.families.includes(family));assert(Number.isInteger(seed)&&seed>=protocol.evaluationSeeds.first&&seed<=protocol.evaluationSeeds.last,'Fresh frozen seed required');
 const base=evaluateGroupCase(releases,{family,seed});
 const snapshots=new Map([protocol.assessmentOrigin,...protocol.calibrationOrigins.map(monthEnd)].map(cutoff=>[cutoff,replaySynthetic('turnover',releases,cutoff)]));
 return base.map(item=>{
  const diagnostic=adaptationDiagnostics(snapshots.get(protocol.assessmentOrigin),item.groupId),primary=item.forecast.methods.find(m=>m.method===protocol.pointMethod);
  const folds=item.calibration.folds.map(fold=>{
   const d=adaptationDiagnostics(snapshots.get(fold.cutoff),item.groupId);
   const score=fold.predictedTotal!==null&&fold.actualTotal!==null&&d.scale!==null?Math.abs(fold.actualTotal-fold.predictedTotal)/d.scale:null;
   return {origin:fold.origin,targets:fold.targets,trainingEnd:fold.trainingEnd,status:score===null?'unavailable':'scored',score,scale:d.scale,
    predictedTotal:fold.predictedTotal,actualTotal:fold.actualTotal,predictionReasons:fold.predictionReasons,scoringReason:fold.scoringReason};
  });
  const scores=folds.filter(f=>f.score!==null).map(f=>f.score).sort((a,b)=>a-b),rank=Math.ceil((scores.length+1)*protocol.range.nominalCoverage);
  const q=scores.length===protocol.requiredCalibrationQuarters&&rank<=scores.length?scores[rank-1]:null;
  const expected=primary?.expectedTotal??null,adaptive=range(expected,diagnostic.scale,q);
  const unavailableReasons=expected===null?['forecast-history-unavailable']:q===null?['incomplete-calibration-quarters']:[];
  const methods=protocol.methods.map(method=>{
   const candidate=method==='baseline'?item.range:adaptive;
   const abstained=method==='volatility-adaptive-abstain'&&candidate!==null&&diagnostic.shiftFlag===true;
   return {method,status:candidate===null?'unavailable':abstained?'abstained':'candidate',expectedTotal:expected,interval:abstained?null:candidate,
    reasonCodes:candidate===null?(unavailableReasons.length?unavailableReasons:['baseline-calibration-unavailable']):abstained?['observed-past-change-heuristic']:[],
    publishedInterval:null,operationallyQualified:false};
  });
  return {family,seed,groupId:item.groupId,trainingEnd:item.forecast.trainingEnd,targets:protocol.assessmentTargets,
   diagnostics:{status:diagnostic.status,scale:diagnostic.scale,multiplier:diagnostic.multiplier,shiftFlag:diagnostic.shiftFlag,shift:diagnostic.shift},
   calibration:{baselineCompleteQuarters:item.calibration.completeQuarters,adaptiveCompleteQuarters:scores.length,rank,q,folds},
   methods,actual:item.actual,scoringStatus:item.scoringStatus,reservedScore:null,publishedInterval:null,operationallyQualified:false};
 });
}
export function intervalScore(interval,actual){
 assert(interval&&Number.isFinite(actual)&&actual>=0&&Number.isFinite(interval.lower)&&Number.isFinite(interval.upper)&&interval.lower>=0&&interval.upper>=interval.lower);
 const width=interval.upper-interval.lower;
 return width+20*Math.max(0,interval.lower-actual)+20*Math.max(0,actual-interval.upper);
}
const covered=(interval,actual)=>actual>=interval.lower&&actual<=interval.upper;
function metrics(rows,method){
 const all=rows.map(row=>({result:row.methods.find(m=>m.method===method),actual:row.actual}));
 assert(all.every(row=>row.result));
 const issued=all.filter(row=>row.result.interval!==null),scored=issued.filter(row=>row.actual!==null),hits=scored.filter(row=>covered(row.result.interval,row.actual)).length;
 const width=row=>row.result.interval.upper-row.result.interval.lower;
 const reasons={};for(const {result}of all)for(const code of result.reasonCodes)reasons[code]=(reasons[code]??0)+1;
 const bounds=wilson95(hits,scored.length),pass=scored.length===100&&hits/scored.length>=.9&&bounds.lower>=.9;
 return {method,intended:rows.length,issued:issued.length,issuedAndScored:scored.length,unavailable:all.filter(r=>r.result.status==='unavailable').length,
  detectorAbstentions:all.filter(r=>r.result.status==='abstained').length,covered:hits,conditionalCoverage:scored.length?hits/scored.length:null,
  issuanceRate:issued.length/rows.length,issuanceAndCoverageRate:hits/rows.length,meanWidth:mean(scored.map(width)),
  meanRelativeWidth:mean(scored.map(r=>width(r)/Math.max(1,r.result.expectedTotal))),meanIntervalScore:mean(scored.map(r=>intervalScore(r.result.interval,r.actual))),
  missesBelow:scored.filter(r=>r.actual<r.result.interval.lower).length,missesAbove:scored.filter(r=>r.actual>r.result.interval.upper).length,
  wilson95:bounds,reasonCounts:reasons,diagnosticGate:{status:pass?'passed-experimental-check':'failed-or-unavailable',publishedInterval:null,operationallyQualified:false}};
}
export function summarizeAdaptation(rows,{family,groupId}){
 assert(protocol.families.includes(family)&&groupTurnoverProtocol.groups.some(g=>g.id===groupId));
 assert(rows.every(r=>r.family===family&&r.groupId===groupId));
 assert.deepEqual([...rows.map(r=>r.seed)].sort((a,b)=>a-b),Array.from({length:100},(_,i)=>2001+i),'Every frozen seed required without duplicates');
 const methods=protocol.methods.map(method=>metrics(rows,method));
 const paired=protocol.methods.slice(1).map(method=>{
  const common=rows.map(row=>({actual:row.actual,base:row.methods.find(m=>m.method==='baseline'),candidate:row.methods.find(m=>m.method===method)})).filter(row=>row.actual!==null&&row.base.interval!==null&&row.candidate.interval!==null);
  return {method,reference:'baseline',commonIssuedScored:common.length,
   coverageDifference:mean(common.map(r=>Number(covered(r.candidate.interval,r.actual))-Number(covered(r.base.interval,r.actual)))),
   meanWidthDifference:mean(common.map(r=>(r.candidate.interval.upper-r.candidate.interval.lower)-(r.base.interval.upper-r.base.interval.lower))),
   meanIntervalScoreDifference:mean(common.map(r=>intervalScore(r.candidate.interval,r.actual)-intervalScore(r.base.interval,r.actual)))};
 });
 return freeze({family,groupId,methods,paired});
}
