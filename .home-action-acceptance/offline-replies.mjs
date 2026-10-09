/** Synthetic transport replies exclusively for offline verification, never imported by build.mjs. */
import {actionPlans,actionPlanAnswer} from '../tests/fixtures/action-plan-recommendations.mjs';
import {final} from '../tests/fixtures/home-solution-conversation.mjs';
export const context=payload=>JSON.parse(payload.input[0].content.split('\n').slice(1).join('\n'));
export const tool=(name,args,id='call_synthetic')=>({type:'function_call',name,arguments:JSON.stringify(args),call_id:id});
export const answer=(text,ids=[])=>({output:[],output_text:JSON.stringify(final(text,ids))});
export function batchTool(payload){
 const current=context(payload),kind=current.currentMessage.text==='I want to reduce turnover'?'turnover':'product';
 return {output:[tool('evaluate_action_plans',{candidates:actionPlans(kind,{message:current.currentMessage}),constraintUpdates:[]})],output_text:''};
}
export function plansAnswer(payload){
 const current=context(payload),kind=current.currentMessage.text==='I want to reduce turnover'?'turnover':'product',plans=actionPlans(kind,{message:current.currentMessage});
 return answer(actionPlanAnswer(kind,plans),plans.map(plan=>plan.id));
}
export const successfulSteps=()=>[batchTool,plansAnswer,batchTool,plansAnswer];
