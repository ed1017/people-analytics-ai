/** Synthetic transport replies exclusively for offline verification, never imported by build.mjs. */
import {actionPlans,actionPlanAnswer} from '../tests/fixtures/action-plan-recommendations.mjs';
import {final} from '../tests/fixtures/home-solution-conversation.mjs';
export const context=payload=>JSON.parse(payload.input[0].content.split('\n').slice(1).join('\n'));
export const tool=(name,args,id='call_synthetic')=>({type:'function_call',name,arguments:JSON.stringify(args),call_id:id});
export const answer=(text,ids=[])=>({output:[],output_text:JSON.stringify(final(text,ids))});
export const candidateTool=(index=0)=>payload=>{
 const current=context(payload),candidate=actionPlans('turnover',{message:current.currentMessage})[index];
 return {output:[tool('evaluate_candidate',{candidate,constraintUpdates:[]},'call_synthetic_'+index)],output_text:''};
};
export const plansAnswer=(count=1)=>payload=>{
 const current=context(payload),plans=actionPlans('turnover',{message:current.currentMessage}).slice(0,count);
 return answer(count?actionPlanAnswer('turnover',plans):'Investigate the available aggregate turnover trend before proposing a retention intervention.',plans.map(plan=>plan.id));
};
