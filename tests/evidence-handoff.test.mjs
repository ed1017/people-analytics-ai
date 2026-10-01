import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  assessSkillsEvidenceFreshness,
  businessContextChanged,
  createSkillsEvidenceHandoff,
} from "../lib/evidence-handoff.ts";
import {
  enterpriseTalentEvidenceScope,
} from "../lib/talent-evidence-scope.ts";

const skill = {
  skill_id: "skill-ai",
  skill_code: "AI",
  skill_name: "Artificial Intelligence",
  skill_category: "AI",
  employees_in_roles_requiring_skill: 674,
  employees_with_observed_proficiency: 600,
  employees_meeting_requirement: 344,
  employees_below_or_missing_requirement: 330,
  avg_required_proficiency: 3.8,
  avg_observed_proficiency: 3.23,
  avg_proficiency_gap: 0.57,
  profile_coverage_pct: 89.0,
  requirement_met_pct: 51.0,
  avg_requirement_weight: 4.0,
};

const secondSkill = {
  ...skill,
  skill_id: "skill-genai",
  skill_code: "GENAI",
  skill_name: "Generative AI",
  employees_in_roles_requiring_skill: 586,
  employees_meeting_requirement: 306,
  employees_below_or_missing_requirement: 280,
  requirement_met_pct: 52.2,
};

const skillsData = {
  as_of: "2026-09-30",
  summary: {
    active_skills: 100,
    current_workforce: 10000,
    skills_with_demand: 90,
    skills_below_60_pct: 10,
    skills_below_75_pct: 20,
    weighted_requirement_met_pct: 70,
    average_profile_coverage_pct: 90,
    onet_mapped_job_profiles: 40,
    total_job_profiles: 50,
  },
  largest_gaps: [skill, secondSkill],
  highest_demand: [skill],
  strongest_coverage: [],
};

const enterpriseScope =
  enterpriseTalentEvidenceScope({
    label: "Enterprise workforce",
    asOf: "2026-09-30",
    populationLabel: "employees",
    populationCount: 10000,
    supportedBreakdowns: ["skill"],
  });

const dataAiContext = {
  country: "Global workforce",
  businessUnit: "Data & AI",
  level: "All levels",
};

function create(overrides = {}) {
  return createSkillsEvidenceHandoff({
    skillsData,
    skill,
    evidenceScope: enterpriseScope,
    selectedBusinessContext:
      dataAiContext,
    businessGoal:
      "Strengthen AI capability without increasing enterprise authorized positions.",
    userAssumptions:
      "No structural action is approved yet.",
    id: "handoff-test",
    createdAt:
      "2026-09-30T12:00:00.000Z",
    ...overrides,
  });
}

test("Data & AI business context stays separate from enterprise Skills evidence", () => {
  const result = create();
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(
    result.value.evidence.evidenceScope,
    "enterprise"
  );
  assert.equal(
    result.value.evidence.populationCount,
    10000
  );
  assert.equal(
    result.value.evidence.selectedBusinessContext
      .businessUnit,
    "Data & AI"
  );
  assert.equal(
    result.value.evidence.skill.demandPopulation,
    674
  );
  assert.equal(
    result.value.businessGoal,
    "Strengthen AI capability without increasing enterprise authorized positions."
  );
  assert.equal(
    result.value.userAssumptions,
    "No structural action is approved yet."
  );
});

test("unsupported or narrowed evidence scope is rejected", () => {
  const narrowedScope = {
    ...enterpriseScope,
    filtersApplied: {
      country: false,
      businessUnit: true,
      level: false,
    },
  };

  const result = create({
    evidenceScope: narrowedScope,
  });
  assert.equal(result.ok, false);
  assert.match(
    result.error,
    /Only explicitly company-scoped/
  );
});

test("missing source, denominator, or business goal fails closed", () => {
  assert.equal(
    create({ skillsData: null }).ok,
    false
  );

  const missingDate = {
    ...skillsData,
    as_of: "",
  };
  assert.equal(
    create({ skillsData: missingDate }).ok,
    false
  );

  const missingDenominator =
    enterpriseTalentEvidenceScope({
      label: "Enterprise workforce",
      asOf: "2026-09-30",
      populationLabel: "employees",
      populationCount: null,
      supportedBreakdowns: ["skill"],
    });
  assert.equal(
    create({
      evidenceScope: missingDenominator,
    }).ok,
    false
  );

  assert.equal(
    create({ businessGoal: "   " }).ok,
    false
  );
});

test("unchanged source validates as current", () => {
  const result = create();
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.deepEqual(
    assessSkillsEvidenceFreshness(
      result.value,
      skillsData
    ),
    {
      status: "current",
      reason:
        "The carried snapshot matches the currently loaded company Skills source.",
    }
  );
});

test("source date, denominator, and metric drift become stale", () => {
  const result = create();
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(
    assessSkillsEvidenceFreshness(
      result.value,
      {
        ...skillsData,
        as_of: "2026-10-01",
      }
    ).status,
    "stale"
  );

  assert.equal(
    assessSkillsEvidenceFreshness(
      result.value,
      {
        ...skillsData,
        summary: {
          ...skillsData.summary,
          current_workforce: 10001,
        },
      }
    ).status,
    "stale"
  );

  assert.equal(
    assessSkillsEvidenceFreshness(
      result.value,
      {
        ...skillsData,
        largest_gaps: [
          {
            ...skill,
            requirement_met_pct: 52,
          },
          secondSkill,
        ],
      }
    ).status,
    "stale"
  );
});

test("missing current source or missing skill becomes unavailable", () => {
  const result = create();
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(
    assessSkillsEvidenceFreshness(
      result.value,
      null
    ).status,
    "unavailable"
  );

  assert.equal(
    assessSkillsEvidenceFreshness(
      result.value,
      {
        ...skillsData,
        largest_gaps: [secondSkill],
      }
    ).status,
    "unavailable"
  );
});

test("business context changes are visible but do not relabel enterprise evidence", () => {
  assert.equal(
    businessContextChanged(
      dataAiContext,
      dataAiContext
    ),
    false
  );
  assert.equal(
    businessContextChanged(
      dataAiContext,
      {
        country: "United States",
        businessUnit:
          "Corporate Functions",
        level: "Director",
      }
    ),
    true
  );
});

test("a repeated explicit handoff creates an independent replacement packet", () => {
  const first = create();
  const second = create({
    skill: secondSkill,
    id: "handoff-second",
    businessGoal:
      "Explore a different capability issue.",
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!first.ok || !second.ok) return;

  assert.notEqual(
    first.value.id,
    second.value.id
  );
  assert.equal(
    first.value.evidence.skill.skillCode,
    "AI"
  );
  assert.equal(
    second.value.evidence.skill.skillCode,
    "GENAI"
  );
});

test("chat grounding states that the handoff is context only", () => {
  const source = fs.readFileSync(
    new URL(
      "../app/api/chat/route.ts",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(
    source,
    /CARRIED EVIDENCE HANDOFF/
  );
  assert.match(
    source,
    /must NEVER trigger a scenario\/tool call/
  );
  assert.match(
    source,
    /business goal is user-stated intent/
  );
  assert.match(
    source,
    /assumptions are user-stated notes/
  );
  assert.match(
    source,
    /freshness is stale, unavailable, or still checking/
  );
});
