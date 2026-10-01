import type { Dispatch, SetStateAction } from "react";

import { RoleResponseEvidenceSummary } from "./role-response-evidence-summary";
import { TalentResponseEvidence } from "./talent-response-evidence";
import type {
  RoleWorkforceResponsePlanResponse,
  StructuralPositionScenarioResponse,
  WorkforceResponsePlanAllocation,
} from "@/lib/types";

type RoleWorkforceResponsePlanProps = {
  evidenceGoal?: string;
  scenario: StructuralPositionScenarioResponse;
  roleResponsePlanProfile: string;
  setRoleResponsePlanProfile: Dispatch<SetStateAction<string>>;
  roleResponsePlanAllocation: WorkforceResponsePlanAllocation;
  setRoleResponsePlanAllocation: Dispatch<
    SetStateAction<WorkforceResponsePlanAllocation>
  >;
  roleResponsePlanResult: RoleWorkforceResponsePlanResponse | null;
  setRoleResponsePlanResult: Dispatch<
    SetStateAction<RoleWorkforceResponsePlanResponse | null>
  >;
  roleResponsePlanLoading: boolean;
  roleResponsePlanError: string | null;
  setRoleResponsePlanError: Dispatch<SetStateAction<string | null>>;
  resetRoleResponsePlan: () => void;
  runRoleResponsePlan: () => void | Promise<void>;
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

export function RoleWorkforceResponsePlan({
  evidenceGoal,
  scenario,
  roleResponsePlanProfile,
  setRoleResponsePlanProfile,
  roleResponsePlanAllocation,
  setRoleResponsePlanAllocation,
  roleResponsePlanResult,
  setRoleResponsePlanResult,
  roleResponsePlanLoading,
  roleResponsePlanError,
  setRoleResponsePlanError,
  resetRoleResponsePlan,
  runRoleResponsePlan,
}: RoleWorkforceResponsePlanProps) {
  const structuralPositionResult = scenario;

  return (
    <>
      {structuralPositionResult.job_profile_impact.some(
                              (row) =>
                                row.authorized_position_delta > 0
                            ) && (
                              <div
                                className="mt-4 rounded-md border p-4"
                              >
                                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <h5 className="font-semibold">
                                      Role Workforce Response Plan
                                    </h5>
                                    <p className="text-sm text-muted-foreground">
                                      Plan Build, Move, and Buy in role units across the full governed skill bundle without double-counting the same role across skills.
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={resetRoleResponsePlan}
                                      disabled={roleResponsePlanLoading}
                                      className="rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      Reset
                                    </button>
                                    <button
                                      type="button"
                                      onClick={runRoleResponsePlan}
                                      disabled={
                                        !roleResponsePlanProfile ||
                                        roleResponsePlanLoading
                                      }
                                      className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {roleResponsePlanLoading
                                        ? "Running..."
                                        : "Run Role Plan"}
                                    </button>
                                  </div>
                                </div>

                                <div className="mb-4 grid gap-3 lg:grid-cols-[1.6fr_repeat(3,minmax(130px,1fr))]">
                                  <label className="rounded-md border p-3">
                                    <span
                                      className="cursor-help border-b border-dotted text-[11px] text-muted-foreground"
                                      title="Only job profiles with positive scenario-created authorized-position demand are available."
                                    >
                                      Job Profile
                                    </span>
                                    <select
                                      value={roleResponsePlanProfile}
                                      onChange={(event) => {
                                        setRoleResponsePlanProfile(
                                          event.target.value
                                        );
                                        setRoleResponsePlanAllocation(
                                          createResponsePlanAllocation()
                                        );
                                        setRoleResponsePlanResult(null);
                                        setRoleResponsePlanError(null);
                                      }}
                                      className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm"
                                    >
                                      {structuralPositionResult.job_profile_impact
                                        .filter(
                                          (row) =>
                                            row.authorized_position_delta > 0
                                        )
                                        .map((row) => (
                                          <option
                                            key={row.job_profile_code}
                                            value={row.job_profile_code}
                                          >
                                            {row.job_profile_name +
                                              " - demand +" +
                                              formatModeledCount(
                                                row.authorized_position_delta
                                              )}
                                          </option>
                                        ))}
                                    </select>
                                  </label>

                                  {(
                                    [
                                      ["build", "Build"],
                                      ["move", "Move"],
                                      ["buy", "Buy"],
                                    ] as const
                                  ).map(([key, label]) => (
                                    <label
                                      key={key}
                                      className="rounded-md border p-3"
                                    >
                                      <span className="text-[11px] text-muted-foreground">
                                        {label} roles
                                      </span>
                                      <input
                                        type="number"
                                        min={0}
                                        step={1}
                                        value={
                                          roleResponsePlanAllocation[
                                            key
                                          ]
                                        }
                                        onChange={(event) => {
                                          setRoleResponsePlanAllocation(
                                            (current) => ({
                                              ...current,
                                              [key]: Number(
                                                event.target.value
                                              ),
                                            })
                                          );
                                          setRoleResponsePlanResult(null);
                                          setRoleResponsePlanError(null);
                                        }}
                                        className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-right text-sm tabular-nums"
                                      />
                                    </label>
                                  ))}
                                </div>

                                <div className="mb-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                                  One planned role unit is counted once across the entire required-skill bundle. Skill-level learning, mobility, and hiring signals are evidence only and are never summed as unique people.
                                </div>

                                {roleResponsePlanError && (
                                  <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                                    {roleResponsePlanError}
                                  </div>
                                )}

                                <TalentResponseEvidence
                                  key={`${roleResponsePlanProfile}:${evidenceGoal ?? ""}`}
                                  roleCode={roleResponsePlanProfile}
                                  roleName={scenario.job_profile_impact.find((row) => row.job_profile_code === roleResponsePlanProfile)?.job_profile_name ?? ""}
                                  initialGoal={evidenceGoal}
                                  rolePlan={roleResponsePlanResult}
                                />

                                {roleResponsePlanResult && (
                                  <RoleResponseEvidenceSummary
                                    result={roleResponsePlanResult}
                                  />
                                )}
                              </div>
                            )}
    </>
  );
}
