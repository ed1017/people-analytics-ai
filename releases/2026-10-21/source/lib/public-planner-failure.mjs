/** Fixed server-side classifications only; never carry request/provider text. */
export const plannerFailureReasons=Object.freeze(['planner_unavailable','planner_request_invalid','planner_round_replayed','planner_context_changed','planner_input_invalid','planner_policy_expired','planner_provider_invalid','planner_usage_invalid','planner_round_unavailable']);
export class PublicPlannerBoundaryError extends Error {
 constructor(reason){super(plannerFailureReasons.includes(reason)?reason:'planner_round_unavailable');this.name='PublicPlannerBoundaryError';this.reason=this.message;}
}
export function plannerFailureReason(error){return error instanceof PublicPlannerBoundaryError&&plannerFailureReasons.includes(error.reason)?error.reason:null;}
