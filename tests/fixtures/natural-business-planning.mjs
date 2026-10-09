/** Synthetic model replies only; the browser's actual request is never augmented. */
import {demandQuantityFields} from '../../lib/swp-demand.ts';
import {demandReferenceId} from '../../lib/swp-demand-reference.ts';
import {final} from './home-solution-conversation.mjs';
export const roleSlice='Service desk triage / client operations';
export const messages={
 opener:'Could we cover two extra customer support contracts without disrupting current work?',
 clarify:'Use the Service desk triage / client operations slice for triaging the contracts. Start November 2026 for nine months. Both contracts each need 1800 hours over that horizon. Each full-time role has 1200 productive hours over the horizon. Four existing roles are each 1 FTE, with 25% time available. Additional roles are 1 FTE each. Budget 120000 USD.',
 compare:'Compare staffing with these provisional assumptions: develop at most 1 role and redeploy at most 1 role; these pools are separate from each other and baseline availability, and release is assumed. Backfill hires: 0. Annual hire cost: 84000 USD per person; recruitment fee: 2500 USD per hire. Annual internal salary uplift: 18000 USD total. Training: 5000 USD total and 60 hours total. Hire arrival: 2026-12-01; development ready: 2027-01; redeployment ready: 2026-11. Maximum added employees: 2; deadline: 2027-07. Assume these costs are complete and distinct, still unverified.',
 correct:'Make availability 50%, and training cash 7000 USD total. Keep the other premises unchanged.',
 topic:'Forget the contract staffing discussion. Now help me think through a professional-services onboarding problem.',
};
export const replies={opener:'Which operational role slice, start and capacity assumptions should we use?',clarify:'The supplied assumptions produce a provisional two-role gap; staffing costs and readiness remain unknown.',compare:'The checked options retain a delivery shortfall where roles arrive late. Review the entered premises before choosing.',correct:'The corrected availability reduces the provisional gap to one role; training cash is now 7000 USD total.',topic:'The contract staffing context is cleared. What onboarding outcome needs improvement?'};
export const unknownBasis=()=>({kind:'unknown',turnId:null,quote:null,explanation:'Not supplied in this conversation.'});
export const supplied=(body)=>({kind:'user-supplied',turnId:body.message.id,quote:body.message.text,explanation:'Explicit typed test assumption; not a source-verified workforce fact.'});
export function initialSpec(body){return {objective:body.message.text,objectiveTurnId:body.message.id,scope:null,scopeBasis:unknownBasis(),linkage:null,linkageBasis:unknownBasis(),startMonth:null,startBasis:unknownBasis(),months:null,monthsBasis:unknownBasis(),...Object.fromEntries(demandQuantityFields.map(field=>[field,{value:null,scope:null,period:null,basis:unknownBasis()}]))};}
export const staffingValues={buildMax:1,moveMax:1,backfills:0,annualHireCost:84000,hireFee:2500,internalAnnualCostChange:18000,trainingCash:5000,trainingHours:60,arrivalDate:'2026-12-01',buildMonth:'2027-01',moveMonth:'2026-11',maxAddedEmployees:2,deadlineMonth:'2027-07',internalPoolsDistinct:true,internalRelease:true,costsCompleteAndDistinct:true};
export const quantityChange=(body,field,value,period=null)=>({field,quantity:{value,period,scope:{ref:'scenario-scope'}},number:null,text:null,basis:supplied(body)});
const simpleChange=(body,field,value)=>({field,quantity:null,number:field==='months'?value:null,text:field==='months'?null:value,basis:supplied(body)});
export function naturalSteps(body){
 const text=body.message.text,ref=demandReferenceId(body.requestId,0);
 if(text===messages.opener)return [{name:'review_scoped_service_demand',args:{spec:initialSpec(body)}},final(replies.opener)];
 if(text===messages.clarify)return [{name:'revise_scoped_service_demand',args:{edit:{reviewRef:ref,changes:[simpleChange(body,'scope',roleSlice),simpleChange(body,'startMonth','2026-11'),simpleChange(body,'months',9),simpleChange(body,'linkage','Triaging the two additional customer support contracts.'),...Object.entries({contracts:2,hoursPerContract:1800,productiveHoursPerFte:1200,existingRoles:4,existingFtePerRole:1,availabilityPct:25,ftePerRole:1,budgetUsd:120000}).map(([field,value])=>quantityChange(body,field,value,['hoursPerContract','productiveHoursPerFte'].includes(field)?'horizon':null))]}}},final(replies.clarify)];
 if(text===messages.compare)return [{name:'compare_service_staffing',args:{reviewRef:ref,changes:Object.entries(staffingValues).map(([field,value])=>({field,value,basis:supplied(body)}))}},final(replies.compare)];
 if(text===messages.correct)return [{name:'revise_scoped_service_demand',args:{edit:{reviewRef:ref,changes:[quantityChange(body,'availabilityPct',50)]}}},{name:'compare_service_staffing',args:{reviewRef:demandReferenceId(body.requestId,1),changes:[{field:'trainingCash',value:7000,basis:supplied(body)}]}},final(replies.correct)];
 if(text===messages.topic)return [{name:'clear_business_planning',args:{target:'discussion',turnId:body.message.id,quote:text}},final(replies.topic)];
 throw Error('Unexpected browser text in synthetic model fixture: '+text);
}
export const responseForStep=(step,index)=>step.name?{status:'completed',output:[{type:'function_call',call_id:'offline-call-'+index,name:step.name,arguments:JSON.stringify(step.args)}],output_text:''}:{status:'completed',output:[],output_text:JSON.stringify(step)};
