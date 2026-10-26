/** Versioned external references, separate from the synthetic workforce baseline. */
export type ExternalWorkforceEvidence = Readonly<{
  id: string
  occupation: Readonly<{ code: string; title: string; taxonomy: "2018 SOC" }>
  geography: Readonly<{ code: string | null; name: string; type: "metropolitan" }>
  referencePeriod: string
  releasedAt: string
  retrievedAt: string
  employmentJobs: number | null
  annualMeanWageUsd: number | null
  annualMedianWageUsd: number | null
  availableCandidates: null
  timeToFillDays: null
  status: "verified" | "unavailable"
  suppression: "not-checked" | "none" | "suppressed"
  source: Readonly<{ publisher: string; url: string; downloadUrl: string | null; releaseUrl: string; license: string; licenseUrl: string }>
  limitation: string
}>

const source = Object.freeze({
  publisher: "U.S. Bureau of Labor Statistics — OEWS",
  url: "https://www.bls.gov/oes/2025/may/oessrcma.htm",
  downloadUrl: null,
  releaseUrl: "https://www.bls.gov/news.release/ocwage.nr0.htm",
  license: "Public domain; BLS attribution",
  licenseUrl: "https://www.bls.gov/bls/linksite.htm",
})

/** These are source selections, not retrieved estimates. Never substitute zero. */
function pendingMetro(id: string, name: string): ExternalWorkforceEvidence {
  return Object.freeze({
    id,
    occupation: Object.freeze({ code: "15-1252", title: "Software Developers", taxonomy: "2018 SOC" as const }),
    geography: Object.freeze({ code: null, name, type: "metropolitan" as const }),
    referencePeriod: "2025-05",
    releasedAt: "2026-05-15",
    retrievedAt: "2026-10-26",
    employmentJobs: null,
    annualMeanWageUsd: null,
    annualMedianWageUsd: null,
    availableCandidates: null,
    timeToFillDays: null,
    status: "unavailable" as const,
    suppression: "not-checked" as const,
    source,
    limitation: "Source catalog verified; occupation-area estimates have not been retrieved. Employment measures jobs held, not available candidates. Wages exclude employer benefit costs. Hiring time is not supplied by this source.",
  })
}

export const EXTERNAL_WORKFORCE_EVIDENCE: readonly ExternalWorkforceEvidence[] = Object.freeze([
  pendingMetro("oews-2025-05-software-developers-new-york", "New York-Newark-Jersey City, NY-NJ"),
  pendingMetro("oews-2025-05-software-developers-boston", "Boston-Cambridge-Newton, MA-NH"),
])

/** No fuzzy or title-based matching to internal role IDs. */
export function findExternalWorkforceEvidence(id: string): ExternalWorkforceEvidence | null {
  return EXTERNAL_WORKFORCE_EVIDENCE.find((record) => record.id === id) ?? null
}

/** Qualitative reference only: no skills scores, local supply or role mapping inferred. */
export const EXTERNAL_ROLE_SKILL_SOURCES = Object.freeze([
  Object.freeze({
    occupationCode: "15-2051.01",
    occupationTitle: "Business Intelligence Analysts",
    url: "https://www.onetonline.org/link/summary/15-2051.01",
    publisher: "O*NET OnLine — U.S. Department of Labor",
    verifiedAt: "2026-10-26",
    profileUpdatedYear: 2026,
    geography: "United States",
    kind: "qualitative-role-reference" as const,
    limitation: "Occupational tasks and skill requirements; not an assessment of local workers. Wage and employment references on this profile describe the broader Data Scientists occupation.",
  }),
])
