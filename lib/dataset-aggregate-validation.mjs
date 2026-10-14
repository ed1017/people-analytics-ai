/** Strict local aggregate boundary. Hashes bind bytes; these checks bind shapes
 * and accounting. They do not attest real-world accuracy or public clearance. */
import {isDeepStrictEqual} from 'node:util';
import {AGGREGATE_ROW_SCHEMAS} from './dataset-aggregate-row-schema.mjs';
import {exact} from './dataset-demo-contracts.mjs';
import {DatasetRouter} from './dataset-router.mjs';
import {createLocalDatasetIntegration} from './dataset-local-integration.mjs';

const must=(value,label)=>{if(!value)throw Error('Aggregate contract: '+label);};
function shape(value,schema,path){
 if(typeof schema==='string'){
  const numeric=typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=Number.MAX_SAFE_INTEGER;
  const ok=schema==='null'?value===null:schema==='boolean'?typeof value==='boolean':schema==='integer'?numeric&&Number.isSafeInteger(value):schema==='number'?numeric:schema==='date'?typeof value==='string'&&/^\d{4}-\d\d-\d\d$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value:schema==='uuid'?typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value):false;
  must(ok,path);return;
 }
 if(Object.hasOwn(schema,'enum')){must(schema.enum.includes(value),path);return;}
 if(Object.hasOwn(schema,'nullable')){if(value!==null)shape(value,schema.nullable,path);return;}
 if(Object.hasOwn(schema,'array')){must(Array.isArray(value)&&value.length<=5000,path);for(const row of value)shape(row,schema.array,path+'[]');return;}
 must(exact(value,Object.keys(schema)),path+' fields');
 for(const [key,child]of Object.entries(schema))shape(value[key],child,path+'.'+key);
}
const identities={
 attrition_business_unit_summary:'org_code',attrition_level_summary:'level_code',attrition_monthly_trend:'month',attrition_reason_summary:'separation_type separation_reason',attrition_tenure_summary:'tenure_band',
 career_monthly:'month',career_transitions:'movement_type from_level to_level',dashboard_headcount_trend:'snapshot_date',finance_current_summary:'org_code',job_catalog:'job_profile_code',learning_courses:'skill_code',learning_jobs:'job_profile_code',
 position_action_structural_inventory:'org_code job_profile_code level_code',position_current:'org_code level_code',position_plan:'org_code level_code planning_month',preferences_interests:'code',preferences_locations:'location_code',preferences_orgs:'org_code',preferences_roles:'code',projection_monthly:'snapshot_date',range_bands:'job level',
 response_recruiting:'skill_code',response_requirements:'job_profile_code skill_code',role_recruiting:'job_profile_code',role_recruiting_monthly:'job_profile_code month',role_recruiting_timing:'job_profile_code',scenario_family:'family_code planning_month',scenario_org:'org_code planning_month',structural_inventory:'org_code job_profile_code level_code',structural_requirements:'job_profile_code skill_code',structural_signals:'skill_code',structural_supply:'skill_code',
 survey_business_units:'org_code',survey_dimensions:'survey_code question_code',survey_inventory:'survey_type',survey_waves:'survey_code',talent_acquisition_business_unit_summary:'org_code',talent_acquisition_monthly_summary:'month',talent_acquisition_recruiter_summary:'recruiter_name',talent_acquisition_source_summary:'source_code',talent_catalog:'code',talent_fit:'job_profile_code',talent_gaps:'job_profile_code skill_code',workforce_business_unit_summary:'org_code',workforce_country_summary:'country_code',workforce_level_summary:'level_code',workforce_movement_summary:'month movement_type',workforce_tenure_summary:'tenure_band',
};
export function validateAggregateRows(aggregates,components){
 must(exact(aggregates,Object.keys(AGGREGATE_ROW_SCHEMAS)),'query inventory');
 for(const [name,schema]of Object.entries(AGGREGATE_ROW_SCHEMAS)){
  const rows=aggregates[name];must(Array.isArray(rows)&&rows.length>0&&rows.length<=5000,name+' rows');
  const keys=identities[name]?.split(' ');if(!keys)must(rows.length===1,name+' singleton');
  const seen=new Set();for(const row of rows){shape(row,schema,name);const key=JSON.stringify(keys?keys.map(k=>row[k]):0);must(!seen.has(key),name+' duplicate identity');seen.add(key);}
  for(const row of rows){
   // Regrettable exits are a subset of voluntary exits in this contract.
   // Do not apply a generic percentage cap: stock-based turnover can exceed 100%.
   if(name.startsWith('attrition_')&&Object.hasOwn(row,'voluntary_exits')){
    must(row.voluntary_exits<=(row.total_exits??row.exits),name+' voluntary exits exceed exits');
    must(row.regrettable_exits<=row.voluntary_exits,name+' regrettable exits exceed voluntary exits');
    if(Object.hasOwn(row,'involuntary_exits'))must(row.voluntary_exits+row.involuntary_exits===row.total_exits,name+' exit type partition');
   }
   // All three survey projections use the constructed likert_1_5 instrument:
   // means of answered 1..5 items and a favorable (answer >= 4) share, not eNPS.
   if(['survey_waves','survey_dimensions','survey_business_units'].includes(name)){
    must(row.avg_score>=1&&row.avg_score<=5,name+' avg_score outside 1..5');
    must(row.favorable_pct<=100,name+' favorable_pct outside 0..100');
   }
   if(Object.hasOwn(row,'headcount')){must(row.headcount<=9847,name+' headcount bound');if(Object.hasOwn(row,'fte'))must(row.fte<=row.headcount,name+' FTE bound');if(Object.hasOwn(row,'people_managers'))must(row.people_managers<=row.headcount,name+' manager count');}
   if(Object.hasOwn(row,'employees_with_skill'))must(row.employees_with_skill<=9847,name+' skill population');
   for(const [code,label,prefix]of [['org_code','org_name','Demo '],['country_code','country_name','Demo '],['job_profile_code','job_profile_name','Demo ']])if(Object.hasOwn(row,code)&&Object.hasOwn(row,label))must(row[label]===prefix+row[code],name+' catalog label');
   if(Object.hasOwn(row,'level_code')&&Object.hasOwn(row,'level_name'))must(row.level_name==='Demo level '+row.level_code.slice(1),name+' level label');
  }
 }
 const stock=components.workforce.payload[0],a=aggregates;
 must(isDeepStrictEqual(a.dashboard[0].payload.overview,stock),'dashboard/sealed workforce');
 must(isDeepStrictEqual(a.dashboard[0].payload.trend,a.dashboard_headcount_trend),'dashboard trend');
 const options=a.dashboard[0].payload.filter_options;
 for(const [key,values,label]of [['countries',a.workforce_country_summary.map(r=>r.country_code),value=>'Demo '+value],['business_units',a.workforce_business_unit_summary.map(r=>r.org_code),value=>'Demo '+value],['levels',Array.from({length:12},(_,i)=>'L'+(i+1)),value=>'Demo level '+value.slice(1)]]){
  must(isDeepStrictEqual(options[key].map(r=>r.value).sort(),[...values].sort())&&options[key].every(r=>r.label===label(r.value)),'dashboard filter options');
 }
 must(a.workforce_current_summary[0].headcount===stock.headcount&&a.workforce_current_summary[0].fte===stock.fte,'workforce/sealed population');
 const sum=(rows,key)=>rows.reduce((n,r)=>n+r[key],0),close=(x,y)=>Math.abs(x-y)<0.011;
 for(const name of ['workforce_business_unit_summary','workforce_country_summary','workforce_level_summary','workforce_tenure_summary','finance_current_summary']){
  must(sum(a[name],'headcount')===stock.headcount&&close(sum(a[name],'fte'),stock.fte),name+' sealed partition');
 }
 must(close(sum(a.finance_current_summary,'labor_cost_usd'),stock.labor_cost_usd)&&sum(a.finance_current_summary,'vacant_positions')===stock.open_positions,'finance/sealed cost and vacancies');
 must(a.position_integrity[0].active_employees===stock.headcount&&a.talent_integrity[0].active_headcount===stock.headcount&&a.preferences_summary[0].active_employees===stock.headcount,'domain/sealed population');
 must(a.dashboard_headcount_trend.length===33&&a.projection_monthly.length===32,'history length');
 for(const [i,row]of a.dashboard_headcount_trend.entries())must(row.snapshot_date===new Date(Date.UTC(2024,i+1,0)).toISOString().slice(0,10),'history calendar');
 let previous=a.dashboard_headcount_trend[0];must(previous.snapshot_date==='2024-01-31'&&previous.headcount===8400,'history opening');
 for(let i=0;i<32;i++){
  const f=a.projection_monthly[i],next=a.dashboard_headcount_trend[i+1];must(f.snapshot_date===next.snapshot_date&&f.headcount===next.headcount&&previous.headcount+f.external_starts-f.exits===next.headcount,'monthly headcount identity');previous=next;
 }
 must(previous.snapshot_date===stock.snapshot_date&&previous.headcount===stock.headcount&&sum(a.projection_monthly,'external_starts')===4327&&sum(a.projection_monthly,'exits')===2880,'history endpoint');
 const ytd=a.dashboard_headcount_trend.slice(24),average=sum(ytd,'headcount')/9,exits=a.attrition_current_summary[0],rounded=(n,places=1)=>Math.round(n*10**places)/10**places;
 must(exits.voluntary_turnover_ytd_pct===stock.voluntary_turnover_ytd_pct&&exits.voluntary_turnover_ytd_pct===rounded(100*exits.voluntary_exits/average)&&exits.total_turnover_ytd_pct===rounded(100*exits.total_exits/average),'declared company turnover');
 must(exits.annualized_voluntary_turnover_pct===rounded(100*exits.voluntary_exits/average*12/9),'annualized company turnover');
 must(exits.regrettable_share_of_voluntary_pct===rounded(100*exits.regrettable_exits/exits.voluntary_exits),'regrettable share of voluntary exits');
 // Only Jan–Sep 2026 exits belong to the current and group summaries. Monthly
 // rates use their own month-end stock, never the YTD average or all history.
 must(a.attrition_monthly_trend.length===33,'attrition monthly calendar');
 for(const [i,row]of a.attrition_monthly_trend.entries()){
  const stock=a.dashboard_headcount_trend[i];
  must(row.month===stock.snapshot_date.slice(0,8)+'01','attrition monthly calendar');
  must(row.monthly_turnover_pct===rounded(100*row.total_exits/stock.headcount,2)&&row.monthly_voluntary_turnover_pct===rounded(100*row.voluntary_exits/stock.headcount,2),'attrition monthly turnover');
 }
 const currentMonths=a.attrition_monthly_trend.filter(row=>row.month>='2026-01-01'&&row.month<='2026-09-01');
 for(const metric of ['total_exits','voluntary_exits','involuntary_exits','regrettable_exits'])must(sum(currentMonths,metric)===exits[metric],'attrition YTD '+metric+' reconciliation');
 for(const name of ['attrition_business_unit_summary','attrition_level_summary','attrition_tenure_summary']){
  for(const metric of ['voluntary_exits','regrettable_exits'])must(sum(a[name],metric)===exits[metric],name+' YTD '+metric+' reconciliation');
 }
 for(const row of a.attrition_reason_summary)must(row.pct_of_exits===rounded(100*row.exits/exits.total_exits),'attrition reason share');
 for(const type of ['voluntary','involuntary'])must(sum(a.attrition_reason_summary.filter(row=>row.separation_type===type),'exits')===exits[type+'_exits'],'attrition reason '+type+' reconciliation');
 must(Math.abs(a.scenario_history[0].average_headcount-average)<1e-8&&a.scenario_history[0].exits===exits.total_exits,'scenario history denominator');
}

/** Reuse domain-specific validators before any aggregate can be served. All
 * requests stay in memory; no production selector, handler, network or model. */
export async function preflightAggregateSemantics(provider,analytics){
 const id=provider.datasetId,router=new DatasetRouter({[id]:provider},{read:async()=>({datasetId:id,digest:provider.digest,generation:1})});
 const integration=createLocalDatasetIntegration({router,candidateDatasetId:id,analytics});
 const call=async(path,body)=>{
  const req=new Request('http://local.invalid'+path,{headers:{'x-workforce-dataset':id+':1',...(body?{'content-type':'application/json'}:{})},...(body?{method:'POST',body:JSON.stringify(body)}:{})});
  const result=await integration.handle(req);must(result.ok,'presenter reconciliation '+path);return result;
 };
 const base=['workforce','attrition','talent-acquisition','overview','headcount','headcount-trend','dashboard','compensation','compensation-ranges','compensation-job-release','skills','career-growth-mobility','career-mobility','survey-sentiment','workforce-planning','finance','learning-development','position-modeling','succession-coverage','position-actions','position-structure','scenario-modeler','business-unit-scenario','occupational-reference'];
 for(const name of base)await call('/api/'+name);
 const catalog=await analytics.read('talent_catalog');
 // Both role validators inspect full inventories and every selected role's
 // distributions; calling all roles also closes per-role-only branches.
 for(const role of catalog)for(const endpoint of ['internal-talent-readiness','role-buy-feasibility'])await call('/api/'+endpoint+'?job_profile='+encodeURIComponent(role.code));
 const job=catalog[0].code,actions=[{action_type:'add_positions',business_unit:null,level:null,job_profile:job,amount:1,fill_pct:null}];
 await call('/api/role-workforce-response-plan',{actions,job_profile:job,allocation:{build:0,move:0,buy:0,borrow:0,automate:0}});
}
