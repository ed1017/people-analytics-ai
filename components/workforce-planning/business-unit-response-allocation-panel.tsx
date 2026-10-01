import type {
  ReactNode,
} from "react";

import {
  formatCapacity,
  formatWholeCount,
} from "@/lib/display-format";
import type {
  BusinessUnitResponseAllocationResponse,
  StructuralPositionScenarioResponse,
  WorkforceResponsePlanAllocation,
  WorkforceResponsePortfolioResponse,
} from "@/lib/types";

type BusinessUnitResponseAllocationPanelProps = {
  scenario: StructuralPositionScenarioResponse;
  portfolioResult: WorkforceResponsePortfolioResponse;
  allocations: Record<
    string,
    WorkforceResponsePlanAllocation
  >;
  result: BusinessUnitResponseAllocationResponse | null;
  loading: boolean;
  error: string | null;
  onUpdate: (
    orgCode: string,
    jobProfileCode: string,
    key: "build" | "move" | "buy",
    value: number
  ) => void;
  onReset: () => void;
  onRun: () => void;
  children?: ReactNode;
};

function emptyAllocation(): WorkforceResponsePlanAllocation {
  return {
    build: 0,
    move: 0,
    buy: 0,
    borrow: 0,
    automate: 0,
  };
}

export function BusinessUnitResponseAllocationPanel({
  scenario,
  portfolioResult,
  allocations,
  result,
  loading,
  error,
  onUpdate,
  onReset,
  onRun,
  children,
}: BusinessUnitResponseAllocationPanelProps) {
  const plannedRoleCodes = new Set(
    portfolioResult.roles.map(
      (role) => role.job_profile_code
    )
  );

  const destinations =
    scenario.business_unit_job_profile_impact.filter(
      (row) =>
        row.authorized_position_delta > 0 &&
        plannedRoleCodes.has(
          row.job_profile_code
        )
    );

  return (
    <details className="mt-4 rounded-md border">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
        Business Unit Response Allocation
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          destination ownership
        </span>
      </summary>

      <div className="border-t p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-3xl text-xs text-muted-foreground">
            Allocate the existing role portfolio to destination business units. BU totals must reconcile back to each role's Build / Move / Buy target. A Move row identifies the destination only; source BU is not inferred. Amounts are modeled role capacity and may be fractional.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onReset}
              disabled={loading}
              className="rounded-md border px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onRun}
              disabled={loading}
              className="rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Running..."
                : "Run BU Allocation"}
            </button>
          </div>
        </div>

        <div className="max-h-[320px] overflow-auto rounded-md border">
          <table className="w-full min-w-[760px] text-xs">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3">
                  Business Unit / Role
                </th>
                <th className="p-3 text-right">
                  Gross Demand
                </th>
                <th className="p-3 text-right">
                  Build
                </th>
                <th className="p-3 text-right">
                  Move
                </th>
                <th className="p-3 text-right">
                  Buy
                </th>
              </tr>
            </thead>
            <tbody>
              {destinations.map((row) => {
                const allocationKey =
                  row.org_code +
                  "::" +
                  row.job_profile_code;
                const allocation =
                  allocations[allocationKey] ??
                  emptyAllocation();

                return (
                  <tr
                    key={allocationKey}
                    className="border-b last:border-0"
                  >

                    <td className="p-3">
                      <p className="font-medium">
                        {row.org_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {row.job_profile_name}
                      </p>
                    </td>
                    <td className="p-3 text-right font-medium tabular-nums">
                      {formatCapacity(
                        row.authorized_position_delta
                      )}
                    </td>
                    {(
                      [
                        ["build", "Build"],
                        ["move", "Move"],
                        ["buy", "Buy"],
                      ] as const
                    ).map(([key, label]) => (
                      <td
                        key={key}
                        className="p-3"
                      >
                        <input
                          aria-label={
                            row.org_name +
                            " " +
                            row.job_profile_name +
                            " " +
                            label
                          }
                          type="number"
                          min={0}
                          step={1}
                          value={allocation[key]}
                          onChange={(event) =>
                            onUpdate(
                              row.org_code,
                              row.job_profile_code,
                              key,
                              Number(
                                event.target.value
                              )
                            )
                          }
                          className="w-full min-w-[80px] rounded-md border bg-background px-2 py-1.5 text-right tabular-nums"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {result && (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-md border p-3">
                <p className="text-[11px] text-muted-foreground">
                  Company Net Need
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {formatCapacity(
                    result.scenario_net_role_demand
                  )}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-[11px] text-muted-foreground">
                  Gross BU Destination Demand
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {formatCapacity(
                    result.gross_destination_demand
                  )}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-[11px] text-muted-foreground">
                  Contraction Offset
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {formatCapacity(
                    result.contraction_offset
                  )}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-[11px] text-muted-foreground">
                  Remaining Net Gap
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {formatCapacity(
                    result.remaining_net_gap_if_executed
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatCapacity(
                    result.effective_coverage_if_executed
                  )} effective coverage
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-md border">
              <table className="w-full min-w-[820px] text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-3">
                      Role Reconciliation
                    </th>
                    <th className="p-3 text-right">
                      Portfolio B / M / B
                    </th>
                    <th className="p-3 text-right">
                      BU Sum B / M / B
                    </th>
                    <th className="p-3 text-right">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.roles.map((role) => (
                    <tr
                      key={role.job_profile_code}
                      className="border-b last:border-0"
                    >
                      <td className="p-3 font-medium">
                        {role.job_profile_name}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {role.portfolio_target_allocation
                          ? formatCapacity(
                              role.portfolio_target_allocation.build
                            ) +
                            " / " +
                            formatCapacity(
                              role.portfolio_target_allocation.move
                            ) +
                            " / " +
                            formatCapacity(
                              role.portfolio_target_allocation.buy
                            )
                          : "—"}
                      </td>

                      <td className="p-3 text-right tabular-nums">
                        {formatCapacity(
                          role.allocation.build
                        ) +
                          " / " +
                          formatCapacity(
                            role.allocation.move
                          ) +
                          " / " +
                          formatCapacity(
                            role.allocation.buy
                          )}
                      </td>
                      <td className="p-3 text-right font-medium">
                        {role.portfolio_allocation_reconciled ===
                        null
                          ? "No target"
                          : role.portfolio_allocation_reconciled
                            ? "Reconciled"
                            : "Mismatch"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 text-[11px] text-muted-foreground">
              {formatWholeCount(result.unallocated_destinations.length)} positive destination row(s) remain unallocated ·{" "}
              {formatWholeCount(result.contractions.length)} contraction offset row(s). Destination gaps are not automatically treated as company gaps.
            </div>

            {result.warnings.length > 0 && (
              <div className="mt-3 rounded-md border p-3">
                <p className="text-xs font-medium">
                  BU allocation warnings
                </p>
                <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                  {result.warnings.map(
                    (warning) => (
                      <li key={warning}>
                        - {warning}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}

            {children}
          </>
        )}
      </div>
    </details>
  );
}
