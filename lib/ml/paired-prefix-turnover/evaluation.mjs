// The information-boundary control uses the unchanged count baseline only.
import assert from 'node:assert/strict';
import protocol from './protocol.json' with {type:'json'};
import {canonical,digest} from '../synthetic-workforce/common.mjs';
import {replaySynthetic} from '../synthetic-workforce/pipeline.mjs';
import {evaluateGroupCase} from '../group-turnover/evaluation.mjs';
export {protocol as pairedPrefixProtocol};
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const score=(interval,actual)=>interval.upper-interval.lower+20*Math.max(0,interval.lower-actual)+20*Math.max(0,actual-interval.upper);
const hit=(interval,actual)=>actual>=interval.lower&&actual<=interval.upper;
export function evaluatePairedPrefix(pair){
 assert(Number.isInteger(pair.seed)&&pair.seed>=protocol.seeds.first&&pair.seed<=protocol.seeds.last);assert(protocol.branches.includes(pair.assignment.branch));
 const inputs=Object.fromEntries(protocol.branches.map(branch=>[branch,replaySynthetic('turnover',pair.branches[branch].groups.releases,protocol.origin)]));
 assert.equal(canonical(inputs['no-shock']),canonical(inputs.shock),'Paired observed prefixes differ');
 const evaluated=Object.fromEntries(protocol.branches.map(branch=>[branch,evaluateGroupCase(pair.branches[branch].groups.releases,{family:protocol.baseFamily,seed:pair.seed})]));
 const rows=evaluated['no-shock'].map(base=>{
  const shock=evaluated.shock.find(r=>r.groupId===base.groupId);assert(shock);
  assert.deepEqual(base.forecast,shock.forecast,'Anticipatory forecast difference');
  assert.deepEqual(base.calibration,shock.calibration,'Anticipatory calibration difference');assert.deepEqual(base.range,shock.range,'Anticipatory range difference');
  const primary=base.forecast.methods.find(m=>m.method===protocol.forecast.method),predicted=primary?.expectedTotal??null;
  const potentialOutcomes=Object.fromEntries([['no-shock',base],['shock',shock]].map(([branch,result])=>[branch,{
   actualTotal:result.actual,scoringStatus:result.scoringStatus,error:predicted===null||result.actual===null?null:predicted-result.actual,
   covered:base.range===null||result.actual===null?null:hit(base.range,result.actual),intervalScore:base.range===null||result.actual===null?null:score(base.range,result.actual)}]));
  return {seed:pair.seed,groupId:base.groupId,assignedBranch:pair.assignment.branch,prefixSha256:digest(inputs['no-shock']),
   forecast:{status:base.forecast.status,reasonCodes:base.forecast.reasons,cutoff:protocol.origin,targets:protocol.targets,trainingEnd:base.forecast.trainingEnd,method:protocol.forecast.method,
    expectedTotal:predicted,points:primary?.points??[],fingerprint:digest(base.forecast)},
   calibration:{status:base.calibration.status,completeQuarters:base.calibration.completeQuarters,requiredQuarters:base.calibration.requiredQuarters,fingerprint:digest(base.calibration)},
   candidateInterval:base.range,potentialOutcomes,publishedInterval:null,reservedScore:null,causalEffect:null,operationallyQualified:false};
 });
 return freeze({seed:pair.seed,assignment:structuredClone(pair.assignment),prefixSha256:digest(inputs['no-shock']),
  invariants:{identicalObservedPrefixes:true,identicalGroupForecasts:rows.length,identicalCalibrations:rows.length,identicalCandidateRanges:rows.length},rows});
}
function metrics(entries){
 const sum=(items,f)=>items.reduce((total,e)=>total+e.weight*f(e),0),weight=items=>sum(items,()=>1);
 const intendedWeight=weight(entries),forecasted=entries.filter(e=>e.prediction!==null),scored=forecasted.filter(e=>e.actual!==null);
 const issued=entries.filter(e=>e.interval!==null),intervalScored=issued.filter(e=>e.actual!==null),denom=weight(scored),rangeDenom=weight(intervalScored);
 const err=e=>e.prediction-e.actual,coveredWeight=sum(intervalScored,e=>Number(hit(e.interval,e.actual)));
 return {intendedHistoryWeight:intendedWeight,forecastAvailableWeight:weight(forecasted),forecastScoredWeight:denom,forecastUnavailableWeight:intendedWeight-weight(forecasted),
  intervalIssuedWeight:weight(issued),intervalScoredWeight:rangeDenom,intervalUnavailableWeight:intendedWeight-weight(issued),
  missingOutcomeWeight:weight(forecasted)-denom,coveredWeight,coverage:rangeDenom?coveredWeight/rangeDenom:null,issuanceAndCoverageRate:coveredWeight/intendedWeight,
  mae:denom?sum(scored,e=>Math.abs(err(e)))/denom:null,rmse:denom?Math.sqrt(sum(scored,e=>err(e)**2)/denom):null,bias:denom?sum(scored,err)/denom:null,
  meanWidth:rangeDenom?sum(intervalScored,e=>e.interval.upper-e.interval.lower)/rangeDenom:null,
  meanIntervalScore:rangeDenom?sum(intervalScored,e=>score(e.interval,e.actual))/rangeDenom:null,
  missesBelowWeight:sum(intervalScored,e=>Number(e.actual<e.interval.lower)),missesAboveWeight:sum(intervalScored,e=>Number(e.actual>e.interval.upper))};
}
export function summarizePairedPrefix(rows,groupId){
 assert(rows.every(r=>r.groupId===groupId));assert.deepEqual(rows.map(r=>r.seed).sort((a,b)=>a-b),Array.from({length:100},(_,i)=>3001+i),'All frozen paired seeds required');
 const entry=(row,branch,weight=1)=>({weight,prediction:row.forecast.expectedTotal,actual:row.potentialOutcomes[branch].actualTotal,interval:row.candidateInterval});
 const conditional=Object.fromEntries(protocol.branches.map(branch=>[branch,metrics(rows.map(row=>entry(row,branch)))]));
 const realized=metrics(rows.map(row=>entry(row,row.assignedBranch)));
 const designWeightedMixture=metrics(rows.flatMap(row=>protocol.branches.map(branch=>entry(row,branch,.5))));
 const complete=rows.filter(r=>r.forecast.expectedTotal!==null&&protocol.branches.every(branch=>r.potentialOutcomes[branch].actualTotal!==null));
 const average=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
 const reasonCounts={};for(const row of rows)for(const code of row.forecast.reasonCodes)reasonCounts[code]=(reasonCounts[code]??0)+1;
 return freeze({groupId,pairedHistories:100,potentialContinuations:200,conditional,realized,designWeightedMixture,
  pairedContrast:{completePairs:complete.length,meanActualDifference:average(complete.map(r=>r.potentialOutcomes.shock.actualTotal-r.potentialOutcomes['no-shock'].actualTotal)),
   meanAbsoluteErrorDifference:average(complete.map(r=>Math.abs(r.potentialOutcomes.shock.error)-Math.abs(r.potentialOutcomes['no-shock'].error))),
   bothCovered:complete.filter(r=>r.potentialOutcomes.shock.covered===true&&r.potentialOutcomes['no-shock'].covered===true).length,
   ordinaryCoveredShockMissed:complete.filter(r=>r.potentialOutcomes['no-shock'].covered===true&&r.potentialOutcomes.shock.covered===false).length},
  reasonCounts,publishedInterval:null,causalEffect:null,operationallyQualified:false});
}
