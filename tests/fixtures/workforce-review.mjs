import {emptyWorkforcePlanInput, calculateWorkforceIncrement} from '../../lib/workforce-increment.ts';

export function workforceReviewFixture() {
  const input = {...emptyWorkforcePlanInput(), businessUnit:'TECH', jobProfile:'ENGINEER', intent:'additional',
    roles:'3', build:'1', move:'1', buy:'1', backfills:'0', planningMonth:'2026-10', months:'3',
    recruitingStart:'2026-10-01', arrivalMode:'explicit', arrivalDate:'2026-11-16',
    buildMonth:'2026-11', moveMonth:'2026-10', annualHireCost:'120000', hireFee:'2000',
    internalAnnualCostChange:'12000', trainingCash:'3000', trainingHours:'20', loadedHourlyCost:'50',
    budget:'25000', maxAddedEmployees:'1', deadlineMonth:'2026-12'};
  return {
    version:1, calculatedAt:'2026-10-03T01:00:00.000Z', input,
    source:{asOf:'2026-09-30', provenance:'synthetic company aggregate',
      businessUnit:{org_code:'TECH',org_name:'Technology'},jobProfile:{job_profile_code:'ENGINEER',job_profile_name:'Engineer'}},
    structural:{authorizedAnnualBudgetDelta:360000,costBasisPeriod:'Stored Baseline December 2027 annual cost per planned position; not a current salary quote'},
    response:{job_profile_code:'ENGINEER', internal_talent_readiness:{job_profile_code:'ENGINEER',
      candidate_pool:{eligible_internal_candidates:9,role_ready:2,near_ready:4},
      development_pathway_coverage:{fully_pathway_covered_candidates:2,partially_pathway_covered_candidates:1,no_active_pathway_candidates:1},
      top_near_ready_skill_gaps:[{skill_name:'Synthetic analysis',candidates_below_requirement:3,active_course_count:2,shortest_active_course_hours:12}]},
      skill_bundle:[{skill_name:'Synthetic analysis',importance:'Required',required_proficiency:3,active_course_count:2}], warnings:['Fixture evidence only.']},
    timing:{scope:{job_profile_code:'ENGINEER',business_unit:null,country:null},period_start:'2025-10-01',period_end:'2026-09-30',opening_to_start:{valid_sample_count:25,median_days:45}},
    proposed:calculateWorkforceIncrement(input,null),
    hireOnly:calculateWorkforceIncrement({...input,build:'0',move:'0',buy:'3',backfills:'0',internalAnnualCostChange:'0',trainingCash:'0',trainingHours:'0'},null),
    limitations:['Synthetic test fixture. Operational availability is unverified.'],
  };
}
