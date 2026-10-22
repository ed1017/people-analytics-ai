/** Fixed diagnostic reasons only; never derive categories from arbitrary error messages. */
export const solutionResponseReasons=['incomplete_output','output_bounds','answer_unavailable','invalid_json','invalid_schema','scope_rejected','calculation_reference','context_bounds','staffing_not_calculated','calculation_limit'] as const;
export type SolutionResponseReason=typeof solutionResponseReasons[number];
export const solutionReferenceDetails=["conditional_hiring_ineligible", "missing_planning_reference", "duplicate_planning_reference", "unknown_or_stale_planning_reference", "unchecked_proposal_reference", "unchecked_metric_reference", "invalid_metric_reference"] as const;
export type SolutionReferenceDetail=typeof solutionReferenceDetails[number];
export class SolutionResponseError extends Error {
 readonly reason:SolutionResponseReason;
 readonly detail?:SolutionReferenceDetail;
 constructor(reason:SolutionResponseReason,message:string,detail?:SolutionReferenceDetail){super(message);this.reason=reason;this.detail=detail;}
}
