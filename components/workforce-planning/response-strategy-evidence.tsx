import type {
  StructuralPositionScenarioResponse,
} from "@/lib/types";

type ResponseStrategyEvidenceProps = {
  responseStrategy:
    StructuralPositionScenarioResponse["response_strategy"];
};

function formatCount(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 1,
  });
}

export function ResponseStrategyEvidence({
  responseStrategy,
}: ResponseStrategyEvidenceProps) {
  return (
    <div className="mt-4 rounded-md border p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h5 className="font-semibold">
            Workforce Response Options
          </h5>
          <p className="text-sm text-muted-foreground">
            Evidence for Build, Move, Buy, Borrow, and Automate against scenario-widened skill gaps.
          </p>
        </div>
        <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
          {responseStrategy.skills_evaluated} skills evaluated
        </span>
      </div>
      {responseStrategy.provenance && <p className="mb-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">{responseStrategy.provenance} Skill presence and career preferences do not establish assessed readiness or available movers.</p>}
      {responseStrategy.skills.length > 0 ? (
        <>
          <div className="mb-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
            These are evidence signals, not an optimized recommendation. Learning and mobility counts can overlap across skills. Borrow is unavailable until contingent-worker data is loaded; Automate is not modeled without a role/task automation signal.
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4">
                    Skill
                  </th>
                  <th className="pb-3 px-3 text-right">
                    Gap
                  </th>
                  <th className="pb-3 px-3">
                    Build
                  </th>
                  <th className="pb-3 px-3">
                    Move
                  </th>
                  <th className="pb-3 px-3">
                    Buy
                  </th>
                  <th className="pb-3 px-3">
                    Borrow
                  </th>
                  <th className="pb-3 pl-3">
                    Automate
                  </th>
                </tr>
              </thead>
              <tbody>
                {responseStrategy.skills.map(
                  (row) => (
                    <tr
                      key={row.skill_code}
                      className="border-b align-top last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <p className="font-medium">
                          {row.skill_name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {row.skill_category} · demand{" "}
                          {row.authorized_demand_delta >
                          0
                            ? "+"
                            : ""}
                          {formatCount(
                            row.authorized_demand_delta
                          )}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right font-medium tabular-nums">
                        {formatCount(
                          row.modeled_position_gap
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {row.build.pathway_available ? (
                          <>
                            <p className="font-medium">
                              {row.build.active_course_count} active{" "}
                              {row.build.active_course_count ===
                              1
                                ? "course"
                                : "courses"}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {row.build.in_progress_learners.toLocaleString()} in progress ·{" "}
                              {row.build.enrolled_learners.toLocaleString()} enrolled
                              {row.build.avg_course_duration_hours !==
                              null
                                ? " · " +
                                  row.build.avg_course_duration_hours.toFixed(
                                    1
                                  ) +
                                  "h avg"
                                : ""}
                            </p>
                          </>
                        ) : (
                          <p className="text-muted-foreground">
                            No active course
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {row.move.evidence_available ? (
                          <>
                            <p className="font-medium">
                              {row.move.mobility_candidates.toLocaleString()} {responseStrategy.provenance ? "preference matches" : "candidates"}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Hold skill + preference toward another profile requiring it
                            </p>
                          </>
                        ) : (
                          <p className="text-muted-foreground">
                            No matched mobility signal
                          </p>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {row.buy.evidence_available ? (
                          <>
                            <p className="font-medium">
                              {formatCount(
                                row.buy.active_recruiting_demand
                              )} active demand
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {row.buy.median_time_to_fill_days !==
                              null
                                ? row.buy.median_time_to_fill_days.toFixed(
                                    0
                                  ) +
                                  "d median TTF"
                                : "TTF unavailable"}{" "}
                              ·{" "}
                              {row.buy.historical_filled_requisitions.toLocaleString()} historical fills
                            </p>
                          </>
                        ) : (
                          <p className="text-muted-foreground">
                            No hiring history
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {row.borrow.data_available ? (
                          <>
                            <p className="font-medium">
                              {row.borrow.active_contingent_workers.toLocaleString()} active
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {row.borrow.avg_active_bill_rate !==
                              null
                                ? "$" +
                                  row.borrow.avg_active_bill_rate.toFixed(
                                    0
                                  ) +
                                  " avg bill rate"
                                : "Bill rate unavailable"}
                            </p>
                          </>
                        ) : (
                          <p className="text-muted-foreground">
                            No contingent data
                          </p>
                        )}
                      </td>

                      <td className="py-3 pl-3 text-muted-foreground">
                        Not modeled
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          This scenario does not create or widen a positive authorized-position skill gap, so no new response-strategy evidence is required.
        </p>
      )}
    </div>
  );
}
