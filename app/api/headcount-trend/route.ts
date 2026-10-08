import { withDatasetRequest } from "@/lib/dataset-runtime";
import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase-server";

async function handleGET() {
  const { data, error } = await supabaseServer
    .from("dashboard_headcount_trend")
    .select("snapshot_date, headcount, fte")
    .order("snapshot_date", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
export async function GET(request: Request) {
  return withDatasetRequest(request, () => handleGET());
}
