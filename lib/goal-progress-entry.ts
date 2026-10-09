/** Reviewable interpretations only. A proposal is never an observation. */
// @ts-expect-error Native Node tests share TypeScript source.
import {assertSolutionShape} from './home-solution-conversation-schema.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {HEADCOUNT_DEFINITION,appendGoalProgressEvent,progressDay,readGoalProgressLedger,type GoalScope,type GoalProgressLedger,type ProgressEvent} from './goal-progress.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {readGoalProgressConversation,type GoalProgressInput} from './goal-progress-conversation.ts';
type Schema=Parameters<typeof assertSolutionShape>[1];
const string=(maxLength=160):Schema=>({type:'string',minLength:1,maxLength});
const nullable=(s:Schema):Schema=>({anyOf:[s,{type:'null'}]});
const object=(properties:Record<string,Schema>):Schema=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const amount:Schema={type:'integer',minimum:0,maximum:1e9};
export type ProgressEntrySpec={metric:string|null;definition:string|null;unit:string|null;scope:GoalScope|null;measurement:{direction:'increase'|'decrease'|'maintain'|'ceiling'|null;targetValue:number|null;targetDate:string|null;maxAgeDays:number|null;baselineId:string|null}|null;observation:{value:number|null;date:string|null;complete:boolean|null;supersedes:string|null;useAsBaseline:boolean}|null;basis:{turnId:string;quote:string}[]};
export const progressEntrySpecSchema=object({metric:nullable(string(80)),definition:nullable(string()),unit:nullable(string(40)),scope:nullable(object({country:string(100),org:string(100),level:string(100)})),measurement:nullable(object({direction:nullable({type:'string',enum:['increase','decrease','maintain','ceiling']}),targetValue:nullable(amount),targetDate:nullable(string(10)),maxAgeDays:nullable({type:'integer',minimum:1,maximum:365}),baselineId:nullable(string(80))})),observation:nullable(object({value:nullable(amount),date:nullable(string(10)),complete:nullable({type:'boolean'}),supersedes:nullable(string(80)),useAsBaseline:{type:'boolean'}})),basis:{type:'array',minItems:1,maxItems:8,items:object({turnId:string(80),quote:string(1200)})}});
export const goalProgressProposalTool={type:'function' as const,name:'propose_goal_progress',strict:true,description:'Prepare or revise a user-reported headcount measurement/dated observation for explicit UI review. No ledger write. Use null for unknown metric, unit, scope, value or date; never infer actuals from a plan or dataset. Returns unresolved fields and exact proposal.',parameters:object({spec:progressEntrySpecSchema})};
export const progressEntryResponseFormat={type:'json_schema' as const,name:'goal_progress_conversation_v1',strict:true,schema:object({answer:string(10000),progressProposal:nullable(progressEntrySpecSchema)})};
export type ProgressEntryTurn={id:string;text:string};
export type ProgressEntryProposal={version:1;id:string;createdAt:string;requestId:string;goalId:string;goal:string;datasetToken:string;ledgerDigest:string;previousId:string|null;spec:ProgressEntrySpec;sourceTurns:ProgressEntryTurn[];blocking:string[]};
export type ProgressEntryState={version:1;proposal:ProgressEntryProposal;status:'draft'|'confirmed'|'cancelled';confirmedAt:string|null};
export type ProgressEntryContext={input:GoalProgressInput;goal:string;requestId:string;turns:ProgressEntryTurn[];previous:ProgressEntryState|null;now:string};
export const progressEntryField='goalProgressEntryV1';
export const sameProgressEntry=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const sameScope=(a:GoalScope|null,b:GoalScope)=>!!a&&a.country===b.country&&a.org===b.org&&a.level===b.level;
const canonical=(v:unknown):unknown=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,value])=>[k,canonical(value)])):v;
export async function progressEntryDigest(value:unknown){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(canonical(value)))))].map(n=>n.toString(16).padStart(2,'0')).join('');}
const validId=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(v);
const instant=(v:unknown):v is string=>typeof v==='string'&&/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v.slice(0,10);
export function readProgressEntryState(raw:unknown):ProgressEntryState|null{
 if(raw==null)return null;
 const state=raw as ProgressEntryState,p=state?.proposal;
 if(!state||Object.keys(state).sort().join()!=='confirmedAt,proposal,status,version'||state.version!==1||!['draft','confirmed','cancelled'].includes(state.status)||!(state.confirmedAt===null||instant(state.confirmedAt))||(state.status==='confirmed')!==(state.confirmedAt!==null)||!p||Object.keys(p).sort().join()!=='blocking,createdAt,datasetToken,goal,goalId,id,ledgerDigest,previousId,requestId,sourceTurns,spec,version'||p.version!==1||!validId(p.id)||!validId(p.requestId)||!validId(p.goalId)||!instant(p.createdAt)||typeof p.goal!=='string'||!p.goal.trim()||p.goal.length>240||typeof p.datasetToken!=='string'||!/^[a-f0-9]{64}$/.test(p.ledgerDigest)||!(p.previousId===null||validId(p.previousId))||!Array.isArray(p.sourceTurns)||p.sourceTurns.length>8||p.sourceTurns.some(t=>!validId(t.id)||typeof t.text!=='string'||!t.text.trim()||t.text.length>1200)||!Array.isArray(p.blocking)||p.blocking.length>20||p.blocking.some(b=>typeof b!=='string'||b.length>500)||JSON.stringify(state).length>20000)throw Error('Saved progress draft could not be verified. It is preserved.');
 assertSolutionShape(p.spec,progressEntrySpecSchema,'progress proposal');return structuredClone(state);
}
export function progressEntryCommands(p:ProgressEntryProposal,ledger:GoalProgressLedger,at:string,digest:string):ProgressEvent[]{
 const s=p.spec,m=s.measurement,o=s.observation,current=ledger.events.filter(e=>e.kind==='measurement').at(-1);
 const lineageId='user-reported:'+p.goalId,commands:ProgressEvent[]=[];
 if(o){commands.push({id:'entry-observation-'+p.id,kind:'observed',at,supersedes:o.supersedes,data:{metric:s.metric!,definition:s.definition!,unit:s.unit!,scope:s.scope!,period:{kind:'point',start:o.date!,end:o.date!},value:o.value,quality:{complete:o.complete!,suppressed:false,denominatorRequired:false,denominator:null},source:{classification:'user-reported',datasetToken:p.datasetToken,releaseId:'user-report-'+p.id,releaseDigest:digest,lineageId},capturedAt:at}});}
 if(m){commands.push({id:'entry-measurement-'+p.id,kind:'measurement',at,supersedes:current?.id??null,data:{metric:s.metric!,definition:s.definition!,unit:s.unit!,direction:m.direction!,scope:s.scope!,lineageId,baselineId:o?.useAsBaseline?'entry-observation-'+p.id:m.baselineId,target:{value:m.targetValue!,date:m.targetDate!},maxAgeDays:m.maxAgeDays!,provenance:'User-confirmed conversational interpretation; unverified user report. Proposal '+p.id}});}
 return commands;
}
export function progressEntryIssues(s:ProgressEntrySpec,ledger:GoalProgressLedger,day:string){
 const issues:string[]=[];const current=ledger.events.filter(e=>e.kind==='measurement').at(-1),m=s.measurement,o=s.observation;
 if(s.metric!=='headcount'||s.definition!==HEADCOUNT_DEFINITION||s.unit!=='people')issues.push('Metric, definition and unit must be resolved: only active point-in-time headcount in people has an assessment adapter.');
 if(!s.scope||!/^(all|[A-Z]{2})$/.test(s.scope.country)||!/^(all|BU-[A-Z0-9_-]+)$/.test(s.scope.org)||!/^(all|[A-Z][A-Z0-9_-]{0,39})$/.test(s.scope.level))issues.push('Specify the goal population using explicit country, business-unit and level codes, or all. Page filters cannot supply it.');
 if(!m&&!o)issues.push('Clarify whether to define a measurement or report a dated observation.');
 if(m&&(m.direction===null||m.targetValue===null||!progressDay(m.targetDate)||m.maxAgeDays===null))issues.push('Clarify the target value, direction, target date and freshness policy.');
 if(o&&(o.value===null||!progressDay(o.date)||o.complete===null))issues.push('Clarify the reported headcount, observation date and whether it covers the complete saved scope.');
 if(o?.date&&progressDay(o.date)&&o.date>day)issues.push('A user-reported observation cannot be future-dated.');
 if(o?.useAsBaseline&&!m)issues.push('Review a measurement revision explicitly to change its baseline.');
 if(!m&&o&&(!current||!sameScope(s.scope,current.data.scope)||s.metric!==current.data.metric||s.definition!==current.data.definition||s.unit!==current.data.unit||current.data.lineageId!=='user-reported:'+ledger.goalId))issues.push('Review a matching user-reported measurement first; recorded dataset evidence cannot be silently mixed with reports.');
 if(o?.supersedes){const old=ledger.events.find(e=>e.id===o.supersedes&&e.kind==='observed');if(old?.kind!=='observed'||old.data.source.classification!=='user-reported'||!sameScope(s.scope,old.data.scope)||ledger.events.some(e=>e.supersedes===old.id&&e.kind==='observed'))issues.push('A correction must name a current user-reported observation in the same scope.');}
 let baseline=m?.baselineId?ledger.events.find(e=>e.id===m.baselineId&&e.kind==='observed'):undefined;
 while(baseline){const next=ledger.events.find(e=>e.kind==='observed'&&e.supersedes===baseline!.id);if(!next)break;baseline=next;}
 if(m?.baselineId&&(baseline?.kind!=='observed'||baseline.data.source.classification!=='user-reported'||baseline.data.source.lineageId!=='user-reported:'+ledger.goalId||!sameScope(s.scope,baseline.data.scope)||baseline.data.metric!==s.metric||baseline.data.definition!==s.definition||baseline.data.unit!==s.unit))issues.push('Select a compatible user-reported baseline; dataset observations keep their separate provenance.');
 const baselineDate=o?.useAsBaseline?o.date:baseline?.kind==='observed'?baseline.data.period.end:null;
 if(m&&baselineDate&&m.targetDate&&baselineDate>=m.targetDate)issues.push('The target date must follow the baseline date.');
 return issues;
}
export async function createProgressEntryProposal(raw:unknown,c:ProgressEntryContext):Promise<ProgressEntryProposal>{
 assertSolutionShape(raw,progressEntrySpecSchema,'progress proposal');const spec=structuredClone(raw) as ProgressEntrySpec;
 if(!validId(c.requestId)||!instant(c.now)||!c.goal.trim()||c.goal.length>240)throw Error('A current saved goal and request clock are required.');
 const read=readGoalProgressConversation(c.input,{goalId:c.input.goalId,datasetToken:c.input.datasetToken,asOf:c.now.slice(0,10)});if(!read.context)throw Error('Saved progress is unavailable; resolve storage before proposing an entry.');
 const ledger=readGoalProgressLedger(c.input.ledger,c.input.goalId),previous=readProgressEntryState(c.previous);
 if(previous&&(previous.proposal.goalId!==c.input.goalId||previous.proposal.datasetToken!==c.input.datasetToken))throw Error('Progress draft belongs to another workspace.');
 const turns=[...(previous?.proposal.sourceTurns??[]),...c.turns],sourceTurns=spec.basis.map(b=>{if(!validId(b.turnId)||!turns.some(t=>t.id===b.turnId&&t.text.includes(b.quote)))throw Error('A progress interpretation requires a quoted user turn; assistant and plan text are not observations.');return {id:b.turnId,text:b.quote};});
 const ledgerDigest=await progressEntryDigest([c.input.goalId,c.goal,c.input.datasetToken,ledger]);
 const identity={requestId:c.requestId,goalId:c.input.goalId,goal:c.goal,datasetToken:c.input.datasetToken,ledgerDigest,previousId:previous?.proposal.id??null,spec,sourceTurns};
 const p:ProgressEntryProposal={version:1,id:(await progressEntryDigest(identity)).slice(0,32),createdAt:c.now,...identity,blocking:progressEntryIssues(spec,ledger,c.now.slice(0,10))};
 if(!p.blocking.length)try{let next=ledger;for(const event of progressEntryCommands(p,ledger,c.now,await progressEntryDigest(p.spec)))next=appendGoalProgressEvent(next,event);}catch(error){p.blocking.push(error instanceof Error?error.message:'This entry requires clarification.');}
 return p;
}
export async function verifyProgressEntryProposal(raw:unknown,c:ProgressEntryContext){
 const p=readProgressEntryState({version:1,proposal:raw,status:'draft',confirmedAt:null})!.proposal;
 const expected=await createProgressEntryProposal(p.spec,{...c,now:p.createdAt});
 if(!sameProgressEntry(p,expected))throw Error('The progress proposal no longer matches this request.');return p;
}
export const progressEntryInstructions=`CONVERSATIONAL PROGRESS ENTRY: An optional proposed interpretation can define a saved goal's measurement and/or a dated user-reported observation. Offer it only when the user asks to record, define or correct progress; browsing, plan selection, assistant messages, dataset facts and scenarios never authorize observations. No phrase or command wording is required. Use propose_goal_progress when offered; otherwise use the optional progressProposal structured field. Both only draft; the user must review the exact card and click Confirm progress entry. Never say it has already been saved. Revisions replace the draft; corrections explicitly name supersedes and keep history. A quoted user-turn reference supports interpretation, not source verification. Copy actual supplied user turn IDs and exact brief quotes; never cite assistant or plan text. User reports are unverified and browser-local, never recorded or source-verified dataset evidence. Do not invent actual values or infer them from intent, forecasts or plans. Unknown metric, definition, unit, scope or dates must stay null and be clarified naturally; never silently use page filters or today's date. Only headcount / active-employees-point-in-time-v1 / people is supported. Reuse an explicitly known saved measurement when appropriate; do not convert rates or other metrics into headcount. measurement=null preserves the saved definition; observation=null proposes no observation. A measurement includes target, date, direction, explicit freshness days and existing user-reported baselineId or null. An observation needs a reported value, date, completeness and explicit correction ID or null; useAsBaseline requires an explicit measurement revision. Do not join user-reported baselines to recorded dataset releases. Explain missing inputs with one focused conversational question. Drafts with unknowns cannot be confirmed. Forecast, success probability and completion remain unavailable; dated comparisons and pace are arithmetic only.`;
