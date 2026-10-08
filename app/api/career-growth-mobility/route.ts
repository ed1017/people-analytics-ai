import { withDatasetRequest } from "@/lib/dataset-runtime";
import { NextRequest, NextResponse } from "next/server";

import {
  buildCareerGrowthMobilityAggregate,
  validateCareerGrowthRequest,
  type MovementEmployeeRow,
  type MovementLevelRow,
  type MovementSourceRow,
} from "@/lib/career-growth-mobility";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

async function loadAll<T>(
  table: string,
  columns: string
) {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseServer
      .from(table)
      .select(columns)
      .range(from, from + 999);

    if (error) {
      throw new Error(
        table + ": " + error.message
      );
    }

    rows.push(...((data ?? []) as T[]));
    if ((data ?? []).length < 1000) break;
  }
  return rows;
}

async function handleGET(
  request: NextRequest
) {
  const validation =
    validateCareerGrowthRequest(
      request.method,
      request.nextUrl.searchParams
    );
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error },
      {
        status: validation.status,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  try {
    const [
      movements,
      employees,
      levels,
    ] = await Promise.all([
      loadAll<MovementSourceRow>(
        "employee_movements",
        "movement_id, employee_id, movement_date, movement_type, from_position_id, to_position_id, from_job_level_id, to_job_level_id"
      ),
      loadAll<MovementEmployeeRow>(
        "employees",
        "employee_id, employment_status, source_system"
      ),
      loadAll<MovementLevelRow>(
        "job_levels",
        "job_level_id, level_code, level_rank"
      ),
    ]);

    const payload =
      buildCareerGrowthMobilityAggregate(
        movements,
        employees,
        levels
      );

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(
      "Career Growth & Internal Mobility API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Career Growth & Internal Mobility data is unavailable.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}

async function handlePOST() {
  return NextResponse.json(
    { error: "Method not allowed." },
    {
      status: 405,
      headers: {
        Allow: "GET",
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET(request: NextRequest) {
  return withDatasetRequest(request, () => handleGET(request));
}

export async function POST(request: Request) {
  return withDatasetRequest(request, () => handlePOST());
}
