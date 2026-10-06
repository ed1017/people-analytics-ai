import type {HomeCandidateProposal} from './home-candidate-options';
/** A wording-only rewrite is not another issue. Require a changed focus and evidence set. */
export function isDifferentHomeIssue(previous:HomeCandidateProposal,next:HomeCandidateProposal){
 const words=(text:string)=>new Set(text.toLowerCase().match(/[a-z]{4,}/g)?.filter(word=>!['investigate','review','workforce','signals','employee','employees','understand','explore','identify','issue','problem','improve','across','within','using','based'].includes(word))??[]);
 const before=words(previous.problem),after=words(next.problem);
 const newFocus=[...after].filter(word=>!before.has(word)).length;
 const evidence=new Set(previous.problem_evidence);
 return newFocus>=2&&next.problem_evidence.some(reference=>!evidence.has(reference));
}
