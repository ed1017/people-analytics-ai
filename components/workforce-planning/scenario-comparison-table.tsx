import type {
  PlanningPoint,
  PlanningScenario,
} from "@/lib/types";

type ScenarioComparisonTableProps = {
  visible: boolean;
  planningScenarios: PlanningScenario[];
  baselinePlanningEnd: PlanningPoint | null;
};

function formatCurrencyCompact(value: number) {
  const sign = value < 0 ? "-" : "";
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1_000_000_000) {
    return (
      sign +
      "$" +
      (
        absoluteValue / 1_000_000_000
      ).toFixed(2) +
      "B"
    );
  }

  if (absoluteValue >= 1_000_000) {
    return (
      sign +
      "$" +
      (
        absoluteValue / 1_000_000
      ).toFixed(1) +
      "M"
    );
  }
  return (
    sign +
    "$" +
    Math.round(
      absoluteValue
    ).toLocaleString()
  );
}

export function ScenarioComparisonTable({
  visible,
  planningScenarios,
  baselinePlanningEnd,
}: ScenarioComparisonTableProps) {
  if (!visible) return null;

  return (
    <>
      <div className="mb-4">
        <h3 className="font-semibold">
          Scenario Comparison
        </h3>
        <p className="text-sm text-muted-foreground">
          December 2027 outcomes across the enterprise plan
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-3 pr-4">
                Scenario
              </th>              <th className="pb-3 pr-4 text-right">
                Headcount
              </th>
              <th className="pb-3 pr-4 text-right">
                FTE
              </th>
              <th className="pb-3 pr-4 text-right">
                vs Baseline
              </th>
              <th className="pb-3 text-right">
                Labor Cost
              </th>
            </tr>
          </thead>
          <tbody>
            {planningScenarios.map(
              (scenario) => {
                const end =
                  scenario.points[
                    scenario.points.length - 1
                  ];
                const baselineHC =
                  baselinePlanningEnd
                    ?.planned_headcount ??
                  null;
                const delta =
                  end &&
                  baselineHC !== null
                    ? end.planned_headcount -
                      baselineHC
                    : null;

                return (
                  <tr
                    key={
                      scenario.scenario_name
                    }
                    className="border-b last:border-0"
                  >                    <td className="py-3 pr-4 font-medium">
                      {scenario.scenario_name}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {end
                        ? end.planned_headcount.toLocaleString()
                        : "—"}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {end
                        ? end.planned_fte.toLocaleString()
                        : "—"}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {delta === null
                        ? "—"
                        : `${
                            delta > 0
                              ? "+"
                              : ""
                          }${delta.toLocaleString()}`}
                    </td>
                    <td className="py-3 text-right">
                      {end
                        ? formatCurrencyCompact(
                            end.planned_labor_cost_usd
                          )
                        : "—"}
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
