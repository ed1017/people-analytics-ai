export type OverviewData = {
  snapshot_date: string;
  headcount: number;
  fte: number;
  voluntary_turnover_ytd_pct: number;
  labor_cost_usd: number;
  open_positions: number;
};

export type HeadcountTrendPoint = {
  snapshot_date: string;
  headcount: number;
  fte: number;
};

export type FilterOption = {
  value: string;
  label: string;
};

export type DashboardFilterOptions = {
  countries: FilterOption[];
  business_units: FilterOption[];
  levels: FilterOption[];
};

export type DashboardResponse = {
  overview: OverviewData;
  trend: HeadcountTrendPoint[];
  filter_options: DashboardFilterOptions;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type Persona = "HR" | "Leader" | "Finance";

export type AppPage =
  | "overview"
  | "talent-acquisition"
  | "survey-sentiment"
  | "finance"
  | "skills"
  | "workforce-planning";

export type PlanningPoint = {
  planning_month: string;
  planned_headcount: number;
  planned_fte: number;
  planned_hires: number;
  planned_exits: number;
  planned_labor_cost_usd: number;
};

export type PlanningAssumption = {
  assumption_name: string;
  assumption_value: number | null;
  assumption_text: string | null;
};

export type PlanningScenario = {
  scenario_name: string;
  scenario_type: string;
  description: string | null;
  assumptions: PlanningAssumption[];
  points: PlanningPoint[];
};

export type WorkforcePlanningResponse = {
  scenarios: PlanningScenario[];
};

export type PositionBusinessUnit = {
  org_code: string;
  org_name: string;
  planned_positions: number;
  planned_fte: number;
  planned_hires: number;
  planned_exits: number;
  planned_labor_cost_usd: number;
  current_positions: number;
  net_position_change: number;
  vacancy_rate_pct: number;
};

export type PositionLevel = {
  level_code: string;
  level_name: string;
  level_rank: number;
  planned_positions: number;
  planned_fte: number;
  planned_hires: number;
  planned_exits: number;
  planned_labor_cost_usd: number;
  current_positions: number;
  net_position_change: number;
};

export type PositionScenario = {
  scenario_name: string;
  scenario_type: string;
  planning_month: string;
  totals: {
    planned_positions: number;
    planned_fte: number;
    planned_hires: number;
    planned_exits: number;
    planned_labor_cost_usd: number;
    current_positions: number;
    net_position_change: number;
  };
  by_business_unit: PositionBusinessUnit[];
  by_level: PositionLevel[];
};

export type PositionModelingResponse = {
  as_of: string;
  planning_month: string;
  current: {
    current_positions: number;
    filled_positions: number;
    vacant_positions: number;
    planned_positions: number;
    frozen_positions: number;
    closed_positions: number;
    vacancy_rate_pct: number;
  };
  scenarios: PositionScenario[];
};

export type FinanceBusinessUnit = {
  org_code: string;
  org_name: string;
  headcount: number;
  fte: number;
  labor_cost_usd: number;
  cost_per_fte_usd: number;
  vacant_positions: number;
  estimated_vacancy_cost_exposure_usd: number;
  share_of_enterprise_labor_cost_pct: number;
};

export type FinanceScenario = {
  scenario_name: string;
  scenario_type: string;
  planning_month: string;
  planned_headcount: number;
  planned_fte: number;
  planned_hires: number;
  planned_exits: number;
  planned_labor_cost_usd: number;
  labor_cost_delta_vs_baseline_usd: number;
  headcount_delta_vs_baseline: number;
};

export type FinanceResponse = {
  as_of: string;
  current: {
    headcount: number;
    fte: number;
    labor_cost_usd: number;
    cost_per_fte_usd: number;
    vacant_positions: number;
    estimated_vacancy_cost_exposure_usd: number;
  };
  by_business_unit: FinanceBusinessUnit[];
  scenarios: FinanceScenario[];
};

export type SkillInsightRow = {
  skill_id: string | number;
  skill_code: string;
  skill_name: string;
  skill_category: string;
  employees_in_roles_requiring_skill: number;
  employees_with_observed_proficiency: number;
  employees_meeting_requirement: number;
  employees_below_or_missing_requirement: number;
  avg_required_proficiency: number;
  avg_observed_proficiency: number;
  avg_proficiency_gap: number;
  profile_coverage_pct: number;
  requirement_met_pct: number;
  avg_requirement_weight: number;
};

export type SkillsResponse = {
  as_of: string;
  summary: {
    active_skills: number;
    current_workforce: number;
    skills_with_demand: number;
    skills_below_60_pct: number;
    skills_below_75_pct: number;
    weighted_requirement_met_pct: number;
    average_profile_coverage_pct: number;
    onet_mapped_job_profiles: number;
    total_job_profiles: number;
  };
  largest_gaps: SkillInsightRow[];
  highest_demand: SkillInsightRow[];
  strongest_coverage: SkillInsightRow[];
};

export type BlsMetric = {
  series_id: string;
  name: string;
  short_name: string;
  unit: string;
  raw_value: number | null;
  display_value: string;
  observation_date: string | null;
};

export type BlsResponse = {
  source: string;
  latest_date: string | null;
  metrics: BlsMetric[];
};

export type TalentAcquisitionSource = {
  source_code: string;
  source_name: string;
  source_category: string;
  applications: number;
  hires: number;
  application_to_hire_pct: number;
};

export type TalentAcquisitionBusinessUnit = {
  org_code: string;
  org_name: string;
  open_requisitions: number;
  open_positions: number;
  applications: number;
  hires: number;
  avg_time_to_fill_days: number;
  application_to_hire_pct: number;
};

export type TalentAcquisitionRecruiter = {
  recruiter_name: string;
  region: string | null;
  specialty: string | null;
  total_requisitions: number;
  open_requisitions: number;
  open_positions: number;
  filled_requisitions: number;
  avg_time_to_fill_days: number;
};

export type TalentAcquisitionMonthlyPoint = {
  month: string;
  applications: number;
  interviewed_applications: number;
  offers: number;
  hires: number;
};

export type TalentAcquisitionResponse = {
  as_of: string;
  summary: {
    applications: number;
    interviewed_applications: number;
    offered_applications: number;
    hires: number;
    application_to_interview_pct: number;
    interview_to_offer_pct: number;
    offer_to_hire_pct: number;
    application_to_hire_pct: number;
    offer_acceptance_pct: number;
    open_requisitions: number;
    open_positions: number;
    avg_time_to_fill_days: number;
    median_time_to_fill_days: number;
    avg_open_req_age_days: number;
    median_open_req_age_days: number;
    open_reqs_over_60_days: number;
    internal_hires: number;
    external_hires: number;
  };
  sources: TalentAcquisitionSource[];
  business_units: TalentAcquisitionBusinessUnit[];
  recruiters: TalentAcquisitionRecruiter[];
  monthly: TalentAcquisitionMonthlyPoint[];
};
