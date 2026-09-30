import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase-server";
import type {
  LearningDevelopmentJobProfilePathway,
  LearningDevelopmentSkillPathway,
} from "@/lib/types";

export const dynamic = "force-dynamic";

type GapRow = {
  skill_id: string | number;
  skill_code: string;
  skill_name: string;
  skill_category: string;
  employees_in_roles_requiring_skill: number | string | null;
  employees_below_or_missing_requirement: number | string | null;
  requirement_met_pct: number | string | null;
};

type CourseRow = {
  course_id: string;
  skill_id: string | number;
  duration_hours: number | string | null;
};

type JobProfileRow = {
  job_profile_id: string;
  job_profile_code: string;
  job_profile_name: string;
};
type RequirementRow = {
  job_profile_id: string;
  skill_id: string | number;
  importance: string;
};

function toNumber(
  value: number | string | null | undefined
) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export async function GET() {
  try {
    const [
      gapsResult,
      coursesResult,
      profilesResult,
      requirementsResult,
    ] = await Promise.all([
      supabaseServer
        .from("skills_proficiency_gap_summary")
        .select(
          "skill_id, skill_code, skill_name, skill_category, employees_in_roles_requiring_skill, employees_below_or_missing_requirement, requirement_met_pct"
        ),
      supabaseServer
        .from("learning_courses")
        .select(
          "course_id, skill_id, duration_hours"
        )
        .eq("active", true),

      supabaseServer
        .from("job_profiles")
        .select(
          "job_profile_id, job_profile_code, job_profile_name"
        )
        .eq("active", true),

      supabaseServer
        .from("job_skill_requirements")
        .select(
          "job_profile_id, skill_id, importance"
        ),
    ]);

    if (gapsResult.error) {
      throw new Error(
        "Learning & Development skill gaps: " +
          gapsResult.error.message
      );
    }

    if (coursesResult.error) {
      throw new Error(
        "Learning & Development courses: " +
          coursesResult.error.message
      );
    }

    if (profilesResult.error) {
      throw new Error(
        "Learning & Development job profiles: " +
          profilesResult.error.message
      );
    }
    if (requirementsResult.error) {
      throw new Error(
        "Learning & Development job requirements: " +
          requirementsResult.error.message
      );
    }

    const gaps = (gapsResult.data ?? []) as GapRow[];
    const courses =
      (coursesResult.data ?? []) as CourseRow[];
    const profiles =
      (profilesResult.data ?? []) as JobProfileRow[];
    const requirements =
      (requirementsResult.data ?? []) as RequirementRow[];

    const courseStatsBySkill = new Map<
      string,
      {
        active_course_count: number;
        shortest_catalog_duration_hours:
          | number
          | null;
        total_catalog_duration_hours: number;
        duration_count: number;
      }
    >();

    for (const course of courses) {
      const skillId = String(course.skill_id);
      const existing =
        courseStatsBySkill.get(skillId) ?? {
          active_course_count: 0,
          shortest_catalog_duration_hours: null,
          total_catalog_duration_hours: 0,
          duration_count: 0,
        };
      existing.active_course_count += 1;

      const duration = toNumber(
        course.duration_hours
      );

      if (duration > 0) {
        existing.total_catalog_duration_hours +=
          duration;
        existing.duration_count += 1;
        existing.shortest_catalog_duration_hours =
          existing.shortest_catalog_duration_hours ===
            null ||
          duration <
            existing.shortest_catalog_duration_hours
            ? duration
            : existing.shortest_catalog_duration_hours;
      }

      courseStatsBySkill.set(
        skillId,
        existing
      );
    }

    const skillPathways: LearningDevelopmentSkillPathway[] =
      gaps
        .filter(
          (row) =>
            toNumber(
              row.employees_in_roles_requiring_skill
            ) > 0 &&
            toNumber(
              row.employees_below_or_missing_requirement
            ) > 0
        )
        .map((row) => {
          const stats =
            courseStatsBySkill.get(
              String(row.skill_id)
            ) ?? {
              active_course_count: 0,
              shortest_catalog_duration_hours: null,
              total_catalog_duration_hours: 0,
              duration_count: 0,
            };

          return {
            skill_id: row.skill_id,
            skill_code: row.skill_code,
            skill_name: row.skill_name,
            skill_category:
              row.skill_category,
            employees_in_roles_requiring_skill:
              toNumber(
                row.employees_in_roles_requiring_skill
              ),
            employees_below_or_missing_requirement:
              toNumber(
                row.employees_below_or_missing_requirement
              ),
            requirement_met_pct:
              toNumber(
                row.requirement_met_pct
              ),
            pathway_available:
              stats.active_course_count > 0,
            active_course_count:
              stats.active_course_count,
            shortest_catalog_duration_hours:
              stats.shortest_catalog_duration_hours,
            avg_catalog_duration_hours:
              stats.duration_count > 0
                ? round1(
                    stats.total_catalog_duration_hours /
                      stats.duration_count
                  )
                : null,
          };
        })
        .sort(
          (a, b) =>
            b.employees_below_or_missing_requirement -
              a.employees_below_or_missing_requirement ||
            a.skill_name.localeCompare(
              b.skill_name
            )
        );

    const requirementsByProfile = new Map<
      string,
      RequirementRow[]
    >();

    for (const requirement of requirements) {
      if (requirement.importance !== "required") {
        continue;
      }

      const rows =
        requirementsByProfile.get(
          requirement.job_profile_id
        ) ?? [];

      rows.push(requirement);
      requirementsByProfile.set(
        requirement.job_profile_id,
        rows
      );
    }
    const jobProfilePathways: LearningDevelopmentJobProfilePathway[] =
      profiles
        .map((profile) => {
          const requiredSkills =
            requirementsByProfile.get(
              profile.job_profile_id
            ) ?? [];

          let covered = 0;
          let activeCourseCount = 0;
          let shortestCatalogDurationHours:
            | number
            | null = null;

          for (const requirement of requiredSkills) {
            const stats =
              courseStatsBySkill.get(
                String(requirement.skill_id)
              );

            if (
              !stats ||
              stats.active_course_count === 0
            ) {
              continue;
            }

            covered += 1;
            activeCourseCount +=
              stats.active_course_count;

            const shortest =
              stats.shortest_catalog_duration_hours;

            if (
              shortest !== null &&
              (shortestCatalogDurationHours ===
                null ||
                shortest <
                  shortestCatalogDurationHours)
            ) {
              shortestCatalogDurationHours =
                shortest;
            }
          }

          const requiredSkillCount =
            requiredSkills.length;

          return {
            job_profile_code:
              profile.job_profile_code,
            job_profile_name:
              profile.job_profile_name,
            required_skill_count:
              requiredSkillCount,
            required_skills_with_active_pathway:
              covered,
            pathway_coverage_pct:
              requiredSkillCount > 0
                ? round1(
                    (covered /
                      requiredSkillCount) *
                      100
                  )
                : 0,
            active_course_count:
              activeCourseCount,
            shortest_catalog_duration_hours:
              shortestCatalogDurationHours,
          };
        })
        .sort(
          (a, b) =>
            b.pathway_coverage_pct -
              a.pathway_coverage_pct ||
            b.required_skill_count -
              a.required_skill_count ||
            a.job_profile_name.localeCompare(
              b.job_profile_name
            )
        );

    const gapSkillsWithPathway =
      skillPathways.filter(
        (row) => row.pathway_available
      ).length;

    const activeCoursesOnGapSkills =
      skillPathways.reduce(
        (sum, row) =>
          sum + row.active_course_count,
        0
      );

    const jobProfilesWithAnyPathway =
      jobProfilePathways.filter(
        (row) =>
          row.required_skills_with_active_pathway >
          0
      ).length;

    const fullyCoveredJobProfiles =
      jobProfilePathways.filter(
        (row) =>
          row.required_skill_count > 0 &&
          row.required_skills_with_active_pathway ===
            row.required_skill_count
      ).length;
    return NextResponse.json(
      {
        as_of: "2026-09-30",
        summary: {
          current_gap_skills:
            skillPathways.length,
          gap_skills_with_active_pathway:
            gapSkillsWithPathway,
          gap_pathway_coverage_pct:
            skillPathways.length > 0
              ? round1(
                  (gapSkillsWithPathway /
                    skillPathways.length) *
                    100
                )
              : 0,
          active_courses_on_gap_skills:
            activeCoursesOnGapSkills,
          active_job_profiles:
            jobProfilePathways.length,
          job_profiles_with_any_pathway:
            jobProfilesWithAnyPathway,
          fully_covered_job_profiles:
            fullyCoveredJobProfiles,
        },
        skill_pathways: skillPathways,
        job_profile_pathways:
          jobProfilePathways,
        methodology: [
          "Current skill gaps use the governed skills proficiency gap summary and represent employees below or missing the required proficiency for current roles.",
          "Missing or stale skill records contribute to the below-or-missing gap signal and are not proof that an employee lacks a capability.",
          "An active learning pathway exists when at least one active learning course is mapped to the skill.",
          "Course availability is pathway evidence only. It does not prove proficiency gain, completion, role readiness, promotion eligibility, or hiring suitability.",
          "Catalog duration is the configured course duration only and is not a time-to-readiness forecast.",
          "Job-profile pathway coverage counts required skills with at least one active mapped course. It does not measure employee readiness for the job profile.",
          "Results are aggregate and read-only; no employee identities or rankings are exposed.",
        ],
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Learning & Development API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Learning & Development data.",
      },
      { status: 500 }
    );
  }
}
