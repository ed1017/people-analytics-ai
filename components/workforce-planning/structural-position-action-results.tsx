import type { StructuralPositionScenarioResponse } from "@/lib/types";

type StructuralPositionActionResultsProps = {
  result: StructuralPositionScenarioResponse;
};

const structuralActionLabels = {
  add_positions: "Add positions",
  close_vacant_positions: "Close vacant positions",
  freeze_vacancies: "Freeze vacancies",
  fill_vacancies: "Fill vacancies",
} as const;

function formatCurrencyCompact(value: number | null) {
  if(value===null)return "Unavailable";
  const sign = value < 0 ? "-" : "";
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1_000_000_000) {
    return sign + "$" + (absoluteValue / 1_000_000_000).toFixed(2) + "B";
  }

  if (absoluteValue >= 1_000_000) {
    return sign + "$" + (absoluteValue / 1_000_000).toFixed(1) + "M";
  }

  return sign + "$" + Math.round(absoluteValue).toLocaleString();
}

export function StructuralPositionActionResults({
  result,
}: StructuralPositionActionResultsProps) {
  const structuralPositionResult = result;

  return (
    <div className="mt-4 overflow-x-auto rounded-md border p-3">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="pb-3 pr-4">
              #
            </th>
            <th className="pb-3 pr-4">
              Action
            </th>
            <th className="pb-3 pr-4">
              Scope
            </th>
            <th className="pb-3 px-3 text-right">
              Applied
            </th>
            <th className="pb-3 px-3 text-right">
              Cost / Position
            </th>
            <th className="pb-3 px-3 text-right">
              Budget Δ
            </th>
            <th className="pb-3 pl-3 text-right">
              Staffed Cost Δ
            </th>
          </tr>
        </thead>
        <tbody>
          {structuralPositionResult.action_results.map(
            (row) => (
              <tr
                key={
                  row.action_index
                }
                className="border-b last:border-0"
              >
                <td className="py-3 pr-4">
                  {
                    row.action_index
                  }
                </td>
                <td className="py-3 pr-4 font-medium">
                  {
                    structuralActionLabels[
                      row.action_type
                    ]
                  }
                </td>
                <td className="py-3 pr-4">
                  {
                    row.scope_label
                  }
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {row.applied_value.toLocaleString()}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {formatCurrencyCompact(
                    row.annual_cost_basis_per_position_usd
                  )}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {formatCurrencyCompact(
                    row.authorized_budget_delta_usd
                  )}
                </td>
                <td className="py-3 pl-3 text-right tabular-nums">
                  {formatCurrencyCompact(
                    row.staffed_labor_cost_delta_usd
                  )}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
