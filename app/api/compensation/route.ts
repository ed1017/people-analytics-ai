import { withDatasetRequest } from "@/lib/dataset-runtime";
import { supabaseServer } from "../../../lib/supabase-server";
import { buildCompensationResponse, COMPENSATION_COLUMNS } from "../../../lib/compensation";

export const dynamic = "force-dynamic";

async function handleGET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const { data, error, count } = await supabaseServer
      .from("finance_current_summary")
      .select(COMPENSATION_COLUMNS, { count: "exact" });
    // A capped response must not be presented as a company total.
    if (error || !data || count === null || count !== data.length) {
      throw new Error("Compensation aggregate source unavailable or incomplete.");
    }
    return Response.json(buildCompensationResponse(data), { headers });
  } catch {
    return Response.json(
      { error: "Compensation cost context is unavailable. Try again." },
      { status: 503, headers },
    );
  }
}

export async function GET(request?: Request) {
  return withDatasetRequest(request, () => handleGET());
}
