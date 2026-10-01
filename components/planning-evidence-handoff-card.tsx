"use client";

import { Button } from "@/components/ui/button";
import {
  businessContextChanged,
  type EvidenceFreshness,
  type PlanningEvidenceHandoff,
} from "@/lib/evidence-handoff";
import type { SelectedBusinessContext } from "@/lib/talent-evidence-scope";

type PlanningEvidenceHandoffCardProps = {
  handoff: PlanningEvidenceHandoff;
  freshness: EvidenceFreshness;
  freshnessChecking: boolean;
  currentBusinessContext: SelectedBusinessContext;
  onBackToSkills: () => void;
  onClear: () => void;
  onRefresh: () => void;
};

function formatDate(value: string) {
  return new Date(
    value + "T00:00:00"
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function contextLabel(
  value: SelectedBusinessContext
) {
  return [
    value.country,
    value.businessUnit,
    value.level,
  ].join(" · ");
}

export function PlanningEvidenceHandoffCard({
  handoff,
  freshness,
  freshnessChecking,
  currentBusinessContext,
  onBackToSkills,
  onClear,
  onRefresh,
}: PlanningEvidenceHandoffCardProps) {
  const evidence = handoff.evidence;
  const skill = evidence.skill;
  const contextChanged =
    businessContextChanged(
      evidence.selectedBusinessContext,
      currentBusinessContext
    );

  const statusLabel = freshnessChecking
    ? "Checking"
    : freshness.status === "current"
      ? "Current"
      : freshness.status === "stale"
        ? "Stale"
        : "Unavailable";

  return (
    <section
      aria-label="Carried planning evidence"
      className="mb-6 rounded-lg border bg-card p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">
              Carried evidence
            </h3>
            <span
              className={
                freshness.status === "current" &&
                !freshnessChecking
                  ? "rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                  : "rounded-full border border-amber-700/40 bg-amber-700/10 px-2.5 py-1 text-xs font-medium text-amber-900"
              }
            >
              {statusLabel}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Context only. No scenario has been
            run, approved, or applied from this
            handoff.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={freshnessChecking}
          >
            {freshnessChecking
              ? "Checking…"
              : "Recheck evidence"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBackToSkills}
          >
            Back to Skills
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
          >
            Clear handoff
          </Button>
        </div>
      </div>

      <div
        className={
          freshness.status === "current" &&
          !freshnessChecking
            ? "mt-4 rounded-md border bg-muted/20 p-3 text-sm"
            : "mt-4 rounded-md border border-amber-700/30 bg-amber-700/10 p-3 text-sm"
        }
      >
        <p className="font-medium">
          Freshness check
        </p>
        <p className="mt-1 text-muted-foreground">
          {freshnessChecking
            ? "Revalidating the carried snapshot against the current Skills source."
            : freshness.reason}
        </p>
        {!freshnessChecking &&
          freshness.status !== "current" && (
            <p className="mt-2 font-medium">
              Treat this packet as historical
              context until it is replaced from
              the current Skills page.
            </p>
          )}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-md border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Observed evidence
          </p>
          <p className="mt-2 text-lg font-semibold">
            {skill.skillName}
          </p>
          <p className="text-sm text-muted-foreground">
            {skill.skillCategory} · apparent
            proficiency gap
          </p>

          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">
                Demand population
              </dt>
              <dd className="font-medium tabular-nums">
                {skill.demandPopulation.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                Below / missing
              </dt>
              <dd className="font-medium tabular-nums">
                {skill.employeesBelowOrMissingRequirement.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                Meeting requirement
              </dt>
              <dd className="font-medium tabular-nums">
                {skill.requirementMetPct.toFixed(1)}
                %
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                Required / observed
              </dt>
              <dd className="font-medium tabular-nums">
                {skill.avgRequiredProficiency.toFixed(
                  2
                )}
                {" / "}
                {skill.avgObservedProficiency.toFixed(
                  2
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-md border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Evidence provenance
          </p>
          <dl className="mt-2 space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">
                Source
              </dt>
              <dd className="font-medium">
                {evidence.sourceLabel}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                Source date
              </dt>
              <dd className="font-medium">
                {formatDate(evidence.asOf)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                Evidence scope
              </dt>
              <dd className="font-medium">
                {evidence.evidenceLabel} ·{" "}
                {evidence.populationCount.toLocaleString()}{" "}
                {evidence.populationLabel}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                Captured business context
              </dt>
              <dd className="font-medium">
                {contextLabel(
                  evidence.selectedBusinessContext
                )}
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-xs text-muted-foreground">
            The business context above did not
            filter the Skills evidence. The
            carried evidence remains
            enterprise-wide.
          </p>

          {contextChanged && (
            <div className="mt-3 rounded-md border border-amber-700/30 bg-amber-700/10 p-2 text-xs">
              <p className="font-medium">
                Current business context changed
                after this handoff.
              </p>
              <p className="mt-1 text-muted-foreground">
                Current:{" "}
                {contextLabel(
                  currentBusinessContext
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-md border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            User-stated business goal
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm">
            {handoff.businessGoal}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            This is intent supplied by the user,
            not an observed workforce fact.
          </p>
        </div>

        <div className="rounded-md border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            User-stated assumptions
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm">
            {handoff.userAssumptions ??
              "No assumptions stated."}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Assumptions are not approved model
            inputs until the user explicitly
            chooses to model them with supported
            values.
          </p>
        </div>
      </div>
    </section>
  );
}
