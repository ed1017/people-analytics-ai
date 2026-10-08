import { withDatasetRequest } from "@/lib/dataset-runtime";
import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseServer } from "../../../lib/supabase-server";
import { nullableNumber } from "../../../lib/numeric-contract";
import { hasCompleteReturnedMonthWindow } from "../../../lib/stored-planning";
import { dataApiErrorResponse } from "../../../lib/data-api-error";
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

class ScenarioSourceInputError extends Error {}

function requiredNumber(value: unknown, min = 0, max = Infinity) {
  const parsed = nullableNumber(value);
  if (parsed === null || parsed < min || parsed > max) throw new ScenarioSourceInputError();
  return parsed;
}

function inputFailure(error: unknown) {
  if (error instanceof ScenarioSourceInputError) return NextResponse.json({
    error: "Scenario modeling is unavailable because required source inputs are missing, invalid, or incomplete. Refresh the source data before running a scenario.",
    code: "scenario_inputs_unavailable",
  }, {status: 503, headers: {"Cache-Control": "no-store"}});
  return dataApiErrorResponse('scenario-modeler', error);
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
  const parsed = nullableNumber(value);

  if (parsed === null) {
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
    throw defaultsResult.error;
  }

  if (baselineResult.error) {
    throw baselineResult.error;
  }

  if (overviewResult.error) {
    throw overviewResult.error;
  }

  if (businessUnitResult.error) {
    throw businessUnitResult.error;
  }

  if (jobFamilyResult.error) {
    throw jobFamilyResult.error;
  }

  const defaults: ScenarioModelAssumptions =
    {
      annual_growth_pct: requiredNumber(
        defaultsResult.data
          ?.baseline_annual_growth_pct, -10, 20
      ),
      salary_inflation_pct: requiredNumber(
        defaultsResult.data
          ?.baseline_salary_inflation_pct, -5, 15
      ),
      annual_attrition_pct: requiredNumber(
        defaultsResult.data
          ?.baseline_annual_attrition_pct, 0, 30
      ),
      fill_rate_pct: requiredNumber(
        defaultsResult.data
          ?.baseline_fill_rate_pct, 0, 100
      ),
      productivity_hiring_reduction_pct:
        requiredNumber(
          defaultsResult.data
            ?.baseline_productivity_hiring_reduction_pct, 0, 50
        ),
    };

  const baselinePoints: ScenarioEngineBaselinePoint[] =
    (baselineResult.data ?? []).map(
      (row) => ({
        planning_month:
          row.planning_month,
        planned_headcount: requiredNumber(
          row.planned_headcount
        ),
        planned_fte: requiredNumber(
          row.planned_fte
        ),
        planned_labor_cost_usd:
          requiredNumber(
            row.planned_labor_cost_usd
          ),
      })
    );

  if (!hasCompleteReturnedMonthWindow(baselinePoints.map(point => point.planning_month))) throw new ScenarioSourceInputError();

  const businessUnitBaseline:
    ScenarioEngineSegmentBaseline[] =
    (businessUnitResult.data ?? []).map(
      (row) => ({
        planning_month:
          row.planning_month,
        segment_code: row.org_code,
        segment_name: row.org_name,
        planned_headcount: requiredNumber(
          row.planned_headcount
        ),
        planned_labor_cost_usd:
          requiredNumber(
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
        planned_headcount: requiredNumber(
          row.planned_headcount
        ),
        planned_labor_cost_usd:
          requiredNumber(
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
    startingHeadcount: requiredNumber(
      overviewResult.data?.headcount
    ),
    defaults,
    baselinePoints,
    businessUnitBaseline,
    jobFamilyBaseline,
  };
}

async function handleGET() {
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
    return inputFailure(error);
  }
}

async function handlePOST(
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
    return inputFailure(error);
  }
}

export async function GET(request?: Request) {
  return withDatasetRequest(request, () => handleGET());
}

export async function POST(request: NextRequest) {
  return withDatasetRequest(request, () => handlePOST(request));
}
