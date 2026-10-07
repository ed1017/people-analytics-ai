// Synthetic contracts only. Never imported by the application or a server route.
import type {StructuralPositionScenarioResponse,RoleWorkforceResponsePlanResponse} from '../../lib/types';
export const structural:StructuralPositionScenarioResponse={
 as_of:'2026-09-30',actions:[{action_type:'add_positions',business_unit:null,level:null,job_profile:'SYN-ROLE',amount:2,fill_pct:0}],
 current:{authorized_positions:1100,filled_positions:1000,open_vacancies:100,frozen_positions:0,open_requisitions:20,on_hold_requisitions:0,uncovered_vacancies:80},
 modeled:{authorized_positions:1102,filled_positions:1000,open_vacancies:102,frozen_positions:0,net_authorized_position_change:2,net_filled_position_change:0,vacancy_rate_pct:9.26,authorized_budget_delta_usd:200000,annualized_staffed_labor_cost_delta_usd:0},
 job_profile_impact:[{job_profile_code:'SYN-ROLE',job_profile_name:'Synthetic role',current_authorized_positions:10,modeled_authorized_positions:12,authorized_position_delta:2,current_filled_positions:10,modeled_filled_positions:10,filled_position_delta:0,modeled_open_vacancies:2,modeled_frozen_positions:0,modeled_active_recruiting_demand:2}],
 business_unit_job_profile_impact:[],
 skill_demand:{skills_with_increased_authorized_demand:0,skills_with_reduced_authorized_demand:0,top_changed_skills:[],largest_modeled_gaps:[],top_recruiting_skill_demand:[]},
 response_strategy:{scope:'scenario_widened_skill_gaps',skills_evaluated:0,borrow_data_available:false,automate_data_available:false,skills:[]},
 recruiting_demand:{active_open_requisitions:20,on_hold_requisitions:0,uncovered_open_vacancies:82,active_recruiting_demand:102,incremental_requisitions_needed:2,requisitions_to_hold:0,requisitions_to_cancel:0,requisitions_to_create_for_modeled_fills:0,requisitions_to_reactivate_for_modeled_fills:0,requisitions_closed_as_filled:0,by_business_unit:[]},
 action_results:[],methodology:['Synthetic local lifecycle fixture; no observed company data.'],
};
export const rolePlan:RoleWorkforceResponsePlanResponse={
 job_profile_code:'SYN-ROLE',job_profile_name:'Synthetic role',scenario_created_role_demand:2,
 allocation:{build:1,move:0,buy:1,borrow:0,automate:0},planned_role_coverage_if_executed:2,remaining_role_gap_if_executed:0,overplanned_capacity:0,coverage_pct_if_executed:100,
 internal_talent_readiness:{job_profile_code:'SYN-ROLE',job_profile_name:'Synthetic role',required_skill_count:0,candidate_pool:{active_with_profile_preference:5,already_in_target_role:1,eligible_internal_candidates:4,role_ready:1,near_ready:1,longer_term:2,role_ready_pct:25,ready_or_near_ready_pct:50},top_near_ready_skill_gaps:[],development_pathway_coverage:{near_ready_candidates:1,fully_pathway_covered_candidates:0,partially_pathway_covered_candidates:0,no_active_pathway_candidates:1,fully_pathway_covered_pct:0},readiness_rules:{required_skills_gate_readiness:true,preferred_skills_gate_readiness:false,near_ready_max_missing_required_skills:2,near_ready_max_total_proficiency_shortfall:2},methodology:['Synthetic readiness.']},
 external_recruiting_feasibility:{as_of:'2026-09-30',job_profile_code:'SYN-ROLE',job_profile_name:'Synthetic role',current_pipeline:{open_requisitions:2,applicants:8,advanced_candidates:2,interviews:2,offers:1},historical_external:{filled_requisitions:4,recent_12m_filled_requisitions:4,recent_12m_avg_monthly_fills:0.33,recent_12m_peak_monthly_fills:1,median_time_to_fill_days:45,offer_acceptance_rate_pct:80,applicants_per_filled_requisition:8,evidence_start_date:'2025-10-01',recent_12m_window_start:'2025-10-01'},requested_buy:1,buy_scale:{pct_of_recent_12m_external_fills:25,multiple_of_recent_avg_monthly_fills:3},warnings:[],methodology:['Synthetic recruiting.']},
 skill_bundle:[],evidence_summary:{required_skill_count:0,skills_with_build_pathway:0,skills_with_move_signal:0,skills_with_buy_history:0},warnings:[],methodology:['Synthetic response plan.'],
};
