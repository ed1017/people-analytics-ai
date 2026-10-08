// @ts-expect-error Native Node tests share TypeScript source.
import {taExtension} from './synthetic-ta/extension.ts';
import artifact from './data/synthetic-domain-demo-v1.json' with {type:'json'};
// @ts-expect-error Native Node tests share TypeScript source.
import {homeGoalStarters,hasKnownNumericEvidence} from './contextual-prompts.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {resolveSyntheticDomainDemo,formatDemoValue,demoMethodLabels,type SyntheticDemoDomain} from './synthetic-domain-demo.ts';
import type {CandidatePack} from './home-candidate-options';

export type HomeStarterGoal={goal:string;pinLabel:string;reason:string;domain?:SyntheticDemoDomain;sourceId?:string};
const starters:HomeStarterGoal[]=[
 {goal:'Review workforce skill gaps',pinLabel:'Pin skill gaps as a goal',reason:'Explore which recorded skill gaps need attention before choosing an action.'},
 {goal:'Prioritize training investments',pinLabel:'Pin training priorities as a goal',reason:'Compare recorded skill gaps and learning pathways before choosing training.'},
 {goal:'Reduce turnover',pinLabel:'Pin turnover reduction as a goal',reason:'Explore actions that could reduce turnover; their effects still need evidence.',domain:'turnover',sourceId:'A1'},
 {goal:'Improve employee satisfaction',pinLabel:'Pin satisfaction improvement as a goal',reason:'Explore actions informed by employee feedback; improved outcomes are not guaranteed.',domain:'satisfaction',sourceId:'S1'},
 {goal:'Improve hiring',pinLabel:'Pin hiring improvement as a goal',reason:'Explore recruiting improvements before assuming future hiring capacity.',domain:'hiring',sourceId:'R1'},
];
/** Used only for an explicit starter click. Identical typed questions remain ordinary chat. */
export function homeStarterGoal(prompt:string):HomeStarterGoal|null{
 const index=homeGoalStarters.indexOf(prompt as typeof homeGoalStarters[number]);return index<0?null:starters[index]??null;
}
const month=(value:string)=>new Date(value+'-01T00:00:00Z').toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});
const metrics:Record<SyntheticDemoDomain,string>={turnover:'monthly voluntary exits',hiring:'active requisitions at month-end',satisfaction:'quarterly mean respondent favorable-answer share'};
/** Same verified simulated population and metric on both sides; never combines recorded rates with demo counts. */
export function homeStarterForecast(starter:HomeStarterGoal,pack:CandidatePack,query:string,candidate:unknown=artifact){
 if(!starter.domain||!starter.sourceId)return null;
 const filters=new URLSearchParams(query);
 if([...filters.entries()].some(([key,value])=>['country','org','level'].includes(key)&&value&&value!=='all'))return null;
 const source=pack.sources.find(item=>item.id===starter.sourceId);
 if(source?.status!=='loaded'||!hasKnownNumericEvidence(source.facts))return null;
 const view=resolveSyntheticDomainDemo(candidate);if(view.status!=='ready')return null;
 if(starter.domain==='hiring'){const facts=source.facts as Record<string,unknown>;if(facts?.modeled_ta_version!==taExtension.version||facts?.modeled_ta_status!=='ready')return null;return {domain:starter.domain,summary:`In the generated company-wide history (${taExtension.version}), active requisitions at month-end were **474 in Sep 2026**, distinct from the current-status open count 475. Dec 2026 projections: ${taExtension.forecasts.at(-1)!.carryForward} (Last count), ${taExtension.forecasts.at(-1)!.recentMean} (Recent mean), ${taExtension.forecasts.at(-1)!.dampedChange} (Damped change). Generated chronology and screening assumptions are not observed records. Forecasts are unvalidated stock baselines, not hire counts, role capacity or arrival dates.`};}
 const domain=starter.domain,d=view.data.domains[domain],last=d.history.findLast(row=>row.value!==null&&Number.isFinite(row.value)),projection=d.rows.at(-1);
 if(d.status!=='predicted'||!last||!projection||projection.values.length!==d.methods.length||!projection.values.every(Number.isFinite))return null;
 const values=d.methods.map((method,index)=>`${formatDemoValue(domain,projection.values[index])} (${demoMethodLabels[method]})`).join('; ');
 const summary=`In the **separate simulated company-wide demo**, ${metrics[domain]} ${domain==='turnover'?'were':'was'} **${formatDemoValue(domain,last.value!)} in ${month(last.month)}**. The ${month(projection.month)} projections are **${values}**. ${domain==='turnover'?'These are monthly counts, not a turnover rate. ':''}A forecast for your recorded workforce is unavailable.`;
 return {domain,summary};
}
