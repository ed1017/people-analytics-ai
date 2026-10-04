// @ts-expect-error Native Node tests share the TypeScript source.
import {inspectInvestigationProposal,investigationFailureReasons,investigationDiagnosticFields,type InvestigationDiagnosticField,readInvestigationRecord,nonquantitativeProblem,type InvestigationProposal,type InvestigationCandidate} from './home-investigation-contract.ts';
export type HomeCandidate=InvestigationCandidate;
export type HomeCandidateProposal=InvestigationProposal;
export type HomeCandidateRecord={version:2;goalId:string;goal:string;selectionGoal:string;sourceKey:string;proposal:HomeCandidateProposal};
type Source={id:string;status:string;facts:unknown;[key:string]:unknown};
export type CandidatePack={version?:number;workforceScope?:string|null;sources:Source[]};
const obj=(value:unknown):Record<string,unknown>|null=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
export function candidateSourceKey(pack:CandidatePack){return JSON.stringify({version:pack.version,workforceScope:pack.workforceScope,sources:pack.sources})}
export const homePreparationReasons=['ready','empty','missing_fields','invalid_envelope','invalid_problem','invalid_question','invalid_options','too_many_options','evidence_unavailable',...investigationFailureReasons,'no_options_or_question','diagnostic_unavailable'] as const;
export type HomePreparationReason=typeof homePreparationReasons[number];
export type HomePreparationDiagnostic={reason:HomePreparationReason;field:InvestigationDiagnosticField;optionCount:number;missingFieldCount:number};
// Fixed enums and capped structural counts only. No text, source values or matched tokens.
export function readHomePreparationDiagnostic(raw:unknown):HomePreparationDiagnostic|null{
 const value=obj(raw);if(!value||Object.keys(value).some(key=>!['reason','field','optionCount','missingFieldCount'].includes(key))||!homePreparationReasons.includes(value.reason as HomePreparationReason)||!investigationDiagnosticFields.includes(value.field as InvestigationDiagnosticField)||!Number.isInteger(value.optionCount)||Number(value.optionCount)<0||Number(value.optionCount)>4||!Number.isInteger(value.missingFieldCount)||Number(value.missingFieldCount)<0||Number(value.missingFieldCount)>4)return null;
 return {reason:value.reason as HomePreparationReason,field:value.field as InvestigationDiagnosticField,optionCount:Number(value.optionCount),missingFieldCount:Number(value.missingFieldCount)};
}
export function inspectHomeCandidateProposal(raw:unknown,pack:CandidatePack|null|undefined):{proposal:HomeCandidateProposal|null;diagnostic:HomePreparationDiagnostic}{
 const value=obj(raw),optionCount=Array.isArray(value?.options)?Math.min(value.options.length,4):0;
 const missingFieldCount=value?['problem','problem_evidence','options','question'].filter(key=>value[key]===undefined).length:4;
 const result=(reason:HomePreparationReason,proposal:HomeCandidateProposal|null=null,field:InvestigationDiagnosticField='none')=>({proposal,diagnostic:{reason,field,optionCount,missingFieldCount}});
 if(!value||value.version!==2)return result('invalid_envelope',null,'proposal');
 if(missingFieldCount)return result('missing_fields');
 if(value.problem===null&&Array.isArray(value.problem_evidence)&&value.problem_evidence.length===0&&Array.isArray(value.options)&&value.options.length===0&&value.question===null)return result('empty');
 if(typeof value.problem!=='string'||!value.problem.trim()||value.problem.length>240||!nonquantitativeProblem(value.problem))return result('invalid_problem',null,'problem');
 if(value.question!==null&&(typeof value.question!=='string'||!value.question.trim()||value.question.length>200||(value.question.match(/\?/g)?.length??0)>1))return result('invalid_question',null,'question');
 if(!Array.isArray(value.options))return result('invalid_options',null,'options');
 if(value.options.length>3)return result('too_many_options',null,'options');
 if(!pack||!Array.isArray(pack.sources))return result('evidence_unavailable');
 if(!value.options.length&&!value.question)return result('no_options_or_question');
 const inspected=inspectInvestigationProposal(value,pack);
 return result(inspected.reason,inspected.proposal,inspected.field);
}
export function readHomeCandidateProposal(raw:unknown,pack:CandidatePack|null|undefined){return inspectHomeCandidateProposal(raw,pack).proposal}
export function readHomeCandidateRecord(raw:unknown,goalId:string,goal:string,pack:CandidatePack):HomeCandidateRecord|null{return readInvestigationRecord(raw,goalId,goal,candidateSourceKey(pack),pack)}
export function candidateSelectionGoal(raw:unknown){const value=obj(raw)?.selectionGoal;return typeof value==='string'&&value.length<=12000?value:null}
