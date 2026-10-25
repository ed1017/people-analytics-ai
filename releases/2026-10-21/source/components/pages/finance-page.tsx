"use client";
import {evidenceAsOfLabel} from '@/lib/evidence-period-label';
import {KeyFindings} from "@/components/key-findings";
import {financeFindings} from "@/lib/key-findings";
import {catalogDisplayLabel} from "@/lib/catalog-display";
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

function formatCurrencyCompact(value: number | null) {
  if(value===null||!Number.isFinite(value))return "Unavailable";
  if (Math.abs(value) >= 1_000_000_000) {
    return "$" + (value / 1_000_000_000).toFixed(2) + "B";
  }

  if (Math.abs(value) >= 1_000_000) {
    return "$" + (value / 1_000_000).toFixed(1) + "M";
  }

  return "$" + Math.round(value).toLocaleString();
}

export function FinancePage({
  financeData: sourceData,
  financeLoading,
  financeError,
  financeBusinessUnits,
  financeScenarios,
  maxFinanceLaborCost,
}: FinancePageProps) {
  const financeData = !financeLoading && !financeError ? sourceData : null;
  const exposure=financeData?financeVacancyBasis(financeData.current.estimated_vacancy_cost_exposure_usd,financeBusinessUnits):null;
  const count=(value:number|null)=>value===null?"Unavailable":value.toLocaleString();
  const precise=(value:number|null)=>value!==null&&Number.isFinite(value)?'$'+value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+' USD':'Unavailable';
  return (
<section className="evidence-workspace @container min-w-0 p-4 sm:p-6">
      <KeyFindings findings={financeData ? financeFindings(financeData) : null} />
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
                  : financeData ? evidenceAsOfLabel(financeData.as_of) : "Finance"}
              </span>
            </div>

            {!financeLoading && financeError && (
              <div role="alert" className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
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
                    <details className="mt-1 text-xs text-muted-foreground">
                      <summary className="cursor-pointer min-h-6">Reported USD cost · period unknown</summary>
                      <p className="mt-1">The source does not specify a cost period or whether benefits and other employer costs are included.</p>
                    </details>
                  </div>

                  <div className="min-w-0 break-words rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Cost per FTE
                    </p>
                    <p className="mt-2 break-words text-[clamp(1.25rem,3cqw,1.875rem)] font-semibold">
                      {formatCurrencyCompact(financeData.current.cost_per_fte_usd)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {count(financeData.current.fte)} FTE
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
                      Estimated USD exposure · period unknown
                    </p>
                  </div>

                  <div className="min-w-0 break-words rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Vacant Positions
                    </p>
                    <p className="mt-2 break-words text-[clamp(1.25rem,3cqw,1.875rem)] font-semibold">
                      {count(financeData.current.vacant_positions)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Current authorized vacancies
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                  <p>Vacancy exposure = sum of business-unit exposure estimates; not company cost/FTE × vacancies, booked expense or guaranteed savings. Cost/FTE reflects workforce mix, not salary. Missing values stay unavailable.</p>
                  <details><summary className="min-h-11 cursor-pointer py-2 text-base">Exposure calculation</summary><ul className="space-y-1 text-base">{financeBusinessUnits.map(row=><li key={row.org_code}>{catalogDisplayLabel(row.org_name)}: {precise(row.estimated_vacancy_cost_exposure_usd)}</li>)}</ul><p className="mt-2 text-base">Sum: {exposure?.subtotal==null?'Unavailable':precise(exposure.subtotal)} · Reported headline: {precise(financeData.current.estimated_vacancy_cost_exposure_usd)}</p>{exposure?.difference!==null&&!exposure?.reconciles&&<p className="text-base">Difference: {precise(exposure!.difference!)}. Source totals need reconciliation.</p>}</details>
                </div>

                <div className="mt-6 grid gap-6 @min-[52rem]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                  <div className="min-w-0 break-words rounded-lg border p-4">
                    <div className="mb-4">
                      <h3 className="font-semibold">
                        Labor Cost by Business Unit
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Reported workforce cost and cost mix · period unknown
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
                                  {catalogDisplayLabel(row.org_name)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {count(row.headcount)} HC · {formatCurrencyCompact(row.cost_per_fte_usd)}
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
                                  {row.share_of_enterprise_labor_cost_pct===null?"Share unavailable":row.share_of_enterprise_labor_cost_pct.toFixed(1)+"% of total"}
                                </p>
                              </div>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-foreground"
                                style={{
                                  width: `${
                                    row.labor_cost_usd !== null && maxFinanceLaborCost > 0
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
                        Source-reported estimates for open positions · period unknown
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
                                (b.estimated_vacancy_cost_exposure_usd ?? -1) -
                                (a.estimated_vacancy_cost_exposure_usd ?? -1)
                            )
                            .map((row) => (
                              <tr
                                key={row.org_code}
                                className="border-b last:border-0"
                              >
                                <td className="py-3 pr-2 font-medium leading-tight">
                                  {catalogDisplayLabel(row.org_name)}
                                </td>
                                <td className="px-1 py-3 text-right tabular-nums">
                                  {count(row.vacant_positions)}
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
                      December 2027 modeled labor cost and headcount relative to Baseline
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
              (financeLoading || !financeError) && <div role="status" className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
                {financeLoading
                  ? "Loading workforce finance…"
                  : "No finance data returned."}
              </div>
            )}
          </section>
  );
}
