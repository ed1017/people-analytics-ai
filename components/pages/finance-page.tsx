"use client";

import type {
  FinanceBusinessUnit,
  FinanceResponse,
  FinanceScenario,
} from "@/lib/types";

type FinancePageProps = {
  financeData: FinanceResponse | null;
  financeLoading: boolean;
  financeError: string | null;
  financeBusinessUnits: FinanceBusinessUnit[];
  financeScenarios: FinanceScenario[];
  maxFinanceLaborCost: number;
};

function formatCurrencyCompact(value: number) {
  if (Math.abs(value) >= 1_000_000_000) {
    return "$" + (value / 1_000_000_000).toFixed(2) + "B";
  }

  if (Math.abs(value) >= 1_000_000) {
    return "$" + (value / 1_000_000).toFixed(1) + "M";
  }

  return "$" + Math.round(value).toLocaleString();
}

export function FinancePage({
  financeData,
  financeLoading,
  financeError,
  financeBusinessUnits,
  financeScenarios,
  maxFinanceLaborCost,
}: FinancePageProps) {
  return (
<section className="min-w-0 p-6">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">
                  Labor Cost Planning
                </h2>
                <p className="text-muted-foreground">
                  Understand labor cost, workforce economics, vacancy exposure, and scenario impact.
                </p>
              </div>

              <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                {financeLoading
                  ? "Loading finance…"
                  : "As of September 30, 2026"}
              </span>
            </div>

            {financeError && (
              <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                {financeError}
              </div>
            )}

            {financeData ? (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Total Labor Cost
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {formatCurrencyCompact(
                        financeData.current.labor_cost_usd
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Annualized enterprise labor cost
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Cost per FTE
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      $
                      {Math.round(
                        financeData.current.cost_per_fte_usd
                      ).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {financeData.current.fte.toLocaleString()} FTE
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Vacancy Cost Exposure
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {formatCurrencyCompact(
                        financeData.current
                          .estimated_vacancy_cost_exposure_usd
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Estimated annualized exposure
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Vacant Positions
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {financeData.current.vacant_positions.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Current authorized vacancies
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                  Vacancy cost exposure is an estimate based on current average labor cost per FTE multiplied by vacant positions. It is not booked expense.
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
                  <div className="rounded-lg border p-4">
                    <div className="mb-4">
                      <h3 className="font-semibold">
                        Labor Cost by Business Unit
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Current annualized workforce cost and cost mix
                      </p>
                    </div>

                    <div className="space-y-4">
                      {financeBusinessUnits.map(
                        (row) => (
                          <div
                            key={row.org_code}
                            className="space-y-2"
                          >
                            <div className="flex items-end justify-between gap-4">
                              <div>
                                <p className="text-sm font-medium">
                                  {row.org_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {row.headcount.toLocaleString()} HC · $
                                  {Math.round(
                                    row.cost_per_fte_usd
                                  ).toLocaleString()}
                                  /FTE
                                </p>
                              </div>

                              <div className="text-right">
                                <p className="text-sm font-semibold">
                                  {formatCurrencyCompact(
                                    row.labor_cost_usd
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {row.share_of_enterprise_labor_cost_pct.toFixed(
                                    1
                                  )}
                                  % of total
                                </p>
                              </div>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-foreground"
                                style={{
                                  width: `${
                                    maxFinanceLaborCost > 0
                                      ? Math.max(
                                          3,
                                          (row.labor_cost_usd /
                                            maxFinanceLaborCost) *
                                            100
                                        )
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="mb-4">
                      <h3 className="font-semibold">
                        Vacancy Exposure by Business Unit
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Estimated annualized cost capacity associated with open positions
                      </p>
                    </div>

                    <div className="max-h-[430px] overflow-y-auto pr-1">
                      <table className="w-full table-fixed text-sm">
                        <colgroup>
                          <col className="w-[46%]" />
                          <col className="w-[20%]" />
                          <col className="w-[34%]" />
                        </colgroup>
                        <thead className="sticky top-0 z-10 bg-background">
                          <tr className="border-b text-left text-[11px] text-muted-foreground">
                            <th className="pb-3 pr-2">
                              Business Unit
                            </th>
                            <th className="pb-3 px-1 text-right">
                              Vacant
                            </th>
                            <th className="pb-3 pl-1 text-right">
                              Exposure
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...financeBusinessUnits]
                            .sort(
                              (a, b) =>
                                b.estimated_vacancy_cost_exposure_usd -
                                a.estimated_vacancy_cost_exposure_usd
                            )
                            .map((row) => (
                              <tr
                                key={row.org_code}
                                className="border-b last:border-0"
                              >
                                <td className="py-3 pr-2 font-medium leading-tight">
                                  {row.org_name}
                                </td>
                                <td className="px-1 py-3 text-right tabular-nums">
                                  {row.vacant_positions.toLocaleString()}
                                </td>
                                <td className="py-3 pl-1 text-right font-semibold tabular-nums">
                                  {formatCurrencyCompact(
                                    row.estimated_vacancy_cost_exposure_usd
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-lg border p-4">
                  <div className="mb-4">
                    <h3 className="font-semibold">
                      2027 Workforce Cost Scenarios
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      December 2027 annualized labor cost and headcount relative to Baseline
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {financeScenarios.map(
                      (scenario) => (
                        <div
                          key={scenario.scenario_name}
                          className="rounded-lg border p-4"
                        >
                          <p className="text-sm font-semibold">
                            {scenario.scenario_name}
                          </p>

                          <p className="mt-3 text-2xl font-semibold">
                            {formatCurrencyCompact(
                              scenario.planned_labor_cost_usd
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Dec 2027 labor cost
                          </p>

                          <div className="mt-4 space-y-1 text-xs">
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">
                                Headcount
                              </span>
                              <span className="font-medium">
                                {scenario.planned_headcount.toLocaleString()}
                              </span>
                            </div>

                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">
                                Cost vs Baseline
                              </span>
                              <span className="font-medium">
                                {scenario.labor_cost_delta_vs_baseline_usd ===
                                0
                                  ? "Baseline"
                                  : `${
                                      scenario.labor_cost_delta_vs_baseline_usd >
                                      0
                                        ? "+"
                                        : "-"
                                    }${formatCurrencyCompact(
                                      Math.abs(
                                        scenario.labor_cost_delta_vs_baseline_usd
                                      )
                                    )}`}
                              </span>
                            </div>

                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">
                                HC vs Baseline
                              </span>
                              <span className="font-medium">
                                {scenario.headcount_delta_vs_baseline ===
                                0
                                  ? "Baseline"
                                  : `${
                                      scenario.headcount_delta_vs_baseline >
                                      0
                                        ? "+"
                                        : ""
                                    }${scenario.headcount_delta_vs_baseline.toLocaleString()}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
                {financeLoading
                  ? "Loading workforce finance…"
                  : "No finance data returned."}
              </div>
            )}
          </section>
  );
}
