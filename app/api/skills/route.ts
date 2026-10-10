import { withDatasetRequest, datasetRouter } from "@/lib/dataset-runtime";
import {readFreshSkillGaps,readFreshSkillHeadcount} from '@/lib/home-fresh-skill-reads';
import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase-server";

export const dynamic = "force-dynamic";

type SkillGapRow = {
  skill_id: string | number;
  skill_code: string;
  skill_name: string;
  skill_category: string;
  employees_in_roles_requiring_skill: number | string | null;
  employees_with_observed_proficiency: number | string | null;
  employees_meeting_requirement: number | string | null;
  employees_below_or_missing_requirement: number | string | null;
  avg_required_proficiency: number | string | null;
  avg_observed_proficiency: number | string | null;
  avg_proficiency_gap: number | string | null;
  profile_coverage_pct: number | string | null;
  requirement_met_pct: number | string | null;
  avg_requirement_weight: number | string | null;
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

async function handleGET() {
  try {
    const client=datasetRouter.client() as typeof supabaseServer,token=datasetRouter.current().token;
    const [
      gapsResult,
      skillCountResult,
      currentWorkforceResult,
      onetMappingResult,
      jobProfilesResult,
    ] = await Promise.all([
      readFreshSkillGaps(client,token,'skills'),

      supabaseServer
        .from("skills")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("active", true),

      readFreshSkillHeadcount(client,token),

      supabaseServer
        .from("job_onet_mapping")
        .select("*", {
          count: "exact",
          head: true,
        }),

      supabaseServer
        .from("job_profiles")
        .select("*", {
          count: "exact",
          head: true,
        }),
    ]);

    if (gapsResult.error) {
      throw new Error(
        `Skills gaps: ${gapsResult.error.message}`
      );
    }

    if (skillCountResult.error) {
      throw new Error(
        `Skills count: ${skillCountResult.error.message}`
      );
    }

    if (currentWorkforceResult.error) {
      throw new Error(
        `Current workforce: ${currentWorkforceResult.error.message}`
      );
    }

    if (onetMappingResult.error) {
      throw new Error(
        `O*NET mappings: ${onetMappingResult.error.message}`
      );
    }

    if (jobProfilesResult.error) {
      throw new Error(
        `Job profiles: ${jobProfilesResult.error.message}`
      );
    }

    const gaps: SkillGapRow[] =
      gapsResult.data ?? [];

    const normalized = gaps.map(
      (row) => ({
        skill_id: row.skill_id,
        skill_code: row.skill_code,
        skill_name: row.skill_name,
        skill_category:
          row.skill_category,
        employees_in_roles_requiring_skill:
          toNumber(
            row.employees_in_roles_requiring_skill
          ),
        employees_with_observed_proficiency:
          toNumber(
            row.employees_with_observed_proficiency
          ),
        employees_meeting_requirement:
          toNumber(
            row.employees_meeting_requirement
          ),
        employees_below_or_missing_requirement:
          toNumber(
            row.employees_below_or_missing_requirement
          ),
        avg_required_proficiency:
          toNumber(
            row.avg_required_proficiency
          ),
        avg_observed_proficiency:
          toNumber(
            row.avg_observed_proficiency
          ),
        avg_proficiency_gap:
          toNumber(
            row.avg_proficiency_gap
          ),
        profile_coverage_pct:
          toNumber(
            row.profile_coverage_pct
          ),
        requirement_met_pct:
          toNumber(
            row.requirement_met_pct
          ),
        avg_requirement_weight:
          toNumber(
            row.avg_requirement_weight
          ),
      })
    );

    const withDemand = normalized.filter(
      (row) =>
        row.employees_in_roles_requiring_skill >
        0
    );

    const largestGaps = [...withDemand]
      .sort((a, b) => {
        if (
          a.requirement_met_pct !==
          b.requirement_met_pct
        ) {
          return (
            a.requirement_met_pct -
            b.requirement_met_pct
          );
        }

        return (
          b.employees_in_roles_requiring_skill -
          a.employees_in_roles_requiring_skill
        );
      })
      .slice(0, 12);

    const highestDemand = [...withDemand]
      .sort(
        (a, b) =>
          b.employees_in_roles_requiring_skill -
          a.employees_in_roles_requiring_skill
      )
      .slice(0, 10);

    const strongestCoverage = [
      ...withDemand,
    ]
      .sort((a, b) => {
        if (
          a.requirement_met_pct !==
          b.requirement_met_pct
        ) {
          return (
            b.requirement_met_pct -
            a.requirement_met_pct
          );
        }

        return (
          b.employees_in_roles_requiring_skill -
          a.employees_in_roles_requiring_skill
        );
      })
      .slice(0, 10);

    const skillsBelow60 =
      withDemand.filter(
        (row) =>
          row.requirement_met_pct < 60
      ).length;

    const skillsBelow75 =
      withDemand.filter(
        (row) =>
          row.requirement_met_pct < 75
      ).length;

    const totalRequirementPopulation =
      withDemand.reduce(
        (sum, row) =>
          sum +
          row.employees_in_roles_requiring_skill,
        0
      );

    const weightedRequirementMetPct =
      totalRequirementPopulation > 0
        ? round1(
            withDemand.reduce(
              (sum, row) =>
                sum +
                row.requirement_met_pct *
                  row.employees_in_roles_requiring_skill,
              0
            ) /
              totalRequirementPopulation
          )
        : 0;

    const averageProfileCoveragePct =
      withDemand.length > 0
        ? round1(
            withDemand.reduce(
              (sum, row) =>
                sum +
                row.profile_coverage_pct,
              0
            ) / withDemand.length
          )
        : 0;

    return NextResponse.json(
      {
        as_of: "2026-09-30",
        summary: {
          active_skills:
            skillCountResult.count ?? 0,
          current_workforce:
            toNumber(
              currentWorkforceResult.data
                ?.headcount
            ),
          skills_with_demand:
            withDemand.length,
          skills_below_60_pct:
            skillsBelow60,
          skills_below_75_pct:
            skillsBelow75,
          weighted_requirement_met_pct:
            weightedRequirementMetPct,
          average_profile_coverage_pct:
            averageProfileCoveragePct,
          onet_mapped_job_profiles:
            onetMappingResult.count ?? 0,
          total_job_profiles:
            jobProfilesResult.count ?? 0,
        },
        largest_gaps: largestGaps,
        highest_demand: highestDemand,
        strongest_coverage:
          strongestCoverage,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Skills API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load skills data.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return withDatasetRequest(request, () => handleGET());
}
