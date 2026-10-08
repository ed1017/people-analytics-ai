import { withDatasetRequest } from "@/lib/dataset-runtime";
import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase-server";
import { dataApiErrorResponse } from "../../../lib/data-api-error";

export const dynamic = "force-dynamic";

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function handleGET() {
  try {
    const [current, trend, businessUnits, countries, levels, tenure, movements] =
      await Promise.all([
        supabaseServer.from("workforce_current_summary").select("*").single(),
        supabaseServer.from("dashboard_headcount_trend").select("*").order("snapshot_date"),
        supabaseServer.from("workforce_business_unit_summary").select("*").order("headcount", { ascending: false }),
        supabaseServer.from("workforce_country_summary").select("*").order("headcount", { ascending: false }),
        supabaseServer.from("workforce_level_summary").select("*").order("level_rank"),
        supabaseServer.from("workforce_tenure_summary").select("*").order("tenure_sort"),
        supabaseServer.from("workforce_movement_summary").select("*").order("month"),
      ]);
    for (const result of [current, trend, businessUnits, countries, levels, tenure, movements]) {
      if (result.error) throw result.error;
    }
    if (!current.data) throw new Error("Workforce current summary returned no data.");

    return NextResponse.json({
      as_of: current.data.as_of,
      summary: Object.fromEntries(
        Object.entries(current.data).map(([key, value]) => [
          key,
          typeof value === "string" && value !== "" && !Number.isNaN(Number(value))
            ? Number(value)
            : value,
        ])
      ),
      trend: (trend.data ?? []).map((row) => ({
        snapshot_date: row.snapshot_date,
        headcount: toNumber(row.headcount),
        fte: toNumber(row.fte),
      })),
      business_units: businessUnits.data ?? [],
      countries: countries.data ?? [],
      levels: levels.data ?? [],
      tenure: tenure.data ?? [],
      movements: movements.data ?? [],
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return dataApiErrorResponse('workforce',error);
  }
}

export async function GET(request: Request) {
  return withDatasetRequest(request, () => handleGET());
}
