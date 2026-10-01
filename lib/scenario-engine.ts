import type {
  ScenarioModelAssumptions,
  ScenarioModelPoint,
  ScenarioModelResponse,
  ScenarioSegmentBreakdown,
  ScenarioSegmentResult,
} from "@/lib/types";

export type ScenarioEngineBaselinePoint = {
  planning_month: string;
  planned_headcount: number;
  planned_fte: number;
  planned_labor_cost_usd: number;
};

export type ScenarioEngineSegmentBaseline = {
  planning_month: string;
  segment_code: string;
  segment_name: string;
  planned_headcount: number;
  planned_labor_cost_usd: number;
};

type ScenarioEngineInput = {
  asOf: string;
  startingHeadcount: number;
  baselinePoints: ScenarioEngineBaselinePoint[];
  defaults: ScenarioModelAssumptions;
  assumptions: ScenarioModelAssumptions;
};

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function safeRatio(
  numerator: number,
  denominator: number,
  fallback = 0
) {
  if (!Number.isFinite(denominator) || denominator === 0) {
    return fallback;
  }

  return numerator / denominator;
}

function annualScale(
  newPct: number,
  baselinePct: number,
  elapsedYears: number
) {
  const newBase = 1 + newPct / 100;
  const baselineBase = 1 + baselinePct / 100;

  if (newBase <= 0 || baselineBase <= 0) {
    return 1;
  }

  return Math.pow(
    newBase / baselineBase,
    elapsedYears
  );
}

function allocateSegmentDelta(
  rows: ScenarioEngineSegmentBaseline[],
  enterpriseHeadcountDelta: number,
  enterpriseLaborCostDelta: number
): ScenarioSegmentResult[] {
  const headcountTotal = rows.reduce(
    (sum, row) =>
      sum + row.planned_headcount,
    0
  );
  const laborCostTotal = rows.reduce(
    (sum, row) =>
      sum + row.planned_labor_cost_usd,
    0
  );

  return rows
    .map((row) => {
      const headcountShare =
        safeRatio(
          row.planned_headcount,
          headcountTotal,
          0
        );
      const laborCostShare =
        safeRatio(
          row.planned_labor_cost_usd,
          laborCostTotal,
          0
        );

      const modeledHeadcount =
        Math.max(
          0,
          row.planned_headcount +
            enterpriseHeadcountDelta *
              headcountShare
        );
      const modeledLaborCost =
        Math.max(
          0,
          row.planned_labor_cost_usd +
            enterpriseLaborCostDelta *
              laborCostShare
        );

      return {
        segment_code: row.segment_code,
        segment_name: row.segment_name,
        baseline_headcount: round1(
          row.planned_headcount
        ),
        modeled_headcount: round1(
          modeledHeadcount
        ),
        headcount_delta_vs_baseline:
          round1(
            modeledHeadcount -
              row.planned_headcount
          ),
        baseline_labor_cost_usd:
          round2(
            row.planned_labor_cost_usd
          ),
        modeled_labor_cost_usd:
          round2(modeledLaborCost),
        labor_cost_delta_vs_baseline_usd:
          round2(
            modeledLaborCost -
              row.planned_labor_cost_usd
          ),
      };
    })
    .sort(
      (a, b) =>
        b.modeled_headcount -
        a.modeled_headcount
    );
}

export function buildScenarioSegmentBreakdown(
  scenario: ScenarioModelResponse,
  businessUnitBaseline: ScenarioEngineSegmentBaseline[],
  jobFamilyBaseline: ScenarioEngineSegmentBaseline[]
): ScenarioSegmentBreakdown {
  const finalPoint =
    scenario.points[
      scenario.points.length - 1
    ];

  if (!finalPoint) {
    throw new Error(
      "Segment allocation requires a modeled scenario point."
    );
  }

  const planningMonth =
    finalPoint.planning_month;

  const businessUnitRows =
    businessUnitBaseline.filter(
      (row) =>
        row.planning_month ===
        planningMonth
    );
  const jobFamilyRows =
    jobFamilyBaseline.filter(
      (row) =>
        row.planning_month ===
        planningMonth
    );

  const businessUnits =
    allocateSegmentDelta(
      businessUnitRows,
      scenario.summary
        .headcount_delta_vs_baseline,
      scenario.summary
        .labor_cost_delta_vs_baseline_usd
    );
  const jobFamilies =
    allocateSegmentDelta(
      jobFamilyRows,
      scenario.summary
        .headcount_delta_vs_baseline,
      scenario.summary
        .labor_cost_delta_vs_baseline_usd
    );

  return {
    planning_month: planningMonth,
    allocation_method:
      "Company scenario deltas are distributed using each segment's stored Baseline share at the end of the planning horizon. Segment mix is held constant; this is not a segment-specific rerun.",
    business_units: businessUnits,
    job_families: jobFamilies,
    reconciliation: {
      enterprise_modeled_headcount:
        scenario.summary
          .modeled_end_headcount,
      business_unit_modeled_headcount_total:
        round1(
          businessUnits.reduce(
            (sum, row) =>
              sum +
              row.modeled_headcount,
            0
          )
        ),
      job_family_modeled_headcount_total:
        round1(
          jobFamilies.reduce(
            (sum, row) =>
              sum +
              row.modeled_headcount,
            0
          )
        ),
      enterprise_modeled_labor_cost_usd:
        scenario.summary
          .modeled_end_labor_cost_usd,
      business_unit_modeled_labor_cost_total_usd:
        round2(
          businessUnits.reduce(
            (sum, row) =>
              sum +
              row.modeled_labor_cost_usd,
            0
          )
        ),
      job_family_modeled_labor_cost_total_usd:
        round2(
          jobFamilies.reduce(
            (sum, row) =>
              sum +
              row.modeled_labor_cost_usd,
            0
          )
        ),
    },
  };
}

export function runScenarioModel(
  input: ScenarioEngineInput
): ScenarioModelResponse {
  const {
    asOf,
    startingHeadcount,
    baselinePoints,
    defaults,
    assumptions,
  } = input;

  if (baselinePoints.length === 0) {
    throw new Error(
      "Scenario model requires baseline planning points."
    );
  }

  let modeledPreviousHeadcount =
    startingHeadcount;
  let targetPreviousHeadcount =
    startingHeadcount;

  let cumulativeModeledHires = 0;
  let cumulativeModeledExits = 0;

  const points: ScenarioModelPoint[] =
    baselinePoints.map(
      (baselinePoint, index) => {
        const elapsedMonths = index + 1;
        const elapsedYears =
          elapsedMonths / 12;

        const growthScale = annualScale(
          assumptions.annual_growth_pct,
          defaults.annual_growth_pct,
          elapsedYears
        );

        const targetHeadcount =
          baselinePoint.planned_headcount *
          growthScale;

        const targetNetChange =
          targetHeadcount -
          targetPreviousHeadcount;

        const baselineMonthlyAttritionRate =
          defaults.annual_attrition_pct /
          100 /
          12;

        const baselineReplacementNeed =
          Math.max(
            0,
            targetPreviousHeadcount *
              baselineMonthlyAttritionRate
          );

        const plannedHiringDemand =
          Math.max(
            0,
            targetNetChange +
              baselineReplacementNeed
          );

        const productivityAdjustedDemand =
          plannedHiringDemand *
          (1 -
            assumptions.productivity_hiring_reduction_pct /
              100);

        const modeledHires =
          Math.max(
            0,
            productivityAdjustedDemand *
              (assumptions.fill_rate_pct /
                100)
          );

        const modeledMonthlyAttritionRate =
          assumptions.annual_attrition_pct /
          100 /
          12;

        const modeledExits =
          Math.max(
            0,
            modeledPreviousHeadcount *
              modeledMonthlyAttritionRate
          );

        const modeledHeadcount =
          Math.max(
            0,
            modeledPreviousHeadcount +
              modeledHires -
              modeledExits
          );

        const baselineFteRatio =
          safeRatio(
            baselinePoint.planned_fte,
            baselinePoint.planned_headcount,
            1
          );

        const modeledFte =
          modeledHeadcount *
          baselineFteRatio;

        const baselineCostPerFte =
          safeRatio(
            baselinePoint.planned_labor_cost_usd,
            baselinePoint.planned_fte,
            0
          );

        const salaryScale = annualScale(
          assumptions.salary_inflation_pct,
          defaults.salary_inflation_pct,
          elapsedYears
        );

        const modeledCostPerFte =
          baselineCostPerFte *
          salaryScale;

        const modeledLaborCost =
          modeledFte *
          modeledCostPerFte;

        cumulativeModeledHires +=
          modeledHires;
        cumulativeModeledExits +=
          modeledExits;

        const point: ScenarioModelPoint = {
          planning_month:
            baselinePoint.planning_month,
          baseline_headcount: round1(
            baselinePoint.planned_headcount
          ),
          target_headcount:
            round1(targetHeadcount),
          modeled_headcount:
            round1(modeledHeadcount),
          modeled_fte:
            round1(modeledFte),
          planned_hiring_demand:
            round1(plannedHiringDemand),
          modeled_hires:
            round1(modeledHires),
          modeled_exits:
            round1(modeledExits),
          modeled_labor_cost_usd:
            round2(modeledLaborCost),
          gap_vs_target: round1(
            modeledHeadcount -
              targetHeadcount
          ),
        };

        modeledPreviousHeadcount =
          modeledHeadcount;
        targetPreviousHeadcount =
          targetHeadcount;

        return point;
      }
    );

  const finalPoint =
    points[points.length - 1];

  const baselineFinal =
    baselinePoints[
      baselinePoints.length - 1
    ];

  return {
    as_of: asOf,
    source_scenario: "Baseline",
    defaults,
    assumptions,
    summary: {
      starting_headcount:
        round1(startingHeadcount),
      baseline_end_headcount:
        round1(
          baselineFinal.planned_headcount
        ),
      target_end_headcount:
        finalPoint.target_headcount,
      modeled_end_headcount:
        finalPoint.modeled_headcount,
      modeled_end_fte:
        finalPoint.modeled_fte,
      headcount_delta_vs_baseline:
        round1(
          finalPoint.modeled_headcount -
            baselineFinal.planned_headcount
        ),
      headcount_gap_vs_target:
        finalPoint.gap_vs_target,
      baseline_end_labor_cost_usd:
        round2(
          baselineFinal.planned_labor_cost_usd
        ),
      modeled_end_labor_cost_usd:
        finalPoint.modeled_labor_cost_usd,
      labor_cost_delta_vs_baseline_usd:
        round2(
          finalPoint.modeled_labor_cost_usd -
            baselineFinal.planned_labor_cost_usd
        ),
      cumulative_modeled_hires:
        round1(cumulativeModeledHires),
      cumulative_modeled_exits:
        round1(cumulativeModeledExits),
    },
    points,
    methodology: [
      "The stored Baseline scenario is the reference curve.",
      "Growth changes scale the stored Baseline headcount target relative to the Baseline annual growth assumption.",
      "Gross hiring demand equals target net headcount change plus replacement demand based on the Baseline annual attrition rate.",
      "Productivity reduces gross hiring demand before the fill-rate assumption is applied.",
      "Modeled exits use the custom annual attrition assumption and reduce realized headcount.",
      "Modeled hires and exits are engine-implied gross flows used for the what-if calculation; they are not the stored plan's planned_hires or planned_exits fields, which do not fully explain the Baseline headcount curve.",
      "Modeled FTE preserves each Baseline month's FTE-to-headcount ratio.",
      "Labor cost uses the Baseline cost per FTE adjusted for the custom salary-inflation assumption, then multiplies by modeled FTE.",
      "This is a deterministic custom model, not an LLM-generated forecast.",
    ],
  };
}
