import type {
  SkillInsightRow,
  SkillsResponse,
} from "@/lib/types";
import type {
  SelectedBusinessContext,
  TalentEvidenceScope,
} from "@/lib/talent-evidence-scope";

export type SkillsEvidenceSnapshot = {
  sourcePage: "skills";
  sourceLabel: "Skills Intelligence";
  asOf: string;
  evidenceScope: "enterprise";
  evidenceLabel: string;
  populationLabel: string;
  populationCount: number;
  selectedBusinessContext: SelectedBusinessContext;
  skill: {
    skillId: string;
    skillCode: string;
    skillName: string;
    skillCategory: string;
    demandPopulation: number;
    observedProficiencyRecords: number;
    employeesMeetingRequirement: number;
    employeesBelowOrMissingRequirement: number;
    avgRequiredProficiency: number;
    avgObservedProficiency: number;
    avgProficiencyGap: number;
    profileCoveragePct: number;
    requirementMetPct: number;
  };
};

export type PlanningEvidenceHandoff = {
  id: string;
  kind: "skills_gap";
  createdAt: string;
  evidence: SkillsEvidenceSnapshot;
  businessGoal: string;
  userAssumptions: string | null;
};

export type EvidenceFreshness = {
  status: "current" | "stale" | "unavailable";
  reason: string;
};

type CreateSkillsHandoffInput = {
  skillsData: SkillsResponse | null;
  skill: SkillInsightRow | null;
  evidenceScope: TalentEvidenceScope | null;
  selectedBusinessContext: SelectedBusinessContext;
  businessGoal: string;
  userAssumptions?: string;
  id?: string;
  createdAt?: string;
};

type CreateSkillsHandoffResult =
  | {
      ok: true;
      value: PlanningEvidenceHandoff;
    }
  | {
      ok: false;
      error: string;
    };

function sameNumber(
  left: number,
  right: number
) {
  return Math.abs(left - right) < 0.0001;
}

function normalizedContext(
  value: SelectedBusinessContext
) {
  return [
    value.country.trim(),
    value.businessUnit.trim(),
    value.level.trim(),
  ].join("|");
}

export function businessContextChanged(
  captured: SelectedBusinessContext,
  current: SelectedBusinessContext
) {
  return (
    normalizedContext(captured) !==
    normalizedContext(current)
  );
}

export function createSkillsEvidenceHandoff(
  input: CreateSkillsHandoffInput
): CreateSkillsHandoffResult {
  const goal = input.businessGoal.trim();
  const assumptions =
    input.userAssumptions?.trim() ?? "";

  if (!input.skillsData || !input.skill) {
    return {
      ok: false,
      error:
        "Current Skills evidence is unavailable.",
    };
  }

  const scope = input.evidenceScope as
    | (TalentEvidenceScope & {
        scope?: string;
        filtersApplied?: {
          country?: boolean;
          businessUnit?: boolean;
          level?: boolean;
        };
      })
    | null;

  if (
    !scope ||
    scope.scope !== "enterprise" ||
    scope.filtersApplied?.country !== false ||
    scope.filtersApplied?.businessUnit !==
      false ||
    scope.filtersApplied?.level !== false
  ) {
    return {
      ok: false,
      error:
        "Only explicitly company-scoped Skills evidence can be carried to Planning.",
    };
  }

  if (
    !input.skillsData.as_of ||
    scope.populationCount === null ||
    scope.populationCount <= 0
  ) {
    return {
      ok: false,
      error:
        "Skills source date or workforce denominator is unavailable.",
    };
  }

  if (!goal) {
    return {
      ok: false,
      error:
        "Add a business goal before carrying evidence to Planning.",
    };
  }

  const skill = input.skill;

  return {
    ok: true,
    value: {
      id:
        input.id ??
        `skills-${skill.skill_code}-${Date.now()}`,
      kind: "skills_gap",
      createdAt:
        input.createdAt ??
        new Date().toISOString(),
      evidence: {
        sourcePage: "skills",
        sourceLabel:
          "Skills Intelligence",
        asOf: input.skillsData.as_of,
        evidenceScope: "enterprise",
        evidenceLabel: scope.label,
        populationLabel:
          scope.populationLabel,
        populationCount:
          scope.populationCount,
        selectedBusinessContext: {
          ...input.selectedBusinessContext,
        },
        skill: {
          skillId: String(skill.skill_id),
          skillCode: skill.skill_code,
          skillName: skill.skill_name,
          skillCategory:
            skill.skill_category,
          demandPopulation:
            skill.employees_in_roles_requiring_skill,
          observedProficiencyRecords:
            skill.employees_with_observed_proficiency,
          employeesMeetingRequirement:
            skill.employees_meeting_requirement,
          employeesBelowOrMissingRequirement:
            skill.employees_below_or_missing_requirement,
          avgRequiredProficiency:
            skill.avg_required_proficiency,
          avgObservedProficiency:
            skill.avg_observed_proficiency,
          avgProficiencyGap:
            skill.avg_proficiency_gap,
          profileCoveragePct:
            skill.profile_coverage_pct,
          requirementMetPct:
            skill.requirement_met_pct,
        },
      },
      businessGoal: goal,
      userAssumptions:
        assumptions || null,
    },
  };
}

export function assessSkillsEvidenceFreshness(
  handoff: PlanningEvidenceHandoff | null,
  skillsData: SkillsResponse | null
): EvidenceFreshness {
  if (!handoff) {
    return {
      status: "unavailable",
      reason: "No evidence handoff is active.",
    };
  }

  if (!skillsData) {
    return {
      status: "unavailable",
      reason:
        "The current Skills source is not loaded, so the carried snapshot cannot be revalidated.",
    };
  }

  if (
    skillsData.as_of !==
    handoff.evidence.asOf
  ) {
    return {
      status: "stale",
      reason:
        "The Skills source date has changed since this evidence was carried.",
    };
  }

  if (
    skillsData.summary.current_workforce !==
    handoff.evidence.populationCount
  ) {
    return {
      status: "stale",
      reason:
        "The company workforce denominator has changed since this evidence was carried.",
    };
  }

  const currentSkill =
    skillsData.largest_gaps.find(
      (row) =>
        row.skill_code ===
        handoff.evidence.skill.skillCode
    );

  if (!currentSkill) {
    return {
      status: "unavailable",
      reason:
        "The carried skill is not present in the current largest-gap source rows.",
    };
  }

  const carried = handoff.evidence.skill;
  const same =
    currentSkill.skill_name ===
      carried.skillName &&
    currentSkill.skill_category ===
      carried.skillCategory &&
    currentSkill.employees_in_roles_requiring_skill ===
      carried.demandPopulation &&
    currentSkill.employees_with_observed_proficiency ===
      carried.observedProficiencyRecords &&
    currentSkill.employees_meeting_requirement ===
      carried.employeesMeetingRequirement &&
    currentSkill.employees_below_or_missing_requirement ===
      carried.employeesBelowOrMissingRequirement &&
    sameNumber(
      currentSkill.avg_required_proficiency,
      carried.avgRequiredProficiency
    ) &&
    sameNumber(
      currentSkill.avg_observed_proficiency,
      carried.avgObservedProficiency
    ) &&
    sameNumber(
      currentSkill.avg_proficiency_gap,
      carried.avgProficiencyGap
    ) &&
    sameNumber(
      currentSkill.profile_coverage_pct,
      carried.profileCoveragePct
    ) &&
    sameNumber(
      currentSkill.requirement_met_pct,
      carried.requirementMetPct
    );

  if (!same) {
    return {
      status: "stale",
      reason:
        "The carried skill metrics have changed since the handoff was created.",
    };
  }

  return {
    status: "current",
    reason:
      "The carried snapshot matches the currently loaded company Skills source.",
  };
}
