// Output-only bindings to the existing Home evidence packet. Never persisted as chat actions.
// @ts-expect-error Native Node tests share TypeScript source.
import {actionEvidenceCatalog,plain,exactKeys} from './home-action-proposal.ts';
export type HomeFindingFollowup={id:string;text:string;evidence:string[];prompt:string};
const lineText=(value:unknown,max:number):value is string=>typeof value==='string'&&value.trim()===value&&value.length>0&&value.length<=max&&!/[\p{Cc}\p{Cf}*_`<>|\\]/u.test(value)&&!value.includes('](');
export function buildHomeFindingSchema(pack:unknown){
 const ids=actionEvidenceCatalog(pack).map(item=>item.id);
 return {type:'array',maxItems:ids.length?4:0,items:ids.length?{type:'object',additionalProperties:false,required:['id','text','evidence','prompt'],properties:{
  id:{type:'string',enum:['f1','f2','f3','f4']},text:{type:'string',minLength:1,maxLength:280,description:'Exact plain-text body of one unique answer bullet, excluding its leading dash. Include its source citations and material limitations.'},
  evidence:{type:'array',minItems:1,maxItems:3,items:{type:'string',enum:ids}},prompt:{type:'string',minLength:1,maxLength:240,description:'One focused follow-up question exploring this finding using the supplied aggregate evidence. No promised unavailable drilldown or causal/effect conclusion.'},
 }}:{type:'null'}};
}
/** Missing/invalid metadata fails closed without discarding the ordinary answer. */
export function readHomeFindingFollowups(raw:unknown,answer:string,pack:unknown):HomeFindingFollowup[]{
 if(!Array.isArray(raw)||raw.length>4||typeof answer!=='string'||answer.length>12000)return [];
 const catalog=new Map(actionEvidenceCatalog(pack).map(item=>[item.id,item])),ids=new Set<string>(),texts=new Set<string>(),prompts=new Set<string>(),result:HomeFindingFollowup[]=[];
 const lines=answer.split('\n');
 for(const value of raw){
  const item=plain(value);
  if(!item||!exactKeys(item,['id','text','evidence','prompt'])||typeof item.id!=='string'||!/^f[1-4]$/.test(item.id)||!lineText(item.text,280)||!lineText(item.prompt,240)||ids.has(item.id)||texts.has(item.text)||prompts.has(item.prompt))return [];
  // The designated line must occur once, exactly. No inference from arbitrary Markdown.
  if(lines.filter(line=>line===`- ${item.text}`).length!==1||answer.split(item.text).length!==2)return [];
  if(!Array.isArray(item.evidence)||!item.evidence.length||item.evidence.length>3||new Set(item.evidence).size!==item.evidence.length||item.evidence.some(id=>typeof id!=='string'||!catalog.has(id)))return [];
  const sourceIds=new Set(item.evidence.map(id=>catalog.get(id)!.sourceId)),citations=new Set([...item.text.matchAll(/\[([A-Z]+\d+)\]/g)].map(match=>match[1]));
  if(citations.size!==sourceIds.size||[...sourceIds].some(id=>!citations.has(id)))return [];
  ids.add(item.id);texts.add(item.text);prompts.add(item.prompt);
  result.push({id:item.id,text:item.text,evidence:[...item.evidence],prompt:item.prompt});
 }
 return result;
}
export function homeFindingInstructions(pack:unknown){
 return `In finding_followups, optionally designate up to four supported findings already present in answer. Do not create extra findings or force four. Each item has one unique id f1–f4, exact text, evidence IDs, and one specific concise prompt (aim for 60–140 characters; maximum 240). Its text must be the exact plain-text body of one unique '- ' answer bullet (up to 280 characters), including source citations such as [A1] and material uncertainty/scope/limited-sample caveats. Use no inline Markdown or navigation links inside a designated bullet; other answer text keeps normal formatting and source links. The set of cited source IDs in text must equal the sources referenced by evidence. Each prompt explores only that finding using current supplied aggregate evidence; keep limited coverage explicit, do not promise unavailable segments or individual data, infer causes, forecast effects, or request operational changes. References indicate recorded context, not proof of relevance or causality. Do not repeat finding text elsewhere. Keep answer within its existing word target; the additional JSON fields are compact metadata, not extra explanation. Return [] for unsupported/unavailable evidence, non-findings, or when exact pairing cannot be maintained. These output references address already-supplied packet locations; no extra data is requested:\n${actionEvidenceCatalog(pack).map(item=>`${item.id} = ${item.sourceId} ${item.location}`).join('\n')}`;
}
export function buildHomeFindingPrompt(item:HomeFindingFollowup){
 return `Explore this finding: ${item.text}\nFollow-up question: ${item.prompt}\nUse only the current supplied Home evidence. Preserve source scope, sampled coverage and uncertainty; say when a requested breakdown is unavailable. Do not infer causes, individual risk, retention effects or approval, change saved assumptions, or calculate automatically.`;
}
