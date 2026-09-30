import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseServer } from "../../../lib/supabase-server";
import {
  buildScenarioSegmentBreakdown,
  runScenarioModel,
  type ScenarioEngineBaselinePoint,
  type ScenarioEngineSegmentBaseline,
} from "../../../lib/scenario-engine";

import type {
  ScenarioModelAssumptions,
} from "@/lib/types";

export const dynamic = "force-dynamic";

type NumericValue =
  | number
  | string
  | null
  | undefined;

function toNumber(
  value: NumericValue
) {
  if (
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.min(
    max,
    Math.max(min, value)
  );
}

function assumptionValue(
  value: unknown,
  fallback: number,
  min: number,
  max: number
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return clamp(parsed, min, max);
}

async function loadScenarioInputs() {
  const [
    defaultsResult,
    baselineResult,
    overviewResult,
    businessUnitResult,
    jobFamilyResult,
  ] = await Promise.all([
    supabaseServer
      .from("scenario_modeler_defaults")
      .select("*")
      .single(),

    supabaseServer
      .from("workforce_scenario_summary")
      .select(
        "planning_month, planned_headcount, planned_fte, planned_labor_cost_usd"
      )
      .eq("scenario_name", "Baseline")
      .order("planning_month", {
        ascending: true,
      }),

    supabaseServer
      .from("dashboard_overview_current")
      .select("snapshot_date, headcount")
      .single(),

    supabaseServer
      .from("workforce_scenario_by_org")
      .select(
        "planning_month, org_code, org_name, planned_headcount, planned_labor_cost_usd"
      )
      .eq("scenario_name", "Baseline")
      .order("planning_month", {
        ascending: true,
      }),

    supabaseServer
      .from("workforce_scenario_by_job_family")
      .select(
        "planning_month, family_code, family_name, planned_headcount, planned_labor_cost_usd"
      )
      .eq("scenario_name", "Baseline")
      .order("planning_month", {
        ascending: true,
      }),
  ]);

  if (defaultsResult.error) {
    throw new Error(
      "Scenario defaults: " +
        defaultsResult.error.message
    );
  }

  if (baselineResult.error) {
    throw new Error(
      "Baseline plan: " +
        baselineResult.error.message
    );
  }

  if (overviewResult.error) {
    throw new Error(
      "Current workforce: " +
        overviewResult.error.message
    );
  }

  if (businessUnitResult.error) {
    throw new Error(
      "Baseline business-unit plan: " +
        businessUnitResult.error.message
    );
  }

  if (jobFamilyResult.error) {
    throw new Error(
      "Baseline job-family plan: " +
        jobFamilyResult.error.message
    );
  }

  const defaults: ScenarioModelAssumptions =
    {
      annual_growth_pct: toNumber(
        defaultsResult.data
          ?.baseline_annual_growth_pct
      ),
      salary_inflation_pct: toNumber(
        defaultsResult.data
          ?.baseline_salary_inflation_pct
      ),
      annual_attrition_pct: toNumber(
        defaultsResult.data
          ?.baseline_annual_attrition_pct
      ),
      fill_rate_pct: toNumber(
        defaultsResult.data
          ?.baseline_fill_rate_pct
      ),
      productivity_hiring_reduction_pct:
        toNumber(
          defaultsResult.data
            ?.baseline_productivity_hiring_reduction_pct
        ),
    };

  const baselinePoints: ScenarioEngineBaselinePoint[] =
    (baselineResult.data ?? []).map(
      (row) => ({
        planning_month:
          row.planning_month,
        planned_headcount: toNumber(
          row.planned_headcount
        ),
        planned_fte: toNumber(
          row.planned_fte
        ),
        planned_labor_cost_usd:
          toNumber(
            row.planned_labor_cost_usd
          ),
      })
    );

  const businessUnitBaseline:
    ScenarioEngineSegmentBaseline[] =
    (businessUnitResult.data ?? []).map(
      (row) => ({
        planning_month:
          row.planning_month,
        segment_code: row.org_code,
        segment_name: row.org_name,
        planned_headcount: toNumber(
          row.planned_headcount
        ),
        planned_labor_cost_usd:
          toNumber(
            row.planned_labor_cost_usd
          ),
      })
    );

  const jobFamilyBaseline:
    ScenarioEngineSegmentBaseline[] =
    (jobFamilyResult.data ?? []).map(
      (row) => ({
        planning_month:
          row.planning_month,
        segment_code: row.family_code,
        segment_name: row.family_name,
        planned_headcount: toNumber(
          row.planned_headcount
        ),
        planned_labor_cost_usd:
          toNumber(
            row.planned_labor_cost_usd
          ),
      })
    );

  return {
    asOf:
      overviewResult.data
        ?.snapshot_date ??
      defaultsResult.data?.as_of ??
      "2026-09-30",
    startingHeadcount: toNumber(
      overviewResult.data?.headcount
    ),
    defaults,
    baselinePoints,
    businessUnitBaseline,
    jobFamilyBaseline,
  };
}

export async function GET() {
  try {
    const inputs =
      await loadScenarioInputs();

    return NextResponse.json(
      {
        as_of: inputs.asOf,
        defaults: inputs.defaults,
        bounds: {
          annual_growth_pct: {
            min: -10,
            max: 20,
          },
          salary_inflation_pct: {
            min: -5,
            max: 15,
          },
          annual_attrition_pct: {
            min: 0,
            max: 30,
          },
          fill_rate_pct: {
            min: 0,
            max: 100,
          },
          productivity_hiring_reduction_pct:
            {
              min: 0,
              max: 50,
            },
        },
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load scenario model defaults.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const inputs =
      await loadScenarioInputs();

    const body =
      await request.json();

    const requested =
      body?.assumptions ?? {};

    const assumptions: ScenarioModelAssumptions =
      {
        annual_growth_pct:
          assumptionValue(
            requested.annual_growth_pct,
            inputs.defaults
              .annual_growth_pct,
            -10,
            20
          ),
        salary_inflation_pct:
          assumptionValue(
            requested.salary_inflation_pct,
            inputs.defaults
              .salary_inflation_pct,
            -5,
            15
          ),
        annual_attrition_pct:
          assumptionValue(
            requested.annual_attrition_pct,
            inputs.defaults
              .annual_attrition_pct,
            0,
            30
          ),
        fill_rate_pct:
          assumptionValue(
            requested.fill_rate_pct,
            inputs.defaults
              .fill_rate_pct,
            0,
            100
          ),
        productivity_hiring_reduction_pct:
          assumptionValue(
            requested.productivity_hiring_reduction_pct,
            inputs.defaults
              .productivity_hiring_reduction_pct,
            0,
            50
          ),
      };

    const result = runScenarioModel({
      asOf: inputs.asOf,
      startingHeadcount:
        inputs.startingHeadcount,
      baselinePoints:
        inputs.baselinePoints,
      defaults: inputs.defaults,
      assumptions,
    });

    result.segment_breakdown =
      buildScenarioSegmentBreakdown(
        result,
        inputs.businessUnitBaseline,
        inputs.jobFamilyBaseline
      );

    return NextResponse.json(
      result,
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Scenario modeler API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to run scenario model.",
      },
      { status: 500 }
    );
  }
}
