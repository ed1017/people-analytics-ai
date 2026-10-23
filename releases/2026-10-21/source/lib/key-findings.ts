import type { AttritionResponse, CareerMobilityResponse, FinanceResponse, LearningDevelopmentResponse, OverviewData, SkillsResponse, SuccessionCoverageResponse, SurveySentimentResponse, TalentAcquisitionResponse, WorkforceResponse } from './types';
import type { CareerGrowthMobilityResponse } from './career-growth-mobility';

export type Findings = { scope: string; items: string[] };
const numeric = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const n = (v: number) => v.toLocaleString('en-US', {maximumFractionDigits: 1});
const fact = (v: unknown, describe: (v: number) => string): string | null => numeric(v) ? describe(v) : null;
function result(scope: string, items: (string | null)[]): Findings {
  const valid = items.filter((v): v is string => v !== null);
  return {scope, items: valid.length ? valid.slice(0, 3) : ['No verified values are available for this summary. Missing values are not zero.']};
}
export const snapshotFindings = (d: OverviewData, scope: string) => result(`${scope.replace(/\bDemo (?=BU-|level |[A-Z]{2}\b)/gi, "")} · ${d.snapshot_date}`, [
  fact(d.headcount, v => `${n(v)} people are recorded in this selection${numeric(d.fte) ? `, representing ${n(d.fte)} FTE` : ''}.`),
  fact(d.open_positions, v => `${n(v)} positions are open in the selected snapshot; this is not a hiring forecast.`),
  fact(d.voluntary_turnover_ytd_pct, v => `Voluntary turnover is ${n(v)}% year to date, not a full-year total turnover rate.`),
]);
export const workforceFindings = (d: WorkforceResponse) => {
  const trend = [...(d.trend ?? [])].filter(row => numeric(row.headcount)).sort((a,b)=>a.snapshot_date.localeCompare(b.snapshot_date));
  const first=trend[0], last=trend.at(-1);
  const change=first && last && first.snapshot_date!==last.snapshot_date ? last.headcount-first.headcount : null;
  return result(`Company workforce · ${d.as_of}`, [
    change !== null ? `Headcount ${change > 0 ? 'increased' : change < 0 ? 'decreased' : 'was unchanged'}${change === 0 ? '' : ` by ${n(Math.abs(change))} people`} between ${first.snapshot_date} and ${last!.snapshot_date}.` : fact(d.summary.headcount,v=>`${n(v)} people are recorded in the current snapshot.`),
    numeric(d.summary.headcount) && d.summary.headcount>0 && numeric(d.summary.full_time_headcount) && d.summary.full_time_headcount<=d.summary.headcount ? `${n(100*d.summary.full_time_headcount/d.summary.headcount)}% of recorded employees are full-time.` : null,
    fact(d.summary.avg_tenure_years,v=>`Average recorded tenure is ${n(v)} years.`),
  ]);
};
export const attritionFindings = (d: AttritionResponse) => result(`Company workforce · year to date through ${d.as_of}`, [
  fact(d.summary.total_exits, v => `${n(v)} total exits are recorded${numeric(d.summary.total_turnover_ytd_pct) ? ` (${n(d.summary.total_turnover_ytd_pct)}% total turnover)` : ''}.`),
  fact(d.summary.voluntary_exits, v => `${n(v)} exits were voluntary${numeric(d.summary.voluntary_turnover_ytd_pct) ? ` (${n(d.summary.voluntary_turnover_ytd_pct)}% voluntary turnover)` : ''}.`),
  numeric(d.summary.total_exits) && d.summary.total_exits > 0 && numeric(d.summary.voluntary_exits) && d.summary.voluntary_exits <= d.summary.total_exits ? `${n(100*d.summary.voluntary_exits/d.summary.total_exits)}% of recorded exits were voluntary; this does not establish why people left.` : null,
]);
export const recruitingFindings = (d: TalentAcquisitionResponse) => result(`Recruiting snapshot · ${d.as_of}`, [
  fact(d.summary.median_time_to_fill_days, v => `Recorded median time to fill is ${n(v)} days; it is not a promise for a future hire.`),
  fact(d.summary.open_requisitions, v => `${n(v)} requisitions currently have open status.`),
  fact(d.summary.open_reqs_over_60_days, v => numeric(d.summary.open_requisitions) && d.summary.open_requisitions > 0 && v <= d.summary.open_requisitions ? `${n(100*v/d.summary.open_requisitions)}% of open requisitions (${n(v)} of ${n(d.summary.open_requisitions)}) are older than 60 days.` : `${n(v)} open requisitions are older than 60 days.`),
]);
export const surveyFindings = (d: SurveySentimentResponse) => result(`Company employee listening · ${d.data_meta?.listeningPeriod ?? d.as_of}`, [
  fact(d.summary.engagement_favorable_pct, v => `Engagement favorability is ${n(v)}%${numeric(d.summary.engagement_respondents) ? ` among ${n(d.summary.engagement_respondents)} respondents` : ''}.`),
  fact(d.summary.engagement_participation_pct, v => `Recorded participation is ${n(v)}% of the eligible population.`),
  'Favorability summarizes survey responses; it is not comment sentiment or evidence of a causal relationship.',
]);
export const financeFindings = (d: FinanceResponse) => result(`Company finance snapshot · ${d.as_of}`, [
  fact(d.current.labor_cost_usd, v => `Recorded labor cost is USD ${n(v)}. The snapshot does not establish an annual or fully loaded cost basis.`),
  fact(d.current.vacant_positions, v => `${n(v)} positions are vacant in the finance snapshot.`),
  fact(d.current.fte, v => `${n(v)} FTE are represented; forecast scenarios remain separate from recorded costs.`),
]);
export const skillsFindings = (d: SkillsResponse) => result(`Company skill evidence · ${d.as_of}; workforce filters do not narrow this evidence`, [
  fact(d.summary.skills_with_demand, v => `${n(v)} skills have recorded role demand.`),
  fact(d.summary.weighted_requirement_met_pct, v => `${n(v)}% is the weighted requirement-met rate; it is not the share of employees ready to move.`),
  fact(d.summary.average_profile_coverage_pct, v => `Average profile coverage is ${n(v)}%; missing proficiency evidence is not proof of low proficiency.`),
]);
export const learningFindings = (d: LearningDevelopmentResponse) => result(`Company learning catalogue · ${d.as_of}; workforce filters do not narrow this evidence`, [
  fact(d.summary.gap_skills_with_active_pathway, v => `${n(v)} gap skills have an active learning pathway${numeric(d.summary.current_gap_skills) ? ` out of ${n(d.summary.current_gap_skills)} recorded gap skills` : ''}.`),
  fact(d.summary.fully_covered_job_profiles, v => `${n(v)} job profiles have pathways covering all required skills.`),
  'Catalogue availability does not establish participation, completion or readiness.',
]);
export const mobilityFindings = (d: CareerMobilityResponse) => result(`Company career preferences · ${d.as_of ?? 'update date unavailable'}; workforce filters do not narrow this evidence`, [
  fact(d.summary.preference_record_coverage_pct, v => `Preference records cover ${n(v)}% of active employees.`),
  fact(d.summary.employees_without_preference, v => `${n(v)} active employees have no recorded preference; this does not mean they lack career interests.`),
  'Preferences describe interests, not assessed readiness or permission to redeploy.',
]);
export const successionFindings = (d: SuccessionCoverageResponse) => result(`Company succession evidence · ${d.as_of_date ?? 'assessment date unavailable'}; workforce filters do not narrow this evidence`, [
  d.plan_coverage_suppressed ? 'Plan coverage is suppressed; no small-group count is disclosed.' : fact(d.recorded_plan_coverage_pct, v => `${n(v)}% of filled critical positions have a recorded plan.`),
  d.ready_now_suppressed ? 'Readiness coverage is suppressed.' : fact(d.positions_with_ready_now, v => `${n(v)} positions have a recorded ready-now flag.`),
  d.data_meta?.successionSemantics === 'illustrative-plan-flags' ? 'These illustrative plan flags are not assessments of actual successor readiness.' : 'Recorded plans and flags do not independently establish successor readiness.',
]);
export const growthFindings = (d: CareerGrowthMobilityResponse) => result(`Company recorded movements · ${d.source.first_recorded_date ?? 'unknown start'}–${d.source.last_recorded_date ?? 'unknown end'}`, [
  fact(d.source.total_recorded_events, v => `${n(v)} movement events are recorded${numeric(d.source.distinct_recorded_employees) ? ` across ${n(d.source.distinct_recorded_employees)} distinct employees` : ''}; events are not unique people.`),
  d.source.latest_month_partial ? 'The latest month is partial; do not compare it with a complete month as a trend.' : 'Movement counts describe recorded activity, not promotion probabilities.',
]);

export const compensationFindings = (d: import('./compensation').CompensationResponse) => result(`Company cost context · ${d.snapshot_date}; job-range filters do not narrow this aggregate`, [
  fact(d.current.labor_cost_usd, v => `Recorded labor cost is USD ${n(v)}; its cost period and employee coverage are not established.`),
  fact(d.current.fte, v => `${n(v)} FTE are represented in this cost aggregate.`),
  'This aggregate cannot establish job salaries, pay ranges or pay equity. Use the separately scoped range evidence above.',
]);
