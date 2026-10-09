import {
  formatCapacity,
  formatCurrencyCompact,
  formatPercent,
  formatSignedWholeDelta,
  formatWholeCount,
} from "@/lib/display-format";
import type { StructuralPositionScenarioResponse } from "@/lib/types";

type StructuralPositionScenarioSummaryProps = {
  result: StructuralPositionScenarioResponse;
  showDemandDetails: boolean;
};

export function StructuralPositionScenarioSummary({
  result,
  showDemandDetails,
}: StructuralPositionScenarioSummaryProps) {
  const structuralPositionResult = result;

  return (
    <>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">
            Authorized Positions
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {formatWholeCount(structuralPositionResult.modeled.authorized_positions)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatSignedWholeDelta(
              structuralPositionResult.modeled.net_authorized_position_change
            )}{" "}
            vs current
          </p>
        </div>

        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">
            Filled Positions
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {formatWholeCount(structuralPositionResult.modeled.filled_positions)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatSignedWholeDelta(
              structuralPositionResult.modeled.net_filled_position_change
            )}{" "}
            vs current
          </p>
        </div>

        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">
            Open Vacancies
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {formatWholeCount(structuralPositionResult.modeled.open_vacancies)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatPercent(
              structuralPositionResult.modeled.vacancy_rate_pct
            )} vacancy rate
          </p>
        </div>

        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">
            Authorized Budget Δ
          </p>
          <p className={"mt-1 font-semibold " + (structuralPositionResult.modeled.authorized_budget_delta_usd === null ? "text-sm break-words" : "text-2xl")}>
            {formatCurrencyCompact(
              structuralPositionResult.modeled
                .authorized_budget_delta_usd
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            Position authorization, not cash savings
          </p>
        </div>

        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">
            Staffed Labor Cost Δ
          </p>
          <p className={"mt-1 font-semibold " + (structuralPositionResult.modeled.annualized_staffed_labor_cost_delta_usd === null ? "text-sm break-words" : "text-2xl")}>
            {formatCurrencyCompact(
              structuralPositionResult.modeled
                .annualized_staffed_labor_cost_delta_usd
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            Annualized effect of modeled fills
          </p>
        </div>
      </div>

      <div
        className={
          showDemandDetails
            ? "mt-4 rounded-md border p-4"
            : "hidden"
        }
      >
        <div className="mb-4">
          <h5 className="font-semibold">
            Recruiting Demand
          </h5>
          <p className="text-sm text-muted-foreground">
            Position actions translated into linked requisition demand and ATS actions.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">
              Active Recruiting Demand
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {formatCapacity(
                structuralPositionResult.recruiting_demand
                  .active_recruiting_demand
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Open reqs + uncovered active vacancies
            </p>
          </div>

          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">
              Open Requisitions
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {formatCapacity(
                structuralPositionResult.recruiting_demand
                  .active_open_requisitions
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCapacity(
                structuralPositionResult.current
                  .open_requisitions
              )}{" "}
              current
            </p>
          </div>

          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">
              On-Hold Requisitions
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {formatCapacity(
                structuralPositionResult.recruiting_demand
                  .on_hold_requisitions
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Includes modeled vacancy freezes
            </p>
          </div>

          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">
              New Requisitions Needed
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {formatCapacity(
                structuralPositionResult.recruiting_demand
                  .incremental_requisitions_needed
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Active vacancies without a req
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border px-3 py-1">
            Hold{" "}
            {formatCapacity(
              structuralPositionResult.recruiting_demand
                .requisitions_to_hold
            )}
          </span>
          <span className="rounded-full border px-3 py-1">
            Cancel{" "}
            {formatCapacity(
              structuralPositionResult.recruiting_demand
                .requisitions_to_cancel
            )}
          </span>
          <span className="rounded-full border px-3 py-1">
            Create for fills{" "}
            {formatCapacity(
              structuralPositionResult.recruiting_demand
                .requisitions_to_create_for_modeled_fills
            )}
          </span>
          <span className="rounded-full border px-3 py-1">
            Reactivate for fills{" "}
            {formatCapacity(
              structuralPositionResult.recruiting_demand
                .requisitions_to_reactivate_for_modeled_fills
            )}
          </span>
          <span className="rounded-full border px-3 py-1">
            Close as filled{" "}
            {formatCapacity(
              structuralPositionResult.recruiting_demand
                .requisitions_closed_as_filled
            )}
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-3 pr-4">
                  Business Unit
                </th>
                <th className="pb-3 px-3 text-right">
                  Active Demand
                </th>
                <th className="pb-3 px-3 text-right">
                  Open Reqs
                </th>
                <th className="pb-3 px-3 text-right">
                  On Hold
                </th>
                <th className="pb-3 px-3 text-right">
                  New Reqs
                </th>
                <th className="pb-3 pl-3 text-right">
                  Modeled Fills
                </th>
              </tr>
            </thead>
            <tbody>
              {structuralPositionResult.recruiting_demand.by_business_unit
                .slice(0, 8)
                .map((row) => (
                  <tr
                    key={row.org_code}
                    className="border-b last:border-0"
                  >
                    <td className="py-3 pr-4 font-medium">
                      {row.org_name}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatCapacity(
                        row.active_recruiting_demand
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatCapacity(
                        row.active_open_requisitions
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatCapacity(
                        row.on_hold_requisitions
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatCapacity(
                        row.uncovered_open_vacancies
                      )}
                    </td>
                    <td className="py-3 pl-3 text-right tabular-nums">
                      {formatCapacity(
                        row.modeled_fills
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div
        className={
          showDemandDetails
            ? "mt-4 rounded-md border p-4"
            : "hidden"
        }
      >
        <div className="mb-4">
          <h5 className="font-semibold">
            Skill Demand
          </h5>
          <p className="text-sm text-muted-foreground">
            Authorized-position skill requirements and active recruiting skill demand implied by this scenario.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">
              Skills with Higher Demand
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {
                structuralPositionResult.skill_demand
                  .skills_with_increased_authorized_demand
              }
            </p>
            <p className="text-xs text-muted-foreground">
              Authorized-position demand increased
            </p>
          </div>

          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">
              Skills with Lower Demand
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {
                structuralPositionResult.skill_demand
                  .skills_with_reduced_authorized_demand
              }
            </p>
            <p className="text-xs text-muted-foreground">
              Authorized-position demand decreased
            </p>
          </div>

          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">
              Largest Modeled Gap
            </p>
            <p className="mt-1 truncate text-lg font-semibold">
              {structuralPositionResult.skill_demand
                .largest_modeled_gaps[0]
                ?.skill_name ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {structuralPositionResult.skill_demand
                .largest_modeled_gaps[0]
                ? formatCapacity(
                    structuralPositionResult.skill_demand
                      .largest_modeled_gaps[0]
                      .modeled_position_gap
                  ) +
                  " positions above current skill supply"
                : "No modeled gap"}
            </p>
          </div>

          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">
              Top Recruiting Skill
            </p>
            <p className="mt-1 truncate text-lg font-semibold">
              {structuralPositionResult.skill_demand
                .top_recruiting_skill_demand[0]
                ?.skill_name ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {structuralPositionResult.skill_demand
                .top_recruiting_skill_demand[0]
                ? formatCapacity(
                    structuralPositionResult.skill_demand
                      .top_recruiting_skill_demand[0]
                      .modeled_active_recruiting_demand
                  ) + " active recruiting positions"
                : "No active recruiting demand"}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
          Current employee skill supply is held constant. Position-based demand includes filled, vacant, and frozen authorized roles; active recruiting demand excludes frozen/on-hold vacancies.
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="overflow-x-auto rounded-md border p-3">
            <div className="mb-3">
              <p className="font-medium">
                Scenario Skill Changes
              </p>
              <p className="text-xs text-muted-foreground">
                Largest changes in authorized-position skill demand
              </p>
            </div>

            {structuralPositionResult.skill_demand
              .top_changed_skills.length >
            0 ? (
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-3 pr-4">
                      Skill
                    </th>
                    <th className="pb-3 px-3 text-right">
                      Demand Δ
                    </th>
                    <th className="pb-3 pl-3 text-right">
                      Modeled Gap
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {structuralPositionResult.skill_demand.top_changed_skills
                    .slice(0, 10)
                    .map((row) => (
                      <tr
                        key={row.skill_code}
                        className="border-b last:border-0"
                      >
                        <td className="py-3 pr-4">
                          <p className="font-medium">
                            {row.skill_name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {row.skill_category}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {row.authorized_demand_delta >
                          0
                            ? "+"
                            : ""}
                          {formatCapacity(
                            row.authorized_demand_delta
                          )}
                        </td>
                        <td className="py-3 pl-3 text-right tabular-nums">
                          {formatCapacity(
                            row.modeled_position_gap
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <p className="py-4 text-sm text-muted-foreground">
                This scenario does not change authorized skill demand; it only changes vacancy or staffing state.
              </p>
            )}
          </div>

          <div className="overflow-x-auto rounded-md border p-3">
            <div className="mb-3">
              <p className="font-medium">
                Active Recruiting Skill Demand
              </p>
              <p className="text-xs text-muted-foreground">
                Skills needed across active open and uncovered vacancies
              </p>
            </div>

            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4">
                    Skill
                  </th>
                  <th className="pb-3 px-3 text-right">
                    Active Demand
                  </th>
                  <th className="pb-3 pl-3 text-right">
                    Δ vs Current
                  </th>
                </tr>
              </thead>
              <tbody>
                {structuralPositionResult.skill_demand.top_recruiting_skill_demand
                  .slice(0, 10)
                  .map((row) => (
                    <tr
                      key={row.skill_code}
                      className="border-b last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <p className="font-medium">
                          {row.skill_name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {row.skill_category}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {formatCapacity(
                          row.modeled_active_recruiting_demand
                        )}
                      </td>
                      <td className="py-3 pl-3 text-right tabular-nums">
                        {row.active_recruiting_demand_delta >
                        0
                          ? "+"
                          : ""}
                        {formatCapacity(
                          row.active_recruiting_demand_delta
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
