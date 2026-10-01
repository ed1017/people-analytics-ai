"use client";

import {
  formatPercent,
  formatWholeCount,
} from "@/lib/display-format";
import { EvidenceScopeNotice } from "@/components/evidence-scope-notice";
import { SkillsEvidenceHandoffPanel } from "@/components/skills-evidence-handoff-panel";
import type { PlanningEvidenceHandoff } from "@/lib/evidence-handoff";
import {
  enterpriseTalentEvidenceScope,
  type SelectedBusinessContext,
} from "@/lib/talent-evidence-scope";
import type {
  BlsResponse,
  SkillsResponse,
} from "@/lib/types";

type SkillsPageProps = {
  skillsData: SkillsResponse | null;
  skillsLoading: boolean;
  skillsError: string | null;
  blsData: BlsResponse | null;
  blsLoading: boolean;
  blsError: string | null;
  maxSkillDemand: number;
  selectedContext: SelectedBusinessContext;
  activeHandoff: PlanningEvidenceHandoff | null;
  onCarryToPlanning: (handoff: PlanningEvidenceHandoff) => void;
  onClearHandoff: () => void;
  onOpenPlanning: () => void;
};

function formatLongDate(value: string) {
  return new Date(value + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function SkillsPage({
  skillsData,
  skillsLoading,
  skillsError,
  blsData,
  blsLoading,
  blsError,
  maxSkillDemand,
  selectedContext,
  activeHandoff,
  onCarryToPlanning,
  onClearHandoff,
  onOpenPlanning,
}: SkillsPageProps) {
  return (
<section className="min-w-0 p-6">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">
                  Skills Intelligence
                </h2>
                <p className="text-muted-foreground">
                  Compare observed employee proficiency with job-required proficiency and external job-skill context.
                </p>
              </div>

              <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                {skillsLoading
                  ? "Loading skills…"
                  : "As of September 30, 2026"}
              </span>
            </div>

            {skillsError && (
              <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                {skillsError}
              </div>
            )}

            {skillsData && (
              <>
                <EvidenceScopeNotice
                  scope={enterpriseTalentEvidenceScope({
                    label: "Enterprise workforce",
                    asOf: skillsData.as_of,
                    populationLabel: "employees",
                    populationCount:
                      skillsData.summary.current_workforce,
                    supportedBreakdowns: [
                      "skill",
                    ],
                  })}
                  selectedContext={selectedContext}
                  note="Skill-level denominators remain the employees in current roles requiring each skill."
                />

                <SkillsEvidenceHandoffPanel
                  skillsData={skillsData}
                  selectedContext={selectedContext}
                  activeHandoff={activeHandoff}
                  onCarryToPlanning={
                    onCarryToPlanning
                  }
                  onClearHandoff={
                    onClearHandoff
                  }
                  onOpenPlanning={
                    onOpenPlanning
                  }
                />
              </>
            )}

            {skillsData ? (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Active Skills
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {formatWholeCount(skillsData.summary.active_skills)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Internal skills taxonomy
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Skills Below 60%
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {formatWholeCount(skillsData.summary.skills_below_60_pct)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Requirement attainment below 60%
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Requirement Met
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {formatPercent(
                        skillsData.summary.weighted_requirement_met_pct
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Weighted across required skill assignments
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      O*NET Mapping
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {formatWholeCount(skillsData.summary.onet_mapped_job_profiles)}
                      /
                      {formatWholeCount(skillsData.summary.total_job_profiles)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Internal job profiles enriched
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                  Apparent proficiency gaps compare observed employee proficiency with the proficiency required by the employee&apos;s current job profile. Missing or stale skill records should not be interpreted as proof that an employee lacks a capability.
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
                  <div className="rounded-lg border p-4">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">
                          Largest Apparent Proficiency Gaps
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Lowest share of employees meeting current job proficiency requirements
                        </p>
                      </div>

                      <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                        {formatPercent(
                          skillsData.summary.average_profile_coverage_pct
                        )} profile coverage
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="pb-3 pr-4">
                              Skill
                            </th>
                            <th className="pb-3 pr-4">
                              Category
                            </th>
                            <th className="pb-3 pr-4 text-right">
                              Required
                            </th>
                            <th className="pb-3 pr-4 text-right">
                              Observed
                            </th>
                            <th className="pb-3 pr-4 text-right">
                              Meet %
                            </th>
                            <th className="pb-3 text-right">
                              Below / Missing
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {skillsData.largest_gaps.map(
                            (row) => (
                              <tr
                                key={String(
                                  row.skill_id
                                )}
                                className="border-b last:border-0"
                              >
                                <td className="py-3 pr-4 font-medium">
                                  {row.skill_name}
                                </td>
                                <td className="py-3 pr-4 text-muted-foreground">
                                  {row.skill_category}
                                </td>
                                <td className="py-3 pr-4 text-right tabular-nums">
                                  {row.avg_required_proficiency.toFixed(
                                    2
                                  )}
                                </td>
                                <td className="py-3 pr-4 text-right tabular-nums">
                                  {row.avg_observed_proficiency.toFixed(
                                    2
                                  )}
                                </td>
                                <td className="py-3 pr-4 text-right font-semibold tabular-nums">
                                  {row.requirement_met_pct.toFixed(
                                    1
                                  )}
                                  %
                                </td>
                                <td className="py-3 text-right tabular-nums">
                                  {row.employees_below_or_missing_requirement.toLocaleString()}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="mb-4">
                      <h3 className="font-semibold">
                        Highest-Demand Skills
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Employees currently sitting in roles requiring each skill
                      </p>
                    </div>

                    <div className="space-y-4">
                      {skillsData.highest_demand.map(
                        (row) => (
                          <div
                            key={String(
                              row.skill_id
                            )}
                            className="space-y-2"
                          >
                            <div className="flex items-end justify-between gap-4">
                              <div>
                                <p className="text-sm font-medium">
                                  {row.skill_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {row.skill_category} ·{" "}
                                  {row.requirement_met_pct.toFixed(
                                    1
                                  )}
                                  % meeting requirement
                                </p>
                              </div>

                              <p className="text-sm font-semibold tabular-nums">
                                {row.employees_in_roles_requiring_skill.toLocaleString()}
                              </p>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-foreground"
                                style={{
                                  width: `${
                                    maxSkillDemand > 0
                                      ? Math.max(
                                          3,
                                          (row.employees_in_roles_requiring_skill /
                                            maxSkillDemand) *
                                            100
                                        )
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold">
                      AI Capability Watchlist
                    </h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      AI-related skills currently showing the largest apparent proficiency gaps
                    </p>

                    <div className="space-y-3">
                      {skillsData.largest_gaps
                        .filter(
                          (row) =>
                            row.skill_category ===
                            "AI"
                        )
                        .slice(0, 6)
                        .map((row) => (
                          <div
                            key={String(
                              row.skill_id
                            )}
                            className="flex items-center justify-between gap-4 rounded-md border p-3"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {row.skill_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Required{" "}
                                {row.avg_required_proficiency.toFixed(
                                  1
                                )}{" "}
                                · Observed{" "}
                                {row.avg_observed_proficiency.toFixed(
                                  1
                                )}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-sm font-semibold">
                                {row.requirement_met_pct.toFixed(
                                  1
                                )}
                                %
                              </p>
                              <p className="text-xs text-muted-foreground">
                                meeting requirement
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold">
                      External Skills Intelligence
                    </h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Internal job architecture is linked to O*NET occupation and skills data.
                    </p>

                    <div className="rounded-lg border p-4">
                      <p className="text-xs font-medium text-muted-foreground">
                        Job profiles mapped
                      </p>
                      <p className="mt-2 text-3xl font-semibold">
                        {formatWholeCount(skillsData.summary.onet_mapped_job_profiles)}
                        /
                        {formatWholeCount(skillsData.summary.total_job_profiles)}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        This gives the model an external occupation and skills reference layer alongside internal workforce data.
                      </p>
                    </div>

                    <div className="mt-4 rounded-lg border p-4">
                      <p className="text-xs font-medium text-muted-foreground">
                        Current workforce
                      </p>
                      <p className="mt-2 text-2xl font-semibold">
                        {formatWholeCount(skillsData.summary.current_workforce)}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Employees in the September 2026 workforce snapshot.
                      </p>
                    </div>


                <div className="mt-6 rounded-lg border p-4">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">
                        External Labor Market
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        National labor-market context from the U.S. Bureau of Labor Statistics.
                      </p>
                    </div>

                    <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                      {blsLoading
                        ? "Refreshing BLS…"
                        : "Live BLS data"}
                    </span>
                  </div>

                  {blsError && (
                    <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                      {blsError}
                    </div>
                  )}

                  {blsData ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-3">
                        {blsData.metrics.map(
                          (metric) => (
                            <div
                              key={
                                metric.series_id
                              }
                              className="rounded-lg border p-4"
                            >
                              <p className="text-xs font-medium text-muted-foreground">
                                {metric.short_name}
                              </p>

                              <p className="mt-2 text-3xl font-semibold">
                                {metric.display_value}
                              </p>

                              <p className="mt-2 text-xs text-muted-foreground">
                                {metric.observation_date
                                  ? `Latest observation: ${formatLongDate(
                                      metric.observation_date
                                    )}`
                                  : "Latest observation unavailable"}
                              </p>
                            </div>
                          )
                        )}
                      </div>

                      <p className="mt-4 text-xs text-muted-foreground">
                        BLS provides macro labor-market context. These national indicators should inform workforce assumptions, not be treated as company-specific talent or wage measures.
                      </p>
                    </>
                  ) : (
                    !blsLoading && (
                      <p className="text-sm text-muted-foreground">
                        No BLS data returned.
                      </p>
                    )
                  )}
                </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
                {skillsLoading
                  ? "Loading workforce skills…"
                  : "No skills data returned."}
              </div>
            )}
          </section>
  );
}
