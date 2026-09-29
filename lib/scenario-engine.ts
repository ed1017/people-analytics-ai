import type {
  ScenarioModelAssumptions,
  ScenarioModelPoint,
  ScenarioModelResponse,
} from "@/lib/types";

export type ScenarioEngineBaselinePoint = {
  planning_month: string;
  planned_headcount: number;
  planned_fte: number;
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
      "Modeled FTE preserves each Baseline month's FTE-to-headcount ratio.",
      "Labor cost uses the Baseline cost per FTE adjusted for the custom salary-inflation assumption, then multiplies by modeled FTE.",
      "This is a deterministic custom model, not an LLM-generated forecast.",
    ],
  };
}
