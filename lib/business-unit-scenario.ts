import { supabaseServer } from "./supabase-server";
import {
  runScenarioModel,
  type ScenarioEngineBaselinePoint,
} from "./scenario-engine";
import type {
  BusinessUnitScenarioOption,
  BusinessUnitScenarioResponse,
  ScenarioModelAssumptions,
} from "./types";

type NumericValue =
  | number
  | string
  | null
  | undefined;

export type BusinessUnitScenarioRequest = {
  business_unit: string;
  annual_growth_pct?: number | null;
  salary_inflation_pct?: number | null;
  annual_attrition_pct?: number | null;
  additional_attrition_pct_points?: number | null;
  fill_rate_pct?: number | null;
  productivity_hiring_reduction_pct?: number | null;
};

function toNumber(value: NumericValue) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.min(max, Math.max(min, value));
}

function overrideOrDefault(
  value: number | null | undefined,
  fallback: number,
  min: number,
  max: number
) {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? clamp(value, min, max)
    : fallback;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

async function loadCatalogAndDefaults() {
  const [
    defaultsResult,
    businessUnitsResult,
    enterpriseBaselineResult,
  ] = await Promise.all([    supabaseServer
      .from("scenario_modeler_defaults")
      .select("*")
      .single(),
    supabaseServer
      .from("workforce_business_unit_summary")
      .select(
        "as_of, org_code, org_name, headcount, fte"
      )
      .order("headcount", {
        ascending: false,
      }),
    supabaseServer
      .from("workforce_scenario_summary")
      .select(
        "planning_month, planned_headcount, planned_labor_cost_usd"
      )
      .eq("scenario_name", "Baseline")
      .order("planning_month", {
        ascending: false,
      })
      .limit(1)
      .single(),
  ]);

  for (const result of [
    defaultsResult,
    businessUnitsResult,
    enterpriseBaselineResult,
  ]) {
    if (result.error) {
      throw new Error(
        "Business-unit scenario: " +
          result.error.message
      );
    }
  }  const defaults: ScenarioModelAssumptions = {
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

  const businessUnits:
    BusinessUnitScenarioOption[] =
    (businessUnitsResult.data ?? []).map(
      (row) => ({
        org_code: row.org_code,
        org_name: row.org_name,
        headcount: toNumber(row.headcount),
        fte: toNumber(row.fte),
      })
    );  return {
    asOf:
      businessUnitsResult.data?.[0]
        ?.as_of ??
      defaultsResult.data?.as_of ??
      "2026-09-30",
    defaults,
    businessUnits,
    enterpriseBaselineEnd: {
      headcount: toNumber(
        enterpriseBaselineResult.data
          ?.planned_headcount
      ),
      laborCostUsd: toNumber(
        enterpriseBaselineResult.data
          ?.planned_labor_cost_usd
      ),
    },
  };
}

export async function getBusinessUnitScenarioCatalog() {
  const catalog =
    await loadCatalogAndDefaults();

  return {
    as_of: catalog.asOf,
    defaults: catalog.defaults,
    business_units: catalog.businessUnits,
  };
}export async function runBusinessUnitScenario(
  request: BusinessUnitScenarioRequest
): Promise<BusinessUnitScenarioResponse> {
  const catalog =
    await loadCatalogAndDefaults();

  const requestedBusinessUnit =
    request.business_unit.trim().toLowerCase();

  const businessUnit =
    catalog.businessUnits.find(
      (row) =>
        row.org_code.toLowerCase() ===
          requestedBusinessUnit ||
        row.org_name.toLowerCase() ===
          requestedBusinessUnit
    );

  if (!businessUnit) {
    throw new Error(
      "Unknown business unit. Available business units: " +
        catalog.businessUnits
          .map((row) => row.org_name)
          .join(", ")
    );
  }

  const baselineResult =
    await supabaseServer
      .from("workforce_scenario_by_org")
      .select(
        "planning_month, planned_headcount, planned_fte, planned_labor_cost_usd"
      )
      .eq("scenario_name", "Baseline")
      .eq("org_code", businessUnit.org_code)
      .order("planning_month", {
        ascending: true,
      });  if (baselineResult.error) {
    throw new Error(
      "Business-unit Baseline plan: " +
        baselineResult.error.message
    );
  }

  const defaults = catalog.defaults;

  const explicitAttrition =
    typeof request.annual_attrition_pct ===
      "number" &&
    Number.isFinite(
      request.annual_attrition_pct
    )
      ? request.annual_attrition_pct
      : null;

  const attritionWithDelta =
    explicitAttrition ??
    (typeof request.additional_attrition_pct_points ===
      "number" &&
    Number.isFinite(
      request.additional_attrition_pct_points
    )
      ? defaults.annual_attrition_pct +
        request.additional_attrition_pct_points
      : defaults.annual_attrition_pct);

  const assumptions: ScenarioModelAssumptions = {
    annual_growth_pct: overrideOrDefault(
      request.annual_growth_pct,
      defaults.annual_growth_pct,
      -10,
      20
    ),
    salary_inflation_pct: overrideOrDefault(
      request.salary_inflation_pct,
      defaults.salary_inflation_pct,
      -5,
      15
    ),
    annual_attrition_pct: clamp(
      attritionWithDelta,
      0,
      30
    ),
    fill_rate_pct: overrideOrDefault(
      request.fill_rate_pct,
      defaults.fill_rate_pct,
      0,
      100
    ),
    productivity_hiring_reduction_pct:
      overrideOrDefault(
        request.productivity_hiring_reduction_pct,
        defaults.productivity_hiring_reduction_pct,
        0,
        50
      ),
  };

  const baselinePoints:
    ScenarioEngineBaselinePoint[] =
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

  const result = runScenarioModel({
    asOf: catalog.asOf,
    startingHeadcount:
      businessUnit.headcount,
    baselinePoints,
    defaults,
    assumptions,
  });

  return {
    ...result,
    scope: {
      type: "business_unit",
      org_code: businessUnit.org_code,
      org_name: businessUnit.org_name,
      current_headcount:
        businessUnit.headcount,
      current_fte: businessUnit.fte,
      planning_horizon_start:
        baselinePoints[0]?.planning_month ??
        "",
      planning_horizon_end:
        baselinePoints[
          baselinePoints.length - 1
        ]?.planning_month ?? "",
    },
    enterprise_impact: {
      baseline_end_headcount:
        catalog.enterpriseBaselineEnd
          .headcount,
      implied_end_headcount: round1(
        catalog.enterpriseBaselineEnd
          .headcount +
          result.summary
            .headcount_delta_vs_baseline
      ),
      headcount_delta_vs_baseline:
        result.summary
          .headcount_delta_vs_baseline,
      baseline_end_labor_cost_usd:
        round2(
          catalog.enterpriseBaselineEnd
            .laborCostUsd
        ),
      implied_end_labor_cost_usd:
        round2(
          catalog.enterpriseBaselineEnd
            .laborCostUsd +
            result.summary
              .labor_cost_delta_vs_baseline_usd
        ),
      labor_cost_delta_vs_baseline_usd:
        result.summary
          .labor_cost_delta_vs_baseline_usd,
    },
    methodology: [
      ...result.methodology,
      "This is a true independent rerun of the selected business unit using its own current headcount and stored monthly Baseline curve.",
      "The enterprise implied impact holds every other business unit at its stored Baseline and replaces only the selected business unit with this modeled result.",
    ],
  };
}