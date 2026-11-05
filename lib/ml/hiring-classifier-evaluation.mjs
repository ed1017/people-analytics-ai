import assert from 'node:assert/strict';
/** Exact confusion counts from aggregate Bernoulli outcomes, without inventing case IDs. */
export function classifyHiringCohorts(actual,predictions,method,threshold=0.5){
 assert(Number.isFinite(threshold)&&threshold>0&&threshold<1);
 assert(actual.length>0&&actual.length===predictions.length);
 let tp=0,fp=0,fn=0,tn=0,brier=0,logLoss=0;
 const months=new Set();
 actual.forEach((r,i)=>{
  assert(r.month===predictions[i].month&&!months.has(r.month));months.add(r.month);
  assert(Number.isSafeInteger(r.openings)&&r.openings>0&&Number.isSafeInteger(r.started)&&r.started>=0&&r.started<=r.openings);
  const p=predictions[i][method];assert(Number.isFinite(p)&&p>0&&p<1);
  const negative=r.openings-r.started;
  if(p>=threshold){tp+=r.started;fp+=negative;}else{fn+=r.started;tn+=negative;}
  brier+=r.started*(1-p)**2+negative*p*p;
  logLoss-=r.started*Math.log(p)+negative*Math.log1p(-p);
 });
 return {tp,fp,fn,tn,brierSum:brier,logLossSum:logLoss};
}
export function summarizeClassifications(counts){
 const sum=Object.fromEntries(['tp','fp','fn','tn','brierSum','logLossSum'].map(key=>[key,counts.reduce((n,c)=>n+c[key],0)]));
 const {tp,fp,fn,tn}=sum,n=tp+fp+fn+tn;
 assert(n>0&&[tp,fp,fn,tn].every(x=>Number.isSafeInteger(x)&&x>=0));
 const divide=(a,b)=>b?a/b:null,recall=divide(tp,tp+fn),specificity=divide(tn,tn+fp);
 return {...sum,openings:n,positives:tp+fn,negatives:tn+fp,accuracy:(tp+tn)/n,precision:divide(tp,tp+fp),recall,specificity,
  balancedAccuracy:recall===null||specificity===null?null:(recall+specificity)/2,brier:sum.brierSum/n,logLoss:sum.logLossSum/n};
}
