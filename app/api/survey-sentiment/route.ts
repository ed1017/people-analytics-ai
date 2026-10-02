import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase-server";
import { generateExitEnpsScores, localExitEnpsEnabled, summarizeExitEnps, surveyDimensionsForRetrieval } from "../../../lib/exit-enps";

export const dynamic = "force-dynamic";

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET() {
  try {
    const [
      currentResult,
      trendResult,
      dimensionsResult,
      businessUnitResult,
      exitReasonResult,
    ] = await Promise.all([
      supabaseServer
        .from("survey_listening_current_summary")
        .select("*")
        .single(),
      supabaseServer
        .from("survey_listening_engagement_trend")
        .select("*")
        .order("launch_date", { ascending: true }),
      supabaseServer
        .from("survey_listening_dimension_summary")
        .select("*"),
      supabaseServer
        .from("survey_listening_business_unit_summary")
        .select("*")
        .order("favorable_pct", { ascending: true }),
      supabaseServer
        .from("survey_listening_exit_reason_summary")
        .select("*")
        .order("exits", { ascending: false }),
    ]);

    if (currentResult.error) {
      throw new Error("Listening current summary: " + currentResult.error.message);
    }
    if (trendResult.error) {
      throw new Error("Engagement trend: " + trendResult.error.message);
    }
    if (dimensionsResult.error) {
      throw new Error("Listening dimensions: " + dimensionsResult.error.message);
    }
    if (businessUnitResult.error) {
      throw new Error("Listening business units: " + businessUnitResult.error.message);
    }
    if (exitReasonResult.error) {
      throw new Error("Exit reasons: " + exitReasonResult.error.message);
    }

    const current = currentResult.data;
    if (!current) {
      throw new Error("Listening current summary returned no data.");
    }

    const replacementEnabled = localExitEnpsEnabled();
    const dimensions = surveyDimensionsForRetrieval(dimensionsResult.data ?? [], replacementEnabled).map((row) => ({
      survey_code: row.survey_code,
      survey_name: row.survey_name,
      survey_type: row.survey_type,
      question_code: row.question_code,
      dimension: row.dimension,
      question_text: row.question_text,
      employee_respondents: toNumber(row.employee_respondents),
      candidate_respondents: toNumber(row.candidate_respondents),
      separation_respondents: toNumber(row.separation_respondents),
      avg_score: toNumber(row.avg_score),
      favorable_pct: toNumber(row.favorable_pct),
    }));

    return NextResponse.json(
      {
        as_of: current.as_of,
        exit_enps: replacementEnabled ? summarizeExitEnps(generateExitEnpsScores()) : null,
        summary: {
          engagement_respondents: toNumber(current.engagement_respondents),
          engagement_eligible_population: toNumber(current.engagement_eligible_population),
          engagement_participation_pct: toNumber(current.engagement_participation_pct),
          engagement_avg_score: toNumber(current.engagement_avg_score),
          engagement_favorable_pct: toNumber(current.engagement_favorable_pct),
          pulse_respondents: toNumber(current.pulse_respondents),
          pulse_avg_score: toNumber(current.pulse_avg_score),
          pulse_favorable_pct: toNumber(current.pulse_favorable_pct),
          manager_respondents: toNumber(current.manager_respondents),
          manager_avg_score: toNumber(current.manager_avg_score),
          manager_favorable_pct: toNumber(current.manager_favorable_pct),
          onboarding_90_respondents: toNumber(current.onboarding_90_respondents),
          onboarding_90_avg_score: toNumber(current.onboarding_90_avg_score),
          onboarding_90_favorable_pct: toNumber(current.onboarding_90_favorable_pct),
          exit_respondents: toNumber(current.exit_respondents),
          open_text_comments: toNumber(current.open_text_comments),
        },
        engagement_trend: (trendResult.data ?? []).map((row) => ({
          survey_code: row.survey_code,
          survey_name: row.survey_name,
          launch_date: row.launch_date,
          close_date: row.close_date,
          respondents: toNumber(row.respondents),
          denominator_snapshot_date: row.denominator_snapshot_date,
          eligible_population: toNumber(row.eligible_population),
          participation_pct: toNumber(row.participation_pct),
          avg_score: toNumber(row.avg_score),
          favorable_pct: toNumber(row.favorable_pct),
        })),
        engagement_dimensions: dimensions.filter((row) => row.survey_code === "ENG-2026"),
        pulse_dimensions: dimensions.filter((row) => row.survey_code === "PULSE-2026-Q2"),
        manager_dimensions: dimensions.filter((row) => row.survey_code === "MGR-2026"),
        onboarding_dimensions: dimensions.filter((row) => ["ONB-30", "ONB-60", "ONB-90"].includes(row.survey_code)),
        exit_dimensions: dimensions.filter((row) => row.survey_code === "EXIT"),
        business_units: (businessUnitResult.data ?? []).map((row) => ({
          org_code: row.org_code,
          org_name: row.org_name,
          respondents: toNumber(row.respondents),
          avg_score: toNumber(row.avg_score),
          favorable_pct: toNumber(row.favorable_pct),
        })),
        exit_reasons: (exitReasonResult.data ?? []).map((row) => ({
          primary_reason: row.primary_reason,
          exits: toNumber(row.exits),
          pct_of_exit_responses: toNumber(row.pct_of_exit_responses),
        })),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Survey & Sentiment API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Survey & Sentiment data.",
      },
      { status: 500 }
    );
  }
}
