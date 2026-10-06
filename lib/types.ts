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
  // Validated aggregate-only release; inactive/error/unsupported scopes remain null.
  performance_rating?: unknown;
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
  | "decision-brief"
  | "assess-evaluate"
  | "occupational-references"
  | "labor-market"
  | "training-coaching"
  | "home"
  | "compensation"
  | "overview"
  | "workforce"
  | "attrition"
  | "talent-acquisition"
  | "survey-sentiment"
  | "finance"
  | "skills"
  | "learning-development"
  | "development-planning"
  | "career-mobility"
  | "career-growth-mobility"
  | "succession-planning"
  | "planning-overview"
  | "scenario-modeling"
  | "position-workforce-design"
  | "workforce-response"
  | "execution-feasibility"
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

export type StructuralPositionActionType =
  | "add_positions"
  | "close_vacant_positions"
  | "freeze_vacancies"
  | "fill_vacancies";

export type StructuralPositionAction = {
  action_type: StructuralPositionActionType;
  business_unit: string | null;
  level: string | null;
  job_profile: string | null;
  amount: number | null;
  fill_pct: number | null;
};

export type StructuralPositionScenarioResponse = {
  as_of: string;
  actions: StructuralPositionAction[];
  current: {
    authorized_positions: number;
    filled_positions: number;
    open_vacancies: number;
    frozen_positions: number;
    open_requisitions: number;
    on_hold_requisitions: number;
    uncovered_vacancies: number;
  };
  modeled: {
    authorized_positions: number;
    filled_positions: number;
    open_vacancies: number;
    frozen_positions: number;
    net_authorized_position_change: number;
    net_filled_position_change: number;
    vacancy_rate_pct: number;
    authorized_budget_delta_usd: number;
    annualized_staffed_labor_cost_delta_usd: number;
  };
  job_profile_impact: Array<{
    job_profile_code: string;
    job_profile_name: string;
    current_authorized_positions: number;
    modeled_authorized_positions: number;
    authorized_position_delta: number;
    current_filled_positions: number;
    modeled_filled_positions: number;
    filled_position_delta: number;
    modeled_open_vacancies: number;
    modeled_frozen_positions: number;
    modeled_active_recruiting_demand: number;
  }>;
  business_unit_job_profile_impact: Array<{
    org_code: string;
    org_name: string;
    job_profile_code: string;
    job_profile_name: string;
    current_authorized_positions: number;
    modeled_authorized_positions: number;
    authorized_position_delta: number;
    current_filled_positions: number;
    modeled_filled_positions: number;
    filled_position_delta: number;
    modeled_open_vacancies: number;
    modeled_frozen_positions: number;
    modeled_active_recruiting_demand: number;
  }>;
  skill_demand: {
    skills_with_increased_authorized_demand: number;
    skills_with_reduced_authorized_demand: number;
    top_changed_skills: Array<{
      skill_code: string;
      skill_name: string;
      skill_category: string;
      current_authorized_position_demand: number;
      modeled_authorized_position_demand: number;
      authorized_demand_delta: number;
      current_employee_supply: number;
      current_position_gap: number;
      modeled_position_gap: number;
      current_active_recruiting_demand: number;
      modeled_active_recruiting_demand: number;
      active_recruiting_demand_delta: number;
    }>;
    largest_modeled_gaps: Array<{
      skill_code: string;
      skill_name: string;
      skill_category: string;
      current_authorized_position_demand: number;
      modeled_authorized_position_demand: number;
      authorized_demand_delta: number;
      current_employee_supply: number;
      current_position_gap: number;
      modeled_position_gap: number;
      current_active_recruiting_demand: number;
      modeled_active_recruiting_demand: number;
      active_recruiting_demand_delta: number;
    }>;
    top_recruiting_skill_demand: Array<{
      skill_code: string;
      skill_name: string;
      skill_category: string;
      current_authorized_position_demand: number;
      modeled_authorized_position_demand: number;
      authorized_demand_delta: number;
      current_employee_supply: number;
      current_position_gap: number;
      modeled_position_gap: number;
      current_active_recruiting_demand: number;
      modeled_active_recruiting_demand: number;
      active_recruiting_demand_delta: number;
    }>;
  };
  response_strategy: {
    scope: "scenario_widened_skill_gaps";
    skills_evaluated: number;
    borrow_data_available: boolean;
    automate_data_available: boolean;
    skills: Array<{
      skill_code: string;
      skill_name: string;
      skill_category: string;
      modeled_position_gap: number;
      authorized_demand_delta: number;
      modeled_active_recruiting_demand: number;
      build: {
        pathway_available: boolean;
        active_course_count: number;
        avg_course_duration_hours: number | null;
        enrolled_learners: number;
        in_progress_learners: number;
        completed_learners_ytd: number;
      };
      move: {
        mobility_candidates: number;
        evidence_available: boolean;
      };
      buy: {
        active_recruiting_demand: number;
        historical_filled_requisitions: number;
        median_time_to_fill_days: number | null;
        evidence_available: boolean;
      };
      borrow: {
        data_available: boolean;
        active_contingent_workers: number;
        avg_active_bill_rate: number | null;
      };
      automate: {
        data_available: boolean;
        reason: string;
      };
    }>;
  };
  recruiting_demand: {
    active_open_requisitions: number;
    on_hold_requisitions: number;
    uncovered_open_vacancies: number;
    active_recruiting_demand: number;
    incremental_requisitions_needed: number;
    requisitions_to_hold: number;
    requisitions_to_cancel: number;
    requisitions_to_create_for_modeled_fills: number;
    requisitions_to_reactivate_for_modeled_fills: number;
    requisitions_closed_as_filled: number;
    by_business_unit: Array<{
      org_code: string;
      org_name: string;
      active_open_requisitions: number;
      on_hold_requisitions: number;
      uncovered_open_vacancies: number;
      active_recruiting_demand: number;
      modeled_fills: number;
    }>;
  };
  action_results: Array<{
    action_index: number;
    action_type: StructuralPositionActionType;
    scope_label: string;
    requested_value: number;
    applied_value: number;
    affected_vacancies_before: number;
    annual_cost_basis_per_position_usd: number;
    authorized_budget_delta_usd: number;
    staffed_labor_cost_delta_usd: number;
    requisitions_to_hold: number;
    requisitions_to_cancel: number;
    requisitions_to_create_for_fill: number;
    requisitions_to_reactivate_for_fill: number;
    requisitions_closed_as_filled: number;
  }>;
  methodology: string[];
};

export type WorkforceResponsePlanAllocation = {
  build: number;
  move: number;
  buy: number;
  borrow: number;
  automate: number;
};

export type WorkforceResponsePlanResponse = {
  skill_code: string;
  skill_name: string;
  skill_category: string;
  modeled_position_gap: number;
  allocation: WorkforceResponsePlanAllocation;
  planned_coverage_if_executed: number;
  remaining_gap_if_executed: number;
  overplanned_capacity: number;
  coverage_pct_if_executed: number;
  evidence: {
    build: {
      pathway_available: boolean;
      active_course_count: number;
      avg_course_duration_hours: number | null;
      enrolled_learners: number;
      in_progress_learners: number;
    };
    move: {
      mobility_candidates: number;
    };
    buy: {
      active_recruiting_demand: number;
      historical_filled_requisitions: number;
      median_time_to_fill_days: number | null;
    };
    borrow: {
      data_available: boolean;
      active_contingent_workers: number;
      avg_active_bill_rate: number | null;
    };
    automate: {
      data_available: boolean;
      reason: string;
    };
  };
  warnings: string[];
  methodology: string[];
};

export type InternalTalentReadinessResponse = {
  job_profile_code: string;
  job_profile_name: string;
  required_skill_count: number;
  candidate_pool: {
    active_with_profile_preference: number;
    already_in_target_role: number;
    eligible_internal_candidates: number;
    role_ready: number;
    near_ready: number;
    longer_term: number;
    role_ready_pct: number;
    ready_or_near_ready_pct: number;
  };
  top_near_ready_skill_gaps: Array<{
    skill_code: string;
    skill_name: string;
    required_proficiency: number;
    candidates_below_requirement: number;
    avg_proficiency_shortfall: number;
    active_course_count: number;
    shortest_active_course_hours: number | null;
  }>;
  development_pathway_coverage: {
    near_ready_candidates: number;
    fully_pathway_covered_candidates: number;
    partially_pathway_covered_candidates: number;
    no_active_pathway_candidates: number;
    fully_pathway_covered_pct: number;
  };
  readiness_rules: {
    required_skills_gate_readiness: true;
    preferred_skills_gate_readiness: false;
    near_ready_max_missing_required_skills: number;
    near_ready_max_total_proficiency_shortfall: number;
  };
  methodology: string[];
};

export type RoleBuyFeasibilityResponse = {
  timing_evidence?: import("./recruiting-timing").RecruitingTimingEvidence;
  as_of: string;
  job_profile_code: string;
  job_profile_name: string;
  current_pipeline: {
    open_requisitions: number;
    applicants: number;
    advanced_candidates: number;
    interviews: number;
    offers: number;
  };
  historical_external: {
    filled_requisitions: number;
    recent_12m_filled_requisitions: number;
    recent_12m_avg_monthly_fills: number;
    recent_12m_peak_monthly_fills: number;
    median_time_to_fill_days: number | null;
    offer_acceptance_rate_pct: number | null;
    applicants_per_filled_requisition: number | null;
    evidence_start_date: string | null;
    recent_12m_window_start: string;
  };
  requested_buy: number;
  buy_scale: {
    pct_of_recent_12m_external_fills: number | null;
    multiple_of_recent_avg_monthly_fills: number | null;
  };
  warnings: string[];
  methodology: string[];
};

export type RoleWorkforceResponsePlanResponse = {
  job_profile_code: string;
  job_profile_name: string;
  scenario_created_role_demand: number;
  allocation: WorkforceResponsePlanAllocation;
  planned_role_coverage_if_executed: number;
  remaining_role_gap_if_executed: number;
  overplanned_capacity: number;
  coverage_pct_if_executed: number;
  internal_talent_readiness: InternalTalentReadinessResponse;
  external_recruiting_feasibility: RoleBuyFeasibilityResponse;
  skill_bundle: Array<{
    skill_code: string;
    skill_name: string;
    skill_category: string;
    required_proficiency: number;
    importance: string;
    weight: number;
    build_pathway_available: boolean;
    active_course_count: number;
    mobility_candidates: number;
    historical_filled_requisitions: number;
    median_time_to_fill_days: number | null;
  }>;
  evidence_summary: {
    required_skill_count: number;
    skills_with_build_pathway: number;
    skills_with_move_signal: number;
    skills_with_buy_history: number;
  };
  warnings: string[];
  methodology: string[];
};

export type BusinessUnitResponseAllocationResponse = {
  as_of: string;
  scenario_net_role_demand: number;
  gross_destination_demand: number;
  contraction_offset: number;
  allocation: WorkforceResponsePlanAllocation;
  effective_coverage_if_executed: number;
  remaining_net_gap_if_executed: number;
  overplanned_capacity: number;
  roles: Array<{
    job_profile_code: string;
    job_profile_name: string;
    enterprise_net_role_demand: number;
    gross_positive_bu_demand: number;
    contraction_offset: number;
    allocation: WorkforceResponsePlanAllocation;
    portfolio_target_allocation: WorkforceResponsePlanAllocation | null;
    allocation_delta_vs_portfolio: WorkforceResponsePlanAllocation | null;
    portfolio_allocation_reconciled: boolean | null;
    effective_coverage_if_executed: number;
    remaining_net_gap_if_executed: number;
    overplanned_capacity: number;
    role_evidence: RoleWorkforceResponsePlanResponse;
  }>;
  business_units: Array<{
    org_code: string;
    org_name: string;
    job_profile_code: string;
    job_profile_name: string;
    gross_destination_demand: number;
    allocation: WorkforceResponsePlanAllocation;
    raw_allocated_response: number;
    effective_destination_coverage: number;
    destination_gap_before_enterprise_offsets: number;
    destination_overallocation: number;
  }>;
  unallocated_destinations: Array<{
    org_code: string;
    org_name: string;
    job_profile_code: string;
    job_profile_name: string;
    gross_destination_demand: number;
  }>;
  contractions: Array<{
    org_code: string;
    org_name: string;
    job_profile_code: string;
    job_profile_name: string;
    contraction_delta: number;
  }>;
  warnings: string[];
  methodology: string[];
};

export type TimePhasedWorkforceExecutionResponse = {
  as_of: string;
  planning_start_month: string;
  planning_end_month: string;
  target_allocation: WorkforceResponsePlanAllocation;
  scheduled_allocation: WorkforceResponsePlanAllocation;
  unscheduled_allocation: WorkforceResponsePlanAllocation;
  overscheduled_allocation: WorkforceResponsePlanAllocation;
  scenario_net_role_demand: number;
  final_effective_coverage: number;
  final_remaining_net_gap: number;
  final_coverage_pct: number;
  timeline: Array<{
    month: string;
    effective_build: number;
    effective_move: number;
    effective_buy: number;
    cumulative_build: number;
    cumulative_move: number;
    cumulative_buy: number;
    cumulative_effective_coverage: number;
    remaining_net_gap: number;
    coverage_pct: number;
  }>;
  business_units: Array<{
    org_code: string;
    org_name: string;
    job_profile_code: string;
    job_profile_name: string;
    target_allocation: WorkforceResponsePlanAllocation;
    scheduled_allocation: WorkforceResponsePlanAllocation;
    unscheduled_allocation: WorkforceResponsePlanAllocation;
    overscheduled_allocation: WorkforceResponsePlanAllocation;
  }>;
  schedule_entries: Array<{
    org_code: string;
    org_name: string;
    job_profile_code: string;
    job_profile_name: string;
    response_type: "build" | "move" | "buy";
    amount: number;
    effective_month: string;
    effective_amount_within_target: number;
    excess_amount: number;
  }>;
  warnings: string[];
  methodology: string[];
};

export type WorkforceResponseConstraintResponse = {
  as_of: string;
  overall_feasible: boolean;
  hard_constraint_count: number;
  hard_constraint_breaches: number;
  hard_constraints: Array<{
    constraint_code: string;
    label: string;
    passed: boolean;
    actual_value: number | string | boolean;
    limit_value: number | string | boolean;
    detail: string;
  }>;
  deadline: {
    deadline_month: string | null;
    required_coverage_pct: number | null;
    actual_coverage_pct: number | null;
    passed: boolean | null;
  };
  evidence_checks: Array<{
    job_profile_code: string;
    job_profile_name: string;
    build_target: number;
    fully_pathway_covered_near_ready: number;
    build_exceeds_current_path_covered: boolean;
    move_target: number;
    role_ready_internal_candidates: number;
    move_exceeds_role_ready: boolean;
    buy_target: number;
    recent_12m_external_fills: number;
    buy_pct_of_recent_12m_external_fills: number | null;
  }>;
  execution: TimePhasedWorkforceExecutionResponse;
  warnings: string[];
  methodology: string[];
};

export type ConstraintAwareWorkforceScheduleResponse = {
  as_of: string;
  scheduling_start_month: string;
  scheduling_end_month: string;
  target_allocation: WorkforceResponsePlanAllocation;
  generated_schedule: Array<{
    org_code: string;
    org_name: string;
    job_profile_code: string;
    job_profile_name: string;
    response_type: "build" | "move" | "buy";
    amount: number;
    effective_month: string;
  }>;
  scheduled_allocation: WorkforceResponsePlanAllocation;
  unscheduled_allocation: WorkforceResponsePlanAllocation;
  fully_scheduled: boolean;
  hard_constraint_feasible: boolean | null;
  constraint_result: WorkforceResponseConstraintResponse | null;
  blockers: string[];
  methodology: string[];
};

export type WorkforceResponsePortfolioResponse = {
  as_of: string;
  scenario_positive_role_demand: number;
  planned_role_demand: number;
  unplanned_role_demand: number;
  allocation: WorkforceResponsePlanAllocation;
  planned_coverage_if_executed: number;
  remaining_gap_if_executed: number;
  overplanned_capacity: number;
  coverage_pct_of_planned_roles: number;
  coverage_pct_of_all_positive_role_demand: number;
  internal_supply: {
    role_ready: number;
    near_ready: number;
    fully_pathway_covered_near_ready: number;
  };
  recruiting_evidence: {
    current_open_requisitions: number;
    recent_12m_external_fills: number;
  };
  demand_by_business_unit: Array<{
    org_code: string;
    org_name: string;
    scenario_role_demand_delta: number;
    portfolio_role_demand_delta: number;
    roles: Array<{
      job_profile_code: string;
      job_profile_name: string;
      scenario_created_role_demand_delta: number;
      included_in_portfolio: boolean;
    }>;
  }>;
  roles: RoleWorkforceResponsePlanResponse[];
  unplanned_roles: Array<{
    job_profile_code: string;
    job_profile_name: string;
    scenario_created_role_demand: number;
  }>;
  warnings: string[];
  methodology: string[];
};

export type StructuralPositionCatalogResponse = {
  as_of: string;
  business_units: Array<{
    org_code: string;
    org_name: string;
  }>;
  levels: Array<{
    level_code: string;
    level_name: string;
    level_rank: number;
  }>;
  job_profiles: Array<{
    job_profile_code: string;
    job_profile_name: string;
  }>;
  combinations: Array<{
    org_code: string;
    level_code: string;
    job_profile_code: string;
    current_positions: number;
    vacant_positions: number;
    annual_cost_per_position_usd: number;
  }>;
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

export type LearningDevelopmentSkillPathway = {
  skill_id: string | number;
  skill_code: string;
  skill_name: string;
  skill_category: string;
  employees_in_roles_requiring_skill: number;
  employees_below_or_missing_requirement: number;
  requirement_met_pct: number;
  pathway_available: boolean;
  active_course_count: number;
  shortest_catalog_duration_hours: number | null;
  avg_catalog_duration_hours: number | null;
};

export type LearningDevelopmentJobProfilePathway = {
  job_profile_code: string;
  job_profile_name: string;
  required_skill_count: number;
  required_skills_with_active_pathway: number;
  pathway_coverage_pct: number;
  active_course_count: number;
  shortest_catalog_duration_hours: number | null;
};

export type LearningDevelopmentResponse = {
  as_of: string;
  summary: {
    current_workforce: number;
    current_gap_skills: number;
    gap_skills_with_active_pathway: number;
    gap_pathway_coverage_pct: number;
    active_courses_on_gap_skills: number;
    active_job_profiles: number;
    job_profiles_with_any_pathway: number;
    fully_covered_job_profiles: number;
  };
  skill_pathways: LearningDevelopmentSkillPathway[];
  job_profile_pathways: LearningDevelopmentJobProfilePathway[];
  methodology: string[];
};

export type CareerMobilityAggregateItem = {
  code: string;
  label: string;
  employees: number;
  share_pct: number;
};

export type CareerMobilityLocationItem = {
  location_code: string;
  location_name: string;
  city: string | null;
  country_code: string;
  employees: number;
  share_pct: number;
};

export type CareerMobilityOrgCoverageItem = {
  org_code: string;
  org_name: string;
  active_employees: number;
  employees_with_preference: number;
  preference_coverage_pct: number;
};

export type CareerMobilityResponse = {
  as_of: string | null;
  summary: {
    active_employees: number;
    employees_with_preference: number;
    employees_without_preference: number;
    preference_record_coverage_pct: number;
    known_relocation_records: number;
    relocation_willing_employees: number;
    relocation_willing_pct: number;
    destination_profile_records: number;
    destination_location_records: number;
    career_interest_records: number;
  };
  data_quality: {
    preference_rows: number;
    distinct_preference_employees: number;
    employees_with_multiple_preference_rows: number;
    missing_desired_profile: number;
    missing_desired_location: number;
    missing_relocation_willingness: number;
    missing_career_interest: number;
    unmatched_profile_references: number;
    unmatched_location_references: number;
    unmatched_current_org_references: number;
    earliest_preference_update: string | null;
    latest_preference_update: string | null;
  };
  career_interests: CareerMobilityAggregateItem[];
  destination_roles: CareerMobilityAggregateItem[];
  desired_locations: CareerMobilityLocationItem[];
  current_org_coverage: CareerMobilityOrgCoverageItem[];
  methodology: string[];
};

export type SuccessionCoverageResponse = {
  as_of_date: string | null;
  small_cell_threshold: number;
  critical_job_profiles: number;
  filled_critical_positions: number | null;
  positions_with_recorded_plan: number | null;
  positions_without_recorded_plan: number | null;
  recorded_plan_coverage_pct: number | null;
  plan_coverage_suppressed: boolean;
  positions_with_ready_now: number | null;
  positions_without_ready_now: number | null;
  ready_now_plan_pct: number | null;
  ready_now_suppressed: boolean;
  suppression_reason:
    | "population_small_cell"
    | "plan_partition_small_cell"
    | "readiness_partition_small_cell"
    | null;
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
  exit_enps?: import("./exit-enps").ExitEnpsSummary | null;
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
