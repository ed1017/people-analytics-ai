import type {SolutionRequest} from './home-solution-conversation';
import type {DemandContext} from './swp-demand';
// @ts-expect-error Native Node tests share TypeScript source.
import {readDemandReview} from './swp-demand.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {planningRecommendationInstructions,strategicPlanningInstructions} from './home-strategic-planning.ts';

/** Add recommendation guidance to the actual full-app route without changing
 * its checked demand tools, model, or explicit acceptance/save ownership. */
export function solutionPlanningInstructions(request:SolutionRequest,demand:DemandContext|null){
 const review=demand?.demandProposal?readDemandReview(demand.demandProposal,demand):null;
 const available=!!review&&request.planningCalculatorAvailable===true;
 const instructions=demand
  ?planningRecommendationInstructions({id:'current-business-demand',assumptions:'Use the current user objective and exact reviewed operating inputs when present. Omitted inputs remain unknown or explicitly proposed; the caller alone accepts scenario assumptions and saves plans.'},available)
  :strategicPlanningInstructions(request.message.text,request.state.turns.map(turn=>({role:turn.role,content:turn.text})),false);
 return instructions?'\n'+instructions:'';
}
