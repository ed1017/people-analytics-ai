import { withDatasetRequest } from "@/lib/dataset-runtime";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

async function handleGET() {
  const { count, error } = await supabaseServer
    .from("employees")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("employment_status", "active");

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    headcount: count,
  });
}
export async function GET(request: Request) {
  return withDatasetRequest(request, () => handleGET());
}
