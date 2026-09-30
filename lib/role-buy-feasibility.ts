import { calculateRoleBuyScale } from "./role-buy-feasibility-math";
import { supabaseServer } from "./supabase-server";
import type {
  RoleBuyFeasibilityResponse,
} from "./types";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function toNumber(
  value: number | string | null | undefined
) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort(
    (a, b) => a - b
  );
  const middle = Math.floor(
    sorted.length / 2
  );
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] +
        sorted[middle]) /
        2
    : sorted[middle];
}

function rolling12Start(asOf: string) {
  const date = new Date(
    asOf + "T00:00:00Z"
  );
  date.setUTCFullYear(
    date.getUTCFullYear() - 1
  );
  date.setUTCDate(
    date.getUTCDate() + 1
  );
  return date
    .toISOString()
    .slice(0, 10);
}

function monthKey(date: string) {
  return date.slice(0, 7);
}

export async function getRoleBuyFeasibility(
  jobProfile: string,
  requestedBuy = 0
): Promise<RoleBuyFeasibilityResponse> {
  const [profileResult, asOfResult] =
    await Promise.all([
      supabaseServer
        .from("job_profiles")
        .select(
          "job_profile_code, job_profile_name, active"
        )
        .eq("active", true),
      supabaseServer
        .from("dashboard_overview_current")
        .select("snapshot_date")
        .single(),
    ]);

  if (profileResult.error) {
    throw new Error(
      "Role recruiting profile: " +
        profileResult.error.message
    );
  }

  if (asOfResult.error) {
    throw new Error(
      "Role recruiting as-of date: " +
        asOfResult.error.message
    );
  }

  const key = normalize(jobProfile);
  const profile =
    (profileResult.data ?? []).find(
      (row) =>
        normalize(row.job_profile_code) ===
          key ||
        normalize(row.job_profile_name) ===
          key
    );

  if (!profile) {
    throw new Error(
      "The selected job profile is not an active governed job profile."
    );
  }

  const asOf =
    asOfResult.data.snapshot_date;
  const recentStart =
    rolling12Start(asOf);

  const metricsResult =
    await supabaseServer
      .from("ta_requisition_metrics")
      .select(
        "requisition_status, opened_date, closed_date, applicants, advanced_candidates, interviews, offers, accepted_offers, time_to_fill_days, external_internal"
      )
      .eq(
        "job_profile_code",
        profile.job_profile_code
      );

  if (metricsResult.error) {
    throw new Error(
      "Role recruiting metrics: " +
        metricsResult.error.message
    );
  }
  const rows = metricsResult.data ?? [];

  const openRows = rows.filter(
    (row) =>
      row.requisition_status === "open" &&
      row.opened_date !== null &&
      row.opened_date <= asOf
  );

  const externalFilledRows =
    rows.filter(
      (row) =>
        row.requisition_status ===
          "filled" &&
        row.external_internal ===
          "external" &&
        row.closed_date !== null &&
        row.closed_date <= asOf
    );

  const recentExternalFilled =
    externalFilledRows.filter(
      (row) =>
        row.closed_date !== null &&
        row.closed_date >= recentStart
    );

  const openRequisitions =
    openRows.length;
  const openApplicants =
    openRows.reduce(
      (sum, row) =>
        sum + toNumber(row.applicants),
      0
    );
  const openAdvanced =
    openRows.reduce(
      (sum, row) =>
        sum +
        toNumber(
          row.advanced_candidates
        ),
      0
    );
  const openInterviews =
    openRows.reduce(
      (sum, row) =>
        sum + toNumber(row.interviews),
      0
    );
  const openOffers =
    openRows.reduce(
      (sum, row) =>
        sum + toNumber(row.offers),
      0
    );

  const totalExternalApplicants =
    externalFilledRows.reduce(
      (sum, row) =>
        sum + toNumber(row.applicants),
      0
    );
  const totalExternalOffers =
    externalFilledRows.reduce(
      (sum, row) =>
        sum + toNumber(row.offers),
      0
    );
  const totalExternalAccepted =
    externalFilledRows.reduce(
      (sum, row) =>
        sum +
        toNumber(
          row.accepted_offers
        ),
      0
    );

  const ttfValues =
    externalFilledRows
      .map((row) =>
        row.time_to_fill_days === null
          ? null
          : toNumber(
              row.time_to_fill_days
            )
      )
      .filter(
        (value): value is number =>
          value !== null
      );

  const monthlyRecent =
    new Map<string, number>();
  for (
    const row of recentExternalFilled
  ) {
    const key = monthKey(
      row.closed_date as string
    );
    monthlyRecent.set(
      key,
      (monthlyRecent.get(key) ?? 0) + 1
    );
  }
  const requested = round1(
    Math.max(
      0,
      Number.isFinite(requestedBuy)
        ? requestedBuy
        : 0
    )
  );

  const recentCount =
    recentExternalFilled.length;
  const buyScale =
    calculateRoleBuyScale(
      requested,
      recentCount
    );
  const peakMonthly =
    Math.max(
      0,
      ...Array.from(
        monthlyRecent.values()
      )
    );

  const warnings: string[] = [];

  if (
    requested > 0 &&
    externalFilledRows.length === 0
  ) {
    warnings.push(
      "No historical external filled requisitions are available for this role, so Buy scale has no role-level historical benchmark."
    );
  } else if (
    requested > recentCount &&
    recentCount > 0
  ) {
    warnings.push(
      "Requested Buy exceeds the entire trailing-12-month external fill volume for this role; that comparison is descriptive and does not prove the target is infeasible."
    );
  }
  if (
    requested > 0 &&
    openRequisitions === 0
  ) {
    warnings.push(
      "There is no currently open requisition pipeline for this role as of the workforce snapshot date; new Buy demand would require requisition creation or activation."
    );
  }

  const evidenceStartDate =
    externalFilledRows
      .map((row) => row.closed_date)
      .filter(
        (value): value is string =>
          value !== null
      )
      .sort()[0] ?? null;

  return {
    as_of: asOf,
    job_profile_code:
      profile.job_profile_code,
    job_profile_name:
      profile.job_profile_name,
    current_pipeline: {
      open_requisitions:
        openRequisitions,
      applicants:
        openApplicants,
      advanced_candidates:
        openAdvanced,
      interviews:
        openInterviews,
      offers:
        openOffers,
    },
    historical_external: {
      filled_requisitions:
        externalFilledRows.length,
      recent_12m_filled_requisitions:
        recentCount,
      recent_12m_avg_monthly_fills:
        buyScale.recent_12m_avg_monthly_fills,
      recent_12m_peak_monthly_fills:
        peakMonthly,
      median_time_to_fill_days:
        median(ttfValues),
      offer_acceptance_rate_pct:
        totalExternalOffers > 0
          ? round1(
              (totalExternalAccepted /
                totalExternalOffers) *
                100
            )
          : null,
      applicants_per_filled_requisition:
        externalFilledRows.length > 0
          ? round1(
              totalExternalApplicants /
                externalFilledRows.length
            )
          : null,
      evidence_start_date:
        evidenceStartDate,
      recent_12m_window_start:
        recentStart,
    },
    requested_buy: requested,
    buy_scale: {
      pct_of_recent_12m_external_fills:
        buyScale.pct_of_recent_12m_external_fills,
      multiple_of_recent_avg_monthly_fills:
        buyScale.multiple_of_recent_avg_monthly_fills,
    },
    warnings,
    methodology: [
      "Buy feasibility is descriptive role-level recruiting evidence, not a forecast or guarantee that the requested hires can be completed.",
      "Current pipeline includes requisitions already open on or before the workforce snapshot date. It is context only and is not subtracted from scenario-created Buy demand because those requisitions may support existing vacancies.",
      "Historical external fill evidence uses filled requisitions marked external and excludes closes after the workforce snapshot date.",
      "Trailing-12-month external fills are measured from the day after the same date one year earlier through the workforce snapshot date.",
      "Median time-to-fill is historical for completed external requisitions and must not be presented as a promised future fill time.",
      "Offer acceptance is calculated from historical external accepted offers divided by offers when offer evidence exists.",
      "Buy target scale compares the requested Buy units with recent external hiring volume; it does not establish labor-market availability.",
      "The model is read-only and does not create requisitions, contact candidates, make offers, or change ATS records.",
    ],
  };
}
