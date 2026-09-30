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
  | "workforce"
  | "attrition"
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

export type PositionActionAssumptions = {
  add_positions: number;
  close_vacant_positions: number;
  freeze_vacancies: number;
  vacancy_fill_pct: number;
};

export type PositionActionScenarioResponse = {
  as_of: string;
  defaults: PositionActionAssumptions;
  assumptions: PositionActionAssumptions;
  current: {
    authorized_positions: number;
    filled_positions: number;
    open_vacancies: number;
    frozen_positions: number;
    closed_positions: number;
  };
  modeled: {
    authorized_positions: number;
    filled_positions: number;
    open_vacancies: number;
    frozen_positions: number;
    projected_fills: number;
    net_authorized_position_change: number;
    net_filled_position_change: number;
    vacancy_rate_pct: number;
    occupancy_rate_pct: number;
  };
  methodology: string[];
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

export type SurveyListeningDimension = {
  survey_code: string;
  survey_name: string;
  survey_type: string;
  question_code: string;
  dimension: string;
  question_text: string;
  employee_respondents: number;
  candidate_respondents: number;
  separation_respondents: number;
  avg_score: number;
  favorable_pct: number;
};

export type SurveyEngagementTrendPoint = {
  survey_code: string;
  survey_name: string;
  launch_date: string;
  close_date: string;
  respondents: number;
  denominator_snapshot_date: string;
  eligible_population: number;
  participation_pct: number;
  avg_score: number;
  favorable_pct: number;
};

export type SurveyBusinessUnit = {
  org_code: string;
  org_name: string;
  respondents: number;
  avg_score: number;
  favorable_pct: number;
};

export type SurveyExitReason = {
  primary_reason: string;
  exits: number;
  pct_of_exit_responses: number;
};

export type SurveySentimentResponse = {
  as_of: string;
  summary: {
    engagement_respondents: number;
    engagement_eligible_population: number;
    engagement_participation_pct: number;
    engagement_avg_score: number;
    engagement_favorable_pct: number;
    pulse_respondents: number;
    pulse_avg_score: number;
    pulse_favorable_pct: number;
    manager_respondents: number;
    manager_avg_score: number;
    manager_favorable_pct: number;
    onboarding_90_respondents: number;
    onboarding_90_avg_score: number;
    onboarding_90_favorable_pct: number;
    exit_respondents: number;
    open_text_comments: number;
  };
  engagement_trend: SurveyEngagementTrendPoint[];
  engagement_dimensions: SurveyListeningDimension[];
  pulse_dimensions: SurveyListeningDimension[];
  manager_dimensions: SurveyListeningDimension[];
  onboarding_dimensions: SurveyListeningDimension[];
  exit_dimensions: SurveyListeningDimension[];
  business_units: SurveyBusinessUnit[];
  exit_reasons: SurveyExitReason[];
};

export type ScenarioModelAssumptions = {
  annual_growth_pct: number;
  salary_inflation_pct: number;
  annual_attrition_pct: number;
  fill_rate_pct: number;
  productivity_hiring_reduction_pct: number;
};

export type ScenarioModelPoint = {
  planning_month: string;
  baseline_headcount: number;
  target_headcount: number;
  modeled_headcount: number;
  modeled_fte: number;
  planned_hiring_demand: number;
  modeled_hires: number;
  modeled_exits: number;
  modeled_labor_cost_usd: number;
  gap_vs_target: number;
};

export type ScenarioSegmentResult = {
  segment_code: string;
  segment_name: string;
  baseline_headcount: number;
  modeled_headcount: number;
  headcount_delta_vs_baseline: number;
  baseline_labor_cost_usd: number;
  modeled_labor_cost_usd: number;
  labor_cost_delta_vs_baseline_usd: number;
};

export type ScenarioSegmentBreakdown = {
  planning_month: string;
  allocation_method: string;
  business_units: ScenarioSegmentResult[];
  job_families: ScenarioSegmentResult[];
  reconciliation: {
    enterprise_modeled_headcount: number;
    business_unit_modeled_headcount_total: number;
    job_family_modeled_headcount_total: number;
    enterprise_modeled_labor_cost_usd: number;
    business_unit_modeled_labor_cost_total_usd: number;
    job_family_modeled_labor_cost_total_usd: number;
  };
};

export type ScenarioModelResponse = {
  as_of: string;
  source_scenario: string;
  defaults: ScenarioModelAssumptions;
  assumptions: ScenarioModelAssumptions;
  summary: {
    starting_headcount: number;
    baseline_end_headcount: number;
    target_end_headcount: number;
    modeled_end_headcount: number;
    modeled_end_fte: number;
    headcount_delta_vs_baseline: number;
    headcount_gap_vs_target: number;
    baseline_end_labor_cost_usd: number;
    modeled_end_labor_cost_usd: number;
    labor_cost_delta_vs_baseline_usd: number;
    cumulative_modeled_hires: number;
    cumulative_modeled_exits: number;
  };
  points: ScenarioModelPoint[];
  segment_breakdown?: ScenarioSegmentBreakdown;
  methodology: string[];
};

export type BusinessUnitScenarioOption = {
  org_code: string;
  org_name: string;
  headcount: number;
  fte: number;
};

export type BusinessUnitScenarioResponse =
  ScenarioModelResponse & {
    scope: {
      type: "business_unit";
      org_code: string;
      org_name: string;
      current_headcount: number;
      current_fte: number;
      planning_horizon_start: string;
      planning_horizon_end: string;
    };
    enterprise_impact: {
      baseline_end_headcount: number;
      implied_end_headcount: number;
      headcount_delta_vs_baseline: number;
      baseline_end_labor_cost_usd: number;
      implied_end_labor_cost_usd: number;
      labor_cost_delta_vs_baseline_usd: number;
    };
  };

export type WorkforceResponse = {
  as_of: string;
  summary: {
    headcount: number;
    fte: number;
    people_managers: number;
    avg_span_of_control: number;
    full_time_headcount: number;
    non_full_time_headcount: number;
    remote_headcount: number;
    hybrid_headcount: number;
    onsite_headcount: number;
    avg_tenure_years: number;
  };
  trend: HeadcountTrendPoint[];
  business_units: Array<{
    org_code: string;
    org_name: string;
    headcount: number;
    fte: number;
    people_managers: number;
    avg_span_of_control: number;
    avg_tenure_years: number;
  }>;
  countries: Array<{
    country_code: string;
    country_name: string;
    headcount: number;
    fte: number;
    avg_tenure_years: number;
  }>;
  levels: Array<{
    level_code: string;
    level_name: string;
    level_rank: number;
    headcount: number;
    fte: number;
    people_managers: number;
    avg_tenure_years: number;
  }>;
  tenure: Array<{
    tenure_band: string;
    tenure_sort: number;
    headcount: number;
    fte: number;
  }>;
  movements: Array<{
    month: string;
    movement_type: string;
    movements: number;
  }>;
};

export type AttritionResponse = {
  as_of: string;
  summary: {
    total_exits: number;
    voluntary_exits: number;
    involuntary_exits: number;
    regrettable_exits: number;
    retirements: number;
    total_turnover_ytd_pct: number;
    voluntary_turnover_ytd_pct: number;
    annualized_voluntary_turnover_pct: number;
    regrettable_share_of_voluntary_pct: number;
  };
  trend: Array<{
    month: string;
    total_exits: number;
    voluntary_exits: number;
    involuntary_exits: number;
    regrettable_exits: number;
    monthly_turnover_pct: number;
    monthly_voluntary_turnover_pct: number;
  }>;
  business_units: Array<{
    org_code: string;
    org_name: string;
    exits: number;
    voluntary_exits: number;
    regrettable_exits: number;
    voluntary_turnover_ytd_pct: number;
  }>;
  levels: Array<{
    level_code: string;
    level_name: string;
    level_rank: number;
    exits: number;
    voluntary_exits: number;
    regrettable_exits: number;
  }>;
  tenure: Array<{
    tenure_band: string;
    tenure_sort: number;
    exits: number;
    voluntary_exits: number;
    regrettable_exits: number;
  }>;
  reasons: Array<{
    separation_reason: string;
    separation_type: string;
    exits: number;
    pct_of_exits: number;
  }>;
};
