import {catalogDisplayLabel} from "@/lib/catalog-display";
import { hasLegacyPositionSource } from "@/lib/legacy-source-contracts";
import {
  formatPercent,
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="min-w-0 rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Position records
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatWholeCount(positionModelingData.current.current_positions)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatWholeCount(positionModelingData.current.filled_positions)} filled ·{" "}
                {formatWholeCount(positionModelingData.current.vacant_positions)} vacant
              </p>
            </div>

            <div className="min-w-0 rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Vacancy Rate
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatPercent(
                  positionModelingData.current.vacancy_rate_pct
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Vacant / (filled + vacant) records
              </p>
            </div>

            <div className="min-w-0 rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Planned headcount · Dec 2027
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatWholeCount(activePositionScenario.totals.planned_positions)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {activePositionScenario.scenario_name} scenario
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
            <p>{positionModelingData.as_of ? `Inventory effective date: ${positionModelingData.as_of}` : "Inventory effective date unavailable"}.</p>
            <p>Filled + vacant position records and future planned headcount are different measures; their difference does not establish hiring need or an approved change.</p>
            {positionModelingData.data_meta?.dataClass !== "constructed-synthetic" && hasLegacyPositionSource(positionModelingData.source_contract) && (
              <p className="mt-1">Planned headcount sums rounded organization/level groups across all plans in this scenario. Grouped rounding and plan scope can differ from the workforce planning total.</p>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="min-w-0 rounded-lg border p-4">
              <div className="mb-4">
                <h4 className="font-semibold">
                  Inventory and Plan by Business Unit
                </h4>
                <p className="text-sm text-muted-foreground">
                  Largest current inventories ·{" "}
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
                        Position records
                      </th>
                      <th className="pb-3 pr-4 text-right">
                        Planned headcount
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
                            {catalogDisplayLabel(row.org_name)}
                          </td>
                          <td className="py-3 pr-4 text-right">
                            {formatWholeCount(row.current_positions)}
                          </td>
                          <td className="py-3 pr-4 text-right">
                            {formatWholeCount(row.planned_positions)}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="min-w-0 rounded-lg border p-4">
              <div className="mb-4">
                <h4 className="font-semibold">
                  Inventory and Plan by Level
                </h4>
                <p className="text-sm text-muted-foreground">
                  Position records and Dec 2027 planned headcount
                </p>
              </div>

              <div className="max-h-[360px] overflow-y-auto overflow-x-auto pr-1">
                <table className="w-full table-fixed text-sm">
                  <colgroup>
                    <col className="w-[40%]" />
                    <col className="w-[30%]" />
                    <col className="w-[30%]" />
                  </colgroup>

                  <thead className="sticky top-0 z-10 bg-background">
                    <tr className="border-b text-left text-[11px] text-muted-foreground">
                      <th className="pb-3 pr-2">
                        Level
                      </th>
                      <th className="pb-3 px-1 text-right">
                        Position records
                      </th>
                      <th className="pb-3 px-1 text-right">
                        Planned headcount
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
                            {catalogDisplayLabel(row.level_name)}
                          </td>
                          <td className="px-1 py-3 text-right tabular-nums whitespace-nowrap">
                            {formatWholeCount(row.current_positions)}
                          </td>
                          <td className="px-1 py-3 text-right tabular-nums whitespace-nowrap">
                            {formatWholeCount(row.planned_positions)}
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
