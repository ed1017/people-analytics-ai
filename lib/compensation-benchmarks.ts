import wages from "./data/compensation-oews-may2025.json" with { type: "json" };
import occupations from "./data/compensation-onet31.json" with { type: "json" };

export const benchmarkProvenance = {
  period: wages.period,
  releaseDate: wages.release_date,
  verifiedAt: wages.verified_at,
  onet: occupations,
};

export const benchmarkOccupations = occupations.records;
export const benchmarkAreas = [
  { code: "99", label: "United States", kind: "National" },
  { code: "36", label: "New York State", kind: "State" },
  { code: "35620", label: "New York–Newark–Jersey City, NY-NJ", kind: "Metro" },
] as const;
export const wagePercentiles = [
  { field: "A_PCT10", label: "10th" },
  { field: "A_PCT25", label: "25th" },
  { field: "A_MEDIAN", label: "50th (median)" },
  { field: "A_PCT75", label: "75th" },
  { field: "A_PCT90", label: "90th" },
] as const;

export type PublishedEstimate =
  | { status: "published"; value: number }
  | { status: "top_coded"; lowerBound: number }
  | { status: "unavailable"; marker: string | null };

export function readOewsEstimate(value: unknown, kind: "annual_wage" | "employment" | "prse"): PublishedEstimate {
  // Keep disclosure markers distinct from real zero. Never interpolate them.
  if (value === "#" && kind === "annual_wage") return { status: "top_coded", lowerBound: wages.annual_top_code_usd };
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return { status: "published", value };
  return { status: "unavailable", marker: value === "*" || value === "**" || value === "#" ? value : null };
}

export function formatOewsEstimate(estimate: PublishedEstimate, currency = false): string {
  const formatter = new Intl.NumberFormat("en-US", currency
    ? { style: "currency", currency: "USD", maximumFractionDigits: 0 }
    : { maximumFractionDigits: 1 });
  if (estimate.status === "top_coded") return `≥ ${formatter.format(estimate.lowerBound)}`;
  if (estimate.status === "unavailable") return estimate.marker ? `Unavailable (${estimate.marker})` : "Unavailable";
  return formatter.format(estimate.value);
}

export function compensationBenchmark(onetCode: string, areaCode: string) {
  // Explicit reviewed pairs only; no prefix stripping, fuzzy role match or URL input.
  const occupation = benchmarkOccupations.find(row => row.onet_code === onetCode);
  const area = benchmarkAreas.find(row => row.code === areaCode);
  if (!occupation || !area) return null;
  const row = wages.records.find(row => row.OCC_CODE === occupation.soc_code && row.AREA === areaCode);
  if (!row) return null;
  const source = wages.sources.find(source => source.name === row.source_workbook);
  if (!source) return null;
  return {
    occupation,
    area,
    percentiles: wagePercentiles.map(percentile => ({ ...percentile, estimate: readOewsEstimate(row[percentile.field], "annual_wage") })),
    employment: readOewsEstimate(row.TOT_EMP, "employment"),
    employmentPrse: readOewsEstimate(row.EMP_PRSE, "prse"),
    source,
    sourceRow: row.source_row,
  };
}
