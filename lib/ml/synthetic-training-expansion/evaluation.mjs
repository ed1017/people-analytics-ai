import assert from 'node:assert/strict';
import protocol from './protocol.json' with {type:'json'};
import {replaySynthetic} from '../synthetic-workforce/pipeline.mjs';
import {digest,monthEnd,dayAdd} from '../synthetic-workforce/common.mjs';
import {forecastTurnover,scoreTurnover} from '../synthetic-domain-predictions/turnover.mjs';
import {forecastHiring,scoreHiring} from '../synthetic-domain-predictions/hiring.mjs';
import {forecastSatisfaction,scoreSatisfaction} from '../synthetic-domain-predictions/satisfaction.mjs';
export {protocol};
export const domains=['turnover','hiring','satisfaction'];
const adapters={turnover:[forecastTurnover,scoreTurnover],hiring:[forecastHiring,scoreHiring],satisfaction:[forecastSatisfaction,scoreSatisfaction]};
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const clamp=(value,domain)=>Math.max(protocol.outputBounds[domain][0],Math.min(protocol.outputBounds[domain][1]??Infinity,value));

/** Fixed internal generator output to two separate channels: as-of forecasts and later labels. */
export function observeCase(result,{origin,targets,labelsAsOf,role}) {
  assert(['training','calibration','test'].includes(role));
  assert(labelsAsOf>origin);
  return domains.map(domain=>{
    const [forecast,score]=adapters[domain],months=domain==='satisfaction'?[targets.at(-1)]:targets;
    const releases=result.domains[domain].releases;
    const input=replaySynthetic(domain,releases,origin),prediction=forecast(input,months);
    const body={domain,role,origin,labelsAsOf,months,inputSha256:digest(input),predictionStatus:prediction.status,
      predictionReasons:prediction.reasons,baseline:prediction.predictions.map(row=>row[protocol.baseMethods[domain]]),
      support:prediction.audit,labels:null,scoringStatus:'blocked',scoringReasons:['forecast-abstained']};
    if(prediction.status!=='predicted')return body;
    // Exclude reserve target periods/cohorts. Selected hiring follow-up may cross calendar quarters.
    const labelSnapshot=replaySynthetic(domain,releases.filter(row=>row.effectiveAt<=monthEnd(targets.at(-1))),labelsAsOf);
    const scoring=score(labelSnapshot,prediction.predictions);
    body.labelSha256=digest(labelSnapshot);body.scoringStatus=scoring.status;body.scoringReasons=scoring.reasons;
    if(scoring.status!=='scored')return body;
    const selected=months.map(month=>labelSnapshot.records.find(row=>row.effectiveAt.startsWith(month)));
    if(domain==='hiring'&&selected.some(row=>row.value.openingCount===0))return {...body,scoringStatus:'blocked',scoringReasons:['zero-target-exposure']};
    body.labels=selected.map(row=>domain==='turnover'?row.value.voluntaryExits:domain==='satisfaction'?row.value.scorePct:
      row.value.actualStartEvents.filter(event=>event.at<=dayAdd(row.effectiveAt,90)).reduce((sum,event)=>sum+event.count,0)/row.value.openingCount);
    assert(body.labels.length===body.baseline.length&&body.labels.every(Number.isFinite));
    return body;
  });
}

/** One residual scalar per domain; no family/seed feature and no test outcomes. */
export function fitCorrections(rows) {
  assert(rows.length&&rows.every(row=>row.role==='training'&&row.origin===protocol.trainingOrigin&&row.labelsAsOf===protocol.trainingLabelsAsOf));
  return Object.fromEntries(domains.map(domain=>{
    const selected=rows.filter(row=>row.domain===domain&&row.scoringStatus==='scored');
    const residuals=selected.map(row=>mean(row.labels.map((value,i)=>value-row.baseline[i])));
    return [domain,{correction:residuals.length?mean(residuals):null,usableHistories:residuals.length,intendedHistories:rows.filter(row=>row.domain===domain).length}];
  }));
}

/** Prediction inputs deliberately exclude labels, scenario names and opening denominators. */
export function predictCorrection({domain,values},correction) {
  assert(domains.includes(domain)&&Array.isArray(values)&&values.length>0&&values.every(Number.isFinite));
  assert(Number.isFinite(correction));
  return values.map(value=>clamp(value+correction,domain));
}
export function predictionsFor(row,fits) {
  if(row.predictionStatus!=='predicted')return null;
  return Object.fromEntries(protocol.variants.map(variant=>{
    if(variant==='unchanged-baseline')return [variant,[...row.baseline]];
    const correction=fits[variant][row.domain].correction;
    return [variant,correction===null?null:predictCorrection({domain:row.domain,values:row.baseline},correction)];
  }));
}
export function finiteSampleRadius(errors,level=.9) {
  assert(Array.isArray(errors)&&errors.every(value=>Number.isFinite(value)&&value>=0));
  const rank=Math.ceil((errors.length+1)*level);
  return errors.length<20||rank>errors.length?null:[...errors].sort((a,b)=>a-b)[rank-1];
}
export function calibrate(rows,fits) {
  assert(rows.length&&rows.every(row=>row.role==='calibration'&&row.origin===protocol.trainingOrigin&&row.labelsAsOf===protocol.trainingLabelsAsOf));
  return Object.fromEntries(domains.map(domain=>[domain,Object.fromEntries(protocol.variants.map(variant=>{
    const residuals=rows.filter(row=>row.domain===domain&&row.scoringStatus==='scored').flatMap(row=>{
      const values=predictionsFor(row,fits)[variant];return values?[Math.max(...values.map((value,i)=>Math.abs(value-row.labels[i])))]:[];
    });
    return [variant,{histories:residuals.length,rank:Math.ceil((residuals.length+1)*.9),radius:finiteSampleRadius(residuals),nominalLevel:.9,coverageGuarantee:false}];
  }))]));
}
export function evaluateRow(row,fits,calibration) {
  const predictions=predictionsFor(row,fits);
  const variants=Object.fromEntries(protocol.variants.map(variant=>{
    const values=predictions?.[variant];
    if(!values||row.scoringStatus!=='scored')return [variant,{status:'blocked',predictions:values??null,metrics:null,diagnosticBand:null}];
    const errors=values.map((value,i)=>value-row.labels[i]);
    const radius=calibration[row.domain][variant].radius;
    // Intervals target observed aggregate outcomes, not person-level risks or parameter CIs.
    const band=radius===null?null:values.map(value=>({lower:Math.max(0,value-radius),upper:Math.min(row.domain==='turnover'?Infinity:row.domain==='hiring'?1:100,value+radius)}));
    return [variant,{status:'scored',predictions:values,metrics:{mae:mean(errors.map(Math.abs)),rmse:Math.sqrt(mean(errors.map(error=>error**2))),bias:mean(errors)},
      diagnosticBand:band===null?null:{bounds:band,jointCovered:band.every((range,i)=>row.labels[i]>=range.lower&&row.labels[i]<=range.upper),meanWidth:mean(band.map(range=>range.upper-range.lower)),coverageGuarantee:false}}];
  }));
  return {...row,variants,publishedInterval:null,operationallyQualified:false};
}
export function missingnessGuard(result) {
  return domains.map(domain=>{
    const snapshot=replaySynthetic(domain,result.domains[domain].releases,protocol.nativeMissingnessGuardOrigin);
    const forecast=adapters[domain][0](snapshot,protocol.nativeMissingnessGuardTargets);
    return {domain,origin:protocol.nativeMissingnessGuardOrigin,status:forecast.status,reasons:forecast.reasons,inputSha256:digest(snapshot)};
  });
}
export function summarize(rows) {
  return protocol.families.flatMap(family=>domains.map(domain=>{
    const selected=rows.filter(row=>row.family===family&&row.domain===domain);
    const methods=Object.fromEntries(protocol.variants.map(variant=>{
      const scored=selected.map(row=>row.variants[variant]).filter(value=>value.status==='scored'),bands=scored.filter(value=>value.diagnosticBand);
      return [variant,{scored:scored.length,mae:scored.length?mean(scored.map(value=>value.metrics.mae)):null,
        rmse:scored.length?mean(scored.map(value=>value.metrics.rmse)):null,bias:scored.length?mean(scored.map(value=>value.metrics.bias)):null,
        diagnosticCoverage:bands.length?mean(bands.map(value=>Number(value.diagnosticBand.jointCovered))):null,
        diagnosticMeanWidth:bands.length?mean(bands.map(value=>value.diagnosticBand.meanWidth)):null}];
    }));
    const paired=selected.filter(row=>row.variants['bias-small'].status==='scored'&&row.variants['bias-expanded'].status==='scored');
    const differences=paired.map(row=>row.variants['bias-expanded'].metrics.mae-row.variants['bias-small'].metrics.mae);
    return {family,domain,cases:selected.length,predicted:selected.filter(row=>row.predictionStatus==='predicted').length,methods,
      paired:{cases:paired.length,expandedMinusSmallMae:differences.length?mean(differences):null,
        expandedMinusSmallRmse:paired.length?mean(paired.map(row=>row.variants['bias-expanded'].metrics.rmse-row.variants['bias-small'].metrics.rmse)):null,
        expandedWins:differences.filter(value=>value < -1e-10).length,ties:differences.filter(value=>Math.abs(value)<=1e-10).length,expandedLosses:differences.filter(value=>value>1e-10).length},
      blocked:selected.filter(row=>row.scoringStatus!=='scored').map(row=>({seed:row.seed,reasons:[...row.predictionReasons,...row.scoringReasons]}))};
  }));
}
