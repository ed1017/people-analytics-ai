import {normalizeHomePack} from './home-pack.mjs';

// Output-only v2 contract. The model selects operations/references, never card claims or values.
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
const numbers=/\p{N}|[$€£%]|\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|dozen|half|quarter|double[sd]?|doubling|triple[sd]?|tripling|twofold|threefold|fourfold|tenfold|percent|percentage|per cent)\b/iu;
export const nonquantitativeProblem=(raw:unknown)=>typeof raw==='string'&&!numbers.test(raw);
const text=(raw:unknown,max:number)=>typeof raw==='string'&&raw.trim()&&raw.length<=max?raw.trim():null;
const isMetric=(raw:unknown):raw is InvestigationMetricId=>typeof raw==='string'&&Object.hasOwn(investigationMetrics,raw);
export const investigationFailureReasons=['reference_shape','duplicate_reference','unknown_metric','source_unavailable','metric_unavailable','metric_invalid','option_shape','operation_unknown','operation_mismatch','problem_source_mismatch'] as const;
export type InvestigationFailureReason=typeof investigationFailureReasons[number];
export const investigationDiagnosticFields=['none','proposal','problem','question','problem_evidence','options','options.operation','options.evidence'] as const;
export type InvestigationDiagnosticField=typeof investigationDiagnosticFields[number];
function metricFailure(raw:unknown,pack:ReturnType<typeof normalizeHomePack>):InvestigationFailureReason|null{
 if(!isMetric(raw))return 'unknown_metric';
 const def=investigationMetrics[raw],source=pack.sources.find(item=>item.id===def.source);
 if(!source||source.status!=='loaded')return 'source_unavailable';
 const value=object(source.facts)?.[def.field];
 if(value===null||value===undefined)return 'metric_unavailable';
 if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1e15||def.kind==='count'&&!Number.isInteger(value)||def.kind==='percent'&&value>100)return 'metric_invalid';
 return null;
}
function resolve(raw:unknown,pack:ReturnType<typeof normalizeHomePack>):InvestigationEvidence|null{
 if(metricFailure(raw,pack)||!isMetric(raw))return null;
 const def=investigationMetrics[raw],source=pack.sources.find(item=>item.id===def.source)!;
 return {id:raw,sourceId:def.source,label:def.label,value:object(source.facts)![def.field] as number,unit:def.unit,scope:source.scope,date:source.date,population:source.population,limitation:source.limitation,sourceLabel:source.label,page:source.page};
}
function inspectRefs(raw:unknown,max:number,pack:ReturnType<typeof normalizeHomePack>):{ids:InvestigationMetricId[]|null;reason:InvestigationFailureReason|null}{
 if(!Array.isArray(raw)||!raw.length||raw.length>max)return {ids:null,reason:'reference_shape'};
 if(new Set(raw).size!==raw.length)return {ids:null,reason:'duplicate_reference'};
 for(const id of raw){const reason=metricFailure(id,pack);if(reason)return {ids:null,reason};}
 return {ids:raw as InvestigationMetricId[],reason:null};
}
const refs=(raw:unknown,max:number,pack:ReturnType<typeof normalizeHomePack>)=>inspectRefs(raw,max,pack).ids;
type ProposalFailure=InvestigationFailureReason|'invalid_envelope'|'invalid_problem'|'invalid_question'|'invalid_options'|'too_many_options'|'no_options_or_question';
export function inspectInvestigationProposal(raw:unknown,input:unknown):{proposal:InvestigationProposal|null;reason:ProposalFailure|'ready';field:InvestigationDiagnosticField}{
 const fail=(reason:ProposalFailure,field:InvestigationDiagnosticField)=>({proposal:null,reason,field});
 const value=object(raw);if(!value||!exact(value,['version','problem','problem_evidence','options','question'])||value.version!==2)return fail('invalid_envelope','proposal');
 const problem=text(value.problem,240),question=value.question===null?null:text(value.question,200);
 if(!problem||!nonquantitativeProblem(problem))return fail('invalid_problem','problem');
 if(value.question!==null&&!question||question&&(question.match(/\?/g)?.length??0)>1)return fail('invalid_question','question');
 const pack=normalizeHomePack(input),problemRefs=inspectRefs(value.problem_evidence,3,pack),problemEvidence=problemRefs.ids;
 if(!problemEvidence)return fail(problemRefs.reason!,'problem_evidence');
 if(!Array.isArray(value.options))return fail('invalid_options','options');
 if(value.options.length>3)return fail('too_many_options','options');
 const options:InvestigationCandidate[]=[],seen=new Set<string>();
 for(const candidate of value.options){
  const option=object(candidate);if(!option||!exact(option,['operation','evidence']))return fail('option_shape','options');
  if(!investigationOperations.includes(option.operation as InvestigationOperation))return fail('operation_unknown','options.operation');
  const operation=option.operation as InvestigationOperation,checked=inspectRefs(option.evidence,2,pack),evidence=checked.ids;
  if(!evidence)return fail(checked.reason!,'options.evidence');
  if(evidence.some(id=>investigationMetrics[id].operation!==operation))return fail('operation_mismatch','options.operation');
  const identity=JSON.stringify([operation,[...evidence].sort()]);
  if(seen.has(identity))continue;
  seen.add(identity);options.push({operation,evidence});
 }
 if(!options.length&&!question)return fail('no_options_or_question','options');
 return {proposal:{version:2,problem,problem_evidence:problemEvidence,options,question},reason:'ready',field:'none'};
}
export function readInvestigationProposal(raw:unknown,input:unknown){return inspectInvestigationProposal(raw,input).proposal;}
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
// All generation constraints and runtime resolution share metricFailure/normalizeHomePack.
export function availableInvestigationMetrics(input:unknown){
 const pack=normalizeHomePack(input);
 return (Object.keys(investigationMetrics) as InvestigationMetricId[]).filter(id=>!metricFailure(id,pack));
}
export function buildInvestigationCandidateSchema(available:InvestigationMetricId[]){
 const anyOf=investigationOperations.flatMap(operation=>{
  const ids=available.filter(id=>investigationMetrics[id].operation===operation);
  return ids.length?[{type:'object',additionalProperties:false,required:['operation','evidence'],properties:{operation:{type:'string',enum:[operation]},evidence:{type:'array',minItems:1,maxItems:2,items:{type:'string',enum:ids}}}}]:[];
 });
 return anyOf.length?{anyOf}:{type:'null'};
}

// This catalog describes existing packet fields; no new evidence is sent to the model.
export const investigationCatalogInstructions=Object.entries(investigationMetrics).map(([id,m])=>`${id}: source ${m.source}, facts.${m.field}, ${m.label} (${m.unit}; ${m.kind}); operation ${m.operation}`).join('\n');
export function resolveInvestigationEvidence(ids:InvestigationMetricId[],input:unknown){
 const pack=normalizeHomePack(input);
 return ids.map(id=>resolve(id,pack)).filter((item):item is InvestigationEvidence=>item!==null);
}
