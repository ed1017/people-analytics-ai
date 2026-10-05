/** Local intent only: source spans refer to user text, never an assistant reply or evidence. */
export type UserGoalIntent={
 status:'explicit_outcome'|'needs_review'|'no_goal';
 goal:string|null;
 source:{statement:number;start:number;end:number;text:string}|null;
 contextStart:number;
 reason:'outcome'|'uncertain'|'ambiguous'|'incomplete'|'oversized'|'withdrawn'|'none';
};
const verbs=/^(?:reduce|lower|decrease|cut|increase|improve|build|develop|add|hire|retain|replace|strengthen|expand|create|implement|launch)\b\s*/i;
const label=/^(?:synthetic planning test|(?:my |our )?goal|outcome):\s*/i;
const revision=/^(?:actually[, :]\s*|instead[, :]\s*|(?:change|replace|revise|update)\s+(?:(?:my|our|the)\s+)?goal\s*(?:to|with|:)\s*)/i;
const withdrawal=/^(?:(?:actually|please)[, ]\s*)?(?:(?:do not|don't|don’t)\s+(?:pin|save|use|make)\b[^.!?]*(?:goal|that|this)|(?:cancel|forget|withdraw|drop)\s+(?:(?:my|our|the|that|this)\s+)?goal\b|(?:i|we)\s+(?:no longer|do not|don't|don’t)\s+(?:want|need)\s+(?:that|this|the|my|our)\s+goal\b)/i;
const generic=/^(?:help|advice|ideas|something|information|analysis|a plan|an action plan|a strategy|to (?:know|understand|find out|decide|explore|investigate))\b/i;
const substantive=(text:string)=>!!text.replace(/[.!?]+$/,'').trim()&&!/^(?:it|this|that|something|a plan|an action plan|the plan|a strategy|the strategy)$/i.test(text.replace(/[.!?]+$/,'').trim());
function classify(raw:string):{kind:'outcome'|'review'|'none';reason:UserGoalIntent['reason'];revised:boolean}{
 const revised=revision.test(raw),text=raw.replace(revision,'').replace(label,'').trim();
 if(/^(?:i|we)\s+(?:no longer|do not|don't|don’t)\s+(?:want|need)\b/i.test(text))return {kind:'review',reason:'uncertain',revised};
 const labelled=label.test(raw.replace(revision,''));
 const request=text.match(/^(?:(?:please\s+)?help\s+(?:me|us)\s+(?:to\s+)?|(?:i|we)(?:\s+would|['’]d)\s+like\s+(?:to\s+)?|(?:i|we)\s+(?:need|want)\s+(?:to\s+)?)/i);
 const question=text.match(/^(?:can|could|should)\s+(?:we|i)\s+/i);
 const outcome=text.slice(request?.[0].length??question?.[0].length??0);
 if(generic.test(outcome)||/^(?:know|understand|find out|decide|choose|explore|investigate|review|explain|compare)\b/i.test(outcome))return {kind:'none',reason:'none',revised};
 const verb=outcome.match(verbs);
 if(request&&/\bhelp\b/i.test(request[0])&&!verb)return {kind:'none',reason:'none',revised};
 if(request&&/\bto\s+$/i.test(request[0])&&!verb)return {kind:'review',reason:'uncertain',revised};
 if(!verb&&!request&&!labelled)return {kind:'none',reason:'none',revised};
 if(/^(?:not|never|no longer)\b/i.test(outcome))return {kind:'review',reason:'uncertain',revised};
 if(!substantive(outcome.slice(verb?.[0].length??0)))return {kind:'review',reason:'incomplete',revised};
 // Alternatives need review even when they use nouns rather than repeated verbs.
 if(/\bor\b|\bwhether\b|\band\s+(?:reduce|increase|improve|build|develop|add|hire|retain|replace|strengthen|expand|create)\b/i.test(outcome))return {kind:'review',reason:'ambiguous',revised};
 if(question||text.includes('?'))return {kind:'review',reason:'uncertain',revised};
 if(raw.length>240)return {kind:'review',reason:'oversized',revised};
 return {kind:'outcome',reason:'outcome',revised};
}
export function readUserGoalIntent(statements:readonly string[]):UserGoalIntent{
 let result:UserGoalIntent={status:'no_goal',goal:null,source:null,contextStart:0,reason:'none'};
 for(let statement=0;statement<statements.length;statement++){
  const original=statements[statement];
  if(typeof original!=='string')continue;
  let offset=0,found=0;
  for(const part of original.split(/(?<=[.!?])\s+|[\n\r]+/)){
   const start=original.indexOf(part,offset),raw=part.trim(),trimmedStart=start+part.indexOf(raw);offset=start+part.length;
   if(!raw)continue;
   if(withdrawal.test(raw)){result={status:'no_goal',goal:null,source:null,contextStart:statement,reason:'withdrawn'};found=0;continue;}
   const parsed=classify(raw);
   if(parsed.kind==='none')continue;
   found++;
   const source={statement,start:trimmedStart,end:trimmedStart+raw.length,text:raw};
   const ambiguous=found>1&&!parsed.revised;
   const sameOutcome=result.status==='explicit_outcome'&&result.goal?.replace(/[.!]$/,'').toLowerCase()===raw.replace(label,'').replace(/[.!]$/,'').toLowerCase();
   const contextStart=result.status==='no_goal'&&result.reason==='none'||sameOutcome&&!parsed.revised?result.contextStart:statement;
   result={status:parsed.kind==='review'||ambiguous?'needs_review':'explicit_outcome',goal:null,source,contextStart,reason:ambiguous?'ambiguous':parsed.reason};
   if(result.status==='explicit_outcome')result.goal=raw.replace(label,'');
  }
  // Keep a complete bounded statement, including its explicit constraints/name, when it has one outcome.
  if(found===1&&result.status==='explicit_outcome'&&result.source?.statement===statement&&result.source.start===original.indexOf(original.trim())&&original.trim().length<=240&&!/[?\n\r]/.test(original)){
   result.goal=original.trim().replace(label,'');
   const start=original.indexOf(original.trim());result.source={statement,start,end:start+original.trim().length,text:original.trim()};
  }
 }
 return result;
}
