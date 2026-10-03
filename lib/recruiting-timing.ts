/** Historical aggregate timing only. No future date, hiring capacity or probability is inferred. */
export type RecruitingTimingRow = {
  requisition_id: string | number; requisition_status: string;
  external_internal: string | null; opened_date: string | null;
  closed_date: string | null; time_to_fill_days: number | string | null;
  start_date: string | null;
};
const DAY = 86400000;
function date(value: string | null): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const ms = Date.parse(value + "T00:00:00Z");
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0,10) === value ? ms : null;
}
function duration(value: number | string | null): number | null {
  if (value === null || value === "" || typeof value === "string" && !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}
function percentile(values: number[], p: number) {
  const sorted = [...values].sort((a,b) => a-b), index = (sorted.length-1)*p;
  return Math.round((sorted[Math.floor(index)] + (sorted[Math.ceil(index)]-sorted[Math.floor(index)])*(index%1))*10)/10;
}
function distribution(values: number[]) {
  return {valid_sample_count: values.length, minimum_benchmark_sample: 5,
    status: values.length >= 5 ? "historical benchmark available" as const : "insufficient comparable history" as const,
    p25_days: values.length >= 5 ? percentile(values,.25) : null,
    median_days: values.length >= 5 ? percentile(values,.5) : null,
    p75_days: values.length >= 5 ? percentile(values,.75) : null};
}
export function summarizeRecruitingTiming(rows: RecruitingTimingRow[], jobProfileCode: string, asOf: string, periodStart: string) {
  const end = date(asOf), start = date(periodStart);
  if (end === null || start === null || start > end || !jobProfileCode.trim()) throw Error("Invalid recruiting evidence scope or period.");
  const eligible = rows.filter(row => {
    const closed = date(row.closed_date);
    return row.requisition_status === "filled" && row.external_internal === "external" && closed !== null && closed >= start && closed <= end;
  });
  const counts = new Map<string, number>();
  for (const row of eligible) {const id=String(row.requisition_id);counts.set(id,(counts.get(id)??0)+1)}
  const duplicates = new Set([...counts].filter(([,count]) => count > 1).map(([id])=>id));
  const accepted: number[] = [], lag: number[] = [], arrival: number[] = [];
  let missingOrInvalidAcceptance=0,missingOrInvalidStart=0,futureStart=0;
  for (const row of eligible) {
    if (duplicates.has(String(row.requisition_id))) continue;
    const opened=date(row.opened_date),fill=duration(row.time_to_fill_days);
    const acceptedAt=opened===null||fill===null?null:opened+fill*DAY;
    if (acceptedAt===null||!Number.isFinite(acceptedAt)||acceptedAt>end||acceptedAt>date(row.closed_date)!) {missingOrInvalidAcceptance++;continue}
    accepted.push(fill!);
    const started=date(row.start_date);
    if (started!==null&&started>end) {futureStart++;continue}
    if (started===null||started<acceptedAt) {missingOrInvalidStart++;continue}
    lag.push((started-acceptedAt)/DAY);
    arrival.push((started-opened!)/DAY);
  }
  return {
    schema_version:1 as const,source:"ta_requisition_metrics",method_version:"recruiting-timing-v1",
    provenance:"synthetic company history" as const,
    scope:{job_profile_code:jobProfileCode,business_unit:null,country:null,population:"Company-wide external filled requisitions; selected role only"},
    as_of:asOf,period_start:periodStart,period_end:asOf,period_basis:"requisition closed_date" as const,
    eligible_rows:eligible.length,distinct_requisitions:counts.size,duplicate_requisitions_excluded:duplicates.size,
    missing_or_invalid_acceptance:missingOrInvalidAcceptance,missing_or_invalid_start:missingOrInvalidStart,future_starts_excluded:futureStart,
    opening_to_accepted_offer:distribution(accepted),accepted_offer_to_start:distribution(lag),opening_to_start:distribution(arrival),
    limitations:[
      "Time to fill in this source is earliest accepted offer response date minus requisition opening date; the TA dashboard instead uses closure minus opening.",
      "The cohort contains completed external fills, selected by closure date. Open, unsuccessful and future-start searches are not represented in completed-start timing.",
      "Percentiles describe this historical sample, not a forecast confidence interval or a guarantee. Five valid records is a minimum display rule, not proof of representativeness.",
      "Opening-to-start percentiles use paired dates per requisition; medians for separate stages must not be added and called the median total.",
      "Company-wide role history does not establish a BU/location-specific hiring rate, simultaneous capacity for multiple hires, or employee availability.",
      "A prospective recruiting launch date and explicit choice of planning assumption are required before calculating an illustrative arrival date.",
    ],
  };
}
export type RecruitingTimingEvidence = ReturnType<typeof summarizeRecruitingTiming>;
