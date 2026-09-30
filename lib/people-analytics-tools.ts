import { supabaseServer } from "./supabase-server";
import {
  runScenarioModel,
  type ScenarioEngineBaselinePoint,
} from "./scenario-engine";
import type {
  ScenarioModelAssumptions,
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

export const peopleAnalyticsTools: any[] = [
  {
    type: "function",
    name: "get_workforce_overview",
    description:
      "Get current enterprise workforce overview metrics, historical endpoints, and business-unit workforce summaries. Use for overall workforce size, turnover, growth, labor cost, vacancies, or BU comparisons.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "get_workforce_composition",
    description:
      "Get governed workforce composition analytics including headcount/FTE trend, business units, countries, career levels, tenure, manager span, and internal movement counts.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "get_attrition",
    description:
      "Get governed attrition analytics including YTD voluntary turnover, annualized voluntary turnover, regrettable exits, monthly trend, business-unit rates, career-level exits, tenure exits, and reported separation reasons.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "get_workforce_finance",
    description:
      "Get enterprise workforce finance metrics, business-unit labor economics, vacancy cost exposure, and 2027 labor-cost scenario outcomes.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "get_workforce_skills",
    description:
      "Get governed enterprise skills intelligence including apparent proficiency gaps, highest-demand skills, profile coverage, and O*NET mapping coverage.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "get_workforce_planning",
    description:
      "Get 2027 enterprise workforce scenario outcomes and current authorized position totals. Use to compare Baseline, Growth, Hiring Freeze, and AI Productivity scenarios.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "run_workforce_scenario",
    description:
      "Run the approved deterministic workforce scenario engine for a new what-if. Use only when the user asks to change planning assumptions such as growth, salary inflation, attrition, fill rate, or productivity-driven hiring demand. Pass null for every lever the user did not change. If the user says attrition increases by X percentage points, use additional_attrition_pct_points rather than inventing an absolute rate.",
    parameters: {
      type: "object",
      properties: {
        annual_growth_pct: {
          type: ["number", "null"],
          description:
            "Custom annual enterprise headcount growth percentage, or null to keep Baseline.",
        },
        salary_inflation_pct: {
          type: ["number", "null"],
          description:
            "Custom annual labor-cost inflation percentage, or null to keep Baseline.",
        },
        annual_attrition_pct: {
          type: ["number", "null"],
          description:
            "Custom total annual attrition percentage, or null if unchanged or expressed as additional points.",
        },
        additional_attrition_pct_points: {
          type: ["number", "null"],
          description:
            "Percentage-point change added to Baseline annual attrition, e.g. 2 means Baseline + 2 points.",
        },
        fill_rate_pct: {
          type: ["number", "null"],
          description:
            "Percent of modeled hiring demand filled, or null to keep Baseline.",
        },
        productivity_hiring_reduction_pct: {
          type: ["number", "null"],
          description:
            "Percent reduction in gross hiring demand from AI/productivity, or null to keep Baseline.",
        },
      },
      required: [
        "annual_growth_pct",
        "salary_inflation_pct",
        "annual_attrition_pct",
        "additional_attrition_pct_points",
        "fill_rate_pct",
        "productivity_hiring_reduction_pct",
      ],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "get_talent_acquisition",
    description:
      "Get governed Talent Acquisition analytics including funnel conversion, requisition aging, time to fill, source effectiveness, recruiter workload, and business-unit hiring demand.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "get_survey_sentiment",
    description:
      "Get governed employee-listening analytics including engagement trend, participation, engagement dimensions, pulse, manager effectiveness, onboarding, business-unit comparisons, and exit reasons. Does not return raw comments.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
];

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
  ]);

  for (const result of [
    gapsResult,
    demandResult,
    skillCountResult,
    onetResult,
    jobProfilesResult,
  ]) {
    if (result.error) {
      throw new Error(
        "Skills tool: " +
          result.error.message
      );
    }
  }

  return {
    as_of: "2026-09-30",
    summary: {
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
      "These are apparent proficiency gaps based on observed skill records versus job requirements. Missing or stale records do not prove capability is absent.",
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
  ]);

  for (const result of [
    defaultsResult,
    baselineResult,
    overviewResult,
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

  return runScenarioModel({
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

async function getSurveySentiment() {
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
        "survey_code, survey_type, dimension, avg_score, favorable_pct"
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
        "Survey & Sentiment tool: " +
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
      (dimensionsResult.data ??
        []) as Record<
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
