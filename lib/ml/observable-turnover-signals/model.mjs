// Offline synthetic experiment only. No runtime consumer imports this module.
import assert from 'node:assert/strict';
import protocol from './protocol.json' with {type:'json'};
import {forecastGroup} from '../group-turnover/evaluation.mjs';
import {replaySynthetic} from '../synthetic-workforce/pipeline.mjs';
import {digest} from '../synthetic-workforce/common.mjs';
export {protocol as signalProtocol};
const groups=['group-a','group-b','group-c','group-d'];
const exact=(v,keys)=>assert(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(','),'Unexpected offline signal fields');
const timestamp=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;

export function selectSignal(records,cutoff){
 assert(timestamp(cutoff));assert(Array.isArray(records)&&records.length<=1,'One synthetic signal record permitted');
 for(const r of records){
  exact(r,['name','value','effectiveAt','simulatedAvailableAt','sourceObservedAt','dataClass']);
  assert.equal(r.name,protocol.signal.name);assert([0,1].includes(r.value));assert.equal(r.sourceObservedAt,null);assert.equal(r.dataClass,'constructed-synthetic');
  assert(timestamp(r.effectiveAt)&&timestamp(r.simulatedAvailableAt)&&r.simulatedAvailableAt>=r.effectiveAt,'Invalid signal availability clock');
 }
 const selected=records.find(r=>r.effectiveAt<=cutoff&&r.simulatedAvailableAt<=cutoff);
 return selected?{status:'available',value:selected.value,fingerprint:digest(selected)}:{status:'unavailable',value:null,fingerprint:null};
}

export function trainingRows(history,scenario){
 assert.equal(history.split,'training');assert(protocol.models.trainingScenarios.includes(scenario));
 const window=protocol.training,branch=history.assignments[scenario];
 const snapshot=replaySynthetic('turnover',history.branches[branch].groups.releases,window.origin);
 const scoring=replaySynthetic('turnover',history.branches[branch].groups.releases,window.labelsAsOf);
 const signal=selectSignal([history.signalRelease],window.origin);
 return groups.map(groupId=>{
  const forecast=forecastGroup(snapshot,{groupId}),target=scoring.records.filter(r=>r.value.groupId===groupId&&window.targets.includes(r.value.month));
  const actual=target.length===3&&target.every(r=>r.status==='complete')?target.reduce((n,r)=>n+r.value.voluntaryExits,0):null;
  return {seed:history.seed,scenario,groupId,signal:signal.value,signalFingerprint:signal.fingerprint,origin:window.origin,labelsAsOf:window.labelsAsOf,
   trainingEnd:forecast.trainingEnd,inputFingerprint:forecast.trainingFingerprint,baseline:forecast.methods.find(m=>m.method==='recent-mean-3')?.expectedTotal??null,actual,
   labelAvailableAt:actual===null?null:target.map(r=>r.simulatedAvailableAt).sort().at(-1),reasonCodes:forecast.reasons};
 });
}

export function fitSignalModels(rows){
 const fits={};
 assert.equal(rows.length,800,'Every training seed, scenario and group required');
 for(const scenario of protocol.models.trainingScenarios){
  fits[scenario]={};
  for(const groupId of groups){
   const subset=rows.filter(r=>r.scenario===scenario&&r.groupId===groupId);
   assert.deepEqual(subset.map(r=>r.seed).sort((a,b)=>a-b),Array.from({length:100},(_,i)=>4001+i));
   for(const row of subset){assert.equal(row.origin,protocol.training.origin);assert.equal(row.labelsAsOf,protocol.training.labelsAsOf);assert([0,1].includes(row.signal));
    if(row.actual!==null)assert(timestamp(row.labelAvailableAt)&&row.labelAvailableAt<=protocol.training.labelsAsOf&&row.labelAvailableAt<protocol.test.origin);}
   const valid=subset.filter(r=>r.baseline!==null&&r.actual!==null),residual=r=>r.actual-r.baseline;
   const cells=[0,1].map(value=>{const selected=valid.filter(r=>r.signal===value);return {value,n:selected.length,meanResidual:mean(selected.map(residual))};});
   fits[scenario][groupId]={groupId,trainingLabelsAsOf:protocol.training.labelsAsOf,n:valid.length,intercept:mean(valid.map(residual)),cells,
    signalSupported:cells.every(c=>c.n>=protocol.models.minimumCellSupport),trainingRowsSha256:digest(subset)};
  }
 }
 return fits;
}

export function forecastWithSignal(snapshot,records,fit){
 exact(fit,['groupId','trainingLabelsAsOf','n','intercept','cells','signalSupported','trainingRowsSha256']);
 assert(timestamp(fit.trainingLabelsAsOf)&&fit.trainingLabelsAsOf<snapshot.cutoff,'Training labels must precede forecast origin');
 assert(groups.includes(fit.groupId));assert(Number.isSafeInteger(fit.n)&&fit.n>=0);
 assert(fit.intercept===null||Number.isFinite(fit.intercept));assert(Array.isArray(fit.cells)&&fit.cells.length===2);
 for(const [index,cell]of fit.cells.entries()){exact(cell,['value','n','meanResidual']);assert.equal(cell.value,index);assert(Number.isSafeInteger(cell.n)&&cell.n>=0);assert(cell.meanResidual===null||Number.isFinite(cell.meanResidual));assert.equal(cell.meanResidual===null,cell.n===0);}
 assert.equal(fit.cells.reduce((n,c)=>n+c.n,0),fit.n);assert.equal(fit.intercept===null,fit.n===0);
 assert.equal(fit.signalSupported,fit.cells.every(c=>c.n>=protocol.models.minimumCellSupport));
 const base=forecastGroup(snapshot,{groupId:fit.groupId}),signal=selectSignal(records,snapshot.cutoff);
 const methods=Object.fromEntries(base.methods.map(m=>[m.method,m.expectedTotal])),recent=methods['recent-mean-3']??null;
 const adjusted=recent===null||fit.intercept===null?null:Math.max(0,recent+fit.intercept);
 const useSignal=signal.value!==null&&fit.signalSupported&&adjusted!==null;
 return {groupId:fit.groupId,cutoff:snapshot.cutoff,targets:base.targets,trainingEnd:base.trainingEnd,inputFingerprint:base.trainingFingerprint,
  signal,reasonCodes:base.reasons,signalUsed:useSignal,signalFallback:useSignal?null:signal.value===null?'signal-unavailable':!fit.signalSupported?'insufficient-training-cell-support':'base-forecast-unavailable',
  predictions:{'recent-mean-3':methods['recent-mean-3']??null,'seasonal-naive-12':methods['seasonal-naive-12']??null,'intercept-only':adjusted,
   'signal-adjusted':useSignal?Math.max(0,recent+fit.cells[signal.value].meanResidual):adjusted},
  publishedInterval:null,rate:null,individualRisk:null,causalEffect:null,operationallyQualified:false};
}

export function evaluateSignalHistory(history,fits){
 assert.equal(history.split,'test');const w=protocol.test;
 const snapshot=replaySynthetic('turnover',history.branches['no-shock'].groups.releases,w.origin);
 assert.deepEqual(snapshot,replaySynthetic('turnover',history.branches.shock.groups.releases,w.origin));
 return ['informative','no-signal','reversed'].flatMap(scenario=>{
  const branch=history.assignments[scenario],scoring=replaySynthetic('turnover',history.branches[branch].groups.releases,w.labelsAsOf);
  return groups.map(groupId=>{
   const fit=fits[scenario==='reversed'?'informative':scenario][groupId];
   const forecast=forecastWithSignal(snapshot,[history.signalRelease],fit);
   const late={...history.signalRelease,simulatedAvailableAt:'2026-07-01T00:00:00.000Z'};
   const delayed=forecastWithSignal(snapshot,[late],fit);assert.equal(delayed.predictions['signal-adjusted'],forecast.predictions['intercept-only']);assert.equal(delayed.signal.value,null);
   const target=scoring.records.filter(r=>r.value.groupId===groupId&&w.targets.includes(r.value.month));
   const actual=target.length===3&&target.every(r=>r.status==='complete')?target.reduce((n,r)=>n+r.value.voluntaryExits,0):null;
   return {seed:history.seed,scenario,assignedBranch:branch,forecast,actual,scoringStatus:actual===null?'unavailable':'scored',
    delayedSignalControl:{signalUnavailable:true,equalsIntercept:true,prediction:delayed.predictions['signal-adjusted']},reservedQuarterScore:null};
  });
 });
}

const methods=['recent-mean-3','seasonal-naive-12','intercept-only','signal-adjusted'];
function metrics(rows,method){
 const available=rows.filter(r=>r.forecast.predictions[method]!==null),scored=available.filter(r=>r.actual!==null),errors=scored.map(r=>r.forecast.predictions[method]-r.actual);
 return {intended:rows.length,forecasted:available.length,scored:scored.length,unavailable:rows.length-available.length,missingOutcome:available.length-scored.length,
  mae:mean(errors.map(Math.abs)),rmse:errors.length?Math.sqrt(mean(errors.map(x=>x*x))):null,bias:mean(errors)};
}
export function summarizeSignalRows(rows,scenario,groupId){
 assert(rows.every(r=>r.scenario===scenario&&r.forecast.groupId===groupId));assert.deepEqual(rows.map(r=>r.seed).sort((a,b)=>a-b),Array.from({length:100},(_,i)=>5001+i));
 const methodMetrics=Object.fromEntries(methods.map(m=>[m,metrics(rows,m)]));
 const comparisons=Object.fromEntries(methods.slice(0,3).map(comparator=>{
  const common=rows.filter(r=>r.actual!==null&&r.forecast.predictions[comparator]!==null&&r.forecast.predictions['signal-adjusted']!==null);
  const delta=common.map(r=>Math.abs(r.forecast.predictions['signal-adjusted']-r.actual)-Math.abs(r.forecast.predictions[comparator]-r.actual));
  const comparatorMae=mean(common.map(r=>Math.abs(r.forecast.predictions[comparator]-r.actual))),signalMae=mean(common.map(r=>Math.abs(r.forecast.predictions['signal-adjusted']-r.actual)));
  return [comparator,{commonScored:common.length,unpaired:rows.length-common.length,meanAbsoluteErrorDelta:mean(delta),relativeMaeReduction:comparatorMae>0?1-signalMae/comparatorMae:null,
   wins:delta.filter(x=>x<0).length,ties:delta.filter(x=>x===0).length,losses:delta.filter(x=>x>0).length}];
 }));
 const strata={signal:Object.fromEntries([0,1].map(value=>[value,Object.fromEntries(methods.map(m=>[m,metrics(rows.filter(r=>r.forecast.signal.value===value),m)]))])),
  branch:Object.fromEntries(['no-shock','shock'].map(branch=>[branch,Object.fromEntries(methods.map(m=>[m,metrics(rows.filter(r=>r.assignedBranch===branch),m)]))]))};
 return {scenario,groupId,intendedHistories:100,methods:methodMetrics,comparisons,strata,
  informativeDescriptiveCriterion:scenario==='informative'&&['group-a','group-b'].includes(groupId)?Object.values(comparisons).every(c=>c.commonScored===100&&c.relativeMaeReduction>=.1):null,
  delayedSignalFallbacks:rows.filter(r=>r.delayedSignalControl.equalsIntercept).length,publishedInterval:null,causalEffect:null,operationallyQualified:false};
}
