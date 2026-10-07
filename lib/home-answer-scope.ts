import {normalizeHomePack} from './home-pack.mjs';
/** Reject clear source/filter contradictions rather than rewriting a model's factual claim.
 * Canonical source scopes are authoritative. This conservative check is not a factual verifier.
 */
export function homeAnswerScopeViolation(answer:string,raw:unknown):boolean {
 const pack=normalizeHomePack(raw),selected=(pack.workforceScope??'').replace(/Selected workforce snapshot:\s*/gi,'').split(/[;/]/).map((part:string)=>part.trim().replace(/^(?:country|business unit|level):\s*/i,'' )).filter((part:string)=>part&&!/^all\b|^(?:synthetic|scope unavailable)$/i.test(part));
 const labels=new Set<string>(selected);if(selected.some((part:string)=>/^(?:United States|USA|US|U\.S\.)$/i.test(part)))for(const label of ['United States','U.S.','US','U.S.-scoped','US-scoped'])labels.add(label);
 const escape=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const company=new Set(pack.sources.filter((source:{id:string;scope:string})=>source.id!=='W1'&&/^Company\b/i.test(source.scope)).map((source:{id:string})=>source.id));
 for(const clause of answer.split(/\n|;|(?<=[.!?])\s+(?=[A-Z])/)){
  const citations=[...clause.matchAll(/\[([A-Z]\d)(?:[.:][^\]]*)?\]/gi)].map(match=>match[1].toUpperCase());if(!citations.some(id=>company.has(id)))continue;
  if(![...labels].some(label=>new RegExp('(?<![A-Za-z])'+escape(label)+'(?![A-Za-z])','i').test(clause)))continue;
  // Explicit source limitations and comparisons must remain possible.
  if(/\b(?:unavailable|unsupported|cannot (?:establish|determine|infer|provide)|not (?:country|US|U\.S|specific|filtered)|does not (?:apply|represent)|company-wide|company wide|global)\b/i.test(clause))continue;
  if(/\d|\b(?:scenario|forecast|turnover|exits|headcount|hiring|skills?|respondents|favorable|satisfaction|baseline)\b/i.test(clause))return true;
 }
 return false;
}
