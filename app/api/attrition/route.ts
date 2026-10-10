import { withDatasetRequest } from "@/lib/dataset-runtime";
import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase-server";
import { dataApiErrorResponse } from "../../../lib/data-api-error";

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

async function handleGET(request?: Request) {
  try {
    request?.signal.throwIfAborted();
    const abort=<T extends {abortSignal:(signal:AbortSignal)=>T}>(query:T)=>request?query.abortSignal(request.signal):query;
    const [current, trend, businessUnits, levels, tenure, reasons] =
      await Promise.all([
        abort(supabaseServer.from("attrition_current_summary").select("*")).single(),
        abort(supabaseServer.from("attrition_monthly_trend").select("*").order("month")),
        abort(supabaseServer.from("attrition_business_unit_summary").select("*").order("voluntary_turnover_ytd_pct", { ascending: false })),
        abort(supabaseServer.from("attrition_level_summary").select("*").order("level_rank")),
        abort(supabaseServer.from("attrition_tenure_summary").select("*").order("tenure_sort")),
        abort(supabaseServer.from("attrition_reason_summary").select("*").order("exits", { ascending: false })),
      ]);
    for (const result of [current, trend, businessUnits, levels, tenure, reasons]) {
      if (result.error) throw result.error;
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
    return dataApiErrorResponse('attrition',error);
  }
}

export async function GET(request: Request) {
  return withDatasetRequest(request, () => handleGET(request));
}
