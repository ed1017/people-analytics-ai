import { developmentCatalog, developmentCost } from "./development-costs.ts";
import { intelligenceEvidence } from "./intelligence-chat.ts";
import { validateSuccessionPublicSummary } from "./succession-public-contract.mjs";
import {normalizeHomeMonthlyRows,selectHomeMonthlyRows} from './home-monthly-evidence.ts';

export const HOME_MAX_BYTES = 48000;
export const HOME_SOURCE_BYTES = 1900;
export const HOME_TIMEOUT_MS = 12000;
const object = v => v && typeof v === "object" && !Array.isArray(v) ? v : {};
const str = v => typeof v === "string" ? v.slice(0,160) : null;
const date = v => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null;
const num = v => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1e15 ? v : null;
const bytes = v => new TextEncoder().encode(JSON.stringify(v)).length;
const fields = s => s.split(" ").filter(Boolean);
const pick = (input, numeric = "", text = "", boolean = "") => {
 const o=object(input), out={};
 for(const k of fields(numeric)) out[k]=o.suppressed===true?null:num(o[k]);
 for(const k of fields(text)) out[k]=/date$|month$|observationDate$/.test(k)?date(o[k]):str(o[k]);
 for(const k of fields(boolean)) out[k]=typeof o[k]==="boolean" ? o[k] : null;
 return out;
};
// IDs, labels, scope, population units and caveats are server-owned, never copied from a client label.
export const homeDefinitions = [
 ["W1","dashboard","Workforce snapshot","workforce","Selected workforce filters","Snapshot employees; FTE capacity; open positions","Observed synthetic aggregate. People, FTE and positions differ.","headcount fte voluntary_turnover_ytd_pct labor_cost_usd open_positions"],
 ["W2","workforce","Workforce composition","workforce","Company-wide; unfiltered","Company employees","Company composition does not follow dashboard filters.","headcount fte people_managers avg_span_of_control full_time_headcount non_full_time_headcount remote_headcount hybrid_headcount onsite_headcount avg_tenure_years"],
 ["A1","attrition","Attrition","attrition","Company-wide; unfiltered","Recorded exits; source-specific turnover denominator","Historical exits are not causes or a forecast.","total_exits voluntary_exits involuntary_exits regrettable_exits retirements total_turnover_ytd_pct voluntary_turnover_ytd_pct annualized_voluntary_turnover_pct regrettable_share_of_voluntary_pct"],
 ["R1","talent-acquisition","Recruiting","talent-acquisition","Company-wide; unfiltered","Applications, hires and requisitions are separate populations","Historical hiring speed is not guaranteed future capacity. No recruiter names.","applications interviewed_applications offered_applications hires application_to_interview_pct interview_to_offer_pct offer_to_hire_pct application_to_hire_pct offer_acceptance_pct open_requisitions open_positions median_time_to_fill_days median_open_req_age_days open_reqs_over_60_days internal_hires external_hires"],
 ["S1","survey-sentiment","Employee Listening","survey-sentiment","Company-wide; survey-specific respondents","Each survey has its own respondent and eligible population","Do not combine survey denominators. No raw comments or eNPS.","engagement_respondents engagement_eligible_population engagement_participation_pct engagement_avg_score engagement_favorable_pct pulse_respondents pulse_avg_score pulse_favorable_pct manager_respondents manager_avg_score manager_favorable_pct onboarding_90_respondents onboarding_90_avg_score onboarding_90_favorable_pct"],
 ["S2","survey-sentiment","Exit survey feedback","attrition","Company-wide; exit respondents","Exit-survey respondents, not workforce headcount","Fieldwork period/monthly trend and suppression metadata unavailable. Reasons/associations are not causes or employee attrition rates. No eNPS.","exit_respondents"],
 ["T1","skills","Skills Intelligence","skills","Company-wide; unfiltered","Current workforce; skill-specific role demand","Threshold counts are skills, not employees. Missing proficiency is not inability or headcount demand.","current_workforce skills_with_demand skills_below_60_pct skills_below_75_pct weighted_requirement_met_pct average_profile_coverage_pct"],
 ["T2","learning-development","Learning pathways","learning-development","Company-wide; unfiltered","Gap skills and active job profiles","Catalogue coverage and duration do not prove readiness or improvement.","current_workforce current_gap_skills gap_skills_with_active_pathway gap_pathway_coverage_pct active_courses_on_gap_skills active_job_profiles job_profiles_with_any_pathway fully_covered_job_profiles"],
 ["T3","career-mobility","Career interests","home","Company-wide; unfiltered","Active employees with recorded preferences","Preferences and relocation willingness are not available or ready movers.","active_employees employees_with_preference employees_without_preference preference_record_coverage_pct known_relocation_records relocation_willing_employees relocation_willing_pct destination_profile_records destination_location_records career_interest_records"],
 ["T4","career-growth-mobility","Recorded mobility","career-growth-mobility","Company-wide; recorded history","Recorded movement events, not unique employees","Partial months and incomplete history are not comparable full periods or population rates.","total_recorded_events distinct_recorded_employees recorded_months","first_recorded_date last_recorded_date","latest_month_partial"],
 ["T5","succession-coverage","Succession coverage","succession-planning","Company-wide; suppression preserved","Filled critical positions","Recorded plans/readiness assessments do not prove capability. Never derive suppressed complements.","critical_job_profiles filled_critical_positions positions_with_recorded_plan positions_without_recorded_plan recorded_plan_coverage_pct positions_with_ready_now positions_without_ready_now ready_now_plan_pct small_cell_threshold","suppression_reason","plan_coverage_suppressed ready_now_suppressed"],
 ["P1","workforce-planning","Stored Planning scenarios","planning-overview","Company-wide; modeled, not observed","Modeled workforce by scenario and month","Refresh date unavailable. Month hires/exits are flows, not cumulative; scenarios are not approved decisions.",""],
 ["P2","position-modeling","Position inventory","position-workforce-design","Company-wide; current inventory","Authorized positions, not employees","Current position inventory only; scenario outcomes require explicit Planning selection.","current_positions filled_positions vacant_positions planned_positions frozen_positions closed_positions vacancy_rate_pct"],
 ["F1","finance","Labor cost planning","finance","Company-wide; current aggregate","Employees/FTE and vacancies; USD labor costs","Not base salary or market benchmarks. Source normalizes missing numeric values; cost period/refresh provenance not established.","headcount fte labor_cost_usd cost_per_fte_usd vacant_positions estimated_vacancy_cost_exposure_usd"],
 ["I1","skills","Occupational mapping","occupational-references","Internal stored mapping; unfiltered","Stored job profiles","O*NET reference content not loaded; release/import date unverified. No external occupation facts.","onet_mapped_job_profiles total_job_profiles"],
 ["I2","bls","US labor market","labor-market","US national; no workforce filters","US national series populations","Each observation has its own date/unit. Not local hiring, salary, company turnover or a forecast.",""],
 ["I3","catalogue","Training and coaching quotes","training-coaching","Fictional examples and unverified session input","Quotes, not employees or measured outcomes","Named examples FICTIONAL; quotes SIMULATED. Custom inputs UNVERIFIED. No ROI, quality or skill-improvement claims.",""],
 ["D1","development","Development comparison","development-planning","User-selected session assumptions; modeled costs","Explicit participants and attendance assumptions","Not approved budgets or measured results. Blank costs unknown; currencies never combined. Time value is not necessarily cash spending.",""],
];
const rowDefinitions = {
 W1:["trend","headcount fte","snapshot_date"], W2:["business_units","headcount fte people_managers avg_span_of_control avg_tenure_years","kind org_name country_name level_name"],
 A1:["reasons","exits pct_of_exits","separation_reason separation_type"],
 R1:["monthly","applications interviewed_applications offers hires","month"],
 S1:["engagement_trend","respondents eligible_population participation_pct avg_score favorable_pct","survey_name launch_date close_date denominator_snapshot_date"],
 S2:["exit_feedback","separation_respondents avg_score favorable_pct exits pct_of_exit_responses","kind primary_reason survey_code survey_name question_code question_text dimension","suppressed"],
 T1:["largest_gaps","employees_in_roles_requiring_skill employees_below_or_missing_requirement requirement_met_pct profile_coverage_pct","skill_name skill_category"],
 T2:["skill_pathways","employees_in_roles_requiring_skill employees_below_or_missing_requirement requirement_met_pct active_course_count shortest_catalog_duration_hours","skill_name","pathway_available"],
 T3:["career_interests","employees share_pct","label"], T4:["composition","events share_pct","movement_type"],
 P1:["scenarios","planned_headcount planned_fte planned_hires planned_exits planned_labor_cost_usd","scenario_name scenario_type planning_month assumptions"],
 I2:["metrics","value","series_id name unit observationDate"],
 I3:["quotes","","provider provenance kind focus format hoursPerSession sessions capacity feePerUnitPerSession currency basis"],
 D1:["options","participants sessions hours fee additionalFees hourlyCost capacity cohorts quoteTotal employeeHours timeCost cashCost total","goal provider currency provenance basis"],
};
const normalRows=(id,rows)=>{const def=rowDefinitions[id];return def && Array.isArray(rows) ? rows.slice(0,3).map(r=>pick(r,def[1],def[2],def[3])):[];};
const factsAvailable = f => Object.values(f).some(v=>v!==null && (!Array.isArray(v)||v.length>0));
function finish(def, input, scope) {
 const [id,,label,page,canonicalScope,population,limitation,numeric,text,bool]=def;
 const src={...object(input)}, raw=object(src.facts);
 const facts={...pick(raw,numeric,text,bool)};
 if(rowDefinitions[id]) facts.rows=normalRows(id,raw.rows);
 if(id==="A1"&&Array.isArray(raw.monthly)) facts.monthly=raw.suppressed===true?[]:normalizeHomeMonthlyRows(raw.monthly);
 if(id==="I1") facts.referenceContentLoaded=false;
 if(id==="I2") facts.rows=normalRows(id,intelligenceEvidence("labor-market",{metrics:facts.rows.map(r=>({...r,raw_value:r.value,observation_date:r.observationDate}))}).metrics);
 // Only a validated complete suppression contract can be used.
 if(id==="T5" && !validateSuccessionPublicSummary({...facts,as_of_date:src.date}).ok) src.status="invalid";
 let status=["loaded","unavailable","timeout","invalid","budget-excluded"].includes(src.status)?src.status:"unavailable";
 if(status==="loaded"&&!factsAvailable(facts))status="unavailable";
 if(id==="I3") facts.rows=facts.rows.map(row=>{
  for(const k of ["hoursPerSession","sessions","capacity","feePerUnitPerSession"])if(typeof row[k]!=="string"||!/^\d+(\.\d{1,2})?$/.test(row[k])||Number(row[k])>1000000)row[k]=null;
  row.currency=["USD","EUR","GBP"].includes(row.currency)?row.currency:null;
  row.basis=["per person per session","per cohort package per session"].includes(row.basis)?row.basis:null;
  row.provenance=row.provenance==="FICTIONAL provider; SIMULATED quote"?row.provenance:"USER PROVIDED; UNVERIFIED";
  return row;
 });
 if(id==="D1") facts.rows=facts.rows.map(row=>{
  row.currency=["USD","EUR","GBP"].includes(row.currency)?row.currency:null;
  row.basis=["person","cohort"].includes(row.basis)?row.basis:null;
  row.provenance=row.provenance==="FICTIONAL / SIMULATED"?row.provenance:"USER PROVIDED / UNVERIFIED";
  const input=Object.fromEntries(["participants","sessions","hours","fee","additionalFees","hourlyCost"].map(k=>[k,row[k]===null?"":String(row[k])]));
  const result=developmentCost({basis:row.basis,capacity:row.capacity===null?"":String(row.capacity)},input);
  for(const k of ["cohorts","quoteTotal","employeeHours","timeCost","cashCost","total"])row[k]=result.errors.length||!row.currency||!row.basis?null:result[k];
  return row;
 });
 if(id==="I1" && facts.onet_mapped_job_profiles===null && facts.total_job_profiles===null)status="unavailable";
 let kept=status==="loaded"?(facts.rows?.length??0):0;
 while(bytes(facts)>HOME_SOURCE_BYTES && kept){facts.rows.pop();kept--;}
 while(bytes(facts)>HOME_SOURCE_BYTES && facts.monthly?.length)facts.monthly.pop();
 if(bytes(facts)>HOME_SOURCE_BYTES) status="budget-excluded";
 const available=num(src.rowsAvailable ?? object(src.coverage).rowsAvailable);
 return {id,label,page,scope:id==="W1"?`Selected workforce snapshot: ${str(scope)||"scope unavailable"}`:canonicalScope,date:["P1","I1","I3","D1"].includes(id)?null:date(src.date),population,limitation,status,
 coverage:{summary:"Allowlisted summary only; not all source rows",rowsAvailable:available,rowsIncluded:kept,selection:str(src.selection ?? object(src.coverage).selection)||"No detail rows",detailTruncated:available!==null&&available>kept,...(id==="A1"&&facts.monthly?{monthly:{rowsIncluded:status==="loaded"?facts.monthly.length:0,selection:"Up to three explicit requested months first, then preceding/prior-year comparisons. Ambiguous years require clarification; otherwise latest three months.",denominator:"Unavailable; snapshot headcount is not a monthly rate denominator."}}:{})},facts:status==="loaded"?facts:null};
}
export function normalizeHomePack(input) {
 const raw=object(input), supplied=Array.isArray(raw.sources)?raw.sources.slice(0,homeDefinitions.length):[];
 const sources=homeDefinitions.map(def=>finish(def,supplied.find(s=>object(s).id===def[0]),raw.workforceScope));
 const pack={version:1,workforceScope:str(raw.workforceScope),sources,coverage:{available:sources.filter(s=>s.facts).length,total:sources.length,limits:`${HOME_MAX_BYTES} UTF-8 bytes total; ${HOME_SOURCE_BYTES} bytes facts/source; at most 3 detail rows/source; text 160 characters.`,selection:"Every configured source summary is attempted. Detail rows match explicit goal words first, then source order; chronological series use recent rows. This is a compact sample, not full app coverage.",unavailable:["Internal Compensation and eNPS unavailable; market pay requires an explicitly supplied reference","Interactive Planning model outputs, role readiness/recruiting comparisons and carried Skills handoffs are not supplied; open Planning for explicit current comparisons"]}};
 if(sources.some(source=>source.facts?.monthly))pack.coverage.limits+=" A1 also permits up to 3 monthly observations; see monthly coverage.";
 // Metadata remains present for every excluded source; never silently drop coverage.
 for(let i=sources.length-1;bytes(pack)>HOME_MAX_BYTES&&i>=0;i--){sources[i].facts=null;sources[i].status="budget-excluded";}
 pack.coverage.available=sources.filter(s=>s.facts).length;
 return pack;
}
export function buildHomePack(results, workforceScope, goal="", session={}) {
 const all=object(results), sourceInputs=[];
 for(const def of homeDefinitions){
  const [id,key]=def;const result=object(all[key]), data=object(result.data);
  let root=id==="W1"?object(data.overview):id==="T4"?object(data.source):["P2","F1"].includes(id)?object(data.current):id==="T5"?data:object(data.summary);
  let rows=[];const rowDef=rowDefinitions[id];let selection="Source order; up to 3 detail rows";
  if(rowDef)rows=Array.isArray(data[rowDef[0]])?data[rowDef[0]]:[];
  if(id==="W2")rows=[...(Array.isArray(data.business_units)?data.business_units:[]).map(r=>({...r,kind:"Business unit composition"})),...(Array.isArray(data.countries)?data.countries:[]).map(r=>({...r,kind:"Country composition"})),...(Array.isArray(data.levels)?data.levels:[]).map(r=>({...r,kind:"Career level composition"}))];
  if(id==="S2")rows=[...(Array.isArray(data.exit_reasons)?data.exit_reasons:[]).map(r=>({...r,kind:"Reported primary reason"})),...(Array.isArray(data.exit_dimensions)?data.exit_dimensions:[]).filter(r=>r.survey_code==="EXIT").map(r=>({...r,kind:"Exit experience question"}))];
  if(id==="P1")rows=rows.flatMap(s=>{const points=Array.isArray(s.points)?s.points:[];return [points[0],points.at(-1)].filter(Boolean).map(p=>({...p,scenario_name:s.scenario_name,scenario_type:s.scenario_type,assumptions:Array.isArray(s.assumptions)?s.assumptions.join("; "):null}));});
  if(id==="I2")rows=intelligenceEvidence("labor-market",{metrics:data.metrics,unavailable:result.status!=="loaded"}).metrics;
  if(id==="I3") {const custom=Array.isArray(session.custom)?session.custom.slice(0,5):[];rows=intelligenceEvidence("training-coaching",{quotes:[...developmentCatalog,...custom.map(q=>({...q,provenance:"user-provided"}))]}).quotes;}
  if(id==="D1")rows=(Array.isArray(session.options)?session.options.slice(0,3):[]).map(o=>{const q=object(o.quote),i=object(o.inputs);const safe=Object.fromEntries(["participants","sessions","hours","fee","additionalFees","hourlyCost"].map(k=>[k,typeof i[k]==="string"?i[k].slice(0,16):""]));const quote={...q,capacity:typeof q.capacity==="string"?q.capacity.slice(0,16):""};const result=developmentCost(quote,safe);return {...Object.fromEntries(Object.entries(safe).map(([k,v])=>[k,v.trim()?Number(v):null])),...(!result.errors.length?result:{}),capacity:Number(q.capacity)||null,goal:o.goal,provider:q.provider,currency:q.currency,provenance:q.provenance==="simulated"?"FICTIONAL / SIMULATED":"USER PROVIDED / UNVERIFIED",basis:q.basis};});
  const available=rows.length;
  if(["W1","R1","S1"].includes(id)){rows=rows.slice(-3);selection="Last 3 returned chronological observations";}
  else {
   const words=String(goal).toLowerCase().match(/[a-z]{4,}/g)||[];
   const current=String(goal).split('\n\nCURRENT USER TURN:\n').at(-1).split(/\n\n(?:Focused issue|Session problem context)/)[0];
   const wantsExitReasons=id==="S2"&&/\bexit[- ](?:surveys?|feedback)\b/i.test(current)&&/\b(?:reasons?|why)\b/i.test(current);
   // Match the requested measure before lexical sampling: "survey" appears on
   // experience questions but not primary-reason rows. Never derive reasons from scores.
   rows=rows.map((r,index)=>({r,index,measure:wantsExitReasons&&r.kind==="Reported primary reason"?1:0,score:(id==="I3"&&r.id===session.selected?100:0)+words.filter(w=>JSON.stringify(r).toLowerCase().includes(w)).length})).sort((a,b)=>b.measure-a.measure||b.score-a.score||a.index-b.index).map(x=>x.r);
   selection=wantsExitReasons?"Reported primary-reason rows first for the current exit-survey reason question; then explicit word matches and source order; up to 3 rows":"Explicit goal-word matches first, then source order; no priority ranking";
  }
  root=pick(root,def[7],def[8],def[9]);
  if(id==="A1"&&Array.isArray(data.trend)&&data.trend.length)root.monthly=selectHomeMonthlyRows(data.trend,goal);
  sourceInputs.push({id,status:["I3","D1"].includes(id)?"loaded":result.status,date:id==="W1"?data.overview?.snapshot_date:id==="T4"?data.source?.last_recorded_date:id==="T5"?data.as_of_date:["P1","I1","I3","D1"].includes(id)?null:data.as_of??data.latest_date,rowsAvailable:available,selection,facts:{...root,rows:normalRows(id,rows)}});
 }
 return normalizeHomePack({workforceScope,sources:sourceInputs});
}
export async function readHomeSource(url, signal, timeoutMs=HOME_TIMEOUT_MS, fetcher=fetch) {
 const controller=new AbortController();let timedOut=false;
 const abort=()=>controller.abort();signal?.addEventListener("abort",abort,{once:true});if(signal?.aborted)abort();
 let timer;
 try {
  const request=(async()=>{const response=await fetcher(url,{cache:"no-store",signal:controller.signal});if(!response.ok)return {status:"unavailable",data:null};return {status:"loaded",data:await response.json()};})();
  const timeout=new Promise(resolve=>{timer=setTimeout(()=>{timedOut=true;controller.abort();resolve({status:"timeout",data:null});},timeoutMs);});
  return await Promise.race([request,timeout]);
 }catch{return {status:timedOut?"timeout":"unavailable",data:null};}
 finally {clearTimeout(timer);signal?.removeEventListener("abort",abort);}
}
