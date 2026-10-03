import type {
  RoleWorkforceResponsePlanResponse,
} from "@/lib/types";

type RoleResponseEvidenceSummaryProps = {
  result: RoleWorkforceResponsePlanResponse;
};

function formatCount(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 1,
  });
}

export function RoleResponseEvidenceSummary({
  result,
}: RoleResponseEvidenceSummaryProps) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">
            Scenario Role Demand
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {formatCount(
              result.scenario_created_role_demand
            )}
          </p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">
            Planned Coverage
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {formatCount(
              result.planned_role_coverage_if_executed
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {result.coverage_pct_if_executed.toFixed(
              1
            )}% if executed
          </p>
        </div>

        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">
            Remaining Role Gap
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {formatCount(
              result.remaining_role_gap_if_executed
            )}
          </p>
        </div>

        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">
            Required Skills
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {result.evidence_summary.required_skill_count.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            {result.evidence_summary.skills_with_build_pathway} build pathways
          </p>
        </div>
      </div>
      <div className="mt-4 rounded-md border p-4">
        <div className="mb-3">
          <p className="font-medium">
            Internal Talent Readiness
          </p>
          <p className="text-xs text-muted-foreground">
            Active employees who prefer this role, excluding employees already in it. Readiness is evaluated across every required skill and proficiency threshold.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border p-3">
            <p
              className="cursor-help border-b border-dotted text-xs text-muted-foreground"
              title="Active employees who prefer the target profile and are not already incumbent in it."
            >
              Eligible Internal Pool
            </p>
            <p className="mt-1 text-xl font-semibold">
              {result.internal_talent_readiness.candidate_pool.eligible_internal_candidates.toLocaleString()}
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p
              className="cursor-help border-b border-dotted text-xs text-muted-foreground"
              title="Meets or exceeds the required proficiency for every required skill in the target job profile."
            >
              Role-ready
            </p>
            <p className="mt-1 text-xl font-semibold">
              {result.internal_talent_readiness.candidate_pool.role_ready.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {result.internal_talent_readiness.candidate_pool.role_ready_pct.toFixed(
                1
              )}% of eligible pool
            </p>
          </div>

          <div className="rounded-md border p-3">
            <p
              className="cursor-help border-b border-dotted text-xs text-muted-foreground"
              title="Misses no more than two required skills and has no more than two total proficiency points of shortfall."
            >
              Near-ready
            </p>
            <p className="mt-1 text-xl font-semibold">
              {result.internal_talent_readiness.candidate_pool.near_ready.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              Build-development pool
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p
              className="cursor-help border-b border-dotted text-xs text-muted-foreground"
              title="Interested internal candidates who need more development than the near-ready threshold."
            >
              Longer-term
            </p>
            <p className="mt-1 text-xl font-semibold">
              {result.internal_talent_readiness.candidate_pool.longer_term.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              Development beyond near-ready
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-md border bg-muted/20 p-3">
          <div className="mb-2">
            <p className="text-xs font-medium">
              Development pathway coverage
            </p>
            <p className="text-[11px] text-muted-foreground">
              Checks whether each near-ready candidate&apos;s current required-skill gaps have active mapped learning courses. Course availability does not guarantee proficiency gain.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border bg-background p-2">
              <p className="text-[10px] text-muted-foreground">
                Fully path-covered
              </p>
              <p className="mt-1 font-semibold tabular-nums">
                {result.internal_talent_readiness.development_pathway_coverage.fully_pathway_covered_candidates.toLocaleString()}
              </p>
            </div>
            <div className="rounded-md border bg-background p-2">
              <p className="text-[10px] text-muted-foreground">
                Partial pathway
              </p>
              <p className="mt-1 font-semibold tabular-nums">
                {result.internal_talent_readiness.development_pathway_coverage.partially_pathway_covered_candidates.toLocaleString()}
              </p>
            </div>
            <div className="rounded-md border bg-background p-2">
              <p className="text-[10px] text-muted-foreground">
                No active pathway
              </p>
              <p className="mt-1 font-semibold tabular-nums">
                {result.internal_talent_readiness.development_pathway_coverage.no_active_pathway_candidates.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        {result.internal_talent_readiness.top_near_ready_skill_gaps.length >
          0 && (
          <div className="mt-4 border-t pt-4">
            <p className="text-xs font-medium">
              Most common near-ready gaps
            </p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {result.internal_talent_readiness.top_near_ready_skill_gaps.map(
                (gap) => (
                  <div
                    key={gap.skill_code}
                    className="rounded-md border px-3 py-2 text-xs"
                  >
                    <span className="font-medium">
                      {gap.skill_name}
                    </span>
                    <span className="text-muted-foreground">
                      {" · "}
                      {gap.candidates_below_requirement} candidate(s) · avg shortfall{" "}
                      {gap.avg_proficiency_shortfall.toFixed(
                        1
                      )}
                    </span>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {gap.active_course_count > 0
                        ? `${gap.active_course_count} active course(s)${
                            gap.shortest_active_course_hours !==
                            null
                              ? ` · shortest ${gap.shortest_active_course_hours.toFixed(
                                  1
                                )}h`
                              : ""
                          }`
                        : "No active mapped learning course"}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        <p className="mt-3 text-[11px] text-muted-foreground">
          Aggregate planning signal only. Missing skill records mean no demonstrated proficiency in the loaded data; they do not prove an employee lacks the skill. No individual employees are exposed or ranked.
        </p>
      </div>
      <div className="mt-4 rounded-md border p-4">
        <div className="mb-3">
          <p className="font-medium">
            External Recruiting Feasibility
          </p>
          <p className="text-xs text-muted-foreground">
            Whole-role ATS evidence for Buy. Current pipeline is context only; historical recruiting performance is not a forecast.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">
              Open Requisitions
            </p>
            <p className="mt-1 text-xl font-semibold">
              {result.external_recruiting_feasibility.current_pipeline.open_requisitions.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {result.external_recruiting_feasibility.current_pipeline.applicants.toLocaleString()} applicants ·{" "}
              {result.external_recruiting_feasibility.current_pipeline.advanced_candidates.toLocaleString()} advanced
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">
              External Fills · 12M
            </p>
            <p className="mt-1 text-xl font-semibold">
              {result.external_recruiting_feasibility.historical_external.recent_12m_filled_requisitions.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Peak{" "}
              {result.external_recruiting_feasibility.historical_external.recent_12m_peak_monthly_fills.toLocaleString()}{" "}
              in one month
            </p>
          </div>

          <div className="rounded-md border p-3">
            <p
              className="cursor-help border-b border-dotted text-xs text-muted-foreground"
              title="Historical median across completed external requisitions. This is not a forecast."
            >
              Historical Median TTF
            </p>
            <p className="mt-1 text-xl font-semibold">
              {result.external_recruiting_feasibility.historical_external.median_time_to_fill_days ===
              null
                ? "—"
                : result.external_recruiting_feasibility.historical_external.median_time_to_fill_days.toFixed(
                    0
                  ) + "d"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {result.external_recruiting_feasibility.historical_external.offer_acceptance_rate_pct ===
              null
                ? "Offer acceptance unavailable"
                : result.external_recruiting_feasibility.historical_external.offer_acceptance_rate_pct.toFixed(
                    1
                  ) + "% offer acceptance"}
            </p>
          </div>

          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">
              Buy Scale vs 12M
            </p>
            <p className="mt-1 text-xl font-semibold">
              {result.external_recruiting_feasibility.requested_buy <=
              0
                ? "—"
                : result.external_recruiting_feasibility.buy_scale.pct_of_recent_12m_external_fills ===
                    null
                  ? "No history"
                  : result.external_recruiting_feasibility.buy_scale.pct_of_recent_12m_external_fills.toFixed(
                      1
                    ) + "%"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {result.external_recruiting_feasibility.requested_buy <=
              0
                ? "No Buy target entered"
                : result.external_recruiting_feasibility.requested_buy.toLocaleString() +
                  " planned external hire(s)"}
            </p>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground">
          Existing open requisitions are not automatically netted against scenario-created Buy demand. Recruiting history describes prior execution at this role; it does not establish future labor-market supply.
        </p>
      </div>

      <div className="mt-4 overflow-x-auto rounded-md border p-3">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-3 pr-4">
                Required Skill
              </th>
              <th className="pb-3 px-3">
                Importance
              </th>
              <th className="pb-3 px-3 text-right">
                Proficiency
              </th>
              <th className="pb-3 px-3 text-right">
                Build
              </th>
              <th
                className="pb-3 px-3 text-right"
                title="Skill-level mobility signal. Use the Internal Talent Readiness section above for whole-role Move capacity."
              >
                Skill Move Signal
              </th>
              <th className="pb-3 pl-3 text-right">
                Buy History
              </th>
            </tr>
          </thead>
          <tbody>
            {result.skill_bundle.map((row) => (
              <tr
                key={row.skill_code}
                className="border-b last:border-0"
              >
                <td className="py-3 pr-4 font-medium">
                  {row.skill_name}
                  <p className="text-[10px] font-normal text-muted-foreground">
                    {row.skill_category}
                  </p>
                </td>
                <td className="px-3 py-3">
                  {row.importance}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {row.required_proficiency}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {row.build_pathway_available
                    ? row.active_course_count +
                      " course(s)"
                    : "No pathway"}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {row.mobility_candidates.toLocaleString()}
                </td>
                <td className="py-3 pl-3 text-right tabular-nums">
                  {row.historical_filled_requisitions.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.warnings.length > 0 && (
        <div className="mt-4 rounded-md border p-3">
          <p className="text-xs font-medium">
            Plan warnings
          </p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {result.warnings.map((warning) => (
              <li key={warning}>
                - {warning}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
