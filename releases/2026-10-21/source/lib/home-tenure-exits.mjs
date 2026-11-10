import {PUBLIC_9037 as P} from './public-9037-contract.mjs';
export const TENURE_BANDS=Object.freeze(['<1 year','1-2 years','3-4 years','5-9 years','10+ years']);
export const TENURE_DIGEST='10e812c2f6dda2deaf0903710d5041f16b39298cb20df4669c991bd5837e7cd4';
export function tenureExitsIntent(question,turns=[]){
 if(typeof question!=='string'||question.length>1200)return null;
 let text=question.toLowerCase().replace(/[\u2010-\u2014]/g,'-').replace(/\s+/g,' ').trim();
 if(/\b(?:plan|plans|scenario|scenarios|save|saved|edit|change|delete|remove|update|create|add|set|budget|hire|hiring|forecast|predict)\b/.test(text))return null;
 const prior=turns.at(-1),match=prior?.role==='assistant'&&prior.text?.match(/^Current-YTD (total|voluntary) exits by tenure: All company\./);
 const follow=/^(?:show (?:that|it) again|show (?:the )?(?:counts|shares|rates)|what does it cost|what about .+|what should we investigate)[.!?]?$/;
 if(prior?.role==='assistant'&&prior.text?.startsWith('Tenure exit composition unavailable.')&&follow.test(text))return {metric:'total',cost:false,rate:false,answer:prior.text};
 if(match&&follow.test(text))text=`show ${/\bvoluntary\b/.test(text)?'voluntary':match[1]} exits by tenure and ${text}`;
 if(!/\btenure\b/.test(text)||! /\b(?:exits?|turnover|attrition|rates?|costs?)\b/.test(text))return null;
 text=text.replace(/\b(?:by tenure|all company|company-wide|company wide|for the company|across the company)\b/g,'tenure').replace(/\b(?:2026 ytd|ytd 2026|january(?:-| to | through )october 2026|as of 2026-10-31)\b/g,'current');
 const cost=/\bcosts?\b/.test(text),rate=/\brates?\b/.test(text),voluntary=/\bvoluntary\b/.test(text);
 const period=/\bcurrent (?:calendar )?year\b/.test(text)||/\b(?:20\d{2}|last|previous|next|this|today|months?|monthly|annual|annualized|quarter|q[1-4]|january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(text);
 const unsupported=/\b(?:involuntary|regrettable|retirement)\b/.test(text)||(voluntary&&/\btotal\b/.test(text));
 text=text.replace(/\bwhat (?:is|are)\b/g,'what').replace(/\bwhat does it cost\b/g,'cost').replace(/\bshow it again\b/g,'show that again').replace(/\bshow me\b/g,'show');
 const remainder=text.replace(/\b(?:20\d{2}|q[1-4]|show|please|the|our|what|and|also|about|that|again|exits?|turnover|attrition|tenure|bands?|breakdown|composition|counts?|shares?|rates?|costs?|total|overall|voluntary|involuntary|regrettable|retirement|current|latest|available|ytd|year-to-date|last|previous|next|this|today|year|months?|monthly|annual|annualized|quarter|january|february|march|april|may|june|july|august|september|october|november|december)\b/g,'').replace(/[\s,.!?]/g,'');
 if(remainder)return {metric:voluntary?'voluntary':'total',cost,rate,answer:'Tenure exit composition unavailable. This tenure request is not supported as phrased. Verified tenure evidence covers company-wide total or voluntary exit composition for January-October 2026 only. Business-unit, country and level tenure breakdowns, other periods, rates and causes are unavailable. Your filters and saved work are kept; no broader scope or metric has been substituted.'};
 return {metric:voluntary?'voluntary':'total',cost,rate,...(unsupported?{answer:'Tenure exit composition unavailable. Choose total or voluntary exits for the company tenure composition.'}:period?{answer:`Tenure exit composition unavailable. Tenure exit composition supports January-October 2026, as of ${P.cutoff}. The requested period has not been substituted.`}:{})};
}
const count=n=>Number.isSafeInteger(n)&&n>=0;
const exact=(row,keys)=>row&&Object.keys(row).sort().join(',')===[...keys].sort().join(',');
export function calculateTenureExits(data,metric){
 const must=value=>{if(!value)throw Error('Company tenure evidence could not be verified.');};
 must(['total','voluntary'].includes(metric)&&data?.as_of===P.cutoff&&data.summary?.as_of===P.cutoff);
 must(Array.isArray(data.tenure)&&data.tenure.length===5);
 for(let i=0;i<5;i++){
  const r=data.tenure[i];must(exact(r,['tenure_band','tenure_sort','exits','voluntary_exits','regrettable_exits'])&&r.tenure_band===TENURE_BANDS[i]&&r.tenure_sort===i+1&&count(r.exits)&&count(r.voluntary_exits)&&count(r.regrettable_exits)&&r.regrettable_exits<=r.voluntary_exits&&r.voluntary_exits<=r.exits);
 }
 must(Array.isArray(data.trend)&&data.trend.length===34);
 for(let i=0;i<34;i++){
  const r=data.trend[i];must(exact(r,['month','total_exits','voluntary_exits','involuntary_exits','regrettable_exits','monthly_turnover_pct','monthly_voluntary_turnover_pct'])&&r.month===new Date(Date.UTC(2024,i,1)).toISOString().slice(0,10)&&['total_exits','voluntary_exits','involuntary_exits','regrettable_exits'].every(k=>count(r[k]))&&r.total_exits===r.voluntary_exits+r.involuntary_exits&&r.regrettable_exits<=r.voluntary_exits);
 }
 must(exact(data.summary,['as_of','retirements','total_exits','voluntary_exits','involuntary_exits','regrettable_exits','total_turnover_ytd_pct','voluntary_turnover_ytd_pct','annualized_voluntary_turnover_pct','regrettable_share_of_voluntary_pct']));
 must(['total_exits','voluntary_exits','involuntary_exits','regrettable_exits','retirements'].every(k=>count(data.summary[k]))&&data.summary.total_exits===data.summary.voluntary_exits+data.summary.involuntary_exits&&data.summary.retirements<=data.summary.total_exits&&data.trend.slice(24).reduce((n,r)=>n+r.involuntary_exits,0)===data.summary.involuntary_exits);
 for(const [band,key] of [['exits','total_exits'],['voluntary_exits','voluntary_exits'],['regrettable_exits','regrettable_exits']]){
  const total=data.summary[key];must(count(total)&&data.tenure.reduce((n,r)=>n+r[band],0)===total&&data.trend.slice(24).reduce((n,r)=>n+r[key],0)===total);
 }
 const key=metric==='total'?'exits':'voluntary_exits',total=data.summary[metric==='total'?'total_exits':'voluntary_exits'];
 return {total,rows:data.tenure.map(r=>({label:r.tenure_band,count:r[key],share:total?r[key]/total*100:null}))};
}
