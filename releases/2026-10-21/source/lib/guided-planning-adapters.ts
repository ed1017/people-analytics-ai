import type {SolutionRequest,SolutionState} from './home-solution-conversation';
import type {DemandReview} from './swp-demand';
// @ts-expect-error Native fixture tests share TypeScript source.
import {hiringBudgetView} from './home-hiring-budget.ts';
// @ts-expect-error Native fixture tests share TypeScript source.
import {requiredStaffingView} from './home-required-staffing.ts';
// @ts-expect-error Native fixture tests share TypeScript source.
import {canonical} from './workforce-mix-search-core.ts';
export type PlanningCalculationKind='hiring'|'fixed-staffing'|'workload'|'projection';
export type PlanningCalculationRef={kind:PlanningCalculationKind;analysisId?:string;reference:string;revision:number;inputKey:string;resultKey:string;dataset:unknown;scope:unknown;missing:string[]};
const digest=async(value:unknown)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value))))).map(n=>n.toString(16).padStart(2,'0')).join('');
/** Bind existing typed inputs/provenance and exact results, without unit conversion or a new calculator. */
export async function planningCalculationRef(kind:PlanningCalculationKind,request:SolutionRequest,state:SolutionState,demand?:DemandReview|null,analysisId?:string):Promise<PlanningCalculationRef|null>{
 let input:unknown,result:unknown,revision:number,dataset:unknown,missing:string[]=[];
 if(kind==='hiring'){
  const s=state.hiringBudget;if(!s)return null;const view=hiringBudgetView(s)!;input={inputs:s.inputs,origins:s.origins,basisTurns:s.basisTurns};result=view;revision=s.revision;dataset=s.datasetToken;missing=view.missing;
 }else if(kind==='fixed-staffing'){
  const s=state.requiredStaffing;if(!s)return null;const view=requiredStaffingView(s)!;input=s;result=view;revision=s.revision;dataset=s.datasetToken;missing=view.missing;
 }else if(kind==='workload'){
  const s=state.businessPlanning;const review=s?.review??demand;if(!review)return null;input=s??review;result=s?.staffing?.result??review;revision=review.revision;dataset=s?.context.datasetToken??review.datasetToken;missing=s?.staffing?.result.missing??review.result.missing;
 }else{
  const s=analysisId?state.analyses.findLast(item=>item.id===analysisId):state.analyses.at(-1);if(!s)return null;analysisId=s.id;input=s.inputs;result=s;revision=s.revision;dataset=s.inputs.datasetVersion??s.inputs.relations;
 }
 const scope={goal:request.goal,scope:request.scope,filters:request.filters};
 const inputKey=await digest({input,dataset,scope,constraints:state.constraints,evidenceKey:await digest(request.evidence)}),resultKey=await digest(result);
 return {kind,...(kind==='projection'?{analysisId}:{}),reference:kind+'-'+await digest({requestId:request.requestId,revision,inputKey,resultKey}),revision,inputKey,resultKey,dataset,scope,missing};
}
export function planningCalculationFeedback(binding:PlanningCalculationRef){
 return {binding,next:binding.missing.length?'A partial calculation is not operational feasibility. For planning, propose defensible missing scenario inputs within this tool contract, or recommend a conditional next move and identify the specific remaining decision. Preserve user inputs and withdrawals. Use the existing round budget; no automatic retry.':'Use this checked result for a conditional recommendation, retaining provenance and operational limitations.',presentation:binding.kind==='fixed-staffing'?'The checked fixed-role comparison owns its recommendation. Return the discussion object (findings, decision rationale, caveats), without another recommendedPlan; keep the native comparison authoritative.':'For count-and-budget hiring without a costed USD route, return conditionalHiringPlan with this exact reference; its native card owns the recommendation. Otherwise return the calculated-plan answer object with this exact reference. Keep the existing estimate card authoritative; do not create a second generic all-unknown candidate for the same estimate.'};
}
