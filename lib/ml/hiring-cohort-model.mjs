// Offline aggregate model mechanics. No operational or person-level predictions.
import {evaluateHiringDomain} from './hiring-domain-adapter.mjs';
const DAY=86400000;
const sigmoid=x=>1/(1+Math.exp(-Math.max(-35,Math.min(35,x))));
const monthIndex=month=>{if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Invalid month.');return Number(month.slice(0,4))*12+Number(month.slice(5,7))-1;};
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const hiringModelProtocol=freeze({version:'hiring-cohort-logistic-v1',horizonDays:90,
 minimumTrainingCohorts:24,slopePenalty:1,interceptPenalty:1e-6,
 developmentOrigins:['2024-01-01','2024-04-01','2024-07-01'],assessmentOrigin:'2025-01-01',
 scoreMonths:3,methods:['pooled-fraction','recent-3-fraction','logistic-trend'],
 selection:'No winner promotion or parameter search; compare all prespecified methods.'});

/** Use the shared as-of/revision/coverage adapter; never turn unknown follow-up into failures. */
export function hiringTrainingCohorts(input,coverage){
 const audit=evaluateHiringDomain(input,{horizonDays:90,coverage});
 if(audit.status!=='descriptive-contract-pass'||audit.dataClass!=='constructed-synthetic')throw Error('Complete constructed aggregate follow-up is required.');
 const grouped=new Map();
 const selectedKeys=new Set(audit.readiness.history.map(row=>row.recordKey));
 for(const row of audit.readiness.history){
  if(Date.parse(input.cutoff)-Date.parse(row.effectiveAt)<90*DAY)continue;
  const month=row.effectiveAt.slice(0,7),c=grouped.get(month)??{month,openings:0,started:0};
  if(row.effectiveAt!==`${month}-01T00:00:00.000Z`)throw Error('Only synchronized first-day monthly fixture cohorts are supported.');
  c.openings+=row.details.count;
  if(row.outcome!==null&&row.outcome<=90)c.started+=row.details.count;
  grouped.set(month,c);
 }
 // A visible bucket is not a complete cohort if another declared bucket is late.
 // This checks the supplied fixture universe; it cannot prove source completeness.
 for(const row of input.records)if(grouped.has(row.effectiveAt.slice(0,7))&&!selectedKeys.has(row.recordKey))
  throw Error('Partially observed aggregate cohort; await all declared buckets.');
 return [...grouped.values()].sort((a,b)=>a.month.localeCompare(b.month));
}
function validateCohorts(rows){
 if(!Array.isArray(rows)||!rows.length||rows.length>120)throw Error('Between 1 and 120 aggregate cohorts required.');
 let previous=-Infinity;
 for(const r of rows){
  if(!r||Object.keys(r).sort().join(',')!=='month,openings,started'||!Number.isSafeInteger(r.openings)||r.openings<=0||r.openings>10000000||
     !Number.isSafeInteger(r.started)||r.started<0||r.started>r.openings)throw Error('Invalid aggregate cohort.');
  const index=monthIndex(r.month);if(index<=previous)throw Error('Cohorts must be unique and chronological.');previous=index;
 }
}
/** Penalized binomial likelihood; only intercept and opening-calendar trend are fitted.
 * Fixed penalties and training-only centering; damped Newton steps minimize loss.
 */
export function fitHiringCohorts(rows){
 validateCohorts(rows);if(rows.length<24)throw Error('At least 24 mature training cohorts required.');
 const n=rows.reduce((s,r)=>s+r.openings,0),y=rows.reduce((s,r)=>s+r.started,0);
 const center=rows.reduce((s,r)=>s+r.openings*monthIndex(r.month),0)/n;
 const data=rows.map(r=>({...r,x:(monthIndex(r.month)-center)/12}));
 const pooled=(y+1)/(n+2),recent=rows.slice(-3),recentP=(recent.reduce((s,r)=>s+r.started,0)+1)/(recent.reduce((s,r)=>s+r.openings,0)+2);
 const loss=(a,b)=>data.reduce((s,r)=>{const z=a+b*r.x;return s+r.openings*(Math.max(z,0)+Math.log1p(Math.exp(-Math.abs(z))))-r.started*z;},.5e-6*a*a+.5*b*b);
 let a=Math.log(pooled/(1-pooled)),b=0,iterations=0,converged=false;
 for(;iterations<100;iterations++){
  let ga=1e-6*a,gb=b,haa=1e-6,hab=0,hbb=1;
  for(const r of data){const p=sigmoid(a+b*r.x),error=r.openings*p-r.started,w=r.openings*p*(1-p);
   ga+=error;gb+=error*r.x;haa+=w;hab+=w*r.x;hbb+=w*r.x*r.x;}
  if(Math.max(Math.abs(ga),Math.abs(gb))<1e-7){converged=true;break;}
  const determinant=haa*hbb-hab*hab,da=(hbb*ga-hab*gb)/determinant,db=(haa*gb-hab*ga)/determinant;
  // Near the optimum, summed likelihood rounding can hide an improvement.
  if(Math.max(Math.abs(da),Math.abs(db))<1e-8){converged=true;break;}
  let scale=1;const oldLoss=loss(a,b);
  while(scale>1e-10&&loss(a-scale*da,b-scale*db)>oldLoss)scale/=2;
  if(scale<=1e-10)throw Error('Model optimization did not descend.');
  a-=scale*da;b-=scale*db;
 }
 if(!converged)throw Error('Model optimization did not converge.');
 return Object.freeze({version:hiringModelProtocol.version,trainingStart:rows[0].month,trainingEnd:rows.at(-1).month,
  trainingCohorts:rows.length,trainingOpenings:n,center,intercept:a,slopePerYear:b,pooled,recentP,iterations,converged});
}
export function predictHiringCohorts(model,months){
 if(model?.version!==hiringModelProtocol.version||model.converged!==true)throw Error('A fitted model is required.');
 if(!Array.isArray(months)||!months.length||new Set(months).size!==months.length)throw Error('Unique future months required.');
 return months.map(month=>{if(monthIndex(month)<=monthIndex(model.trainingEnd))throw Error('Predictions must follow training cohorts.');
  return {month,'pooled-fraction':model.pooled,'recent-3-fraction':model.recentP,
   'logistic-trend':sigmoid(model.intercept+model.slopePerYear*(monthIndex(month)-model.center)/12)};});
}
/** Exact Bernoulli Brier/log loss from counts; no expansion into individual records. */
export function scoreHiringCohorts(actual,predictions){
 validateCohorts(actual);
 if(predictions.length!==actual.length||actual.some((r,i)=>r.month!==predictions[i].month))throw Error('Scoring months must align exactly.');
 return Object.fromEntries(hiringModelProtocol.methods.map(method=>{
  let n=0,brier=0,logLoss=0,absolute=0,bias=0;
  actual.forEach((r,i)=>{const p=predictions[i][method];if(!Number.isFinite(p)||p<=0||p>=1)throw Error('Finite interior probabilities required.');
   n+=r.openings;brier+=r.started*(1-p)**2+(r.openings-r.started)*p*p;
   logLoss-=r.started*Math.log(p)+(r.openings-r.started)*Math.log1p(-p);
   absolute+=r.openings*Math.abs(p-r.started/r.openings);bias+=r.openings*p-r.started;});
  return [method,{cohorts:actual.length,openings:n,brier:brier/n,logLoss:logLoss/n,
   weightedMaePercentagePoints:100*absolute/n,biasPercentagePoints:100*bias/n}];
 }));
}
