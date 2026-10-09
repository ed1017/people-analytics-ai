import {
  formatPercent,
  formatSignedWholeDelta,
  formatWholeCount,
} from "@/lib/display-format";
import type {
  PositionBusinessUnit,
  PositionLevel,
  PositionModelingResponse,
  PositionScenario,
} from "@/lib/types";

type PositionModelingSummaryProps = {
  positionModelingError: string | null;
  positionModelingLoading: boolean;
  positionModelingData: PositionModelingResponse | null;
  activePositionScenario: PositionScenario | null;
  topPositionBusinessUnits: PositionBusinessUnit[];
  positionLevels: PositionLevel[];
};

export function PositionModelingSummary({
  positionModelingError,
  positionModelingLoading,
  positionModelingData,
  activePositionScenario,
  topPositionBusinessUnits,
  positionLevels,
}: PositionModelingSummaryProps) {
  return (
    <>
      {positionModelingData?.data_meta?.dataClass === "constructed-synthetic" && (
        <div className="mb-4 rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
          <p>{positionModelingData.data_meta.sourceLabel}.</p>
          <p className="mt-1">{positionModelingData.data_meta.planningCaveat}</p>
          <p className="mt-1">{positionModelingData.data_meta.planningAvailabilityLabel ?? 'Planning operation availability must be reviewed for this dataset.'}</p>
        </div>
      )}
      {positionModelingError && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {positionModelingError}
        </div>
      )}

      {positionModelingData &&
      activePositionScenario ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Current Positions
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatWholeCount(positionModelingData.current.current_positions)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatWholeCount(positionModelingData.current.filled_positions)} filled ·{" "}
                {formatWholeCount(positionModelingData.current.vacant_positions)} vacant
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Vacancy Rate
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatPercent(
                  positionModelingData.current.vacancy_rate_pct
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Current authorized positions
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Dec 2027 Planned Positions
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatWholeCount(activePositionScenario.totals.planned_positions)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {activePositionScenario.scenario_name} scenario
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Net Position Change
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatSignedWholeDelta(
                  activePositionScenario.totals.net_position_change
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Planned positions vs current
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
            Positions represent authorized roles, while headcount represents people.
            Planned position totals can therefore differ slightly from planned headcount.
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="mb-4">
                <h4 className="font-semibold">
                  Position Change by Business Unit
                </h4>
                <p className="text-sm text-muted-foreground">
                  Largest absolute changes under{" "}
                  {activePositionScenario.scenario_name}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-3 pr-4">
                        Business Unit
                      </th>
                      <th className="pb-3 pr-4 text-right">
                        Current
                      </th>
                      <th className="pb-3 pr-4 text-right">
                        Planned
                      </th>
                      <th className="pb-3 text-right">
                        Change
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPositionBusinessUnits.map(
                      (row) => (
                        <tr
                          key={row.org_code}
                          className="border-b last:border-0"
                        >
                          <td className="py-3 pr-4 font-medium">
                            {row.org_name}
                          </td>
                          <td className="py-3 pr-4 text-right">
                            {formatWholeCount(row.current_positions)}
                          </td>
                          <td className="py-3 pr-4 text-right">
                            {formatWholeCount(row.planned_positions)}
                          </td>
                          <td className="py-3 text-right font-semibold">
                            {formatSignedWholeDelta(
                              row.net_position_change
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="mb-4">
                <h4 className="font-semibold">
                  Position Change by Level
                </h4>
                <p className="text-sm text-muted-foreground">
                  Current versus Dec 2027 planned structure
                </p>
              </div>

              <div className="max-h-[360px] overflow-y-auto overflow-x-hidden pr-1">
                <table className="w-full table-fixed text-sm">
                  <colgroup>
                    <col className="w-[42%]" />
                    <col className="w-[18%]" />
                    <col className="w-[18%]" />
                    <col className="w-[22%]" />
                  </colgroup>

                  <thead className="sticky top-0 z-10 bg-background">
                    <tr className="border-b text-left text-[11px] text-muted-foreground">
                      <th className="pb-3 pr-2">
                        Level
                      </th>
                      <th className="pb-3 px-1 text-right">
                        Current
                      </th>
                      <th className="pb-3 px-1 text-right">
                        Planned
                      </th>
                      <th className="pb-3 pl-1 text-right">
                        Change
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {positionLevels.map(
                      (row) => (
                        <tr
                          key={row.level_code}
                          className="border-b last:border-0"
                        >
                          <td className="py-3 pr-2 font-medium leading-tight">
                            {row.level_name}
                          </td>
                          <td className="px-1 py-3 text-right tabular-nums whitespace-nowrap">
                            {formatWholeCount(row.current_positions)}
                          </td>
                          <td className="px-1 py-3 text-right tabular-nums whitespace-nowrap">
                            {formatWholeCount(row.planned_positions)}
                          </td>
                          <td className="py-3 pl-1 text-right font-semibold tabular-nums whitespace-nowrap">
                            {formatSignedWholeDelta(
                              row.net_position_change
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {positionModelingLoading
            ? "Loading position modeling…"
            : "No position modeling data returned."}
        </div>
      )}
    </>
  );
}
