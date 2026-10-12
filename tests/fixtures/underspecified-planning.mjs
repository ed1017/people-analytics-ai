import {solutionRequest,final} from './home-solution-conversation.mjs';
import {proposedPilot} from './model-proposed-pilot.mjs';
export const planningPrompts={hiring:'We need ten engineers with a $1m budget. What would you recommend?',period:'We need ten engineers with USD 1,000,000 for six months. What would you recommend?',turnover:'Help us reduce turnover. We have not decided a target or timetable.',metric:'Which supplied skills have lower requirement-met percentages? Does that identify weaker teams?'};
export function hiringFixture(period=false){
 const request=solutionRequest(period?planningPrompts.period:planningPrompts.hiring);
 const basis={kind:'user-supplied',turnId:request.message.id,quote:request.message.text,explanation:'Explicit role, count and total budget from this fictional user request.'};
 const changes=Object.entries({hires:10,role:'engineers',budget:1000000,...(period?{currency:'USD',months:6}:{})}).map(([field,value])=>({field,value,basis}));
 return {request,changes};
}
export function hiringRecommendation(input){
 const ref=JSON.parse(input.findLast(row=>row.type==='function_call_output').output).planningGuidance.binding.reference;
 return {...final(),answer:{findings:'The requested headcount and cap define a spending envelope; salary and availability are unverified.',decisionRationale:'Validate the role and comparable cost quotes before committing to the hires.',caveats:['The allowance is not annual salary or proof of affordability.'],recommendedPlan:{name:'Validate the hiring budget',steps:['Confirm the budget currency and period with Finance.','Ask the hiring owner for comparable role quotes and full employer/recruiting costs, then update this estimate.'],calculationRefs:[ref]}}};
}
export function turnoverFixture(){const request=solutionRequest(planningPrompts.turnover),candidate=proposedPilot('turnover-pilot');candidate.goal.statement='Reduce turnover';candidate.objective='Test whether manager check-ins reveal addressable workload concerns';candidate.successMeasure='Review participation and feedback, then agree a turnover baseline and target before judging impact.';return {request,candidate};}

export const conditionalHiringAnswer=input=>({...final(),answer:{findings:'The count and cap support a conditional hiring proposal.',decisionRationale:'Confirm the cost basis before committing to hires.',caveats:['The allowance is not salary and availability is unverified.'],conditionalHiringPlan:{calculationRefs:[JSON.parse(input.findLast(item=>item.type==='function_call_output').output).planningGuidance.binding.reference]}}});
