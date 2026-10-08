// @ts-expect-error Native Node tests share TypeScript source.
import {taForecastAnswer} from './synthetic-ta/extension.ts';
import artifact from './data/synthetic-domain-demo-v1.json' with {type:'json'};
// @ts-expect-error Native Node tests share TypeScript source.
import {homeForecastIntent,type HomeForecastDomain} from './home-forecast-intent.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {resolveSyntheticDomainDemo,formatDemoValue,demoDomainCopy,demoMethodLabels} from './synthetic-domain-demo.ts';

const destinations:Record<HomeForecastDomain,string>={turnover:'[Attrition](app:attrition)',hiring:'[Talent Acquisition](app:talent-acquisition)',satisfaction:'[Survey Sentiment](app:survey-sentiment)'};
const month=(value:string)=>new Date(value+'-01T00:00:00Z').toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});
const scope='**SIMULATED DEMO — fixed simulated company-wide population.** These precomputed results are separate from recorded workforce data, dashboard filters and your goal. They cannot supply a filtered planning baseline, avoided exits, capacity, savings, ROI or an intervention effect.';
/** Read-only projection of server-owned verified evidence. Never calculates, calls a model or takes request-supplied evidence. */
export function homeForecastAnswer(message:string,candidate:unknown=artifact,taReady=true):string|null {
 const intent=homeForecastIntent(message);if(!intent)return null;
 const {question,domains}=intent;
 if(domains.length!==1){
  const requested=domains.length?domains:['turnover','hiring','satisfaction'] as HomeForecastDomain[];
  if(/\b(?:without|exclude|excluding|no|not)\s+(?:any\s+)?(?:synthetic|simulated|demo)\b/i.test(question))return 'A prediction-method comparison for the recorded workforce is unavailable. The implemented examples use simulated data.';
  if((question.match(/\b20\d{2}\b/g)??[]).some(year=>year!=='2026')||/\b(?:effect|impact|causal|roi|savings?|next year)\b/i.test(question))return 'The implemented comparison covers fixed October–December 2026 simulated projections only. Intervention effects and other horizons are unavailable.';
  return homeMethodComparison(candidate,requested,taReady);
 }
 const domain=domains[0],link=destinations[domain],copy=demoDomainCopy[domain];
 const navigate='Open '+link+' to inspect the available simulated methods, assumptions and source evidence. Navigation does not change or calculate a plan.';
 const view=resolveSyntheticDomainDemo(candidate);
 if(view.status!=='ready')return scope+'\n\n'+view.message+'\n\n'+navigate;
 let unsupported='';
 if(/\b(?:no|without|exclude|excluding|not|don\x27t use|do not use)\s+(?:any\s+)?(?:synthetic|simulated|demo)\b/i.test(question))unsupported='A forecast for the recorded workforce is unavailable. The separate simulated demonstration cannot answer a request that excludes simulated data.';
 else if(/\b(?:effect|impact|causal|causality|roi|savings?|avoided|if we|after (?:training|hiring|coaching)|by (?:training|hiring|coaching))\b/i.test(question))unsupported='An intervention-effect forecast is unavailable. The simulated methods do not estimate what a policy, training programme or staffing action will cause.';
 else if((question.match(/\b20\d{2}\b/g)??[]).some(year=>year!=='2026')||/\b(?:next year|next (?:6|12|six|twelve) months|q[123]|january|february|march|april|may|june|july|august|september)\b/i.test(question))unsupported='The available fixed demonstration covers October–December 2026 only (one December quarterly wave for satisfaction). It does not provide a new forecast for the requested horizon.';
 else if(domain==='turnover'&&/\brate\b|\brates\b|%|\bpercent(?:age)?\b/i.test(question))unsupported='A year-end turnover-rate forecast is unavailable. Precomputed simulated monthly voluntary-exit counts exist, but future workforce denominators are unknown, so those counts cannot be converted into a turnover rate. YTD and annualized historical rates are not forecasts.';

 else if(domain==='satisfaction'&&/\benps\b|\b(?:percent(?:age)?|share|number)\s+of\s+(?:employees|people|staff)\b/i.test(question))unsupported='The available satisfaction demonstration is a quarterly mean respondent favorable-answer share. It is not eNPS or the percentage of employees who are satisfied.';
 if(unsupported)return unsupported+'\n\n'+scope+'\n\n'+navigate;
 if(domain==='hiring')return taReady?taForecastAnswer(question):'Calibrated active-requisition projections are unavailable: recruiting evidence is missing or its calibration is stale. Refresh Talent Acquisition evidence. No replacement values are shown.';
 const data=view.data,d=data.domains[domain];
 if(d.status!=='predicted'||!d.rows.length)return scope+'\n\nNo simulated projection is available for this domain: '+(d.reasonCodes.join(', ')||'insufficient support')+'.\n\n'+navigate;
 const intro=domain==='turnover'?'The available turnover projection is **monthly voluntary-exit counts**, not a turnover rate or a cumulative year-end total. A forecast for your recorded workforce remains unavailable.':'The available satisfaction projection is **one December quarterly mean respondent favorable-answer share**, not the percentage of satisfied employees.';
 const header='| Method | '+d.rows.map(row=>month(row.month)).join(' | ')+' |';
 const separator='| --- | '+d.rows.map(()=>'---:').join(' | ')+' |';
 const rows=d.methods.map((method,index)=>'| '+demoMethodLabels[method]+' | '+d.rows.map(row=>formatDemoValue(domain,row.values[index])).join(' | ')+' |');
 return [intro,scope,'Cutoff: **30 Sep 2026**. Latest released support: **'+month(d.support.lastPeriod)+'**. Units: '+copy.unit+'.',[header,separator,...rows].join('\n'),'Released simulated history: '+d.history.map(row=>month(row.month)+': '+(row.value===null?'unavailable (zero openings)':formatDemoValue(domain,row.value))).slice(-3).join('; ')+'. Unreleased gap: '+d.gaps.map(month).join(', ')+'. No interpolation.',copy.assumption,'All three methods are shown; none is selected as best. Results are scenario-dependent and miss unannounced reversals. Confidence intervals and operational forecasts are unavailable; method differences are not uncertainty bands.',navigate].join('\n\n');
}

const meanings:Record<string,string>={
 'recent-mean-3':'Mean of the three most recent released monthly counts',
 'seasonal-naive-12':'The same calendar month one year earlier',
 'linear-trend-12':'A line fitted to the last 12 released monthly counts',
 'pooled-fraction':'Starts divided by openings across mature cohorts',
 'recent-3-fraction':'Starts divided by openings in the three most recent mature cohorts',
 'logistic-trend':'A bounded trend fitted to mature opening-cohort outcomes',
 'last-wave':'Carry the latest quarterly wave forward',
 'linear-trend-8':'A line fitted to eight released quarterly waves',
};
function homeMethodComparison(candidate:unknown,domains:HomeForecastDomain[],taReady:boolean) {
 const view=resolveSyntheticDomainDemo(candidate);if(view.status!=='ready')return view.message;
 const lines=['**Implemented prediction methods** · cutoff 30 Sep 2026. These domains use different outcomes and periods; their values cannot be ranked or combined.'];
 for(const domain of domains){if(domain==='hiring'){lines.push(taReady?'**Hiring projections** — active requisitions at month-end. '+taForecastAnswer('Forecast hiring'):'**Hiring projections** — unavailable: missing or stale recruiting calibration.');continue;}const d=view.data.domains[domain],last=d.rows.at(-1),test=d.assessment.filter(item=>item.stage==='test');
  lines.push('**'+demoDomainCopy[domain].title+'** — '+(domain==='turnover'?'monthly voluntary-exit counts':'quarterly mean respondent favorable-answer share (%)')+'.');
  lines.push(d.methods.map((method,i)=>'- **'+demoMethodLabels[method]+'**: '+(method==='recent-mean-3'&&domain==='satisfaction'?'Mean of the three most recent released quarterly waves':meanings[method])+(last?'; '+month(last.month)+' projection **'+formatDemoValue(domain,last.values[i])+'**.':'.')).join('\n'));
  lines.push('Evaluation: '+test.reduce((n,row)=>n+row.scored,0)+' of '+test.reduce((n,row)=>n+row.cases,0)+' held-out synthetic cases scored across '+test.length+' scenario families. '+(domain==='satisfaction'?'Instrument-break cases are withheld from scoring. ':'' ));
 }
 lines.push('Fixed simulated company-wide demonstration, separate from your goal and filters. Method-specific error metrics are not included in this verified display artifact; no proven winner, causal effect, operational qualification or confidence intervals.');
 lines.push('For detail, open '+domains.map(domain=>destinations[domain]).join(', ')+'.');return lines.join('\n\n');
}
/** Reproduce only an exact verified supported answer; arbitrary/model-authored prose cannot create a chart. */
export function homeForecastChartDomain(question:string,answer:string):HomeForecastDomain|null {
 const intent=homeForecastIntent(question);return intent?.domains.length===1&&['turnover','hiring'].includes(intent.domains[0])&&answer===homeForecastAnswer(question)&&answer.includes('| Method |')?intent.domains[0]:null;
}
