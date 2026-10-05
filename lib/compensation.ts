// Only aggregate fields already exposed by /api/finance are permitted here.
export const COMPENSATION_COLUMNS = "org_code, org_name, org_type, headcount, fte, labor_cost_usd";

export type CompensationSourceRow = {
  org_code: string;
  org_name: string;
  org_type: string;
  headcount: unknown;
  fte: unknown;
  labor_cost_usd: unknown;
};

export type CompensationTotals = {
  headcount: number | null;
  fte: number | null;
  labor_cost_usd: number | null;
  cost_per_fte_usd: number | null;
};

export type CompensationResponse = {
  source: "finance_current_summary";
  evidence_type: "synthetic_aggregate";
  // Fixed predicate in the existing view, inspected on 2026-10-05.
  // This is a source contract, not the time of the request or a refresh date.
  snapshot_date: "2026-09-30";
  source_refreshed_at: null;
  currency: "USD";
  cost_period: null;
  employee_cost_coverage: null;
  current: CompensationTotals;
  by_business_unit: (CompensationTotals & {
    org_code: string;
    org_name: string;
    share_of_reported_cost_pct: number | null;
  })[];
};

function nonnegativeNumber(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !/^\d+(?:\.\d+)?$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function round(value: number) {
  return Number(value.toFixed(2));
}

function costPerFte(cost: number | null, fte: number | null) {
  if (cost === null || fte === null || fte <= 0) return null;
  const value = cost / fte;
  return Number.isFinite(value) ? round(value) : null;
}

function completeSum(values: (number | null)[]): number | null {
  if (!values.length || values.some(value => value === null)) return null;
  const sum = values.reduce<number>((total, value) => total + (value ?? 0), 0);
  return Number.isFinite(sum) ? round(sum) : null;
}

export function buildCompensationResponse(rows: CompensationSourceRow[]): CompensationResponse {
  const codes = new Set<string>();
  const units = rows.map(row => {
    // Do not silently sum duplicate or overlapping organizational levels.
    if (row.org_type !== "business_unit" || !row.org_code?.trim() || !row.org_name?.trim() || codes.has(row.org_code)) {
      throw new Error("Compensation aggregate scope is inconsistent.");
    }
    codes.add(row.org_code);
    const headcount = nonnegativeNumber(row.headcount);
    const fte = nonnegativeNumber(row.fte);
    const cost = nonnegativeNumber(row.labor_cost_usd);
    return {
      org_code: row.org_code,
      org_name: row.org_name,
      headcount: headcount !== null && Number.isSafeInteger(headcount) ? headcount : null,
      fte,
      labor_cost_usd: cost,
      cost_per_fte_usd: costPerFte(cost, fte),
    };
  });
  const cost = completeSum(units.map(row => row.labor_cost_usd));
  const fte = completeSum(units.map(row => row.fte));
  return {
    source: "finance_current_summary",
    evidence_type: "synthetic_aggregate",
    snapshot_date: "2026-09-30",
    source_refreshed_at: null,
    currency: "USD",
    cost_period: null,
    employee_cost_coverage: null,
    current: {
      headcount: completeSum(units.map(row => row.headcount)),
      fte,
      labor_cost_usd: cost,
      cost_per_fte_usd: costPerFte(cost, fte),
    },
    by_business_unit: units.map(row => ({
      ...row,
      share_of_reported_cost_pct: cost !== null && cost > 0 && row.labor_cost_usd !== null
        ? round(row.labor_cost_usd / cost * 100) : null,
    })).sort((a, b) => (b.labor_cost_usd ?? -1) - (a.labor_cost_usd ?? -1) || a.org_name.localeCompare(b.org_name)),
  };
}
