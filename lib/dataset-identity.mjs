export const DATASET_HEADER = 'x-workforce-dataset';
// Legacy describes the current live binding; it is NOT an immutable v1 certificate.
export const LEGACY_DATASET_TOKEN = 'legacy-v1:0';
export function validDatasetToken(value) {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,95}:[0-9]{1,12}$/.test(value);
}


// Existing workforce entrypoints only; independent market sources keep their own scope.
export const DATASET_ROUTES = Object.freeze([
  "/api/attrition",
  "/api/business-unit-response-allocation",
  "/api/business-unit-scenario",
  "/api/capability-agent",
  "/api/career-growth-mobility",
  "/api/career-mobility",
  "/api/chat",
  "/api/compensation",
  "/api/compensation-job-release",
  "/api/compensation-ranges",
  "/api/constraint-aware-workforce-scheduler",
  "/api/dashboard",
  "/api/finance",
  "/api/headcount",
  "/api/headcount-trend",
  "/api/home-plan-conversation",
  "/api/home-solution-conversation",
  "/api/internal-talent-readiness",
  "/api/learning-development",
  "/api/overview",
  // This endpoint combines workforce-owned role mappings with independently
  // dated O*NET content; only the former inherits the workforce population.
  "/api/occupational-reference",
  "/api/position-actions",
  "/api/position-modeling",
  "/api/position-structure",
  "/api/role-buy-feasibility",
  "/api/role-workforce-response-plan",
  "/api/scenario-modeler",
  "/api/skills",
  "/api/succession-coverage",
  "/api/survey-sentiment",
  "/api/talent-acquisition",
  "/api/time-phased-workforce-execution",
  "/api/workforce",
  "/api/workforce-planning",
  "/api/workforce-response-constraints",
  "/api/workforce-response-plan",
  "/api/workforce-response-portfolio",
  "/api/workforce-solution",
  "/api/workforce-solution/intake"
]);
