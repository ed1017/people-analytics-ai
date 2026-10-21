import { ConstructedResponseFeasibilitySummary } from "./constructed-response-feasibility";
import type { Dispatch, SetStateAction } from "react";

import type {
  StructuralPositionScenarioResponse,
  WorkforceResponsePlanAllocation,
  WorkforceResponsePlanResponse,
} from "@/lib/types";

type SkillWorkforceResponsePlanProps = {
  scenario: StructuralPositionScenarioResponse;
  responsePlanSkill: string;
  setResponsePlanSkill: Dispatch<SetStateAction<string>>;
  responsePlanAllocation: WorkforceResponsePlanAllocation;
  setResponsePlanAllocation: Dispatch<
    SetStateAction<WorkforceResponsePlanAllocation>
  >;
  responsePlanResult: WorkforceResponsePlanResponse | null;
  setResponsePlanResult: Dispatch<
    SetStateAction<WorkforceResponsePlanResponse | null>
  >;
  responsePlanLoading: boolean;
  responsePlanError: string | null;
  setResponsePlanError: Dispatch<SetStateAction<string | null>>;
  resetResponsePlan: () => void;
  runResponsePlan: () => void | Promise<void>;
};

function createResponsePlanAllocation(): WorkforceResponsePlanAllocation {
  return {
    build: 0,
    move: 0,
    buy: 0,
    borrow: 0,
    automate: 0,
  };
}

function formatModeledCount(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 1,
  });
}

export function SkillWorkforceResponsePlan({
  scenario,
  responsePlanSkill,
  setResponsePlanSkill,
  responsePlanAllocation,
  setResponsePlanAllocation,
  responsePlanResult,
  setResponsePlanResult,
  responsePlanLoading,
  responsePlanError,
  setResponsePlanError,
  resetResponsePlan,
  runResponsePlan,
}: SkillWorkforceResponsePlanProps) {
  const structuralPositionResult = scenario;

  return (
    <>
      {structuralPositionResult.response_strategy.skills.length >
                              0 && (
                              <div
                                className="mt-4 rounded-md border p-4"
                              >
                                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <h5 className="font-semibold">
                                      Workforce Response Plan
                                    </h5>
                                    <p className="text-sm text-muted-foreground">
                                      Allocate one modeled skill gap across explicit Build, Move, and Buy targets.
                                    </p>
                                  </div>

                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={resetResponsePlan}
                                      disabled={responsePlanLoading}
                                      className="rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      Reset
                                    </button>
                                    <button
                                      type="button"
                                      onClick={runResponsePlan}
                                      disabled={
                                        !responsePlanSkill ||
                                        responsePlanLoading
                                      }
                                      className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {responsePlanLoading
                                        ? "Running…"
                                        : "Run Response Plan"}
                                    </button>
                                  </div>
                                </div>

                                <div className="mb-4 grid gap-3 lg:grid-cols-[1.4fr_repeat(5,minmax(120px,1fr))]">
                                  <label className="rounded-md border p-3">
                                    <span className="text-[11px] text-muted-foreground">
                                      Skill Gap
                                    </span>
                                    <select
                                      value={responsePlanSkill}
                                      onChange={(event) => {
                                        setResponsePlanSkill(
                                          event.target.value
                                        );
                                        setResponsePlanAllocation(
                                          createResponsePlanAllocation()
                                        );
                                        setResponsePlanResult(null);
                                        setResponsePlanError(null);
                                      }}
                                      className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm"
                                    >
                                      {structuralPositionResult.response_strategy.skills.map(
                                        (row) => (
                                          <option
                                            key={row.skill_code}
                                            value={row.skill_code}
                                          >
                                            {row.skill_name +
                                              " · gap " +
                                              formatModeledCount(
                                                row.modeled_position_gap
                                              )}
                                          </option>
                                        )
                                      )}
                                    </select>
                                  </label>

                                  {(
                                    [
                                      ["build", "Build"],
                                      ["move", "Move"],
                                      ["buy", "Buy"],
                                      ["borrow", "Borrow"],
                                      ["automate", "Automate"],
                                    ] as const
                                  ).map(([key, label]) => {
                                    const selectedSkill =
                                      structuralPositionResult.response_strategy.skills.find(
                                        (row) =>
                                          row.skill_code ===
                                          responsePlanSkill
                                      );
                                    const disabled =
                                      (key === "borrow" &&
                                        !selectedSkill?.borrow
                                          .data_available) ||
                                      (key === "automate" &&
                                        !selectedSkill?.automate
                                          .data_available);

                                    return (
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
                                          disabled={disabled}
                                          value={
                                            responsePlanAllocation[
                                              key
                                            ]
                                          }
                                          onChange={(event) => {
                                            setResponsePlanAllocation(
                                              (current) => ({
                                                ...current,
                                                [key]: Number(
                                                  event.target
                                                    .value
                                                ),
                                              })
                                            );
                                            setResponsePlanResult(
                                              null
                                            );
                                            setResponsePlanError(
                                              null
                                            );
                                          }}
                                          className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-right text-sm tabular-nums disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                        {disabled && (
                                          <p className="mt-1 text-[10px] text-muted-foreground">
                                            No supporting data
                                          </p>
                                        )}
                                      </label>
                                    );
                                  })}
                                </div>

                                <div className="mb-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                                  This is a user-directed plan, not an optimizer. Planned coverage assumes each executed action closes one unit of this selected skill gap. Do not sum separate skill plans as unique people because one person or role can satisfy multiple skills.
                                </div>

                                {responsePlanError && (
                                  <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                                    {responsePlanError}
                                  </div>
                                )}

                                {responsePlanResult && (
                                  <>
                                    <ConstructedResponseFeasibilitySummary data={responsePlanResult.capacity_feasibility} />
                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                      <div className="rounded-md border p-3">
                                        <p className="text-xs text-muted-foreground">
                                          Modeled Gap
                                        </p>
                                        <p className="mt-1 text-2xl font-semibold">
                                          {formatModeledCount(
                                            responsePlanResult.modeled_position_gap
                                          )}
                                        </p>
                                      </div>
                                      <div className="rounded-md border p-3">
                                        <p className="text-xs text-muted-foreground">
                                          Planned Coverage
                                        </p>
                                        <p className="mt-1 text-2xl font-semibold">
                                          {formatModeledCount(
                                            responsePlanResult.planned_coverage_if_executed
                                          )}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {responsePlanResult.coverage_pct_if_executed.toFixed(
                                            1
                                          )}
                                          % if executed
                                        </p>
                                      </div>
                                      <div className="rounded-md border p-3">
                                        <p className="text-xs text-muted-foreground">
                                          Remaining Gap
                                        </p>
                                        <p className="mt-1 text-2xl font-semibold">
                                          {formatModeledCount(
                                            responsePlanResult.remaining_gap_if_executed
                                          )}
                                        </p>
                                      </div>
                                      <div className="rounded-md border p-3">
                                        <p className="text-xs text-muted-foreground">
                                          Overplanned
                                        </p>
                                        <p className="mt-1 text-2xl font-semibold">
                                          {formatModeledCount(
                                            responsePlanResult.overplanned_capacity
                                          )}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                                      <div className="rounded-md border p-3 text-sm">
                                        <p className="font-medium">
                                          Build evidence
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                          {responsePlanResult.evidence.build
                                            .pathway_available
                                            ? responsePlanResult.evidence.build.active_course_count.toLocaleString() +
                                              " active course(s) · " +
                                              responsePlanResult.evidence.build.in_progress_learners.toLocaleString() +
                                              " in progress · " +
                                              responsePlanResult.evidence.build.enrolled_learners.toLocaleString() +
                                              " enrolled"
                                            : "No active learning pathway in loaded data"}
                                        </p>
                                      </div>
                                      <div className="rounded-md border p-3 text-sm">
                                        <p className="font-medium">
                                          Move evidence
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                          {responsePlanResult.evidence.move.mobility_candidates.toLocaleString()}{" "}
                                          {responsePlanResult.capacity_feasibility ? "recorded preference matches; assessed readiness and available movers are unknown" : "mobility candidates; not confirmed availability"}
                                        </p>
                                      </div>
                                      <div className="rounded-md border p-3 text-sm">
                                        <p className="font-medium">
                                          Buy evidence
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                          {formatModeledCount(
                                            responsePlanResult.evidence.buy.active_recruiting_demand
                                          )}{" "}
                                          active demand
                                          {responsePlanResult.evidence.buy
                                            .median_time_to_fill_days !==
                                          null
                                            ? " · " +
                                              responsePlanResult.evidence.buy.median_time_to_fill_days.toFixed(
                                                0
                                              ) +
                                              "d historical median TTF"
                                            : ""}
                                        </p>
                                      </div>
                                    </div>

                                    {responsePlanResult.warnings.length >
                                      0 && (
                                      <div className="mt-4 rounded-md border p-3">
                                        <p className="text-xs font-medium">
                                          Plan warnings
                                        </p>
                                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                          {responsePlanResult.warnings.map(
                                            (warning) => (
                                              <li key={warning}>
                                                • {warning}
                                              </li>
                                            )
                                          )}
                                        </ul>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
    </>
  );
}
