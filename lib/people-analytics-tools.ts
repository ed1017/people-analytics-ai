import { supabaseServer } from "./supabase-server";
import { generateExitEnpsScores, localExitEnpsEnabled, summarizeExitEnps, surveyDimensionsForRetrieval } from "./exit-enps";
import {
  getInternalTalentReadiness,
} from "./internal-talent-readiness";
import {
  getRoleBuyFeasibility,
} from "./role-buy-feasibility";
import {
  runWorkforceResponsePortfolio,
  type WorkforceResponsePortfolioRequest,
} from "./workforce-response-portfolio";
import {
  runBusinessUnitResponseAllocation,
  type BusinessUnitResponseAllocationRequest,
} from "./business-unit-response-allocation";
import {
  runTimePhasedWorkforceExecution,
  type TimePhasedWorkforceExecutionRequest,
} from "./time-phased-workforce-execution";
import {
  runWorkforceResponseConstraintCheck,
  type WorkforceResponseConstraintRequest,
} from "./workforce-response-constraints";
import {
  runConstraintAwareWorkforceScheduler,
  type ConstraintAwareWorkforceScheduleRequest,
} from "./constraint-aware-workforce-scheduler";
import {
  runStructuralPositionScenario,
} from "./structural-position-scenario";
import {
  runWorkforceResponsePlan,
  type WorkforceResponsePlanRequest,
} from "./workforce-response-plan";
import {
  runRoleWorkforceResponsePlan,
  type RoleWorkforceResponsePlanRequest,
} from "./role-workforce-response-plan";
import {
  runPositionActionScenario,
  type PositionActionScenarioRequest,
} from "./position-action-scenario";
import {
  runBusinessUnitScenario,
  type BusinessUnitScenarioRequest,
} from "./business-unit-scenario";
import {
  buildScenarioSegmentBreakdown,
  runScenarioModel,
  type ScenarioEngineBaselinePoint,
  type ScenarioEngineSegmentBaseline,
} from "./scenario-engine";
import type {
  ScenarioModelAssumptions,
  StructuralPositionAction,
} from "./types";

function toNumber(
  value: number | string | null | undefined
) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compactRows(
  rows: Record<string, unknown>[]
) {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        typeof value === "string" &&
        value !== "" &&
        !Number.isNaN(Number(value))
          ? Number(value)
          : value,
      ])
    )
  );
}

type ScenarioToolArgs = {
  annual_growth_pct: number | null;
  salary_inflation_pct: number | null;
  annual_attrition_pct: number | null;
  additional_attrition_pct_points: number | null;
  fill_rate_pct: number | null;
  productivity_hiring_reduction_pct: number | null;
};

function clamp(
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

export {peopleAnalyticsTools} from "./people-analytics-tool-definitions";

async function getWorkforceOverview() {
  const [
    overviewResult,
    trendResult,
    financeResult,
  ] = await Promise.all([
    supabaseServer
      .from("dashboard_overview_current")
      .select("*")
      .single(),
    supabaseServer
      .from("dashboard_headcount_trend")
      .select("snapshot_date, headcount, fte")
      .order("snapshot_date", { ascending: true }),
    supabaseServer
      .from("finance_current_summary")
      .select(
        "org_code, org_name, headcount, fte, labor_cost_usd, cost_per_fte_usd, vacant_positions"
      )
      .order("headcount", { ascending: false }),
  ]);

  if (overviewResult.error) {
    throw new Error(
      "Overview tool: " +
        overviewResult.error.message
    );
  }

  if (trendResult.error) {
    throw new Error(
      "Headcount trend tool: " +
        trendResult.error.message
    );
  }

  if (financeResult.error) {
    throw new Error(
      "BU overview tool: " +
        financeResult.error.message
    );
  }

  const trend = trendResult.data ?? [];

  return {
    as_of:
      overviewResult.data?.snapshot_date ??
      "2026-09-30",
    current: compactRows([
      overviewResult.data ?? {},
    ])[0],
    history: {
      start: trend[0] ?? null,
      end:
        trend[trend.length - 1] ?? null,
    },
    business_units: compactRows(
      (financeResult.data ?? []) as Record<
        string,
        unknown
      >[]
    ),
  };
}

async function getWorkforceComposition() {
  const [current, trend, businessUnits, countries, levels, tenure, movements] =
    await Promise.all([
      supabaseServer.from("workforce_current_summary").select("*").single(),
      supabaseServer.from("dashboard_headcount_trend").select("*").order("snapshot_date"),
      supabaseServer.from("workforce_business_unit_summary").select("*").order("headcount", { ascending: false }),
      supabaseServer.from("workforce_country_summary").select("*").order("headcount", { ascending: false }),
      supabaseServer.from("workforce_level_summary").select("*").order("level_rank"),
      supabaseServer.from("workforce_tenure_summary").select("*").order("tenure_sort"),
      supabaseServer.from("workforce_movement_summary").select("*").order("month"),
    ]);

  for (const result of [current, trend, businessUnits, countries, levels, tenure, movements]) {
    if (result.error) throw new Error("Workforce composition tool: " + result.error.message);
  }

  return {
    as_of: current.data?.as_of ?? "2026-09-30",
    summary: compactRows([current.data ?? {}])[0],
    trend: compactRows((trend.data ?? []) as Record<string, unknown>[]),
    business_units: compactRows((businessUnits.data ?? []) as Record<string, unknown>[]),
    countries: compactRows((countries.data ?? []) as Record<string, unknown>[]),
    levels: compactRows((levels.data ?? []) as Record<string, unknown>[]),
    tenure: compactRows((tenure.data ?? []) as Record<string, unknown>[]),
    movements: compactRows((movements.data ?? []) as Record<string, unknown>[]),
  };
}

async function getAttritionAnalytics() {
  const [current, trend, businessUnits, levels, tenure, reasons] =
    await Promise.all([
      supabaseServer.from("attrition_current_summary").select("*").single(),
      supabaseServer.from("attrition_monthly_trend").select("*").order("month"),
      supabaseServer.from("attrition_business_unit_summary").select("*").order("voluntary_turnover_ytd_pct", { ascending: false }),
      supabaseServer.from("attrition_level_summary").select("*").order("level_rank"),
      supabaseServer.from("attrition_tenure_summary").select("*").order("tenure_sort"),
      supabaseServer.from("attrition_reason_summary").select("*").order("exits", { ascending: false }),
    ]);

  for (const result of [current, trend, businessUnits, levels, tenure, reasons]) {
    if (result.error) throw new Error("Attrition tool: " + result.error.message);
  }

  return {
    as_of: current.data?.as_of ?? "2026-09-30",
    summary: compactRows([current.data ?? {}])[0],
    trend: compactRows((trend.data ?? []) as Record<string, unknown>[]),
    business_units: compactRows((businessUnits.data ?? []) as Record<string, unknown>[]),
    levels: compactRows((levels.data ?? []) as Record<string, unknown>[]),
    tenure: compactRows((tenure.data ?? []) as Record<string, unknown>[]),
    reasons: compactRows((reasons.data ?? []) as Record<string, unknown>[]),
    interpretation_note:
      "Reported separation reasons and regrettable flags are descriptive fields in the synthetic dataset; do not treat them as proven causal drivers.",
  };
}

async function getWorkforceFinance() {
  const [
    financeResult,
    scenarioResult,
  ] = await Promise.all([
    supabaseServer
      .from("finance_current_summary")
      .select(
        "org_code, org_name, headcount, fte, labor_cost_usd, cost_per_fte_usd, vacant_positions, estimated_vacancy_cost_exposure_usd"
      ),
    supabaseServer
      .from("workforce_scenario_summary")
      .select(
        "scenario_name, scenario_type, planned_headcount, planned_fte, planned_hires, planned_exits, planned_labor_cost_usd"
      )
      .eq(
        "planning_month",
        "2027-12-01"
      ),
  ]);

  if (financeResult.error) {
    throw new Error(
      "Finance tool: " +
        financeResult.error.message
    );
  }

  if (scenarioResult.error) {
    throw new Error(
      "Finance scenarios tool: " +
        scenarioResult.error.message
    );
  }

  const businessUnits = compactRows(
    (financeResult.data ?? []) as Record<
      string,
      unknown
    >[]
  );

  const enterprise = businessUnits.reduce<{
    headcount: number;
    fte: number;
    labor_cost_usd: number;
    vacant_positions: number;
    estimated_vacancy_cost_exposure_usd: number;
  }>(
    (acc, row) => {
      acc.headcount += toNumber(
        row.headcount as number | string
      );
      acc.fte += toNumber(
        row.fte as number | string
      );
      acc.labor_cost_usd += toNumber(
        row.labor_cost_usd as
          | number
          | string
      );
      acc.vacant_positions += toNumber(
        row.vacant_positions as
          | number
          | string
      );
      acc.estimated_vacancy_cost_exposure_usd +=
        toNumber(
          row.estimated_vacancy_cost_exposure_usd as
            | number
            | string
        );
      return acc;
    },
    {
      headcount: 0,
      fte: 0,
      labor_cost_usd: 0,
      vacant_positions: 0,
      estimated_vacancy_cost_exposure_usd:
        0,
    }
  );

  return {
    as_of: "2026-09-30",
    enterprise,
    business_units: businessUnits,
    scenarios: compactRows(
      (scenarioResult.data ?? []) as Record<
        string,
        unknown
      >[]
    ),
    interpretation_note:
      "Vacancy cost exposure is an estimate, not booked expense or guaranteed savings.",
  };
}

async function getWorkforceSkills() {
  const [
    gapsResult,
    demandResult,
    skillCountResult,
    onetResult,
    jobProfilesResult,
    currentWorkforceResult,
  ] = await Promise.all([
    supabaseServer
      .from(
        "skills_proficiency_gap_summary"
      )
      .select("*")
      .gt(
        "employees_in_roles_requiring_skill",
        0
      )
      .order(
        "requirement_met_pct",
        { ascending: true }
      )
      .limit(12),
    supabaseServer
      .from(
        "skills_proficiency_gap_summary"
      )
      .select("*")
      .gt(
        "employees_in_roles_requiring_skill",
        0
      )
      .order(
        "employees_in_roles_requiring_skill",
        { ascending: false }
      )
      .limit(10),
    supabaseServer
      .from("skills")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("active", true),
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
    supabaseServer
      .from("dashboard_overview_current")
      .select("headcount")
      .single(),
  ]);

  for (const result of [
    gapsResult,
    demandResult,
    skillCountResult,
    onetResult,
    jobProfilesResult,
    currentWorkforceResult,
  ]) {
    if (result.error) {
      throw new Error(
        "Skills tool: " +
          result.error.message
      );
    }
  }

  const currentWorkforce = Number(
    currentWorkforceResult.data?.headcount ?? 0
  );

  return {
    as_of: "2026-09-30",
    evidence_scope: {
      scope: "enterprise",
      label: "Company workforce",
      population_label: "employees",
      population_count: currentWorkforce,
      filters_applied: {
        country: false,
        business_unit: false,
        level: false,
      },
      supported_breakdowns: ["skill"],
      unsupported_breakdowns: [
        "country",
        "business_unit",
        "level",
      ],
      scope_note:
        "Selected dashboard country, business-unit, and level context does not filter this tool result.",
    },
    summary: {
      current_workforce: currentWorkforce,
      active_skills:
        skillCountResult.count ?? 0,
      onet_mapped_job_profiles:
        onetResult.count ?? 0,
      total_job_profiles:
        jobProfilesResult.count ?? 0,
    },
    largest_apparent_gaps: compactRows(
      (gapsResult.data ?? []) as Record<
        string,
        unknown
      >[]
    ),
    highest_demand: compactRows(
      (demandResult.data ?? []) as Record<
        string,
        unknown
      >[]
    ),
    interpretation_note:
      "These are company apparent proficiency gaps based on observed skill records versus job requirements. Missing or stale records do not prove capability is absent. Country, business-unit, and level breakdowns are unavailable from this tool.",
  };
}

async function getWorkforcePlanning() {
  const [
    scenarioResult,
    positionResult,
  ] = await Promise.all([
    supabaseServer
      .from("workforce_scenario_summary")
      .select(
        "scenario_name, scenario_type, planned_headcount, planned_fte, planned_hires, planned_exits, planned_labor_cost_usd"
      )
      .eq(
        "planning_month",
        "2027-12-01"
      ),
    supabaseServer
      .from(
        "position_modeling_current_summary"
      )
      .select(
        "current_positions, filled_positions, vacant_positions, planned_positions, frozen_positions, closed_positions"
      ),
  ]);

  if (scenarioResult.error) {
    throw new Error(
      "Planning tool: " +
        scenarioResult.error.message
    );
  }

  if (positionResult.error) {
    throw new Error(
      "Position tool: " +
        positionResult.error.message
    );
  }

  const currentPositions = (
    positionResult.data ?? []
  ).reduce(
    (acc, row) => {
      acc.current_positions += toNumber(
        row.current_positions
      );
      acc.filled_positions += toNumber(
        row.filled_positions
      );
      acc.vacant_positions += toNumber(
        row.vacant_positions
      );
      acc.planned_positions += toNumber(
        row.planned_positions
      );
      acc.frozen_positions += toNumber(
        row.frozen_positions
      );
      acc.closed_positions += toNumber(
        row.closed_positions
      );
      return acc;
    },
    {
      current_positions: 0,
      filled_positions: 0,
      vacant_positions: 0,
      planned_positions: 0,
      frozen_positions: 0,
      closed_positions: 0,
    }
  );

  return {
    planning_month: "2027-12-01",
    current_positions: currentPositions,
    scenarios: compactRows(
      (scenarioResult.data ?? []) as Record<
        string,
        unknown
      >[]
    ),
    interpretation_note:
      "Positions are authorized roles; headcount is people. Do not treat them as interchangeable.",
  };
}

async function runWorkforceScenario(
  args: ScenarioToolArgs
) {
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

  for (const result of [
    defaultsResult,
    baselineResult,
    overviewResult,
    businessUnitResult,
    jobFamilyResult,
  ]) {
    if (result.error) {
      throw new Error(
        "Scenario tool: " +
          result.error.message
      );
    }
  }

  const defaults: ScenarioModelAssumptions = {
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

  const explicitAttrition =
    typeof args.annual_attrition_pct ===
      "number" &&
    Number.isFinite(args.annual_attrition_pct)
      ? args.annual_attrition_pct
      : null;

  const attritionWithDelta =
    explicitAttrition ??
    (typeof args.additional_attrition_pct_points ===
      "number" &&
    Number.isFinite(
      args.additional_attrition_pct_points
    )
      ? defaults.annual_attrition_pct +
        args.additional_attrition_pct_points
      : defaults.annual_attrition_pct);

  const assumptions: ScenarioModelAssumptions = {
    annual_growth_pct: overrideOrDefault(
      args.annual_growth_pct,
      defaults.annual_growth_pct,
      -10,
      20
    ),
    salary_inflation_pct: overrideOrDefault(
      args.salary_inflation_pct,
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
      args.fill_rate_pct,
      defaults.fill_rate_pct,
      0,
      100
    ),
    productivity_hiring_reduction_pct:
      overrideOrDefault(
        args.productivity_hiring_reduction_pct,
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

  const result = runScenarioModel({
    asOf:
      overviewResult.data?.snapshot_date ??
      defaultsResult.data?.as_of ??
      "2026-09-30",
    startingHeadcount: toNumber(
      overviewResult.data?.headcount
    ),
    baselinePoints,
    defaults,
    assumptions,
  });

  result.segment_breakdown =
    buildScenarioSegmentBreakdown(
      result,
      businessUnitBaseline,
      jobFamilyBaseline
    );

  return result;
}

async function getTalentAcquisition() {
  const [
    currentResult,
    buResult,
    sourceResult,
    recruiterResult,
  ] = await Promise.all([
    supabaseServer
      .from(
        "talent_acquisition_current_summary"
      )
      .select("*")
      .single(),
    supabaseServer
      .from(
        "talent_acquisition_business_unit_summary"
      )
      .select("*")
      .order(
        "open_positions",
        { ascending: false }
      ),
    supabaseServer
      .from(
        "talent_acquisition_source_summary"
      )
      .select("*")
      .order(
        "hires",
        { ascending: false }
      ),
    supabaseServer
      .from(
        "talent_acquisition_recruiter_summary"
      )
      .select(
        "recruiter_name, region, specialty, open_requisitions, open_positions, avg_time_to_fill_days"
      )
      .order(
        "open_requisitions",
        { ascending: false }
      )
      .limit(10),
  ]);

  for (const result of [
    currentResult,
    buResult,
    sourceResult,
    recruiterResult,
  ]) {
    if (result.error) {
      throw new Error(
        "Talent Acquisition tool: " +
          result.error.message
      );
    }
  }

  return {
    as_of:
      currentResult.data?.as_of ??
      "2026-09-30",
    summary: compactRows([
      currentResult.data ?? {},
    ])[0],
    business_units: compactRows(
      (buResult.data ?? []) as Record<
        string,
        unknown
      >[]
    ),
    sources: compactRows(
      (sourceResult.data ?? []) as Record<
        string,
        unknown
      >[]
    ),
    top_recruiter_workloads:
      compactRows(
        (recruiterResult.data ??
          []) as Record<
          string,
          unknown
        >[]
      ),
    interpretation_note:
      "Internal Mobility has a structurally different funnel from external recruiting. Do not treat its conversion rate as directly comparable.",
  };
}

export async function getSurveySentiment() {
  const [
    currentResult,
    trendResult,
    dimensionsResult,
    buResult,
    exitResult,
  ] = await Promise.all([
    supabaseServer
      .from(
        "survey_listening_current_summary"
      )
      .select("*")
      .single(),
    supabaseServer
      .from(
        "survey_listening_engagement_trend"
      )
      .select("*")
      .order(
        "launch_date",
        { ascending: true }
      ),
    supabaseServer
      .from(
        "survey_listening_dimension_summary"
      )
      .select(
        "survey_code, survey_type, question_code, dimension, avg_score, favorable_pct"
      ),
    supabaseServer
      .from(
        "survey_listening_business_unit_summary"
      )
      .select(
        "org_code, org_name, respondents, avg_score, favorable_pct"
      )
      .order(
        "favorable_pct",
        { ascending: true }
      ),
    supabaseServer
      .from(
        "survey_listening_exit_reason_summary"
      )
      .select("*")
      .order(
        "exits",
        { ascending: false }
      ),
  ]);

  for (const result of [
    currentResult,
    trendResult,
    dimensionsResult,
    buResult,
    exitResult,
  ]) {
    if (result.error) {
      throw new Error(
        "Employee Listening tool: " +
          result.error.message
      );
    }
  }

  return {
    as_of:
      currentResult.data?.as_of ??
      "2026-09-30",
    summary: compactRows([
      currentResult.data ?? {},
    ])[0],
    engagement_trend: compactRows(
      (trendResult.data ?? []) as Record<
        string,
        unknown
      >[]
    ),
    dimensions: compactRows(
      surveyDimensionsForRetrieval(dimensionsResult.data ?? [], localExitEnpsEnabled()) as Record<
        string,
        unknown
      >[]
    ),
    business_units: compactRows(
      (buResult.data ?? []) as Record<
        string,
        unknown
      >[]
    ),
    exit_reasons: compactRows(
      (exitResult.data ?? []) as Record<
        string,
        unknown
      >[]
    ),
    interpretation_note:
      "Survey results are aggregate listening signals, not causal proof. Raw open-text comments are not returned by this tool.",
    exit_enps: localExitEnpsEnabled() ? summarizeExitEnps(generateExitEnpsScores()) : null,
  };
}

export async function runPeopleAnalyticsTool(
  name: string,
  args: Record<string, unknown> = {}
) {
  switch (name) {
    case "get_workforce_overview":
      return getWorkforceOverview();
    case "get_workforce_composition":
      return getWorkforceComposition();
    case "get_attrition":
      return getAttritionAnalytics();
    case "get_workforce_finance":
      return getWorkforceFinance();
    case "get_workforce_skills":
      return getWorkforceSkills();
    case "get_workforce_planning":
      return getWorkforcePlanning();
    case "run_workforce_scenario":
      return runWorkforceScenario(
        args as ScenarioToolArgs
      );
    case "run_business_unit_scenario":
      return runBusinessUnitScenario(
        args as BusinessUnitScenarioRequest
      );
    case "run_position_action_scenario":
      return runPositionActionScenario(
        args as PositionActionScenarioRequest
      );
    case "run_structural_position_scenario":
      return runStructuralPositionScenario(
        (args.actions ?? []) as StructuralPositionAction[]
      );
    case "run_workforce_response_plan":
      return runWorkforceResponsePlan(
        args as WorkforceResponsePlanRequest
      );
    case "get_internal_talent_readiness": {
      const result =
        await getInternalTalentReadiness(
          String(args.job_profile ?? "")
        );

      return {
        evidence_scope: {
          scope: "enterprise",
          label:
            "Company internal talent pool for the target job profile",
          filters_applied: {
            country: false,
            business_unit: false,
            level: false,
          },
          unsupported_breakdowns: [
            "country",
            "business_unit",
            "level",
          ],
          scope_note:
            "Selected dashboard country, business-unit, and level context does not filter this tool result.",
        },
        ...result,
      };
    }
    case "get_role_buy_feasibility": {
      const result =
        await getRoleBuyFeasibility(
          String(args.job_profile ?? ""),
          Number(args.requested_buy ?? 0)
        );

      return {
        evidence_scope: {
          scope: "enterprise",
          label:
            "Company recruiting evidence for the target job profile",
          filters_applied: {
            country: false,
            business_unit: false,
            level: false,
          },
          unsupported_breakdowns: [
            "country",
            "business_unit",
            "level",
          ],
          scope_note:
            "Selected dashboard country, business-unit, and level context does not filter this tool result.",
        },
        ...result,
      };
    }
    case "run_role_workforce_response_plan":
      return runRoleWorkforceResponsePlan(
        args as RoleWorkforceResponsePlanRequest
      );
    case "run_workforce_response_portfolio":
      return runWorkforceResponsePortfolio(
        args as WorkforceResponsePortfolioRequest
      );
    case "run_business_unit_response_allocation":
      return runBusinessUnitResponseAllocation(
        args as BusinessUnitResponseAllocationRequest
      );
    case "run_time_phased_workforce_execution":
      return runTimePhasedWorkforceExecution(
        args as TimePhasedWorkforceExecutionRequest
      );
    case "run_workforce_response_constraints":
      return runWorkforceResponseConstraintCheck(
        args as WorkforceResponseConstraintRequest
      );
    case "run_constraint_aware_workforce_scheduler":
      return runConstraintAwareWorkforceScheduler(
        args as ConstraintAwareWorkforceScheduleRequest
      );
    case "get_talent_acquisition":
      return getTalentAcquisition();
    case "get_survey_sentiment":
      return getSurveySentiment();
    default:
      throw new Error(
        "Unknown People Analytics tool: " +
          name
      );
  }
}
