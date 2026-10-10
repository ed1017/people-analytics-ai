import type {ChatMessage} from './types';
import type {SolutionState,SolutionEvaluation} from './home-solution-conversation';

/** Presentation only: never changes checked candidates, revisions or saved state. */
export function solutionReviewPresentation(state:SolutionState){
 const current=[...new Map(state.working.map(item=>[item.id,item])).values()].filter(item=>!state.rejected.some(rejected=>rejected.candidateId===item.id&&rejected.revision===item.revision));
 const focused=current.find(item=>item.id===state.focusCandidateId);
 const requestId=focused?.requestId??state.working.at(-1)?.requestId;
 const active=current.filter(item=>item.requestId===requestId);
 const evaluatedIds=new Set(state.working.filter(item=>item.requestId===requestId).map(item=>item.id));
 const recommended=focused??(active.length===1&&evaluatedIds.size===1?active[0]:null);
 return {recommended,alternatives:active.filter(item=>item!==recommended),earlier:current.filter(item=>!active.includes(item))};
}

function heading(line:string){
 const atx=line.trim().match(/^(#{1,6})\s+(.+?)\s*#*$/);
 const bold=line.trim().match(/^\*\*(.+?)\*\*:?$/);
 if(atx)return {level:atx[1].length,text:atx[2].replace(/^\*\*|\*\*$/g,'')};
 if(bold&&!/^\d+[.)]\s/.test(bold[1]))return {level:6,text:bold[1]};
 if(planTitle(line.trim()))return {level:6,text:line.trim()};
 return null;
}
const planTitle=(value:string)=>/^(?:(?:proposed|recommended)\s+)?action plan(?:\s+\d+)?(?:\s*[:—–-].*)?\s*:?$/i.test(value);
function steps(block:string){
 const text=block.trim();
 // Labels alone do not establish that a list contains actions. Fold only an
 // explicit step/owner table or list items that each carry an owner field.
 // Ambiguous lists (including numbered caveats) remain visible verbatim.
 if(/^\|[^\n]*\b(?:step|action|activity)\b[^\n]*\|/i.test(text))return /^\|[^\n]*\bowner\b[^\n]*\|/i.test(text);
 const marker=/^\s*(?:#{1,6}\s+)?(?:\*\*)?(?:\d+[.)]|[-*])\s+/gm;
 const matches=[...text.matchAll(marker)];
 if(!matches.length||matches[0].index!==0)return false;
 return matches.every((match,index)=>{
  const item=text.slice(match.index!+match[0].length,matches[index+1]?.index??text.length);
  return !/^(?:\*\*)?(?:suggested\s+)?owner\s*:/i.test(item)&&/\b(?:suggested\s+)?owner\s*:/i.test(item);
 });
}

/** Only explicit plan step blocks are folded. Unlabelled prose, explanations,
 * caveats and alternative sections stay verbatim. No semantic/fuzzy matching. */
export function splitPlanDiscussion(answer:string){
 const lines=answer.split('\n'),visible:string[]=[],reference:string[]=[];
 for(let index=0;index<lines.length;){
  const title=heading(lines[index]);
  if(!title||!planTitle(title.text)){visible.push(lines[index++]);continue;}
  let end=index+1;
  while(end<lines.length){const next=heading(lines[end]);if(next&&!/^\d+[.)]\s/.test(next.text))break;end++;}
  const body=lines.slice(index+1,end).join('\n'),blocks=body.split(/\n\s*\n/);
  if(!blocks.some(steps)){visible.push(...lines.slice(index,end));index=end;continue;}
  reference.push(lines[index]);
  for(const block of blocks){if(steps(block))reference.push(block);else visible.push(block);}
  index=end;
 }
 return {discussion:visible.join('\n').trim(),reference:reference.join('\n\n').trim()};
}

export type PlanDiscussion={discussion:string;reference:string;proposals:SolutionEvaluation[]};
/** Pair by both user and assistant turn, backwards and once only. Identical
 * replies, discard events and revised candidates cannot borrow another turn's card. */
export function solutionDiscussionPresentations(messages:ChatMessage[],state:SolutionState):Map<ChatMessage,PlanDiscussion>{
 const result=new Map<ChatMessage,PlanDiscussion>();let cursor=state.turns.length-1;
 for(let index=messages.length-1;index>0;index--){
  const message=messages[index],previous=messages[index-1];
  if(message.role!=='assistant'||previous.role!=='user')continue;
  let matched=-1;
  for(let n=cursor;n>0;n--)if(state.turns[n].role==='assistant'&&state.turns[n].text===message.content&&state.turns[n-1].role==='user'&&state.turns[n-1].text===previous.content){matched=n;break;}
  if(matched<0)continue;
  cursor=matched-2;const turn=state.turns[matched-1];
  const proposals=[...new Map(state.working.filter(item=>item.message.id===turn.id).map(item=>[item.id,item])).values()];
  if(!proposals.length)continue;
  const split=splitPlanDiscussion(message.content);
  if(split.reference)result.set(message,{...split,proposals});
 }
 return result;
}
