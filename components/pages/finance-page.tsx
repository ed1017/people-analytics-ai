"use client";
import {financeVacancyBasis} from '@/lib/finance-vacancy-basis';
import { PlanningGuide } from "@/components/planning-guide";

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
  const exposure=financeData?financeVacancyBasis(financeData.current.estimated_vacancy_cost_exposure_usd,financeBusinessUnits):null;
  const precise=(value:number)=>Number.isFinite(value)?'$'+value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+' USD':'Unavailable';
  return (
<section className="evidence-workspace @container min-w-0 p-4 sm:p-6">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3"><PlanningGuide page="finance" /></div>
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
                <p aria-label="Finance metric scope" className="mb-3 rounded-lg border bg-muted/30 px-3 py-2 text-base font-semibold">Company-wide · workforce filters not applied</p>
                <div aria-label="Finance headline metrics" className="grid grid-cols-1 gap-4 @min-[26rem]:grid-cols-2 @min-[56rem]:grid-cols-4">
                  <div className="min-w-0 break-words rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Total Labor Cost
                    </p>
                    <p className="mt-2 break-words text-[clamp(1.25rem,3cqw,1.875rem)] font-semibold">
                      {formatCurrencyCompact(
                        financeData.current.labor_cost_usd
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Annualized company labor cost
                    </p>
                  </div>

                  <div className="min-w-0 break-words rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Cost per FTE
                    </p>
                    <p className="mt-2 break-words text-[clamp(1.25rem,3cqw,1.875rem)] font-semibold">
                      $
                      {Math.round(
                        financeData.current.cost_per_fte_usd
                      ).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {financeData.current.fte.toLocaleString()} FTE
                    </p>
                  </div>

                  <div className="min-w-0 break-words rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Vacancy Cost Exposure
                    </p>
                    <p className="mt-2 break-words text-[clamp(1.25rem,3cqw,1.875rem)] font-semibold">
                      {formatCurrencyCompact(
                        financeData.current
                          .estimated_vacancy_cost_exposure_usd
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Estimated annualized exposure
                    </p>
                  </div>

                  <div className="min-w-0 break-words rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Vacant Positions
                    </p>
                    <p className="mt-2 break-words text-[clamp(1.25rem,3cqw,1.875rem)] font-semibold">
                      {financeData.current.vacant_positions.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Current authorized vacancies
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                  <p>Vacancy exposure = sum of business-unit exposure estimates; not booked expense.</p>
                  <details><summary className="min-h-11 cursor-pointer py-2 text-base">Exposure calculation</summary><ul className="space-y-1 text-base">{financeBusinessUnits.map(row=><li key={row.org_code}>{row.org_name}: {precise(row.estimated_vacancy_cost_exposure_usd)}</li>)}</ul><p className="mt-2 text-base">Sum: {exposure?.subtotal==null?'Unavailable':precise(exposure.subtotal)} · Reported headline: {precise(financeData.current.estimated_vacancy_cost_exposure_usd)}</p>{exposure?.difference!==null&&!exposure?.reconciles&&<p className="text-base">Difference: {precise(exposure!.difference!)}. Source totals need reconciliation.</p>}</details>
                </div>

                <div className="mt-6 grid gap-6 @min-[52rem]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                  <div className="min-w-0 break-words rounded-lg border p-4">
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
                            <div className="flex flex-wrap items-end justify-between gap-4">
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

                  <div className="min-w-0 break-words rounded-lg border p-4">
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

                  <div className="grid gap-3 @min-[26rem]:grid-cols-2 @min-[56rem]:grid-cols-4">
                    {financeScenarios.map(
                      (scenario) => (
                        <div
                          key={scenario.scenario_name}
                          className="min-w-0 break-words rounded-lg border p-4"
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
