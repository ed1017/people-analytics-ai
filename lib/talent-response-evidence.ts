import type { CareerGrowthMobilityResponse } from "./career-growth-mobility";
import type { LearningDevelopmentResponse, RoleWorkforceResponsePlanResponse } from "./types";

// Match role codes exactly. Enterprise movement history must never become role supply.
export function selectTalentResponseEvidence(
  roleCode: string,
  learning: LearningDevelopmentResponse | null,
  movements: CareerGrowthMobilityResponse | null,
  rolePlan: RoleWorkforceResponsePlanResponse | null,
) {
  const pathway = roleCode
    ? learning?.job_profile_pathways.find((row) => row.job_profile_code === roleCode) ?? null
    : null;
  const matchingPlan = roleCode && rolePlan?.job_profile_code === roleCode ? rolePlan : null;
  return {
    pathway,
    learningAsOf: pathway ? learning?.as_of ?? null : null,
    readiness: matchingPlan?.internal_talent_readiness.job_profile_code === roleCode
      ? matchingPlan.internal_talent_readiness : null,
    recruiting: matchingPlan?.external_recruiting_feasibility.job_profile_code === roleCode
      ? matchingPlan.external_recruiting_feasibility : null,
    // No role linkage exists in this aggregate. Do not join by level or destination position.
    enterpriseHistory: movements,
  };
}
