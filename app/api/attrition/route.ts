import { withDatasetRequest } from "@/lib/dataset-runtime";
import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase-server";

export const dynamic = "force-dynamic";

function numericRows(rows: Record<string, unknown>[]) {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        typeof value === "string" && value !== "" && !Number.isNaN(Number(value))
          ? Number(value)
          : value,
      ])
    )
  );
}

async function handleGET() {
  try {
    const [current, trend, businessUnits, levels, tenure, reasons] =
      await Promise.all([
        supabaseServer.from("attrition_current_summary").select("*").single(),
        supabaseServer.from("attrition_monthly_trend").select("*").order("month"),
        supabaseServer.from("attrition_business_unit_summary").select("*").order("voluntary_turnover_ytd_pct", { ascending: false }),
        supabaseServer.from("attrition_level_summary").select("*").order("level_rank"),
        supabaseServer.from("attrition_tenure_summary").select("*").order("tenure_sort"),
        supabaseServer.from("attrition_reason_summary").select("*").order("exits", { ascending: false }),
      ]);
    for (const result of [current, trend, businessUnits, levels, tenure, reasons]) {
      if (result.error) throw new Error("Attrition analytics: " + result.error.message);
    }
    if (!current.data) throw new Error("Attrition current summary returned no data.");

    return NextResponse.json({
      as_of: current.data.as_of,
      summary: numericRows([current.data as Record<string, unknown>])[0],
      trend: numericRows((trend.data ?? []) as Record<string, unknown>[]),
      business_units: numericRows((businessUnits.data ?? []) as Record<string, unknown>[]),
      levels: numericRows((levels.data ?? []) as Record<string, unknown>[]),
      tenure: numericRows((tenure.data ?? []) as Record<string, unknown>[]),
      reasons: numericRows((reasons.data ?? []) as Record<string, unknown>[]),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Attrition API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load attrition analytics." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return withDatasetRequest(request, () => handleGET());
}
