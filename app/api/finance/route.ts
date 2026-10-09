import { withDatasetRequest } from "@/lib/dataset-runtime";
import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase-server";

export const dynamic = "force-dynamic";

type FinanceRow = {
  org_unit_id: string | number;
  org_code: string;
  org_name: string;
  org_type: string;
  headcount: number | string | null;
  fte: number | string | null;
  labor_cost_usd: number | string | null;
  cost_per_fte_usd: number | string | null;
  vacant_positions: number | string | null;
  estimated_vacancy_cost_exposure_usd:
    | number
    | string
    | null;
};

type ScenarioRow = {
  scenario_name: string;
  scenario_type: string;
  planning_month: string;
  planned_headcount: number | string | null;
  planned_fte: number | string | null;
  planned_hires: number | string | null;
  planned_exits: number | string | null;
  planned_labor_cost_usd:
    | number
    | string
    | null;
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

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

async function handleGET() {
  try {
    const [financeResult, scenarioResult] =
      await Promise.all([
        supabaseServer
          .from("finance_current_summary")
          .select(
            "org_unit_id, org_code, org_name, org_type, headcount, fte, labor_cost_usd, cost_per_fte_usd, vacant_positions, estimated_vacancy_cost_exposure_usd"
          ),

        supabaseServer
          .from("workforce_scenario_summary")
          .select(
            "scenario_name, scenario_type, planning_month, planned_headcount, planned_fte, planned_hires, planned_exits, planned_labor_cost_usd"
          )
          .eq(
            "planning_month",
            "2027-12-01"
          ),
      ]);

    if (financeResult.error) {
      throw new Error(
        `Finance summary: ${financeResult.error.message}`
      );
    }

    if (scenarioResult.error) {
      throw new Error(
        `Scenario finance: ${scenarioResult.error.message}`
      );
    }

    const financeRows: FinanceRow[] =
      financeResult.data ?? [];

    const scenarioRows: ScenarioRow[] =
      scenarioResult.data ?? [];

    const current = financeRows.reduce(
      (acc, row) => {
        acc.headcount += toNumber(
          row.headcount
        );
        acc.fte += toNumber(row.fte);
        acc.labor_cost_usd += toNumber(
          row.labor_cost_usd
        );
        acc.vacant_positions += toNumber(
          row.vacant_positions
        );
        acc.estimated_vacancy_cost_exposure_usd +=
          toNumber(
            row.estimated_vacancy_cost_exposure_usd
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

    const currentSummary = {
      headcount: current.headcount,
      fte: round1(current.fte),
      labor_cost_usd: round2(
        current.labor_cost_usd
      ),
      cost_per_fte_usd:
        current.fte > 0
          ? round2(
              current.labor_cost_usd /
                current.fte
            )
          : 0,
      vacant_positions:
        current.vacant_positions,
      estimated_vacancy_cost_exposure_usd:
        round2(
          current.estimated_vacancy_cost_exposure_usd
        ),
    };

    const byBusinessUnit = financeRows
      .map((row) => ({
        org_code: row.org_code,
        org_name: row.org_name,
        headcount: toNumber(row.headcount),
        fte: round1(toNumber(row.fte)),
        labor_cost_usd: round2(
          toNumber(row.labor_cost_usd)
        ),
        cost_per_fte_usd: round2(
          toNumber(row.cost_per_fte_usd)
        ),
        vacant_positions: toNumber(
          row.vacant_positions
        ),
        estimated_vacancy_cost_exposure_usd:
          round2(
            toNumber(
              row.estimated_vacancy_cost_exposure_usd
            )
          ),
        share_of_enterprise_labor_cost_pct:
          current.labor_cost_usd > 0
            ? round1(
                (toNumber(
                  row.labor_cost_usd
                ) /
                  current.labor_cost_usd) *
                  100
              )
            : 0,
      }))
      .sort(
        (a, b) =>
          b.labor_cost_usd -
          a.labor_cost_usd
      );

    const scenarioOrder = [
      "Baseline",
      "Growth",
      "Hiring Freeze",
      "AI Productivity",
    ];

    const scenarios = scenarioRows
      .map((row) => ({
        scenario_name:
          row.scenario_name,
        scenario_type:
          row.scenario_type,
        planning_month:
          row.planning_month,
        planned_headcount:
          toNumber(
            row.planned_headcount
          ),
        planned_fte: round1(
          toNumber(row.planned_fte)
        ),
        planned_hires:
          toNumber(row.planned_hires),
        planned_exits:
          toNumber(row.planned_exits),
        planned_labor_cost_usd:
          round2(
            toNumber(
              row.planned_labor_cost_usd
            )
          ),
      }))
      .sort((a, b) => {
        const aIndex =
          scenarioOrder.indexOf(
            a.scenario_name
          );
        const bIndex =
          scenarioOrder.indexOf(
            b.scenario_name
          );

        return (
          (aIndex === -1 ? 999 : aIndex) -
          (bIndex === -1 ? 999 : bIndex)
        );
      });

    const baseline =
      scenarios.find(
        (row) =>
          row.scenario_name ===
          "Baseline"
      ) ?? scenarios[0];

    const scenarioComparison =
      scenarios.map((row) => ({
        ...row,
        labor_cost_delta_vs_baseline_usd:
          baseline
            ? round2(
                row.planned_labor_cost_usd -
                  baseline.planned_labor_cost_usd
              )
            : 0,
        headcount_delta_vs_baseline:
          baseline
            ? row.planned_headcount -
              baseline.planned_headcount
            : 0,
      }));

    return NextResponse.json(
      {
        as_of: "2026-09-30",
        current: currentSummary,
        by_business_unit:
          byBusinessUnit,
        scenarios: scenarioComparison,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Finance API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load finance data.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return withDatasetRequest(request, () => handleGET());
}
