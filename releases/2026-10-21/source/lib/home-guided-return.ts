// @ts-expect-error Native Node tests share TypeScript source.
import {validateJson} from './local-decisions.ts';
import type {ChatMessage} from './types';
import type {HomeDecisionContext} from './home-decision-journey';
import type {GoalRequirements} from './goal-context';
export const guidedReturnKey='insights-to-action.guided-return.v1';
export type GuidedChat={messages:ChatMessage[];input:string;problem:HomeDecisionContext|null;questionUnanswered:boolean;resetMarks?:Record<string,number>};
export type GuidedReturn={id:string;originId:string;general:GuidedChat|null;requirements:GoalRequirements};
/** A tab-local return address, never an instruction to resume or repeat actions. */
export function readGuidedReturn(raw:string|null):GuidedReturn|null{
 try{
  if(!raw||raw.length>600000)return null;
  const value=JSON.parse(raw);
  if(!validateJson(value)||Object.keys(value).sort().join()!=='general,id,originId,requirements'||!/^guided-[a-zA-Z0-9-]{1,60}$/.test(value.id)||typeof value.originId!=='string'||!/^([a-zA-Z0-9-]{1,80})?$/.test(value.originId))return null;
  const chat=value.general,requirements=value.requirements;
  if(!requirements||typeof requirements.constraints!=='string'||typeof requirements.decisions!=='string'||!Array.isArray(requirements.notes))return null;
  if(chat!==null&&(!chat||!Array.isArray(chat.messages)||chat.messages.length>200||chat.messages.some((item:ChatMessage)=>!item||!['user','assistant'].includes(item.role)||typeof item.content!=='string')||typeof chat.input!=='string'||typeof chat.questionUnanswered!=='boolean'||chat.problem!==null&&(!chat.problem||typeof chat.problem.firstQuestion!=='string'||typeof chat.problem.latestQuestion!=='string')||chat.resetMarks!==undefined&&(!chat.resetMarks||typeof chat.resetMarks!=='object'||Array.isArray(chat.resetMarks)||Object.values(chat.resetMarks).some(mark=>!Number.isSafeInteger(mark)||Number(mark)<0))))return null;
  return value;
 }catch{return null;}
}
