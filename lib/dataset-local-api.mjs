/** Concrete API presenters for the finalized local dataset. Ordinary app fields
 * retain their current shapes; additive metadata identifies constructed data.
 * Missing domains remain unavailable. This module does not activate production.
 */
import {ANALYTICS_COLUMNS} from './dataset-analytics-source.mjs';
import {DEMO_CUTOFF, DEMO_CONTRACTS, exact, validateDemoRequest} from './dataset-demo-contracts.mjs';
import {buildCompensationResponse} from './compensation.ts';
import {buildHomePack,homeDefinitions} from './home-pack.mjs';
import {dashboardRequestedFilters,scopedDashboardResponse} from './dashboard-scope.ts';
import {hasCompleteReturnedMonthWindow} from './stored-planning.ts';
import {knownSum} from './numeric-contract.ts';
import {createDomainPresenters} from './dataset-domain-presenters.mjs';
import {validateSuccessionApiRequest} from './succession-public-contract.mjs';
import {createPlanningAdapters,LOCAL_PLANNING_ROUTES} from './dataset-planning-adapters.mjs';
import {createTalentAdapters,LOCAL_TALENT_ROUTES} from './dataset-talent-adapters.mjs';
import {createResponseAdapters,LOCAL_RESPONSE_ROUTES} from './dataset-response-adapters.mjs';
import {createExecutionAdapters,LOCAL_EXECUTION_ROUTES} from './dataset-execution-adapters.mjs';

export const LOCAL_PARITY_ROUTES = Object.freeze([
  '/api/workforce','/api/attrition','/api/talent-acquisition','/api/overview','/api/headcount','/api/headcount-trend',
  '/api/dashboard','/api/compensation','/api/compensation-ranges','/api/compensation-job-release',
  '/api/skills','/api/career-growth-mobility','/api/career-mobility','/api/survey-sentiment','/api/workforce-planning','/api/finance',
  '/api/learning-development','/api/position-modeling','/api/succession-coverage',
  ...LOCAL_PLANNING_ROUTES,...LOCAL_TALENT_ROUTES,...LOCAL_RESPONSE_ROUTES,...LOCAL_EXECUTION_ROUTES,
]);
const must = (value, message) => {if (!value) throw Error(message);};
const finite = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const count = n => Number.isSafeInteger(n) && n >= 0;
const sum = (rows, key) => knownSum(rows.map(r=>r[key]));
const round = (n, places = 1) => Math.round(n * 10 ** places) / 10 ** places;
const same = (a, b) => finite(a) && finite(b) && Math.abs(a - b) < 0.011;
const textKeys = new Set('as_of snapshot_date month org_unit_id org_code org_name org_type country_code country_name level_code level_name tenure_band separation_reason separation_type movement_type source_code source_name source_category recruiter_name region specialty job_profile_code job_profile_name'.split(' '));
function aggregateRows(name, rows) {
  const fields = ANALYTICS_COLUMNS[name];
  must(Array.isArray(rows) && rows.every(r => exact(r, fields)), 'Aggregate shape: ' + name);
  for (const r of rows) for (const key of fields) {
    if (textKeys.has(key)) must((['region','specialty'].includes(key) && r[key] === null) || typeof r[key] === 'string' && r[key].length > 0 && r[key].length < 300, 'Aggregate label: ' + key);
    else must(finite(r[key]) || r[key] === null && (/^avg_|_pct$|^cost_per_fte/.test(key)), 'Unavailable aggregate metric: ' + key);
  }
  return rows;
}
const sort = (rows, key, descending = false) => [...rows].sort((a, b) => a[key] === null ? b[key] === null ? 0 : 1 : b[key] === null ? -1 : typeof a[key] === 'string' ? a[key].localeCompare(b[key]) : (descending ? b[key] - a[key] : a[key] - b[key]));
const omit = (row, keys) => Object.fromEntries(Object.entries(row).filter(([key])=>!keys.includes(key)));
const requestArgs = request => ({method: request.method, url: request.url, hasBody: request.body !== null});
const company = {method: 'GET', url: 'http://local.invalid/', hasBody: false};

export function createLocalApiPresenter({router, analytics, releases}) {
  const read = async name => aggregateRows(name, await analytics.read(name));
  const one = async name => {const rows = await read(name); must(rows.length === 1, 'Incomplete aggregate'); return rows[0];};
  const component = name => releases.read(name, company);
  const domains=createDomainPresenters({analytics,component,metadata});
  const planningAdapters=createPlanningAdapters({analytics,component,domains,metadata});
  const talentAdapters=createTalentAdapters({analytics,metadata});
  const responseAdapters=createResponseAdapters({planning:planningAdapters,talent:talentAdapters,analytics,metadata});
  const executionAdapters=createExecutionAdapters({planning:planningAdapters,response:responseAdapters,metadata});
  function metadata(extra = {}) {
    const bound = router.current();
    must(analytics.datasetId === bound.datasetId && analytics.bundleDigest === bound.digest, 'Mixed analytics binding');
    return {datasetToken: bound.token, datasetId: bound.datasetId, bundleDigest: bound.digest, cutoff: DEMO_CUTOFF,
      dataClass: 'constructed-synthetic', publicationApproved: false, contract: 'local-app-parity-v1',
      sourceLabel: 'Constructed demo history and aggregates; not observed workforce outcomes', ...extra};
  }
  async function dashboard(params) {
    const names = ['country','org','level'];
    for (const k of params.keys()) must(names.includes(k) && params.getAll(k).length === 1, 'Unsupported dashboard filter');
    const requested=dashboardRequestedFilters(params);
    const values = names.map(k => requested[k] === 'all' ? null : requested[k]);
    const base = (await analytics.read('dashboard', [null,null,null]))[0]?.payload;
    must(base && exact(base, ['overview','trend','filter_options']) && base.overview.headcount === 9847, 'Dashboard company source');
    const supported=['countries','business_units','levels'].every((key,i)=>values[i] === null || base.filter_options[key].some(r => r.value === values[i]));
    if(!supported)return {...scopedDashboardResponse(base,requested),performance_rating:null,data_meta:metadata({ratingScope:'unsupported'})};
    const data = values.every(x => x === null) ? base : (await analytics.read('dashboard', values))[0]?.payload;
    must(data?.overview?.snapshot_date === DEMO_CUTOFF && finite(data.overview.headcount) && data.overview.headcount <= 9847 && data.trend.at(-1)?.headcount === data.overview.headcount, 'Dashboard scoped population');
    for (const r of data.trend) must(/^202[4-6]-\d\d-\d\d$/.test(r.snapshot_date) && r.snapshot_date <= DEMO_CUTOFF && count(r.headcount) && finite(r.fte) && r.fte <= r.headcount, 'Dashboard trend');
    const scoped=scopedDashboardResponse(data,requested);
    const performance_rating = scoped.workforce_filter_scope.status === 'verified_rpc' && values[0] === null && values[2] === null
      ? (await releases.read('ratings', {...company, url: 'http://local.invalid/?org=' + (values[1] ?? 'all')})).data : null;
    if (performance_rating) must(performance_rating.counts.population === data.overview.headcount, 'Rating/dashboard population');
    return {...scoped, performance_rating, data_meta: metadata({ratingScope: performance_rating ? 'company-or-bu' : 'not-released-for-country-or-level'})};
  }
  async function workforce() {
    const [summary, trend, business_units, countries, levels, tenure, movements] = await Promise.all([
      one('workforce_current_summary'),read('dashboard_headcount_trend'),read('workforce_business_unit_summary'),read('workforce_country_summary'),read('workforce_level_summary'),read('workforce_tenure_summary'),read('workforce_movement_summary')]);
    must(summary.as_of === DEMO_CUTOFF && summary.headcount === 9847 && trend.length === 33, 'Workforce cutoff');
    for (const rows of [business_units,countries,levels,tenure]) must(sum(rows,'headcount') === summary.headcount && same(sum(rows,'fte'),summary.fte), 'Workforce group reconciliation');
    must(summary.full_time_headcount + summary.non_full_time_headcount === 9847 && summary.remote_headcount + summary.hybrid_headcount + summary.onsite_headcount === 9847, 'Workforce composition');
    return {as_of: summary.as_of,summary,trend:sort(trend,'snapshot_date'),business_units:sort(business_units,'headcount',true),countries:sort(countries,'headcount',true),levels:sort(levels,'level_rank'),tenure:sort(tenure,'tenure_sort'),movements:sort(movements,'month'),data_meta:metadata({movementPeriod:'2026 YTD; internal movements do not change company headcount'})};
  }
  async function attrition() {
    const [summary,trend,business_units,levels,tenure,reasons] = await Promise.all([
      one('attrition_current_summary'),read('attrition_monthly_trend'),read('attrition_business_unit_summary'),read('attrition_level_summary'),read('attrition_tenure_summary'),read('attrition_reason_summary')]);
    must(summary.as_of === DEMO_CUTOFF && summary.total_exits === summary.voluntary_exits + summary.involuntary_exits && trend.length === 33, 'Attrition totals');
    for (const rows of [business_units,levels,tenure,reasons]) must(sum(rows,'exits') === summary.total_exits, 'Attrition partition');
    must(sum(trend.filter(r => r.month >= '2026-01-01'),'total_exits') === summary.total_exits && sum(trend,'total_exits') === 2880, 'Attrition history');
    return {as_of:summary.as_of,summary,trend:sort(trend,'month'),business_units:sort(business_units,'voluntary_turnover_ytd_pct',true),levels:sort(levels,'level_rank'),tenure:sort(tenure,'tenure_sort'),reasons:sort(reasons,'exits',true),data_meta:metadata({period:'2026 YTD; monthly history January 2024–September 2026',turnoverDenominator:'YTD average month-end headcount; monthly rates use that month-end stock'})};
  }
  async function recruiting() {
    const [current,sources,business_units,recruiters,monthly] = await Promise.all([
      one('talent_acquisition_current_summary'),read('talent_acquisition_source_summary'),read('talent_acquisition_business_unit_summary'),read('talent_acquisition_recruiter_summary'),read('talent_acquisition_monthly_summary')]);
    const {as_of,...summary} = current;
    must(as_of === DEMO_CUTOFF && summary.hires === summary.internal_hires + summary.external_hires && summary.external_hires === 4327 && summary.internal_hires === 619 && monthly.length === 33, 'Recruiting populations');
    for (const rows of [sources,business_units]) must(sum(rows,'hires') === summary.hires && sum(rows,'applications') === summary.applications, 'Recruiting partition');
    must(sum(recruiters,'open_requisitions') === summary.open_requisitions && sum(business_units,'open_positions') === summary.open_positions, 'Recruiting vacancy partition');
    return {as_of,summary,sources:sort(sources,'hires',true),business_units:sort(business_units,'open_positions',true),recruiters:sort(recruiters,'open_requisitions',true),monthly:sort(monthly,'month'),data_meta:metadata({hireDateConvention:'hire_date is accepted offer; start_date drives headcount inflow. Internal hires are movements, not external starts.',period:'All recorded recruiting through September 2026; monthly points use event dates'})};
  }
  async function skills() {
    const rows = (await component('skills')).data, counts = (await analytics.read('skill_catalog_counts'))[0];
    must(exact(counts,['active_skills','total_job_profiles','onet_mapped_job_profiles']) && Object.values(counts).every(count) && counts.active_skills === 5 && counts.total_job_profiles === 50 && counts.onet_mapped_job_profiles === 0, 'Skill catalog counts');
    const population = sum(rows,'employees_in_roles_requiring_skill');
    return {as_of:DEMO_CUTOFF,summary:{...counts,current_workforce:9847,skills_with_demand:rows.length,skills_below_60_pct:rows.filter(r=>r.requirement_met_pct<60).length,skills_below_75_pct:rows.filter(r=>r.requirement_met_pct<75).length,weighted_requirement_met_pct:round(rows.reduce((n,r)=>n+r.requirement_met_pct*r.employees_in_roles_requiring_skill,0)/population),average_profile_coverage_pct:round(sum(rows,'profile_coverage_pct')/rows.length)},largest_gaps:sort(rows,'requirement_met_pct'),highest_demand:sort(rows,'employees_in_roles_requiring_skill',true),strongest_coverage:sort(rows,'requirement_met_pct',true),data_meta:metadata({sourceLabel:DEMO_CONTRACTS.skills.provenance,externalReferences:'Zero local role mappings; independently dated O*NET/BLS reference content is not part of this workforce bundle.'})};
  }
  async function planning() {
    const rows = (await component('planning')).data, catalog = await analytics.read('planning_catalog');
    must(catalog.length === 1 && catalog[0].scenario_name === 'Baseline' && catalog[0].scenario_type === 'draft_assumption' && Array.isArray(catalog[0].assumptions), 'Draft planning catalog');
    must(rows.length===12 && hasCompleteReturnedMonthWindow(rows.map(r=>r.planning_month)) && rows[0].planning_month==='2027-01-01' && rows.at(-1).planning_month==='2027-12-01', 'Draft planning horizon');
    let previous=9847;
    for(const row of rows){must(count(row.planned_headcount)&&count(row.planned_hires)&&count(row.planned_exits)&&previous+row.planned_hires-row.planned_exits===row.planned_headcount,'Draft planning flow reconciliation');previous=row.planned_headcount;}
    const provenance={source:'workforce_scenario_summary',status:'constructed_draft_assumption',population:'Company-wide constructed 9,847-person workforce',grain:'One draft scenario and planning month per point',source_refreshed_at:null,flow_definition:'planned_hires and planned_exits are explicit monthly draft assumptions, not observed hires/exits or cumulative counts.',reconciliation:'The twelve flat 2027 draft months reconcile opening headcount + planned hires - planned exits. This is an authored zero-flow assumption, not an independently validated forecast.',history_cutoff:DEMO_CUTOFF,opening_headcount:9847,planning_start:'2027-01-01',planning_end:'2027-12-01',unmodeled_gap:['2026-10','2026-11','2026-12'],independent_forecast_validation:false};
    return {scenarios:catalog.map(r=>({...r,provenance,points:rows.map(({planning_month,planned_headcount,planned_fte,planned_hires,planned_exits,planned_labor_cost_usd})=>({planning_month,planned_headcount,planned_fte,planned_hires,planned_exits,planned_labor_cost_usd}))})),provenance,data_meta:metadata({sourceLabel:DEMO_CONTRACTS.planning.provenance})};
  }
  async function career() {
    const [summaryRows,monthly,level_transitions] = await Promise.all(['career_summary','career_monthly','career_transitions'].map(n=>analytics.read(n)));
    const source = summaryRows[0];
    must(summaryRows.length===1 && source.total_recorded_events===619 && sum(monthly,'events')===619 && sum(level_transitions,'events')===619 && source.currently_active_linked_employees+source.currently_nonactive_linked_employees===source.distinct_recorded_employees, 'Movement reconciliation');
    for(const r of monthly)must(r.events===r.promotions+r.lateral_moves+r.transfers && r.month<=DEMO_CUTOFF && r.is_partial===false,'Movement chronology');
    const composition=[['promotion','Promotion','promotions'],['lateral_move','Lateral move','lateral_moves'],['transfer','Transfer','transfers']].map(([movement_type,label,key])=>({movement_type,label,events:sum(monthly,key),share_pct:round(sum(monthly,key)*100/619)}));
    return {source,composition,monthly,level_transitions,limitations:['Constructed retrospective events; not observed employee outcomes.','Event shares are not workforce promotion or mobility rates.','History ends September 30, 2026; the last event date does not make the covered month partial.'],methodology:['Internal movements change assignments and groups, not company headcount.','Origin and destination levels use recorded movement keys; no inferred employee readiness.','Separate January-1 eligible cohort rates remain in the career release and are not substituted for event shares.'],data_meta:metadata({sourceLabel:DEMO_CONTRACTS.career.provenance})};
  }
  async function listening() {
    const [waves,dimensions,business_units,inventory,sealed] = await Promise.all([analytics.read('survey_waves'),analytics.read('survey_dimensions'),analytics.read('survey_business_units'),analytics.read('survey_inventory'),component('survey')]);
    must(waves.length===11 && inventory.every(r=>r.survey_type==='engagement'), 'Unsupported listening inventory');
    waves.forEach((r,i)=>{const s=sealed.data[i];must(r.denominator_snapshot_date===s.eligibility_date && r.eligible_population===s.eligible && r.respondents===s.valid_respondents && r.response_records===s.responded && r.invalid_respondents===s.invalid_respondents && r.favorable_pct===round(s.favorable_pct) && finite(r.avg_score),'Listening wave contract');});
    const current=waves.at(-1);
    must(current.close_date===DEMO_CUTOFF && sum(business_units,'respondents')===current.respondents && dimensions.length===5 && dimensions.every(r=>r.survey_code===current.survey_code && count(r.employee_respondents) && r.employee_respondents<=current.respondents && finite(r.avg_score)), 'Listening cutoff reconciliation');
    return {as_of:DEMO_CUTOFF,exit_enps:null,summary:{engagement_respondents:current.respondents,engagement_eligible_population:current.eligible_population,engagement_participation_pct:current.participation_pct,engagement_avg_score:current.avg_score,engagement_favorable_pct:current.favorable_pct,pulse_respondents:null,pulse_avg_score:null,pulse_favorable_pct:null,manager_respondents:null,manager_avg_score:null,manager_favorable_pct:null,onboarding_90_respondents:null,onboarding_90_avg_score:null,onboarding_90_favorable_pct:null,exit_respondents:null,open_text_comments:null},engagement_trend:waves.map(r=>omit(r,['response_records','invalid_respondents'])),engagement_dimensions:dimensions,pulse_dimensions:[],manager_dimensions:[],onboarding_dimensions:[],exit_dimensions:[],business_units,exit_reasons:[],data_meta:metadata({sourceLabel:DEMO_CONTRACTS.survey.provenance,listeningWave:current.survey_name,listeningPeriod:'quarterly',validResponseRule:'At least two answered items; invalid respondents excluded from score and participation numerator',responseRecords:current.response_records,invalidRespondents:current.invalid_respondents,unavailable:['pulse','manager','onboarding','exit','eNPS','open-text analysis']})};
  }
  async function preferences() {
    const [summaries,interests,roles,locations,orgs]=await Promise.all(['preferences_summary','preferences_interests','preferences_roles','preferences_locations','preferences_orgs'].map(n=>analytics.read(n)));
    const s=summaries[0];must(summaries.length===1 && s.active_employees===9847 && s.preference_rows===s.employees_with_preference && s.employees_with_multiple_preference_rows===0 && s.latest_preference_update<=DEMO_CUTOFF,'Preference current-record rule');
    const knownProfile=s.employees_with_preference-s.missing_desired_profile-s.unmatched_profile_references,knownLocation=s.employees_with_preference-s.missing_desired_location-s.unmatched_location_references,knownInterest=s.employees_with_preference-s.missing_career_interest;
    must(sum(interests,'employees')===knownInterest && sum(orgs,'active_employees')===9847 && sum(orgs,'employees_with_preference')===s.employees_with_preference && sum(roles,'employees')<=knownProfile && sum(locations,'employees')<=knownLocation,'Preference denominator');
    const share=(rows,n)=>rows.map(r=>({...r,share_pct:n>0?round(r.employees*100/n):null}));
    const {active_employees,employees_with_preference,known_relocation_records,relocation_willing_employees,...quality}=s;
    return {as_of:s.latest_preference_update,summary:{active_employees,employees_with_preference,employees_without_preference:active_employees-employees_with_preference,preference_record_coverage_pct:round(employees_with_preference*100/active_employees),known_relocation_records,relocation_willing_employees,relocation_willing_pct:known_relocation_records?round(relocation_willing_employees*100/known_relocation_records):null,destination_profile_records:knownProfile,destination_location_records:knownLocation,career_interest_records:knownInterest},data_quality:{...quality,distinct_preference_employees:employees_with_preference},career_interests:share(interests,knownInterest),destination_roles:share(roles,knownProfile),desired_locations:share(locations,knownLocation),current_org_coverage:orgs,methodology:['The September 30 active snapshot is the preference-coverage denominator.','Each field uses only known valid responses; duplicate active preference records fail closed.','Constructed preferences do not establish readiness, available movers, suitability or vacancies.','Role and location distributions show at most 15 destinations with their full known-response denominators.'],data_meta:metadata({sourceLabel:'Constructed employee-expressed career preferences; not assessed readiness or future movement'})};
  }
  async function compensation() {
    const rows = await read('finance_current_summary');
    must(rows.length===8 && sum(rows,'headcount')===9847,'Compensation workforce population');
    const response=buildCompensationResponse(rows);
    return {...response,data_meta:metadata({sourceLabel:'Constructed total labor cost; not individual base pay or market pay'})};
  }
  async function ranges() {
    const [jobs, rows, bands]=await Promise.all([read('job_catalog'),read('position_action_structural_inventory'),analytics.read('range_bands')]);
    must(jobs.length===50 && new Set(jobs.map(r=>r.job_profile_code)).size===50,'Job catalog completeness');
    const ranks=new Map();for(const r of rows){must(!ranks.has(r.level_code)||ranks.get(r.level_code)===r.level_rank,'Conflicting catalog rank');ranks.set(r.level_code,r.level_rank);}
    must(bands.length===600 && bands.every(r=>r.common_country_policy===true && finite(r.minimum)&&r.minimum>0&&r.minimum<=r.midpoint&&r.midpoint<=r.maximum),'Constructed band contract');
    return {jobs:sort(jobs,'job_profile_name'),levels:sort([...ranks].map(([level_code,level_rank])=>({level_code,level_rank})),'level_rank'),combinations:rows.map(({org_code,job_profile_code,level_code})=>({org_code,job_profile_code,level_code})),constructedPolicy:{version:'constructed-demo-9847-ranges-v2',bands:bands.map(r=>omit(r,['common_country_policy']))},data_meta:metadata({rangePolicy:'Stored invented range policy v2; identical country assumptions; no employee pay disclosures'})};
  }
  async function finance() {
    const rows=await read('finance_current_summary'), plan=(await component('planning')).data.at(-1);
    must(rows.length===8&&sum(rows,'headcount')===9847,'Finance workforce population');
    const current={headcount:9847,fte:round(sum(rows,'fte')),labor_cost_usd:round(sum(rows,'labor_cost_usd'),2),cost_per_fte_usd:round(sum(rows,'labor_cost_usd')/sum(rows,'fte'),2),vacant_positions:sum(rows,'vacant_positions'),estimated_vacancy_cost_exposure_usd:round(sum(rows,'estimated_vacancy_cost_exposure_usd'),2)};
    return {as_of:DEMO_CUTOFF,current,by_business_unit:sort(rows.map(r=>({...omit(r,['org_unit_id','org_type']),share_of_enterprise_labor_cost_pct:round(r.labor_cost_usd/current.labor_cost_usd*100)})),'labor_cost_usd',true),scenarios:[{...plan,labor_cost_delta_vs_baseline_usd:0,headcount_delta_vs_baseline:0}],data_meta:metadata({sourceLabel:'Constructed labor cost and explicit flat draft planning assumptions; not base pay or forecast validation'})};
  }
  async function handle(request) {
    const url=new URL(request.url),path=url.pathname;must(LOCAL_PARITY_ROUTES.includes(path),'Unsupported local presenter');
    metadata();
    if(LOCAL_PLANNING_ROUTES.includes(path))return planningAdapters.handle(request);
    if(LOCAL_TALENT_ROUTES.includes(path))return talentAdapters.handle(request);
    if(LOCAL_RESPONSE_ROUTES.includes(path))return responseAdapters.handle(request);
    if(LOCAL_EXECUTION_ROUTES.includes(path))return executionAdapters.handle(request);
    if(path==='/api/succession-coverage'){
      const validation=validateSuccessionApiRequest({...requestArgs(request),hasBody:request.body!==null||Number(request.headers.get('content-length')??0)>0||request.headers.has('transfer-encoding')});
      if(!validation.ok)return Response.json({error:validation.error},{status:validation.status,headers:{'Cache-Control':'no-store'}});
    }
    if(request.method!=='GET'||request.body!==null)return Response.json({error:'Method not allowed.'},{status:405});
    if(path!=='/api/dashboard' && !validateDemoRequest(path==='/api/compensation-job-release'?'compensation':'workforce',requestArgs(request),DEMO_CONTRACTS.compensation))return Response.json({error:'Unsupported company scope.'},{status:400});
    try {
      let data;
      if(path==='/api/dashboard') data=await dashboard(url.searchParams);
      else if(path==='/api/workforce') data=await workforce();
      else if(path==='/api/attrition') data=await attrition();
      else if(path==='/api/talent-acquisition') data=await recruiting();
      else if(path==='/api/skills') data=await skills();
      else if(path==='/api/workforce-planning') data=await planning();
      else if(path==='/api/career-growth-mobility') data=await career();
      else if(path==='/api/career-mobility') data=await preferences();
      else if(path==='/api/survey-sentiment') data=await listening();
      else if(path==='/api/compensation') data=await compensation();
      else if(path==='/api/compensation-ranges') data=await ranges();
      else if(path==='/api/finance') data=await finance();
      else if(path==='/api/learning-development') data=await domains.learning();
      else if(path==='/api/position-modeling') data=await domains.positions();
      else if(path==='/api/succession-coverage') data=await domains.succession();
      else if(path==='/api/headcount-trend') data=sort(await read('dashboard_headcount_trend'),'snapshot_date');
      else if(path==='/api/compensation-job-release') {const release=await component('compensation');data={release_id:release.releaseId,snapshot_date:release.cutoff,scope:{country:null,org:null,level:null},convention:release.sourceLabel,rows:release.data,data_meta:metadata({sourceLabel:release.sourceLabel})};}
      else {const stock=(await component('workforce')).data[0];data=path==='/api/headcount'?{headcount:stock.headcount,data_meta:metadata()}:{...stock,data_meta:metadata()};}
      return Response.json(data,{headers:{'Cache-Control':'no-store'}});
    } catch {return Response.json({error:'Local aggregate contract unavailable.'},{status:503});}
  }
  async function projectionInputs() {
    const dataset=metadata();
    const [trend,flows]=await Promise.all([read('dashboard_headcount_trend'),analytics.read('projection_monthly')]);
    must(trend.length===33 && trend[0].snapshot_date==='2024-01-31' && trend[0].headcount===8400 && flows.length===32,'Projection opening history');
    must(hasCompleteReturnedMonthWindow(trend.map(r=>r.snapshot_date)),'Projection month coverage');
    const history=flows.map((row,index)=>{
      must(exact(row,['snapshot_date','headcount','external_starts','exits','promotions','transfers']) && Object.entries(row).every(([key,value])=>key==='snapshot_date'||count(value)),'Projection aggregate disclosure');
      const opening=trend[index],closing=trend[index+1];
      must(row.snapshot_date===closing.snapshot_date && row.headcount===closing.headcount && opening.headcount+row.external_starts-row.exits===closing.headcount,'Projection monthly stock/flow reconciliation');
      return {...row,opening_headcount:opening.headcount};
    });
    must(history.at(-1).snapshot_date===DEMO_CUTOFF && history.at(-1).headcount===9847 && sum(history,'external_starts')===4327 && sum(history,'exits')===2880,'Projection history cutoff');
    const assumptions=await planning();
    return {contract:'local-headcount-projection-inputs-v1',dataset,scope:{country:'all',org:'all',level:'all'},opening:{snapshot_date:'2024-01-31',headcount:8400},history,baseline:{snapshot_date:DEMO_CUTOFF,headcount:9847},flow_convention:'External starts use hires.start_date; exits use separation_date. Internal transfers and promotions change groups, not company headcount.',draft_plan:assumptions,forecast:null,independent_forecast_validation:false,limitations:['Constructed retrospective history, with no as-known ingestion vintages.','October–December 2026 have no observed data or stored plan.','The flat 2027 draft assumes the September stock carries forward; it does not bridge or forecast the unmodeled quarter.','This supplies server-side inputs only; the separate conversation feature owns projection assumptions, calculations and output contracts.']};
  }
  return Object.freeze({supports:path=>LOCAL_PARITY_ROUTES.includes(path),handle,projectionInputs,intakeInputs:executionAdapters.intakeInputs,async groundHome(filters = '',selectionGoal = '',session = {}) {
    must(typeof filters==='string' && (!filters || filters.startsWith('?')), 'Invalid Home scope');
    const results={};
    for(const key of new Set(homeDefinitions.map(row=>row[1]))) {
      const path='/api/'+key;
      if(!LOCAL_PARITY_ROUTES.includes(path)){results[key]={status:'unavailable',data:null};continue;}
      const response=await handle(new Request('http://local.invalid'+path+(key==='dashboard'?filters:'')));
      results[key]=response.ok?{status:'loaded',data:await response.json()}:{status:'unavailable',data:null};
    }
    const pack=buildHomePack(results,filters||'Company workforce; unfiltered',selectionGoal,session);
    return {dataset:metadata(),pack,referenceSemantics:{I1:'Local workforce-owned role mappings; zero mappings is not absence of external occupations',I2:'Independent dated national BLS reference; not loaded by this local workforce reader',I3:'Existing fictional quote catalogue; independent of employee population'},limitation:'Constructed demo aggregates. This grounded packet is not a model answer or a completed action-planning contract.'};
  }});
}
