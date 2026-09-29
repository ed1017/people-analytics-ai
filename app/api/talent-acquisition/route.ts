import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase-server";

export const dynamic = "force-dynamic";

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET() {
  try {
    const [currentResult, sourceResult, businessUnitResult, recruiterResult, monthlyResult] = await Promise.all([
      supabaseServer.from("talent_acquisition_current_summary").select("*").single(),
      supabaseServer.from("talent_acquisition_source_summary").select("*").order("hires", { ascending: false }),
      supabaseServer.from("talent_acquisition_business_unit_summary").select("*").order("open_positions", { ascending: false }),
      supabaseServer.from("talent_acquisition_recruiter_summary").select("*").order("open_requisitions", { ascending: false }),
      supabaseServer.from("talent_acquisition_monthly_summary").select("*").order("month", { ascending: true }),
    ]);

    if (currentResult.error) throw new Error("TA current summary: " + currentResult.error.message);
    if (sourceResult.error) throw new Error("TA source summary: " + sourceResult.error.message);
    if (businessUnitResult.error) throw new Error("TA business unit summary: " + businessUnitResult.error.message);
    if (recruiterResult.error) throw new Error("TA recruiter summary: " + recruiterResult.error.message);
    if (monthlyResult.error) throw new Error("TA monthly summary: " + monthlyResult.error.message);

    const current = currentResult.data;
    if (!current) throw new Error("TA current summary returned no data.");

    return NextResponse.json({
      as_of: current.as_of,
      summary: {
        applications: toNumber(current.applications),
        interviewed_applications: toNumber(current.interviewed_applications),
        offered_applications: toNumber(current.offered_applications),
        hires: toNumber(current.hires),
        application_to_interview_pct: toNumber(current.application_to_interview_pct),
        interview_to_offer_pct: toNumber(current.interview_to_offer_pct),
        offer_to_hire_pct: toNumber(current.offer_to_hire_pct),
        application_to_hire_pct: toNumber(current.application_to_hire_pct),
        offer_acceptance_pct: toNumber(current.offer_acceptance_pct),
        open_requisitions: toNumber(current.open_requisitions),
        open_positions: toNumber(current.open_positions),
        avg_time_to_fill_days: toNumber(current.avg_time_to_fill_days),
        median_time_to_fill_days: toNumber(current.median_time_to_fill_days),
        avg_open_req_age_days: toNumber(current.avg_open_req_age_days),
        median_open_req_age_days: toNumber(current.median_open_req_age_days),
        open_reqs_over_60_days: toNumber(current.open_reqs_over_60_days),
        internal_hires: toNumber(current.internal_hires),
        external_hires: toNumber(current.external_hires),
      },
      sources: (sourceResult.data ?? []).map((row) => ({
        source_code: row.source_code,
        source_name: row.source_name,
        source_category: row.source_category,
        applications: toNumber(row.applications),
        hires: toNumber(row.hires),
        application_to_hire_pct: toNumber(row.application_to_hire_pct),
      })),
      business_units: (businessUnitResult.data ?? []).map((row) => ({
        org_code: row.org_code,
        org_name: row.org_name,
        open_requisitions: toNumber(row.open_requisitions),
        open_positions: toNumber(row.open_positions),
        applications: toNumber(row.applications),
        hires: toNumber(row.hires),
        avg_time_to_fill_days: toNumber(row.avg_time_to_fill_days),
        application_to_hire_pct: toNumber(row.application_to_hire_pct),
      })),
      recruiters: (recruiterResult.data ?? []).map((row) => ({
        recruiter_name: row.recruiter_name,
        region: row.region,
        specialty: row.specialty,
        total_requisitions: toNumber(row.total_requisitions),
        open_requisitions: toNumber(row.open_requisitions),
        open_positions: toNumber(row.open_positions),
        filled_requisitions: toNumber(row.filled_requisitions),
        avg_time_to_fill_days: toNumber(row.avg_time_to_fill_days),
      })),
      monthly: (monthlyResult.data ?? []).map((row) => ({
        month: row.month,
        applications: toNumber(row.applications),
        interviewed_applications: toNumber(row.interviewed_applications),
        offers: toNumber(row.offers),
        hires: toNumber(row.hires),
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Talent Acquisition API error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load Talent Acquisition data." }, { status: 500 });
  }
}