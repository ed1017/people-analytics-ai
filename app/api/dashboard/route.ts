import { withDatasetRequest } from "@/lib/dataset-runtime";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase-server";

import { loadPerformanceRelease, parsePerformanceFilters } from "../../../lib/workforce-performance";

import {dashboardRequestedFilters,scopedDashboardResponse} from "../../../lib/dashboard-scope";

export const dynamic = "force-dynamic";

function normalizeFilter(value: string | null) {
  if (!value || value === "all") {
    return null;
  }

  return value;
}

async function handleGET(request: NextRequest) {
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

  const scoped = scopedDashboardResponse(data,dashboardRequestedFilters(request.nextUrl.searchParams));
  const filters = parsePerformanceFilters(request.nextUrl.searchParams);
  const performance_rating = scoped.workforce_filter_scope.status === "verified_rpc" && data?.overview?.snapshot_date === "2026-09-30"
    ? await loadPerformanceRelease((name, args) => supabaseServer.rpc(name, args), filters, data?.overview?.headcount ?? null)
    : null;

  return NextResponse.json({ ...scoped, performance_rating }, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  return withDatasetRequest(request, () => handleGET(request));
}
