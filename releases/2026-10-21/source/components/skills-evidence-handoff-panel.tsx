"use client";

import {
  useMemo,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import {
  createSkillsEvidenceHandoff,
  type PlanningEvidenceHandoff,
} from "@/lib/evidence-handoff";
import {
  enterpriseTalentEvidenceScope,
  type SelectedBusinessContext,
} from "@/lib/talent-evidence-scope";
import type {
  SkillInsightRow,
  SkillsResponse,
} from "@/lib/types";

type SkillsEvidenceHandoffPanelProps = {
  skillsData: SkillsResponse;
  selectedContext: SelectedBusinessContext;
  activeHandoff: PlanningEvidenceHandoff | null;
  onCarryToPlanning: (
    handoff: PlanningEvidenceHandoff
  ) => void;
  onClearHandoff: () => void;
  onOpenPlanning: () => void;
};

function skillOptionLabel(
  row: SkillInsightRow
) {
  return (
    row.skill_name +
    " · " +
    row.requirement_met_pct.toFixed(1) +
    "% meeting requirement"
  );
}

export function SkillsEvidenceHandoffPanel({
  skillsData,
  selectedContext,
  activeHandoff,
  onCarryToPlanning,
  onClearHandoff,
  onOpenPlanning,
}: SkillsEvidenceHandoffPanelProps) {
  const [selectedSkillCode, setSelectedSkillCode] =
    useState(activeHandoff?.evidence.skill.skillCode ?? "");
  const [businessGoal, setBusinessGoal] =
    useState(activeHandoff?.businessGoal ?? "");
  const [userAssumptions, setUserAssumptions] =
    useState(activeHandoff?.userAssumptions ?? "");
  const [error, setError] =
    useState<string | null>(null);

  const evidenceScope = useMemo(
    () =>
      enterpriseTalentEvidenceScope({
        label: "Company workforce",
        asOf: skillsData.as_of,
        populationLabel: "employees",
        populationCount:
          skillsData.summary.current_workforce,
        supportedBreakdowns: ["skill"],
      }),
    [skillsData]
  );

  const selectedSkill = useMemo(
    () =>
      skillsData.largest_gaps.find(
        (row) =>
          row.skill_code === selectedSkillCode
      ) ?? null,
    [
      skillsData.largest_gaps,
      selectedSkillCode,
    ]
  );

  const [previousHandoff, setPreviousHandoff] = useState(activeHandoff);
  // Reset only when the carried packet changes, before committing a stale draft.
  // Unrelated renders and source refreshes preserve edits in progress.
  if (previousHandoff !== activeHandoff) {
    setPreviousHandoff(activeHandoff);
    if (
      activeHandoff?.kind === "skills_gap"
    ) {
      setSelectedSkillCode(
        activeHandoff.evidence.skill.skillCode
      );
      setBusinessGoal(
        activeHandoff.businessGoal
      );
      setUserAssumptions(
        activeHandoff.userAssumptions ?? ""
      );
      setError(null);
    } else {
      setSelectedSkillCode("");
      setBusinessGoal("");
      setUserAssumptions("");
      setError(null);
    }
  }

  const resetDraft = () => {
    if (
      activeHandoff?.kind === "skills_gap"
    ) {
      setSelectedSkillCode(
        activeHandoff.evidence.skill.skillCode
      );
      setBusinessGoal(
        activeHandoff.businessGoal
      );
      setUserAssumptions(
        activeHandoff.userAssumptions ?? ""
      );
    } else {
      setSelectedSkillCode("");
      setBusinessGoal("");
      setUserAssumptions("");
    }

    setError(null);
  };

  const carryToPlanning = () => {
    const result =
      createSkillsEvidenceHandoff({
        skillsData,
        skill: selectedSkill,
        evidenceScope,
        selectedBusinessContext:
          selectedContext,
        businessGoal,
        userAssumptions,
      });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError(null);
    onCarryToPlanning(result.value);
  };

  return (
    <section
      id="skills-evidence-handoff"
      tabIndex={-1}
      aria-label="Prepare evidence for Planning"
      className="mb-6 rounded-lg border bg-card p-4 focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            Carry evidence to Planning
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Select one observed company skill
            gap, state the business goal, and
            explicitly carry the context into
            Workforce Planning.
          </p>
        </div>

        {activeHandoff && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenPlanning}
            >
              Open carried evidence
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearHandoff}
            >
              Clear carried evidence
            </Button>
          </div>
        )}
      </div>

      {activeHandoff && (
        <div className="mt-4 rounded-md border bg-muted/20 p-3 text-sm">
          <p className="font-medium">
            Currently carried:{" "}
            {
              activeHandoff.evidence.skill
                .skillName
            }
          </p>
          <p className="mt-1 text-muted-foreground">
            Goal: {activeHandoff.businessGoal}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Carrying a new packet will replace
            the current one. Nothing is modeled
            automatically.
          </p>
        </div>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Observed skill gap
          <select
            value={selectedSkillCode}
            onChange={(event) => {
              setSelectedSkillCode(
                event.target.value
              );
              setError(null);
            }}
            className="h-11 rounded-md border bg-card px-3 text-sm"
          >
            <option value="">
              Choose an apparent skill gap
            </option>
            {skillsData.largest_gaps.map(
              (row) => (
                <option
                  key={String(row.skill_id)}
                  value={row.skill_code}
                >
                  {skillOptionLabel(row)}
                </option>
              )
            )}
          </select>
        </label>

        <div className="rounded-md border p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Evidence population
          </p>
          <p className="mt-2 font-medium">
            {evidenceScope.label}
          </p>
          <p className="mt-1 text-muted-foreground">
            {evidenceScope.populationCount?.toLocaleString()}{" "}
            {evidenceScope.populationLabel} ·
            as of {skillsData.as_of}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Selected business context:{" "}
            {selectedContext.country} ·{" "}
            {selectedContext.businessUnit} ·{" "}
            {selectedContext.level}. This
            context did not filter the Skills
            evidence.
          </p>
        </div>
      </div>

      {selectedSkill && (
        <div className="mt-4 rounded-md border p-3">
          <p className="font-medium">
            {selectedSkill.skill_name}
          </p>
          <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">
                Demand population
              </p>
              <p className="font-medium tabular-nums">
                {selectedSkill.employees_in_roles_requiring_skill.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                Below / missing
              </p>
              <p className="font-medium tabular-nums">
                {selectedSkill.employees_below_or_missing_requirement.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                Meeting requirement
              </p>
              <p className="font-medium tabular-nums">
                {selectedSkill.requirement_met_pct.toFixed(
                  1
                )}
                %
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-4">
        <label className="grid gap-2 text-sm font-medium">
          Business goal
          <textarea
            value={businessGoal}
            onChange={(event) => {
              setBusinessGoal(
                event.target.value
              );
              setError(null);
            }}
            rows={3}
            placeholder="Example: Explore ways to strengthen AI capability without increasing company authorized positions."
            className="min-h-24 resize-y rounded-md border bg-card p-3 text-sm"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          User assumptions (optional)
          <textarea
            value={userAssumptions}
            onChange={(event) =>
              setUserAssumptions(
                event.target.value
              )
            }
            rows={3}
            placeholder="Only enter assumptions you want Planning to remember. They will not be modeled automatically."
            className="min-h-24 resize-y rounded-md border bg-card p-3 text-sm"
          />
        </label>
      </div>

      {error && (
        <div
          role="alert"
          aria-atomic="true"
          className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={carryToPlanning}
        >
          Carry to Planning
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={resetDraft}
        >
          Cancel changes
        </Button>
        <p className="text-xs text-muted-foreground">
          This navigates with context only. It
          does not run a scenario, choose a
          response strategy, approve anything,
          or change source data.
        </p>
      </div>
    </section>
  );
}
