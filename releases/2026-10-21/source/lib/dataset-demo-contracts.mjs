/** Contracts for the constructed September 2026 LOCAL review dataset only.
 * Frozen public v1 releases remain owned by their original validators.
 */
import {validateSuccessionPublicSummary} from './succession-public-contract.mjs';

export const DEMO_CUTOFF = '2026-09-30';
export const DEMO_SUCCESSION_LABEL = 'Illustrative demo plan flags; not assessed or predicted individual readiness';
export const DEMO_BUS = Object.freeze(['BU-CLIENTOPS', 'BU-CONS', 'BU-CORP', 'BU-DATAAI', 'BU-DIGITAL', 'BU-MGSVC', 'BU-SALES', 'BU-TECH']);
export const DEMO_JOB_CODES = Object.freeze(('AI-ARCH AI-ENG BI-ANA BI-DEV CLOUD-ARCH CLOUD-ENG COMMS-GEN CONS-MGMT CONS-TECH CONS-TRANS CORPDEV-ANA CSM-GEN CYBER-ANA CYBER-ENG DE-ARCH DE-ENG DS-APPLIED DS-SCI FIN-ACC FIN-FPNA FIN-TREAS HR-HRBP HR-HRIS HR-PA HR-TA HR-TM HR-TR INFOSEC-ANA INFRA-ENG IT-ENG LEGAL-COUNSEL LEGAL-PRIV MKT-BRAND MKT-GROWTH ML-ENG OPS-BUS OPS-CLIENT PMO-PGM PMO-PM PROC-SOURCING PROD-PM QA-ENG SALES-AE SALES-OPS STRAT-ANA SWE-BACK SWE-FRONT SWE-FULL SWE-GEN UX-DES').split(' '));
export const DEMO_COMPENSATION_FIELDS = Object.freeze(['release_id', 'snapshot_date', 'job_profile_code', 'job_profile_name', 'status', 'mean_compa_pct', 'coverage', 'base_pay_provenance', 'range_provenance', 'range_policy_version']);
export const DEMO_CONTRACTS = Object.freeze(Object.fromEntries(Object.entries({
  workforce: ['workforce-9847-2026-09-30-local-v1', 'enterprise-cutoff-only-v1', 'Constructed synthetic employment and assignment history; not observed workforce outcomes'],
  ratings: ['workforce-performance-2026-ytd-bu-9847-local-v1', 'company-or-eight-bu-all-active-no-country-level-v1', 'Newly constructed synthetic workforce; deterministic all-active demo ratings; not observed performance. Original loaded workforce generation remains unverified.'],
  compensation: ['compa-demo-9847-2026-09-30-local-v1', 'company-only-50-jobs-48-numeric-2-withheld-v1', 'Invented annual contracted base and assumed ranges; mean of matched individual base/FTE/midpoint ratios; six decimal places; not market pay'],
  career: ['career-9847-2026-09-30-local-v1', 'enterprise-jan1-eligible-full-year-and-ytd-v1', 'Constructed movements; January-1 eligible cohort; full-year and YTD horizons remain distinct'],
  skills: ['skills-9847-2026-09-30-local-v1', 'enterprise-three-required-skill-aggregates-v1', 'Five invented hire-date skill profiles; three role-required aggregates; not measured longitudinal skill development'],
  survey: ['survey-9847-2026-09-30-local-v1', 'eleven-quarter-waves-own-denominators-v1', 'Generated five-item responses and nonresponse; valid respondents have at least two answers; wave-specific denominators'],
  planning: ['planning-9847-2026-09-30-local-v1', 'twelve-2027-flat-draft-months-not-outcomes-v1', 'Explicit flat 2027 draft assumptions from September 2026 stock; not forecast or observed outcomes'],
  succession: ['succession-9847-2026-09-30-local-v1', 'enterprise-get-only-demo-plan-flags-no-filters-v1', DEMO_SUCCESSION_LABEL],
}).map(([name, [releaseId, scopeContract, provenance]]) => [name, Object.freeze({releaseId, scopeContract, provenance, cutoff: DEMO_CUTOFF})])));

export const plain = v => v !== null && typeof v === 'object' && !Array.isArray(v);
export const exact = (v, fields) => plain(v) && Object.keys(v).length === fields.length && fields.every(k => Object.hasOwn(v, k));
const count = v => Number.isSafeInteger(v) && v >= 0;
const finite = v => typeof v === 'number' && Number.isFinite(v);
const between = (v, a, b) => finite(v) && v >= a && v <= b;
const label = v => typeof v === 'string' && v.trim().length > 0 && v.length <= 200;
const uuid = v => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
const ensure = (v, message) => { if (!v) throw Error(message); };
const round = (n, places) => Math.round(n * 10 ** places) / 10 ** places;
const near = (a, b) => finite(a) && Math.abs(a - b) < 1e-9;
function rows(value, n, fields) {
  ensure(Array.isArray(value) && value.length === n && value.every(r => exact(r, fields)), 'Component field contract');
}
export function deepFreeze(value) {
  if (value && typeof value === 'object') { for (const item of Object.values(value)) deepFreeze(item); Object.freeze(value); }
  return value;
}

export function validateDemoRequest(name, request, contract) {
  if (!Object.hasOwn(DEMO_CONTRACTS, name) || !plain(request) || request.method !== 'GET' || request.hasBody !== false) return null;
  let p; try { p = new URL(request.url).searchParams; } catch { return null; }
  if (name === 'succession') return p.size === 0 ? {} : null;
  const allowed = name === 'compensation' ? ['release', 'country', 'org', 'level'] : ['country', 'org', 'level'];
  for (const key of p.keys()) if (!allowed.includes(key) || p.getAll(key).length !== 1) return null;
  if (p.has('release') && p.get('release') !== contract.releaseId) return null;
  if (['country', 'level'].some(k => p.has(k) && p.get(k) !== 'all')) return null;
  const org = p.get('org') ?? 'all';
  if (name === 'ratings' ? !['all', ...DEMO_BUS].includes(org) : org !== 'all') return null;
  return {country: 'all', org, level: 'all'};
}

function ratings(value, contract) {
  rows(value, 9, ['version', 'source', 'snapshotDate', 'reviewPeriod', 'periodKind', 'filters', 'status', 'availabilityKind', 'simulatedAvailableAt', 'originalAvailableAt', 'provenance', 'notRatedStatus', 'counts']);
  const scopes = new Map();
  for (const r of value) {
    ensure(exact(r.filters, ['country', 'org', 'level']) && exact(r.counts, ['population', 'rated', 'ratings', 'notRated', 'unavailable']), 'Ratings fields');
    ensure(r.version === contract.releaseId && r.snapshotDate === contract.cutoff && r.source === 'employee_snapshots JOIN performance_reviews' && r.reviewPeriod === '2026 YTD' && r.periodKind === 'ytd' && r.provenance === contract.provenance && r.status === 'available' && r.availabilityKind === 'simulated_convention' && r.simulatedAvailableAt === '2026-09-30T23:59:59.999Z' && r.originalAvailableAt === null && r.notRatedStatus === 'not_collected', 'Ratings lineage');
    ensure(r.filters.country === 'all' && r.filters.level === 'all' && ['all', ...DEMO_BUS].includes(r.filters.org) && !scopes.has(r.filters.org), 'Ratings scope');
    const c = r.counts;
    ensure(count(c.population) && c.rated === c.population && c.notRated === null && c.unavailable === 0 && Array.isArray(c.ratings) && c.ratings.length === 5 && c.ratings.every(n => count(n) && n >= 10 && c.population - n >= 10) && c.ratings.reduce((a, b) => a + b, 0) === c.population, 'Ratings denominator or suppression');
    scopes.set(r.filters.org, c);
  }
  const company = scopes.get('all');
  ensure(company.population === 9847 && DEMO_BUS.reduce((s, k) => s + scopes.get(k).population, 0) === company.population, 'Ratings population');
  for (let i = 0; i < 5; i++) ensure(DEMO_BUS.reduce((s, k) => s + scopes.get(k).ratings[i], 0) === company.ratings[i], 'Ratings BU reconciliation');
}
function compensation(value, contract) {
  rows(value, 50, DEMO_COMPENSATION_FIELDS);
  const seen = new Set();
  for (const r of value) {
    ensure(r.release_id === contract.releaseId && r.snapshot_date === contract.cutoff && DEMO_JOB_CODES.includes(r.job_profile_code) && !seen.has(r.job_profile_code) && label(r.job_profile_name) && r.base_pay_provenance === 'constructed_workforce_demo_9847_v2' && r.range_provenance === 'synthetic_assumed_range' && r.range_policy_version === 'constructed-demo-9847-ranges-v2', 'Compensation lineage');
    seen.add(r.job_profile_code);
    if (['AI-ARCH', 'COMMS-GEN'].includes(r.job_profile_code)) ensure(r.status === 'withheld' && r.mean_compa_pct === null && r.coverage === 'withheld', 'Protected compensation job');
    else ensure(r.status === 'published' && r.coverage === 'complete' && finite(r.mean_compa_pct) && r.mean_compa_pct > 0 && r.mean_compa_pct === Number(r.mean_compa_pct.toFixed(6)), 'Compensation metric or precision');
  }
}
function workforce(value) {
  rows(value, 1, ['fte', 'headcount', 'labor_cost_usd', 'open_positions', 'snapshot_date', 'voluntary_turnover_ytd_pct']);
  const r = value[0];
  ensure(r.headcount === 9847 && r.snapshot_date === DEMO_CUTOFF && between(r.fte, 0, r.headcount) && finite(r.labor_cost_usd) && r.labor_cost_usd >= 0 && count(r.open_positions) && between(r.voluntary_turnover_ytd_pct, 0, 100), 'Workforce population or metric');
}
function career(value) {
  rows(value, 2, ['distinct_promoted', 'duration_n', 'eligible', 'end_date', 'period_kind', 'prior_level_months_median', 'promotion_rate_pct', 'start_date']);
  const cohorts = [['2025-01-01', '2025-12-31', 'full_year', 7387, 114], ['2026-01-01', DEMO_CUTOFF, 'ytd', 7776, 64]];
  value.forEach((r, i) => {
    const [start, end, kind, eligible, promoted] = cohorts[i];
    ensure(r.start_date === start && r.end_date === end && r.period_kind === kind && r.eligible === eligible && r.distinct_promoted === promoted && r.duration_n === promoted && finite(r.prior_level_months_median) && r.prior_level_months_median >= 0 && near(r.promotion_rate_pct, promoted * 100 / eligible), 'Career cohort, chronology or rate');
  });
}
function skills(value) {
  rows(value, 3, ['avg_observed_proficiency', 'avg_proficiency_gap', 'avg_required_proficiency', 'avg_requirement_weight', 'employees_below_or_missing_requirement', 'employees_in_roles_requiring_skill', 'employees_meeting_requirement', 'employees_with_observed_proficiency', 'profile_coverage_pct', 'requirement_met_pct', 'skill_category', 'skill_code', 'skill_id', 'skill_name']);
  const ids = new Set();
  value.forEach((r, i) => {
    ensure(r.skill_code === `DEMO-SKILL-${i + 1}` && uuid(r.skill_id) && !ids.has(r.skill_id) && label(r.skill_name) && label(r.skill_category), 'Skills identity'); ids.add(r.skill_id);
    ensure(r.employees_in_roles_requiring_skill === 9847 && r.employees_with_observed_proficiency === 9847 && count(r.employees_meeting_requirement) && count(r.employees_below_or_missing_requirement) && r.employees_meeting_requirement + r.employees_below_or_missing_requirement === 9847 && r.profile_coverage_pct === 100 && r.requirement_met_pct === round(r.employees_meeting_requirement * 100 / 9847, 1), 'Skills denominator');
    ensure(between(r.avg_observed_proficiency, 1, 5) && between(r.avg_proficiency_gap, 0, 4) && r.avg_required_proficiency === 3 && r.avg_requirement_weight === 1, 'Skills metric');
  });
}
function survey(value) {
  rows(value, 11, ['eligibility_date', 'eligible', 'favorable_pct', 'invalid_respondents', 'responded', 'survey_code', 'survey_id', 'valid_respondents']);
  const ids = new Set(), codes = new Set();
  value.forEach((r, i) => {
    const date = new Date(Date.UTC(2024, (i + 1) * 3, 0)).toISOString().slice(0, 10);
    ensure(r.eligibility_date === date && uuid(r.survey_id) && !ids.has(r.survey_id) && label(r.survey_code) && !codes.has(r.survey_code), 'Survey wave chronology or identity');
    ids.add(r.survey_id); codes.add(r.survey_code);
    ensure([r.eligible, r.responded, r.valid_respondents, r.invalid_respondents].every(count) && r.valid_respondents + r.invalid_respondents === r.responded && r.responded <= r.eligible && (r.valid_respondents === 0 ? r.favorable_pct === null : between(r.favorable_pct, 0, 100)), 'Survey wave denominator');
  });
  ensure(value[10].eligible === 9847, 'Survey cutoff population');
}
function planning(value) {
  rows(value, 12, ['planned_exits', 'planned_fte', 'planned_headcount', 'planned_hires', 'planned_labor_cost_usd', 'planning_month', 'scenario_name', 'scenario_type']);
  value.forEach((r, i) => ensure(r.planning_month === `2027-${String(i + 1).padStart(2, '0')}-01` && r.scenario_type === 'draft_assumption' && r.scenario_name === 'Baseline' && r.planned_headcount === 9847 && r.planned_hires === 0 && r.planned_exits === 0 && between(r.planned_fte, 0, 9847) && finite(r.planned_labor_cost_usd) && r.planned_labor_cost_usd >= 0 && r.planned_fte === value[0].planned_fte && r.planned_labor_cost_usd === value[0].planned_labor_cost_usd, 'Planning draft horizon or stock'));
}
function succession(value) {
  ensure(validateSuccessionPublicSummary(value).ok && value.as_of_date === DEMO_CUTOFF && value.critical_job_profiles === 12 && value.filled_critical_positions === 2331 && value.positions_with_recorded_plan === 1170 && value.positions_with_ready_now === 150, 'Succession demo contract');
}
const validators = {workforce, ratings, compensation, career, skills, survey, planning, succession};
export function validateDemoPayload(name, value, contract, args) {
  const expected = DEMO_CONTRACTS[name];
  ensure(expected && Object.entries(expected).every(([k, v]) => contract[k] === v), 'Unsupported release contract');
  validators[name](value, contract);
  const data = name === 'ratings' ? value.find(r => r.filters.org === args.org) : value;
  ensure(data !== undefined, 'Rating scope unavailable');
  return deepFreeze({data: structuredClone(data), sourceLabel: contract.provenance, dataClass: 'constructed-synthetic', publicationApproved: false, releaseId: contract.releaseId, cutoff: contract.cutoff, scopeContract: contract.scopeContract});
}

/** Run on the full company bundle, never on an arbitrary filtered response. */
export function validateDemoBundle(parts) {
  ensure(exact(parts, Object.keys(DEMO_CONTRACTS)), 'Complete eight-component bundle required');
  const stock = parts.workforce.data[0];
  ensure(parts.ratings.data.counts.population === stock.headcount && parts.survey.data.at(-1).eligible === stock.headcount && parts.skills.data.every(r => r.employees_in_roles_requiring_skill === stock.headcount) && parts.planning.data.every(r => r.planned_headcount === stock.headcount && r.planned_fte === stock.fte && r.planned_labor_cost_usd === stock.labor_cost_usd), 'Cross-component stock mismatch');
  return parts;
}
