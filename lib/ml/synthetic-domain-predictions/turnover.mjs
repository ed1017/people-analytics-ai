import {assertSnapshot,assertMonths,monthIndex,linearPrediction} from './boundary.mjs';
import {monthAdd,monthEnd} from '../synthetic-workforce/common.mjs';
const envelope = {interval:null,rate:null,operationallyQualified:false};
export function forecastTurnover(snapshot, months) {
  assertSnapshot(snapshot,'turnover'); assertMonths(months,snapshot.cutoff);
  const reasons = [], all = snapshot.records, latest = all.at(-1)?.value.month;
  const rows = latest ? all.filter(row=>row.value.month >= monthAdd(latest,-23)) : [];
  if (rows.length !== 24 || rows.some((row,i)=>row.value.month !== monthAdd(latest,i-23))) reasons.push('24-consecutive-months-required');
  if (rows.some(row=>row.status !== 'complete' || row.value.countStatus !== 'recorded' || row.effectiveAt !== monthEnd(row.value.month))) reasons.push('complete-released-months-required');
  // Never backtrack past a masked last release to find a more convenient fitting window.
  const audit = {selectedMonths:rows.length,trainingEnd:latest??null,latestAvailableAt:all.at(-1)?.simulatedAvailableAt??null,
    forecastGapMonths:latest ? monthIndex(months[0])-monthIndex(latest) : null,recordedZeroMonths:rows.filter(row=>row.status==='complete' && row.value.voluntaryExits===0).map(row=>row.value.month),
    historicalExposureOnly:true};
  if(reasons.length) return {...envelope,status:'blocked',reasons,predictions:[],audit};
  const counts = new Map(rows.map(row=>[row.value.month,row.value.voluntaryExits]));
  if(months.some(month=>!counts.has(monthAdd(month,-12)))) return {...envelope,status:'blocked',reasons:['seasonal-comparator-unavailable'],predictions:[],audit};
  const recent=rows.slice(-3).reduce((sum,row)=>sum+row.value.voluntaryExits,0)/3;
  const trend=rows.slice(-12).map(row=>({x:monthIndex(row.value.month),y:row.value.voluntaryExits}));
  return {...envelope,status:'predicted',reasons:[],audit,predictions:months.map(month=>({month,'recent-mean-3':recent,'seasonal-naive-12':counts.get(monthAdd(month,-12)),
    'linear-trend-12':Math.max(0,linearPrediction(trend,monthIndex(month)))}))};
}
export function scoreTurnover(snapshot,predictions) {
  assertSnapshot(snapshot,'turnover');
  const labels = predictions.map(prediction=>snapshot.records.find(row=>row.value.month===prediction.month));
  if(!predictions.length || labels.some(row=>!row || row.status!=='complete' || row.value.countStatus!=='recorded')) return {status:'blocked',reasons:['complete-scoring-labels-required'],methods:{}};
  const methods = Object.fromEntries(['recent-mean-3','seasonal-naive-12','linear-trend-12'].map(method=>{
    const errors=predictions.map((prediction,i)=>{if(!Number.isFinite(prediction[method])||prediction[method]<0)throw Error('Invalid prediction');return prediction[method]-labels[i].value.voluntaryExits;});
    return [method,{n:errors.length,mae:errors.reduce((s,e)=>s+Math.abs(e),0)/errors.length,rmse:Math.sqrt(errors.reduce((s,e)=>s+e*e,0)/errors.length)}];
  }));
  return {status:'scored',reasons:[],methods};
}
