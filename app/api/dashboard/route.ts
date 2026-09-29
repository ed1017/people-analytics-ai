import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase-server";

export const dynamic = "force-dynamic";

function normalizeFilter(value: string | null) {
  if (!value || value === "all") {
    return null;
  }

  return value;
}

export async function GET(request: NextRequest) {
  const country = normalizeFilter(
    request.nextUrl.searchParams.get("country")
  );
  const org = normalizeFilter(
    request.nextUrl.searchParams.get("org")
  );
  const level = normalizeFilter(
    request.nextUrl.searchParams.get("level")
  );

  const { data, error } = await supabaseServer.rpc(
    "dashboard_overview_filtered",
    {
      p_country_code: country,
      p_org_code: org,
      p_level_code: level,
    }
  );

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
