import type {
  ConstraintAwareWorkforceScheduleResponse,
} from "@/lib/types";

type ConstraintAwareScheduleSummaryProps = {
  result: ConstraintAwareWorkforceScheduleResponse;
};

function formatMonth(value: string) {
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
            {result.hard_constraint_feasible ===
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
