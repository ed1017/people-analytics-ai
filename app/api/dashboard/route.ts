import { withDatasetRequest } from "@/lib/dataset-runtime";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase-server";
import { dataApiErrorResponse } from "../../../lib/data-api-error";

import { loadPerformanceRelease, parsePerformanceFilters } from "../../../lib/workforce-performance";

import {loadScopedDashboardOverview} from "../../../lib/dashboard-overview-reader";

export const dynamic = "force-dynamic";

async function handleGET(request: NextRequest) {
  const {data,scoped} = await loadScopedDashboardOverview(request);
  const filters = parsePerformanceFilters(request.nextUrl.searchParams);
  const performance_rating = scoped.workforce_filter_scope.status === "verified_rpc" && data?.overview?.snapshot_date === "2026-09-30"
    ? await loadPerformanceRelease((name, args) => supabaseServer.rpc(name, args).abortSignal(request.signal), filters, data?.overview?.headcount ?? null)
    : null;

  return NextResponse.json({ ...scoped, performance_rating }, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  return withDatasetRequest(request, async () => {
    try { return await handleGET(request); }
    catch (error) { return dataApiErrorResponse('dashboard',error); }
  });
}
