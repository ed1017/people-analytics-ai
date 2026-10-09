// @ts-expect-error Native Node fixtures share TypeScript source.
import {createProgressEntryProposal,readProgressEntryState,progressEntryResponseFormat,progressEntryInstructions,goalProgressProposalTool,type ProgressEntryContext} from './goal-progress-entry.ts';
// @ts-expect-error Native Node fixtures share TypeScript source.
import {assertSolutionShape} from './home-solution-conversation-schema.ts';
// @ts-expect-error Native Node fixtures share TypeScript source.
import {readGoalProgressConversation,goalProgressConversationInstructions,goalProgressReadTool,type GoalProgressInput} from './goal-progress-conversation.ts';
// @ts-expect-error Native Node fixtures share TypeScript source.
import {normalizeGoalContext,goalContextInstructions as baseGoalContextInstructions} from './goal-context.ts';

/** Shared model additions; activation and dataset binding belong to the caller. */
export function progressModelContract(enabled:boolean,entryEnabled=enabled){return {
 instructions:enabled?'\n'+goalProgressConversationInstructions+'\n'+(entryEnabled?progressEntryInstructions:'Progress entry is unavailable for this request. Explain the saved-goal clarification; discussion does not record progress.'):'',
 tools:enabled?[goalProgressReadTool,...(entryEnabled?[goalProgressProposalTool]:[])]:[],
};}
/** Both section adapters use the same checked context, exclusions and decoder. */
export function prepareProgressConversation(body:Record<string,unknown>|null|undefined,{enabled,datasetToken,now}:{enabled:boolean;datasetToken:string;now:string}){
 const progress=enabled&&body?.summaryOnly!==true&&body?.page!=='home'?readGoalProgressConversation(body?.goalProgress,{goalId:typeof body?.goalId==='string'?body.goalId:'',datasetToken,asOf:now.slice(0,10)}):undefined;
 const entryContext=progress?.context?readProgressEntryRequest(body?.progressEntry,body?.goalProgress,normalizeGoalContext(body?.goalContext).goal,typeof body?.message==='string'?body.message:'',now):undefined;
 const goalContext={...normalizeGoalContext(body?.goalContext),...(progress?{savedGoalProgress:progress}:{}),...(entryContext?{progressEntryDraft:entryContext.previous,currentProgressUserTurn:entryContext.turns.at(-1)}:{})};
 const instructions=baseGoalContextInstructions+(progress?'\n'+goalProgressConversationInstructions:'')+(entryContext?'\n'+progressEntryInstructions:'');
 const format=entryContext?{text:{format:progressEntryResponseFormat}}:{};
 const reply=(text:string,status?:string)=>{if(entryContext&&status!=='completed')throw Error('Progress interpretation is incomplete; no entry was prepared.');return finishProgressEntryReply(text,entryContext);};
 return {progress,entryContext,goalContext,instructions,format,reply};
}
export const missingProgressPageInstructions='Current page evidence is unavailable. Use only the supplied saved-goal progress and user context. No page facts, tools, automatic source lookup or calculations. Answer qualitatively and use the optional conversational clarification if essential.';
export function progressEntryPacket(c:ProgressEntryContext){return {version:1,requestId:c.requestId,turn:c.turns.at(-1)!,previous:c.previous};}
export function readProgressEntryRequest(raw:unknown,input:unknown,goal:string,message:string,now:string):ProgressEntryContext|undefined{
 if(raw===undefined)return undefined;
 const value=raw as ReturnType<typeof progressEntryPacket>;
 if(!value||Object.keys(value).sort().join()!=='previous,requestId,turn,version'||value.version!==1||typeof value.requestId!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(value.requestId)||!value.turn||Object.keys(value.turn).sort().join()!=='id,text'||typeof value.turn.id!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(value.turn.id)||typeof value.turn.text!=='string'||!value.turn.text.trim()||value.turn.text.length>12000||!message.includes(value.turn.text))throw Error('The progress request is not bound to the current user turn.');
 return {input:input as GoalProgressInput,goal,requestId:value.requestId,turns:[value.turn],previous:readProgressEntryState(value.previous),now};
}
export async function finishProgressEntryReply(text:string,context:ProgressEntryContext|undefined){
 if(!context)return {answer:text};
 const value=JSON.parse(text);assertSolutionShape(value,progressEntryResponseFormat.schema,'progress conversation answer');
 return {answer:value.answer as string,...(value.progressProposal?{progressProposal:await createProgressEntryProposal(value.progressProposal,context)}:{})};
}
