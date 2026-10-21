import {
  formatCapacity,
  formatPercent,
} from "@/lib/display-format";
import { ConstructedResponseFeasibilitySummary } from "./constructed-response-feasibility";
import type {
  TimePhasedWorkforceExecutionResponse,
} from "@/lib/types";

type ExecutionResultSummaryProps = {
  result: TimePhasedWorkforceExecutionResponse;
};

function formatMonth(value: string | null) {
  if (value === null) return "Unknown";
  return new Date(
    value + "-01T00:00:00"
  ).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function ExecutionResultSummary({
  result,
}: ExecutionResultSummaryProps) {
  return (
    <>
      <ConstructedResponseFeasibilitySummary data={result.capacity_feasibility} />
      {result.capacity_feasibility && <p className="text-xs text-muted-foreground">Timeline values are conditional on the entered effective dates. Confirmed completion and execution cost remain unknown.</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border p-3">
          <p className="text-[11px] text-muted-foreground">
            Execution Window
          </p>
          <p className="mt-1 font-semibold">
            {formatMonth(
              result.planning_start_month
            )}{" "}
            →{" "}
            {formatMonth(
              result.planning_end_month
            )}
          </p>
        </div>
        <div className="rounded-md border p-3">
          <p
            className="text-[11px] text-muted-foreground"
            title="Modeled execution capacity can be fractional; display precision does not change the underlying schedule."
          >
            Scheduled B / M / B capacity
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {formatCapacity(
              result.scheduled_allocation.build
            )}{" "}
            /{" "}
            {formatCapacity(
              result.scheduled_allocation.move
            )}{" "}
            /{" "}
            {formatCapacity(
              result.scheduled_allocation.buy
            )}
          </p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-[11px] text-muted-foreground">
            Unscheduled B / M / B capacity
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {formatCapacity(
              result.unscheduled_allocation.build
            )}{" "}
            /{" "}
            {formatCapacity(
              result.unscheduled_allocation.move
            )}{" "}
            /{" "}
            {formatCapacity(
              result.unscheduled_allocation.buy
            )}
          </p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-[11px] text-muted-foreground">
            Final Remaining Net Gap
          </p>
          <p className="mt-1 text-xl font-semibold">
            {formatCapacity(
              result.final_remaining_net_gap
            )}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {formatPercent(
              result.final_coverage_pct
            )} coverage
          </p>
        </div>
      </div>

      <div className="mt-4 max-h-[360px] overflow-auto rounded-md border">
        <table className="w-full min-w-[820px] text-xs">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-3">
                Month
              </th>
              <th className="p-3 text-right">
                Effective Build
              </th>
              <th className="p-3 text-right">
                Effective Move
              </th>
              <th className="p-3 text-right">
                Effective Buy
              </th>
              <th className="p-3 text-right">
                Cumulative Coverage
              </th>
              <th className="p-3 text-right">
                Remaining Gap
              </th>
              <th className="p-3 text-right">
                Coverage %
              </th>
            </tr>
          </thead>
          <tbody>
            {result.timeline.map((point) => (
              <tr
                key={point.month}
                className="border-b last:border-0"
              >
                <td className="p-3 font-medium">
                  {formatMonth(point.month)}
                </td>
                <td className="p-3 text-right tabular-nums">
                  {formatCapacity(
                    point.effective_build
                  )}
                </td>
                <td className="p-3 text-right tabular-nums">
                  {formatCapacity(
                    point.effective_move
                  )}
                </td>
                <td className="p-3 text-right tabular-nums">
                  {formatCapacity(
                    point.effective_buy
                  )}
                </td>
                <td className="p-3 text-right font-medium tabular-nums">
                  {formatCapacity(
                    point.cumulative_effective_coverage
                  )}
                </td>
                <td className="p-3 text-right font-medium tabular-nums">
                  {formatCapacity(
                    point.remaining_net_gap
                  )}
                </td>
                <td className="p-3 text-right tabular-nums">
                  {formatPercent(
                    point.coverage_pct
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.warnings.length > 0 && (
        <div className="mt-3 rounded-md border p-3">
          <p className="text-xs font-medium">
            Execution warnings
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
    </>
  );
}
