import test from "node:test";
import assert from "node:assert/strict";
import { filterReferenceProfiles, loadOccupationalReferenceDetail, loadOccupationalReferenceIndex, occupationSourceUrl, unavailableReferenceIndex } from "../lib/occupational-reference.ts";
import { occupationalPublicSource, publicOccupationEvidence, publicOccupations } from "../lib/occupational-reference-public.mjs";

// Deliberately synthetic profiles. Public occupation codes do not imply a real company mapping.
const fixture = () => ({
  job_profiles: [
    { job_profile_id: "synthetic-1", job_profile_code: "SYN-DEV", job_profile_name: "Synthetic Engineer", description: "Synthetic role", active: true },
    { job_profile_id: "synthetic-2", job_profile_code: "SYN-OPEN", job_profile_name: "Synthetic Unmapped Role", active: true },
  ],
  job_onet_mapping: [{ job_profile_id: "synthetic-1", onetsoc_code: "15-1252.00", mapping_method: "synthetic_test_mapping" }],
  onet_occupations: [{ onetsoc_code: "15-1252.00", occupation_title: "Software Developers", occupation_description: "Synthetic stored description", onet_release: "test-release", refreshed_at: "2026-01-01" }],
  job_skill_requirements: [{ job_skill_requirement_id: "synthetic-req", job_profile_id: "synthetic-1", skill_id: "synthetic-skill", required_proficiency: 3, importance: "required" }],
  skills: [{ skill_id: "synthetic-skill", skill_name: "Synthetic coding skill" }],
});
const readerFor = (tables, failed = []) => async ({ table, from, to }) => failed.includes(table) ? { data: null, error: new Error("Synthetic unavailable") } : { data: (tables[table] ?? []).slice(from, to + 1), error: null };

test("profile search joins mapped occupations and retains unmapped profiles with internal requirements", async () => {
  const result = await loadOccupationalReferenceIndex(readerFor(fixture()));
  assert.equal(result.mappedProfileCount, 1);
  assert.equal(result.profiles.length, 2);
  assert.equal(result.profiles[0].requirements[0].requiredProficiency, 3);
  assert.equal(result.profiles[0].requirements[0].name, "Synthetic coding skill");
  assert.equal(filterReferenceProfiles(result, " software developers ")[0].code, "SYN-DEV");
  assert.equal(filterReferenceProfiles(result, "15-1252.00")[0].code, "SYN-DEV");
  assert.equal(filterReferenceProfiles(result, "", "unmapped")[0].code, "SYN-OPEN");
  assert.equal(filterReferenceProfiles(result, "impossible").length, 0);
});

test("mapping failure preserves profiles and requirements without reporting zero mapped profiles", async () => {
  const result = await loadOccupationalReferenceIndex(readerFor(fixture(), ["job_onet_mapping"]));
  assert.equal(result.mappedProfileCount, null);
  assert.equal(result.sources.mappings, "unavailable");
  assert.equal(result.sources.requirements, "ready");
  assert.equal(result.profiles.length, 2);
  assert.equal(filterReferenceProfiles(result, "", "unmapped").length, 0);
  assert.equal(filterReferenceProfiles(result, "", "mapped").length, 0);
});

test("occupation-source failure preserves exact mapping codes without inferring titles", async () => {
  const result = await loadOccupationalReferenceIndex(readerFor(fixture(), ["onet_occupations"]));
  assert.equal(result.mappedProfileCount, 1);
  assert.equal(result.profiles[0].mapping.code, "15-1252.00");
  assert.deepEqual(result.occupations, []);
  assert.equal(result.sources.occupations, "unavailable");
});

test("pagination reads beyond the API default cap before calculating profile coverage", async () => {
  const tables = fixture();
  tables.job_profiles = Array.from({ length: 1016 }, (_, i) => ({ job_profile_id: `synthetic-${i}`, job_profile_code: `SYN-${i}`, job_profile_name: `Synthetic role ${i}`, active: true }));
  const calls = [];
  const reader = readerFor(tables);
  const result = await loadOccupationalReferenceIndex(async (spec) => { calls.push(spec); return reader(spec); });
  assert.equal(result.profiles.length, 1016);
  assert.deepEqual(calls.filter((call) => call.table === "job_profiles").map((call) => call.from), [0, 500, 1000]);
  assert.equal(calls.some((call) => /employee|position|dashboard|snapshot/.test(call.table)), false);
  assert.equal(calls.some((call) => call.columns.includes("*")), false);
});

test("a failed later page never publishes an incomplete profile count", async () => {
  const tables = fixture();
  tables.job_profiles = Array.from({ length: 501 }, (_, i) => ({ job_profile_id: `synthetic-${i}`, job_profile_code: `SYN-${i}`, job_profile_name: `Synthetic role ${i}`, active: true }));
  const reader = readerFor(tables);
  const result = await loadOccupationalReferenceIndex(async (spec) => spec.table === "job_profiles" && spec.from === 500 ? { error: "Synthetic page failure", data: null } : reader(spec));
  assert.equal(result.sources.profiles, "unavailable");
  assert.deepEqual(result.profiles, []);
  assert.equal(result.mappedProfileCount, null);
  assert.equal(result.sources.occupations, "ready");
});

test("missing skill names and proficiency stay unknown; no implicit zero attainment", async () => {
  const tables = fixture();
  tables.job_skill_requirements[0].required_proficiency = null;
  const result = await loadOccupationalReferenceIndex(readerFor(tables, ["skills"]));
  assert.equal(result.profiles[0].requirements[0].name, "Skill name unavailable");
  assert.equal(result.profiles[0].requirements[0].requiredProficiency, null);
  assert.equal(result.sources.skills, "unavailable");
  assert.equal(JSON.stringify(result).includes("employees_meeting"), false);
});

test("essential skills retain their distinct scales and omit suppressed or irrelevant ratings", async () => {
  const base = { onetsoc_code: "15-1252.00", element_id: "synthetic-element", element_name: "Synthetic skill", onet_release: "31.0", date_updated: "2026-01-01" };
  const tables = {
    onet_essential_skills: [
      { ...base, scale_id: "IM", data_value: "4.2" },
      { ...base, scale_id: "LV", data_value: "5.1" },
      { ...base, element_id: "suppressed", scale_id: "IM", data_value: 4.8, recommend_suppress: true },
      { ...base, element_id: "irrelevant", scale_id: "LV", data_value: 0, not_relevant: true },
      { ...base, element_id: "bad-rating", element_name: "Invalid rating", scale_id: "IM", data_value: 99 },
      { ...base, onetsoc_code: "29-1141.00", element_id: "wrong-code", scale_id: "IM", data_value: 5 },
    ],
    onet_software_skills: [{ onetsoc_code: "15-1252.00", workplace_example: "Synthetic software", element_name: "Development software", onet_release: "31.0" }],
  };
  const calls = [];
  const reader = readerFor(tables);
  const result = await loadOccupationalReferenceDetail(async (spec) => { calls.push(spec); return reader(spec); }, "15-1252.00");
  assert.equal(result.essentialSkills.length, 2);
  assert.equal(result.essentialSkills[0].importance, 4.2);
  assert.equal(result.essentialSkills[0].level, 5.1);
  assert.equal(result.essentialSkills[1].importance, null);
  assert.equal(result.suppressedRatings, 2);
  assert.equal(result.softwareSkills[0].name, "Synthetic software");
  assert.ok(calls.every((call) => call.equal.column === "onetsoc_code" && call.equal.value === "15-1252.00"));
});

test("essential-skill failure does not erase software examples or expose database errors", async () => {
  const result = await loadOccupationalReferenceDetail(readerFor({ onet_software_skills: [{ onetsoc_code: "15-1252.00", workplace_example: "Synthetic software" }] }, ["onet_essential_skills"]), "15-1252.00");
  assert.equal(result.sources.essentialSkills, "unavailable");
  assert.equal(result.sources.softwareSkills, "ready");
  assert.equal(result.softwareSkills.length, 1);
  assert.equal(JSON.stringify(result).includes("Synthetic unavailable"), false);
});

test("different stored releases are not combined into a single skill rating", async () => {
  const common = { onetsoc_code: "15-1252.00", element_id: "synthetic", element_name: "Synthetic skill" };
  const result = await loadOccupationalReferenceDetail(readerFor({ onet_essential_skills: [{ ...common, scale_id: "IM", data_value: 4, onet_release: "31.0" }, { ...common, scale_id: "LV", data_value: 5, onet_release: "30.0" }] }), "15-1252.00");
  assert.equal(result.essentialSkills.length, 2);
  assert.equal(result.essentialSkills.some((skill) => skill.importance !== null && skill.level !== null), false);
});

test("occupation links are restricted to valid codes and invalid detail requests perform no read", async () => {
  for (const code of ["javascript:alert(1)", "15-1252", "15-1252.00/../../admin", "https://example.com"]) {
    assert.equal(occupationSourceUrl(code), null);
    await assert.rejects(loadOccupationalReferenceDetail(() => { throw new Error("must not read"); }, code), /Invalid occupation code/);
  }
  assert.equal(occupationSourceUrl("15-1252.00"), "https://www.onetonline.org/link/summary/15-1252.00");
});

test("public starter excerpts remain explicitly external and have direct official provenance", () => {
  assert.equal(publicOccupations.length, 3);
  assert.equal(occupationalPublicSource.databaseReleaseAtReview, "31.0");
  assert.ok(occupationalPublicSource.checkedAt);
  for (const occupation of publicOccupations) {
    assert.equal(publicOccupationEvidence(occupation.code), occupation);
    assert.equal(occupation.sourceUrl, occupationSourceUrl(occupation.code));
    assert.ok(occupation.tasks.length && occupation.essentialSkills.length && occupation.preparation);
    assert.equal("mapping" in occupation, false);
  }
  assert.equal(publicOccupationEvidence("00-0000.00"), null);
  assert.equal(unavailableReferenceIndex().mappedProfileCount, null);
});
