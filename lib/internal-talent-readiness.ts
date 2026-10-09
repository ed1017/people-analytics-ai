import { supabaseServer } from "./supabase-server";
import type {
  LegacyInternalTalentReadinessResponse,
} from "./types";

const NEAR_READY_MAX_MISSING = 2;
const NEAR_READY_MAX_SHORTFALL = 2;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function toNumber(
  value: number | string | null | undefined
) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function emptyDevelopmentPathwayCoverage() {
  return {
    near_ready_candidates: 0,
    fully_pathway_covered_candidates: 0,
    partially_pathway_covered_candidates: 0,
    no_active_pathway_candidates: 0,
    fully_pathway_covered_pct: 0,
  };
}

function emptyCandidatePool(
  activeWithPreference: number,
  alreadyInTargetRole: number
) {
  return {
    active_with_profile_preference:
      activeWithPreference,
    already_in_target_role:
      alreadyInTargetRole,
    eligible_internal_candidates:
      Math.max(
        0,
        activeWithPreference -
          alreadyInTargetRole
      ),
    role_ready: 0,
    near_ready: 0,
    longer_term: 0,
    role_ready_pct: 0,
    ready_or_near_ready_pct: 0,
  };
}

export async function getInternalTalentReadiness(
  jobProfile: string
): Promise<LegacyInternalTalentReadinessResponse> {
  const profileResult =
    await supabaseServer
      .from("job_profiles")
      .select(
        "job_profile_id, job_profile_code, job_profile_name, active"
      )
      .eq("active", true);

  if (profileResult.error) {
    throw new Error(
      "Internal talent target profile: " +
        profileResult.error.message
    );
  }

  const key = normalize(jobProfile);
  const profile =
    (profileResult.data ?? []).find(
      (row) =>
        normalize(row.job_profile_code) ===
          key ||
        normalize(row.job_profile_name) ===
          key
    );

  if (!profile) {
    throw new Error(
      "The selected job profile is not an active governed job profile."
    );
  }

  const requirementResult =
    await supabaseServer
      .from(
        "position_skill_requirement_map"
      )
      .select(
        "skill_code, skill_name, required_proficiency, importance"
      )
      .eq(
        "job_profile_code",
        profile.job_profile_code
      );

  if (requirementResult.error) {
    throw new Error(
      "Internal talent role requirements: " +
        requirementResult.error.message
    );
  }
  const requiredRows =
    (requirementResult.data ?? []).filter(
      (row) =>
        normalize(row.importance ?? "") ===
        "required"
    );

  if (requiredRows.length === 0) {
    throw new Error(
      "The selected job profile has no required skills in the governed skill model."
    );
  }

  const skillResult =
    await supabaseServer
      .from("skills")
      .select(
        "skill_id, skill_code"
      )
      .in(
        "skill_code",
        requiredRows.map(
          (row) => row.skill_code
        )
      );

  if (skillResult.error) {
    throw new Error(
      "Internal talent skill catalog: " +
        skillResult.error.message
    );
  }
  const skillIdByCode = new Map(
    (skillResult.data ?? []).map(
      (row) => [
        row.skill_code,
        row.skill_id,
      ]
    )
  );

  const requirements =
    requiredRows.flatMap((row) => {
      const skillId =
        skillIdByCode.get(
          row.skill_code
        );
      if (!skillId) return [];
      return [{
        skill_id: skillId,
        skill_code: row.skill_code,
        skill_name: row.skill_name,
        required_proficiency:
          toNumber(
            row.required_proficiency
          ),
      }];
    });

  if (
    requirements.length !==
    requiredRows.length
  ) {
    throw new Error(
      "One or more required role skills could not be resolved to the governed skill catalog."
    );
  }
  const preferenceResult =
    await supabaseServer
      .from("career_preferences")
      .select("employee_id")
      .eq(
        "desired_job_profile_id",
        profile.job_profile_id
      );

  if (preferenceResult.error) {
    throw new Error(
      "Internal talent career preferences: " +
        preferenceResult.error.message
    );
  }

  const preferredEmployeeIds =
    Array.from(
      new Set(
        (preferenceResult.data ?? [])
          .map((row) => row.employee_id)
          .filter(Boolean)
      )
    );

  if (preferredEmployeeIds.length === 0) {
    return {
      job_profile_code:
        profile.job_profile_code,
      job_profile_name:
        profile.job_profile_name,
      required_skill_count:
        requirements.length,
      candidate_pool:
        emptyCandidatePool(0, 0),
      top_near_ready_skill_gaps: [],
      development_pathway_coverage:
        emptyDevelopmentPathwayCoverage(),
      readiness_rules: {
        required_skills_gate_readiness:
          true,
        preferred_skills_gate_readiness:
          false,
        near_ready_max_missing_required_skills:
          NEAR_READY_MAX_MISSING,
        near_ready_max_total_proficiency_shortfall:
          NEAR_READY_MAX_SHORTFALL,
      },
      methodology: [
        "Candidate readiness uses only active employees who expressed a career preference for the selected job profile.",
        "Employees already incumbent in the target profile are excluded from the internal-mobility candidate pool.",
        "Role-ready means every required skill meets or exceeds the job profile's required proficiency.",
        "Near-ready means no more than two required skills are below proficiency and the total proficiency shortfall across required skills is no more than two points.",
        "Preferred skills are descriptive and do not block role-ready or near-ready classification.",
        "Results are aggregate only and do not expose or rank individual employees.",
      ],
    };
  }

  const employeeResult =
    await supabaseServer
      .from("employees")
      .select("employee_id")
      .in(
        "employee_id",
        preferredEmployeeIds
      )
      .eq(
        "employment_status",
        "active"
      );
  if (employeeResult.error) {
    throw new Error(
      "Internal talent active employees: " +
        employeeResult.error.message
    );
  }

  const activeEmployeeIds =
    (employeeResult.data ?? []).map(
      (row) => row.employee_id
    );

  if (activeEmployeeIds.length === 0) {
    return {
      job_profile_code:
        profile.job_profile_code,
      job_profile_name:
        profile.job_profile_name,
      required_skill_count:
        requirements.length,
      candidate_pool:
        emptyCandidatePool(0, 0),
      top_near_ready_skill_gaps: [],
      development_pathway_coverage:
        emptyDevelopmentPathwayCoverage(),
      readiness_rules: {
        required_skills_gate_readiness:
          true,
        preferred_skills_gate_readiness:
          false,
        near_ready_max_missing_required_skills:
          NEAR_READY_MAX_MISSING,
        near_ready_max_total_proficiency_shortfall:
          NEAR_READY_MAX_SHORTFALL,
      },
      methodology: [
        "Candidate readiness uses only active employees who expressed a career preference for the selected job profile.",
        "Employees already incumbent in the target profile are excluded from the internal-mobility candidate pool.",
        "Role-ready means every required skill meets or exceeds the job profile's required proficiency.",
        "Near-ready means no more than two required skills are below proficiency and the total proficiency shortfall across required skills is no more than two points.",
        "Preferred skills are descriptive and do not block role-ready or near-ready classification.",
        "Results are aggregate only and do not expose or rank individual employees.",
      ],
    };
  }

  const positionResult =
    await supabaseServer
      .from("positions")
      .select(
        "incumbent_employee_id, job_profile_id"
      )
      .in(
        "incumbent_employee_id",
        activeEmployeeIds
      )
      .eq(
        "position_status",
        "filled"
      );

  if (positionResult.error) {
    throw new Error(
      "Internal talent current positions: " +
        positionResult.error.message
    );
  }
  const alreadyInTargetRole =
    new Set(
      (positionResult.data ?? [])
        .filter(
          (row) =>
            row.job_profile_id ===
            profile.job_profile_id
        )
        .map(
          (row) =>
            row.incumbent_employee_id
        )
    );

  const eligibleEmployeeIds =
    activeEmployeeIds.filter(
      (employeeId) =>
        !alreadyInTargetRole.has(
          employeeId
        )
    );

  if (eligibleEmployeeIds.length === 0) {
    return {
      job_profile_code:
        profile.job_profile_code,
      job_profile_name:
        profile.job_profile_name,
      required_skill_count:
        requirements.length,
      candidate_pool:
        emptyCandidatePool(
          activeEmployeeIds.length,
          alreadyInTargetRole.size
        ),
      top_near_ready_skill_gaps: [],
      development_pathway_coverage:
        emptyDevelopmentPathwayCoverage(),
      readiness_rules: {
        required_skills_gate_readiness:
          true,
        preferred_skills_gate_readiness:
          false,
        near_ready_max_missing_required_skills:
          NEAR_READY_MAX_MISSING,
        near_ready_max_total_proficiency_shortfall:
          NEAR_READY_MAX_SHORTFALL,
      },
      methodology: [
        "Candidate readiness uses only active employees who expressed a career preference for the selected job profile.",
        "Employees already incumbent in the target profile are excluded from the internal-mobility candidate pool.",
        "Role-ready means every required skill meets or exceeds the job profile's required proficiency.",
        "Near-ready means no more than two required skills are below proficiency and the total proficiency shortfall across required skills is no more than two points.",
        "Preferred skills are descriptive and do not block role-ready or near-ready classification.",
        "Results are aggregate only and do not expose or rank individual employees.",
      ],
    };
  }

  const [
    employeeSkillResult,
    learningCourseResult,
  ] = await Promise.all([
    supabaseServer
      .from("employee_skill_latest")
      .select(
        "employee_id, skill_id, proficiency"
      )
      .in(
        "employee_id",
        eligibleEmployeeIds
      )
      .in(
        "skill_id",
        requirements.map(
          (row) => row.skill_id
        )
      ),
    supabaseServer
      .from("learning_courses")
      .select(
        "skill_id, duration_hours"
      )
      .eq("active", true)
      .in(
        "skill_id",
        requirements.map(
          (row) => row.skill_id
        )
      ),
  ]);
  if (employeeSkillResult.error) {
    throw new Error(
      "Internal talent employee skills: " +
        employeeSkillResult.error.message
    );
  }
  if (learningCourseResult.error) {
    throw new Error(
      "Internal talent learning pathways: " +
        learningCourseResult.error.message
    );
  }

  const activeCourseStatsBySkill =
    new Map<
      string,
      {
        active_course_count: number;
        shortest_active_course_hours: number | null;
      }
    >();

  for (const row of learningCourseResult.data ?? []) {
    const existing =
      activeCourseStatsBySkill.get(
        row.skill_id
      ) ?? {
        active_course_count: 0,
        shortest_active_course_hours: null,
      };
    const duration = toNumber(
      row.duration_hours
    );
    existing.active_course_count += 1;
    existing.shortest_active_course_hours =
      duration > 0 &&
      (existing.shortest_active_course_hours === null ||
        duration < existing.shortest_active_course_hours)
        ? duration
        : existing.shortest_active_course_hours;
    activeCourseStatsBySkill.set(
      row.skill_id,
      existing
    );
  }

  const proficiencyByEmployee =
    new Map<
      string,
      Map<string, number>
    >();

  for (
    const row of
      employeeSkillResult.data ?? []
  ) {
    const employeeMap =
      proficiencyByEmployee.get(
        row.employee_id
      ) ?? new Map<string, number>();

    employeeMap.set(
      row.skill_id,
      toNumber(row.proficiency)
    );
    proficiencyByEmployee.set(
      row.employee_id,
      employeeMap
    );
  }

  let roleReady = 0;
  let nearReady = 0;
  let longerTerm = 0;
  let fullyPathwayCovered = 0;
  let partiallyPathwayCovered = 0;
  let noActivePathway = 0;

  const nearReadyGapMap =
    new Map<
      string,
      {
        skill_id: string;
        skill_code: string;
        skill_name: string;
        required_proficiency: number;
        candidates_below_requirement: number;
        total_shortfall: number;
      }
    >();
  for (
    const employeeId of
      eligibleEmployeeIds
  ) {
    const employeeSkills =
      proficiencyByEmployee.get(
        employeeId
      ) ?? new Map();

    const gaps = requirements
      .map((requirement) => {
        const proficiency =
          employeeSkills.get(
            requirement.skill_id
          ) ?? 0;
        const shortfall = Math.max(
          0,
          requirement.required_proficiency -
            proficiency
        );

        return {
          ...requirement,
          shortfall,
        };
      })
      .filter(
        (row) => row.shortfall > 0
      );

    const totalShortfall =
      gaps.reduce(
        (sum, row) =>
          sum + row.shortfall,
        0
      );

    if (gaps.length === 0) {
      roleReady += 1;
      continue;
    }
    const isNearReady =
      gaps.length <=
        NEAR_READY_MAX_MISSING &&
      totalShortfall <=
        NEAR_READY_MAX_SHORTFALL;

    if (!isNearReady) {
      longerTerm += 1;
      continue;
    }

    nearReady += 1;

    const gapsWithActivePathway =
      gaps.filter((gap) =>
        (activeCourseStatsBySkill.get(
          gap.skill_id
        )?.active_course_count ?? 0) > 0
      ).length;

    if (
      gapsWithActivePathway === gaps.length
    ) {
      fullyPathwayCovered += 1;
    } else if (gapsWithActivePathway > 0) {
      partiallyPathwayCovered += 1;
    } else {
      noActivePathway += 1;
    }

    for (const gap of gaps) {
      const existing =
        nearReadyGapMap.get(
          gap.skill_code
        ) ?? {
          skill_id:
            gap.skill_id,
          skill_code:
            gap.skill_code,
          skill_name:
            gap.skill_name,
          required_proficiency:
            gap.required_proficiency,
          candidates_below_requirement:
            0,
          total_shortfall: 0,
        };

      existing.candidates_below_requirement +=
        1;
      existing.total_shortfall +=
        gap.shortfall;

      nearReadyGapMap.set(
        gap.skill_code,
        existing
      );
    }
  }

  const eligibleCount =
    eligibleEmployeeIds.length;
  const topNearReadySkillGaps =
    Array.from(
      nearReadyGapMap.values()
    )
      .map((row) => {
        const courseStats =
          activeCourseStatsBySkill.get(
            row.skill_id
          ) ?? {
            active_course_count: 0,
            shortest_active_course_hours: null,
          };

        return {
          skill_code: row.skill_code,
          skill_name: row.skill_name,
          required_proficiency:
            row.required_proficiency,
          candidates_below_requirement:
            row.candidates_below_requirement,
          avg_proficiency_shortfall:
            row.candidates_below_requirement >
            0
              ? round1(
                  row.total_shortfall /
                    row.candidates_below_requirement
                )
              : 0,
          active_course_count:
            courseStats.active_course_count,
          shortest_active_course_hours:
            courseStats.shortest_active_course_hours,
        };
      })
      .sort(
        (a, b) =>
          b.candidates_below_requirement -
            a.candidates_below_requirement ||
          b.avg_proficiency_shortfall -
            a.avg_proficiency_shortfall ||
          a.skill_name.localeCompare(
            b.skill_name
          )
      )
      .slice(0, 8);

  return {
    job_profile_code:
      profile.job_profile_code,
    job_profile_name:
      profile.job_profile_name,
    required_skill_count:
      requirements.length,
    candidate_pool: {
      active_with_profile_preference:
        activeEmployeeIds.length,
      already_in_target_role:
        alreadyInTargetRole.size,
      eligible_internal_candidates:
        eligibleCount,
      role_ready:
        roleReady,
      near_ready:
        nearReady,
      longer_term:
        longerTerm,
      role_ready_pct:
        eligibleCount > 0
          ? round1(
              (roleReady /
                eligibleCount) *
                100
            )
          : 0,
      ready_or_near_ready_pct:
        eligibleCount > 0
          ? round1(
              ((roleReady +
                nearReady) /
                eligibleCount) *
                100
            )
          : 0,
    },
    top_near_ready_skill_gaps:
      topNearReadySkillGaps,
    development_pathway_coverage: {
      near_ready_candidates:
        nearReady,
      fully_pathway_covered_candidates:
        fullyPathwayCovered,
      partially_pathway_covered_candidates:
        partiallyPathwayCovered,
      no_active_pathway_candidates:
        noActivePathway,
      fully_pathway_covered_pct:
        nearReady > 0
          ? round1(
              (fullyPathwayCovered /
                nearReady) *
                100
            )
          : 0,
    },
    readiness_rules: {
      required_skills_gate_readiness:
        true,
      preferred_skills_gate_readiness:
        false,
      near_ready_max_missing_required_skills:
        NEAR_READY_MAX_MISSING,
      near_ready_max_total_proficiency_shortfall:
        NEAR_READY_MAX_SHORTFALL,
    },
    methodology: [
      "Candidate readiness uses only active employees who expressed a career preference for the selected job profile.",
      "Employees already incumbent in the target profile are excluded from the internal-mobility candidate pool.",
      "Role-ready means every required skill meets or exceeds the job profile's required proficiency.",
      "Near-ready means no more than two required skills are below proficiency and the total proficiency shortfall across required skills is no more than two points.",
      "Preferred skills are descriptive and do not block role-ready or near-ready classification.",
      "Development pathway coverage checks whether every current near-ready skill gap has at least one active mapped learning course. Course availability is evidence of a development path, not proof that completion will raise proficiency or make someone role-ready.",
      "Course duration is catalog duration only and is not used as a time-to-readiness forecast.",
      "Missing employee-skill records are treated as no demonstrated proficiency for that required skill, not as proof the employee lacks the skill.",
      "Readiness is a planning signal based on the loaded synthetic skill data; it is not a promotion, hiring, or performance decision.",
      "Results are aggregate only and do not expose or rank individual employees.",
    ],
  };
}
