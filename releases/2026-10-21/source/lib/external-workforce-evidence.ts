import {marketEvidence} from "./oews-reference.mjs"

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

function reviewedNewYork(): ExternalWorkforceEvidence {
  const evidence = marketEvidence({soc: "15-1252", area: "35620"})!
  const pending = pendingMetro("oews-2025-05-software-developers-new-york", "New York-Newark-Jersey City, NY-NJ")
  return Object.freeze({...pending, geography: Object.freeze({...pending.geography, code: "35620"}),
    status: "verified", suppression: "none", employmentJobs: evidence.selected.TOT_EMP,
    annualMeanWageUsd: evidence.selected.A_MEAN, annualMedianWageUsd: evidence.selected.A_MEDIAN,
    source: Object.freeze({...source, downloadUrl: evidence.sourceUrl}),
    limitation: "Reviewed May 2025 extract. Employment measures jobs held, not available candidates. Wages exclude employer benefit costs. Hiring time is not supplied by this source.",
  })
}

export const EXTERNAL_WORKFORCE_EVIDENCE: readonly ExternalWorkforceEvidence[] = Object.freeze([
  reviewedNewYork(),
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

/** ONS cells use explicit suppression markers. Never coerce missing cells to zero. */
export function parseOnsPayCell(value: unknown): number | null {
  if (value === null || value === undefined || value === "" || value === "." || value === ".." || value === ":" || value === "x") return null
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error("Invalid ONS pay cell")
  return value
}

/** Only the reviewed annual/full-time/UK/SOC2020 slice is admitted by this importer. */
export function validateOnsAnnualPaySlice(input: {
  occupationCode: string; taxonomy: string; geographyCode: string; population: string;
  currency: string; measure: string; periodStart: string; periodEnd: string;
  median: unknown; mean: unknown; medianCvPercent: unknown; meanCvPercent: unknown;
}) {
  if (input.occupationCode !== "2134" || input.taxonomy !== "UK SOC 2020" || input.geographyCode !== "GB" ||
      input.population !== "full-time employee jobs; adult rates; same job more than one year" ||
      input.currency !== "GBP" || input.measure !== "annual gross pay" ||
      input.periodStart !== "2025-04-06" || input.periodEnd !== "2026-04-05") throw new Error("Unsupported ONS pay scope")
  const median = parseOnsPayCell(input.median), mean = parseOnsPayCell(input.mean)
  const medianCvPercent = parseOnsPayCell(input.medianCvPercent), meanCvPercent = parseOnsPayCell(input.meanCvPercent)
  // Unknown quality, disclosure suppression or CV above 20% must never expose a numeric estimate.
  return Object.freeze({
    median: medianCvPercent !== null && medianCvPercent <= 20 ? median : null,
    mean: meanCvPercent !== null && meanCvPercent <= 20 ? mean : null,
    medianCvPercent, meanCvPercent,
  })
}

/** A separate national pay reference, never a substitute for the selected US metro. */
export const UK_SOFTWARE_PAY_REFERENCE = Object.freeze({
  id: "ons-ashe-2026-provisional-2134-full-time-annual-gross-gb",
  occupation: Object.freeze({ code: "2134", title: "Programmers and software development professionals", taxonomy: "UK SOC 2020" }),
  geography: Object.freeze({ code: "GB", name: "United Kingdom", type: "national" }),
  population: "full-time employee jobs; adult rates; same job more than one year",
  currency: "GBP", measure: "annual gross pay", periodStart: "2025-04-06", periodEnd: "2026-04-05",
  releasedAt: "2026-10-22", retrievedAt: "2026-10-27", revision: "provisional",
  estimates: validateOnsAnnualPaySlice({
    occupationCode: "2134", taxonomy: "UK SOC 2020", geographyCode: "GB",
    population: "full-time employee jobs; adult rates; same job more than one year",
    currency: "GBP", measure: "annual gross pay", periodStart: "2025-04-06", periodEnd: "2026-04-05",
    median: 59862.5, mean: 69120.6, medianCvPercent: 2.4, meanCvPercent: 2,
  }),
  availableCandidates: null, timeToFillDays: null, employmentJobs: null,
  source: Object.freeze({
    publisher: "Office for National Statistics",
    url: "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/occupation4digitsoc2010ashetable14",
    downloadUrl: "https://www.ons.gov.uk/file?uri=%2Femploymentandlabourmarket%2Fpeopleinwork%2Fearningsandworkinghours%2Fdatasets%2Foccupation4digitsoc2010ashetable14%2F2026provisional%2Fashetable142026provisional.zip",
    archiveSha256: "4719f364d596739679d1bb492a1fc42e4c8e980a5b93ffc791e350f4ba8f4f1d",
    workbook: "PROV - Occupation  SOC20 (4) Table 14.7a   Annual pay - Gross 2026.xlsx",
    qualityWorkbook: "PROV - Occupation  SOC20 (4) Table 14.7b   Annual pay - Gross 2026 CV.xlsx",
    sheet: "Full-Time", row: 86, medianCell: "D86", meanCell: "F86",
    license: "Open Government Licence v3.0; contains public sector information licensed under the Open Government Licence v3.0",
    licenseUrl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
  }),
  limitation: "UK national occupational pay reference, not an exact mapping to an internal role or a US metro estimate. Gross employee pay is not a hiring offer or total employer cost. No currency conversion. Provisional survey estimates may be revised. Applicant availability and hiring time are not measured. Indicative job-count cells are not imported.",
})

/** Admit only the reviewed StatsCan CSV slice; quality flags travel with values. */
export function parseTorontoVacancyRow(row: Readonly<Record<string, string>>) {
  const wage = row.Statistics === "Average offered hourly wage"
  if (row.REF_DATE !== "2026-04" || row.GEO !== "Toronto, Ontario" || row.DGUID !== "2021S05003530" ||
      row["National Occupational Classification"] !== "Software engineers and designers [21231]" ||
      (!wage && row.Statistics !== "Job vacancies") || row.SCALAR_FACTOR !== "units" || row.SCALAR_ID !== "0" ||
      row.UOM !== (wage ? "Dollars" : "Number") || row.UOM_ID !== (wage ? "81" : "223") ||
      row.VECTOR !== (wage ? "v1569866985" : "v1569866984") || row.COORDINATE !== (wage ? "50.398.5" : "50.398.1") ||
      row.DECIMALS !== (wage ? "2" : "0") || row.TERMINATED !== "" || row.SYMBOL !== "") throw new Error("Unsupported StatsCan vacancy scope")
  const qualityLabels: Record<string, string> = { A: "Excellent", B: "Very good", C: "Good", D: "Acceptable", E: "Use with caution", F: "Too unreliable to publish", x: "Suppressed for confidentiality", "..": "Unavailable" }
  if (!Object.hasOwn(qualityLabels, row.STATUS)) throw new Error("Unknown StatsCan quality status")
  const missing = row.VALUE === "" || ["F", "x", ".."].includes(row.STATUS)
  if (!missing && (!/^\d+(?:\.\d+)?$/.test(row.VALUE) || !Number.isFinite(Number(row.VALUE)) || (!wage && !Number.isSafeInteger(Number(row.VALUE))))) throw new Error("Invalid StatsCan value")
  return Object.freeze({ value: missing ? null : Number(row.VALUE), quality: row.STATUS, qualityLabel: qualityLabels[row.STATUS], vector: row.VECTOR })
}

const torontoRow = Object.freeze({ REF_DATE: "2026-04", GEO: "Toronto, Ontario", DGUID: "2021S05003530", "National Occupational Classification": "Software engineers and designers [21231]", SCALAR_FACTOR: "units", SCALAR_ID: "0", SYMBOL: "", TERMINATED: "" })
export const TORONTO_SOFTWARE_VACANCY_REFERENCE = Object.freeze({
  id: "statcan-jvws-2026-q2-toronto-21231",
  occupation: Object.freeze({ code: "21231", title: "Software engineers and designers", taxonomy: "NOC 2021 version 1.0" }),
  geography: Object.freeze({ countryCode: "CA", code: "3530", dguid: "2021S05003530", name: "Toronto, Ontario", type: "economic region", taxonomy: "SGC 2021" }),
  period: "Q2 2026", periodStart: "2026-04-01", periodEnd: "2026-06-30", seasonallyAdjusted: false,
  releasedAt: "2026-09-15", retrievedAt: "2026-10-27", currency: "CAD",
  vacancies: parseTorontoVacancyRow({ ...torontoRow, Statistics: "Job vacancies", UOM: "Number", UOM_ID: "223", VECTOR: "v1569866984", COORDINATE: "50.398.1", VALUE: "1065", STATUS: "C", DECIMALS: "0" }),
  averageOfferedHourlyWage: parseTorontoVacancyRow({ ...torontoRow, Statistics: "Average offered hourly wage", UOM: "Dollars", UOM_ID: "81", VECTOR: "v1569866985", COORDINATE: "50.398.5", VALUE: "60.95", STATUS: "A", DECIMALS: "2" }),
  availableCandidates: null, timeToFillDays: null, employmentJobs: null,
  source: Object.freeze({
    publisher: "Statistics Canada", table: "14-10-0444-01",
    url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410044401",
    downloadUrl: "https://www150.statcan.gc.ca/n1/tbl/csv/14100444-eng.zip",
    archiveSha256: "bb50ed47b2b5149c481e11f7be3289f137867df7457f17d7e58e37c5ea6a0080",
    file: "14100444.csv", metadataFile: "14100444_MetaData.csv",
    releaseUrl: "https://www150.statcan.gc.ca/n1/daily-quotidien/260915/dq260915a-eng.htm",
    guideUrl: "https://www150.statcan.gc.ca/n1/pub/75-514-g/75-514-g2024001-eng.htm",
    license: "Statistics Canada Open Licence",
    licenseUrl: "https://www.statcan.gc.ca/en/terms-conditions/open-licence",
    attribution: "Adapted from Statistics Canada, Job Vacancy and Wage Survey, Table 14-10-0444-01, Q2 2026. This does not constitute an endorsement by Statistics Canada of this product.",
  }),
  limitation: "Employer demand, not available applicants or a count of hires during the quarter. Toronto economic region is not Toronto city or its census metropolitan area. Occupation is a reference category, not an automatic internal-role mapping. Offered wages exclude overtime, tips, commissions and bonuses; employers report the lower end of pay ranges. Actual pay on hiring can differ. Not total employer cost. No currency conversion or annualization.",
})
