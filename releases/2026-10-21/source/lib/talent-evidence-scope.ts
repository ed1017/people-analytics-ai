export type TalentEvidenceScope = {
  scope: "enterprise";
  label: string;
  asOf: string | null;
  populationLabel: string;
  populationCount: number | null;
  filtersApplied: {
    country: false;
    businessUnit: false;
    level: false;
  };
  supportedBreakdowns: string[];
};

export type SelectedBusinessContext = {
  country: string;
  businessUnit: string;
  level: string;
};

export function enterpriseTalentEvidenceScope(
  input: Omit<
    TalentEvidenceScope,
    "scope" | "filtersApplied"
  >
): TalentEvidenceScope {
  return {
    scope: "enterprise",
    filtersApplied: {
      country: false,
      businessUnit: false,
      level: false,
    },
    ...input,
  };
}

export function hasNarrowBusinessSelection(
  context: SelectedBusinessContext
) {
  return (
    context.country !== "Global workforce" ||
    context.businessUnit !==
      "All business units" ||
    context.level !== "All levels"
  );
}

export function evidenceScopeForAi(
  scope: TalentEvidenceScope,
  selected: SelectedBusinessContext
) {
  const selectedLabel =
    `${selected.country} | ${selected.businessUnit} | ${selected.level}`;

  return {
    evidence_scope: scope.scope,
    evidence_label: scope.label,
    evidence_as_of: scope.asOf,
    evidence_population_label:
      scope.populationLabel,
    evidence_population_count:
      scope.populationCount,
    filters_applied: scope.filtersApplied,
    supported_breakdowns:
      scope.supportedBreakdowns,
    selected_business_context:
      selectedLabel,
    selected_context_narrows_evidence:
      false,
  };
}
