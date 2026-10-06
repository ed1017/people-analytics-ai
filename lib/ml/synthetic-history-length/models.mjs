import assert from 'node:assert/strict';
import protocol from './protocol.json' with {type:'json'};
import {assertSnapshot,assertMonths,monthIndex,linearPrediction} from '../synthetic-domain-predictions/boundary.mjs';
import {forecastTurnover,scoreTurnover} from '../synthetic-domain-predictions/turnover.mjs';
import {forecastHiring,scoreHiring} from '../synthetic-domain-predictions/hiring.mjs';
import {forecastSatisfaction,scoreSatisfaction} from '../synthetic-domain-predictions/satisfaction.mjs';
import {fitHiringCohorts,predictHiringCohorts} from '../hiring-cohort-model.mjs';
import {monthAdd,monthEnd,dayAdd} from '../synthetic-workforce/common.mjs';
export {protocol};
export const domains=['turnover','hiring','satisfaction'];
const native={turnover:forecastTurnover,hiring:forecastHiring,satisfaction:forecastSatisfaction};
const envelope={methodVersion:'offline-history-length-v1',interval:null,operationallyQualified:false};
const blocked=(reason,audit)=>({...envelope,status:'blocked',reasons:[reason],predictions:[],audit});
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const rename=(rows,from,to)=>rows.map(row=>{const copy={...row,[to]:row[from]};delete copy[from];return copy;});
export function currentReference(snapshot,months){
  const domain=snapshot.domain,result=native[domain](snapshot,months);
  return {...result,predictions:domain==='hiring'?result.predictions:rename(result.predictions,domain==='turnover'?'linear-trend-12':'linear-trend-8','linear-trend')};
}

/** Exploratory calendar windows; this does not modify any app-facing adapter. */
export function forecastWindow(snapshot,months,lookback){
  const domain=snapshot.domain;assertSnapshot(snapshot,domain);assertMonths(months,snapshot.cutoff);assert(protocol.lookbackMonths.includes(lookback));
  if(domain==='hiring')return hiringWindow(snapshot,months,lookback);
  if(domain==='satisfaction')return surveyWindow(snapshot,months,lookback);
  const latest=snapshot.records.at(-1)?.value.month,start=latest?monthAdd(latest,1-lookback):null;
  const rows=start?snapshot.records.filter(row=>row.value.month>=start):[];
  const audit={lookbackMonths:lookback,trainingStart:start,trainingEnd:latest??null,selectedPeriods:rows.length,
    supportRule:'exploratory-at-least-12-complete-calendar-months',trendFitMonths:lookback};
  if(rows.length!==lookback||rows.some((row,i)=>row.value.month!==monthAdd(start,i)))return blocked('incomplete-calendar-window',audit);
  if(rows.some(row=>row.status!=='complete'||row.value.countStatus!=='recorded'||row.effectiveAt!==monthEnd(row.value.month)))return blocked('complete-released-months-required',audit);
  const counts=new Map(rows.map(row=>[row.value.month,row.value.voluntaryExits]));
  if(months.some(month=>!counts.has(monthAdd(month,-12))))return blocked('seasonal-comparator-unavailable',audit);
  const trend=rows.map(row=>({x:monthIndex(row.value.month),y:row.value.voluntaryExits})),recent=mean(rows.slice(-3).map(row=>row.value.voluntaryExits));
  return {...envelope,status:'predicted',reasons:[],audit,predictions:months.map(month=>({month,'recent-mean-3':recent,
    'seasonal-naive-12':counts.get(monthAdd(month,-12)),'linear-trend':Math.max(0,linearPrediction(trend,monthIndex(month)))}))};
}
function hiringWindow(snapshot,months,lookback){
  // Reuse the native adapter's full two-clock and release-value validation. Its
  // 36-month fit/eligibility result is not used to decide another window's result.
  forecastHiring(snapshot,months);
  const due=snapshot.records.filter(row=>dayAdd(row.effectiveAt,90+row.value.maximumReportingLagDays)<=snapshot.cutoff);
  const latest=due.at(-1)?.value.month,start=latest?monthAdd(latest,1-lookback):null;
  const map=new Map(snapshot.records.map(row=>[row.value.month,row]));
  const audit={lookbackMonths:lookback,trainingStart:start,trainingEnd:latest??null,positiveCohorts:0,zeroOpeningMonths:[]};
  if(!start)return blocked('insufficient-mature-history',audit);
  for(let month=start;month<=snapshot.cutoff.slice(0,7);month=monthAdd(month,1))if(!map.has(month))return blocked('missing-calendar-cohort',audit);
  const rows=Array.from({length:lookback},(_,i)=>map.get(monthAdd(start,i)));
  if(rows.some(row=>row.status!=='complete'||!row.value.horizonLabelsComplete||!row.value.horizonMature||row.value.knownOutcomeThrough<dayAdd(row.effectiveAt,90)))return blocked('incomplete-horizon-labels',audit);
  const cohorts=rows.map(row=>({month:row.value.month,openings:row.value.openingCount,started:row.value.actualStartEvents.filter(event=>event.at<=dayAdd(row.effectiveAt,90)).reduce((sum,event)=>sum+event.count,0)}));
  const positive=cohorts.filter(row=>row.openings>0);audit.positiveCohorts=positive.length;audit.zeroOpeningMonths=cohorts.filter(row=>!row.openings).map(row=>row.month);
  audit.trainingOpenings=positive.reduce((sum,row)=>sum+row.openings,0);
  if(positive.length<24)return blocked('insufficient-positive-cohorts',audit);
  try{return {...envelope,status:'predicted',reasons:[],audit,predictions:predictHiringCohorts(fitHiringCohorts(positive),months)};}
  catch(error){if(['Model optimization did not converge.','Model optimization did not descend.'].includes(error.message))return blocked('fixed-optimizer-failed',audit);throw error;}
}
function surveyWindow(snapshot,months,lookback){
  const n=lookback/3,rows=snapshot.records.slice(-n),latest=rows.at(-1)?.effectiveAt.slice(0,7);
  const start=latest?monthAdd(latest,3-lookback):null;
  const audit={lookbackMonths:lookback,trainingStart:start,trainingEnd:latest??null,selectedWaves:rows.length,requiredWaves:n};
  if(n<8)return blocked('minimum-eight-comparable-waves',audit);
  if(rows.length!==n||rows.some((row,i)=>row.effectiveAt.slice(0,7)!==monthAdd(start,3*i)))return blocked('nonconsecutive-quarterly-history',audit);
  // Overlapping native eight-wave validations cover every value and identity in
  // the requested window. None is discarded because it is old or withheld.
  for(let i=0;i<=rows.length-8;i++){
    const checked=forecastSatisfaction({...snapshot,records:rows.slice(i,i+8)},months);
    if(checked.status!=='predicted')return blocked(checked.reasons[0],audit);
  }
  const base=forecastSatisfaction({...snapshot,records:rows},months);
  if(n===8)return {...envelope,status:'predicted',reasons:[],audit,predictions:rename(base.predictions,'linear-trend-8','linear-trend')};
  const points=rows.map(row=>({x:monthIndex(row.effectiveAt.slice(0,7))/3,y:row.value.scorePct}));
  return {...envelope,status:'predicted',reasons:[],audit,predictions:base.predictions.map(row=>({month:row.month,identity:row.identity,
    'last-wave':row['last-wave'],'recent-mean-3':row['recent-mean-3'],'linear-trend':Math.max(0,Math.min(100,linearPrediction(points,monthIndex(row.month)/3)))}))};
}
export function scoreWindow(snapshot,prediction){
  if(prediction.status!=='predicted')return {status:'blocked',reasons:['forecast-abstained'],methods:{}};
  const domain=snapshot.domain;
  const result=domain==='hiring'?scoreHiring(snapshot,prediction.predictions):domain==='turnover'?
    scoreTurnover(snapshot,rename(prediction.predictions,'linear-trend','linear-trend-12')):
    scoreSatisfaction(snapshot,rename(prediction.predictions,'linear-trend','linear-trend-8'));
  if(result.status!=='scored')return {...result,methods:{}};
  const metrics=result.methods??result.metrics;
  const methods=Object.fromEntries(Object.entries(metrics).map(([key,value])=>[key.startsWith('linear-trend-')?'linear-trend':key,value]));
  return {...result,methods};
}
export function summarize(rows){
  const windows=['current',...protocol.lookbackMonths];
  const mae=(row,method)=>row.scoring.methods[method]?.mae??row.scoring.methods[method]?.weightedMaePercentagePoints;
  return protocol.families.flatMap(family=>domains.map(domain=>{
    const selected=rows.filter(row=>row.family===family&&row.domain===domain);
    const summaries=windows.map(window=>{
      const subset=selected.filter(row=>row.window===window),scored=subset.filter(row=>row.scoring.status==='scored');
      const methods=Object.fromEntries(protocol[domain].methods.map(method=>{
        const values=scored.map(row=>row.scoring.methods[method]),keys=Object.keys(values[0]??{});
        return [method,values.length?Object.fromEntries(keys.filter(key=>typeof values[0][key]==='number').map(key=>[key,mean(values.map(value=>value[key]))])):null];
      }));
      return {window,cases:subset.length,predicted:subset.filter(row=>row.forecast.status==='predicted').length,scored:scored.length,methods,
        blocked:subset.filter(row=>row.scoring.status!=='scored').map(row=>({seed:row.seed,reasons:[...row.forecast.reasons,...row.scoring.reasons]}))};
    });
    const comparisons=[];
    for(let a=0;a<windows.length;a++)for(let b=a+1;b<windows.length;b++)for(const method of protocol[domain].methods){
      const first=selected.filter(row=>row.window===windows[a]&&row.scoring.status==='scored');
      const second=new Map(selected.filter(row=>row.window===windows[b]&&row.scoring.status==='scored').map(row=>[row.seed,row]));
      const pairs=first.filter(row=>second.has(row.seed)),differences=pairs.map(row=>mae(second.get(row.seed),method)-mae(row,method));
      comparisons.push({from:windows[a],to:windows[b],method,pairedCases:pairs.length,toMinusFromMae:differences.length?mean(differences):null,
        toWins:differences.filter(value=>value < -1e-10).length,ties:differences.filter(value=>Math.abs(value)<=1e-10).length,toLosses:differences.filter(value=>value>1e-10).length});
    }
    return {family,domain,windows:summaries,pairedComparisons:comparisons};
  }));
}
