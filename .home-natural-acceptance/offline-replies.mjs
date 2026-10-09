/** Synthetic transport replies exclusively for offline verification, never used by build.mjs. */
import {initialSpec,staffingValues} from '../tests/fixtures/natural-business-planning.mjs';
import {final} from '../tests/fixtures/home-solution-conversation.mjs';
export const context=payload=>JSON.parse(payload.input[0].content.split('\n').slice(1).join('\n'));
export const tool=(name,args,id='call_synthetic')=>({type:'function_call',name,arguments:JSON.stringify(args),call_id:id});
export const answer=text=>({output:[],output_text:JSON.stringify(final(text))});
const proposed=()=>({kind:'model-proposed',turnId:null,quote:null,explanation:'Editable illustrative premise, not verified workforce data.'});
export function scopedTool(payload){
 const current=context(payload),first=current.recentTurns.find(t=>t.role==='user')??current.currentMessage;
 const basis={kind:'user-supplied',turnId:current.currentMessage.id,quote:current.currentMessage.text,explanation:'Explicit provisional user input.'};
 const spec=initialSpec({message:first});spec.scope='client onboarding support';spec.scopeBasis=basis;spec.linkage='Supporting onboarding for two additional professional-services engagements.';spec.linkageBasis=basis;spec.startMonth='2026-11';spec.startBasis=basis;spec.months=9;spec.monthsBasis=basis;
 for(const [field,value] of Object.entries({contracts:2,existingRoles:4,existingFtePerRole:1,availabilityPct:25,ftePerRole:1,budgetUsd:120000,hoursPerContract:1800,productiveHoursPerFte:1200}))spec[field]={value,scope:{ref:'scenario-scope'},period:['hoursPerContract','productiveHoursPerFte'].includes(field)?'horizon':null,basis:['hoursPerContract','productiveHoursPerFte'].includes(field)?proposed():basis};
 return {output:[tool('review_scoped_service_demand',{spec})],output_text:''};
}
export function staffingTool(payload){
 const checked=payload.input.filter(i=>i.type==='function_call_output').map(i=>JSON.parse(i.output)).findLast(i=>i.businessPlanning?.demandProposal);
 return {output:[tool('compare_service_staffing',{reviewRef:checked.businessPlanning.demandProposal.reviewRef,changes:Object.entries(staffingValues).map(([field,value])=>({field,value,basis:proposed()}))})],output_text:''};
}
export const successfulSteps=()=>[answer('First assess the delivery gap; a conditional mix may protect current clients. Clarify the role slice and horizon.'),scopedTool,staffingTool,answer('Conditionally review redeployment plus hiring first, comparing checked shortfall and cash. All pool, timing and cost assumptions remain unverified; validate release before commitment.')];
