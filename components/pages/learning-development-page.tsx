"use client";

import {
  formatCapacity,
  formatPercent,
  formatWholeCount,
} from "@/lib/display-format";
import type {
  LearningDevelopmentResponse,
} from "@/lib/types";

type LearningDevelopmentPageProps = {
  data: LearningDevelopmentResponse | null;
  loading: boolean;
  error: string | null;
};

function formatLongDate(value: string) {
  return new Date(
    value + "T00:00:00"
  ).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function durationLabel(
  value: number | null
) {
  return value === null
    ? "—"
    : formatCapacity(value) + " hrs";
}

export function LearningDevelopmentPage({
  data,
  loading,
  error,
}: LearningDevelopmentPageProps) {
  return (
    <section className="min-w-0 p-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">
            Learning & Development
          </h2>
          <p className="text-muted-foreground">
            Connect current skill-gap signals to active learning pathways without treating course availability as readiness.
          </p>
        </div>

        <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
          {loading
            ? "Loading pathways…"
            : data
              ? "As of " +
                formatLongDate(data.as_of)
              : "Learning & Development"}
        </span>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}
      {data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Current Gap Skills
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatWholeCount(
                  data.summary.current_gap_skills
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Skills with current below-or-missing requirement signals
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Gap Skills with Pathway
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatWholeCount(
                  data.summary
                    .gap_skills_with_active_pathway
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                At least one active mapped course
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Pathway Coverage
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatPercent(
                  data.summary
                    .gap_pathway_coverage_pct
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Share of current gap skills with an active pathway
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Active Courses on Gap Skills
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatWholeCount(
                  data.summary
                    .active_courses_on_gap_skills
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Active catalog courses mapped to current gap skills
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              What this page does — and does not — mean
            </p>
            <p className="mt-1">
              An active pathway means at least one active course is mapped to the skill. Course availability is evidence of a development path, not proof that completion will raise proficiency or make someone role-ready. Catalog duration is course duration only, not time-to-readiness.
            </p>
          </div>

          <div className="mt-6 rounded-lg border p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">
                  Current Skill Gaps & Learning Pathways
                </h3>
                <p className="text-sm text-muted-foreground">
                  Aggregate current-role gap signals paired with active mapped course evidence
                </p>
              </div>

              <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                {formatWholeCount(
                  data.skill_pathways.length
                )} gap skills
              </span>
            </div>

            {data.skill_pathways.length > 0 ? (
              <div className="max-h-[640px] overflow-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-3 pr-4">Skill</th>
                      <th className="pb-3 pr-4">Category</th>
                      <th className="pb-3 pr-4 text-right">
                        Below / Missing
                      </th>
                      <th className="pb-3 pr-4 text-right">
                        Meet %
                      </th>
                      <th className="pb-3 pr-4">
                        Pathway
                      </th>
                      <th className="pb-3 pr-4 text-right">
                        Active Courses
                      </th>
                      <th className="pb-3 pr-4 text-right">
                        Shortest Catalog
                      </th>
                      <th className="pb-3 text-right">
                        Avg Catalog
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.skill_pathways.map(
                      (row) => (
                        <tr
                          key={String(row.skill_id)}
                          className="border-b last:border-0"
                        >
                          <td className="py-3 pr-4 font-medium">
                            {row.skill_name}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {row.skill_category}
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums">
                            {formatWholeCount(
                              row.employees_below_or_missing_requirement
                            )}
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums">
                            {formatPercent(
                              row.requirement_met_pct
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={
                                row.pathway_available
                                  ? "rounded-full border px-2 py-1 text-xs"
                                  : "rounded-full border border-dashed px-2 py-1 text-xs text-muted-foreground"
                              }
                            >
                              {row.pathway_available
                                ? "Active pathway"
                                : "No active mapped course"}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums">
                            {formatWholeCount(
                              row.active_course_count
                            )}
                          </td>
                          <td
                            className="py-3 pr-4 text-right tabular-nums"
                            title="Catalog course duration only; not time-to-readiness."
                          >
                            {durationLabel(
                              row.shortest_catalog_duration_hours
                            )}
                          </td>
                          <td
                            className="py-3 text-right tabular-nums"
                            title="Average catalog duration across active mapped courses; not time-to-readiness."
                          >
                            {durationLabel(
                              row.avg_catalog_duration_hours
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No current skill-gap rows were returned.
              </div>
            )}
          </div>

          <div className="mt-6 rounded-lg border p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">
                  Required-Skill Pathway Coverage by Job Profile
                </h3>
                <p className="text-sm text-muted-foreground">
                  Share of each profile&apos;s required skills that have at least one active mapped course
                </p>
              </div>
              <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                {formatWholeCount(
                  data.summary
                    .job_profiles_with_any_pathway
                )} of{" "}
                {formatWholeCount(
                  data.summary.active_job_profiles
                )} profiles have at least one pathway
              </span>
            </div>

            {data.job_profile_pathways.length > 0 ? (
              <div className="max-h-[560px] overflow-auto">
                <table className="w-full min-w-[800px] text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-3 pr-4">
                        Job Profile
                      </th>
                      <th className="pb-3 pr-4 text-right">
                        Required Skills
                      </th>
                      <th className="pb-3 pr-4 text-right">
                        With Pathway
                      </th>
                      <th className="pb-3 pr-4 text-right">
                        Coverage
                      </th>
                      <th className="pb-3 pr-4 text-right">
                        Active Course Mappings
                      </th>
                      <th className="pb-3 text-right">
                        Shortest Catalog
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.job_profile_pathways.map(
                      (row) => (
                        <tr
                          key={row.job_profile_code}
                          className="border-b last:border-0"
                        >
                          <td className="py-3 pr-4 font-medium">
                            {row.job_profile_name}
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums">
                            {formatWholeCount(
                              row.required_skill_count
                            )}
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums">
                            {formatWholeCount(
                              row.required_skills_with_active_pathway
                            )}
                          </td>
                          <td className="py-3 pr-4 text-right font-semibold tabular-nums">
                            {formatPercent(
                              row.pathway_coverage_pct
                            )}
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums">
                            {formatWholeCount(
                              row.active_course_count
                            )}
                          </td>
                          <td
                            className="py-3 text-right tabular-nums"
                            title="Shortest catalog duration among active courses mapped to required skills; not time-to-readiness."
                          >
                            {durationLabel(
                              row.shortest_catalog_duration_hours
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No active job-profile skill requirements were returned.
              </div>
            )}

            <p className="mt-3 text-xs text-muted-foreground">
              Job-profile coverage is course coverage across required skills. It does not measure whether any employee is ready for that role.
            </p>
          </div>

          <details className="mt-6 rounded-lg border p-4">
            <summary className="cursor-pointer font-semibold">
              Methodology & guardrails
            </summary>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {data.methodology.map(
                (item) => (
                  <li
                    key={item}
                    className="flex gap-2"
                  >
                    <span>•</span>
                    <span>{item}</span>
                  </li>
                )
              )}
            </ul>
          </details>
        </>
      ) : (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          {loading
            ? "Loading Learning & Development pathway coverage…"
            : "No Learning & Development data returned."}
        </div>
      )}
    </section>
  );
}
