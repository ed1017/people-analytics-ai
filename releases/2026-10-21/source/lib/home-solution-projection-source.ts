import {supabaseServer} from './supabase-server';
import {dashboardScopeReceipt,type DashboardFilters} from './dashboard-scope';
import type {ProjectionInputs} from './home-solution-projection';
import type {ScenarioModelAssumptions} from './types';

/** Existing read contracts only. No dataset routing, schema or security mutation. */
export async function loadSolutionProjectionInputs(filters:DashboardFilters,signal:AbortSignal):Promise<ProjectionInputs>{
 const result=await supabaseServer.rpc('dashboard_overview_filtered',{p_country_code:filters.country==='all'?null:filters.country,p_org_code:filters.org==='all'?null:filters.org,p_level_code:filters.level==='all'?null:filters.level}).abortSignal(signal);
 if(result.error)throw Error('The active workforce source could not be read. No projection was calculated.');
 const receipt=dashboardScopeReceipt(result.data,filters);
 if(receipt.status!=='verified_rpc')throw Error('The active workforce population could not be verified. No projection was calculated.');
 const inputs:ProjectionInputs={asOf:result.data.overview.snapshot_date,opening:result.data.overview.headcount,filters,scope:receipt.label,relations:['dashboard_overview_filtered'],datasetVersion:null,defaults:null,baseline:[]};
 if(Object.values(filters).some(value=>value!=='all'))return inputs;
 const [defaults,baseline,overview]=await Promise.all([
  supabaseServer.from('scenario_modeler_defaults').select('baseline_annual_growth_pct,baseline_salary_inflation_pct,baseline_annual_attrition_pct,baseline_fill_rate_pct,baseline_productivity_hiring_reduction_pct').abortSignal(signal).single(),
  supabaseServer.from('workforce_scenario_summary').select('planning_month,planned_headcount,planned_fte,planned_labor_cost_usd').eq('scenario_name','Baseline').order('planning_month',{ascending:true}).limit(24).abortSignal(signal),
  supabaseServer.from('dashboard_overview_current').select('snapshot_date,headcount').abortSignal(signal).single(),
 ]);
 // A monthly-flow tool can still use the verified snapshot if optional configured inputs fail.
 if(defaults.error||baseline.error||overview.error||overview.data.snapshot_date!==inputs.asOf||overview.data.headcount!==inputs.opening)return inputs;
 const fields=['annual_growth_pct','salary_inflation_pct','annual_attrition_pct','fill_rate_pct','productivity_hiring_reduction_pct'] as const;
 const values=defaults.data as Record<string,unknown>;
 if(fields.some(field=>typeof values?.['baseline_'+field]!=='number'))return inputs;
 inputs.defaults=Object.fromEntries(fields.map(field=>[field,values['baseline_'+field]])) as ScenarioModelAssumptions;
 inputs.baseline=baseline.data??[];inputs.relations.push('dashboard_overview_current','scenario_modeler_defaults','workforce_scenario_summary:Baseline');return inputs;
}
