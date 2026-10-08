import {DEMO_JOB_CODES,DEMO_CUTOFF,exact} from './dataset-demo-contracts.mjs';
import {calculateRoleBuyScale} from './role-buy-feasibility-math.ts';
import {summarizeRecruitingTiming} from './recruiting-timing.ts';
import {isOccupationCode,unavailableReferenceDetail} from './occupational-reference.ts';
export const LOCAL_TALENT_ROUTES=Object.freeze(['/api/internal-talent-readiness','/api/role-buy-feasibility','/api/occupational-reference']);
const must=(v,m)=>{if(!v)throw Error(m);},count=v=>Number.isSafeInteger(v)&&v>=0,finite=v=>typeof v==='number'&&Number.isFinite(v),label=v=>typeof v==='string'&&v.trim().length>0&&v.length<300;
const sum=(rows,key)=>rows.reduce((n,r)=>n+r[key],0),round=n=>Math.round(n*10)/10,pct=(n,d)=>d>0?round(100*n/d):null;
const unique=(rows,key)=>new Set(rows.map(r=>r[key])).size===rows.length;
const fields=s=>s.split(' '),pick=(r,keys)=>Object.fromEntries(keys.map(k=>[k,r[k]]));
const fitFields=fields('job_profile_code active_preferences incumbents eligible unknown_profiles all_thresholds_met within_gap_rule beyond_gap_rule fully_course_covered partly_course_covered no_course_coverage');
const gapFields=fields('job_profile_code skill_code skill_name required_proficiency active_course_count shortest_active_course_hours candidates_below_requirement total_shortfall');
const integrityFields=fields('active_headcount duplicate_snapshot_people preferences duplicate_preferences invalid_preferences invalid_skill_profiles active_skill_profiles invalid_requirements duplicate_requirements mappings occupations external_skill_ratings external_software_examples');
const recruitingFields=fields('job_profile_code requisitions open_requisitions open_applicants open_advanced_candidates open_interviews open_offers internal_fills external_fills external_applicants external_offers external_accepted_offers evidence_start median_time_to_fill_days recent_external_fills');
const timingCounts=fields('eligible_rows distinct_requisitions duplicate_requisitions_excluded missing_or_invalid_acceptance missing_or_invalid_start future_starts_excluded');
const distributions=fields('opening_to_accepted_offer accepted_offer_to_start opening_to_start');
class RequestError extends Error{constructor(message,status=400){super(message);this.status=status;}}
const req=(v,m)=>{if(!v)throw new RequestError(m);};

export function createTalentAdapters({analytics,metadata}){
 async function read(name){const r=await analytics.read(name);must(Array.isArray(r)&&r.length>0,'Missing talent input');return r;}
 function context(extra={}){return metadata({sourceLabel:'Constructed demo role evidence; no assessed readiness or future hiring capacity',independentForecastValidation:false,...extra});}
 async function catalog(){
  const [rows,counts]=await Promise.all([read('talent_catalog'),read('talent_integrity')]);const integrity=counts[0];
  must(counts.length===1&&exact(integrity,integrityFields)&&Object.values(integrity).every(count),'Talent source integrity');
  must(integrity.active_headcount===9847&&integrity.preferences===4924&&integrity.active_skill_profiles===9847*5&&['duplicate_snapshot_people','duplicate_preferences','invalid_preferences','invalid_skill_profiles','invalid_requirements','duplicate_requirements','mappings','occupations','external_skill_ratings','external_software_examples'].every(k=>integrity[k]===0),'Talent population or boundary mismatch');
  must(rows.length===50&&unique(rows,'id')&&unique(rows,'code')&&sum(rows,'current_headcount')===9847,'Role catalog completeness');
  for(const r of rows){must(exact(r,fields('id code name description active current_headcount requirements'))&&label(r.id)&&DEMO_JOB_CODES.includes(r.code)&&label(r.name)&&(r.description===null||label(r.description))&&r.active===true&&count(r.current_headcount)&&Array.isArray(r.requirements)&&r.requirements.length===3&&unique(r.requirements,'skill_code'),'Role catalog');
   for(const s of r.requirements)must(exact(s,fields('skill_code name requiredProficiency importance'))&&label(s.skill_code)&&label(s.name)&&s.requiredProficiency===3&&s.importance==='required','Role requirement');
  }
  return {rows,integrity};
 }
 const selected=(rows,requested)=>{const term=requested.trim().toLowerCase(),matches=rows.filter(r=>[r.code.toLowerCase(),r.name.toLowerCase()].includes(term));req(matches.length===1,'The selected job profile must identify one constructed active role.');return matches[0];};
 async function talent(role,c){
  const [fits,gaps]=await Promise.all([read('talent_fit'),read('talent_gaps')]);
  must(fits.length===50&&unique(fits,'job_profile_code')&&sum(fits,'active_preferences')===c.integrity.preferences&&gaps.length===150&&new Set(gaps.map(r=>r.job_profile_code+':'+r.skill_code)).size===150,'Profile-fit population');
  for(const r of fits){must(exact(r,fitFields)&&DEMO_JOB_CODES.includes(r.job_profile_code)&&fitFields.slice(1).every(k=>count(r[k]))&&r.active_preferences===r.incumbents+r.eligible&&r.eligible===r.unknown_profiles+r.all_thresholds_met+r.within_gap_rule+r.beyond_gap_rule&&r.within_gap_rule===r.fully_course_covered+r.partly_course_covered+r.no_course_coverage,'Profile-fit partition');}
  for(const g of gaps){const f=fits.find(r=>r.job_profile_code===g.job_profile_code),j=c.rows.find(r=>r.code===g.job_profile_code);must(exact(g,gapFields)&&f&&j?.requirements.some(r=>r.skill_code===g.skill_code&&r.requiredProficiency===g.required_proficiency)&&label(g.skill_name)&&count(g.active_course_count)&&(g.shortest_active_course_hours===null||finite(g.shortest_active_course_hours)&&g.shortest_active_course_hours>0)&&count(g.candidates_below_requirement)&&g.candidates_below_requirement<=f.within_gap_rule&&count(g.total_shortfall)&&g.total_shortfall>=g.candidates_below_requirement&&g.total_shortfall<=g.candidates_below_requirement*2,'Profile gap coverage');}
  const f=fits.find(r=>r.job_profile_code===role.code),roleGaps=gaps.filter(g=>g.job_profile_code===role.code);must(roleGaps.length===3,'Role gap completeness');
  return {as_of:DEMO_CUTOFF,job_profile_code:role.code,job_profile_name:role.name,required_skill_count:3,assessment_status:'not_assessed',
   candidate_pool:{active_with_profile_preference:f.active_preferences,already_in_target_role:f.incumbents,eligible_internal_candidates:f.eligible,role_ready:null,near_ready:null,longer_term:null,role_ready_pct:null,ready_or_near_ready_pct:null},
   top_near_ready_skill_gaps:[],development_pathway_coverage:{near_ready_candidates:null,fully_pathway_covered_candidates:null,partially_pathway_covered_candidates:null,no_active_pathway_candidates:null,fully_pathway_covered_pct:null},
   readiness_rules:{required_skills_gate_readiness:true,preferred_skills_gate_readiness:false,near_ready_max_missing_required_skills:2,near_ready_max_total_proficiency_shortfall:2},
   profile_fit:{status:'constructed_threshold_comparison',eligible_profiles:f.eligible,unknown_profiles:f.unknown_profiles,all_required_thresholds_met:f.all_thresholds_met,within_two_skill_two_point_gap_rule:f.within_gap_rule,beyond_gap_rule:f.beyond_gap_rule,
    all_thresholds_met_pct:pct(f.all_thresholds_met,f.eligible),course_coverage:{within_gap_rule_profiles:f.within_gap_rule,fully_covered:f.fully_course_covered,partly_covered:f.partly_course_covered,uncovered:f.no_course_coverage},
    gaps:roleGaps.filter(g=>g.candidates_below_requirement>0).map(g=>({...pick(g,fields('skill_code skill_name required_proficiency active_course_count shortest_active_course_hours')),profiles_below_requirement:g.candidates_below_requirement,avg_profile_shortfall:round(g.total_shortfall/g.candidates_below_requirement)})).sort((a,b)=>b.profiles_below_requirement-a.profiles_below_requirement||a.skill_code.localeCompare(b.skill_code))},
   availability:{assessed_ready_people:null,available_movers:null,release_capacity:null,time_to_readiness:null},
   methodology:[
    'The pool is the active September snapshot with a recorded preference for this role, excluding current incumbents. Preference is not willingness, eligibility, release approval or availability.',
    'Skill values and preferences were deterministically constructed. The stored assessment_source label does not establish a real assessment. Readiness fields remain null, never zero or a proxy count.',
    'Profile-fit buckets compare authored skill values with all three role requirements. The near-threshold rule allows at most two gaps and two total points. Profiles with missing values are unknown, not presumed unskilled.',
    'The profile-fit buckets partition the eligible pool. Course coverage partitions only the within-gap-rule profiles; skill gap counts may overlap and must not be summed as unique people.',
    'Catalog availability and shortest duration do not establish completion, proficiency gain, assessed readiness or time to readiness.',
    'Company-wide role scope only. Dashboard BU, country and level filters do not narrow this cohort. No employee identities or individual recommendations are returned.',
   ],data_meta:context({readinessSemantics:'not-assessed-with-separate-profile-fit',sourceLabel:'Constructed demo profile-fit signals; assessed readiness and mover availability are not supplied'})};
 }
 async function recruiting(role){
  const [rows,months,timing,checks]=await Promise.all([read('role_recruiting'),read('role_recruiting_monthly'),read('role_recruiting_timing'),read('role_recruiting_integrity')]);
  const check=checks[0];must(checks.length===1&&exact(check,fields('metric_rows distinct_requisitions chronology_errors invalid_metrics unknown_fill_class'))&&Object.values(check).every(count)&&check.metric_rows===5143&&check.distinct_requisitions===5143&&check.chronology_errors===0&&check.invalid_metrics===0&&check.unknown_fill_class===0,'Recruiting source integrity');
  must(rows.length===50&&unique(rows,'job_profile_code')&&months.length===600&&new Set(months.map(r=>r.job_profile_code+':'+r.month)).size===600&&timing.length===50&&unique(timing,'job_profile_code')&&sum(rows,'requisitions')===check.metric_rows&&sum(rows,'external_fills')===4327&&sum(rows,'internal_fills')===619&&sum(rows,'open_requisitions')===197,'Recruiting workforce reconciliation');
  for(const r of rows){must(exact(r,recruitingFields)&&DEMO_JOB_CODES.includes(r.job_profile_code)&&recruitingFields.filter(k=>!['job_profile_code','evidence_start','median_time_to_fill_days'].includes(k)).every(k=>count(r[k]))&&r.requisitions===r.open_requisitions+r.external_fills+r.internal_fills&&r.external_accepted_offers<=r.external_offers&&(r.evidence_start===null||/^\d{4}-\d\d-\d\d$/.test(r.evidence_start)&&r.evidence_start<=DEMO_CUTOFF)&&(r.median_time_to_fill_days===null||finite(r.median_time_to_fill_days)&&r.median_time_to_fill_days>=0),'Role recruiting values');
   const m=months.filter(x=>x.job_profile_code===r.job_profile_code);must(m.length===12&&m.every((x,i)=>exact(x,fields('job_profile_code month external_fills'))&&x.month===new Date(Date.UTC(2025,9+i,1)).toISOString().slice(0,10)&&count(x.external_fills))&&sum(m,'external_fills')===r.recent_external_fills,'Role trailing-year partition');
   const t=timing.find(x=>x.job_profile_code===r.job_profile_code);must(t&&exact(t,['job_profile_code',...timingCounts,...distributions])&&timingCounts.every(k=>count(t[k]))&&t.eligible_rows===r.recent_external_fills&&t.distinct_requisitions===t.eligible_rows&&t.duplicate_requisitions_excluded===0,'Timing scope');
   for(const k of distributions){const d=t[k];must(exact(d,fields('valid_sample_count p25_days median_days p75_days'))&&count(d.valid_sample_count)&&d.valid_sample_count<=t.eligible_rows&&(d.valid_sample_count<5?[d.p25_days,d.median_days,d.p75_days].every(v=>v===null):[d.p25_days,d.median_days,d.p75_days].every(v=>finite(v)&&v>=0)&&d.p25_days<=d.median_days&&d.median_days<=d.p75_days),'Timing distribution');}
   must(t.opening_to_accepted_offer.valid_sample_count+t.missing_or_invalid_acceptance===t.eligible_rows&&t.opening_to_start.valid_sample_count===t.accepted_offer_to_start.valid_sample_count&&t.opening_to_start.valid_sample_count+t.missing_or_invalid_start+t.future_starts_excluded===t.opening_to_accepted_offer.valid_sample_count,'Timing cohort partition');
  }
  return {r:rows.find(r=>r.job_profile_code===role.code),months:months.filter(r=>r.job_profile_code===role.code),t:timing.find(r=>r.job_profile_code===role.code)};
 }
 function buy(role,input,requested){
  const {r,t,months}=input,scale=calculateRoleBuyScale(requested,r.recent_external_fills),timing=summarizeRecruitingTiming([],role.code,DEMO_CUTOFF,'2025-10-01');Object.assign(timing,pick(t,timingCounts));
  for(const key of distributions)timing[key]={...t[key],minimum_benchmark_sample:5,status:t[key].valid_sample_count>=5?'historical benchmark available':'insufficient comparable history'};
  const warnings=['Constructed demo recruiting history uses authored successful fills. It is not an observed success rate, available talent pool or estimate of future concurrent hiring capacity.'];
  if(requested>0&&r.external_fills===0)warnings.push('No historical external fills for this role; no role-level scale benchmark is available.');
  if(requested>r.recent_external_fills&&r.recent_external_fills>0)warnings.push('Requested Buy exceeds trailing-year external fills; that descriptive comparison does not establish infeasibility.');
  if(requested>0&&r.open_requisitions===0)warnings.push('No open requisition for this role at the cutoff; a future requirement needs a separately approved requisition.');
  return {as_of:DEMO_CUTOFF,job_profile_code:role.code,job_profile_name:role.name,current_pipeline:{open_requisitions:r.open_requisitions,applicants:r.open_applicants,advanced_candidates:r.open_advanced_candidates,interviews:r.open_interviews,offers:r.open_offers},
   historical_external:{filled_requisitions:r.external_fills,recent_12m_filled_requisitions:r.recent_external_fills,recent_12m_avg_monthly_fills:scale.recent_12m_avg_monthly_fills,recent_12m_peak_monthly_fills:Math.max(...months.map(r=>r.external_fills)),median_time_to_fill_days:r.median_time_to_fill_days,offer_acceptance_rate_pct:pct(r.external_accepted_offers,r.external_offers),applicants_per_filled_requisition:r.external_fills?round(r.external_applicants/r.external_fills):null,evidence_start_date:r.evidence_start,recent_12m_window_start:'2025-10-01'},
   timing_evidence:timing,requested_buy:requested,buy_scale:pick(scale,fields('pct_of_recent_12m_external_fills multiple_of_recent_avg_monthly_fills')),future_capacity:{available_hires:null,simultaneous_hiring_capacity:null,forecast_arrival_date:null},warnings,
   methodology:['Company-wide role history only; BU/country/level selections do not narrow this source. Open pipeline is not subtracted from new demand.',
    'The trailing-year cohort uses external filled requisitions closed October 1, 2025 through September 30, 2026. Internal fills are movements and are excluded from external hiring scale.',
    'Opening-to-accepted-offer timing differs from the TA dashboard opening-to-closure measure. Only start_date contributes external headcount inflow; accepted offers and closures do not.',
    'Timing percentiles use paired dates and at least five valid records. They describe constructed historical spread, not forecast confidence, capacity or a promised arrival date.',
    'All twelve monthly buckets, including zero months, contribute to the average. Buy ratios use the unrounded monthly denominator.',
    'No employee/candidate/requisition records are exported, no records are changed and no future outcomes are generated.'],
   data_meta:context({sourceLabel:'Constructed demo external recruiting history; future hiring capacity is unknown'})};
 }
 async function handle(request){
  metadata();try{
   const url=new URL(request.url),path=url.pathname,p=url.searchParams;must(LOCAL_TALENT_ROUTES.includes(path),'Unknown talent route');
   if(request.method!=='GET')throw new RequestError('Method not allowed.',405);
   req(request.body===null&&Number(request.headers.get('content-length')??0)===0&&!request.headers.has('transfer-encoding'),'GET does not accept a body.');
   const occupational=path==='/api/occupational-reference',keys=occupational?['occupation']:path==='/api/role-buy-feasibility'?['job_profile','requested_buy']:['job_profile'];
   for(const k of p.keys())req(keys.includes(k)&&p.getAll(k).length===1,'Unsupported role evidence scope.');
   if(occupational){
    const code=p.get('occupation');if(code!==null){req(isOccupationCode(code),'Invalid occupation code.');return Response.json({...unavailableReferenceDetail(code),data_meta:context({externalReferenceStatus:'not-bound',sourceLabel:'No candidate external-reference provider is bound; no occupation details were acquired'})},{headers:{'Cache-Control':'no-store'}});}
    const c=await catalog();return Response.json({kind:'index',profiles:c.rows.map(r=>({...pick(r,fields('id code name description active')),mapping:null,requirements:r.requirements.map(s=>pick(s,fields('name requiredProficiency importance')))})),occupations:[],mappedProfileCount:0,sources:{profiles:'ready',mappings:'ready',occupations:'unavailable',requirements:'ready',skills:'ready'},data_meta:context({sourceLabel:'Constructed demo role catalog and requirements; zero stored workforce mappings',externalReferenceStatus:'not-bound',publicExcerptBoundary:'Existing editorial starter excerpts have their own pinned provenance; they are not mappings or September workforce evidence.'})},{headers:{'Cache-Control':'no-store'}});
   }
   const name=p.get('job_profile');req(label(name)&&name.length<=120,'job_profile is required and must be bounded.');
   const raw=p.get('requested_buy');req(raw===null||/^\d{1,4}(?:\.\d{1,6})?$/.test(raw)&&Number(raw)<=5000,'requested_buy must be between 0 and 5000.');
   const c=await catalog(),role=selected(c.rows,name),data=path==='/api/internal-talent-readiness'?await talent(role,c):buy(role,await recruiting(role),round(raw===null?0:Number(raw)));
   return Response.json(data,{headers:{'Cache-Control':'no-store'}});
  }catch(error){return Response.json({error:error instanceof RequestError?error.message:'Local role evidence is unavailable.'},{status:error instanceof RequestError?error.status:503,headers:{'Cache-Control':'no-store'}});}
 }
 return Object.freeze({handle,async roleEvidence(name,requested){
  metadata();req(label(name)&&name.length<=120&&finite(requested)&&requested>=0&&requested<=200000,'Invalid role evidence request.');
  const c=await catalog(),role=selected(c.rows,name);
  const [readiness,history]=await Promise.all([talent(role,c),recruiting(role)]);
  return {role,readiness,buy:buy(role,history,requested)};
 }});
}

export {RequestError as TalentRequestError};
