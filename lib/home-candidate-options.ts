// @ts-expect-error Native Node tests share the TypeScript source.
import {homeCandidateLanguage} from "./home-candidate-language.ts";
// Qualitative proposals only. These records never enter model inputs or calculators.
export type HomeCandidate={title:string;outcome:string;why:string;source_ids:string[]};
export type HomeCandidateProposal={version:1;problem:string;options:HomeCandidate[];question:string|null};
export type HomeCandidateRecord={version:1;goalId:string;goal:string;selectionGoal:string;sourceKey:string;proposal:HomeCandidateProposal};
type Source={id:string;status:string;facts:unknown;[key:string]:unknown};
export type CandidatePack={version?:number;workforceScope?:string|null;sources:Source[]};
const obj=(value:unknown):Record<string,unknown>|null=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
const short=(value:unknown,max:number)=>typeof value==='string'&&value.trim().length>0&&value.length<=max?value.trim():null;
const known=(value:unknown):boolean=>typeof value==='number'?Number.isFinite(value):!!value&&typeof value==='object'&&Object.values(value).some(known);
export function candidateSourceKey(pack:CandidatePack){return JSON.stringify({version:pack.version,workforceScope:pack.workforceScope,sources:pack.sources})}
export const homePreparationReasons=['ready','empty','missing_fields','invalid_envelope','invalid_problem','invalid_question','invalid_options','too_many_options','evidence_unavailable','invalid_option_shape','invalid_option_text','invalid_source_refs','source_unavailable','wording_rejected','numeric_or_effect_token','no_options_or_question','diagnostic_unavailable'] as const;
export type HomePreparationReason=typeof homePreparationReasons[number];
export type HomePreparationDiagnostic={reason:HomePreparationReason;optionCount:number;missingFieldCount:number};
// Only fixed enums and capped structural counts may leave this inspection. Never include source IDs, text or matched words.
export function readHomePreparationDiagnostic(raw:unknown):HomePreparationDiagnostic|null{
 const value=obj(raw);if(!value||Object.keys(value).some(key=>!['reason','optionCount','missingFieldCount'].includes(key))||!homePreparationReasons.includes(value.reason as HomePreparationReason)||!Number.isInteger(value.optionCount)||Number(value.optionCount)<0||Number(value.optionCount)>4||!Number.isInteger(value.missingFieldCount)||Number(value.missingFieldCount)<0||Number(value.missingFieldCount)>3)return null;
 return {reason:value.reason as HomePreparationReason,optionCount:Number(value.optionCount),missingFieldCount:Number(value.missingFieldCount)};
}
export function inspectHomeCandidateProposal(raw:unknown,pack:CandidatePack|null|undefined):{proposal:HomeCandidateProposal|null;diagnostic:HomePreparationDiagnostic}{
 const value=obj(raw),optionCount=Array.isArray(value?.options)?Math.min(value.options.length,4):0;
 const missingFieldCount=value?['problem','options','question'].filter(key=>value[key]===undefined).length:3;
 const result=(reason:HomePreparationReason,proposal:HomeCandidateProposal|null=null)=>({proposal,diagnostic:{reason,optionCount,missingFieldCount}});
 if(!value||value.version!==1)return result('invalid_envelope');
 if(missingFieldCount)return result('missing_fields');
 if(value.problem===null&&Array.isArray(value.options)&&value.options.length===0&&value.question===null)return result('empty');
 const problem=short(value.problem,240),question=value.question===null?null:short(value.question,200);
 if(!problem)return result('invalid_problem');
 if(value.question!==null&&!question||question&&(question.match(/\?/g)?.length??0)>1)return result('invalid_question');
 if(!Array.isArray(value.options))return result('invalid_options');
 if(value.options.length>3)return result('too_many_options');
 if(!pack||!Array.isArray(pack.sources))return result('evidence_unavailable');
 const available=new Set(pack.sources.filter(source=>source.status==='loaded'&&known(source.facts)).map(source=>source.id));
 if(!available.size)return result('evidence_unavailable');
 const options:HomeCandidate[]=[],titles=new Set<string>(),outcomes=new Set<string>();
 for(const rawOption of value.options){
  const option=obj(rawOption);if(!option||Object.keys(option).some(key=>!['title','outcome','why','source_ids'].includes(key)))return result('invalid_option_shape');
  const title=short(option.title,80),outcome=short(option.outcome,180),why=short(option.why,240),ids=option.source_ids;
  if(!title||!outcome||!why)return result('invalid_option_text');
  if(!Array.isArray(ids)||!ids.length||ids.length>3||ids.some(id=>typeof id!=='string'))return result('invalid_source_refs');
  if(ids.some(id=>!available.has(id)))return result('source_unavailable');
  const languageFailure=homeCandidateLanguage(title,outcome,why);if(languageFailure)return result(languageFailure);
  const titleKey=title.toLocaleLowerCase().replace(/\W/g,''),outcomeKey=outcome.toLocaleLowerCase().replace(/\W/g,'');
  if(titles.has(titleKey)||outcomes.has(outcomeKey))continue;
  titles.add(titleKey);outcomes.add(outcomeKey);options.push({title,outcome,why,source_ids:[...new Set(ids as string[])]});
 }
 if(!options.length&&!question)return result('no_options_or_question');
 return result('ready',{version:1,problem,options,question});
}
export function readHomeCandidateProposal(raw:unknown,pack:CandidatePack|null|undefined):HomeCandidateProposal|null{
 return inspectHomeCandidateProposal(raw,pack).proposal;
}
export function readHomeCandidateRecord(raw:unknown,goalId:string,goal:string,pack:CandidatePack):HomeCandidateRecord|null{
 const record=obj(raw);if(!record||record.version!==1||record.goalId!==goalId||record.goal!==goal||typeof record.selectionGoal!=='string'||record.selectionGoal.length>12000||record.sourceKey!==candidateSourceKey(pack))return null;
 const proposal=readHomeCandidateProposal(record.proposal,pack);return proposal?{version:1,goalId,goal,selectionGoal:record.selectionGoal,sourceKey:record.sourceKey as string,proposal}:null;
}
export function candidateSelectionGoal(raw:unknown){const value=obj(raw)?.selectionGoal;return typeof value==='string'&&value.length<=12000?value:null}
