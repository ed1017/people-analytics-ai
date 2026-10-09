import {ordinaryClientRequest} from './client-request.mjs';
import {readSolutionState} from '../lib/home-solution-conversation.ts';
import {currentBusinessPlanning} from '../lib/home-business-planning.ts';
export const fixture=Object.freeze({
 id:'home-natural-professional-services-two-turn-v1',datasetToken:'legacy-v1:0',
 opener:'Our advisory team may take on two client support engagements. Could developing people, redeploying them or hiring help us deliver without disrupting current clients?',
 clarification:'The work is client onboarding support in our professional-services team. Use that literal role slice for both engagements, starting November 2026 for nine months. We have four existing people in this slice; assume each is 1 FTE and 25% of their time is available. Additional roles are full-time. Budget is 120000 USD and at most two additional employees. You may propose clearly labelled, editable illustrative assumptions for missing workload, productive hours, costs, readiness dates, internal pools, release and backfills. Do not treat assumptions as verified workforce facts. Compare useful conditional staffing options using the calculations and recommend a practical next step, explaining timing, shortfall and cost uncertainty. Do not save or accept a plan.',
 workforceFacts:false,acceptedForScenario:false,goalSaved:false,
});
const first=ordinaryClientRequest(fixture.opener);
export const firstRequest=()=>structuredClone(first);
export function secondRequest(firstReply){checkReply(first,firstReply,0);return ordinaryClientRequest(fixture.clarification,firstReply.state);}
export const modeForTurn=()=>null;
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function checkReply(request,reply,index=request.message.text===fixture.opener?0:1){
 const state=readSolutionState(reply?.state);
 if(reply.requestId!==request.requestId||typeof reply.answer!=='string'||!reply.answer.trim()||reply.candidateIds?.length!==0||reply.analysisIds?.length!==0||reply.progressProposal||reply.demandReview||
  !equal(state.turns.slice(0,-2),request.state.turns)||!equal(state.turns.at(-2),{id:request.message.id,role:'user',text:request.message.text})||!equal(state.turns.at(-1),{id:'reply-'+request.requestId,role:'assistant',text:reply.answer})||
  !Number.isInteger(reply.usage?.modelRounds)||reply.usage.modelRounds<1||reply.usage.modelRounds>4||!Number.isInteger(reply.usage?.toolCalls)||reply.usage.toolCalls<0||reply.usage.toolCalls>6)throw Error('reply_contract');
 for(const key of ['working','analyses','constraints','verifiedMetrics'])if(!equal(state[key],request.state[key]))throw Error('unexpected_planning_mutation');
 if(request.goal.id||request.goal.statement||request.goalContext?.scenarioReview||request.catalog||request.selectedId)throw Error('injected_scenario_or_selection');
 const business=currentBusinessPlanning({...request,state},fixture.datasetToken);
 if(index===1&&(!business||business.review.result.status!=='calculated'||business.review.spec.scope!=='client onboarding support'||business.review.spec.months!==9||business.review.spec.startMonth!=='2026-11'||
  business.review.spec.contracts.value!==2||business.review.spec.existingRoles.value!==4||business.review.spec.availabilityPct.value!==25||business.staffing?.result.status!=='calculated'||business.staffing.result.options.length<2||
  business.staffing.result.accepted!==false||business.staffing.result.operationalFeasibilityVerified!==false))throw Error('natural_calculation_evidence_required');
 return {structuralAcceptance:true,reviewStatus:business?.review.result.status??'no-review',codeArithmeticVerified:index===1,
  optionCount:business?.staffing?.result.options.length??0,semanticReview:'pending',fullAcceptance:false,acceptedForScenario:false,goalSaved:false};
}
export const semanticChecks=Object.freeze([
 'Open with a useful provisional recommendation or next step; clarify only the essential missing context.',
 'Offer useful conditional alternatives and explain decisive timing, cash, workload shortfall and uncertainty from actual successful current-turn code results.',
 'Retain the literal client onboarding support slice; never substitute Service Analyst or infer capacity from snapshot headcount.',
 'Distinguish user inputs, model-proposed illustrative assumptions and unknowns; do not claim verified availability, causal effects, forecast validation or a globally optimal option.',
 'Retain actual prior response state and corrections naturally; no mode, scenario binding, saved goal, example injection, acceptance or Save.',
]);
