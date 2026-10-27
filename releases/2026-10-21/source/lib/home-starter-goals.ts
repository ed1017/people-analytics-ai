// @ts-expect-error Native Node tests share TypeScript source.
import {taExtension} from './synthetic-ta/extension.ts';
import artifact from './data/synthetic-domain-demo-v1.json' with {type:'json'};
// @ts-expect-error Native Node tests share TypeScript source.
import {hasKnownNumericEvidence} from './contextual-prompts.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {resolveSyntheticDomainDemo,formatDemoValue,demoMethodLabels,type SyntheticDemoDomain} from './synthetic-domain-demo.ts';
import type {CandidatePack} from './home-candidate-options';

export type HomeStarterGoal={goal:string;pinLabel:string;reason:string;domain?:SyntheticDemoDomain;sourceId?:string};
const starters:Record<string,HomeStarterGoal>={
 'What skills are we missing in the current workforce, and which findings apply to the selected scope?':{goal:'Review workforce skill gaps',pinLabel:'Pin skill gaps as a goal',reason:'Explore which recorded skill gaps need attention before choosing an action.'},
 'Where should we invest in training based on recorded skill gaps and learning pathways, and which findings apply to the selected workforce scope?':{goal:'Prioritize training investments',pinLabel:'Pin training priorities as a goal',reason:'Compare recorded skill gaps and learning pathways before choosing training.'},
 'How can we reduce turnover based on recorded evidence, and which findings apply to the selected workforce scope?':{goal:'Reduce turnover',pinLabel:'Pin turnover reduction as a goal',reason:'Compare actions to address turnover.',domain:'turnover',sourceId:'A1'},
 'How can we improve employee satisfaction based on recorded feedback, and which findings apply to the selected workforce scope?':{goal:'Improve employee satisfaction',pinLabel:'Pin satisfaction improvement as a goal',reason:'Prioritize actions from employee feedback.',domain:'satisfaction',sourceId:'S1'},
 'How can we improve hiring based on recorded recruiting evidence, and which findings apply to the selected workforce scope?':{goal:'Improve hiring',pinLabel:'Pin hiring improvement as a goal',reason:'Compare recruiting improvements.',domain:'hiring',sourceId:'R1'},
};
/** Exact prompt keys preserve legacy skills starters without depending on display order.
 * Used only for an explicit starter click. Identical typed questions remain ordinary chat. */
export function homeStarterGoal(prompt:string):HomeStarterGoal|null{
 return Object.hasOwn(starters,prompt)?starters[prompt]:null;
}
const month=(value:string)=>new Date(value+'-01T00:00:00Z').toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});
const metrics:Record<SyntheticDemoDomain,string>={turnover:'monthly voluntary exits',hiring:'active requisitions at month-end',satisfaction:'quarterly mean respondent favorable-answer share'};
/** Same verified simulated population and metric on both sides; never combines recorded rates with demo counts. */
export function homeStarterForecast(starter:HomeStarterGoal,pack:CandidatePack,query:string,candidate:unknown=artifact,datasetToken?:string){
 if(datasetToken!==undefined&&datasetToken!=='legacy-v1:0'||!starter.domain||!starter.sourceId||'datasetContext' in pack&&pack.datasetContext)return null;
 const filters=new URLSearchParams(query);
 if([...filters.entries()].some(([key,value])=>['country','org','level'].includes(key)&&value&&value!=='all'))return null;
 const source=pack.sources.find(item=>item.id===starter.sourceId);
 if(source?.status!=='loaded'||!hasKnownNumericEvidence(source.facts))return null;
 const view=resolveSyntheticDomainDemo(candidate);if(view.status!=='ready')return null;
 if(starter.domain==='hiring'){const facts=source.facts as Record<string,unknown>;if(facts?.modeled_ta_version!==taExtension.version||facts?.modeled_ta_status!=='ready')return null;return {domain:starter.domain,summary:`Company-wide scenario: **474 active requisitions at September 2026 month-end** (current-status count: 475). Dec 2026 projections: ${taExtension.forecasts.at(-1)!.carryForward} (Last count), ${taExtension.forecasts.at(-1)!.recentMean} (Recent mean), ${taExtension.forecasts.at(-1)!.dampedChange} (Damped change). Illustrative requisition projections; hiring arrival dates are unavailable.`};}
 const domain=starter.domain,d=view.data.domains[domain],last=d.history.findLast(row=>row.value!==null&&Number.isFinite(row.value)),projection=d.rows.at(-1);
 if(d.status!=='predicted'||!last||!projection||projection.values.length!==d.methods.length||!projection.values.every(Number.isFinite))return null;
 const values=d.methods.map((method,index)=>`${formatDemoValue(domain,projection.values[index])} (${demoMethodLabels[method]})`).join('; ');
 const summary=`In this **company-wide scenario**, ${metrics[domain]} ${domain==='turnover'?'were':'was'} **${formatDemoValue(domain,last.value!)} in ${month(last.month)}**. The ${month(projection.month)} projections are **${values}**. Illustrative projections.`;
 return {domain,summary};
}
