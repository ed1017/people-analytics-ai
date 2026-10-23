"use client";
import {KeyFindings} from "@/components/key-findings";
import {skillsFindings} from "@/lib/key-findings";

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
  SkillsResponse,
} from "@/lib/types";

type SkillsPageProps = {
  skillsData: SkillsResponse | null;
  skillsLoading: boolean;
  skillsError: string | null;
  maxSkillDemand: number;
  selectedContext: SelectedBusinessContext;
  activeHandoff: PlanningEvidenceHandoff | null;
  onCarryToPlanning: (handoff: PlanningEvidenceHandoff) => void;
  onClearHandoff: () => void;
  onOpenPlanning: () => void;
};

export function SkillsPage({
  skillsData: sourceData,
  skillsLoading,
  skillsError,
  maxSkillDemand,
  selectedContext,
  activeHandoff,
  onCarryToPlanning,
  onClearHandoff,
  onOpenPlanning,
}: SkillsPageProps) {
  const skillsData = !skillsLoading && !skillsError ? sourceData : null;
  return (
<section className="evidence-workspace evidence-pane min-w-0 p-4 sm:p-6">
      <KeyFindings findings={skillsData ? skillsFindings(skillsData) : null} />
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-muted-foreground">
                  Compare recorded employee proficiency with recorded job-required proficiency. External references are in Intelligence.
                </p>
              </div>

              <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                {skillsLoading
                  ? "Loading skills…"
                  : skillsData ? "As of September 30, 2026" : "Skills"}
              </span>
            </div>

            {!skillsLoading && skillsError && (
              <div role="alert" className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                {skillsError}
              </div>
            )}

            {skillsData && (
              <>
                <EvidenceScopeNotice
                  scope={enterpriseTalentEvidenceScope({
                    label: "Company workforce",
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
              </>
            )}

            {skillsData ? (
              <>
                <div className="evidence-metric-grid grid gap-4">
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
                  Apparent proficiency gaps compare recorded employee proficiency with the proficiency required by the employee&apos;s current job profile. Missing or stale skill records should not be interpreted as proof that an employee lacks a capability.
                </div>

                <div className="mt-6 evidence-panel-grid grid gap-6">
                  <div className="rounded-lg border p-4">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
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

                    <ol aria-label="Largest apparent proficiency gaps" className="min-w-0 space-y-3">
                      {skillsData.largest_gaps.map(row=><li key={String(row.skill_code)} className="min-w-0 rounded-lg border p-3 text-sm">
                        <h4 className="break-words font-semibold">{row.skill_name}</h4>
                        <dl className="mt-2 grid min-w-0 grid-cols-2 gap-3">
                          <div className="min-w-0"><dt className="text-xs text-muted-foreground">Meeting requirement</dt><dd className="font-semibold tabular-nums">{row.requirement_met_pct.toFixed(1)}%</dd><dd className="text-xs">{row.employees_meeting_requirement.toLocaleString()} employees</dd></div>
                          <div className="min-w-0"><dt className="text-xs text-muted-foreground">Employees in roles requiring skill</dt><dd className="font-semibold tabular-nums">{row.employees_in_roles_requiring_skill.toLocaleString()}</dd><dd className="text-xs">Population for this percentage</dd></div>
                        </dl>
                        <details className="mt-1"><summary className="min-h-11 cursor-pointer py-2 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring">Category and proficiency details</summary>
                          <dl className="grid grid-cols-2 gap-2 text-xs">
                            <div><dt>Category</dt><dd className="break-words">{row.skill_category}</dd></div>
                            <div><dt>Below or missing requirement</dt><dd>{row.employees_below_or_missing_requirement.toLocaleString()} employees</dd></div>
                            <div><dt>Average required proficiency</dt><dd>{row.avg_required_proficiency.toFixed(2)}</dd></div>
                            <div><dt>Average observed proficiency</dt><dd>{row.avg_observed_proficiency.toFixed(2)}</dd></div>
                            <div><dt>Employees with observed proficiency</dt><dd>{row.employees_with_observed_proficiency.toLocaleString()}</dd></div>
                          </dl>
                        </details>
                      </li>)}
                    </ol>
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
                              row.skill_code
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

                <div className="mt-6 grid gap-6">
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
                              row.skill_code
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

                </div>
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
            ) : (
              (skillsLoading || !skillsError) && <div role="status" className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
                {skillsLoading
                  ? "Loading workforce skills…"
                  : "No skills data returned."}
              </div>
            )}
          </section>
  );
}
