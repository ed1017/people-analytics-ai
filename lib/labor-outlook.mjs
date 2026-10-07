import fixture from "./data/bls-projections-2025-2035.json" with { type: "json" };

export const outlookProvenance = Object.freeze({
  source: fixture.source,
  sourceTable: fixture.source_table,
  sourceUrl: fixture.source_url,
  releaseUrl: fixture.release_url,
  definitionsUrl: fixture.definitions_url,
  releaseDate: fixture.release_date,
  verifiedAt: fixture.verified_at,
  baseYear: fixture.base_year,
  projectionYear: fixture.projection_year,
  period: `${fixture.base_year}–${fixture.projection_year}`,
  geography: fixture.geography,
  employmentUnit: fixture.employment_unit,
  openingsUnit: fixture.openings_unit,
  population: fixture.population,
});

// Exact detailed BLS occupation codes only. Never infer a company role or locality.
export function nationalOutlookEvidence(soc) {
  if (typeof soc !== "string") return null;
  const row = fixture.records.find(record => record.soc === soc);
  if (!row) return null;
  return {
    ...outlookProvenance,
    selected: { ...row },
    limitations: "National projections only, not a state or metro forecast, current vacancies, available candidates or company hiring demand. Openings include growth and occupational separations; they are not only new jobs. Employment is total jobs including self-employment, so do not join the base or growth rate to May 2025 OEWS employment. Growth is over the whole decade, not annual growth. Values retain published rounding; projections are not guarantees. No internal workforce mapping is inferred.",
  };
}

export function nationalOutlookComparisons() {
  return fixture.records.map(row => nationalOutlookEvidence(row.soc));
}
