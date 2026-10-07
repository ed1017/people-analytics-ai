import { NextResponse } from "next/server";
import { dataApiErrorResponse } from "../../../lib/data-api-error";
import { supabaseServer } from "../../../lib/supabase-server";
import { nullableNumber as toNumber } from "../../../lib/numeric-contract";
import { storedPlanningProvenance } from "../../../lib/stored-planning";

export const dynamic = "force-dynamic";

type SummaryRow = {
  scenario_name: string;
  scenario_type: string;
  planning_month: string;
  planned_headcount: number | string | null;
  planned_fte: number | string | null;
  planned_hires: number | string | null;
  planned_exits: number | string | null;
  planned_labor_cost_usd: number | string | null;
};

type ScenarioRow = {
  workforce_scenario_id: string | number;
  scenario_name: string;
  scenario_type: string;
  description: string | null;
};

type AssumptionRow = {
  workforce_scenario_id: string | number;
  assumption_name: string;
  assumption_value: number | string | null;
  assumption_text: string | null;
};

export async function GET() {
  try {
    const [
      summaryResult,
      scenariosResult,
    ] = await Promise.all([
      supabaseServer
        .from("workforce_scenario_summary")
        .select(
  "scenario_name, scenario_type, planning_month, planned_headcount, planned_fte, planned_hires, planned_exits, planned_labor_cost_usd"
)
        .order("planning_month", {
          ascending: true,
        }),

      supabaseServer
        .from("workforce_scenarios")
        .select(
          "workforce_scenario_id, scenario_name, scenario_type, description"
        ),
    ]);

    if (summaryResult.error) {
      throw summaryResult.error;
    }

    if (scenariosResult.error) {
      throw scenariosResult.error;
    }

    const scenarioRows =
      (scenariosResult.data ?? []) as ScenarioRow[];

    const scenarioIds = scenarioRows.map(
      (row) => row.workforce_scenario_id
    );

    let assumptionRows: AssumptionRow[] = [];

    if (scenarioIds.length > 0) {
      const assumptionsResult =
        await supabaseServer
          .from("scenario_assumptions")
          .select(
            "workforce_scenario_id, assumption_name, assumption_value, assumption_text"
          )
          .in(
            "workforce_scenario_id",
            scenarioIds
          );

      if (assumptionsResult.error) {
        throw assumptionsResult.error;
      }

      assumptionRows =
        (assumptionsResult.data ??
          []) as AssumptionRow[];
    }

const summaries: SummaryRow[] =
  summaryResult.data ?? [];

    const scenarioOrder = [
      "Baseline",
      "Growth",
      "Hiring Freeze",
      "AI Productivity",
    ];

    const scenarios = scenarioRows
      .map((scenario) => {
        const points = summaries
          .filter(
            (row) =>
              row.scenario_name ===
              scenario.scenario_name
          )
          .map((row) => ({
            planning_month:
              row.planning_month,
            planned_headcount: toNumber(
              row.planned_headcount
            ),
            planned_fte: toNumber(
              row.planned_fte
            ),
            planned_hires: toNumber(
              row.planned_hires
            ),
            planned_exits: toNumber(
              row.planned_exits
            ),
            planned_labor_cost_usd:
              toNumber(
                row.planned_labor_cost_usd
              ),
          }));

        const assumptions = assumptionRows
          .filter(
            (row) =>
              String(
                row.workforce_scenario_id
              ) ===
              String(
                scenario.workforce_scenario_id
              )
          )
          .map((row) => ({
            assumption_name:
              row.assumption_name,
            assumption_value:
              toNumber(row.assumption_value),
            assumption_text:
              row.assumption_text,
          }));

        return {
          scenario_name:
            scenario.scenario_name,
          scenario_type:
            scenario.scenario_type,
          description:
            scenario.description,
          assumptions,
          points,
        };
      })
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

    return NextResponse.json(
      {
        scenarios,
        provenance: storedPlanningProvenance,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return dataApiErrorResponse('workforce-planning', error);
  }
}
