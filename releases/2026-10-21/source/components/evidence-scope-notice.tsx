"use client";

import {
  hasNarrowBusinessSelection,
  type SelectedBusinessContext,
  type TalentEvidenceScope,
} from "@/lib/talent-evidence-scope";

type EvidenceScopeNoticeProps = {
  scope: TalentEvidenceScope;
  selectedContext: SelectedBusinessContext;
  note?: string;
  filterScopeLabel?: string;
};

function formatDate(value: string | null) {
  if (!value) return "No source date";

  return new Date(
    value + "T00:00:00"
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function EvidenceScopeNotice({
  scope,
  selectedContext,
  note,
  filterScopeLabel = "the evidence shown on this page",
}: EvidenceScopeNoticeProps) {
  const selectedNarrow =
    hasNarrowBusinessSelection(
      selectedContext
    );

  const populationText =
    scope.populationCount === null
      ? scope.populationLabel
      : scope.populationCount.toLocaleString() +
        " " +
        scope.populationLabel;

  return (
    <div className="evidence-scope-notice mb-6 rounded-lg border bg-muted/20 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold">
          Evidence scope: {scope.label}
        </span>
        <span className="text-muted-foreground">
          {populationText}
        </span>
        <span className="text-muted-foreground">
          As of {formatDate(scope.asOf)}
        </span>
      </div>

      <p className="mt-2 text-muted-foreground">
        Selected business context:{" "}
        {selectedContext.country} ·{" "}
        {selectedContext.businessUnit} ·{" "}
        {selectedContext.level}.
      </p>

      <p className="mt-1 text-muted-foreground">
        {selectedNarrow
          ? `These dashboard selections do not narrow ${filterScopeLabel}.`
          : `Country, business-unit, and level dashboard filters do not narrow ${filterScopeLabel}.`}
        {note ? " " + note : ""}
      </p>
    </div>
  );
}