/** Synthetic provider output only. Never imported by build.mjs. */
import {candidate,quantity,final} from '../tests/fixtures/home-solution-conversation.mjs';
export const context=payload=>JSON.parse(payload.input[0].content.split('\n').slice(1).join('\n'));
export const tool=(name,args,id='call_synthetic')=>({type:'function_call',name,arguments:JSON.stringify(args),call_id:id});
export const answer=(text,ids=[])=>({output:[],output_text:JSON.stringify(final(text,ids))});
export function batchTool(payload){
 const current=context(payload),c=candidate('fictional-mentoring');c.goal.turnId=current.currentMessage.id;
 const q=(field,number,unit,target=null,text=null)=>({...quantity(field,number,unit,target,current.currentMessage.id),text});
 c.quantities=[q('participants',12,'people','c1'),q('hours_per_participant',2,'hours/person/total'),q('coordination_hours',3,'hours/total'),q('cash',240,'USD','c1'),q('start_month',null,'YYYY-MM',null,'2026-10'),q('horizon_months',3,'months'),q('population',null,'text',null,'Fictional mentoring pilot')];
 return {output:[{id:'rs_fixture',type:'reasoning',summary:[],encrypted_content:'OFFLINE_ONLY',status:'completed'},
  {id:'msg_fixture',type:'message',role:'assistant',status:'completed',phase:'commentary',content:[{type:'output_text',text:'Checking fictional pilot resources.',annotations:[]}]},
  {...tool('evaluate_candidate',{candidate:c,constraintUpdates:[]}),id:'fc_fixture',status:'completed',created_by:'offline_actor'}],output_text:''};
}
export function plansAnswer(payload){
 const result=JSON.parse(payload.input.at(-1).output),f=final('Review this fictional mentoring pilot; retention impact and capacity are unverified.',[result.id]);
 f.verifiedMetrics=result.verifiedMetricReferences;
 return {output:[],output_text:JSON.stringify(f)};
}
export const successfulSteps=()=>[batchTool,plansAnswer];
