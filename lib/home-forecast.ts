import artifact from './data/synthetic-domain-demo-v1.json' with {type:'json'};
// @ts-expect-error Native Node tests share TypeScript source.
import {homeForecastIntent,type HomeForecastDomain} from './home-forecast-intent.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {resolveSyntheticDomainDemo,formatDemoValue,demoDomainCopy,demoMethodLabels} from './synthetic-domain-demo.ts';

const destinations:Record<HomeForecastDomain,string>={turnover:'[Attrition](app:attrition)',hiring:'[Talent Acquisition](app:talent-acquisition)',satisfaction:'[Survey Sentiment](app:survey-sentiment)'};
const month=(value:string)=>new Date(value+'-01T00:00:00Z').toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});
const scope='**SIMULATED DEMO — fixed simulated company-wide population.** These precomputed results are separate from recorded workforce data, dashboard filters and your goal. They cannot supply a filtered planning baseline, avoided exits, capacity, savings, ROI or an intervention effect.';
/** Read-only projection of server-owned verified evidence. Never calculates, calls a model or takes request-supplied evidence. */
export function homeForecastAnswer(message:string,candidate:unknown=artifact):string|null {
 const intent=homeForecastIntent(message);if(!intent)return null;
 const {question,domains}=intent;
 if(domains.length>1)return scope+'\n\nThese domains use different outcomes and periods; their values cannot be ranked or combined.\n\n'+domains.map(domain=>homeForecastAnswer(question.replace(/\b(?:turnover|attrition|exits?|resignations?|retention|hiring|hires?|recruiting|recruitment|talent acquisition|opening.cohort|satisfaction|satisfied|sentiment|engagement|survey|employee listening|all three|all 3|across domains|cross.domain)\b/gi,'')+' forecast '+domain,candidate)).join('\n\n');
 if(!domains.length)return 'Which prediction domain would you like to compare? The app has precomputed simulated monthly voluntary-exit counts in '+destinations.turnover+', opening-cohort 90-day start percentages in '+destinations.hiring+', and a quarterly mean respondent favorable-answer share in '+destinations.satisfaction+'.\n\nThese use a separate fixed simulated population, not your filtered workforce or goal. No method is a proven winner; operational forecasts and confidence intervals are unavailable. Ask, for example, “Compare turnover prediction methods”.';
 const domain=domains[0],link=destinations[domain],copy=demoDomainCopy[domain];
 const navigate='Open '+link+' to inspect the available simulated methods, assumptions and source evidence. Navigation does not change or calculate a plan.';
 const view=resolveSyntheticDomainDemo(candidate);
 if(view.status!=='ready')return scope+'\n\n'+view.message+'\n\n'+navigate;
 let unsupported='';
 if(/\b(?:no|without|exclude|excluding|not|don\x27t use|do not use)\s+(?:any\s+)?(?:synthetic|simulated|demo)\b/i.test(question))unsupported='A forecast for the recorded workforce is unavailable. The separate simulated demonstration cannot answer a request that excludes simulated data.';
 else if(/\b(?:effect|impact|causal|causality|roi|savings?|avoided|if we|after (?:training|hiring|coaching)|by (?:training|hiring|coaching))\b/i.test(question))unsupported='An intervention-effect forecast is unavailable. The simulated methods do not estimate what a policy, training programme or staffing action will cause.';
 else if((question.match(/\b20\d{2}\b/g)??[]).some(year=>year!=='2026')||/\b(?:next year|next (?:6|12|six|twelve) months|q[123]|january|february|march|april|may|june|july|august|september)\b/i.test(question))unsupported='The available fixed demonstration covers October–December 2026 only (one December quarterly wave for satisfaction). It does not provide a new forecast for the requested horizon.';
 else if(domain==='turnover'&&/\brate\b|\brates\b|%|\bpercent(?:age)?\b/i.test(question))unsupported='A year-end turnover-rate forecast is unavailable. Precomputed simulated monthly voluntary-exit counts exist, but future workforce denominators are unknown, so those counts cannot be converted into a turnover rate. YTD and annualized historical rates are not forecasts.';
 else if(domain==='hiring'&&/\b(?:how many|number of|count of|headcount|time.to.fill|time to hire)\b/i.test(question))unsupported='The available hiring demonstration estimates the percentage of an opening cohort that starts within 90 days. It does not forecast hire counts, headcount or time to fill; future opening counts are unknown.';
 else if(domain==='satisfaction'&&/\benps\b|\b(?:percent(?:age)?|share|number)\s+of\s+(?:employees|people|staff)\b/i.test(question))unsupported='The available satisfaction demonstration is a quarterly mean respondent favorable-answer share. It is not eNPS or the percentage of employees who are satisfied.';
 if(unsupported)return unsupported+'\n\n'+scope+'\n\n'+navigate;
 const data=view.data,d=data.domains[domain];
 if(d.status!=='predicted'||!d.rows.length)return scope+'\n\nNo simulated projection is available for this domain: '+(d.reasonCodes.join(', ')||'insufficient support')+'.\n\n'+navigate;
 const intro=domain==='turnover'?'The available turnover projection is **monthly voluntary-exit counts**, not a turnover rate or a cumulative year-end total. A forecast for your recorded workforce remains unavailable.':domain==='hiring'?'The available hiring projection is the **opening-cohort start percentage within 90 days**, not monthly hire counts.':'The available satisfaction projection is **one December quarterly mean respondent favorable-answer share**, not the percentage of satisfied employees.';
 const header='| Method | '+d.rows.map(row=>month(row.month)).join(' | ')+' |';
 const separator='| --- | '+d.rows.map(()=>'---:').join(' | ')+' |';
 const rows=d.methods.map((method,index)=>'| '+demoMethodLabels[method]+' | '+d.rows.map(row=>formatDemoValue(domain,row.values[index])).join(' | ')+' |');
 return [intro,scope,'Cutoff: **30 Sep 2026**. Latest released support: **'+month(d.support.lastPeriod)+'**. Units: '+copy.unit+'.',[header,separator,...rows].join('\n'),'Released simulated history: '+d.history.map(row=>month(row.month)+': '+(row.value===null?'unavailable (zero openings)':formatDemoValue(domain,row.value))).slice(-3).join('; ')+'. Unreleased gap: '+d.gaps.map(month).join(', ')+'. No interpolation.',copy.assumption,'All three methods are shown; none is selected as best. Results are scenario-dependent and miss unannounced reversals. Confidence intervals and operational forecasts are unavailable; method differences are not uncertainty bands.',navigate].join('\n\n');
}
