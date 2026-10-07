"use client";

import { useEffect, useMemo, useState } from "react";
import { filterReferenceProfiles, isOccupationCode, occupationSourceUrl, unavailableReferenceDetail, unavailableReferenceIndex, type OccupationalReferenceDetail, type OccupationalReferenceEvidence, type OccupationalReferenceIndex, type ReferenceOccupation } from "../lib/occupational-reference";
import { occupationalPublicSource, publicOccupationEvidence, publicOccupations } from "../lib/occupational-reference-public.mjs";

const linkClass = "text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4";
const inputClass = "min-h-11 w-full rounded-md border bg-background px-3 py-2 text-sm";
const cardClass = "min-w-0 rounded-lg border bg-card p-4 sm:p-5";
const shortDate = (value: string | null) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString().slice(0, 10) : "unknown";

function SourceLink({ code, children }: { code: string; children: React.ReactNode }) {
  const href = occupationSourceUrl(code);
  return href ? <a className={linkClass} href={href} target="_blank" rel="noreferrer">{children}<span className="sr-only"> (opens in a new tab)</span></a> : null;
}

export function OccupationalReference({ onEvidenceChange }: { onEvidenceChange?: (evidence: OccupationalReferenceEvidence | null) => void }) {
  const [index, setIndex] = useState<OccupationalReferenceIndex | null>(null);
  const [detail, setDetail] = useState<OccupationalReferenceDetail | null>(null);
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState("");
  const [mappingFilter, setMappingFilter] = useState<"all" | "mapped" | "unmapped">("all");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [publicCode, setPublicCode] = useState(publicOccupations[0].code);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/occupational-reference", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Reference source unavailable");
        const result = await response.json();
        if (result.kind !== "index" || !Array.isArray(result.profiles) || !Array.isArray(result.occupations) || !result.sources) throw new Error("Invalid reference response");
        if (!controller.signal.aborted) setIndex(result);
      }).catch(() => { if (!controller.signal.aborted) setIndex(unavailableReferenceIndex()); });
    return () => controller.abort();
  }, [revision]);

  const selectedProfile = index?.profiles.find((profile) => profile.id === selectedProfileId) ?? null;
  const selectedCode = selectedProfile ? selectedProfile.mapping?.code ?? "" : publicCode;
  const storedOccupation = index?.occupations.find((occupation) => occupation.code === selectedCode) ?? null;
  const publicOccupation = publicOccupationEvidence(selectedCode);
  const occupation: ReferenceOccupation | null = storedOccupation ?? (publicOccupation ? {
    code: publicOccupation.code, title: publicOccupation.title, description: publicOccupation.description,
    release: occupationalPublicSource.databaseReleaseAtReview, refreshedAt: null,
  } : null);
  const currentDetail = detail?.code === selectedCode ? detail : null;

  useEffect(() => {
    if (!isOccupationCode(selectedCode)) return;
    const controller = new AbortController();
    fetch(`/api/occupational-reference?occupation=${encodeURIComponent(selectedCode)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Occupation skills unavailable");
        const result = await response.json();
        if (result.kind !== "detail" || result.code !== selectedCode || !Array.isArray(result.essentialSkills) || !Array.isArray(result.softwareSkills) || !result.sources) throw new Error("Invalid occupation response");
        if (!controller.signal.aborted) setDetail(result);
      }).catch(() => { if (!controller.signal.aborted) setDetail(unavailableReferenceDetail(selectedCode)); });
    return () => controller.abort();
  }, [selectedCode, revision]);

  const profiles = index ? filterReferenceProfiles(index, query, mappingFilter) : [];
  const occupationChoices = useMemo(() => {
    const choices = new Map(publicOccupations.map((item) => [item.code, { code: item.code, title: item.title }]));
    for (const item of index?.occupations ?? []) choices.set(item.code, item);
    return [...choices.values()].sort((a, b) => a.title.localeCompare(b.title));
  }, [index]);
  const mappingStatus = !selectedProfile ? "Public occupation; no internal mapping selected" : index?.sources.mappings !== "ready" ? "Mapping source unavailable" : selectedProfile.mapping ? "Stored internal mapping; mapping review needed; duties match not independently verified" : "No stored occupation mapping";
  const profilesSharingOccupation = selectedProfile?.mapping && index?.sources.profiles === "ready" && index.sources.mappings === "ready"
    ? index.profiles.filter((profile) => profile.mapping?.code === selectedProfile.mapping?.code).length
    : null;
  const evidence: OccupationalReferenceEvidence = {
    population: "occupational_reference", selectedProfile: selectedProfile ? { code: selectedProfile.code, name: selectedProfile.name } : null,
    occupation, sourceMode: storedOccupation ? "stored" : "public_snapshot", mappingStatus,
    requiredSkills: selectedProfile?.requirements.slice(0, 30) ?? [], tasks: publicOccupation?.tasks ?? [],
    essentialSkills: currentDetail?.sources.essentialSkills === "ready" ? currentDetail.essentialSkills.slice(0, 20).map(({ name, importance, level }) => ({ name, importance, level })) : publicOccupation?.essentialSkills.map((name) => ({ name, importance: null, level: null })) ?? [],
    softwareSkills: currentDetail?.sources.softwareSkills === "ready" ? currentDetail.softwareSkills.slice(0, 30) : [],
    coverage: { profiles: index?.sources.profiles === "ready" ? index.profiles.length : null, mappedProfiles: index?.mappedProfileCount ?? null, profilesSharingOccupation },
    sourceStatus: { ...(index?.sources ?? { profiles: "loading", mappings: "loading", occupations: "loading", requirements: "loading", skills: "loading" }), ...(currentDetail?.sources ?? { essentialSkills: "loading", softwareSkills: "loading" }), publicExcerptCheckedAt: occupationalPublicSource.checkedAt },
  };
  const evidenceJson = JSON.stringify(evidence);
  useEffect(() => { onEvidenceChange?.(JSON.parse(evidenceJson)); }, [evidenceJson, onEvidenceChange]);
  useEffect(() => () => onEvidenceChange?.(null), [onEvidenceChange]);

  return <section aria-label="Occupational reference explorer" className="space-y-5">
    <div className={cardClass}>
      <h2 className="text-xl font-semibold">Explore roles and occupations</h2>
      <p className="mt-2 text-sm text-muted-foreground">Find an internal job profile, inspect its stored occupation mapping, and compare role requirements with external occupational guidance. A mapping does not establish employee skill attainment.</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p role="status">{!index ? "Loading job-profile sources…" : index.sources.profiles !== "ready" ? "Internal job profiles unavailable. Public references remain available below." : index.mappedProfileCount === null ? `${index.profiles.length} job profiles loaded · mapping coverage unavailable` : `${index.mappedProfileCount} of ${index.profiles.length} job profiles have a stored mapping`}</p>
        <button type="button" className="min-h-11 rounded border px-3 py-2" onClick={() => { setIndex(null); setDetail(null); setRevision((value) => value + 1); }}>Retry reference sources</button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div><label htmlFor="occupation-profile-search" className="mb-1 block text-sm font-medium">Search job profiles</label><input id="occupation-profile-search" type="search" className={inputClass} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Role, profile code or occupation" /></div>
        <div><label htmlFor="occupation-mapping-filter" className="mb-1 block text-sm font-medium">Mapping filter</label><select id="occupation-mapping-filter" className={inputClass} value={mappingFilter} onChange={(event) => setMappingFilter(event.target.value as typeof mappingFilter)} disabled={index?.sources.mappings !== "ready"}><option value="all">All profiles</option><option value="mapped">Mapped profiles</option><option value="unmapped">Unmapped profiles</option></select></div>
      </div>
      {index?.sources.profiles === "ready" && <>
        <p className="mt-3 text-sm text-muted-foreground" role="status">{profiles.length} matching job profiles</p>
        {profiles.length ? <ul className="mt-2 max-h-80 space-y-2 overflow-y-auto" aria-label="Job profiles">{profiles.map((profile) => {
          const title = index.occupations.find((item) => item.code === profile.mapping?.code)?.title;
          return <li key={profile.id}><button type="button" aria-pressed={profile.id === selectedProfileId} className={`w-full rounded-md border p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 ${profile.id === selectedProfileId ? "border-primary bg-primary/5" : "hover:bg-muted"}`} onClick={() => setSelectedProfileId(profile.id)}>
            <span className="block font-medium">{profile.name}</span><span className="mt-1 block break-words text-xs text-muted-foreground">{profile.code}{!profile.active ? " · Inactive profile" : ""} · {index.sources.mappings !== "ready" ? "Mapping source unavailable" : profile.mapping ? `${profile.mapping.code} · ${title ?? "Occupation title unavailable"}` : "No stored mapping"}</span>
          </button></li>;
        })}</ul> : <p className="mt-3 rounded border border-dashed p-4 text-sm">No job profiles match these filters.</p>}
      </>}
      {index && index.sources.mappings !== "ready" && index.sources.profiles === "ready" && <p className="mt-3 text-sm">The mapping source could not be loaded. These profiles cannot yet be classified as mapped or unmapped.</p>}
    </div>

    {selectedProfile && <article className={cardClass} aria-label="Selected internal role">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Internal job profile</p>
      <h3 className="mt-1 text-lg font-semibold">{selectedProfile.name}</h3>
      {selectedProfile.description && <p className="mt-2 text-sm">{selectedProfile.description}</p>}
      <p className="mt-2 text-sm">{mappingStatus}{selectedProfile.mapping?.method ? ` · Method: ${selectedProfile.mapping.method.replaceAll("_", " ")}` : ""}</p>
      {selectedProfile.mapping && index?.sources.mappings === "ready" && <aside aria-label="Mapping review" className="mt-4 rounded-md border bg-muted/40 p-4">
        <h4 className="font-semibold">Mapping review needed</h4>
        <p className="mt-2 text-sm">Stored mapping; compare the internal duties with the official occupation before using it for role decisions.</p>
        <p className="mt-2 break-words text-sm"><SourceLink code={selectedProfile.mapping.code}>Mapped occupation: {occupation?.title ?? "Occupation title unavailable"} ({selectedProfile.mapping.code})</SourceLink></p>
        {profilesSharingOccupation !== null && <p className="mt-2 text-sm">{profilesSharingOccupation} internal job profile{profilesSharingOccupation === 1 ? "" : "s"} mapped to this occupation. This count includes all stored profiles, including inactive profiles. Multiple profiles can share a mapping; their duties still need individual review.</p>}
      </aside>}
      <h4 className="mt-5 font-semibold">Internal role requirements</h4>
      <p className="mt-1 text-xs text-muted-foreground">Internal proficiency scale: 1–5. These are role expectations, not observed employee proficiency and not comparable to O*NET importance or level ratings.</p>
      {index?.sources.requirements !== "ready" ? <p className="mt-3 text-sm">Role requirements unavailable.</p> : selectedProfile.requirements.length ? <ul className="mt-3 grid gap-2 sm:grid-cols-2">{selectedProfile.requirements.map((requirement, position) => <li key={`${requirement.name}-${position}`} className="rounded border p-3 text-sm"><span className="font-medium">{requirement.name}</span><span className="mt-1 block text-muted-foreground">{requirement.importance} · proficiency {requirement.requiredProficiency ?? "unknown"}{requirement.requiredProficiency !== null ? " / 5" : ""}</span></li>)}</ul> : <p className="mt-3 text-sm">No stored skill requirements for this profile.</p>}
      {index?.sources.skills !== "ready" && <p className="mt-2 text-sm">Skill names unavailable from the internal catalog.</p>}
    </article>}

    <div className={cardClass}>
      <label htmlFor="public-occupation-select" className="mb-1 block font-semibold">Browse public occupations</label>
      <p className="mb-3 text-sm text-muted-foreground">{index?.sources.occupations === "ready" ? "Stored occupation catalog plus three public starter references. Choosing an occupation clears the internal-role selection." : "Three public starter references are included locally. The stored occupation catalog is unavailable."}</p>
      <select id="public-occupation-select" className={inputClass} value={selectedProfile ? "" : publicCode} onChange={(event) => { setSelectedProfileId(null); setPublicCode(event.target.value); }}>
        {selectedProfile && <option value="" disabled>Choose a public occupation</option>}
        {occupationChoices.map((item) => <option key={item.code} value={item.code}>{item.title} ({item.code})</option>)}
      </select>
    </div>

    {selectedCode && <article className={cardClass} aria-label="Selected occupation">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">External occupational reference · United States</p><h3 className="mt-1 text-xl font-semibold">{occupation?.title ?? "Occupation details unavailable"}</h3><p className="mt-1 text-sm text-muted-foreground">{selectedCode}</p></div>
        <SourceLink code={selectedCode}>View official occupation profile</SourceLink>
      </div>
      <p className="mt-3 text-sm">{occupation?.description ?? "No description is available for this stored occupation code. Use the official profile to review duties before relying on the mapping."}</p>
      <p className="mt-3 text-xs text-muted-foreground">{storedOccupation ? `Stored release label: ${storedOccupation.release ?? "unknown"} · stored refresh: ${shortDate(storedOccupation.refreshedAt)} · import not independently verified` : `Public editorial excerpt · checked ${occupationalPublicSource.checkedAt} · O*NET database ${occupationalPublicSource.databaseReleaseAtReview} at review`}. No live O*NET feed.</p>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="min-w-0" aria-label="Occupation tasks and preparation">
          <h4 className="font-semibold">Tasks and preparation</h4>
          {publicOccupation ? <><p className="mt-1 text-xs text-muted-foreground">Selected public task summaries · checked {occupationalPublicSource.checkedAt}</p><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{publicOccupation.tasks.map((task) => <li key={task}>{task}</li>)}</ul><p className="mt-4 text-sm">{publicOccupation.preparation}</p></> : <p className="mt-3 text-sm">Tasks and education or training guidance are not stored for this occupation in this app. The official profile contains the available public reference.</p>}
          <p className="mt-3 text-sm"><SourceLink code={selectedCode}>Read all tasks and preparation guidance</SourceLink></p>
        </section>
        <section className="min-w-0" aria-label="Occupation skills">
          <h4 className="font-semibold">Occupation skills</h4>
          {!currentDetail && <p className="mt-2 text-sm" role="status">Loading stored occupation skills…</p>}
          {currentDetail?.sources.essentialSkills === "ready" ? <>
            <p className="mt-1 text-xs text-muted-foreground">O*NET essential skills: importance 1–5; level 0–7. Ratings describe an occupation, not a person.</p>
            {currentDetail.essentialSkills.length ? <ul className="mt-3 space-y-2">{currentDetail.essentialSkills.map((skill, position) => <li key={`${skill.name}-${position}`} className="rounded border p-3 text-sm"><span className="font-medium">{skill.name}</span><span className="mt-1 block text-muted-foreground">Importance {skill.importance ?? "unavailable"}{skill.importance !== null ? " / 5" : ""} · Level {skill.level ?? "unavailable"}{skill.level !== null ? " / 7" : ""}</span><span className="mt-1 block text-xs text-muted-foreground">Stored release {skill.release ?? "unknown"} · updated {shortDate(skill.updatedAt)}</span></li>)}</ul> : <p className="mt-3 text-sm">No publishable essential-skill ratings in the stored source for this occupation.</p>}
            {currentDetail.suppressedRatings > 0 && <p className="mt-2 text-xs text-muted-foreground">{currentDetail.suppressedRatings} suppressed or not-relevant ratings omitted.</p>}
          </> : <>{currentDetail && <p className="mt-2 text-sm">Stored essential skills unavailable.</p>}{publicOccupation && <><p className="mt-2 text-xs text-muted-foreground">Selected essential skills from the public excerpt; ratings not included.</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{publicOccupation.essentialSkills.map((skill) => <li key={skill}>{skill}</li>)}</ul></>}</>}
        </section>
      </div>
      <section className="mt-5" aria-label="Occupation software examples"><h4 className="font-semibold">Software examples</h4><p className="mt-1 text-xs text-muted-foreground">Examples associated with the occupation; these are not company requirements or proof of proficiency.</p>
        {!currentDetail ? <p className="mt-2 text-sm">Loading stored software examples…</p> : currentDetail.sources.softwareSkills !== "ready" ? <p className="mt-2 text-sm">Stored software examples unavailable. See the official profile.</p> : currentDetail.softwareSkills.length ? <details className="mt-3 rounded border p-3"><summary className="cursor-pointer text-sm">Browse {currentDetail.softwareSkills.length} software examples</summary><ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">{currentDetail.softwareSkills.map((skill, position) => <li key={`${skill.name}-${position}`} className="break-words"><span className="font-medium">{skill.name}</span>{skill.category && <span className="block text-xs text-muted-foreground">{skill.category}</span>}<span className="block text-xs text-muted-foreground">Stored release {skill.release ?? "unknown"}</span></li>)}</ul></details> : <p className="mt-2 text-sm">No software examples in the stored source for this occupation.</p>}
      </section>
    </article>}
    {!selectedCode && selectedProfile && <p className="rounded border border-dashed p-4 text-sm">{index?.sources.mappings === "ready" ? "No occupation is mapped to this profile. Browse a public occupation independently above." : "The mapping source is unavailable. Browse a public occupation independently above."}</p>}
    <details className="rounded-lg border p-4 text-xs text-muted-foreground"><summary className="cursor-pointer font-medium">Sources and interpretation</summary><div className="mt-3 space-y-2"><p>Internal job-profile mappings and role requirements are separate from U.S. occupation-level references. No employee records are used in this explorer. Stored release and refresh values are source labels, not verified publication or import dates.</p><p>{occupationalPublicSource.attribution} Public excerpts were checked against O*NET OnLine on {occupationalPublicSource.checkedAt}; the published database release was 31.0. {occupationalPublicSource.modifications}</p><p className="flex flex-wrap gap-x-4 gap-y-2"><a className={linkClass} href={occupationalPublicSource.databaseUrl} target="_blank" rel="noreferrer">O*NET 31.0 database and files</a><a className={linkClass} href={occupationalPublicSource.licenseUrl} target="_blank" rel="noreferrer">CC BY 4.0 license</a><a className={linkClass} href="https://www.onetonline.org/help/online/scales" target="_blank" rel="noreferrer">Rating scale definitions</a></p></div></details>
  </section>;
}
