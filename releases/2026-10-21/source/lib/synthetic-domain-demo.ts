// @ts-expect-error Native Node tests share TypeScript source.
import {projectionBacktestPrompt} from './projection-backtest.ts';
import artifact from './data/synthetic-domain-demo-v1.json' with {type:'json'};
export type SyntheticDemoDomain=keyof typeof artifact.domains;
export const syntheticDemoPages:Record<string,SyntheticDemoDomain>={'attrition':'turnover','talent-acquisition':'hiring','survey-sentiment':'satisfaction'};
export const demoMethodLabels:Record<string,string>={'recent-mean-3':'Recent mean (3)','seasonal-naive-12':'Same month last year','linear-trend-12':'Linear Regression','pooled-fraction':'Pooled opening cohorts','recent-3-fraction':'Recent 3 opening cohorts','logistic-trend':'Logistic trend','last-wave':'Last quarterly wave','linear-trend-8':'Linear Regression'};
export const demoDomainCopy={
 turnover:{title:'Turnover projections',unit:'Expected monthly voluntary exits',assumption:'Continuation of simulated count patterns; future headcount and turnover-rate denominators are unknown.',readiness:'Recorded-data forecasting needs complete reconciled monthly exit counts and verified historical release availability.'},
 hiring:{title:'Hiring projections',unit:'Opening-cohort start percentage within 90 days',assumption:'All openings are included, including cancellation, no-show and unresolved outcomes. November and December follow-up extends into 2027. No future opening counts are assumed.',readiness:'Recorded-data forecasting needs complete opening cohorts, dispositions and mature, fully reported 90-day outcomes.'},
 satisfaction:{title:'Satisfaction projection',unit:'Quarterly mean respondent favorable-answer share (%)',assumption:'December is one quarterly wave, not monthly interpolation or a percentage of satisfied employees. It assumes unchanged instrument, items, scoring, eligibility and population; response coverage is not representativeness.',readiness:'Recorded-data forecasting needs comparable complete quarterly waves, instrument/scoring identity and verified historical availability.'},
};
/** Only the fixed build-verified projection may display numbers. No request can supply evidence. */
export function resolveSyntheticDomainDemo(candidate:unknown){
 try{if(JSON.stringify(candidate)===JSON.stringify(artifact)&&artifact.status==='verified'&&!artifact.operationallyQualified&&!artifact.realWorldPerformanceValidated&&artifact.interval===null)return {status:'ready' as const,data:artifact};}catch{}
 return {status:'unavailable' as const,message:'Simulated projections unavailable: evidence is missing or differs from the verified release. No values are shown.'};
}
export function formatDemoValue(domain:SyntheticDemoDomain,value:number){return (domain==='hiring'?100*value:value).toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1})+(domain==='turnover'?'':'%');}
/** Opt-in explanation on the matching domain page only; never a filtered planning baseline. */
export function syntheticDomainDemoPrompt(page:string,message:string,candidate:unknown=artifact){
 if(!Object.hasOwn(syntheticDemoPages,page))return '';
 const domain=syntheticDemoPages[page];if(!domain||! /\b(?:simulated|simulation|synthetic|demo|demonstration)\b/i.test(message)||! /\b(?:forecast|forecasts|prediction|predictions|projection|projections|model|models|candidate|candidates|demo|demonstration)\b/i.test(message))return '';
 const view=resolveSyntheticDomainDemo(candidate);
 const boundary='SEPARATE CONSTRUCTED SYNTHETIC DEMONSTRATION. This fixed simulated company-wide population is independent of the selected country, business unit, level and all recorded-data cohorts. Never use these outputs as a filtered plan baseline, avoided exits, added capacity, savings, ROI or an intervention effect. No real-world accuracy, causal effect, operational qualification or confidence interval is established. The historical backtest ordering is limited to the fixed tested pool; do not infer future superiority, an operational winner or uncertainty from method spread. Source readiness remains separate.';
 if(view.status!=='ready')return boundary+'\n'+view.message;
 const d=view.data.domains[domain];return boundary+'\n'+(domain==='hiring'?'The separate frozen opening-cohort example has no new backtest ranking.':projectionBacktestPrompt(domain,view.data))+'\n'+JSON.stringify({domain,label:view.data.label,cutoff:view.data.cutoff,scope:view.data.scope,unit:demoDomainCopy[domain].unit,assumptions:demoDomainCopy[domain].assumption,readiness:demoDomainCopy[domain].readiness,status:d.status,reasonCodes:d.reasonCodes,methods:d.methods.map(id=>demoMethodLabels[id]),rows:d.rows.map(row=>({period:row.month,values:row.values.map(value=>formatDemoValue(domain,value))})),interval:null,operationallyQualified:false,limits:'Results vary by scenario and miss unannounced reversals. Future survey instrument changes block scoring; withheld cases are not zero error.',evidence:view.data.evidence});
}
