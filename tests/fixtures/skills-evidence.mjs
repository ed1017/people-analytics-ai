export const skill = {
  skill_id: "skill-ai",
  skill_code: "AI",
  skill_name: "Artificial Intelligence",
  skill_category: "AI",
  employees_in_roles_requiring_skill: 674,
  employees_with_observed_proficiency: 600,
  employees_meeting_requirement: 344,
  employees_below_or_missing_requirement: 330,
  avg_required_proficiency: 3.8,
  avg_observed_proficiency: 3.23,
  avg_proficiency_gap: 0.57,
  profile_coverage_pct: 89.0,
  requirement_met_pct: 51.0,
  avg_requirement_weight: 4.0,
};

const secondSkill = {
  ...skill,
  skill_id: "skill-genai",
  skill_code: "GENAI",
  skill_name: "Generative AI",
  employees_in_roles_requiring_skill: 586,
  employees_meeting_requirement: 306,
  employees_below_or_missing_requirement: 280,
  requirement_met_pct: 52.2,
};

export const skillsData = {
  as_of: "2026-09-30",
  summary: {
    active_skills: 100,
    current_workforce: 10000,
    skills_with_demand: 90,
    skills_below_60_pct: 10,
    skills_below_75_pct: 20,
    weighted_requirement_met_pct: 70,
    average_profile_coverage_pct: 90,
    onet_mapped_job_profiles: 40,
    total_job_profiles: 50,
  },
  largest_gaps: [skill, secondSkill],
  highest_demand: [skill],
  strongest_coverage: [],
};
