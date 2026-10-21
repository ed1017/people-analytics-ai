import type {
  ConstraintAwareWorkforceScheduleResponse,
} from "@/lib/types";
import { ConstructedResponseFeasibilitySummary } from "./constructed-response-feasibility";

type ConstraintAwareScheduleSummaryProps = {
  result: ConstraintAwareWorkforceScheduleResponse;
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

export function ConstraintAwareScheduleSummary({
  result,
}: ConstraintAwareScheduleSummaryProps) {
  return (
    <div className="mb-3 rounded-md border p-3">
      <ConstructedResponseFeasibilitySummary data={result.capacity_feasibility} />
      {result.capacity_feasibility && <p className="mb-2 text-xs">{result.status === "needs_assumptions" ? "Scheduling assumptions are incomplete. No dates were generated; entered schedule drafts are retained." : result.status === "no_allocation" ? "There is no response allocation to schedule. No completion dates are generated." : "Generated dates are conditional on explicit delivery assumptions. No staffing or completion date is confirmed."}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-[10px] text-muted-foreground">
            Fully Scheduled
          </p>
          <p className="mt-1 font-semibold">
            {result.fully_scheduled
              ? "Yes"
              : "No"}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">
            Hard Constraints
          </p>
          <p className="mt-1 font-semibold">
            {result.capacity_feasibility ? result.user_constraints_satisfied === null ? "Not checked" : result.user_constraints_satisfied ? "Assumptions meet limits" : "Assumption breach" : result.hard_constraint_feasible ===
            null
              ? "Not checked"
              : result.hard_constraint_feasible
                ? "Feasible"
                : "Breach"}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">
            Generated Window
          </p>
          <p className="mt-1 font-semibold">
            {formatMonth(
              result.scheduling_start_month
            )}{" "}
            →{" "}
            {formatMonth(
              result.scheduling_end_month
            )}
          </p>
        </div>
      </div>

      {result.blockers.length > 0 && (
        <ul className="mt-3 space-y-1 text-[10px] text-muted-foreground">
          {result.blockers.map((blocker) => (
            <li key={blocker}>
              - {blocker}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
