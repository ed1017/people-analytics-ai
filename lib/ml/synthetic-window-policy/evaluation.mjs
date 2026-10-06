import assert from 'node:assert/strict';
import protocol from './protocol.json' with {type:'json'};
import {domains,currentReference,forecastWindow,scoreWindow} from '../synthetic-history-length/models.mjs';
import {replaySynthetic} from '../synthetic-workforce/pipeline.mjs';
import {monthAdd,monthEnd,digest} from '../synthetic-workforce/common.mjs';
export {protocol,domains};
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
export const targetsFor=(origin,domain)=>{const months=Array.from({length:3},(_,i)=>monthAdd(origin.slice(0,7),i+1));return domain==='satisfaction'?[months.at(-1)]:months;};
export function metric(score,domain,key='mae'){
  const metrics=score.methods[protocol.methods[domain]];
  const value=metrics?.[key]??(key==='mae'?metrics?.weightedMaePercentagePoints:undefined);
  assert(Number.isFinite(value));return value;
}

/** Internal decision kernel: only origin forecasts and prior validation released by cutoff. */
export function selectWindow({domain,cutoff,forecasts,validation}){
  assert(domains.includes(domain));assert(protocol.windows.every(window=>forecasts.some(row=>row.window===window)));
  assert(validation.every(fold=>fold.origin<cutoff&&fold.labelsAsOf===cutoff));
  assert(new Set(validation.map(fold=>fold.origin)).size===validation.length);
  const current=forecasts.find(row=>row.window==='current').forecast;
  const base={domain,cutoff,selectedWindow:'current',selectedForecast:current,sharedValidationOrigins:[],candidates:[],interval:null,operationallyQualified:false};
  if(current.status!=='predicted')return {...base,status:'blocked',reasonCodes:['current-forecast-unavailable']};
  const folds=validation.filter(fold=>fold.rows.find(row=>row.window==='current')?.scoring.status==='scored').sort((a,b)=>a.origin.localeCompare(b.origin)).slice(-protocol.foldCount);
  base.sharedValidationOrigins=folds.map(fold=>fold.origin);
  if(folds.length<protocol.foldCount)return {...base,status:'current-fallback',reasonCodes:['insufficient-complete-prior-folds']};
  for(const window of protocol.windows){
    const forecast=forecasts.find(row=>row.window===window).forecast;
    const scores=folds.map(fold=>fold.rows.find(row=>row.window===window)?.scoring);
    const reason=forecast.status!=='predicted'?'candidate-unavailable-now':scores.some(score=>score?.status!=='scored')?'candidate-unavailable-on-shared-folds':null;
    const candidate={window,eligible:reason===null,reason,meanPriorMae:reason===null?mean(scores.map(score=>metric(score,domain))):null};
    base.candidates.push(candidate);
  }
  const minimum=Math.min(...base.candidates.filter(candidate=>candidate.eligible).map(candidate=>candidate.meanPriorMae));
  const best=base.candidates.find(candidate=>candidate.eligible&&candidate.meanPriorMae<=minimum+protocol.tieTolerance);
  assert(best!==null&&base.candidates[0].eligible,'Current must qualify on its own shared folds');
  return {...base,status:'selected',reasonCodes:[],selectedWindow:best.window,selectedForecast:forecasts.find(row=>row.window===best.window).forecast};
}

function forecastAt(result,domain,origin,cache){
  const key=domain+':'+origin;
  if(!cache.has(key)){
    const input=replaySynthetic(domain,result.domains[domain].releases,origin),months=targetsFor(origin,domain);
    cache.set(key,{origin,months,inputSha256:digest(input),forecasts:protocol.windows.map(window=>({window,forecast:window==='current'?currentReference(input,months):forecastWindow(input,months,window)}))});
  }
  return cache.get(key);
}
function labelsAt(result,domain,months,cutoff){
  const releases=result.domains[domain].releases.filter(row=>row.effectiveAt<=monthEnd(months.at(-1)));
  return replaySynthetic(domain,releases,cutoff);
}
/** No final scoring cutoff or outcome is accepted by this policy preparation function. */
export function prepareDecision(result,domain,cutoff,cache=new Map()){
  const now=forecastAt(result,domain,cutoff,cache);
  const validation=protocol.validationOrigins.filter(origin=>origin<cutoff).map(origin=>{
    const historical=forecastAt(result,domain,origin,cache);
    const labels=labelsAt(result,domain,historical.months,cutoff);
    return {origin,labelsAsOf:cutoff,months:historical.months,inputSha256:historical.inputSha256,labelsSha256:digest(labels),
      rows:historical.forecasts.map(({window,forecast})=>({window,forecastStatus:forecast.status,forecastReasons:forecast.reasons,scoring:scoreWindow(labels,forecast)}))};
  });
  return {domain,origin:cutoff,months:now.months,inputSha256:now.inputSha256,decision:selectWindow({domain,cutoff,forecasts:now.forecasts,validation}),validation,
    currentForecast:now.forecasts.find(row=>row.window==='current').forecast};
}
export function evaluateDecision(result,prepared){
  const labels=labelsAt(result,prepared.domain,prepared.months,protocol.labelsAsOf);
  return {...prepared,labelsSha256:digest(labels),currentScore:scoreWindow(labels,prepared.currentForecast),policyScore:scoreWindow(labels,prepared.decision.selectedForecast),
    publishedInterval:null,operationallyQualified:false};
}
function aggregate(rows,domain){
  const paired=rows.filter(row=>row.currentScore.status==='scored'&&row.policyScore.status==='scored');
  const difference=paired.map(row=>metric(row.policyScore,domain)-metric(row.currentScore,domain));
  const allMethods=[...new Set(paired.flatMap(row=>Object.keys(row.currentScore.methods)))];
  const simplerBaselines=Object.fromEntries(allMethods.map(method=>{
    const values=paired.map(row=>row.currentScore.methods[method]);
    return [method,Object.fromEntries(Object.keys(values[0]??{}).filter(key=>typeof values[0][key]==='number').map(key=>[key,mean(values.map(value=>value[key]))]))];
  }));
  return {cases:rows.length,currentPredicted:rows.filter(row=>row.currentForecast.status==='predicted').length,policyPredicted:rows.filter(row=>row.decision.selectedForecast.status==='predicted').length,
    currentScored:rows.filter(row=>row.currentScore.status==='scored').length,policyScored:rows.filter(row=>row.policyScore.status==='scored').length,pairedCases:paired.length,
    currentMae:paired.length?mean(paired.map(row=>metric(row.currentScore,domain))):null,policyMae:paired.length?mean(paired.map(row=>metric(row.policyScore,domain))):null,
    currentMeanHistoryRmse:domain!=='hiring'&&paired.length?mean(paired.map(row=>metric(row.currentScore,domain,'rmse'))):null,
    policyMeanHistoryRmse:domain!=='hiring'&&paired.length?mean(paired.map(row=>metric(row.policyScore,domain,'rmse'))):null,
    policyMinusCurrentMae:difference.length?mean(difference):null,wins:difference.filter(value=>value < -1e-10).length,ties:difference.filter(value=>Math.abs(value)<=1e-10).length,losses:difference.filter(value=>value>1e-10).length,
    selectedWindows:Object.fromEntries(protocol.windows.map(window=>[window,rows.filter(row=>row.decision.selectedWindow===window).length])),
    decisionStatuses:Object.fromEntries(['selected','current-fallback','blocked'].map(status=>[status,rows.filter(row=>row.decision.status===status).length])),
    candidateEligibility:protocol.windows.map(window=>({window,eligible:rows.filter(row=>row.decision.candidates.some(candidate=>candidate.window===window&&candidate.eligible)).length,
      unavailableNow:rows.filter(row=>row.decision.candidates.some(candidate=>candidate.window===window&&candidate.reason==='candidate-unavailable-now')).length,
      unavailableOnSharedFolds:rows.filter(row=>row.decision.candidates.some(candidate=>candidate.window===window&&candidate.reason==='candidate-unavailable-on-shared-folds')).length,
      notEvaluated:rows.filter(row=>!row.decision.candidates.length).length})),
    currentMethodBaselines:simplerBaselines,
    blocked:rows.filter(row=>row.currentScore.status!=='scored'||row.policyScore.status!=='scored').map(row=>({seed:row.seed,family:row.family,origin:row.origin,currentReasons:[...row.currentForecast.reasons,...row.currentScore.reasons],policyReasons:[...row.decision.reasonCodes,...row.policyScore.reasons]}))};
}
export function summarize(rows){
  const strata=domains.flatMap(domain=>protocol.families.flatMap(family=>protocol.decisionOrigins.map(origin=>({domain,family,origin,...aggregate(rows.filter(row=>row.domain===domain&&row.family===family&&row.origin===origin),domain)}))));
  const families=domains.flatMap(domain=>protocol.families.map(family=>({domain,family,...aggregate(rows.filter(row=>row.domain===domain&&row.family===family),domain)})));
  const overall=domains.map(domain=>{
    const summary=aggregate(rows.filter(row=>row.domain===domain),domain),eligibleStrata=strata.filter(row=>row.domain===domain&&row.pairedCases);
    const eligibleFamilies=families.filter(row=>row.domain===domain&&row.pairedCases);
    const worsened=eligibleStrata.filter(row=>row.policyMinusCurrentMae>protocol.tieTolerance);
    const worst=(group,measure)=>group.length?group.reduce((a,b)=>a[measure]>=b[measure]?a:b):null;
    const describe=(row,measure)=>row?{family:row.family,origin:row.origin??null,mae:row[measure],pairedCases:row.pairedCases}:null;
    const eligible=summary.policyMinusCurrentMae!==null&&summary.policyMinusCurrentMae < -protocol.tieTolerance&&!worsened.length&&summary.policyPredicted>=summary.currentPredicted&&summary.policyScored>=summary.currentScored;
    return {domain,...summary,worstFamilyCurrent:describe(worst(eligibleFamilies,'currentMae'),'currentMae'),worstFamilyPolicy:describe(worst(eligibleFamilies,'policyMae'),'policyMae'),
      worstFamilyOriginCurrent:describe(worst(eligibleStrata,'currentMae'),'currentMae'),worstFamilyOriginPolicy:describe(worst(eligibleStrata,'policyMae'),'policyMae'),
      worsenedStrata:worsened.map(row=>({family:row.family,origin:row.origin,policyMinusCurrentMae:row.policyMinusCurrentMae,pairedCases:row.pairedCases})),
      recommendation:eligible?'separate-review-only-no-promotion':'retain-current',publishedInterval:null};
  });
  return {overall,families,strata};
}
