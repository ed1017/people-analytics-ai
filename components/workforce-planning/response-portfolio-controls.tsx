import type {
  ReactNode,
} from "react";

import type {
  StructuralPositionScenarioResponse,
  WorkforceResponsePlanAllocation,
  WorkforceResponsePortfolioResponse,
} from "@/lib/types";

type ResponsePortfolioControlsProps = {
  scenario: StructuralPositionScenarioResponse;
  allocations: Record<
    string,
    WorkforceResponsePlanAllocation
  >;
  result: WorkforceResponsePortfolioResponse | null;
  loading: boolean;
  error: string | null;
  onUpdate: (
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

function formatCount(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 1,
  });
}

function formatSigned(value: number) {
  const formatted = formatCount(
    Math.abs(value)
  );
  return value > 0
    ? "+" + formatted
    : value < 0
      ? "-" + formatted
      : formatted;
}

export function ResponsePortfolioControls({
  scenario,
  allocations,
  result,
  loading,
  error,
  onUpdate,
  onReset,
  onRun,
  children,
}: ResponsePortfolioControlsProps) {
  const positiveRoles =
    scenario.job_profile_impact.filter(
      (row) =>
        row.authorized_position_delta > 0
    );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h5 className="font-semibold">
            Workforce Response Portfolio
          </h5>
          <p className="text-sm text-muted-foreground">
            Allocate Build, Move, and Buy across multiple scenario-created roles and reconcile the portfolio without double-counting interested internal talent.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={loading}
            className="rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onRun}
            disabled={loading}
            className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Running..."
              : "Run Portfolio"}
          </button>
        </div>
      </div>

      <div className="max-h-[360px] overflow-auto rounded-md border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="p-3">
                Role
              </th>
              <th className="p-3 text-right">
                Demand
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
            {positiveRoles.map((row) => {
              const allocation =
                allocations[
                  row.job_profile_code
                ] ?? emptyAllocation();

              return (
                <tr
                  key={row.job_profile_code}
                  className="border-b last:border-0"
                >

                  <td className="p-3">
                    <p className="font-medium">
                      {row.job_profile_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {row.job_profile_code}
                    </p>
                  </td>
                  <td className="p-3 text-right font-medium tabular-nums">
                    {formatCount(
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
                            row.job_profile_code,
                            key,
                            Number(
                              event.target.value
                            )
                          )
                        }
                        className="w-full min-w-[90px] rounded-md border bg-background px-2 py-1.5 text-right text-sm tabular-nums"
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        The governed career-preference model allows one target profile per employee, so interested internal Build/Move pools do not overlap across portfolio roles. Each role is still capped at its own modeled demand.
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">
                Positive Role Demand
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {formatCount(
                  result.scenario_positive_role_demand
                )}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">
                Planned Coverage
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {formatCount(
                  result.planned_coverage_if_executed
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {result.coverage_pct_of_all_positive_role_demand.toFixed(
                  1
                )}% of positive demand
              </p>
            </div>

            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">
                Remaining Gap
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {formatCount(
                  result.remaining_gap_if_executed +
                    result.unplanned_role_demand
                )}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">
                Internal Supply
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {result.internal_supply.role_ready.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                role-ready ·{" "}
                {result.internal_supply.fully_pathway_covered_near_ready.toLocaleString()} path-covered near-ready
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
            Portfolio allocation: Build{" "}
            {formatCount(
              result.allocation.build
            )}{" "}
            · Move{" "}
            {formatCount(
              result.allocation.move
            )}{" "}
            · Buy{" "}
            {formatCount(
              result.allocation.buy
            )}{" "}
            · {result.recruiting_evidence.current_open_requisitions.toLocaleString()} current open reqs ·{" "}
            {result.recruiting_evidence.recent_12m_external_fills.toLocaleString()} external fills in trailing 12M
          </div>

          {result.demand_by_business_unit.length >
            0 && (
            <div className="mt-4 rounded-md border p-3">
              <div className="mb-2">
                <p className="text-xs font-medium">
                  Organizational Demand Ownership
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Signed modeled role-demand deltas by business unit. These reconcile to enterprise role demand; Build / Move / Buy remain role-level allocations.
                </p>
              </div>

              <div className="max-h-[260px] overflow-auto">
                <table className="w-full min-w-[720px] text-xs">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-3">
                        Business Unit
                      </th>
                      <th className="pb-2 px-3 text-right">
                        Scenario Δ
                      </th>
                      <th className="pb-2 px-3 text-right">
                        Portfolio Δ
                      </th>
                      <th className="pb-2 pl-3">
                        Role Detail
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {result.demand_by_business_unit.map(
                      (bu) => (
                        <tr
                          key={bu.org_code}
                          className="border-b last:border-0"
                        >
                          <td className="py-2 pr-3 font-medium">
                            {bu.org_name}
                          </td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums">
                            {formatSigned(
                              bu.scenario_role_demand_delta
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatSigned(
                              bu.portfolio_role_demand_delta
                            )}
                          </td>
                          <td className="py-2 pl-3 text-muted-foreground">
                            {bu.roles
                              .map(
                                (role) =>
                                  role.job_profile_name +
                                  " " +
                                  formatSigned(
                                    role.scenario_created_role_demand_delta
                                  ) +
                                  (role.included_in_portfolio
                                    ? ""
                                    : " (unplanned)")
                              )
                              .join(" · ")}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {children}

          <div className="mt-4 overflow-x-auto rounded-md border">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="p-3">
                    Role
                  </th>
                  <th className="p-3 text-right">
                    Demand
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
                  <th className="p-3 text-right">
                    Remaining
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
                      {formatCount(
                        role.scenario_created_role_demand
                      )}
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {formatCount(
                        role.allocation.build
                      )}
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {formatCount(
                        role.allocation.move
                      )}
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {formatCount(
                        role.allocation.buy
                      )}
                    </td>
                    <td className="p-3 text-right font-medium tabular-nums">
                      {formatCount(
                        role.remaining_role_gap_if_executed
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.warnings.length > 0 && (
            <div className="mt-4 rounded-md border p-3">
              <p className="text-xs font-medium">
                Portfolio warnings
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
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
        </>
      )}
    </>
  );
}
