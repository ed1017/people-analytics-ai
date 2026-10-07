export type ReferenceStatus = "ready" | "unavailable";
export type ReferenceSourceKey = "profiles" | "mappings" | "occupations" | "requirements" | "skills";
export type ReferenceSources = Record<ReferenceSourceKey, ReferenceStatus>;
export type ReferenceOccupation = { code: string; title: string; description: string | null; release: string | null; refreshedAt: string | null };
export type ReferenceRequirement = { name: string; requiredProficiency: number | null; importance: string };
export type ReferenceProfile = {
  id: string; code: string; name: string; description: string | null; active: boolean;
  mapping: { code: string; method: string | null } | null;
  requirements: ReferenceRequirement[];
};
export type OccupationalReferenceIndex = {
  kind: "index"; profiles: ReferenceProfile[]; occupations: ReferenceOccupation[];
  sources: ReferenceSources; mappedProfileCount: number | null;
};
export type ReferenceEssentialSkill = { name: string; importance: number | null; level: number | null; release: string | null; updatedAt: string | null };
export type OccupationalReferenceDetail = {
  kind: "detail"; code: string;
  essentialSkills: ReferenceEssentialSkill[];
  softwareSkills: { name: string; category: string | null; release: string | null }[];
  sources: { essentialSkills: ReferenceStatus; softwareSkills: ReferenceStatus };
  suppressedRatings: number;
};
export type OccupationalReferenceEvidence = {
  population: "occupational_reference";
  selectedProfile: { code: string; name: string } | null;
  occupation: ReferenceOccupation | null;
  sourceMode: "stored" | "public_snapshot";
  mappingStatus: string; requiredSkills: ReferenceRequirement[];
  tasks: string[]; essentialSkills: { name: string; importance: number | null; level: number | null }[];
  softwareSkills: { name: string; category: string | null; release: string | null }[];
  coverage: { profiles: number | null; mappedProfiles: number | null; profilesSharingOccupation: number | null };
  sourceStatus: Record<string, string>;
};

type Row = Record<string, unknown>;
export type ReferenceReadSpec = { table: string; columns: string; order: string; equal?: { column: string; value: string }; from: number; to: number };
export type ReferenceReader = (spec: ReferenceReadSpec) => Promise<{ data: Row[] | null; error: unknown }>;
type Rows = { rows: Row[]; status: ReferenceStatus };

const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const number = (value: unknown): number | null => value === null || value === undefined || value === "" || typeof value === "boolean" ? null : Number.isFinite(Number(value)) ? Number(value) : null;
const range = (value: unknown, minimum: number, maximum: number) => { const parsed = number(value); return parsed !== null && parsed >= minimum && parsed <= maximum ? parsed : null; };
export const isOccupationCode = (code: string) => /^\d{2}-\d{4}\.\d{2}$/.test(code);
export const occupationSourceUrl = (code: string) => isOccupationCode(code) ? `https://www.onetonline.org/link/summary/${code}` : null;

/** Paginate every table; incomplete reads must never become an apparent full count. */
async function readAll(reader: ReferenceReader, spec: Omit<ReferenceReadSpec, "from" | "to">): Promise<Rows> {
  try {
    const rows: Row[] = [];
    for (let from = 0; from < 10000; from += 500) {
      const result = await reader({ ...spec, from, to: from + 499 });
      if (result.error || !Array.isArray(result.data)) return { rows: [], status: "unavailable" };
      rows.push(...result.data);
      if (result.data.length < 500) return { rows, status: "ready" };
    }
  } catch { /* Do not expose database errors or credential details. */ }
  return { rows: [], status: "unavailable" };
}

export function unavailableReferenceIndex(): OccupationalReferenceIndex {
  return { kind: "index", profiles: [], occupations: [], mappedProfileCount: null, sources: { profiles: "unavailable", mappings: "unavailable", occupations: "unavailable", requirements: "unavailable", skills: "unavailable" } };
}

export function unavailableReferenceDetail(code: string): OccupationalReferenceDetail {
  return { kind: "detail", code, essentialSkills: [], softwareSkills: [], suppressedRatings: 0, sources: { essentialSkills: "unavailable", softwareSkills: "unavailable" } };
}

export async function loadOccupationalReferenceIndex(reader: ReferenceReader): Promise<OccupationalReferenceIndex> {
  const [profiles, mappings, occupations, requirements, skills] = await Promise.all([
    readAll(reader, { table: "job_profiles", columns: "job_profile_id,job_profile_code,job_profile_name,description,active", order: "job_profile_id" }),
    readAll(reader, { table: "job_onet_mapping", columns: "job_profile_id,onetsoc_code,mapping_method", order: "job_profile_id" }),
    readAll(reader, { table: "onet_occupations", columns: "onetsoc_code,occupation_title,occupation_description,onet_release,refreshed_at", order: "onetsoc_code" }),
    readAll(reader, { table: "job_skill_requirements", columns: "job_skill_requirement_id,job_profile_id,skill_id,required_proficiency,importance", order: "job_skill_requirement_id" }),
    readAll(reader, { table: "skills", columns: "skill_id,skill_name", order: "skill_id" }),
  ]);
  const mappingById = new Map(mappings.rows.map((row) => [text(row.job_profile_id), row]));
  const skillById = new Map(skills.rows.map((row) => [text(row.skill_id), text(row.skill_name)]));
  const normalizedProfiles: ReferenceProfile[] = profiles.rows.flatMap((row) => {
    const id = text(row.job_profile_id), code = text(row.job_profile_code), name = text(row.job_profile_name);
    if (!id || !code || !name) return [];
    const mapping = mappingById.get(id), occupationCode = text(mapping?.onetsoc_code);
    return [{ id, code, name, description: text(row.description), active: row.active === true,
      mapping: occupationCode ? { code: occupationCode, method: text(mapping?.mapping_method) } : null,
      requirements: requirements.rows.filter((requirement) => requirement.job_profile_id === id).map((requirement) => ({ name: skillById.get(text(requirement.skill_id)) ?? "Skill name unavailable", requiredProficiency: range(requirement.required_proficiency, 1, 5), importance: text(requirement.importance) ?? "Unspecified" })).sort((a, b) => a.name.localeCompare(b.name)),
    }];
  }).sort((a, b) => a.name.localeCompare(b.name));
  const normalizedOccupations = occupations.rows.flatMap((row) => {
    const code = text(row.onetsoc_code), title = text(row.occupation_title);
    return code && title && isOccupationCode(code) ? [{ code, title, description: text(row.occupation_description), release: text(row.onet_release), refreshedAt: text(row.refreshed_at) }] : [];
  }).sort((a, b) => a.title.localeCompare(b.title));
  return { kind: "index", profiles: normalizedProfiles, occupations: normalizedOccupations,
    mappedProfileCount: profiles.status === "ready" && mappings.status === "ready" ? normalizedProfiles.filter((profile) => profile.mapping).length : null,
    sources: { profiles: profiles.status, mappings: mappings.status, occupations: occupations.status, requirements: requirements.status, skills: skills.status },
  };
}

export async function loadOccupationalReferenceDetail(reader: ReferenceReader, code: string): Promise<OccupationalReferenceDetail> {
  if (!isOccupationCode(code)) throw new Error("Invalid occupation code");
  const equal = { column: "onetsoc_code", value: code };
  const [essential, software] = await Promise.all([
    readAll(reader, { table: "onet_essential_skills", columns: "row_key,onetsoc_code,element_id,element_name,scale_id,data_value,recommend_suppress,not_relevant,onet_release,date_updated", order: "row_key", equal }),
    readAll(reader, { table: "onet_software_skills", columns: "row_key,onetsoc_code,workplace_example,element_name,onet_release", order: "row_key", equal }),
  ]);
  const skillMap = new Map<string, ReferenceEssentialSkill>();
  let suppressedRatings = 0;
  for (const row of essential.rows) {
    if (row.onetsoc_code !== code) continue;
    if (row.recommend_suppress === true || row.not_relevant === true) { suppressedRatings++; continue; }
    const name = text(row.element_name), id = text(row.element_id), release = text(row.onet_release);
    if (!name || !id || !["IM", "LV"].includes(String(row.scale_id))) continue;
    const key = `${id}|${release ?? "unknown"}`, current = skillMap.get(key) ?? { name, importance: null, level: null, release, updatedAt: text(row.date_updated) };
    if (row.scale_id === "IM") current.importance = range(row.data_value, 1, 5);
    if (row.scale_id === "LV") current.level = range(row.data_value, 0, 7);
    skillMap.set(key, current);
  }
  return { kind: "detail", code, sources: { essentialSkills: essential.status, softwareSkills: software.status }, suppressedRatings,
    essentialSkills: [...skillMap.values()].sort((a, b) => (b.importance ?? -1) - (a.importance ?? -1) || a.name.localeCompare(b.name)),
    softwareSkills: software.rows.flatMap((row) => row.onetsoc_code === code && text(row.workplace_example) ? [{ name: text(row.workplace_example)!, category: text(row.element_name), release: text(row.onet_release) }] : []).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export function filterReferenceProfiles(index: OccupationalReferenceIndex, query: string, mapping: "all" | "mapped" | "unmapped" = "all") {
  const term = query.trim().toLocaleLowerCase();
  const titles = new Map(index.occupations.map((occupation) => [occupation.code, occupation.title]));
  return index.profiles.filter((profile) => {
    if (mapping !== "all" && index.sources.mappings !== "ready") return false;
    if (mapping === "mapped" && !profile.mapping || mapping === "unmapped" && profile.mapping) return false;
    return [profile.code, profile.name, profile.mapping?.code, titles.get(profile.mapping?.code ?? "")].join(" ").toLocaleLowerCase().includes(term);
  });
}
