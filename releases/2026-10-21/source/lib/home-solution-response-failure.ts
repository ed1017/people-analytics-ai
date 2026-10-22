/** Fixed diagnostic reasons only; never derive categories from arbitrary error messages. */
export const solutionResponseReasons=['incomplete_output','output_bounds','answer_unavailable','invalid_json','invalid_schema','scope_rejected','calculation_reference','context_bounds','staffing_not_calculated','calculation_limit'] as const;
export type SolutionResponseReason=typeof solutionResponseReasons[number];
export class SolutionResponseError extends Error {
 readonly reason:SolutionResponseReason;
 constructor(reason:SolutionResponseReason,message:string){super(message);this.reason=reason;}
}
