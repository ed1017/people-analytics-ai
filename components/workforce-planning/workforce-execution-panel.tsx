import { ConstraintAwareScheduleSummary } from "@/components/workforce-planning/constraint-aware-schedule-summary";
import { ExecutionResultSummary } from "@/components/workforce-planning/execution-result-summary";

import type {
  BusinessUnitResponseAllocationResponse,
  ConstraintAwareWorkforceScheduleResponse,
  TimePhasedWorkforceExecutionResponse,
  WorkforceResponseConstraintResponse,
} from "@/lib/types";

type ResponseExecutionDraft = {
  id: string;
  org_code: string;
  org_name: string;
  job_profile_code: string;
  job_profile_name: string;
  response_type: "build" | "move" | "buy";
  amount: number;
  effective_month: string;
};

type ResponseConstraintDraft = {
  max_total_build: number | null;
  max_total_move: number | null;
  max_total_buy: number | null;
  max_monthly_build: number | null;
  max_monthly_move: number | null;
  max_monthly_buy: number | null;
  max_monthly_total: number | null;
  deadline_month: string;
  required_coverage_pct_by_deadline: number | null;
  require_all_approved_capacity_scheduled: boolean;
};

type WorkforceExecutionPanelProps = {
  businessUnitResponseResult: BusinessUnitResponseAllocationResponse;
  responseExecutionDrafts: ResponseExecutionDraft[];
  responseExecutionLoading: boolean;
  responseExecutionError: string | null;
  responseExecutionResult: TimePhasedWorkforceExecutionResponse | null;
  constraintAwareScheduleLoading: boolean;
  constraintAwareScheduleError: string | null;
  constraintAwareScheduleResult: ConstraintAwareWorkforceScheduleResponse | null;
  responseConstraintDraft: ResponseConstraintDraft;
  responseConstraintLoading: boolean;
  responseConstraintError: string | null;
  responseConstraintResult: WorkforceResponseConstraintResponse | null;
  resetResponseExecution: () => void;
  runConstraintAwareScheduler: () => void;
  runResponseExecution: () => void;
  updateResponseExecutionDraft: (
    id: string,
    patch: Partial<Pick<ResponseExecutionDraft, "amount" | "effective_month">>
  ) => void;
  addResponseExecutionPhase: (draft: ResponseExecutionDraft) => void;
  removeResponseExecutionPhase: (id: string) => void;
  updateResponseConstraintDraft: (
    key: keyof ResponseConstraintDraft,
    value: number | string | boolean | null
  ) => void;
  resetResponseConstraints: () => void;
  runResponseConstraints: () => void;
};

function nextMonthValue(value: string) {
  const [year, month] = value
    .slice(0, 7)
    .split("-")
    .map(Number);
  const date = new Date(
    Date.UTC(year, month, 1)
  );
  return date.toISOString().slice(0, 7);
}

function formatModeledCount(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 1,
  });
}

function formatAssumptionName(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMonth(value: string) {
  return new Date(value).toLocaleDateString(
    "en-US",
    {
      month: "short",
      year: "numeric",
    }
  );
}

export function WorkforceExecutionPanel({
  businessUnitResponseResult,
  responseExecutionDrafts,
  responseExecutionLoading,
  responseExecutionError,
  responseExecutionResult,
  constraintAwareScheduleLoading,
  constraintAwareScheduleError,
  constraintAwareScheduleResult,
  responseConstraintDraft,
  responseConstraintLoading,
  responseConstraintError,
  responseConstraintResult,
  resetResponseExecution,
  runConstraintAwareScheduler,
  runResponseExecution,
  updateResponseExecutionDraft,
  addResponseExecutionPhase,
  removeResponseExecutionPhase,
  updateResponseConstraintDraft,
  resetResponseConstraints,
  runResponseConstraints,
}: WorkforceExecutionPanelProps) {
  return (
<details
                                        className="mt-4 rounded-md border"
                                        open
                                      >
                                        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                                          Time-Phased Execution
                                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                                            monthly effective capacity
                                          </span>
                                        </summary>
                                        <div className="border-t p-4">
                                          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                                            <p className="max-w-3xl text-xs text-muted-foreground">
                                              Assign explicit effective months to approved BU Build, Move, and Buy capacity. Timing is user-supplied; course duration and historical time-to-fill do not set these dates.
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                              <button
                                                type="button"
                                                onClick={resetResponseExecution}
                                                disabled={
                                                  responseExecutionLoading ||
                                                  constraintAwareScheduleLoading
                                                }
                                                className="rounded-md border px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                                              >
                                                Reset
                                              </button>
                                              <button
                                                type="button"
                                                onClick={runConstraintAwareScheduler}
                                                disabled={constraintAwareScheduleLoading}
                                                className="rounded-md border px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                                              >
                                                {constraintAwareScheduleLoading
                                                  ? "Scheduling..."
                                                  : "Auto Schedule"}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={runResponseExecution}
                                                disabled={responseExecutionLoading}
                                                className="rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
                                              >
                                                {responseExecutionLoading
                                                  ? "Running..."
                                                  : "Run Timeline"}
                                              </button>
                                            </div>
                                          </div>

                                          <div className="mb-3 rounded-md border bg-muted/20 p-3">
                                            <p className="text-[11px] font-medium">
                                              Auto-scheduler limits
                                            </p>
                                            <p className="mt-1 text-[10px] text-muted-foreground">
                                              Optional. Blank monthly caps are unconstrained. These values are shared with the detailed Constraint Feasibility panel below.
                                            </p>
                                            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                              {(
                                                [
                                                  ["max_monthly_build", "Monthly Build"],
                                                  ["max_monthly_move", "Monthly Move"],
                                                  ["max_monthly_buy", "Monthly Buy"],
                                                  ["max_monthly_total", "Combined monthly"],
                                                ] as const
                                              ).map(([key, label]) => (
                                                <label
                                                  key={key}
                                                  className="rounded-md border bg-background p-2"
                                                >
                                                  <span className="text-[10px] text-muted-foreground">
                                                    {label}
                                                  </span>
                                                  <input
                                                    type="number"
                                                    min={0}
                                                    step={0.1}
                                                    placeholder="No cap"
                                                    value={
                                                      responseConstraintDraft[
                                                        key
                                                      ] ?? ""
                                                    }
                                                    onChange={(event) =>
                                                      updateResponseConstraintDraft(
                                                        key,
                                                        event.target.value === ""
                                                          ? null
                                                          : Number(
                                                              event.target.value
                                                            )
                                                      )
                                                    }
                                                    className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-right text-xs tabular-nums"
                                                  />
                                                </label>
                                              ))}
                                            </div>
                                            <div className="mt-2 grid gap-2 md:grid-cols-2">
                                              <label className="rounded-md border bg-background p-2">
                                                <span className="text-[10px] text-muted-foreground">
                                                  Coverage deadline
                                                </span>
                                                <input
                                                  type="month"
                                                  min={nextMonthValue(
                                                    businessUnitResponseResult.as_of
                                                  )}
                                                  value={
                                                    responseConstraintDraft.deadline_month
                                                  }
                                                  onChange={(event) =>
                                                    updateResponseConstraintDraft(
                                                      "deadline_month",
                                                      event.target.value
                                                    )
                                                  }
                                                  className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-xs"
                                                />
                                              </label>
                                              <label className="rounded-md border bg-background p-2">
                                                <span className="text-[10px] text-muted-foreground">
                                                  Required coverage by deadline %
                                                </span>
                                                <input
                                                  type="number"
                                                  min={0}
                                                  max={100}
                                                  step={1}
                                                  placeholder="No target"
                                                  value={
                                                    responseConstraintDraft.required_coverage_pct_by_deadline ??
                                                    ""
                                                  }
                                                  onChange={(event) =>
                                                    updateResponseConstraintDraft(
                                                      "required_coverage_pct_by_deadline",
                                                      event.target.value === ""
                                                        ? null
                                                        : Number(
                                                            event.target.value
                                                          )
                                                    )
                                                  }
                                                  className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-right text-xs tabular-nums"
                                                />
                                              </label>
                                            </div>
                                          </div>

                                          {constraintAwareScheduleError && (
                                            <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                                              {constraintAwareScheduleError}
                                            </div>
                                          )}

                                          {constraintAwareScheduleResult && (
                                            <ConstraintAwareScheduleSummary
                                              result={
                                                constraintAwareScheduleResult
                                              }
                                            />
                                          )}

                                          <div className="max-h-[360px] overflow-auto rounded-md border">
                                            <table className="w-full min-w-[900px] text-xs">
                                              <thead className="sticky top-0 bg-background">
                                                <tr className="border-b text-left text-muted-foreground">
                                                  <th className="p-3">Destination / Role</th>
                                                  <th className="p-3">Path</th>
                                                  <th className="p-3 text-right">Approved</th>
                                                  <th className="p-3 text-right">Phase Amount</th>
                                                  <th className="p-3">Effective Month</th>
                                                  <th className="p-3 text-right">Actions</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {responseExecutionDrafts.map(
                                                  (draft) => {
                                                    const target =
                                                      businessUnitResponseResult.business_units.find(
                                                        (row) =>
                                                          row.org_code ===
                                                            draft.org_code &&
                                                          row.job_profile_code ===
                                                            draft.job_profile_code
                                                      );
                                                    const targetAmount =
                                                      target?.allocation[
                                                        draft.response_type
                                                      ] ?? 0;

                                                    return (
                                                      <tr
                                                        key={draft.id}
                                                        className="border-b last:border-0"
                                                      >
                                                        <td className="p-3">
                                                          <p className="font-medium">
                                                            {draft.org_name}
                                                          </p>
                                                          <p className="text-[10px] text-muted-foreground">
                                                            {draft.job_profile_name}
                                                          </p>
                                                        </td>
                                                        <td className="p-3 font-medium">
                                                          {formatAssumptionName(
                                                            draft.response_type
                                                          )}
                                                        </td>
                                                        <td className="p-3 text-right tabular-nums">
                                                          {formatModeledCount(
                                                            targetAmount
                                                          )}
                                                        </td>
                                                        <td className="p-3">
                                                          <input
                                                            type="number"
                                                            min={0}
                                                            step={1}
                                                            value={draft.amount}
                                                            onChange={(event) =>
                                                              updateResponseExecutionDraft(
                                                                draft.id,
                                                                {
                                                                  amount: Number(
                                                                    event.target.value
                                                                  ),
                                                                }
                                                              )
                                                            }
                                                            className="w-full min-w-[90px] rounded-md border bg-background px-2 py-1.5 text-right tabular-nums"
                                                          />
                                                        </td>
                                                        <td className="p-3">
                                                          <input
                                                            type="month"
                                                            min={nextMonthValue(
                                                              businessUnitResponseResult.as_of
                                                            )}
                                                            value={
                                                              draft.effective_month
                                                            }
                                                            onChange={(event) =>
                                                              updateResponseExecutionDraft(
                                                                draft.id,
                                                                {
                                                                  effective_month:
                                                                    event.target.value,
                                                                }
                                                              )
                                                            }
                                                            className="w-full min-w-[150px] rounded-md border bg-background px-2 py-1.5"
                                                          />
                                                        </td>
                                                        <td className="p-3 text-right">
                                                          <div className="flex justify-end gap-2">
                                                            <button
                                                              type="button"
                                                              onClick={() =>
                                                                addResponseExecutionPhase(
                                                                  draft
                                                                )
                                                              }
                                                              className="rounded-md border px-2 py-1 text-[10px]"
                                                            >
                                                              Add phase
                                                            </button>
                                                            <button
                                                              type="button"
                                                              onClick={() =>
                                                                removeResponseExecutionPhase(
                                                                  draft.id
                                                                )
                                                              }
                                                              className="rounded-md border px-2 py-1 text-[10px]"
                                                            >
                                                              Remove
                                                            </button>
                                                          </div>
                                                        </td>
                                                      </tr>
                                                    );
                                                  }
                                                )}
                                              </tbody>
                                            </table>
                                          </div>

                                          <p className="mt-2 text-[11px] text-muted-foreground">
                                            The first executable month is{" "}
                                            {formatMonth(
                                              nextMonthValue(
                                                businessUnitResponseResult.as_of
                                              ) + "-01"
                                            )}. Leave a phase without a month to keep that approved capacity unscheduled.
                                          </p>

                                          {responseExecutionError && (
                                            <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                                              {responseExecutionError}
                                            </div>
                                          )}

                                          {responseExecutionResult && (
                                            <>
                                              <ExecutionResultSummary
                                                result={
                                                  responseExecutionResult
                                                }
                                              />

                                              <details className="mt-4 rounded-md border">
                                                <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                                                  Constraint Feasibility
                                                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                                                    hard caps + evidence checks
                                                  </span>
                                                </summary>
                                                <div className="border-t p-4">
                                                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                                                    <p className="max-w-3xl text-xs text-muted-foreground">
                                                      Blank caps are unconstrained. Hard feasibility uses only the limits you enter plus schedule-integrity checks. Readiness and recruiting history remain separate evidence signals.
                                                    </p>
                                                    <div className="flex gap-2">
                                                      <button
                                                        type="button"
                                                        onClick={resetResponseConstraints}
                                                        disabled={responseConstraintLoading}
                                                        className="rounded-md border px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                                                      >
                                                        Reset
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={runResponseConstraints}
                                                        disabled={responseConstraintLoading}
                                                        className="rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
                                                      >
                                                        {responseConstraintLoading
                                                          ? "Checking..."
                                                          : "Check Constraints"}
                                                      </button>
                                                    </div>
                                                  </div>

                                                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                                    {(
                                                      [
                                                        ["max_total_build", "Total Build cap"],
                                                        ["max_total_move", "Total Move cap"],
                                                        ["max_total_buy", "Total Buy cap"],
                                                        ["max_monthly_build", "Monthly Build cap"],
                                                        ["max_monthly_move", "Monthly Move cap"],
                                                        ["max_monthly_buy", "Monthly Buy cap"],
                                                        ["max_monthly_total", "Combined monthly cap"],
                                                      ] as const
                                                    ).map(([key, label]) => (
                                                      <label
                                                        key={key}
                                                        className="rounded-md border p-3"
                                                      >
                                                        <span className="text-[11px] text-muted-foreground">
                                                          {label}
                                                        </span>
                                                        <input
                                                          type="number"
                                                          min={0}
                                                          step={1}
                                                          placeholder="No cap"
                                                          value={
                                                            responseConstraintDraft[
                                                              key
                                                            ] ?? ""
                                                          }
                                                          onChange={(event) =>
                                                            updateResponseConstraintDraft(
                                                              key,
                                                              event.target.value === ""
                                                                ? null
                                                                : Number(
                                                                    event.target.value
                                                                  )
                                                            )
                                                          }
                                                          className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-right text-sm tabular-nums"
                                                        />
                                                      </label>
                                                    ))}
                                                  </div>

                                                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                                                    <label className="rounded-md border p-3">
                                                      <span className="text-[11px] text-muted-foreground">
                                                        Coverage deadline
                                                      </span>
                                                      <input
                                                        type="month"
                                                        min={
                                                          responseExecutionResult.planning_start_month
                                                        }
                                                        value={
                                                          responseConstraintDraft.deadline_month
                                                        }
                                                        onChange={(event) =>
                                                          updateResponseConstraintDraft(
                                                            "deadline_month",
                                                            event.target.value
                                                          )
                                                        }
                                                        className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm"
                                                      />
                                                    </label>

                                                    <label className="rounded-md border p-3">
                                                      <span className="text-[11px] text-muted-foreground">
                                                        Required coverage by deadline %
                                                      </span>
                                                      <input
                                                        type="number"
                                                        min={0}
                                                        max={100}
                                                        step={1}
                                                        placeholder="No deadline target"
                                                        value={
                                                          responseConstraintDraft.required_coverage_pct_by_deadline ??
                                                          ""
                                                        }
                                                        onChange={(event) =>
                                                          updateResponseConstraintDraft(
                                                            "required_coverage_pct_by_deadline",
                                                            event.target.value === ""
                                                              ? null
                                                              : Number(
                                                                  event.target.value
                                                                )
                                                          )
                                                        }
                                                        className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-right text-sm tabular-nums"
                                                      />
                                                    </label>
                                                  </div>

                                                  <label className="mt-3 flex items-center gap-2 rounded-md border p-3 text-xs">
                                                    <input
                                                      type="checkbox"
                                                      checked={
                                                        responseConstraintDraft.require_all_approved_capacity_scheduled
                                                      }
                                                      onChange={(event) =>
                                                        updateResponseConstraintDraft(
                                                          "require_all_approved_capacity_scheduled",
                                                          event.target.checked
                                                        )
                                                      }
                                                    />
                                                    Require every approved Build / Move / Buy unit to have an effective month
                                                  </label>

                                                  <p className="mt-3 text-[11px] text-muted-foreground">
                                                    FY2027 budget data is not automatically used here because the execution horizon begins in 2026 and path-specific Build / Move / Buy costs are not modeled as defensible hard constraints.
                                                  </p>

                                                  {responseConstraintError && (
                                                    <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                                                      {responseConstraintError}
                                                    </div>
                                                  )}

                                                  {responseConstraintResult && (
                                                    <>
                                                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                                        <div className="rounded-md border p-3">
                                                          <p className="text-[11px] text-muted-foreground">
                                                            Hard-Constraint Result
                                                          </p>
                                                          <p className="mt-1 text-xl font-semibold">
                                                            {responseConstraintResult.overall_feasible
                                                              ? "Feasible"
                                                              : "Breach"}
                                                          </p>
                                                        </div>
                                                        <div className="rounded-md border p-3">
                                                          <p className="text-[11px] text-muted-foreground">
                                                            Constraints Checked
                                                          </p>
                                                          <p className="mt-1 text-xl font-semibold">
                                                            {responseConstraintResult.hard_constraint_count.toLocaleString()}
                                                          </p>
                                                        </div>
                                                        <div className="rounded-md border p-3">
                                                          <p className="text-[11px] text-muted-foreground">
                                                            Hard Breaches
                                                          </p>
                                                          <p className="mt-1 text-xl font-semibold">
                                                            {responseConstraintResult.hard_constraint_breaches.toLocaleString()}
                                                          </p>
                                                        </div>
                                                      </div>

                                                      <div className="mt-4 overflow-x-auto rounded-md border">
                                                        <table className="w-full min-w-[760px] text-xs">
                                                          <thead>
                                                            <tr className="border-b text-left text-muted-foreground">
                                                              <th className="p-3">Hard Constraint</th>
                                                              <th className="p-3 text-right">Actual</th>
                                                              <th className="p-3 text-right">Limit / Minimum</th>
                                                              <th className="p-3 text-right">Result</th>
                                                            </tr>
                                                          </thead>
                                                          <tbody>
                                                            {responseConstraintResult.hard_constraints.map(
                                                              (row) => (
                                                                <tr
                                                                  key={row.constraint_code}
                                                                  className="border-b last:border-0"
                                                                >
                                                                  <td className="p-3">
                                                                    <p className="font-medium">
                                                                      {row.label}
                                                                    </p>
                                                                    <p className="mt-1 text-[10px] text-muted-foreground">
                                                                      {row.detail}
                                                                    </p>
                                                                  </td>
                                                                  <td className="p-3 text-right tabular-nums">
                                                                    {String(
                                                                      row.actual_value
                                                                    )}
                                                                  </td>
                                                                  <td className="p-3 text-right tabular-nums">
                                                                    {String(
                                                                      row.limit_value
                                                                    )}
                                                                  </td>
                                                                  <td className="p-3 text-right font-medium">
                                                                    {row.passed
                                                                      ? "Pass"
                                                                      : "Breach"}
                                                                  </td>
                                                                </tr>
                                                              )
                                                            )}
                                                          </tbody>
                                                        </table>
                                                      </div>

                                                      {responseConstraintResult.evidence_checks.length >
                                                        0 && (
                                                        <div className="mt-4 overflow-x-auto rounded-md border">
                                                          <table className="w-full min-w-[900px] text-xs">
                                                            <thead>
                                                              <tr className="border-b text-left text-muted-foreground">
                                                                <th className="p-3">Role Evidence</th>
                                                                <th className="p-3 text-right">Build Target</th>
                                                                <th className="p-3 text-right">Path-Covered Near-Ready</th>
                                                                <th className="p-3 text-right">Move Target</th>
                                                                <th className="p-3 text-right">Role-Ready</th>
                                                                <th className="p-3 text-right">Buy Target</th>
                                                                <th className="p-3 text-right">12M External Fills</th>
                                                              </tr>
                                                            </thead>
                                                            <tbody>
                                                              {responseConstraintResult.evidence_checks.map(
                                                                (row) => (
                                                                  <tr
                                                                    key={
                                                                      row.job_profile_code
                                                                    }
                                                                    className="border-b last:border-0"
                                                                  >
                                                                    <td className="p-3 font-medium">
                                                                      {row.job_profile_name}
                                                                    </td>
                                                                    <td className="p-3 text-right tabular-nums">
                                                                      {formatModeledCount(
                                                                        row.build_target
                                                                      )}
                                                                    </td>
                                                                    <td className="p-3 text-right tabular-nums">
                                                                      {row.fully_pathway_covered_near_ready.toLocaleString()}
                                                                      {row.build_exceeds_current_path_covered
                                                                        ? " *"
                                                                        : ""}
                                                                    </td>
                                                                    <td className="p-3 text-right tabular-nums">
                                                                      {formatModeledCount(
                                                                        row.move_target
                                                                      )}
                                                                    </td>
                                                                    <td className="p-3 text-right tabular-nums">
                                                                      {row.role_ready_internal_candidates.toLocaleString()}
                                                                      {row.move_exceeds_role_ready
                                                                        ? " *"
                                                                        : ""}
                                                                    </td>
                                                                    <td className="p-3 text-right tabular-nums">
                                                                      {formatModeledCount(
                                                                        row.buy_target
                                                                      )}
                                                                    </td>
                                                                    <td className="p-3 text-right tabular-nums">
                                                                      {row.recent_12m_external_fills.toLocaleString()}
                                                                    </td>
                                                                  </tr>
                                                                )
                                                              )}
                                                            </tbody>
                                                          </table>
                                                        </div>
                                                      )}

                                                      <p className="mt-3 text-[11px] text-muted-foreground">
                                                        * Evidence target exceeds currently observed support. Evidence warnings do not make the hard-constraint plan infeasible unless you also set a numeric cap.
                                                      </p>
                                                    </>
                                                  )}
                                                </div>
                                              </details>
                                            </>
                                          )}
                                        </div>
                                      </details>
  );
}
