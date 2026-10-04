import {normalizeHomePack} from './home-pack.mjs';

// Output-only v2 prototype. Not connected to the live decoder until contract review.
// References address this catalog, never user-supplied object paths or values.
export const investigationOperations = [
 'review_capacity','review_hiring_pipeline','review_recorded_exits',
 'review_employee_feedback','review_skill_development','review_internal_mobility',
] as const;
export type InvestigationOperation=typeof investigationOperations[number];
type Metric={source:string;field:string;label:string;unit:string;kind:'count'|'number'|'percent';operation:InvestigationOperation};
const metric=(source:string,field:string,label:string,unit:string,kind:Metric['kind'],operation:InvestigationOperation):Metric=>({source,field,label,unit,kind,operation});
export const investigationMetrics={
 'W1.headcount':metric('W1','headcount','workforce headcount','employees','count','review_capacity'),
 'W1.fte':metric('W1','fte','workforce FTE','FTE','number','review_capacity'),
 'W1.open_positions':metric('W1','open_positions','open positions','positions','count','review_capacity'),
 'P2.vacant_positions':metric('P2','vacant_positions','vacant positions','positions','count','review_capacity'),
 'R1.open_requisitions':metric('R1','open_requisitions','open requisitions','requisitions','count','review_hiring_pipeline'),
 'R1.median_time_to_fill_days':metric('R1','median_time_to_fill_days','historical median time to fill','days','number','review_hiring_pipeline'),
 'R1.offer_acceptance_pct':metric('R1','offer_acceptance_pct','offer acceptance','%','percent','review_hiring_pipeline'),
 'A1.voluntary_exits':metric('A1','voluntary_exits','recorded voluntary exits','exits','count','review_recorded_exits'),
 'A1.regrettable_exits':metric('A1','regrettable_exits','recorded regrettable exits','exits','count','review_recorded_exits'),
 'A1.voluntary_turnover_ytd_pct':metric('A1','voluntary_turnover_ytd_pct','year-to-date voluntary turnover','%','percent','review_recorded_exits'),
 'S1.engagement_favorable_pct':metric('S1','engagement_favorable_pct','engagement favorability','%','percent','review_employee_feedback'),
 'S1.manager_favorable_pct':metric('S1','manager_favorable_pct','manager feedback favorability','%','percent','review_employee_feedback'),
 'S1.pulse_favorable_pct':metric('S1','pulse_favorable_pct','pulse favorability','%','percent','review_employee_feedback'),
 'S2.exit_respondents':metric('S2','exit_respondents','exit-survey participation','respondents','count','review_employee_feedback'),
 'T1.skills_below_75_pct':metric('T1','skills_below_75_pct','skills below 75% requirement coverage','skills','count','review_skill_development'),
 'T1.weighted_requirement_met_pct':metric('T1','weighted_requirement_met_pct','weighted skill requirement coverage','%','percent','review_skill_development'),
 'T2.gap_pathway_coverage_pct':metric('T2','gap_pathway_coverage_pct','gap skills with a learning pathway','%','percent','review_skill_development'),
 'T2.active_courses_on_gap_skills':metric('T2','active_courses_on_gap_skills','catalogue courses for gap skills','courses','count','review_skill_development'),
 'T3.preference_record_coverage_pct':metric('T3','preference_record_coverage_pct','career preference coverage','%','percent','review_internal_mobility'),
 'T3.relocation_willing_pct':metric('T3','relocation_willing_pct','recorded relocation willingness','%','percent','review_internal_mobility'),
 'T4.total_recorded_events':metric('T4','total_recorded_events','recorded movement history','events','count','review_internal_mobility'),
} as const;
export type InvestigationMetricId=keyof typeof investigationMetrics;
export type InvestigationCandidate={operation:InvestigationOperation;evidence:InvestigationMetricId[]};
export type InvestigationProposal={version:2;problem:string;problem_evidence:InvestigationMetricId[];options:InvestigationCandidate[];question:string|null};
export type InvestigationEvidence={id:InvestigationMetricId;sourceId:string;label:string;value:number;unit:string;scope:string;date:string|null;population:string;limitation:string;sourceLabel:string;page:string};
const object=(raw:unknown):Record<string,unknown>|null=>raw!==null&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:null;
const exact=(raw:Record<string,unknown>,keys:string[])=>Object.keys(raw).length===keys.length&&keys.every(key=>Object.hasOwn(raw,key));
const text=(raw:unknown,max:number)=>typeof raw==='string'&&raw.trim()&&raw.length<=max?raw.trim():null;
const isMetric=(raw:unknown):raw is InvestigationMetricId=>typeof raw==='string'&&Object.hasOwn(investigationMetrics,raw);
function resolve(raw:unknown,pack:ReturnType<typeof normalizeHomePack>):InvestigationEvidence|null{
 if(!isMetric(raw))return null;
 const def=investigationMetrics[raw],source=pack.sources.find(item=>item.id===def.source);
 if(!source||source.status!=='loaded')return null;
 const facts=object(source.facts),value=facts?.[def.field];
 if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1e15||def.kind==='count'&&!Number.isInteger(value)||def.kind==='percent'&&value>100)return null;
 // Scope, population, date and limitations come only from canonical packet normalization.
 return {id:raw,sourceId:def.source,label:def.label,value,unit:def.unit,scope:source.scope,date:source.date,population:source.population,limitation:source.limitation,sourceLabel:source.label,page:source.page};
}
function refs(raw:unknown,max:number,pack:ReturnType<typeof normalizeHomePack>):InvestigationMetricId[]|null{
 if(!Array.isArray(raw)||!raw.length||raw.length>max||new Set(raw).size!==raw.length)return null;
 return raw.every(id=>resolve(id,pack))?raw as InvestigationMetricId[]:null;
}
export function readInvestigationProposal(raw:unknown,input:unknown):InvestigationProposal|null{
 const value=object(raw);if(!value||!exact(value,['version','problem','problem_evidence','options','question'])||value.version!==2)return null;
 const problem=text(value.problem,240),question=value.question===null?null:text(value.question,200);
 if(!problem||value.question!==null&&!question||question&&(question.match(/\?/g)?.length??0)>1)return null;
 const pack=normalizeHomePack(input),problemEvidence=refs(value.problem_evidence,3,pack);
 if(!problemEvidence||!Array.isArray(value.options)||value.options.length>3)return null;
 const problemSources=new Set(problemEvidence.map(id=>investigationMetrics[id].source));
 const options:InvestigationCandidate[]=[],seen=new Set<string>();
 for(const candidate of value.options){
  const option=object(candidate);if(!option||!exact(option,['operation','evidence'])||!investigationOperations.includes(option.operation as InvestigationOperation))return null;
  const operation=option.operation as InvestigationOperation,evidence=refs(option.evidence,2,pack);
  if(!evidence||evidence.some(id=>investigationMetrics[id].operation!==operation||!problemSources.has(investigationMetrics[id].source)))return null;
  const identity=JSON.stringify([operation,[...evidence].sort()]);
  if(seen.has(identity))continue;
  seen.add(identity);options.push({operation,evidence});
 }
 if(!options.length&&!question)return null;
 return {version:2,problem,problem_evidence:problemEvidence,options,question};
}
const purpose:Record<InvestigationOperation,string>={
 review_capacity:'Clarify the recorded capacity baseline and what still needs verification.',
 review_hiring_pipeline:'Identify hiring-pipeline questions to investigate before estimating future capacity.',
 review_recorded_exits:'Identify questions about recorded exits without inferring causes or future retention.',
 review_employee_feedback:'Clarify what recorded feedback covers and which questions need further investigation.',
 review_skill_development:'Review recorded skill or catalogue coverage before assessing readiness.',
 review_internal_mobility:'Review recorded preferences or movements before assessing availability.',
};
export function renderInvestigationCandidate(candidate:unknown,input:unknown){
 const option=object(candidate);if(!option||!exact(option,['operation','evidence'])||!investigationOperations.includes(option.operation as InvestigationOperation))return null;
 const pack=normalizeHomePack(input),ids=refs(option.evidence,2,pack),operation=option.operation as InvestigationOperation;
 if(!ids||ids.some(id=>investigationMetrics[id].operation!==operation))return null;
 const evidence=ids.map(id=>resolve(id,pack)!);
 const facts=evidence.map(item=>`${item.label}: ${String(item.value)}${item.unit==='%'?'%':' '+item.unit}`);
 return {title:`Review ${evidence.map(item=>item.label).join(' and ')}`,outcome:purpose[operation],why:`Recorded context — ${facts.join('; ')}. A reason to investigate, not evidence of effectiveness.`,cost:'Unknown — not calculated.',timing:'Unknown — not assessed.',staffing:'Unknown — availability not verified.',evidence};
}
// Snapshot/goal equality is intentionally unchanged; old records are not migrated into v2.
export function readInvestigationRecord(raw:unknown,goalId:string,goal:string,sourceKey:string,input:unknown){
 const record=object(raw);
 if(!record||record.version!==2||record.goalId!==goalId||record.goal!==goal||record.sourceKey!==sourceKey||typeof record.selectionGoal!=='string'||record.selectionGoal.length>12000)return null;
 const proposal=readInvestigationProposal(record.proposal,input);
 return proposal?{version:2 as const,goalId,goal,sourceKey,selectionGoal:record.selectionGoal,proposal}:null;
}
export const investigationCandidateSchema={type:'object',additionalProperties:false,required:['operation','evidence'],properties:{operation:{type:'string',enum:[...investigationOperations]},evidence:{type:'array',minItems:1,maxItems:2,items:{type:'string',enum:Object.keys(investigationMetrics)}}}};
