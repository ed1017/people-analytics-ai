import { withDatasetRequest } from "@/lib/dataset-runtime";
import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase-server";

export const dynamic = "force-dynamic";

type CurrentRow = {
  org_unit_id: string | number;
  org_code: string;
  org_name: string;
  org_type: string;
  job_level_id: string | number;
  level_code: string;
  level_name: string;
  level_rank: number | string | null;
  current_positions: number | string | null;
  filled_positions: number | string | null;
  vacant_positions: number | string | null;
  planned_positions: number | string | null;
  frozen_positions: number | string | null;
  closed_positions: number | string | null;
  vacancy_rate_pct: number | string | null;
};

type ScenarioRow = {
  workforce_scenario_id: string | number;
  scenario_name: string;
  scenario_type: string;
  planning_month: string;
  org_unit_id: string | number;
  org_code: string;
  org_name: string;
  org_type: string;
  job_level_id: string | number;
  level_code: string;
  level_name: string;
  level_rank: number | string | null;
  planned_positions: number | string | null;
  planned_fte: number | string | null;
  planned_hires: number | string | null;
  planned_exits: number | string | null;
  planned_labor_cost_usd: number | string | null;
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
    const [currentResult, scenarioResult] =
      await Promise.all([
        supabaseServer
          .from(
            "position_modeling_current_summary"
          )
          .select(
            "org_unit_id, org_code, org_name, org_type, job_level_id, level_code, level_name, level_rank, current_positions, filled_positions, vacant_positions, planned_positions, frozen_positions, closed_positions, vacancy_rate_pct"
          ),

        supabaseServer
          .from(
            "position_modeling_scenario_summary"
          )
          .select(
            "workforce_scenario_id, scenario_name, scenario_type, planning_month, org_unit_id, org_code, org_name, org_type, job_level_id, level_code, level_name, level_rank, planned_positions, planned_fte, planned_hires, planned_exits, planned_labor_cost_usd"
          )
          .eq(
            "planning_month",
            "2027-12-01"
          ),
      ]);

    if (currentResult.error) {
      throw new Error(
        `Current positions: ${currentResult.error.message}`
      );
    }

    if (scenarioResult.error) {
      throw new Error(
        `Scenario positions: ${scenarioResult.error.message}`
      );
    }

    const currentRows: CurrentRow[] =
      currentResult.data ?? [];

    const scenarioRows: ScenarioRow[] =
      scenarioResult.data ?? [];

    const currentTotals = currentRows.reduce(
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

    const vacancyRatePct =
      currentTotals.current_positions > 0
        ? round1(
            (currentTotals.vacant_positions /
              currentTotals.current_positions) *
              100
          )
        : 0;

    const currentByOrgMap = new Map<
      string,
      {
        org_code: string;
        org_name: string;
        current_positions: number;
        filled_positions: number;
        vacant_positions: number;
      }
    >();

    for (const row of currentRows) {
      const key = row.org_code;

      const existing =
        currentByOrgMap.get(key) ?? {
          org_code: row.org_code,
          org_name: row.org_name,
          current_positions: 0,
          filled_positions: 0,
          vacant_positions: 0,
        };

      existing.current_positions += toNumber(
        row.current_positions
      );
      existing.filled_positions += toNumber(
        row.filled_positions
      );
      existing.vacant_positions += toNumber(
        row.vacant_positions
      );

      currentByOrgMap.set(key, existing);
    }

    const currentByLevelMap = new Map<
      string,
      {
        level_code: string;
        level_name: string;
        level_rank: number;
        current_positions: number;
        filled_positions: number;
        vacant_positions: number;
      }
    >();

    for (const row of currentRows) {
      const key = row.level_code;

      const existing =
        currentByLevelMap.get(key) ?? {
          level_code: row.level_code,
          level_name: row.level_name,
          level_rank: toNumber(
            row.level_rank
          ),
          current_positions: 0,
          filled_positions: 0,
          vacant_positions: 0,
        };

      existing.current_positions += toNumber(
        row.current_positions
      );
      existing.filled_positions += toNumber(
        row.filled_positions
      );
      existing.vacant_positions += toNumber(
        row.vacant_positions
      );

      currentByLevelMap.set(key, existing);
    }

    const scenarioOrder = [
      "Baseline",
      "Growth",
      "Hiring Freeze",
      "AI Productivity",
    ];

    const scenarioNames = Array.from(
      new Set(
        scenarioRows.map(
          (row) => row.scenario_name
        )
      )
    ).sort((a, b) => {
      const aIndex = scenarioOrder.indexOf(a);
      const bIndex = scenarioOrder.indexOf(b);

      return (
        (aIndex === -1 ? 999 : aIndex) -
        (bIndex === -1 ? 999 : bIndex)
      );
    });

    const scenarios = scenarioNames.map(
      (scenarioName) => {
        const rows = scenarioRows.filter(
          (row) =>
            row.scenario_name ===
            scenarioName
        );

        const totals = rows.reduce(
          (acc, row) => {
            acc.planned_positions +=
              toNumber(
                row.planned_positions
              );
            acc.planned_fte += toNumber(
              row.planned_fte
            );
            acc.planned_hires += toNumber(
              row.planned_hires
            );
            acc.planned_exits += toNumber(
              row.planned_exits
            );
            acc.planned_labor_cost_usd +=
              toNumber(
                row.planned_labor_cost_usd
              );
            return acc;
          },
          {
            planned_positions: 0,
            planned_fte: 0,
            planned_hires: 0,
            planned_exits: 0,
            planned_labor_cost_usd: 0,
          }
        );

        const orgMap = new Map<
          string,
          {
            org_code: string;
            org_name: string;
            planned_positions: number;
            planned_fte: number;
            planned_hires: number;
            planned_exits: number;
            planned_labor_cost_usd: number;
          }
        >();

        for (const row of rows) {
          const key = row.org_code;

          const existing =
            orgMap.get(key) ?? {
              org_code: row.org_code,
              org_name: row.org_name,
              planned_positions: 0,
              planned_fte: 0,
              planned_hires: 0,
              planned_exits: 0,
              planned_labor_cost_usd: 0,
            };

          existing.planned_positions +=
            toNumber(
              row.planned_positions
            );
          existing.planned_fte +=
            toNumber(row.planned_fte);
          existing.planned_hires +=
            toNumber(
              row.planned_hires
            );
          existing.planned_exits +=
            toNumber(
              row.planned_exits
            );
          existing.planned_labor_cost_usd +=
            toNumber(
              row.planned_labor_cost_usd
            );

          orgMap.set(key, existing);
        }

        const byBusinessUnit = Array.from(
          orgMap.values()
        )
          .map((row) => {
            const current =
              currentByOrgMap.get(
                row.org_code
              );

            const currentPositions =
              current?.current_positions ?? 0;

            return {
              ...row,
              planned_fte: round1(
                row.planned_fte
              ),
              planned_labor_cost_usd:
                round2(
                  row.planned_labor_cost_usd
                ),
              current_positions:
                currentPositions,
              net_position_change:
                row.planned_positions -
                currentPositions,
              vacancy_rate_pct:
                currentPositions > 0
                  ? round1(
                      ((current
                        ?.vacant_positions ??
                        0) /
                        currentPositions) *
                        100
                    )
                  : 0,
            };
          })
          .sort(
            (a, b) =>
              b.net_position_change -
              a.net_position_change
          );

        const levelMap = new Map<
          string,
          {
            level_code: string;
            level_name: string;
            level_rank: number;
            planned_positions: number;
            planned_fte: number;
            planned_hires: number;
            planned_exits: number;
            planned_labor_cost_usd: number;
          }
        >();

        for (const row of rows) {
          const key = row.level_code;

          const existing =
            levelMap.get(key) ?? {
              level_code: row.level_code,
              level_name: row.level_name,
              level_rank: toNumber(
                row.level_rank
              ),
              planned_positions: 0,
              planned_fte: 0,
              planned_hires: 0,
              planned_exits: 0,
              planned_labor_cost_usd: 0,
            };

          existing.planned_positions +=
            toNumber(
              row.planned_positions
            );
          existing.planned_fte +=
            toNumber(row.planned_fte);
          existing.planned_hires +=
            toNumber(
              row.planned_hires
            );
          existing.planned_exits +=
            toNumber(
              row.planned_exits
            );
          existing.planned_labor_cost_usd +=
            toNumber(
              row.planned_labor_cost_usd
            );

          levelMap.set(key, existing);
        }

        const byLevel = Array.from(
          levelMap.values()
        )
          .map((row) => {
            const current =
              currentByLevelMap.get(
                row.level_code
              );

            const currentPositions =
              current?.current_positions ?? 0;

            return {
              ...row,
              planned_fte: round1(
                row.planned_fte
              ),
              planned_labor_cost_usd:
                round2(
                  row.planned_labor_cost_usd
                ),
              current_positions:
                currentPositions,
              net_position_change:
                row.planned_positions -
                currentPositions,
            };
          })
          .sort(
            (a, b) =>
              a.level_rank -
              b.level_rank
          );

        return {
          scenario_name: scenarioName,
          scenario_type:
            rows[0]?.scenario_type ?? "",
          planning_month:
            rows[0]?.planning_month ??
            "2027-12-01",
          totals: {
            planned_positions:
              totals.planned_positions,
            planned_fte: round1(
              totals.planned_fte
            ),
            planned_hires:
              totals.planned_hires,
            planned_exits:
              totals.planned_exits,
            planned_labor_cost_usd:
              round2(
                totals.planned_labor_cost_usd
              ),
            current_positions:
              currentTotals.current_positions,
            net_position_change:
              totals.planned_positions -
              currentTotals.current_positions,
          },
          by_business_unit:
            byBusinessUnit,
          by_level: byLevel,
        };
      }
    );

    return NextResponse.json(
      {
        as_of: "2026-09-30",
        planning_month: "2027-12-01",
        current: {
          ...currentTotals,
          vacancy_rate_pct:
            vacancyRatePct,
          by_business_unit:
            Array.from(
              currentByOrgMap.values()
            ).sort(
              (a, b) =>
                b.current_positions -
                a.current_positions
            ),
          by_level: Array.from(
            currentByLevelMap.values()
          ).sort(
            (a, b) =>
              a.level_rank -
              b.level_rank
          ),
        },
        scenarios,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Position modeling API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load position modeling data.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return withDatasetRequest(request, () => handleGET());
}
