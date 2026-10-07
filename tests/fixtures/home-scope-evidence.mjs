import {scopedDashboardResponse,dashboardRequestedFilters} from '../../lib/dashboard-scope.ts';
// Synthetic browser fixture. US and BU-DATAAI are verified catalogue entries; this is not a live-data fetch.
export const scopeOptions={countries:[{value:'US',label:'United States'},{value:'CA',label:'Canada'}],business_units:[{value:'BU-DATAAI',label:'Data & AI'},{value:'BU-CORP',label:'Corporate Functions'}],levels:[{value:'IC2',label:'Analyst / Specialist'}]};
export function scopeDashboard(query=''){
 const selected=new URLSearchParams(query),us=selected.get('country')==='US',data=selected.get('org')==='BU-DATAAI';
 const raw={filter_options:scopeOptions,overview:{headcount:us&&data?600:us?250:5000,fte:us&&data?598:us?248:4990,voluntary_turnover_ytd_pct:us&&data?3.7:us?4.1:5.4,open_positions:20,snapshot_date:'2026-09-30'},trend:[]};
 raw.trend=[{snapshot_date:raw.overview.snapshot_date,headcount:raw.overview.headcount,fte:raw.overview.fte}];
 return scopedDashboardResponse(raw,dashboardRequestedFilters(selected));
}
export const scopeEnterprise={
 attrition:{as_of:'2026-09-30',summary:{total_exits:450,voluntary_exits:400,voluntary_turnover_ytd_pct:8.2}},
 'survey-sentiment':{as_of:'2026-09-30',summary:{engagement_respondents:1200,engagement_eligible_population:2000,engagement_favorable_pct:73,exit_respondents:90}},
 skills:{as_of:'2026-09-30',summary:{current_workforce:5000,weighted_requirement_met_pct:68,skills_below_75_pct:12}},
 workforce:{as_of:'2026-09-30',summary:{headcount:5000,fte:4990}},
};
export const selectedScope='United States; Data & AI; Analyst / Specialist';
export const scopedGoal='Reduce turnover in the United States Data & AI business unit within 12 months';
export const unknownDepartmentGoal='Reduce turnover in the Quantum Research Department within 12 months';
export function scopeResults(query='?country=US&org=BU-DATAAI&level=IC2'){return Object.fromEntries(Object.entries({dashboard:scopeDashboard(query),...scopeEnterprise}).map(([key,data])=>[key,{status:'loaded',data}]))}
